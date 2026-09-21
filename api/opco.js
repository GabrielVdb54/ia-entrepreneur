/**
 * /api/opco — à quel OPCO une entreprise est-elle rattachée ?
 *
 * Le simulateur de financement demandait jusqu'ici au visiteur de deviner son
 * secteur, et traduisait ça en OPCO via 28 IDCC codés en dur. C'était faux
 * une fois sur deux dès qu'on sortait des cas évidents.
 *
 * La réponse officielle vient de France compétences, qui publie en open data
 * la table SIRET-OPCO derrière quel-est-mon-opco.francecompetences.fr. Trois
 * chemins, du plus sûr au plus approximatif :
 *
 *   1. SIRET dans la table SIRET-OPCO → réponse exacte, celle de l'État.
 *   2. SIRET absent → on récupère son IDCC, puis IDCC → OPCO par la table
 *      embarquée. L'affectation étant une règle de branche, un IDCC détermine
 *      un OPCO ; c'est fiable, mais ça dépend de la convention déclarée.
 *   3. Rien → on le dit. Le simulateur repasse alors sur le choix par secteur.
 *
 * Le point à ne pas oublier : la table est construite sur la DSN, donc elle ne
 * couvre que les établissements employeurs déclarants. Une entreprise sans
 * salarié ou trop récente en est absente — testé avec le SIRET de Clindit,
 * qui ne renvoie rien. Une réponse vide n'est pas une panne, et le message
 * renvoyé doit le dire au visiteur plutôt que de le laisser croire à un bug.
 *
 * Aucune clé d'API n'est nécessaire : les deux sources amont sont publiques.
 * En cas d'indisponibilité de l'une d'elles, la fonction dégrade au chemin
 * suivant et, en dernier recours, répond `trouve: false` — jamais une erreur
 * qui casserait le simulateur.
 */

import { META, OPCO, IDCC, REGLE_COMMUNE } from './_opco.js';

export const maxDuration = 15;

// Ressource « Table SIRET-OPCO » de France compétences, exposée par l'API
// tabulaire de data.gouv.fr. L'identifiant est stable : France compétences
// remplace le fichier en place chaque mois plutôt que d'en publier un nouveau.
const RESSOURCE = 'b2452a3d-7786-4a26-99c3-0389fbb3763e';
const API_TABULAIRE = `https://tabular-api.data.gouv.fr/api/resources/${RESSOURCE}/data/`;
// siret2idcc, Fabrique numérique des ministères sociaux (Code du travail numérique).
const API_IDCC = 'https://siret2idcc.fabrique.social.gouv.fr/api/v2/';

const DELAI_MS = 4000;
const HOTES_AUTORISES = ['ia-entrepreneur.fr', 'www.ia-entrepreneur.fr', 'localhost', '127.0.0.1'];

// Limite indicative par instance : elle écarte une boucle accidentelle, pas un
// attaquant décidé. Les sources amont sont publiques et gratuites, le risque
// porte sur leur disponibilité, pas sur une facture.
const FENETRE_MS = 10 * 60 * 1000;
const MAX_PAR_IP = 30;
const compteurs = new Map();

function tropDeDemandes(ip) {
  const maintenant = Date.now();
  const seuil = maintenant - FENETRE_MS;
  const passees = (compteurs.get(ip) || []).filter((t) => t > seuil);
  passees.push(maintenant);
  compteurs.set(ip, passees);
  if (compteurs.size > 5000) {
    for (const [cle, dates] of compteurs) {
      if (!dates.some((t) => t > seuil)) compteurs.delete(cle);
    }
  }
  return passees.length > MAX_PAR_IP;
}

function origineEtrangere(req) {
  const origine = req.headers.origin;
  if (!origine) return false;
  try {
    const hote = new URL(origine).hostname;
    return !(HOTES_AUTORISES.includes(hote) || hote.endsWith('.vercel.app'));
  } catch {
    return true;
  }
}

async function recuperer(url) {
  const stop = new AbortController();
  const minuteur = setTimeout(() => stop.abort(), DELAI_MS);
  try {
    const r = await fetch(url, { signal: stop.signal, headers: { accept: 'application/json' } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null; // source indisponible : on passe au chemin suivant
  } finally {
    clearTimeout(minuteur);
  }
}

/** Clé d'OPCO telle qu'écrite dans la table → fiche d'affichage. */
function fiche(cle) {
  const o = OPCO[cle];
  if (!o) return { code: cle, nom: cle, site: null };
  // `criteres` est la page où CET OPCO publie ses règles : c'est la seule
  // source qui fasse foi, et le simulateur doit pouvoir y renvoyer.
  return { code: cle, nom: o.nom, site: o.site, criteres: o.criteres, espace: o.espace, regle: o.regle };
}

/** IDCC (2 à 4 chiffres) → OPCO, via la table embarquée. */
function parIdcc(idcc) {
  const entree = IDCC[String(idcc).padStart(4, '0')];
  if (!entree) return null;
  const resultat = { ...fiche(entree.opco), idcc: String(idcc).padStart(4, '0') };
  if (entree.ambigu) {
    resultat.ambigu = true;
    resultat.candidats = entree.candidats.map(fiche);
  }
  return resultat;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ erreur: 'methode_non_autorisee' });
  }
  if (origineEtrangere(req)) {
    return res.status(403).json({ erreur: 'origine_refusee' });
  }

  const params = req.method === 'POST' ? req.body || {} : req.query || {};
  const siret = String(params.siret || '').replace(/\D/g, '');
  const idccDemande = String(params.idcc || '').replace(/\D/g, '');

  if (!siret && !idccDemande) {
    return res.status(400).json({ erreur: 'siret_ou_idcc_requis' });
  }
  if (siret && siret.length !== 14) {
    return res.status(400).json({ erreur: 'siret_invalide', message: 'Un SIRET comporte 14 chiffres.' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'inconnue';
  if (tropDeDemandes(ip)) {
    return res.status(429).json({ erreur: 'trop_de_demandes' });
  }

  const socle = { source: META.source, donnee_maj: META.donnee_maj, licence: META.licence, regle_commune: REGLE_COMMUNE };

  // Chemin direct : on nous donne déjà la convention collective.
  if (!siret) {
    const trouve = parIdcc(idccDemande);
    return res.status(200).json(
      trouve
        ? { trouve: true, methode: 'idcc', opco: trouve, ...socle }
        : { trouve: false, motif: 'idcc_inconnu', idcc: idccDemande, ...socle },
    );
  }

  // 1. La réponse officielle, établissement par établissement.
  const exact = await recuperer(`${API_TABULAIRE}?SIRET__exact=${encodeURIComponent(siret)}`);
  const ligne = exact?.data?.[0];
  if (ligne?.OPCO_PROPRIETAIRE) {
    return res.status(200).json({
      trouve: true,
      methode: 'siret',
      siret,
      opco: { ...fiche(ligne.OPCO_PROPRIETAIRE), idcc: ligne.IDCC || null },
      ...socle,
    });
  }

  // 2. Repli par la convention collective.
  const parSiret = await recuperer(`${API_IDCC}${encodeURIComponent(siret)}`);
  const conventions = Array.isArray(parSiret) ? parSiret[0]?.conventions || [] : [];
  for (const c of conventions) {
    const trouve = parIdcc(c.num ?? c.idcc);
    if (trouve) {
      return res.status(200).json({
        trouve: true,
        methode: 'idcc',
        siret,
        opco: trouve,
        convention: c.shortTitle || c.title || null,
        ...socle,
      });
    }
  }

  // 3. Ni l'un ni l'autre. Le plus souvent : entreprise sans salarié, ou trop
  // récente pour figurer dans la DSN. Ce n'est pas une erreur.
  return res.status(200).json({
    trouve: false,
    motif: 'etablissement_absent',
    siret,
    message:
      "Cet établissement n'apparaît pas dans la table de France compétences, "
      + "qui ne recense que les employeurs déclarant en DSN. C'est le cas courant "
      + "d'une entreprise sans salarié ou créée récemment.",
    ...socle,
  });
}

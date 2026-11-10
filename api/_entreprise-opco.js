/**
 * _entreprise-opco.js — d'un SIRET (ou d'un SIREN) à l'OPCO, la convention
 * collective et l'effectif de l'entreprise.
 *
 * C'est la même cascade que l'outil fait pour Cathy dans Ella (fiche
 * entreprise, « OPCO déduit ») : on lit, on ne devine pas.
 *
 *   1. SIRET → OPCO pour les établissements que la convention ne suffit pas
 *      à situer (sans convention, convention partagée, OPCO différent, dossier
 *      géré par un autre OPCO) : `data/siret-opco/*.txt`, extraits de la table
 *      SIRET-OPCO de France compétences par generer_table_opco.py. C'est la
 *      table `siret_opco` d'Ella.
 *   2. Sinon l'IDCC déclaré (API Recherche d'entreprises, données DSN), puis
 *      IDCC → OPCO par la table embarquée (`_opco.js`) : la table `idcc_opco`
 *      d'Ella. L'affectation à un OPCO est une règle de branche.
 *   3. Sinon, en dernier recours, l'API tabulaire de data.gouv.fr (la table
 *      entière, mais 6 à 14 secondes par SIRET mesurées le 09/11/2026 : c'est
 *      pour cela qu'elle ne vient qu'en dernier).
 *   4. Rien : on le dit. JAMAIS de déduction par le code APE : aucune
 *      correspondance officielle n'existe (même règle que dans Ella).
 *
 * Le nom de la convention vient de l'API du Code du travail numérique. Le
 * service siret2idcc qu'utilisait l'ancienne version ne répond plus (constaté
 * le 09/11/2026 : le domaine ne résout plus) ; l'IDCC se lit désormais dans
 * la réponse de l'API Recherche d'entreprises.
 *
 * Les montants pris en charge ne sont PAS calculés ici : ils dépendent de la
 * branche et de l'effectif et changent chaque année. On renvoie vers la page
 * où l'OPCO publie ses critères (`criteres`, les liens fournis par Cathy).
 *
 * Aucune clé d'API : les trois sources sont publiques et gratuites.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { META, OPCO, IDCC, REGLE_COMMUNE, FONDS_NON_SALARIES, CODES_COURTS } from './_opco.js';

// Ressource « Table SIRET-OPCO » exposée par l'API tabulaire de data.gouv.fr.
// France compétences remplace le fichier en place chaque mois : l'identifiant
// ne change pas.
const RESSOURCE = 'b2452a3d-7786-4a26-99c3-0389fbb3763e';
const API_TABULAIRE = `https://tabular-api.data.gouv.fr/api/resources/${RESSOURCE}/data/`;
const API_ENTREPRISES = 'https://recherche-entreprises.api.gouv.fr/search';
const API_CONVENTIONS = 'https://code.travail.gouv.fr/api/idcc';

const DELAI_MS = 5000;
// « Pas de convention » et « non renseigné » : ils ne désignent aucune branche.
const PSEUDO_IDCC = new Set(['9998', '9999']);

/** Tranches d'effectif salarié de l'Insee (nomenclature Sirene). */
const TRANCHES = {
  NN: 'Non employeur',
  '00': '0 salarié',
  '01': '1 ou 2 salariés',
  '02': '3 à 5 salariés',
  '03': '6 à 9 salariés',
  11: '10 à 19 salariés',
  12: '20 à 49 salariés',
  21: '50 à 99 salariés',
  22: '100 à 199 salariés',
  31: '200 à 249 salariés',
  32: '250 à 499 salariés',
  41: '500 à 999 salariés',
  42: '1 000 à 1 999 salariés',
  51: '2 000 à 4 999 salariés',
  52: '5 000 à 9 999 salariés',
  53: '10 000 salariés et plus',
};
const SOUS_50 = new Set(['NN', '00', '01', '02', '03', '11', '12']);

// --- Numéro ----------------------------------------------------------------

function luhn(n) {
  let somme = 0;
  for (let i = 0; i < n.length; i += 1) {
    let c = Number(n[n.length - 1 - i]);
    if (i % 2 === 1) {
      c *= 2;
      if (c > 9) c -= 9;
    }
    somme += c;
  }
  return somme % 10 === 0;
}

/** SIREN (9 chiffres) ou SIRET (14), clé de Luhn comprise. */
export function numeroValide(n) {
  if (/^\d{9}$/.test(n)) return luhn(n);
  if (!/^\d{14}$/.test(n)) return false;
  if (luhn(n)) return true;
  // Les établissements de La Poste suivent une autre règle : somme des
  // chiffres multiple de 5.
  return n.startsWith('356000000') && [...n].reduce((s, c) => s + Number(c), 0) % 5 === 0;
}

// --- Appels ----------------------------------------------------------------

// Sirene (Recherche d'entreprises) limite à 7 appels par seconde et renvoie
// parfois une erreur passagère : sans nouvel essai, le visiteur obtenait un
// résultat amputé (sans nom ni effectif, voire un autre OPCO). Banc de test
// du 10/11/2026.
async function lireJson(url, delai = DELAI_MS, essais = 1) {
  for (let i = 0; ; i += 1) {
    const r = await lireUneFois(url, delai);
    if (r.data || i + 1 >= essais || r.erreur === 400 || r.erreur === 404) return r;
    await new Promise((ok) => setTimeout(ok, 400 * (i + 1)));
  }
}

async function lireUneFois(url, delai) {
  const stop = new AbortController();
  const minuteur = setTimeout(() => stop.abort(), delai);
  try {
    const r = await fetch(url, { signal: stop.signal, headers: { accept: 'application/json' } });
    if (!r.ok) return { erreur: r.status };
    return { data: await r.json() };
  } catch {
    return { erreur: 'reseau' };
  } finally {
    clearTimeout(minuteur);
  }
}

/** Code OPCO tel qu'écrit dans la table → fiche publique. */
function fiche(code) {
  const o = OPCO[code];
  if (!o) return { code, nom: code, site: null, espace: null, criteres: null, regle: null };
  return { code, nom: o.nom, site: o.site, espace: o.espace, criteres: o.criteres, regle: o.regle };
}

function idccPropre(v) {
  const c = String(v ?? '').replace(/\D/g, '');
  if (!c || c.length > 4) return null;
  const idcc = c.padStart(4, '0');
  return PSEUDO_IDCC.has(idcc) ? null : idcc;
}

/** IDCC → OPCO par la table embarquée ; null si l'IDCC y est absent. */
export function parIdcc(idcc) {
  const entree = IDCC[idccPropre(idcc) || ''];
  if (!entree) return null;
  const resultat = fiche(entree.opco);
  if (entree.ambigu) {
    resultat.ambigu = true;
    resultat.candidats = entree.candidats.map(fiche);
  }
  return resultat;
}

// Les titres changent rarement : un cache par instance évite de redemander
// la même convention à chaque visiteur.
const titres = new Map();

/** IDCC → nom court de la convention et sa page sur le Code du travail numérique. */
async function convention(idcc) {
  const num = Number(idcc);
  if (titres.has(num)) return titres.get(num);
  const r = await lireJson(`${API_CONVENTIONS}?q=${num}`, 3500);
  const hit = (r.data?.hits?.hits || []).map((h) => h._source || {}).find((s) => Number(s.num) === num);
  const c = {
    idcc: String(num).padStart(4, '0'),
    titre: hit?.shortTitle?.trim() || null,
    lien: hit?.slug ? `https://code.travail.gouv.fr/convention-collective/${hit.slug}` : null,
  };
  if (hit) titres.set(num, c);
  return c;
}

function nomPropre(t) {
  return String(t || '').replace(/\s+/g, ' ').trim();
}

// Les fichiers d'exceptions sont dans la fonction (vercel.json, includeFiles).
const fichiers = new Map();

/** SIRET → { opco, gestion } d'après data/siret-opco, ou null. */
function exception(siret) {
  const prefixe = siret.slice(0, 3);
  if (!fichiers.has(prefixe)) {
    let texte = '';
    try {
      texte = `\n${readFileSync(join(process.cwd(), 'data', 'siret-opco', `${prefixe}.txt`), 'utf8')}`;
    } catch {
      // Pas de fichier pour ce préfixe : aucun établissement concerné.
    }
    if (fichiers.size > 200) fichiers.clear();
    fichiers.set(prefixe, texte);
  }
  const texte = fichiers.get(prefixe);
  const i = texte.indexOf(`\n${siret}`);
  if (i < 0) return null;
  const lettres = texte.slice(i + 15, texte.indexOf('\n', i + 15));
  const opco = CODES_COURTS[lettres[0]];
  if (!opco) return null;
  return { opco, gestion: CODES_COURTS[lettres[1]] || null };
}

// --- Recherche -------------------------------------------------------------

/**
 * Résultat :
 *   { etat: 'format' | 'invalide' }                 numéro mal formé
 *   { etat: 'introuvable' }                          inconnu de Sirene et de la table
 *   { etat: 'indisponible' }                         sources injoignables
 *   { etat: 'trouve', siret, siege, entreprise, effectif, opco, methode,
 *     convention, ... }                              opco null si non trouvé
 */
// Le même SIRET est cherché deux fois de suite : à l'affichage (GET) puis à
// l'envoi de l'email (POST). Une mémoire de 15 min par instance rend l'email
// identique à l'écran et évite d'attendre deux fois la table de France
// compétences. Les échecs passagers ne sont jamais gardés.
const memoire = new Map();
const MEMOIRE_MS = 15 * 60 * 1000;

export async function rechercher(saisie) {
  const cle = String(saisie || '').replace(/\D/g, '');
  const vu = memoire.get(cle);
  if (vu && Date.now() - vu.t < MEMOIRE_MS) return structuredClone(vu.r);
  const r = await chercher(saisie);
  const provisoire = r.provisoire;
  delete r.provisoire;
  if (!provisoire && (r.etat === 'trouve' || r.etat === 'introuvable')) {
    if (memoire.size > 500) memoire.clear();
    memoire.set(cle, { t: Date.now(), r: structuredClone(r) });
  }
  return r;
}

async function chercher(saisie) {
  const numero = String(saisie || '').replace(/\D/g, '');
  if (numero.length !== 9 && numero.length !== 14) return { etat: 'format' };
  if (!numeroValide(numero)) return { etat: 'invalide' };
  const siren = numero.slice(0, 9);

  const re = await lireJson(`${API_ENTREPRISES}?q=${numero}&per_page=1`, 4000, 3);
  const unite = (re.data?.results || []).find((u) => u.siren === siren) || null;
  let etab = null;
  if (unite) {
    etab = numero.length === 14
      ? (unite.matching_etablissements || []).find((e) => e.siret === numero) || null
      : unite.siege || null;
  }
  const siret = numero.length === 14 ? numero : etab?.siret || null;

  let opco = null;
  let methode = null;
  let provisoire = false; // une source n'a pas répondu : ne pas garder ce résultat
  if (!re.data) provisoire = true;
  // La convention de l'établissement d'abord : celles de l'entreprise mêlent
  // tous ses sites (un groupe de 1 000 établissements en déclare dix).
  const propres = (liste) => [...new Set((liste || []).map(idccPropre).filter(Boolean))];
  const deLEtablissement = propres(etab?.liste_idcc);
  const candidats = deLEtablissement.length ? deLEtablissement : propres(unite?.complements?.liste_idcc);
  // Plusieurs conventions (ouvriers, ETAM, cadres) : on retient la plus
  // répandue dans la table, en général celle de la plupart des salariés.
  const poids = (x) => IDCC[x]?.etablissements || 0;
  const idcc = [...candidats].sort((a, b) => poids(b) - poids(a))[0] || null;
  // Ces conventions mènent-elles à des OPCO différents ? Alors seule la table
  // de France compétences peut trancher pour cet établissement.
  const opcosPossibles = new Set(candidats.map((x) => IDCC[x]?.opco).filter(Boolean));
  const incertain = opcosPossibles.size > 1;

  // 1. Établissement que sa convention ne situe pas.
  const exc = siret ? exception(siret) : null;
  if (exc) {
    opco = fiche(exc.opco);
    if (exc.gestion) opco.gestion = fiche(exc.gestion);
    methode = 'siret';
  }
  // 2. La convention collective, quand elle ne laisse pas de doute.
  if (!opco && idcc && !incertain) {
    opco = parIdcc(idcc);
    if (opco) methode = 'idcc';
  }
  // 3. La table entière, lente : seulement quand rien d'autre n'a répondu.
  let idccTable = null;
  // Un établissement sans salarié n'est pas dans cette table (elle vient de
  // la DSN) : inutile de faire attendre le visiteur.
  // Sirene se contredit parfois (« non employeur » avec 1 ou 2 salariés) :
  // une tranche d'effectif l'emporte.
  const sansSalarie = etab?.caractere_employeur === 'N' && ['NN', '00', null, undefined].includes(unite?.tranche_effectif_salarie);
  if (!opco && siret && !sansSalarie) {
    // Lente (6 à 14 s) et parfois en erreur : deux essais, dans les 60 s de
    // la fonction (vercel.json).
    const t = await lireJson(`${API_TABULAIRE}?SIRET__exact=${siret}`, 17000, 2);
    if (!t.data) provisoire = true;
    const ligne = t.data?.data?.[0];
    if (ligne?.OPCO_PROPRIETAIRE) {
      opco = fiche(ligne.OPCO_PROPRIETAIRE);
      if (ligne.OPCO_GESTION && ligne.OPCO_GESTION !== ligne.OPCO_PROPRIETAIRE) opco.gestion = fiche(ligne.OPCO_GESTION);
      methode = 'siret';
      idccTable = idccPropre(ligne.IDCC);
    }
  }

  // 4. Table muette sur un cas incertain : la première convention que Sirene
  // donne pour l'établissement, à défaut celle de l'entreprise.
  if (!opco && incertain) {
    opco = parIdcc(candidats[0]);
    if (opco) methode = 'idcc';
  }

  if (!unite && !opco) {
    // Sirene a répondu sans rien trouver : le numéro n'existe pas (ou n'est
    // pas diffusible). Sinon, c'est la source qui ne répond pas.
    return re.data ? { etat: 'introuvable', numero } : { etat: 'indisponible', numero };
  }
  // La table parle de cet établissement : sa convention prime.
  const idccRetenu = idccTable || (incertain ? candidats[0] : idcc);

  const tranche = unite?.tranche_effectif_salarie || null;
  const annee = unite?.annee_tranche_effectif_salarie || null;
  const nom = nomPropre(unite?.nom_raison_sociale || unite?.nom_complet);
  const enseigne = nomPropre(etab?.nom_commercial || etab?.liste_enseignes?.[0]);

  return {
    etat: 'trouve',
    provisoire,
    numero,
    siret,
    siege: numero.length === 9 || Boolean(etab?.est_siege),
    entreprise: unite
      ? {
          nom: nom || null,
          enseigne: enseigne && enseigne !== nom ? enseigne : null,
          commune: nomPropre(etab?.libelle_commune) || null,
          code_postal: etab?.code_postal || null,
          ape: etab?.activite_principale || unite.activite_principale || null,
          ferme: etab?.etat_administratif === 'F' || unite.etat_administratif === 'C',
          entrepreneur_individuel: Boolean(unite.complements?.est_entrepreneur_individuel),
        }
      : null,
    effectif: {
      tranche,
      libelle: tranche ? TRANCHES[tranche] || null : null,
      annee,
      // Les fonds mutualisés de l'OPCO sont réservés aux moins de 50.
      moins_de_50: tranche ? SOUS_50.has(tranche) : null,
    },
    opco,
    methode,
    convention: idccRetenu ? await convention(idccRetenu) : null,
  };
}

export const SOCLE = {
  source: META.source,
  donnee_maj: META.donnee_maj,
  licence: META.licence,
  regle_commune: REGLE_COMMUNE,
};

export { FONDS_NON_SALARIES, TRANCHES };

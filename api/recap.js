/**
 * /api/recap — « recevoir ce plan par email ».
 *
 * Le visiteur vient d'obtenir une chaîne d'outils de FindIA. Il peut se la
 * faire envoyer par email, et accepter séparément de recevoir nos contenus
 * sur l'IA. Deux finalités distinctes, deux bases légales distinctes :
 *   · le récap lui-même, qu'il a explicitement demandé en cliquant ;
 *   · la prospection commerciale, qui exige un consentement libre et
 *     spécifique (art. 6.1.a RGPD) — une case à cocher jamais pré-cochée.
 *
 * LE POINT IMPORTANT : le client n'envoie AUCUN texte libre. Il envoie des
 * identifiants d'outils et une clé d'offre ; le serveur reconstruit les noms,
 * les prix et les liens depuis le catalogue. Sans cela, n'importe qui pourrait
 * poster un texte arbitraire avec l'adresse email d'un tiers, et se servir du
 * domaine ia-entrepreneur.fr comme d'un relais de spam. C'est la même
 * discipline que dans /api/conseil : rien de ce qui vient de l'extérieur
 * n'est réutilisé tel quel.
 *
 * L'envoi et la séquence de nurturing sont délégués à n8n, déjà en place pour
 * le blog : le site pousse un objet propre sur un webhook, n8n compose l'email
 * et alimente la liste. Sans N8N_RECAP_WEBHOOK, la fonction répond 503 et la
 * page n'affiche jamais le bloc — on ne promet pas un envoi qu'on ne peut pas
 * faire.
 */

import { CATALOGUE, SLUGS } from './_catalogue.js';
import { OFFRES } from './_offres.js';

export const maxDuration = 15;

// Recopié mot pour mot depuis la case à cocher de la page. Si la formulation
// change là-bas, elle doit changer ici : c'est cette phrase qu'on archive
// comme preuve de ce que le visiteur a accepté.
const TEXTE_CONSENTEMENT =
  'Je souhaite recevoir les conseils IA et les offres de formation d’IA-Entrepreneur. ' +
  'Désinscription en un clic dans chaque email.';

const EMAIL_MAX = 254;
// Volontairement permissif : le rôle de cette expression est d'écarter une
// faute de frappe, pas de valider une adresse. Seul un email réellement remis
// prouve qu'une adresse existe.
const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

// Plus strict que le conseiller : personne n'a de raison légitime de demander
// dix récaps en dix minutes, et c'est le seul point du site qui déclenche un
// envoi d'email vers une adresse choisie par l'appelant.
const FENETRE_MS = 10 * 60 * 1000;
const MAX_PAR_FENETRE = 5;
const passages = new Map();

function tropDeDemandes(empreinte) {
  const maintenant = Date.now();
  const recentes = (passages.get(empreinte) || []).filter((t) => maintenant - t < FENETRE_MS);
  if (passages.size > 5000) passages.clear();
  if (recentes.length >= MAX_PAR_FENETRE) {
    passages.set(empreinte, recentes);
    return true;
  }
  recentes.push(maintenant);
  passages.set(empreinte, recentes);
  return false;
}

const HOTES_AUTORISES = ['ia-entrepreneur.fr', 'www.ia-entrepreneur.fr'];

// Un navigateur envoie toujours Origin sur une requête POST cross-site. On
// refuse ce qui vient d'ailleurs. Un script hors navigateur peut omettre
// l'en-tête : ce n'est donc pas une protection, seulement une porte fermée
// de plus. Le vrai garde-fou reste la limite ci-dessus.
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

// Le journal est en écriture seule (aucune policy SELECT côté Supabase) : la
// clé anon est publique, elle ne doit pas permettre de relire la liste
// d'adresses. Table distincte du journal des questions, qui reste anonyme.
async function enregistrer(donnees) {
  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_ANON_KEY;
  if (!url || !cle) return;
  try {
    await fetch(`${url}/rest/v1/ia_entrepreneur_recaps`, {
      method: 'POST',
      headers: {
        apikey: cle,
        Authorization: `Bearer ${cle}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(donnees),
    });
  } catch {
    // Un journal qui tombe ne doit pas priver le visiteur de son récap.
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erreur: 'methode_non_autorisee' });
  }
  if (origineEtrangere(req)) {
    return res.status(403).json({ erreur: 'origine_refusee' });
  }
  const webhook = process.env.N8N_RECAP_WEBHOOK;
  if (!webhook) {
    return res.status(503).json({ erreur: 'envoi_indisponible' });
  }

  const corps = req.body || {};

  // Pot de miel : un champ invisible que seul un robot remplit. On répond 200
  // sans rien faire — lui signaler qu'il est repéré l'inviterait à s'adapter.
  if (typeof corps.piege === 'string' && corps.piege.trim()) {
    return res.status(200).json({ ok: true });
  }

  const email = String(corps.email || '').trim().toLowerCase();
  if (email.length < 6 || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
    return res.status(400).json({ erreur: 'email_invalide' });
  }

  // Booléen strict : « true » en chaîne, 1, ou un objet ne valent pas un
  // consentement. Un consentement se prouve, il ne se déduit pas.
  const consentement = corps.consentement === true;

  const empreinte = (req.headers['x-forwarded-for'] || 'inconnu').split(',')[0].trim();
  if (tropDeDemandes(empreinte)) {
    return res.status(429).json({ erreur: 'trop_de_demandes' });
  }

  // Reconstruction depuis le catalogue : le client n'a fourni que des slugs.
  const outils = (Array.isArray(corps.outils) ? corps.outils : [])
    .filter((sl) => typeof sl === 'string' && SLUGS.has(sl))
    .slice(0, 4)
    .map((sl) => {
      const f = CATALOGUE.find((o) => o.slug === sl);
      return {
        slug: f.slug,
        nom: f.nom,
        usage: f.usage,
        niveau: f.niveau,
        prix: f.prix,
        url: `https://ia-entrepreneur.fr/ia/${f.slug}.html`,
      };
    });
  if (!outils.length) {
    return res.status(400).json({ erreur: 'aucun_outil' });
  }

  const cleOffre = OFFRES[corps.offre] ? corps.offre : null;
  const offre = cleOffre
    ? {
        cle: cleOffre,
        titre: OFFRES[cleOffre].titre,
        url: `https://ia-entrepreneur.fr${OFFRES[cleOffre].url}`,
      }
    : null;

  const charge = {
    email,
    consentement,
    // Art. 7.1 RGPD : pouvoir démontrer le consentement. On transmet et on
    // archive la formulation exacte affichée au moment du clic, pas un
    // simple booléen sorti de son contexte.
    consentement_texte: consentement ? TEXTE_CONSENTEMENT : null,
    consentement_date: consentement ? new Date().toISOString() : null,
    outils,
    offre,
    source: 'findia',
    date: new Date().toISOString(),
  };

  // On attend la réponse de n8n : afficher « c'est envoyé » alors que l'appel
  // a échoué serait une promesse rompue, et le visiteur attendrait un email
  // qui n'arriverait jamais.
  const abandon = new AbortController();
  const minuteur = setTimeout(() => abandon.abort(), 10000);
  try {
    const reponse = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.N8N_RECAP_TOKEN ? { Authorization: `Bearer ${process.env.N8N_RECAP_TOKEN}` } : {}),
      },
      body: JSON.stringify(charge),
      signal: abandon.signal,
    });
    if (!reponse.ok) throw new Error(`n8n ${reponse.status}`);
  } catch {
    return res.status(502).json({ erreur: 'envoi_impossible' });
  } finally {
    clearTimeout(minuteur);
  }

  await enregistrer({
    email,
    consentement_prospection: consentement,
    consentement_date: charge.consentement_date,
    consentement_texte: charge.consentement_texte,
    outils: outils.map((o) => o.slug),
    offre: cleOffre,
    source: 'findia',
  });

  return res.status(200).json({ ok: true });
}

/**
 * /api/crm : le CRM personnel de Gabriel (page /crm/).
 *
 * L'équipe commerciale travaille dans HubSpot ; ici, ce sont les leads que
 * Gabriel suit lui-même (réseau, BNI, partenaires, grands comptes). Une seule
 * fonction pour tout, comme /api/quiz.
 *
 *   GET  /api/crm                    tout le CRM (leads, contacts, journal,
 *                                    mémo, modèles, réglages)
 *   GET  /api/crm?logo=domaine.fr    le logo d'une entreprise (image)
 *   POST /api/crm { op: 'creer',     table, valeurs }
 *   POST /api/crm { op: 'maj',       table, id, valeurs }
 *   POST /api/crm { op: 'supprimer', table, id }
 *   POST /api/crm { op: 'journal',   lead_id, activite, lead? }
 *        une ligne au journal et la mise à jour du lead (prochaine relance…)
 *   POST /api/crm { op: 'lot',       ids, lead, activite? }
 *        la même modification sur plusieurs leads (vue Tableau), avec une
 *        ligne au journal de chacun
 *   POST /api/crm { op: 'importer',  lignes: [{ lead, contact? }] }
 *        import en masse (collage depuis Excel) ; les UUID viennent du
 *        navigateur pour relier les contacts sans dépendre de l'ordre de retour
 *   POST /api/crm { op: 'rediger',   lead_id, canal, modele_id?, consigne?, tutoyer? }
 *        un email ou un SMS rédigé par Claude d'après les notes du lead et le
 *        mémo commercial ; rien n'est envoyé, Gabriel relit dans la fenêtre
 *   POST /api/crm { op: 'email',     lead_id, a, objet, corps, mode, fil?, lead? }
 *        mode 'envoyer' ou 'brouillon', depuis gabriel@ia-entrepreneur.fr
 *   POST /api/crm { op: 'reglage',   cle, valeur }
 *   POST /api/crm { op: 'synchro' }  lit la boîte et l'agenda maintenant
 *   POST /api/crm { op: 'vocal',     lead_id, texte }
 *        une phrase dite à l'oral (« pas de réponse, rappelle-le lundi »)
 *        devient une action proposée ; rien n'est enregistré ici, la page
 *        relit la proposition et Gabriel valide
 *   POST /api/crm { op: 'entrant',   id, action, lead_id?, lead?, contact? }
 *        traite une ligne « À trier » : créer le lead, rattacher, ignorer, remettre
 *   POST /api/crm { op: 'recap',     lead_id }
 *        Claude fait le récap de la relation (où on en est, ce qu'elle attend,
 *        chaleur, réactivité, ton, points à retenir, prochaine étape)
 *   GET  /api/crm?fil=<id Gmail>     les messages d'un fil lié au CRM, en entier
 *   GET  /api/crm?document=<id>      une pièce d'un formateur (bucket privé), pour la regarder
 *   POST { op: 'formateur_lien' | 'formateur_maj' | 'formateur_siret' | 'piece_deposer'
 *          | 'document_verifier' | 'formateur_valider' | 'formateur_refuser', … }
 *        le dossier des formateurs (voir api/_formateurs.js et api/formateur.js)
 *   POST { op: 'programme_generer' | 'programme_maj' | 'programme_valider'
 *          | 'programme_recommander' | 'programme_choisir', … }
 *        le programme de formation d'un client, rédigé par Claude d'après le
 *        besoin et les échanges, puis les formateurs recommandés pour ce
 *        programme (seul un formateur validé peut être choisi)
 *   GET  /api/crm?tache=synchro      la même synchro, lancée par Vercel Cron
 *        toutes les 15 minutes (en-tête Authorization: Bearer CRON_SECRET)
 *
 * Synchro (06/11/2026, choix de Gabriel) : chaque email reçu est lu en entier
 * et analysé par Claude. S'il concerne un lead (adresse connue, même domaine,
 * même nom, ou contenu clair), il va dans son historique avec un résumé, et la
 * tâche dit exactement quoi faire ; « Répondre » seulement si Gabriel n'a pas
 * déjà répondu dans le fil. Une vraie piste inconnue va dans « À trier » ; le
 * reste (élèves, notifications, démarchage…) est écarté avec la raison, visible
 * dans la page. Jamais de lead créé tout seul. Les emails que Gabriel envoie
 * depuis Gmail vont aussi dans l'historique, et règlent la tâche de leur fil. Un RDV
 * noté dans le CRM crée l'événement dans l'agenda de gabriel@ia-entrepreneur.fr,
 * sans inviter personne. Portées Google : gmail.compose, gmail.readonly,
 * calendar.events (même jeton que l'envoi).
 *
 * Toutes les requêtes portent l'en-tête X-Cle-Crm. Sans la bonne clé, rien :
 * ni lecture ni écriture. La page elle-même est publique (le dépôt l'est), ce
 * sont les données qui sont protégées, et elles ne passent jamais par le dépôt.
 *
 * Variables d'environnement :
 *   CRM_CLE  la clé d'accès. Sans elle, tout répond 503.
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  les tables iae_crm_* (RLS activée
 *       sans aucune policy : seule la clé de service, côté serveur, y accède).
 *   GMAIL_IAE_CLIENT_ID, GMAIL_IAE_CLIENT_SECRET, GMAIL_IAE_REFRESH_TOKEN
 *       l'envoi depuis gabriel@ia-entrepreneur.fr (client OAuth du Workspace
 *       ia-entrepreneur.fr, portée gmail.compose, le même que
 *       ~/.config/gmail-iae/gmail_iae.py). Sans elles, la page n'affiche pas
 *       les boutons d'envoi : on ne promet pas ce qu'on ne peut pas faire.
 *       Avant tout envoi, la boîte reliée est vérifiée : si ce n'est pas
 *       gabriel@ia-entrepreneur.fr, rien ne part.
 *   ANTHROPIC_API_KEY  la rédaction d'après les notes (déjà utilisée par
 *       /api/conseil). Sans elle, la page n'affiche pas le bouton.
 */

import { timingSafeEqual, randomBytes } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import {
  deposerPiece, empreinte as empreinteTexte, etatDossier, lireFichier, majStatut, nouveauJeton, verifierSiret, aujourdHui as aujourdHuiF,
} from './_formateurs.js';

// La rédaction par Claude peut prendre une quinzaine de secondes.
export const maxDuration = 60;

const COMPTE = 'gabriel@ia-entrepreneur.fr';
const EXPEDITEUR = `Gabriel Vanderbecken <${COMPTE}>`;
const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me';
const HOTES_AUTORISES = ['ia-entrepreneur.fr', 'www.ia-entrepreneur.fr'];
const EMAIL_RE = /^[^@\s<>,;"]+@[^@\s<>,;".]+(\.[^@\s<>,;".]+)+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_EMAILS_JOUR = 60;

/* ---------- Colonnes autorisées, table par table ---------- */

const T = 'texte';      // 2 000 caractères
const L = 'long';       // 50 000 caractères
const STATUTS = ['nouveau', 'contacte', 'qualifie', 'proposition', 'negociation', 'gagne', 'perdu'];
const TYPES_LEAD = ['prospect', 'client', 'partenaire', 'fournisseur', 'formateur'];
// Suivi client, après « Gagné » (Gabriel, 06/11/2026).
const SUIVIS = ['a_lancer', 'financement_demande', 'financement_accepte', 'programme_valide', 'dates_placees',
  'convention_signee', 'convocations', 'formation_terminee', 'facturee', 'payee'];
const ACTIONS = ['email', 'appel', 'rdv', 'autre'];
const TYPES_ACTIVITE = ['note', 'appel', 'appel_sans_reponse', 'email_envoye', 'email_recu',
  'brouillon', 'rdv', 'sms', 'relance_decalee', 'statut', 'import', 'linkedin'];

const TABLES = {
  leads: {
    nom: 'iae_crm_leads',
    requis: ['entreprise'],
    colonnes: {
      entreprise: T, type: ['enum', TYPES_LEAD], statut: ['enum', STATUTS], secteur: T, telephone: T,
      site_web: T, localisation: T, adresse: T, siret: T, valeur: 'nombre', besoin: L, service: T,
      budget: T, source: T, tags: 'tags', prochaine_relance: 'date', prochaine_action: ['enum', ACTIONS],
      prochaine_note: T, relances_sans_reponse: 'entier', dernier_contact: 'date', raison_perte: T,
      hubspot_id: T, archive: 'bool', tache_fil: T,
      suivi: ['enum', SUIVIS], formation_debut: 'date', formation_fin: 'date', financeur: T, financement_ref: T,
    },
  },
  contacts: {
    nom: 'iae_crm_contacts',
    requis: ['lead_id'],
    colonnes: {
      lead_id: 'uuid', prenom: T, nom: T, email: T, telephone: T, poste: T, principal: 'bool', notes: L, linkedin: T,
    },
  },
  activites: {
    nom: 'iae_crm_activites',
    requis: ['lead_id', 'type', 'resume'],
    colonnes: {
      lead_id: 'uuid', contact_id: 'uuid', date: 'instant', type: ['enum', TYPES_ACTIVITE],
      resume: T, contenu: L, source: T, meta: 'json',
    },
  },
  memos: {
    nom: 'iae_crm_memos',
    requis: ['categorie', 'titre', 'contenu'],
    colonnes: { categorie: T, titre: T, contenu: L, sources: 'tags', date_maj: 'date', ordre: 'entier' },
  },
  modeles: {
    nom: 'iae_crm_modeles',
    requis: ['nom', 'objet', 'corps'],
    colonnes: { nom: T, usage: T, objet: T, corps: L, ordre: 'entier', canal: ['enum', ['email', 'sms']] },
  },
};

const REGLAGES_AUTORISES = ['signature', 'rappel_matin'];
const MAX_LOT = 500;

class Refus extends Error {
  constructor(code, statut = 400) {
    super(code);
    this.code = code;
    this.statut = statut;
  }
}

function nettoyer(valeurs, table, creation, avecId = false) {
  if (!valeurs || typeof valeurs !== 'object' || Array.isArray(valeurs)) throw new Refus('valeurs_invalides');
  const def = TABLES[table];
  const sortie = {};
  if (avecId) {
    if (!UUID_RE.test(valeurs.id || '')) throw new Refus('id_invalide');
    sortie.id = valeurs.id;
  }
  for (const [cle, brut] of Object.entries(valeurs)) {
    const type = def.colonnes[cle];
    if (!type) continue; // colonne inconnue : ignorée, jamais transmise à la base
    sortie[cle] = convertir(brut, type, cle);
  }
  if (creation) {
    for (const cle of def.requis) {
      if (sortie[cle] === undefined || sortie[cle] === null || sortie[cle] === '') throw new Refus(`champ_requis:${cle}`);
    }
  }
  return sortie;
}

function convertir(v, type, cle) {
  if (v === null || v === undefined) return null;
  const nom = Array.isArray(type) ? type[0] : type;
  switch (nom) {
    case 'texte':
    case 'long': {
      const t = String(v).replace(/\u0000/g, '').trim();
      const max = nom === 'texte' ? 2000 : 50000;
      if (t.length > max) throw new Refus(`trop_long:${cle}`);
      return t === '' ? null : t;
    }
    case 'enum':
      if (!type[1].includes(v)) throw new Refus(`valeur_invalide:${cle}`);
      return v;
    case 'nombre': {
      if (v === '') return null;
      const n = Number(String(v).replace(',', '.').replace(/\s/g, ''));
      if (!Number.isFinite(n) || Math.abs(n) > 1e9) throw new Refus(`nombre_invalide:${cle}`);
      return n;
    }
    case 'entier': {
      const n = Number(v);
      if (!Number.isInteger(n) || Math.abs(n) > 1e6) throw new Refus(`entier_invalide:${cle}`);
      return n;
    }
    case 'bool':
      return v === true;
    case 'date':
      if (v === '') return null;
      if (!DATE_RE.test(v) || Number.isNaN(Date.parse(v))) throw new Refus(`date_invalide:${cle}`);
      return v;
    case 'instant':
      if (Number.isNaN(Date.parse(v))) throw new Refus(`date_invalide:${cle}`);
      return new Date(v).toISOString();
    case 'uuid':
      if (v === '') return null;
      if (!UUID_RE.test(v)) throw new Refus(`id_invalide:${cle}`);
      return v;
    case 'tags':
      if (!Array.isArray(v) || v.length > 30) throw new Refus(`liste_invalide:${cle}`);
      return v.map((x) => String(x).trim()).filter(Boolean).map((x) => {
        if (x.length > 500) throw new Refus(`trop_long:${cle}`);
        return x;
      });
    case 'json':
      if (typeof v !== 'object') throw new Refus(`json_invalide:${cle}`);
      if (JSON.stringify(v).length > 20000) throw new Refus(`trop_long:${cle}`);
      return v;
    default:
      throw new Refus(`type_inconnu:${cle}`);
  }
}

/* ---------- Accès ---------- */

const echecs = new Map();
const FENETRE_MS = 10 * 60 * 1000;
const MAX_ECHECS = 12;

function empreinte(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '?').split(',')[0].trim();
}

function tropDEchecs(ip) {
  const maintenant = Date.now();
  const recents = (echecs.get(ip) || []).filter((t) => maintenant - t < FENETRE_MS);
  echecs.set(ip, recents);
  return recents.length >= MAX_ECHECS;
}

function noterEchec(ip) {
  if (echecs.size > 5000) echecs.clear();
  echecs.set(ip, [...(echecs.get(ip) || []), Date.now()]);
}

function cleValide(req) {
  const attendue = process.env.CRM_CLE || '';
  const donnee = String(req.headers['x-cle-crm'] || '');
  if (!attendue || !donnee) return false;
  const a = Buffer.from(attendue);
  const b = Buffer.from(donnee);
  return a.length === b.length && timingSafeEqual(a, b);
}

function origineEtrangere(req) {
  const origine = req.headers.origin;
  if (!origine) return false;
  try {
    const hote = new URL(origine).hostname;
    return !(HOTES_AUTORISES.includes(hote) || hote.endsWith('.vercel.app') || hote === 'localhost' || hote === '127.0.0.1');
  } catch {
    return true;
  }
}

/* ---------- Supabase (clé de service, côté serveur uniquement) ---------- */

function supabaseConfigure() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function sb(chemin, { methode = 'GET', corps, prefer, plage } = {}) {
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const entetes = { apikey: cle, Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' };
  if (prefer) entetes.Prefer = prefer;
  if (plage) entetes.Range = plage;
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${chemin}`, {
    method: methode,
    headers: entetes,
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  if (!r.ok) {
    const detail = (await r.text()).slice(0, 300);
    console.error('crm supabase', methode, chemin.split('?')[0], r.status, detail);
    throw new Refus('base_indisponible', 502);
  }
  if (r.status === 204) return { lignes: null, r };
  const texte = await r.text();
  return { lignes: texte ? JSON.parse(texte) : null, r };
}

// Supabase plafonne une réponse à 1 000 lignes : on pagine.
async function toutLire(table, ordre) {
  const lignes = [];
  for (let debut = 0; debut < 20000; debut += 1000) {
    const { lignes: page } = await sb(`${table}?select=*&order=${ordre}`, { plage: `${debut}-${debut + 999}` });
    lignes.push(...page);
    if (page.length < 1000) break;
  }
  return lignes;
}

async function inserer(table, valeurs) {
  const { lignes } = await sb(TABLES[table].nom, { methode: 'POST', corps: valeurs, prefer: 'return=representation' });
  return lignes[0];
}

async function modifier(table, id, valeurs) {
  if (!UUID_RE.test(id || '')) throw new Refus('id_invalide');
  if (Object.keys(valeurs).length === 0) throw new Refus('rien_a_modifier');
  const { lignes } = await sb(`${TABLES[table].nom}?id=eq.${id}`, { methode: 'PATCH', corps: valeurs, prefer: 'return=representation' });
  if (!lignes || lignes.length === 0) throw new Refus('introuvable', 404);
  return lignes[0];
}

async function supprimer(table, id) {
  if (!UUID_RE.test(id || '')) throw new Refus('id_invalide');
  await sb(`${TABLES[table].nom}?id=eq.${id}`, { methode: 'DELETE', prefer: 'return=minimal' });
}

function aujourdHuiParis() {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/* ---------- Gmail (gabriel@ia-entrepreneur.fr) ---------- */

function gmailConfigure() {
  return Boolean(process.env.GMAIL_IAE_CLIENT_ID && process.env.GMAIL_IAE_CLIENT_SECRET && process.env.GMAIL_IAE_REFRESH_TOKEN);
}

let jetonGmail = null;
let boiteVerifiee = false;

async function accesGmail() {
  if (jetonGmail && jetonGmail.expire > Date.now() + 60000) return jetonGmail.valeur;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_IAE_CLIENT_ID,
      client_secret: process.env.GMAIL_IAE_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_IAE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  if (!r.ok) {
    console.error('crm gmail jeton', r.status, (await r.text()).slice(0, 200));
    throw new Refus('gmail_connexion', 502);
  }
  const j = await r.json();
  jetonGmail = { valeur: j.access_token, expire: Date.now() + (j.expires_in || 3000) * 1000 };
  if (!boiteVerifiee) {
    const p = await fetch(`${GMAIL}/profile`, { headers: { Authorization: `Bearer ${j.access_token}` } });
    const profil = p.ok ? await p.json() : {};
    if (String(profil.emailAddress || '').toLowerCase() !== COMPTE) {
      jetonGmail = null;
      throw new Refus('gmail_mauvaise_boite', 502);
    }
    boiteVerifiee = true;
  }
  return jetonGmail.valeur;
}

// En-tête encodé RFC 2047, découpé pour rester sous 75 caractères par mot.
function entete(texte) {
  if (/^[\x20-\x7e]*$/.test(texte)) return texte;
  const morceaux = [];
  let courant = '';
  for (const c of texte) {
    if (Buffer.byteLength(courant + c, 'utf8') > 42) {
      morceaux.push(courant);
      courant = '';
    }
    courant += c;
  }
  if (courant) morceaux.push(courant);
  return morceaux.map((m) => `=?UTF-8?B?${Buffer.from(m, 'utf8').toString('base64')}?=`).join('\r\n ');
}

function messageBrut({ a, objet, corps, enReponseA }) {
  const idMessage = `<crm-${randomBytes(12).toString('hex')}@ia-entrepreneur.fr>`;
  const lignes = [
    `From: ${EXPEDITEUR}`,
    `To: ${a}`,
    `Subject: ${entete(objet)}`,
    `Message-ID: ${idMessage}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
  ];
  if (enReponseA) lignes.push(`In-Reply-To: ${enReponseA}`, `References: ${enReponseA}`);
  lignes.push(
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(corps.replace(/\r?\n/g, '\r\n'), 'utf8').toString('base64').replace(/.{76}/g, '$&\r\n'),
  );
  return { brut: Buffer.from(lignes.join('\r\n'), 'utf8').toString('base64url'), idMessage };
}

async function envoyerGmail({ a, objet, corps, mode, fil, enReponseA }) {
  const jeton = await accesGmail();
  const { brut, idMessage } = messageBrut({ a, objet, corps, enReponseA });
  const message = { raw: brut };
  if (fil) message.threadId = fil;
  const url = mode === 'brouillon' ? `${GMAIL}/drafts` : `${GMAIL}/messages/send`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(mode === 'brouillon' ? { message } : message),
  });
  if (!r.ok) {
    console.error('crm gmail envoi', r.status, (await r.text()).slice(0, 300));
    throw new Refus('gmail_envoi', 502);
  }
  const d = await r.json();
  return mode === 'brouillon'
    ? { brouillon_id: d.id, gmail_id: d.message?.id, fil: d.message?.threadId, message_id: idMessage }
    : { gmail_id: d.id, fil: d.threadId, message_id: idMessage };
}

async function emailsEnvoyesAujourdhui() {
  const debut = new Date(`${aujourdHuiParis()}T00:00:00+01:00`).toISOString();
  const { r } = await sb(`iae_crm_activites?select=id&type=eq.email_envoye&source=eq.crm&date=gte.${encodeURIComponent(debut)}`, {
    prefer: 'count=exact',
    plage: '0-0',
  });
  const total = Number((r.headers.get('content-range') || '').split('/')[1]);
  return Number.isFinite(total) ? total : 0;
}

/* ---------- Opérations ---------- */

async function lireTout() {
  const [leads, contacts, activites, memos, modeles, reglages, { lignes: entrants }, { lignes: ecartes }, formateurs, documents, programmes] = await Promise.all([
    toutLire('iae_crm_leads', 'entreprise.asc'),
    toutLire('iae_crm_contacts', 'principal.desc,created_at.asc'),
    toutLire('iae_crm_activites', 'date.desc'),
    toutLire('iae_crm_memos', 'categorie.asc,ordre.asc,titre.asc'),
    toutLire('iae_crm_modeles', 'ordre.asc,nom.asc'),
    toutLire('iae_crm_reglages', 'cle.asc'),
    sb('iae_crm_entrants?select=*&statut=eq.a_trier&order=recu_le.desc&limit=100'),
    sb('iae_crm_entrants?select=id,recu_le,canal,de_email,de_nom,objet,fil,meta&statut=eq.ignore&order=recu_le.desc&limit=60'),
    toutLire('iae_crm_formateurs', 'created_at.asc'),
    sb('iae_crm_documents?select=id,created_at,lead_id,type,nom,mime,taille,depose_par,lecture,statut,motif,verifie_le,expire_le,archive&order=created_at.desc&limit=2000').then((x) => x.lignes),
    toutLire('iae_crm_programmes', 'created_at.desc'),
  ]);
  return {
    leads, contacts, activites, memos, modeles, entrants, ecartes, documents, programmes,
    formateurs: formateurs.map(({ jeton_hash: _h, signature, ...f }) => ({ ...f, signature: signature ? { nom: signature.nom, lieu: signature.lieu, date: signature.date, version: signature.version, empreinte: signature.empreinte, ip: signature.ip } : null })),
    reglages: Object.fromEntries(reglages.map((r) => [r.cle, r.valeur])),
    gmail: gmailConfigure(),
    agenda: gmailConfigure(),
    ia: Boolean(process.env.ANTHROPIC_API_KEY),
    expediteur: COMPTE,
    aujourdhui: aujourdHuiParis(),
  };
}

function table(nom) {
  if (!Object.prototype.hasOwnProperty.call(TABLES, nom)) throw new Refus('table_inconnue');
  return nom;
}

async function operation(corps) {
  const op = corps?.op;
  if (op === 'creer') {
    const t = table(corps.table);
    return { ligne: await inserer(t, nettoyer(corps.valeurs, t, true)) };
  }
  if (op === 'maj') {
    const t = table(corps.table);
    return { ligne: await modifier(t, corps.id, nettoyer(corps.valeurs, t, false)) };
  }
  if (op === 'supprimer') {
    await supprimer(table(corps.table), corps.id);
    return { supprime: true };
  }
  if (op === 'journal') {
    if (!UUID_RE.test(corps.lead_id || '')) throw new Refus('id_invalide');
    const activite = nettoyer({ ...corps.activite, lead_id: corps.lead_id }, 'activites', true);
    let agenda = null;
    if (corps.agenda && activite.type === 'rdv' && gmailConfigure()) {
      try {
        const ev = await creerEvenement(corps.lead_id, corps.agenda);
        activite.meta = { ...(activite.meta || {}), event_id: ev.id, lien_agenda: ev.htmlLink };
        agenda = true;
      } catch (e) {
        console.error('crm agenda', e.code || e.message);
        agenda = false;
      }
    }
    const ligne = await inserer('activites', activite);
    const lead = corps.lead ? await modifier('leads', corps.lead_id, nettoyer(corps.lead, 'leads', false)) : null;
    return { activite: ligne, lead, agenda };
  }
  if (op === 'lot') return operationLot(corps);
  if (op === 'synchro') return synchroniser();
  if (op === 'entrant') return traiterEntrant(corps);
  if (op === 'recap') return recapLead(corps);
  if (op && op.startsWith('formateur_') || op === 'piece_deposer' || op === 'document_verifier') return operationFormateur(corps);
  if (op && op.startsWith('programme_')) return operationProgramme(corps);
  if (op === 'importer') return importer(corps);
  if (op === 'email') return envoyerEmail(corps);
  if (op === 'reglage') {
    if (!REGLAGES_AUTORISES.includes(corps.cle)) throw new Refus('reglage_inconnu');
    const valeur = convertir(corps.valeur ?? '', L, corps.cle) ?? '';
    const { lignes } = await sb('iae_crm_reglages?on_conflict=cle', {
      methode: 'POST',
      corps: { cle: corps.cle, valeur },
      prefer: 'resolution=merge-duplicates,return=representation',
    });
    return { reglage: lignes[0] };
  }
  throw new Refus('operation_inconnue');
}

function listeIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_LOT) throw new Refus('liste_invalide');
  if (!ids.every((id) => UUID_RE.test(id))) throw new Refus('id_invalide');
  return [...new Set(ids)];
}

async function operationLot(corps) {
  const ids = listeIds(corps.ids);
  const valeurs = nettoyer(corps.lead, 'leads', false);
  if (Object.keys(valeurs).length === 0) throw new Refus('rien_a_modifier');
  const { lignes: leads } = await sb(`iae_crm_leads?id=in.(${ids.join(',')})`, { methode: 'PATCH', corps: valeurs, prefer: 'return=representation' });
  let activites = [];
  if (corps.activite) {
    const lignes = ids.map((id) => nettoyer({ ...corps.activite, lead_id: id }, 'activites', true));
    ({ lignes: activites } = await sb('iae_crm_activites', { methode: 'POST', corps: lignes, prefer: 'return=representation' }));
  }
  return { leads, activites };
}

async function importer(corps) {
  if (!Array.isArray(corps.lignes) || corps.lignes.length === 0 || corps.lignes.length > MAX_LOT) throw new Refus('liste_invalide');
  const leads = [];
  const contacts = [];
  for (const ligne of corps.lignes) {
    const lead = nettoyer(ligne.lead, 'leads', true, true);
    leads.push(lead);
    if (ligne.contact) contacts.push(nettoyer({ ...ligne.contact, lead_id: lead.id }, 'contacts', true, true));
  }
  // Toutes les lignes d'un envoi doivent avoir les mêmes colonnes pour PostgREST.
  const uniformiser = (lignes) => {
    const cles = [...new Set(lignes.flatMap((l) => Object.keys(l)))];
    return lignes.map((l) => Object.fromEntries(cles.map((k) => [k, l[k] === undefined ? null : l[k]])));
  };
  const leadsUnis = uniformiser(leads).map((l) => ({ ...l, tags: l.tags || [], prochaine_action: l.prochaine_action || 'email', type: l.type || 'prospect', statut: l.statut || 'nouveau' }));
  const { lignes: creesLeads } = await sb('iae_crm_leads', { methode: 'POST', corps: leadsUnis, prefer: 'return=representation' });
  let creesContacts = [];
  if (contacts.length) ({ lignes: creesContacts } = await sb('iae_crm_contacts', { methode: 'POST', corps: uniformiser(contacts).map((c) => ({ ...c, principal: c.principal === true })), prefer: 'return=representation' }));
  const journal = creesLeads.map((l) => ({ lead_id: l.id, type: 'import', resume: 'Ajouté par import en masse (collage depuis un tableau)', source: 'crm' }));
  const { lignes: creesActivites } = await sb('iae_crm_activites', { methode: 'POST', corps: journal, prefer: 'return=representation' });
  return { leads: creesLeads, contacts: creesContacts, activites: creesActivites };
}

async function envoyerEmail(corps) {
  if (!gmailConfigure()) throw new Refus('gmail_non_configure', 503);
  if (!UUID_RE.test(corps.lead_id || '')) throw new Refus('id_invalide');
  const mode = corps.mode === 'brouillon' ? 'brouillon' : 'envoyer';
  const a = String(corps.a || '').trim();
  const objet = String(corps.objet || '').replace(/[\r\n]+/g, ' ').trim();
  const texte = String(corps.corps || '').replace(/\u0000/g, '');
  if (!EMAIL_RE.test(a) || a.length > 254) throw new Refus('adresse_invalide');
  if (!objet || objet.length > 250) throw new Refus('objet_invalide');
  if (!texte.trim() || texte.length > 20000) throw new Refus('message_invalide');
  const fil = corps.fil && /^[0-9a-f]{6,32}$/i.test(corps.fil) ? corps.fil : null;
  const enReponseA = corps.en_reponse_a && /^<[^<>\s\r\n]{3,200}>$/.test(corps.en_reponse_a) ? corps.en_reponse_a : null;
  const contactId = corps.contact_id && UUID_RE.test(corps.contact_id) ? corps.contact_id : null;
  const majLead = corps.lead ? nettoyer(corps.lead, 'leads', false) : null;

  if (mode === 'envoyer' && (await emailsEnvoyesAujourdhui()) >= MAX_EMAILS_JOUR) throw new Refus('trop_d_emails_aujourdhui', 429);

  const gmail = await envoyerGmail({ a, objet, corps: texte, mode, fil, enReponseA });

  // L'email est parti : si le journal échoue, on le dit sans faire croire
  // à un échec d'envoi (sinon Gabriel renverrait le même message).
  let activite = null;
  let lead = null;
  try {
    activite = await inserer('activites', {
      lead_id: corps.lead_id,
      contact_id: contactId,
      type: mode === 'brouillon' ? 'brouillon' : 'email_envoye',
      resume: `${mode === 'brouillon' ? 'Brouillon Gmail' : 'Email envoyé'} à ${a} : « ${objet} »`.slice(0, 2000),
      contenu: texte,
      source: 'crm',
      meta: { ...gmail, a, objet, de: COMPTE },
    });
    if (majLead && Object.keys(majLead).length) lead = await modifier('leads', corps.lead_id, majLead);
  } catch (e) {
    console.error('crm journal après email', e.code || e.message);
    return { envoye: mode === 'envoyer', brouillon: mode === 'brouillon', gmail, journal: false };
  }
  return { envoye: mode === 'envoyer', brouillon: mode === 'brouillon', gmail, activite, lead, journal: true };
}

/* ---------- Rédaction d'après les notes (Claude) ---------- */

const MODELE_REDACTION = 'claude-opus-5-5';
const TYPES_LISIBLES = {
  note: 'Note', appel: 'Appel abouti', appel_sans_reponse: 'Appel sans réponse', email_envoye: 'Email envoyé', email_recu: 'Réponse ou demande reçue',
  brouillon: 'Brouillon', rdv: 'Rendez-vous', sms: 'SMS envoyé', relance_decalee: 'Relance déplacée', statut: 'Étape', linkedin: 'LinkedIn',
};
const CATEGORIES_MEMO = ['À ne jamais dire', "Ce qu'on dit à la place", 'Offre', 'Relances', 'Prix et financement'];
const redactions = new Map();
const MAX_REDACTIONS = 40; // par adresse IP et par fenêtre de 10 minutes

// Ce bloc ne change jamais : il passe avant le mémo, et le tout est mis en
// cache (le mémo bouge rarement), pour ne payer le long contexte qu'une fois.
const CONSIGNES_REDACTION = `Tu rédiges, pour Gabriel Vanderbecken, fondateur de l'organisme de formation IA-Entrepreneur, un message de suivi à une personne de son réseau (rencontre, recommandation, partenaire, client). Ce n'est pas de la prospection à froid. Le message part sous son nom : écris comme lui, simplement, comme un professionnel qui connaît la personne.

Tu reçois la fiche du lead : l'entreprise, le contact, l'étape, son besoin, ce qui est prévu, et l'historique des derniers échanges avec les notes de Gabriel. Ces notes sont des notes pour lui : appuie-toi sur leurs faits, ne les recopie jamais telles quelles, et ne reprends jamais un jugement interne (« m'a dit intéressé », « pas chaud », « à relancer »), un doute, ni la façon dont on a obtenu les coordonnées.

Règles :
- Utilise seulement les faits présents dans la fiche et l'historique. N'invente aucune date, aucun chiffre, aucun nom, aucun engagement. Si les notes ne disent rien d'utile, écris un message court et général, sans faire semblant de savoir.
- Si le dernier échange contient un engagement ou une demande (envoyer un programme, rappeler après un comité, une date évoquée), c'est le sujet du message : rappelle-le en une phrase naturelle.
- Une seule demande par message, claire, à la fin (un créneau d'appel, une réponse, un document).
- Vouvoiement, sauf si la consigne demande le tutoiement.
- Commence par « Bonjour {prénom}, » si le prénom est connu, sinon « Bonjour, ».
- Email : 60 à 120 mots, objet court et précis (pas de « Re: », pas de point d'exclamation), termine par « Bonne journée, » sur sa propre ligne. N'écris pas de signature : le CRM l'ajoute.
- SMS : 300 caractères au plus, une ou deux phrases, pas d'objet (renvoie un objet vide), termine par « Gabriel, IA-Entrepreneur ».
- Si un modèle est fourni, garde sa structure et sa demande, et adapte le début aux notes. Remplace chaque variable entre accolades par le bon contenu, ou retire la phrase si tu n'as pas l'information.
- Si une consigne de Gabriel est fournie, elle passe avant le modèle.
- Typographie française : guillemets « », pas de tiret long ni demi-cadratin comme ponctuation, pas de flèche, pas d'emoji, pas de gras. Évite les tournures qui sonnent écrites par une machine (« pas X mais Y », énumérations par trois, formules creuses).
- Ne parle jamais d'intelligence artificielle qui aurait rédigé le message.

Interdits absolus (règles commerciales d'IA-Entrepreneur, détaillées dans le mémo ci-dessous) : aucun prix ni montant, aucun ROI ni gain en euros ou en pourcentage, jamais « garanti » ni « 100 % », jamais le CPF, jamais un code de certification, jamais « zéro reste à charge » ni « sans reste à charge », aucune menace d'amende ou de sanction liée à l'AI Act.

Renvoie aussi « appuis » : une à trois courtes phrases qui disent sur quels éléments de l'historique tu t'es appuyé (par exemple « Appel du 05/11 : attend le programme du niveau 2 »), pour que Gabriel vérifie d'un coup d'œil.`;

const SCHEMA_REDACTION = {
  type: 'object',
  properties: {
    objet: { type: 'string', description: "Objet de l'email ; chaîne vide pour un SMS" },
    corps: { type: 'string', description: 'Texte du message, sans signature pour un email' },
    appuis: { type: 'array', items: { type: 'string' }, description: "Éléments de l'historique utilisés" },
  },
  required: ['objet', 'corps', 'appuis'],
  additionalProperties: false,
};

// Filet de sécurité après Claude : ce qui ne doit jamais partir est signalé
// dans la fenêtre, à côté du texte, pour que Gabriel corrige avant l'envoi.
const ALERTES = [
  [/€|\beuros?\b|\bHT\b/i, 'Le texte parle d\'un montant : pas de prix par écrit hors devis.'],
  [/\bROI\b|retour sur investissement/i, 'Le texte parle de ROI.'],
  [/garanti/i, 'Le texte promet une garantie.'],
  [/100\s?%/, 'Le texte contient « 100 % ».'],
  [/\bCPF\b/, 'Le texte parle du CPF.'],
  [/\bRS\s?\d{3,5}\b|\bRNCP\b/i, 'Le texte contient un code de certification.'],
  [/(z[ée]ro|sans|aucun)\s+reste\s+[àa]\s+charge/i, 'Le texte promet zéro reste à charge.'],
  [/amende|sanction/i, "Le texte parle d'amende ou de sanction."],
  [/\{[a-z_]+\}/, 'Une variable entre accolades reste à remplacer.'],
];

function tropDeRedactions(ip) {
  const maintenant = Date.now();
  const recentes = (redactions.get(ip) || []).filter((t) => maintenant - t < FENETRE_MS);
  if (redactions.size > 5000) redactions.clear();
  if (recentes.length >= MAX_REDACTIONS) return true;
  recentes.push(maintenant);
  redactions.set(ip, recentes);
  return false;
}

function couper(t, max) { const x = String(t ?? ''); return x.length > max ? `${x.slice(0, max)}…` : x; }

async function rediger(corps, ip) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Refus('ia_non_configuree', 503);
  if (!UUID_RE.test(corps.lead_id || '')) throw new Refus('id_invalide');
  const canal = corps.canal === 'sms' ? 'sms' : 'email';
  if (tropDeRedactions(ip)) throw new Refus('ia_trop_de_demandes', 429);
  const consigne = couper(String(corps.consigne || '').trim(), 500);
  const modeleId = corps.modele_id && UUID_RE.test(corps.modele_id) ? corps.modele_id : null;

  const [{ lignes: leads }, { lignes: contacts }, { lignes: activites }, { lignes: memos }, modele] = await Promise.all([
    sb(`iae_crm_leads?select=*&id=eq.${corps.lead_id}`),
    sb(`iae_crm_contacts?select=*&lead_id=eq.${corps.lead_id}&order=principal.desc,created_at.asc`),
    sb(`iae_crm_activites?select=date,type,resume,contenu,source,meta&lead_id=eq.${corps.lead_id}&order=date.desc&limit=12`),
    sb('iae_crm_memos?select=categorie,titre,contenu&order=categorie.asc,ordre.asc'),
    modeleId ? sb(`iae_crm_modeles?select=nom,objet,corps,canal&id=eq.${modeleId}`).then((r) => r.lignes[0] || null) : Promise.resolve(null),
  ]);
  const lead = leads[0];
  if (!lead) throw new Refus('introuvable', 404);
  const contact = contacts.find((c) => c.id === corps.contact_id) || contacts.find((c) => c.principal) || contacts[0] || null;

  const memo = memos.filter((m) => CATEGORIES_MEMO.includes(m.categorie))
    .map((m) => `## ${m.categorie} : ${m.titre}\n${m.contenu}`).join('\n\n');
  const historique = activites.filter((a) => a.type !== 'import').map((a) => {
    const jour = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short' }).format(new Date(a.date));
    const quoi = `${TYPES_LISIBLES[a.type] || a.type}${a.type === 'linkedin' && a.meta?.etape ? ` (${a.meta.etape})` : ''}`;
    return `- ${jour}, ${quoi} : ${couper(a.resume, 600)}${a.contenu ? `\n  Détail : ${couper(a.contenu.replace(/\s+/g, ' '), 1500)}` : ''}`;
  }).join('\n');
  const fiche = [
    `Canal : ${canal === 'sms' ? 'SMS' : 'email'}`,
    `Date du jour : ${aujourdHuiParis()}`,
    `Entreprise : ${lead.entreprise}`,
    contact ? `Contact : ${[contact.prenom, contact.nom].filter(Boolean).join(' ') || 'nom inconnu'}${contact.poste ? `, ${contact.poste}` : ''}` : 'Contact : inconnu',
    `Étape : ${lead.statut}`,
    lead.besoin ? `Besoin noté : ${couper(lead.besoin, 800)}` : null,
    lead.prochaine_note ? `Ce qui est prévu : ${couper(lead.prochaine_note, 500)}` : null,
    `Relances déjà faites sans réponse : ${lead.relances_sans_reponse}`,
    `Tutoiement : ${corps.tutoyer === true ? 'oui' : 'non'}`,
    modele ? `Modèle à suivre (« ${modele.nom} ») :\nObjet : ${modele.objet}\n${modele.corps}` : null,
    consigne ? `Consigne de Gabriel : ${consigne}` : null,
    `Historique, du plus récent au plus ancien :\n${historique || '(aucun échange noté)'}`,
  ].filter(Boolean).join('\n\n');

  const client = new Anthropic({ timeout: 50000, maxRetries: 1 });
  let reponse;
  try {
    reponse = await client.beta.messages.create({
      model: MODELE_REDACTION,
      max_tokens: 8000,
      // Un message court : peu de réflexion suffit, et la réponse arrive plus vite.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA_REDACTION } },
      // Si les filtres de sécurité refusent, l'API relance sur le modèle de repli recommandé.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [
        { type: 'text', text: CONSIGNES_REDACTION },
        { type: 'text', text: `# Mémo commercial d'IA-Entrepreneur\n\n${memo}`, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: fiche }],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new Refus('ia_trop_de_demandes', 429);
    if (e instanceof Anthropic.APIConnectionError) throw new Refus('ia_injoignable', 502);
    if (e instanceof Anthropic.APIError) { console.error('crm rédaction', e.status, e.message); throw new Refus('ia_erreur', 502); }
    throw e;
  }
  if (reponse.stop_reason === 'refusal') throw new Refus('ia_refus', 422);
  if (reponse.stop_reason === 'max_tokens') throw new Refus('ia_coupe', 502);
  const texte = (reponse.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  let r;
  try {
    r = JSON.parse(texte);
  } catch {
    throw new Refus('ia_erreur', 502);
  }
  const objet = String(r.objet || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 250);
  const message = String(r.corps || '').trim().slice(0, 20000);
  if (!message) throw new Refus('ia_erreur', 502);
  const appuis = (Array.isArray(r.appuis) ? r.appuis : []).map((x) => String(x).slice(0, 300)).slice(0, 3);
  const alertes = ALERTES.filter(([motif]) => motif.test(`${objet}\n${message}`)).map(([, texteAlerte]) => texteAlerte);
  return { objet: canal === 'sms' ? '' : objet, corps: message, appuis, alertes };
}

/* ---------- Boîte de réception, agenda, « À trier » ---------- */

const CALENDAR = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const DOMAINES_INTERNES = ['ia-entrepreneur.fr', 'clindit.com'];
const EXPEDITEURS_AUTOMATIQUES = /(no-?reply|ne-?pas-?repondre|notification|mailer-daemon|newsletter|bounce|postmaster|calendar-notification|info@mailing|marketing@)/i;

async function google(url, options = {}) {
  const jeton = await accesGmail();
  const r = await fetch(url, { ...options, headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
  if (!r.ok) {
    console.error('crm google', r.status, url.split('?')[0], (await r.text()).slice(0, 300));
    throw new Refus(r.status === 403 ? 'google_acces' : 'google_erreur', 502);
  }
  return r.json();
}
async function lireReglage(cle) {
  const { lignes } = await sb(`iae_crm_reglages?select=valeur&cle=eq.${encodeURIComponent(cle)}`);
  return lignes[0] ? lignes[0].valeur : null;
}
async function ecrireReglage(cle, valeur) {
  await sb('iae_crm_reglages?on_conflict=cle', { methode: 'POST', corps: { cle, valeur }, prefer: 'resolution=merge-duplicates,return=minimal' });
}
const jourParis = (d) => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));
const heureParis = (d) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date(d)).replace(':', ' h ').replace(/ h 00$/, ' h');
const interne = (email) => DOMAINES_INTERNES.some((d) => email.endsWith(`@${d}`));
function adresse(entete) {
  const m = String(entete || '').match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? { nom: m[1].trim(), email: m[2].trim().toLowerCase() } : { nom: '', email: String(entete || '').trim().toLowerCase() };
}
function texteBrut(t) {
  return String(t || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (x, n) => String.fromCodePoint(Number(n))).replace(/\s+/g, ' ').trim();
}
async function contactParEmail(email) {
  const { lignes } = await sb(`iae_crm_contacts?select=id,lead_id,prenom,nom&email=ilike.${encodeURIComponent(email)}&limit=1`);
  return lignes[0] || null;
}

/* ---------- Lire un email en entier ---------- */

const decoder64 = (d) => Buffer.from(String(d).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
function decoderEntites(t) {
  return String(t || '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (x, n) => String.fromCodePoint(Number(n)));
}
function partieTexte(p) {
  if (!p) return '';
  if (p.mimeType === 'text/plain' && p.body?.data) return decoder64(p.body.data);
  for (const q of p.parts || []) { const t = partieTexte(q); if (t) return t; }
  if (p.mimeType === 'text/html' && p.body?.data) {
    return decoder64(p.body.data).replace(/<(style|script)[\s\S]*?<\/\1>/gi, '').replace(/<(br|\/p|\/div|\/li|\/tr|\/h\d)[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ');
  }
  return '';
}
function piecesJointes(p, out = []) {
  if (p?.filename && !/^(image\d*|\d+_\d+|outlook-\w+)\.(png|jpe?g|gif)$/i.test(p.filename)) out.push(p.filename);
  for (const q of p?.parts || []) piecesJointes(q, out);
  return out.slice(0, 20);
}
const propre = (t) => decoderEntites(t).replace(/\r/g, '').replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
// Le message lui-même, sans la citation du précédent.
function sansCitation(t) {
  const lignes = [];
  for (const l of String(t || '').replace(/\r/g, '').split('\n')) {
    if (/^\s*>/.test(l) || /^\s*(Le (lun|mar|mer|jeu|ven|sam|dim)\.? .{0,90}\d{1,2}:\d{2}|Le .{4,120}a écrit|On .{4,120}wrote|De ?: .*@|From: .*@|-{3,} ?(Message|Original|Forwarded|Mail)|_{8,})/i.test(l)) break;
    lignes.push(l);
  }
  return propre(lignes.join('\n'));
}
const enTetes = (m) => Object.fromEntries((m.payload?.headers || []).map((x) => [x.name.toLowerCase(), x.value]));
const listeAdresses = (v) => String(v || '').split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((x) => adresse(x).email).filter((x) => x && x.includes('@'));

async function lireFil(fil) {
  const t = await google(`${GMAIL}/threads/${encodeURIComponent(fil)}?format=full`);
  return (t.messages || []).filter((m) => !(m.labelIds || []).includes('DRAFT')).map((m) => {
    const h = enTetes(m);
    const de = adresse(h.from);
    const brut = partieTexte(m.payload);
    return {
      id: m.id, date: new Date(Number(m.internalDate) || Date.now()).toISOString(), de: de.nom || de.email, email: de.email,
      moi: de.email === COMPTE, a: String(h.to || '').slice(0, 300), objet: String(h.subject || '').slice(0, 300),
      texte: (sansCitation(brut) || texteBrut(m.snippet)).slice(0, 5000), complet: propre(brut).slice(0, 15000), pieces: piecesJointes(m.payload),
    };
  });
}
// Un fil n'est lisible que s'il est lié au CRM (historique ou « À trier »).
async function filDuCrm(fil) {
  if (!/^[0-9a-f]{6,32}$/i.test(fil || '')) throw new Refus('id_invalide');
  const [{ lignes: a }, { lignes: e }] = await Promise.all([
    sb(`iae_crm_activites?select=id&meta->>fil=eq.${fil}&limit=1`),
    sb(`iae_crm_entrants?select=id&fil=eq.${fil}&limit=1`),
  ]);
  if (!a.length && !e.length) throw new Refus('introuvable', 404);
  if (!gmailConfigure()) throw new Refus('gmail_non_configure', 503);
  return { fil, messages: await lireFil(fil) };
}

/* ---------- Dates ouvrées (mêmes règles que la page) ---------- */

function ajouterJoursIso(s, n) { const [y, m, d] = s.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, d + n)); return x.toISOString().slice(0, 10); }
function paquesIso(an) {
  const a = an % 19, b = Math.floor(an / 100), c = an % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
  return `${an}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
}
function estOuvreIso(s) {
  const an = Number(s.slice(0, 4));
  const p = paquesIso(an);
  const feries = [`${an}-01-01`, ajouterJoursIso(p, 1), `${an}-05-01`, `${an}-05-08`, ajouterJoursIso(p, 39), ajouterJoursIso(p, 50), `${an}-07-14`, `${an}-08-15`, `${an}-11-01`, `${an}-11-11`, `${an}-12-25`];
  const j = new Date(`${s}T12:00:00Z`).getUTCDay();
  return j !== 0 && j !== 6 && !feries.includes(s);
}
function dansJoursOuvres(n, depuis = aujourdHuiParis()) { let d = ajouterJoursIso(depuis, n); while (!estOuvreIso(d)) d = ajouterJoursIso(d, 1); return d; }
const dateCourte = (iso) => iso.split('-').reverse().join('/');

/* ---------- Qui est qui : leads et contacts, pour relier un email au bon lead ---------- */

const DOMAINES_PERSO = new Set(['gmail.com', 'googlemail.com', 'outlook.fr', 'outlook.com', 'hotmail.com', 'hotmail.fr', 'live.fr', 'live.com', 'msn.com',
  'yahoo.fr', 'yahoo.com', 'icloud.com', 'me.com', 'mac.com', 'orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr', 'neuf.fr', 'laposte.net', 'gmx.fr', 'gmx.com',
  'protonmail.com', 'proton.me', 'aol.com', 'bbox.fr', 'numericable.fr']);
const normaliser = (t) => String(t || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const nomDe = (c) => [c.prenom, c.nom].filter(Boolean).join(' ');

async function annuaire() {
  const [leads, contacts] = await Promise.all([toutLire('iae_crm_leads', 'entreprise.asc'), toutLire('iae_crm_contacts', 'principal.desc,created_at.asc')]);
  const parLead = new Map();
  for (const c of contacts) { if (!parLead.has(c.lead_id)) parLead.set(c.lead_id, []); parLead.get(c.lead_id).push(c); }
  return { leads, contacts, parLead, ids: new Set(leads.map((l) => l.id)), lead: (id) => leads.find((l) => l.id === id) };
}
// Des pistes, pas des certitudes : Claude tranche avec le contenu de l'email.
function candidatsPour(ann, { email, nom }) {
  const trouves = new Map();
  const dom = String(email || '').split('@')[1] || '';
  if (dom && !DOMAINES_PERSO.has(dom)) {
    const base = (dom.split('.').slice(-2, -1)[0] || '').replace(/[^a-z0-9]/g, '');
    for (const c of ann.contacts) if (c.email && c.email.toLowerCase().endsWith(`@${dom}`)) trouves.set(c.lead_id, `même domaine que ${nomDe(c) || c.email}`);
    for (const l of ann.leads) {
      if (l.site_web && l.site_web.toLowerCase().includes(dom)) trouves.set(l.id, `site ${l.site_web}`);
      const n = normaliser(l.entreprise).replace(/ /g, '');
      if (base.length >= 4 && n.length >= 4 && (n === base || n.startsWith(base) || base.startsWith(n))) trouves.set(l.id, `nom proche du domaine ${dom}`);
    }
  }
  const qui = normaliser(nom);
  if (qui.includes(' ')) {
    for (const c of ann.contacts) {
      const n1 = normaliser(nomDe(c));
      const n2 = normaliser([c.nom, c.prenom].filter(Boolean).join(' '));
      if (n1.includes(' ') && (qui === n1 || qui === n2)) trouves.set(c.lead_id, `même nom que le contact ${nomDe(c)}`);
    }
  }
  return [...trouves].slice(0, 5).map(([lead_id, raison]) => ({ lead_id, raison }));
}
// Le contact du lead qui porte ce nom reçoit l'adresse ; sinon l'expéditeur devient un contact du lead.
async function contactPourLead(ann, leadId, { email, nom }, suggestion = {}) {
  const cs = ann.parLead.get(leadId) || [];
  const exact = cs.find((c) => c.email && c.email.toLowerCase() === email);
  if (exact) return exact;
  const qui = normaliser(nom);
  const meme = qui && cs.find((c) => normaliser(nomDe(c)) === qui);
  if (meme) {
    if (!meme.email && email) { await modifier('contacts', meme.id, { email }); meme.email = email; }
    return meme;
  }
  if (!email) return null;
  const morceaux = String(nom || '').replace(/[."']/g, ' ').split(/\s+/).filter(Boolean);
  const c = await inserer('contacts', { lead_id: leadId, prenom: suggestion.prenom || morceaux[0] || null, nom: suggestion.nom || morceaux.slice(1).join(' ') || null, email, principal: false });
  ann.contacts.push(c);
  if (!ann.parLead.has(leadId)) ann.parLead.set(leadId, []);
  ann.parLead.get(leadId).push(c);
  return c;
}

/* ---------- Claude trie les emails ---------- */

const SCHEMA_TRI = {
  type: 'object',
  properties: {
    decisions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ref: { type: 'string' },
          action: { type: 'string', enum: ['rattacher', 'a_trier', 'ignorer'] },
          lead_id: { type: 'string', description: 'id copié de la liste, ou vide' },
          interet: { type: 'string', enum: ['oui', 'a_voir', 'non'] },
          a_faire: { type: 'string', enum: ['repondre', 'relancer_le', 'rien'] },
          relance_date: { type: 'string', description: 'AAAA-MM-JJ, ou vide' },
          tache: { type: 'string' },
          resume: { type: 'string' },
          raison: { type: 'string' },
          type: { type: 'string', enum: ['prospect', 'client', 'partenaire', 'fournisseur', 'formateur'] },
          entreprise: { type: 'string' },
          prenom: { type: 'string' },
          nom: { type: 'string' },
        },
        required: ['ref', 'action', 'lead_id', 'interet', 'a_faire', 'relance_date', 'tache', 'resume', 'raison', 'type', 'entreprise', 'prenom', 'nom'],
        additionalProperties: false,
      },
    },
  },
  required: ['decisions'],
  additionalProperties: false,
};

const CONSIGNES_TRI = `Tu tries la boîte mail professionnelle de Gabriel Vanderbecken (gabriel@ia-entrepreneur.fr), fondateur d'IA-Entrepreneur : un organisme de formation à l'IA pour les entreprises (formations en intra, financées par les OPCO, sous-traitance pour d'autres organismes de formation, partenariats). Son CRM personnel suit ses prospects, clients, partenaires, fournisseurs et formateurs (il recrute et fait travailler des formateurs indépendants). Pour chaque email reçu, tu décides ce qu'il en fait. Gabriel compte sur toi pour ne rien rater et ne pas encombrer son CRM.

action :
- rattacher : l'email concerne un lead de la liste. lead_id = son id, copié de la liste, jamais inventé. C'est le cas quand l'expéditeur est un contact du lead, travaille dans la même structure (même domaine, collègue, assistante, parent qui répond à sa place), ou quand l'email porte clairement sur ce client ou ce partenaire (un formateur qui parle de sa mission chez ce client, par exemple). Les candidats proposés sont des pistes : vérifie avec le contenu, un même domaine peut cacher une notification sans rapport. Un email « déjà rattaché » reste rattaché à ce lead.
- a_trier : une relation utile qui n'est pas encore dans le CRM : demande de formation ou de devis, entreprise intéressée, partenaire ou prescripteur qui propose quelque chose d'utile, formateur qui se propose ou envoie son CV, fournisseur avec qui il travaille. Remplis type, entreprise, prenom et nom si tu les vois.
- ignorer : tout le reste. Élèves et étudiants (TD, devoirs, retards, accès à la visio), notifications et confirmations automatiques, réponses automatiques à une campagne d'emails, démarchage reçu (logiciels, CRM, publicité), newsletters, messages personnels, administratif sans lien avec un lead.

interet : ce que vaut l'email pour l'activité de Gabriel (oui, a_voir, non).

a_faire, pour un email rattaché :
- repondre : la personne attend une réponse ou une action de Gabriel (question, devis, tarifs, programme, dates, documents, facture à émettre) et Gabriel n'a pas répondu après ce message (voir « dernier message du fil »).
- relancer_le : l'email annonce un retour à une date (« je reviens vers toi lundi », « Jean te répondra lundi »). relance_date = ce jour-là, en AAAA-MM-JJ.
- rien : information, remerciement, accusé de réception, ou Gabriel a déjà répondu.

tache : si a_faire n'est pas rien, une phrase à l'infinitif, adressée à Gabriel, qui dit exactement quoi faire avec les détails utiles (quoi, pour qui, chiffres, dates). Par exemple « Envoyer à Sarah tes tarifs et un plan de cours niveau 2 pour sa cliente (1 personne, Supply Chain, 1er semestre 2027) ». Jamais seulement « Répondre à l'email ».
resume : une phrase qui dit ce que contient l'email, avec les faits.
raison : pourquoi cette décision, en quelques mots (« élève, rendu de TD », « même domaine que Jean Piron, il répondra lundi »).
type : la nature de la relation (prospect, client, partenaire, fournisseur, formateur), même pour un email rattaché ou ignoré.

En français. N'invente rien : seulement ce qui est dans l'email et dans la liste.`;

const resumeAnalyse = (d) => ({
  action: d.action, lead_id: d.lead_id || '', interet: d.interet, a_faire: d.a_faire, relance_date: d.relance_date || '', tache: couper(d.tache, 600),
  resume: couper(d.resume, 600), raison: couper(d.raison, 300), type: d.type || '', entreprise: couper(d.entreprise, 160), prenom: couper(d.prenom, 80), nom: couper(d.nom, 80), le: new Date().toISOString(),
});

async function analyserEmails(items, ann) {
  const decisions = new Map();
  if (!process.env.ANTHROPIC_API_KEY || !items.length) return decisions;
  const jourSemaine = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long' }).format(new Date());
  const lignesLeads = ann.leads.map((l) => [l.id, l.entreprise, `${l.type}, ${l.statut}${l.archive ? ', archivé' : ''}`,
    (ann.parLead.get(l.id) || []).map((c) => `${nomDe(c) || '?'}${c.email ? ` <${c.email}>` : ''}`).join(' ; '),
    l.prochaine_note ? couper(l.prochaine_note, 140) : ''].join(' | ')).join('\n');
  const client = new Anthropic({ timeout: 40000, maxRetries: 1 });
  for (let i = 0; i < items.length; i += 10) {
    const paquet = items.slice(i, i + 10);
    const emails = paquet.map((r) => [
      `--- ref : ${r.ref}`,
      `De : ${r.de.nom ? `${r.de.nom} ` : ''}<${r.de.email}>`,
      `Reçu le : ${new Date(r.quand).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
      `Objet : ${r.objet}`,
      r.agenda ? 'Nature : invitation à un rendez-vous dans son agenda' : '',
      r.pieces?.length ? `Pièces jointes : ${r.pieces.join(', ')}` : '',
      `Dernier message du fil : ${r.dernierDeMoi ? 'de Gabriel (il a déjà répondu)' : "de l'expéditeur"}`,
      r.contact ? `Déjà rattaché à : ${r.contact.lead_id} (adresse ou fil connus)` : '',
      r.candidats?.length ? `Candidats : ${r.candidats.map((c) => `${c.lead_id} (${c.raison})`).join(' ; ')}` : '',
      'Texte :',
      couper(r.texte, 2500),
      r.complet && r.complet !== r.texte ? `Message transféré, en entier :\n${couper(r.complet, 3000)}` : '',
    ].filter(Boolean).join('\n')).join('\n\n');
    const contenu = `Date du jour : ${aujourdHuiParis()} (${jourSemaine})\n\nLeads du CRM (id | entreprise | type, étape | contacts | prévu) :\n${lignesLeads}\n\nEmails à trier :\n${emails}`;
    try {
      const r = await client.beta.messages.create({
        model: MODELE_REDACTION,
        max_tokens: 8000,
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA_TRI } },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: [{ type: 'text', text: CONSIGNES_TRI, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: contenu }],
      });
      if (r.stop_reason === 'refusal') continue;
      const brut = (r.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
      const { decisions: ds } = JSON.parse(brut);
      for (const d of ds || []) {
        if (!paquet.some((x) => x.ref === d.ref)) continue;
        if (d.action === 'rattacher' && !ann.ids.has(d.lead_id)) d.action = 'a_trier';
        decisions.set(d.ref, d);
      }
    } catch (e) {
      console.error('crm tri', e?.status || '', e?.message || e);
    }
  }
  return decisions;
}

async function dernierMessageDeMoi(fil) {
  if (!fil) return false;
  try {
    const t = await google(`${GMAIL}/threads/${encodeURIComponent(fil)}?format=metadata&metadataHeaders=From`);
    const dernier = (t.messages || []).filter((m) => !(m.labelIds || []).includes('DRAFT')).slice(-1)[0];
    return adresse(enTetes(dernier || {}).from).email === COMPTE;
  } catch { return false; }
}

async function lireRecu(id) {
  const m = await google(`${GMAIL}/messages/${id}?format=full`);
  const h = enTetes(m);
  const brut = partieTexte(m.payload);
  const objet = String(h.subject || '(sans objet)').slice(0, 300);
  return {
    m, h, de: adresse(h.from), objet, fil: m.threadId, quand: new Date(Number(m.internalDate) || Date.now()).toISOString(),
    texte: (sansCitation(brut) || texteBrut(m.snippet)).slice(0, 5000),
    complet: /^(tr|fwd?)\s*:/i.test(objet) ? propre(brut).slice(0, 8000) : '',
    pieces: piecesJointes(m.payload),
  };
}

// Un email qui concerne un lead : dans son historique, avec la tâche qui dit quoi faire.
async function rattacherEmail(r, d, leadId, ann) {
  const lead = ann.lead(leadId);
  const contact = r.contact?.id ? r.contact : await contactPourLead(ann, leadId, r.de, d || {});
  const qui = r.de.nom || r.de.email;
  let aFaire = d ? d.a_faire : 'repondre';
  if (r.dernierDeMoi && aFaire === 'repondre') aFaire = 'rien';
  await sb('iae_crm_activites', {
    methode: 'POST', prefer: 'return=minimal',
    corps: {
      lead_id: leadId, contact_id: contact?.id || null, date: r.quand, type: 'email_recu',
      resume: (d?.resume ? `${qui} : ${d.resume}` : `Email reçu de ${qui} : « ${r.objet} »`).slice(0, 2000),
      contenu: (r.texte + (r.complet && r.complet !== r.texte ? `\n\nMessage transféré :\n${r.complet}` : '')).slice(0, 12000) || null,
      source: 'gmail iae',
      meta: { gmail_id: r.gmailId, fil: r.fil, objet: r.objet, pieces: r.pieces || [], analyse: d ? resumeAnalyse(d) : null },
    },
  });
  const maj = { relances_sans_reponse: 0, archive: false };
  const jour = jourParis(r.quand);
  if (!lead?.dernier_contact || lead.dernier_contact < jour) maj.dernier_contact = jour;
  if (aFaire === 'repondre') {
    Object.assign(maj, { prochaine_relance: aujourdHuiParis(), prochaine_action: 'email', prochaine_note: (d?.tache || `Répondre à ${qui} : « ${r.objet} »`).slice(0, 2000), tache_fil: r.fil || null });
  } else if (aFaire === 'relancer_le' && DATE_RE.test(d?.relance_date || '') && d.relance_date >= aujourdHuiParis()) {
    Object.assign(maj, { prochaine_relance: estOuvreIso(d.relance_date) ? d.relance_date : dansJoursOuvres(0, d.relance_date), prochaine_action: lead?.prochaine_action || 'email', prochaine_note: (d.tache || d.resume || `Retour prévu de ${qui}`).slice(0, 2000), tache_fil: r.fil || null });
  }
  await sb(`iae_crm_leads?id=eq.${leadId}`, { methode: 'PATCH', prefer: 'return=minimal', corps: maj });
  if (lead) Object.assign(lead, maj);
}

async function synchroGmail() {
  const etat = (await lireReglage('synchro_gmail')) || {};
  const ignores = new Set(((await lireReglage('expediteurs_ignores')) || []).map((x) => String(x).toLowerCase()));
  const depuis = Number(etat.apres) || Math.floor(Date.now() / 1000) - 3 * 86400;
  const debut = Math.floor(Date.now() / 1000);
  const ann = await annuaire();
  const q = `in:inbox -from:me after:${depuis} -category:promotions -category:social -category:updates -category:forums`;
  const liste = await google(`${GMAIL}/messages?maxResults=50&q=${encodeURIComponent(q)}`);
  const ids = (liste.messages || []).map((m) => m.id).filter((id) => /^[0-9a-f]+$/i.test(id));
  const items = [];
  if (ids.length) {
    const deja = new Set();
    (await sb(`iae_crm_entrants?select=ref_externe&ref_externe=in.(${ids.join(',')})`)).lignes.forEach((x) => deja.add(x.ref_externe));
    (await sb(`iae_crm_activites?select=meta&meta->>gmail_id=in.(${ids.join(',')})`)).lignes.forEach((x) => deja.add(x.meta.gmail_id));
    for (const id of ids.filter((x) => !deja.has(x))) {
      const r = await lireRecu(id);
      // Newsletters, robots, équipe : jamais dans le CRM.
      if (!r.de.email || interne(r.de.email) || EXPEDITEURS_AUTOMATIQUES.test(r.de.email) || r.h['list-unsubscribe']) continue;
      if (ignores.has(r.de.email) || ignores.has(r.de.email.split('@')[1])) continue;
      let contact = await contactParEmail(r.de.email);
      if (!contact && r.fil) {
        const { lignes } = await sb(`iae_crm_activites?select=lead_id,contact_id&meta->>fil=eq.${encodeURIComponent(r.fil)}&limit=1`);
        if (lignes[0]) contact = { lead_id: lignes[0].lead_id, id: lignes[0].contact_id };
      }
      items.push({ ...r, ref: id, gmailId: id, contact, dernierDeMoi: await dernierMessageDeMoi(r.fil), candidats: contact ? [] : candidatsPour(ann, r.de) });
    }
  }
  // Du plus ancien au plus récent : la tâche qui reste est celle du dernier message.
  items.sort((a, b) => a.quand.localeCompare(b.quand));
  // Rattrapage : les « À trier » jamais analysés, quelques-uns à chaque passage.
  const { lignes: enAttente } = await sb('iae_crm_entrants?select=*&statut=eq.a_trier&meta->analyse=is.null&order=recu_le.asc&limit=10');
  for (const e of enAttente) {
    let r = { de: { email: e.de_email || '', nom: e.de_nom || '' }, objet: e.objet || '', fil: e.fil, quand: e.recu_le, texte: e.extrait || '', complet: '', pieces: [] };
    if (e.canal === 'email' && /^[0-9a-f]+$/i.test(e.ref_externe || '')) { try { r = { ...r, ...(await lireRecu(e.ref_externe)) }; } catch { /* on garde l'extrait */ } }
    items.push({ ...r, ref: `entrant:${e.id}`, gmailId: e.canal === 'email' ? e.ref_externe : null, entrant: e, agenda: e.canal === 'agenda', contact: null, dernierDeMoi: await dernierMessageDeMoi(e.fil), candidats: candidatsPour(ann, r.de) });
  }
  const decisions = await analyserEmails(items, ann);
  let reponses = 0;
  let nouveaux = 0;
  let ecartes = 0;
  for (const r of items) {
    const d = decisions.get(r.ref);
    const leadId = r.contact ? r.contact.lead_id : (d?.action === 'rattacher' ? d.lead_id : null);
    if (r.entrant) {
      if (!d) continue; // analyse ratée : on réessaiera au prochain passage
      const meta = { ...(r.entrant.meta || {}), analyse: resumeAnalyse(d) };
      if (leadId && r.agenda) {
        await sb(`iae_crm_entrants?id=eq.${r.entrant.id}`, { methode: 'PATCH', prefer: 'return=minimal', corps: { meta } });
        await traiterEntrant({ id: r.entrant.id, action: 'rattacher', lead_id: leadId });
        reponses++;
      } else if (leadId) {
        await rattacherEmail(r, d, leadId, ann);
        await sb(`iae_crm_entrants?id=eq.${r.entrant.id}`, { methode: 'PATCH', prefer: 'return=minimal', corps: { statut: 'rattache', lead_id: leadId, meta } });
        reponses++;
      } else {
        await sb(`iae_crm_entrants?id=eq.${r.entrant.id}`, { methode: 'PATCH', prefer: 'return=minimal', corps: { statut: d.action === 'ignorer' ? 'ignore' : 'a_trier', meta } });
        if (d.action === 'ignorer') ecartes++;
      }
      continue;
    }
    if (leadId) {
      await rattacherEmail(r, d, leadId, ann);
      reponses++;
      continue;
    }
    const ecarte = d?.action === 'ignorer';
    await sb('iae_crm_entrants?on_conflict=ref_externe', {
      methode: 'POST', prefer: 'resolution=ignore-duplicates,return=minimal',
      corps: { recu_le: r.quand, canal: 'email', de_email: r.de.email, de_nom: r.de.nom || null, objet: r.objet, extrait: couper(r.texte, 1500), ref_externe: r.ref, fil: r.fil, statut: ecarte ? 'ignore' : 'a_trier', meta: { ...(d ? { analyse: resumeAnalyse(d) } : {}), candidats: r.candidats } },
    });
    if (ecarte) ecartes++; else nouveaux++;
  }
  const envoyes = await synchroEnvoyes(depuis, ann);
  await ecrireReglage('synchro_gmail', { apres: debut - 900, le: new Date().toISOString(), reponses, nouveaux, ecartes, envoyes });
  return { reponses, nouveaux, ecartes, envoyes };
}

// Tes emails envoyés depuis Gmail : dans l'historique, et ils règlent la tâche de leur fil.
async function synchroEnvoyes(depuis, ann) {
  const liste = await google(`${GMAIL}/messages?maxResults=30&q=${encodeURIComponent(`in:sent after:${depuis}`)}`);
  const ids = (liste.messages || []).map((m) => m.id).filter((id) => /^[0-9a-f]+$/i.test(id));
  if (!ids.length) return 0;
  const deja = new Set((await sb(`iae_crm_activites?select=meta&meta->>gmail_id=in.(${ids.join(',')})`)).lignes.map((x) => x.meta.gmail_id));
  const parEmail = new Map(ann.contacts.filter((c) => c.email).map((c) => [c.email.toLowerCase(), c]));
  let n = 0;
  for (const id of ids.filter((x) => !deja.has(x))) {
    const m = await google(`${GMAIL}/messages/${id}?format=full`);
    if ((m.labelIds || []).includes('DRAFT')) continue;
    const h = enTetes(m);
    const dest = [...listeAdresses(h.to), ...listeAdresses(h.cc)];
    const c = dest.map((e) => parEmail.get(e)).find(Boolean);
    let leadId = c?.lead_id;
    if (!leadId && m.threadId) {
      const { lignes } = await sb(`iae_crm_activites?select=lead_id&meta->>fil=eq.${encodeURIComponent(m.threadId)}&limit=1`);
      leadId = lignes[0]?.lead_id;
    }
    if (!leadId || !ann.ids.has(leadId)) continue;
    const lead = ann.lead(leadId);
    const objet = String(h.subject || '(sans objet)').slice(0, 300);
    const quand = new Date(Number(m.internalDate) || Date.now()).toISOString();
    const jour = jourParis(quand);
    await sb('iae_crm_activites', {
      methode: 'POST', prefer: 'return=minimal',
      corps: { lead_id: leadId, contact_id: c?.id || null, date: quand, type: 'email_envoye', resume: `Email envoyé depuis Gmail : « ${objet} »`.slice(0, 2000), contenu: sansCitation(partieTexte(m.payload)).slice(0, 8000) || null, source: 'gmail iae', meta: { gmail_id: id, fil: m.threadId, objet, a: dest.join(', ') } },
    });
    const maj = {};
    if (!lead.dernier_contact || lead.dernier_contact < jour) maj.dernier_contact = jour;
    if (lead.tache_fil && lead.tache_fil === m.threadId) {
      Object.assign(maj, { prochaine_relance: dansJoursOuvres(3), prochaine_action: 'email', prochaine_note: `Tu as répondu le ${dateCourte(jour)} (« ${objet} ») : relancer s'il n'y a pas de réponse.`.slice(0, 2000), tache_fil: null, relances_sans_reponse: 0 });
    }
    if (Object.keys(maj).length) {
      await sb(`iae_crm_leads?id=eq.${leadId}`, { methode: 'PATCH', prefer: 'return=minimal', corps: maj });
      Object.assign(lead, maj);
    }
    n++;
  }
  return n;
}

/* ---------- Les formateurs (dossier, pièces, validation) ---------- */

const PROFIL_FORMATEUR = {
  competences: 'tags', outils: 'tags', secteurs: 'tags', zone: T, distanciel: 'bool', tarif_jour: 'nombre', bio: L, disponibilites: T, notes: L, page_site: T,
};
async function ligneFormateur(leadId) {
  if (!UUID_RE.test(leadId || '')) throw new Refus('id_invalide');
  const [lead] = (await sb(`iae_crm_leads?id=eq.${leadId}&select=id,entreprise,type`)).lignes;
  if (!lead) throw new Refus('introuvable', 404);
  await sb('iae_crm_formateurs?on_conflict=lead_id', { methode: 'POST', corps: { lead_id: leadId }, prefer: 'resolution=ignore-duplicates,return=minimal' });
  if (lead.type !== 'formateur') await sb(`iae_crm_leads?id=eq.${leadId}`, { methode: 'PATCH', corps: { type: 'formateur' }, prefer: 'return=minimal' });
  const [f] = (await sb(`iae_crm_formateurs?lead_id=eq.${leadId}&select=*`)).lignes;
  return { lead, f };
}
const sansSecret = ({ jeton_hash: _h, signature, ...f }) => ({ ...f, signature: signature ? { nom: signature.nom, lieu: signature.lieu, date: signature.date, version: signature.version, empreinte: signature.empreinte, ip: signature.ip } : null });
async function retourFormateur(leadId) {
  const [[f], { lignes: documents }, { lignes: [lead] }] = await Promise.all([
    sb(`iae_crm_formateurs?lead_id=eq.${leadId}&select=*`).then((x) => x.lignes),
    sb(`iae_crm_documents?lead_id=eq.${leadId}&select=id,created_at,lead_id,type,nom,mime,taille,depose_par,lecture,statut,motif,verifie_le,expire_le,archive&order=created_at.desc`),
    sb(`iae_crm_leads?id=eq.${leadId}&select=*`),
  ]);
  return { formateur: f ? sansSecret(f) : null, documents, lead };
}
async function operationFormateur(corps) {
  const op = corps.op;
  if (op === 'document_verifier') {
    if (!UUID_RE.test(corps.id || '')) throw new Refus('id_invalide');
    const statut = ['verifie', 'refuse', 'a_verifier'].includes(corps.statut) ? corps.statut : null;
    if (!statut) throw new Refus('valeur_invalide:statut');
    const maj = { statut, motif: statut === 'refuse' ? (convertir(corps.motif ?? '', T, 'motif') || 'À refaire') : null, verifie_le: statut === 'verifie' ? new Date().toISOString() : null };
    if (corps.expire_le !== undefined) maj.expire_le = convertir(corps.expire_le, 'date', 'expire_le');
    const { lignes: [d] } = await sb(`iae_crm_documents?id=eq.${corps.id}`, { methode: 'PATCH', corps: maj, prefer: 'return=representation' });
    if (!d) throw new Refus('introuvable', 404);
    await majStatut(d.lead_id);
    return retourFormateur(d.lead_id);
  }
  const { lead, f } = await ligneFormateur(corps.lead_id);
  if (op === 'formateur_maj') {
    const v = corps.valeurs || {};
    const maj = {};
    for (const [k, type] of Object.entries(PROFIL_FORMATEUR)) if (v[k] !== undefined) maj[k] = convertir(v[k], type, k);
    if (v.niveaux !== undefined) maj.niveaux = (Array.isArray(v.niveaux) ? v.niveaux : []).map(Number).filter((n) => [1, 2, 3].includes(n));
    if (Object.keys(maj).length) await sb(`iae_crm_formateurs?lead_id=eq.${lead.id}`, { methode: 'PATCH', corps: maj, prefer: 'return=minimal' });
    return retourFormateur(lead.id);
  }
  if (op === 'formateur_lien') {
    // Un nouveau lien remplace l'ancien ; la base ne garde que son empreinte.
    const jeton = nouveauJeton();
    const expire = new Date(Date.now() + 30 * 86400000).toISOString();
    await sb(`iae_crm_formateurs?lead_id=eq.${lead.id}`, { methode: 'PATCH', corps: { jeton_hash: empreinteTexte(jeton), jeton_expire: expire, jeton_cree_le: new Date().toISOString() }, prefer: 'return=minimal' });
    await inserer('activites', { lead_id: lead.id, type: 'note', resume: `Lien d'envoi du dossier formateur créé (valable jusqu'au ${new Date(expire).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })}).`, source: 'crm' });
    await majStatut(lead.id);
    return { jeton, expire, ...(await retourFormateur(lead.id)) };
  }
  if (op === 'formateur_siret') {
    const v = await verifierSiret(corps.siret || f.siret);
    const id = { ...(f.identite || {}) };
    if (v.trouve) { if (!id.raison_sociale) id.raison_sociale = v.nom; if (!id.siege) id.siege = v.adresse; if (!id.forme && v.forme) id.forme = v.forme; }
    await sb(`iae_crm_formateurs?lead_id=eq.${lead.id}`, { methode: 'PATCH', corps: { siret: v.siret, siret_verif: v, ...(f.signature ? {} : { identite: id }) }, prefer: 'return=minimal' });
    await majStatut(lead.id);
    return retourFormateur(lead.id);
  }
  if (op === 'piece_deposer') {
    const doc = await deposerPiece({ f, leadId: lead.id, type: String(corps.type || ''), nom: corps.nom, base64: corps.base64, deposePar: 'gabriel' });
    await inserer('activites', { lead_id: lead.id, type: 'note', resume: `Pièce déposée depuis le CRM : ${doc.nom}`.slice(0, 2000), source: 'crm' });
    await majStatut(lead.id);
    return retourFormateur(lead.id);
  }
  if (op === 'formateur_valider') {
    // « Valider » : les pièces relues passent en vérifiées, puis le dossier doit être complet.
    if (corps.tout_verifier === true) {
      await sb(`iae_crm_documents?lead_id=eq.${lead.id}&archive=is.false&statut=eq.a_verifier`, { methode: 'PATCH', corps: { statut: 'verifie', verifie_le: new Date().toISOString() }, prefer: 'return=minimal' });
    }
    const { lignes: docs } = await sb(`iae_crm_documents?lead_id=eq.${lead.id}&select=*`);
    const e = etatDossier(f, docs);
    if (!e.verifie) throw new Refus('dossier_incomplet', 409);
    await sb(`iae_crm_formateurs?lead_id=eq.${lead.id}`, { methode: 'PATCH', corps: { valide_le: new Date().toISOString(), contre_signature: { nom: 'Gabriel VANDERBECKEN', qualite: 'Président', date: new Date().toISOString(), version: f.signature && f.signature.version }, statut: 'valide' }, prefer: 'return=minimal' });
    await inserer('activites', { lead_id: lead.id, type: 'statut', resume: 'Formateur validé : contrat contresigné, toutes les pièces vérifiées. Il peut être positionné sur une mission.', source: 'crm' });
    await sb(`iae_crm_leads?id=eq.${lead.id}`, { methode: 'PATCH', corps: { prochaine_relance: null, prochaine_note: 'Formateur validé, prêt pour une mission.' }, prefer: 'return=minimal' });
    return retourFormateur(lead.id);
  }
  if (op === 'formateur_refuser') {
    await sb(`iae_crm_formateurs?lead_id=eq.${lead.id}`, { methode: 'PATCH', corps: { statut: corps.annuler ? 'en_cours' : 'refuse', jeton_hash: null, valide_le: corps.annuler ? f.valide_le : null }, prefer: 'return=minimal' });
    await inserer('activites', { lead_id: lead.id, type: 'statut', resume: corps.annuler ? 'Dossier formateur rouvert.' : `Dossier formateur refusé${corps.motif ? ` : ${String(corps.motif).slice(0, 300)}` : ''}.`, source: 'crm' });
    if (corps.annuler) await majStatut(lead.id);
    return retourFormateur(lead.id);
  }
  throw new Refus('operation_inconnue');
}
// Chaque matin : les pièces qui expirent dans 15 jours, ou déjà expirées, deviennent des tâches.
async function echeancesFormateurs() {
  const { lignes: fs } = await sb('iae_crm_formateurs?select=*&valide_le=not.is.null');
  let n = 0;
  for (const f of fs) {
    const { lignes: docs } = await sb(`iae_crm_documents?lead_id=eq.${f.lead_id}&select=*`);
    const e = etatDossier(f, docs);
    if (e.statut !== f.statut) { await majStatut(f.lead_id); n++; continue; }
    if (!e.bientot.length) continue;
    const [lead] = (await sb(`iae_crm_leads?id=eq.${f.lead_id}&select=entreprise,prochaine_relance,prochaine_note`)).lignes;
    const note = `Demander à ${lead.entreprise} : ${e.bientot.map((b) => `${b.titre.toLowerCase()} (expire le ${b.expire_le.split('-').reverse().join('/')})`).join(', ')}.`;
    if (lead.prochaine_note === note) continue;
    await sb(`iae_crm_leads?id=eq.${f.lead_id}`, { methode: 'PATCH', corps: { prochaine_relance: aujourdHuiF(), prochaine_action: 'email', prochaine_note: note }, prefer: 'return=minimal' });
    n++;
  }
  return n;
}

/* ---------- Programmes de formation et formateurs recommandés ---------- */

// L'offre telle que la page formation-ia-entreprise.html la présente (novembre 2026).
const CATALOGUE_NIVEAUX = `Niveau 1, Acculturation IA (1 à 2 jours, sans prérequis, salariés et dirigeants) : ce que l'IA générative sait faire et ne sait pas faire ; quelle IA pour quoi (ChatGPT, Claude, Gemini, Copilot, Perplexity, outils d'image et de transcription) ; prompter sur ses propres documents ; vérifier une réponse, repérer une hallucination ; règle d'or RGPD et shadow AI ; cadre AI Act et règles internes. On repart avec une charte d'usage de l'IA et des prompts testés sur ses documents. 2e jour en option : ateliers par service.
Niveau 2, IA métier (2 à 3 jours, prérequis niveau 1 ou équivalent) : cartographie des tâches service par service ; l'IA intégrée aux outils (Microsoft 365 Copilot, Google Workspace et Gemini, CRM, logiciels métier) ; ateliers sur les dossiers réels des participants ; bibliothèque de prompts partagée ; règles d'usage propres à l'entreprise. 3e jour en option : approfondissement par métier.
Niveau 3, Automatisation et intégration (3 à 4 jours, prérequis niveau 2 ou équivalent) : automatisation ou agent IA, choisir la bonne approche ; workflows sans code avec n8n ou Make ; agents IA métier branchés sur les outils ; assistant qui répond à partir des documents de l'entreprise (RAG) ; mise en production, sécurité, coûts réels, maintenance. On repart avec au moins une automatisation en production, documentée. 4e jour en option.`;

const SCHEMA_PROGRAMME = {
  type: 'object',
  properties: {
    titre: { type: 'string' },
    sous_titre: { type: 'string' },
    public: { type: 'string' },
    prerequis: { type: 'string' },
    objectifs: { type: 'array', items: { type: 'string' } },
    duree: { type: 'string' },
    modalites: { type: 'string' },
    seances: { type: 'array', items: { type: 'object', properties: { titre: { type: 'string' }, contenus: { type: 'array', items: { type: 'string' } }, pratique: { type: 'string' } }, required: ['titre', 'contenus', 'pratique'], additionalProperties: false } },
    methodes: { type: 'string' },
    evaluation: { type: 'string' },
    livrables: { type: 'string' },
    accessibilite: { type: 'string' },
    delai_acces: { type: 'string' },
    competences_formateur: { type: 'array', items: { type: 'string' } },
  },
  required: ['titre', 'sous_titre', 'public', 'prerequis', 'objectifs', 'duree', 'modalites', 'seances', 'methodes', 'evaluation', 'livrables', 'accessibilite', 'delai_acces', 'competences_formateur'],
  additionalProperties: false,
};
const CONSIGNES_PROGRAMME = `Tu rédiges, pour IA-Entrepreneur (organisme de formation certifié Qualiopi, marque de Clindit SASU), le programme d'une formation à l'IA pour une entreprise cliente. C'est le programme remis au client et validé avec lui, une à deux pages, clair et sans jargon. Le formateur en reprendra ensuite les objectifs mot pour mot dans son déroulé.

L'offre : trois niveaux, en intra, groupes de 12 personnes au plus, une journée = 7 heures, en présentiel ou à distance.
${CATALOGUE_NIVEAUX}

Règles :
- Pars du besoin réel du client (secteur, outils, équipes, ce qui s'est dit dans les échanges) et adapte les modules du niveau. Ne recopie pas le site mot pour mot.
- objectifs : 3 à 6 objectifs opérationnels, chacun commence par un verbe d'action mesurable (rédiger, utiliser, vérifier, construire, automatiser, choisir, appliquer…). Verbes interdits : apprendre, comprendre, connaître, être, mémoriser, savoir, sensibiliser.
- seances : une par demi-journée (« Jour 1, matin », « Jour 1, après-midi »…), avec ses contenus et la pratique prévue. Au moins deux tiers du temps en pratique, sur les cas et les documents des participants. Le nombre de demi-journées colle exactement à la durée.
- evaluation : positionnement au départ, évaluation des acquis par objectif à la fin (quiz ou mise en situation), questionnaire de satisfaction à chaud, attestation individuelle de fin de formation (au titre de l'article 4 de l'AI Act quand c'est pertinent).
- accessibilite : formation accessible aux personnes en situation de handicap ; le référent handicap, Gabriel Vanderbecken (gabriel@ia-entrepreneur.fr), étudie avec la personne l'adaptation des modalités.
- delai_acces : la formation a lieu à la date convenue avec le client, en général deux à six semaines après son accord, et après l'accord de prise en charge s'il y a un financement.
- Jamais de prix, jamais le nom d'un formateur, jamais de gain chiffré (ROI, heures gagnées, pourcentages), jamais « garanti » ni « 100 % », jamais de code de certification. L'article 4 de l'AI Act demande de « prendre des mesures » pour la maîtrise de l'IA du personnel : pas d'amende, pas de « formation obligatoire ».
- Pas de tiret long, pas de flèche, pas d'emoji.
- competences_formateur : 3 à 6 compétences précises qu'il faut au formateur pour animer ce programme (sujets, outils, secteur, niveau). Elles servent à choisir le formateur.
En français, phrases courtes.`;

const SCHEMA_RECOMMANDATION = {
  type: 'object',
  properties: {
    recommandations: {
      type: 'array',
      items: {
        type: 'object',
        properties: { lead_id: { type: 'string' }, score: { type: 'integer' }, raisons: { type: 'array', items: { type: 'string' } }, a_verifier: { type: 'array', items: { type: 'string' } } },
        required: ['lead_id', 'score', 'raisons', 'a_verifier'],
        additionalProperties: false,
      },
    },
  },
  required: ['recommandations'],
  additionalProperties: false,
};
const CONSIGNES_RECOMMANDATION = `Tu aides Gabriel, dirigeant d'IA-Entrepreneur, à choisir le formateur d'une mission. On te donne le programme validé avec le client et la liste des formateurs du réseau. Classe les 5 formateurs les plus adaptés, du meilleur au moins bon.
Critères, dans cet ordre : les compétences et les outils au regard des contenus du programme et des « compétences attendues » ; le niveau (1, 2 ou 3) ; la connaissance du secteur du client ; le lieu (présentiel : sa zone doit couvrir le lieu ; à distance : il doit animer à distance) ; les disponibilités si elles sont connues ; le tarif jour, qui ne doit pas dépasser 600 € (au-delà ou inconnu : à vérifier).
Le statut du dossier ne change pas le classement : un formateur non validé peut être recommandé, Gabriel verra qu'il faut d'abord valider son dossier.
score : de 0 à 100, l'adéquation au programme. raisons : 2 ou 3 phrases courtes et précises (« Anime Copilot dans Word et Excel, au cœur des jours 1 et 2 »). a_verifier : ce que Gabriel doit confirmer avant de choisir (disponibilité aux dates, déplacement, tarif, compétence non prouvée). lead_id copié de la liste, jamais inventé. N'invente rien sur un formateur : seulement ce qui est dans sa fiche.`;

const textesListe = (v, max = 20, longueur = 300) => (Array.isArray(v) ? v : []).slice(0, max).map((x) => couper(String(x), longueur));
function nettoyerProgramme(c) {
  if (!c || typeof c !== 'object') throw new Refus('programme_invalide');
  const t = (x, n = 1200) => couper(String(x ?? ''), n);
  const programme = {
    titre: t(c.titre, 200), sous_titre: t(c.sous_titre, 300), public: t(c.public, 600), prerequis: t(c.prerequis, 400),
    objectifs: textesListe(c.objectifs, 8), duree: t(c.duree, 200), modalites: t(c.modalites, 600),
    seances: (Array.isArray(c.seances) ? c.seances : []).slice(0, 16).map((x) => ({ titre: t(x && x.titre, 120), contenus: textesListe(x && x.contenus, 10), pratique: t(x && x.pratique, 600) })),
    methodes: t(c.methodes), evaluation: t(c.evaluation), livrables: t(c.livrables, 800), accessibilite: t(c.accessibilite, 600), delai_acces: t(c.delai_acces, 400),
    competences_formateur: textesListe(c.competences_formateur, 8, 200),
  };
  if (!programme.titre) throw new Refus('programme_invalide');
  return programme;
}
async function appelClaude({ consignes, schema, contenu, effort = 'low', max = 6000, timeout = 50000 }) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Refus('ia_non_configuree', 503);
  const client = new Anthropic({ timeout, maxRetries: 1 });
  let r;
  try {
    r = await client.beta.messages.create({
      model: MODELE_REDACTION,
      max_tokens: max,
      output_config: { effort, format: { type: 'json_schema', schema } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: consignes, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: contenu }],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new Refus('ia_trop_de_demandes', 429);
    if (e instanceof Anthropic.APIConnectionError) throw new Refus('ia_injoignable', 502);
    if (e instanceof Anthropic.APIError) { console.error('crm claude', e.status, e.message); throw new Refus('ia_erreur', 502); }
    throw e;
  }
  if (r.stop_reason === 'refusal') throw new Refus('ia_refus', 422);
  if (r.stop_reason === 'max_tokens') throw new Refus('ia_coupe', 502);
  try { return JSON.parse((r.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')); } catch { throw new Refus('ia_erreur', 502); }
}
async function recommander(prog) {
  const [{ lignes: [client] }, { lignes: leadsF }, { lignes: dossiers }] = await Promise.all([
    sb(`iae_crm_leads?id=eq.${prog.lead_id}&select=entreprise,secteur,localisation,formation_debut,formation_fin`),
    sb('iae_crm_leads?type=eq.formateur&archive=is.false&select=id,entreprise'),
    sb('iae_crm_formateurs?select=lead_id,statut,competences,outils,niveaux,secteurs,zone,distanciel,disponibilites,tarif_jour,bio'),
  ]);
  const parId = new Map(dossiers.map((d) => [d.lead_id, d]));
  const candidats = leadsF.map((l) => ({ l, d: parId.get(l.id) || { statut: 'a_inviter' } }));
  if (!candidats.length) return { le: new Date().toISOString(), liste: [] };
  const c = prog.contenu || {};
  const p = prog.parametres || {};
  const contenu = [
    `Programme : ${c.titre} (${prog.niveau ? `niveau ${prog.niveau}` : 'sur mesure'}), ${c.duree}, ${c.modalites}`,
    `Client : secteur ${client?.secteur || 'non précisé'}, ${client?.localisation || 'lieu non précisé'} ; format ${p.format || 'non précisé'}${p.lieu ? `, lieu ${p.lieu}` : ''}${client?.formation_debut ? ` ; dates ${client.formation_debut} au ${client.formation_fin || client.formation_debut}` : ''}`,
    `Objectifs : ${(c.objectifs || []).join(' ; ')}`,
    `Séances : ${(c.seances || []).map((x) => `${x.titre} : ${(x.contenus || []).join(', ')}`).join(' | ')}`,
    `Compétences attendues du formateur : ${(c.competences_formateur || []).join(' ; ')}`,
    '',
    'Formateurs (id | nom | dossier | zone | distanciel | niveaux | compétences | outils | secteurs | disponibilités | tarif jour) :',
    ...candidats.map(({ l, d }) => [l.id, l.entreprise, d.statut, d.zone || '?', d.distanciel === false ? 'non' : 'oui', (d.niveaux || []).join(',') || '?', couper((d.competences || []).join(' ; '), 700), (d.outils || []).join(', '), (d.secteurs || []).join(', '), d.disponibilites || '?', d.tarif_jour ? `${d.tarif_jour} €` : '?'].join(' | ')),
  ].join('\n');
  const r = await appelClaude({ consignes: CONSIGNES_RECOMMANDATION, schema: SCHEMA_RECOMMANDATION, contenu, max: 3000 });
  const vus = new Set();
  const liste = (r.recommandations || []).filter((x) => parId.has(x.lead_id) || leadsF.some((l) => l.id === x.lead_id)).filter((x) => !vus.has(x.lead_id) && vus.add(x.lead_id)).slice(0, 6).map((x) => {
    const cand = candidats.find((k) => k.l.id === x.lead_id);
    return { lead_id: x.lead_id, nom: cand.l.entreprise, statut: cand.d.statut, positionnable: cand.d.statut === 'valide', score: Math.max(0, Math.min(100, Number(x.score) || 0)), raisons: textesListe(x.raisons, 4), a_verifier: textesListe(x.a_verifier, 4) };
  });
  return { le: new Date().toISOString(), liste };
}
async function operationProgramme(corps) {
  const op = corps.op;
  if (op === 'programme_generer') {
    if (!UUID_RE.test(corps.lead_id || '')) throw new Refus('id_invalide');
    const [{ lignes: [lead] }, { lignes: contacts }, { lignes: acts }] = await Promise.all([
      sb(`iae_crm_leads?id=eq.${corps.lead_id}&select=*`),
      sb(`iae_crm_contacts?lead_id=eq.${corps.lead_id}&select=prenom,nom,poste&order=principal.desc`),
      sb(`iae_crm_activites?lead_id=eq.${corps.lead_id}&select=date,type,resume,contenu&order=date.desc&limit=15`),
    ]);
    if (!lead) throw new Refus('introuvable', 404);
    const niveau = [1, 2, 3].includes(Number(corps.niveau)) ? Number(corps.niveau) : null;
    const jours = Math.max(0.5, Math.min(10, Number(String(corps.jours || '').replace(',', '.')) || (niveau ? niveau + 0 : 1)));
    const parametres = {
      niveau, jours, participants: couper(String(corps.participants ?? ''), 20), format: ['presentiel', 'distanciel', 'mixte'].includes(corps.format) ? corps.format : 'presentiel',
      lieu: couper(String(corps.lieu ?? ''), 200), outils: couper(String(corps.outils ?? ''), 400), attentes: couper(String(corps.attentes ?? ''), 2000), consigne: couper(String(corps.consigne ?? ''), 1000),
    };
    const r = lead.recap || null;
    const contenu = [
      `Client : ${lead.entreprise}${lead.secteur ? `, secteur ${lead.secteur}` : ''}${lead.localisation ? `, ${lead.localisation}` : ''}`,
      lead.besoin ? `Besoin noté : ${lead.besoin}` : '',
      contacts.length ? `Interlocuteurs : ${contacts.map((x) => [x.prenom, x.nom, x.poste].filter(Boolean).join(' ')).join(' ; ')}` : '',
      r ? `Récap de la relation : ${r.situation} ${r.attentes ? `Attentes : ${r.attentes}` : ''}` : '',
      `Demande : ${niveau ? `niveau ${niveau}` : 'sur mesure'}, ${jours} jour${jours > 1 ? 's' : ''} (${Math.round(jours * 7)} heures), ${parametres.participants ? `${parametres.participants} participants, ` : ''}${{ presentiel: 'en présentiel', distanciel: 'à distance', mixte: 'en présentiel et à distance' }[parametres.format]}${parametres.lieu ? `, ${parametres.lieu}` : ''}`,
      parametres.outils ? `Outils du client : ${parametres.outils}` : '',
      parametres.attentes ? `Attentes et objectifs du client : ${parametres.attentes}` : '',
      parametres.consigne ? `Consigne de Gabriel : ${parametres.consigne}` : '',
      `Derniers échanges :\n${acts.filter((a) => a.type !== 'import').map((a) => `- ${String(a.date).slice(0, 10)} ${a.resume}${a.contenu ? ` / ${couper(a.contenu, 400)}` : ''}`).join('\n')}`,
    ].filter(Boolean).join('\n');
    const prog = nettoyerProgramme(await appelClaude({ consignes: CONSIGNES_PROGRAMME, schema: SCHEMA_PROGRAMME, contenu, max: 8000, timeout: 55000 }));
    const { lignes: [ligne] } = await sb('iae_crm_programmes', { methode: 'POST', corps: { lead_id: lead.id, titre: prog.titre, niveau, parametres, contenu: prog, statut: 'brouillon' }, prefer: 'return=representation' });
    await inserer('activites', { lead_id: lead.id, type: 'note', resume: `Programme rédigé (brouillon) : ${prog.titre}`.slice(0, 2000), source: 'crm' });
    return { programme: ligne };
  }
  if (!UUID_RE.test(corps.id || '')) throw new Refus('id_invalide');
  const { lignes: [prog] } = await sb(`iae_crm_programmes?id=eq.${corps.id}&select=*`);
  if (!prog) throw new Refus('introuvable', 404);
  if (op === 'programme_maj') {
    const contenu = nettoyerProgramme(corps.contenu);
    const { lignes: [ligne] } = await sb(`iae_crm_programmes?id=eq.${prog.id}`, { methode: 'PATCH', corps: { contenu, titre: contenu.titre, statut: 'brouillon', valide_le: null }, prefer: 'return=representation' });
    return { programme: ligne };
  }
  if (op === 'programme_valider') {
    const { lignes: [ligne] } = await sb(`iae_crm_programmes?id=eq.${prog.id}`, { methode: 'PATCH', corps: { statut: 'valide', valide_le: new Date().toISOString() }, prefer: 'return=representation' });
    await inserer('activites', { lead_id: prog.lead_id, type: 'note', resume: `Programme validé : ${prog.titre}`.slice(0, 2000), source: 'crm' });
    return { programme: ligne };
  }
  if (op === 'programme_recommander') {
    const recommandations = await recommander(prog);
    const { lignes: [ligne] } = await sb(`iae_crm_programmes?id=eq.${prog.id}`, { methode: 'PATCH', corps: { recommandations, recommande_le: recommandations.le }, prefer: 'return=representation' });
    return { programme: ligne };
  }
  if (op === 'programme_choisir') {
    if (!UUID_RE.test(corps.formateur_id || '')) throw new Refus('id_invalide');
    const { lignes: [f] } = await sb(`iae_crm_formateurs?lead_id=eq.${corps.formateur_id}&select=statut`);
    if (!f || f.statut !== 'valide') throw new Refus('formateur_non_valide', 409);
    const [{ lignes: [client] }, { lignes: [formateur] }] = await Promise.all([
      sb(`iae_crm_leads?id=eq.${prog.lead_id}&select=entreprise`), sb(`iae_crm_leads?id=eq.${corps.formateur_id}&select=entreprise`),
    ]);
    const { lignes: [ligne] } = await sb(`iae_crm_programmes?id=eq.${prog.id}`, { methode: 'PATCH', corps: { formateur_id: corps.formateur_id }, prefer: 'return=representation' });
    await inserer('activites', { lead_id: prog.lead_id, type: 'note', resume: `Formateur choisi : ${formateur.entreprise} (programme « ${prog.titre} »)`.slice(0, 2000), source: 'crm' });
    await inserer('activites', { lead_id: corps.formateur_id, type: 'note', resume: `Positionné sur la mission ${client.entreprise} (programme « ${prog.titre} »)`.slice(0, 2000), source: 'crm' });
    return { programme: ligne };
  }
  throw new Refus('operation_inconnue');
}

/* ---------- Le récap d'une relation ---------- */

const SCHEMA_RECAP = {
  type: 'object',
  properties: {
    situation: { type: 'string' },
    attentes: { type: 'string' },
    chaleur: { type: 'string', enum: ['chaude', 'bonne', 'neutre', 'froide', 'inconnue'] },
    reactivite: { type: 'string' },
    ton: { type: 'string' },
    points: { type: 'array', items: { type: 'string' } },
    prochaine_etape: { type: 'string' },
  },
  required: ['situation', 'attentes', 'chaleur', 'reactivite', 'ton', 'points', 'prochaine_etape'],
  additionalProperties: false,
};
const CONSIGNES_RECAP = `Tu fais, pour Gabriel Vanderbecken (fondateur d'IA-Entrepreneur, organisme de formation à l'IA pour les entreprises), le récap d'une relation de son CRM : prospect, client, partenaire ou fournisseur. Il le lit avant d'appeler ou d'écrire, pour savoir en dix secondes où il en est et comment parler à la personne.
- situation : deux ou trois phrases sur où vous en êtes aujourd'hui, avec les faits (dates, montants, documents, décisions).
- attentes : ce que la personne attend de Gabriel maintenant, ou ce qu'il attend d'elle. Vide si rien.
- chaleur : la qualité de la relation d'après les échanges. chaude : enthousiaste, proche ; bonne : cordiale et engagée ; neutre ; froide : peu de réponses, réticences ; inconnue : trop peu d'échanges pour juger.
- reactivite : comment elle répond, d'après les dates (« répond dans la journée », « répond après une relance », « n'a jamais répondu par email »).
- ton : comment vous vous parlez (tutoiement ou vouvoiement, formel, amical), pour qu'il écrive juste.
- points : deux à quatre choses à ne pas oublier : engagements pris, chiffres, dates, sujets sensibles, personnes impliquées.
- prochaine_etape : ce qu'il faut faire ensuite, une phrase à l'infinitif.
N'invente rien : seulement ce qui est dans l'historique et les emails. Phrases courtes, en français, en tutoyant Gabriel (« tu lui as envoyé… »). Pas de formule.`;

async function recapLead(corps) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Refus('ia_non_configuree', 503);
  if (!UUID_RE.test(corps.lead_id || '')) throw new Refus('id_invalide');
  const [{ lignes: ls }, { lignes: cs }, { lignes: acts }] = await Promise.all([
    sb(`iae_crm_leads?select=*&id=eq.${corps.lead_id}`),
    sb(`iae_crm_contacts?select=*&lead_id=eq.${corps.lead_id}&order=principal.desc,created_at.asc`),
    sb(`iae_crm_activites?select=*&lead_id=eq.${corps.lead_id}&order=date.desc&limit=60`),
  ]);
  const lead = ls[0];
  if (!lead) throw new Refus('introuvable', 404);
  // Les trois derniers fils Gmail, lus en entier : c'est là qu'est le ton de la relation.
  const fils = [...new Set(acts.map((a) => a.meta?.fil).filter((f) => /^[0-9a-f]{6,32}$/i.test(f || '')))].slice(0, 3);
  const textesFils = [];
  if (gmailConfigure()) {
    for (const f of fils) {
      try {
        const ms = (await lireFil(f)).slice(-6);
        textesFils.push(`Fil « ${ms[0]?.objet || ''} » :\n${ms.map((x) => `- ${new Date(x.date).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}, ${x.moi ? 'Gabriel' : x.de} : ${couper(x.texte, 900)}`).join('\n')}`);
      } catch { /* fil illisible : on fait avec l'historique */ }
    }
  }
  let historique = acts.slice().reverse().map((a) => `- ${new Date(a.date).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })} ${TYPES_LISIBLES[a.type] || a.type} : ${couper(a.resume, 300)}${a.contenu ? ` / ${couper(a.contenu, 500)}` : ''}`).join('\n');
  historique = couper(historique, 14000);
  const contexte = [
    `Date du jour : ${aujourdHuiParis()}`,
    `Lead : ${lead.entreprise} (${lead.type}, étape ${lead.statut}${lead.suivi ? `, suivi ${lead.suivi}` : ''})`,
    lead.besoin ? `Besoin : ${lead.besoin}` : '',
    lead.source ? `Source : ${lead.source}` : '',
    `Contacts : ${cs.map((c) => [nomDe(c), c.poste, c.email].filter(Boolean).join(', ')).join(' ; ') || 'aucun'}`,
    `Prévu : ${lead.prochaine_action} le ${lead.prochaine_relance || 'rien'}${lead.prochaine_note ? `, ${lead.prochaine_note}` : ''}`,
    `Historique, du plus ancien au plus récent :\n${historique || 'vide'}`,
    textesFils.length ? `Derniers emails :\n${textesFils.join('\n\n')}` : '',
  ].filter(Boolean).join('\n\n');
  const client = new Anthropic({ timeout: 45000, maxRetries: 1 });
  let reponse;
  try {
    reponse = await client.beta.messages.create({
      model: MODELE_REDACTION,
      max_tokens: 4000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA_RECAP } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: CONSIGNES_RECAP, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: contexte }],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new Refus('ia_trop_de_demandes', 429);
    if (e instanceof Anthropic.APIConnectionError) throw new Refus('ia_injoignable', 502);
    if (e instanceof Anthropic.APIError) { console.error('crm recap', e.status, e.message); throw new Refus('ia_erreur', 502); }
    throw e;
  }
  if (reponse.stop_reason === 'refusal') throw new Refus('ia_refus', 422);
  let r;
  try { r = JSON.parse((reponse.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')); } catch { throw new Refus('ia_erreur', 502); }
  const recap = {
    situation: couper(r.situation, 900), attentes: couper(r.attentes, 500),
    chaleur: SCHEMA_RECAP.properties.chaleur.enum.includes(r.chaleur) ? r.chaleur : 'inconnue',
    reactivite: couper(r.reactivite, 200), ton: couper(r.ton, 200),
    points: (Array.isArray(r.points) ? r.points : []).slice(0, 5).map((x) => couper(x, 300)), prochaine_etape: couper(r.prochaine_etape, 400),
  };
  return { lead: await modifier('leads', lead.id, { recap, recap_le: new Date().toISOString() }) };
}

async function synchroAgenda() {
  const etat = (await lireReglage('synchro_agenda')) || {};
  const debut = new Date();
  const params = new URLSearchParams({
    singleEvents: 'true', maxResults: '100', showDeleted: 'false',
    timeMin: new Date(Date.now() - 86400000).toISOString(),
    updatedMin: etat.depuis || new Date(Date.now() - 14 * 86400000).toISOString(),
  });
  const r = await google(`${CALENDAR}?${params}`);
  const aujourd = aujourdHuiParis();
  const ann = await annuaire();
  let rdv = 0;
  let nouveaux = 0;
  for (const ev of r.items || []) {
    if (ev.status === 'cancelled' || ev.extendedProperties?.private?.crm_lead) continue; // nos propres RDV
    const debutEv = ev.start?.dateTime || ev.start?.date;
    if (!debutEv) continue;
    const jour = ev.start.dateTime ? jourParis(debutEv) : ev.start.date;
    const heure = ev.start.dateTime ? heureParis(debutEv) : null;
    const libelle = `${(ev.summary || 'Rendez-vous').slice(0, 200)} le ${jour.split('-').reverse().join('/')}${heure ? ` à ${heure}` : ''}`;
    const externes = (ev.attendees || []).filter((a) => a.email && !a.self && !a.resource && !interne(a.email.toLowerCase()));
    const leadsVus = new Set();
    for (const a of externes) {
      const email = a.email.toLowerCase();
      let c = await contactParEmail(email);
      if (!c) {
        // Un seul lead possible (même domaine ou même nom) : le RDV va sur ce lead.
        const pistes = candidatsPour(ann, { email, nom: a.displayName || '' });
        if (pistes.length === 1) {
          const ct = await contactPourLead(ann, pistes[0].lead_id, { email, nom: a.displayName || '' });
          if (ct) c = { id: ct.id, lead_id: ct.lead_id };
        }
      }
      if (c && leadsVus.has(c.lead_id)) continue;
      if (c) leadsVus.add(c.lead_id);
      const ref = (c ? `agenda:${ev.id}:${c.lead_id}` : `agenda:${ev.id}:${email}`).slice(0, 500);
      const { lignes: dejaAct } = await sb(`iae_crm_activites?select=id&meta->>event_ref=eq.${encodeURIComponent(ref)}&limit=1`);
      if (dejaAct.length) continue;
      if (c) {
        await sb('iae_crm_activites', { methode: 'POST', prefer: 'return=minimal', corps: { lead_id: c.lead_id, contact_id: c.id, type: 'rdv', resume: `RDV prévu : ${libelle}`.slice(0, 2000), contenu: texteBrut(ev.description).slice(0, 4000) || null, source: 'agenda', meta: { event_id: ev.id, event_ref: ref, date_rdv: jour, heure, lien_agenda: ev.htmlLink } } });
        if (jour >= aujourd) await sb(`iae_crm_leads?id=eq.${c.lead_id}`, { methode: 'PATCH', prefer: 'return=minimal', corps: { prochaine_relance: jour, prochaine_action: 'rdv', prochaine_note: `RDV${heure ? ` à ${heure}` : ''} : ${(ev.summary || '').slice(0, 300)}`, relances_sans_reponse: 0, archive: false } });
        rdv++;
      } else if (jour >= aujourd) {
        const { lignes: dejaTrie } = await sb(`iae_crm_entrants?select=id&ref_externe=eq.${encodeURIComponent(ref)}&limit=1`);
        if (dejaTrie.length) continue;
        await sb('iae_crm_entrants?on_conflict=ref_externe', { methode: 'POST', prefer: 'resolution=ignore-duplicates,return=minimal', corps: { recu_le: ev.created || debut.toISOString(), canal: 'agenda', de_email: email, de_nom: a.displayName || null, objet: `RDV : ${libelle}`.slice(0, 300), extrait: texteBrut(ev.description).slice(0, 1000) || null, ref_externe: ref, meta: { event_id: ev.id, event_ref: ref, date_rdv: jour, heure, lien_agenda: ev.htmlLink } } });
        nouveaux++;
      }
    }
  }
  await ecrireReglage('synchro_agenda', { depuis: new Date(debut.getTime() - 900000).toISOString(), le: debut.toISOString(), rdv, nouveaux });
  return { rdv, nouveaux };
}

async function synchroniser() {
  if (!gmailConfigure()) throw new Refus('gmail_non_configure', 503);
  const [g, a] = await Promise.allSettled([synchroGmail(), synchroAgenda()]);
  const lire = (x) => (x.status === 'fulfilled' ? x.value : { erreur: x.reason?.code || 'erreur' });
  return { gmail: lire(g), agenda: lire(a) };
}

// Un RDV noté dans le CRM devient un événement de l'agenda, sans invité :
// Google n'envoie donc aucune invitation au prospect.
async function creerEvenement(leadId, a) {
  if (!DATE_RE.test(a?.date || '')) throw new Refus('date_invalide');
  const heure = /^\d{2}:\d{2}$/.test(a.heure || '') ? a.heure : null;
  const duree = Math.min(240, Math.max(15, Number(a.duree) || 30));
  const titre = String(a.titre || 'Rendez-vous').replace(/[\r\n]+/g, ' ').slice(0, 200);
  const description = String(a.description || '').slice(0, 4000);
  const lieu = a.lieu ? String(a.lieu).slice(0, 300) : undefined;
  let start;
  let end;
  if (heure) {
    const [hh, mm] = heure.split(':').map(Number);
    const fin = Math.min(hh * 60 + mm + duree, 23 * 60 + 59);
    const deux = (n) => String(n).padStart(2, '0');
    start = { dateTime: `${a.date}T${heure}:00`, timeZone: 'Europe/Paris' };
    end = { dateTime: `${a.date}T${deux(Math.floor(fin / 60))}:${deux(fin % 60)}:00`, timeZone: 'Europe/Paris' };
  } else {
    const lendemain = new Date(`${a.date}T00:00:00Z`);
    lendemain.setUTCDate(lendemain.getUTCDate() + 1);
    start = { date: a.date };
    end = { date: lendemain.toISOString().slice(0, 10) };
  }
  return google(CALENDAR, {
    method: 'POST',
    body: JSON.stringify({ summary: titre, description: `${description}\n\nFiche dans le CRM : https://ia-entrepreneur.fr/crm/`.trim(), location: lieu, start, end, extendedProperties: { private: { crm_lead: leadId } } }),
  });
}

async function traiterEntrant(corps) {
  if (!UUID_RE.test(corps.id || '')) throw new Refus('id_invalide');
  const { lignes } = await sb(`iae_crm_entrants?select=*&id=eq.${corps.id}`);
  const e = lignes[0];
  if (!e) throw new Refus('introuvable', 404);
  const action = corps.action;
  if (action === 'ignorer' || action === 'ignorer_toujours') {
    await sb(`iae_crm_entrants?id=eq.${e.id}`, { methode: 'PATCH', corps: { statut: 'ignore' }, prefer: 'return=minimal' });
    if (action === 'ignorer_toujours' && e.de_email) {
      const liste = new Set((await lireReglage('expediteurs_ignores')) || []);
      liste.add(e.de_email.toLowerCase());
      await ecrireReglage('expediteurs_ignores', [...liste].slice(-500));
      await sb(`iae_crm_entrants?de_email=eq.${encodeURIComponent(e.de_email)}&statut=eq.a_trier`, { methode: 'PATCH', corps: { statut: 'ignore' }, prefer: 'return=minimal' });
    }
    return { ignore: true };
  }
  if (action === 'remettre') {
    await sb(`iae_crm_entrants?id=eq.${e.id}`, { methode: 'PATCH', corps: { statut: 'a_trier' }, prefer: 'return=minimal' });
    return { remis: true };
  }
  if (action !== 'creer' && action !== 'rattacher') throw new Refus('action_inconnue');
  const [prenom, ...reste] = String(e.de_nom || '').split(/\s+/).filter(Boolean);
  let lead;
  let contactId = null;
  if (action === 'creer') {
    lead = await inserer('leads', nettoyer({ type: 'prospect', statut: 'nouveau', source: e.canal === 'agenda' ? 'RDV pris dans ton agenda' : 'Email reçu', ...corps.lead }, 'leads', true));
    const c = await inserer('contacts', nettoyer({ prenom: prenom || null, nom: reste.join(' ') || null, ...(corps.contact || {}), email: e.de_email, lead_id: lead.id, principal: true }, 'contacts', true));
    contactId = c.id;
  } else {
    if (!UUID_RE.test(corps.lead_id || '')) throw new Refus('id_invalide');
    lead = { id: corps.lead_id };
    const existant = e.de_email ? await contactParEmail(e.de_email) : null;
    if (existant && existant.lead_id === lead.id) contactId = existant.id;
    else if (e.de_email) contactId = (await inserer('contacts', { lead_id: lead.id, prenom: prenom || null, nom: reste.join(' ') || null, email: e.de_email, principal: false })).id;
  }
  const m = { ...(e.meta || {}) };
  if (e.canal === 'agenda') {
    // Même référence que la synchro de l'agenda pour un contact connu : jamais de RDV en double.
    if (m.event_id) m.event_ref = `agenda:${m.event_id}:${lead.id}`;
    await inserer('activites', { lead_id: lead.id, contact_id: contactId, type: 'rdv', resume: `RDV prévu : ${String(e.objet || '').replace(/^RDV : /, '')}`.slice(0, 2000), contenu: e.extrait, source: 'agenda', meta: m });
    if (m.date_rdv && m.date_rdv >= aujourdHuiParis()) await modifier('leads', lead.id, { prochaine_relance: m.date_rdv, prochaine_action: 'rdv', prochaine_note: `RDV${m.heure ? ` à ${m.heure}` : ''}`, relances_sans_reponse: 0 });
  } else {
    // L'analyse de Claude, quand elle existe, dit quoi faire ; sinon on demande de répondre.
    const an = m.analyse || null;
    const qui = e.de_nom || e.de_email;
    await inserer('activites', { lead_id: lead.id, contact_id: contactId, date: e.recu_le, type: 'email_recu', resume: (an?.resume ? `${qui} : ${an.resume}` : `Email reçu de ${qui} : « ${e.objet || ''} »`).slice(0, 2000), contenu: e.extrait, source: 'gmail iae', meta: { gmail_id: e.ref_externe, fil: e.fil, objet: e.objet, analyse: an } });
    const dejaRepondu = await dernierMessageDeMoi(e.fil);
    const aFaire = dejaRepondu ? 'rien' : (an?.a_faire || 'repondre');
    const maj = { relances_sans_reponse: 0, dernier_contact: jourParis(e.recu_le) };
    if (aFaire === 'repondre' || action === 'creer') Object.assign(maj, { prochaine_relance: aujourdHuiParis(), prochaine_action: 'email', prochaine_note: (an?.tache || `Répondre à ${qui} : « ${String(e.objet || '').slice(0, 200)} »`).slice(0, 2000), tache_fil: e.fil || null });
    else if (aFaire === 'relancer_le' && DATE_RE.test(an?.relance_date || '') && an.relance_date >= aujourdHuiParis()) Object.assign(maj, { prochaine_relance: an.relance_date, prochaine_note: (an.tache || an.resume || '').slice(0, 2000) || null, tache_fil: e.fil || null });
    await modifier('leads', lead.id, maj);
  }
  await sb(`iae_crm_entrants?id=eq.${e.id}`, { methode: 'PATCH', corps: { statut: action === 'creer' ? 'cree' : 'rattache', lead_id: lead.id }, prefer: 'return=minimal' });
  return { lead_id: lead.id };
}

/* ---------- Fonction orale ---------- */

const SCHEMA_VOCAL = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['appel', 'reponse', 'note', 'decaler', 'rdv', 'etape', 'perdu', 'passer', 'incompris'] },
    suivi: { type: 'string', enum: [...SUIVIS, ''] },
    formation_debut: { type: 'string', description: 'AAAA-MM-JJ, ou vide' },
    formation_fin: { type: 'string', description: 'AAAA-MM-JJ, ou vide' },
    resultat_appel: { type: 'string', enum: ['joint', 'sans_reponse', 'message', ''] },
    note: { type: 'string' },
    relance_date: { type: 'string', description: 'AAAA-MM-JJ, ou vide' },
    relance_action: { type: 'string', enum: ['email', 'appel', 'rdv', 'autre', ''] },
    rdv_date: { type: 'string' },
    rdv_heure: { type: 'string', description: 'HH:MM, ou vide' },
    rdv_lieu: { type: 'string' },
    raison_perte: { type: 'string' },
    confirmation: { type: 'string', description: 'Une phrase courte, au tutoiement, lue à voix haute' },
  },
  required: ['action', 'suivi', 'formation_debut', 'formation_fin', 'resultat_appel', 'note', 'relance_date', 'relance_action', 'rdv_date', 'rdv_heure', 'rdv_lieu', 'raison_perte', 'confirmation'],
  additionalProperties: false,
};

const CONSIGNES_VOCAL = `Tu aides Gabriel à traiter ses relances commerciales à la voix, téléphone en main. Il vient de dire une phrase à propos du lead affiché. Transforme-la en une seule action pour son CRM.

Actions possibles :
- appel : il a appelé. resultat_appel = joint (il a eu la personne), sans_reponse, ou message (messagerie, message laissé). note = ce qui s'est dit, reformulé proprement en une ou deux phrases.
- reponse : la personne a répondu (email, SMS, WhatsApp, en personne). note = ce qu'elle a répondu.
- note : une simple information à garder.
- decaler : il veut seulement déplacer la prochaine relance.
- rdv : un rendez-vous est fixé. rdv_date, rdv_heure (HH:MM), rdv_lieu si dits.
- etape : pour un client en formation, une étape du suivi est franchie. suivi = la clé de l'étape atteinte : financement_demande (dossier de financement envoyé), financement_accepte (accord du financeur), programme_valide, dates_placees, convention_signee, convocations (convocations envoyées), formation_terminee, facturee (facture envoyée), payee (paiement reçu). Si des dates de formation sont dites, formation_debut et formation_fin en AAAA-MM-JJ. Le CRM prévoit tout seul la tâche suivante.
- perdu : le lead est perdu. raison_perte si dite.
- passer : « suivant », « passe », « plus tard » sans date.
- incompris : la phrase n'est pas claire ; confirmation = la question courte à lui poser.

Dates : la date du jour et le jour de la semaine te sont donnés. Convertis « demain », « lundi », « mardi prochain », « dans deux semaines », « le 20 » en AAAA-MM-JJ, jamais un samedi, un dimanche ni un jour férié (passe alors au jour ouvré suivant). Si une relance est demandée sans date (« rappelle-le »), laisse relance_date vide : le CRM appliquera son rythme. relance_action : appel s'il dit « rappeler » ou « appeler », email s'il dit « écrire », « envoyer », « relancer par mail », sinon vide.

N'invente rien : seulement ce qu'il a dit. Les champs sans objet restent vides. La confirmation se lit à voix haute : courte, au tutoiement, elle dit ce qui sera noté et la prochaine relance, par exemple « Pas de réponse, je te le remets lundi en appel. »`;

async function interpreterVocal(corps, ip) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Refus('ia_non_configuree', 503);
  if (!UUID_RE.test(corps.lead_id || '')) throw new Refus('id_invalide');
  const texte = String(corps.texte || '').trim().slice(0, 1500);
  if (!texte) throw new Refus('message_invalide');
  if (tropDeRedactions(ip)) throw new Refus('ia_trop_de_demandes', 429);
  const { lignes } = await sb(`iae_crm_leads?select=entreprise,statut,suivi,prochaine_relance,prochaine_action,prochaine_note,relances_sans_reponse&id=eq.${corps.lead_id}`);
  const lead = lignes[0];
  if (!lead) throw new Refus('introuvable', 404);
  const maintenant = new Date();
  const jourSemaine = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long' }).format(maintenant);
  const contexte = [
    `Date du jour : ${aujourdHuiParis()} (${jourSemaine})`,
    `Lead : ${lead.entreprise}, étape ${lead.statut}${lead.suivi ? `, suivi client : ${lead.suivi}` : ''}`,
    `Prévu : ${lead.prochaine_action || ''} le ${lead.prochaine_relance || 'rien'}${lead.prochaine_note ? `, ${lead.prochaine_note}` : ''}`,
    `Relances sans réponse : ${lead.relances_sans_reponse}`,
    `Ce que Gabriel a dit : « ${texte} »`,
  ].join('\n');
  const client = new Anthropic({ timeout: 30000, maxRetries: 1 });
  let reponse;
  try {
    reponse = await client.beta.messages.create({
      model: MODELE_REDACTION,
      max_tokens: 4000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA_VOCAL } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: CONSIGNES_VOCAL, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: contexte }],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new Refus('ia_trop_de_demandes', 429);
    if (e instanceof Anthropic.APIConnectionError) throw new Refus('ia_injoignable', 502);
    if (e instanceof Anthropic.APIError) { console.error('crm vocal', e.status, e.message); throw new Refus('ia_erreur', 502); }
    throw e;
  }
  if (reponse.stop_reason === 'refusal') throw new Refus('ia_refus', 422);
  const brut = (reponse.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  let r;
  try { r = JSON.parse(brut); } catch { throw new Refus('ia_erreur', 502); }
  // On ne garde que des valeurs sûres : la page les applique avec ses propres fonctions.
  const date = (x) => (DATE_RE.test(x || '') ? x : '');
  return {
    action: SCHEMA_VOCAL.properties.action.enum.includes(r.action) && (r.action !== 'etape' || SUIVIS.includes(r.suivi)) ? r.action : 'incompris',
    suivi: SUIVIS.includes(r.suivi) ? r.suivi : '',
    formation_debut: date(r.formation_debut),
    formation_fin: date(r.formation_fin),
    resultat_appel: ['joint', 'sans_reponse', 'message'].includes(r.resultat_appel) ? r.resultat_appel : '',
    note: String(r.note || '').slice(0, 2000),
    relance_date: date(r.relance_date),
    relance_action: ['email', 'appel', 'rdv', 'autre'].includes(r.relance_action) ? r.relance_action : '',
    rdv_date: date(r.rdv_date),
    rdv_heure: /^\d{2}:\d{2}$/.test(r.rdv_heure || '') ? r.rdv_heure : '',
    rdv_lieu: String(r.rdv_lieu || '').slice(0, 300),
    raison_perte: String(r.raison_perte || '').slice(0, 500),
    confirmation: String(r.confirmation || '').slice(0, 400),
    texte,
  };
}

/* ---------- Le récapitulatif du matin ---------- */

// Vercel Cron appelle à 5 h et 6 h UTC du lundi au vendredi : seul l'appel qui
// tombe à 7 h à Paris envoie (heure d'hiver comme d'été), une fois par jour.
async function rappelDuMatin(force = false) {
  if (!gmailConfigure()) return { envoye: false, raison: 'gmail_non_configure' };
  const heure = Number(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
  const jour = aujourdHuiParis();
  if (!force && heure !== 7) return { envoye: false, raison: 'pas_l_heure' };
  if ((await lireReglage('rappel_matin')) === 'non') return { envoye: false, raison: 'desactive' };
  const dernier = await lireReglage('rappel_matin_envoye');
  if (!force && dernier && dernier.le === jour) return { envoye: false, raison: 'deja_envoye' };
  // Un premier tour de boîte et d'agenda, pour que le récapitulatif soit à jour, et les échéances des formateurs.
  await synchroniser().catch(() => null);
  await echeancesFormateurs().catch((e) => console.error('crm échéances formateurs', e?.message || e));
  const [{ lignes: leads }, { lignes: contacts }, { lignes: entrants }] = await Promise.all([
    sb(`iae_crm_leads?select=id,entreprise,prochaine_relance,prochaine_action,prochaine_note,relances_sans_reponse&archive=is.false&prochaine_relance=lte.${jour}&order=prochaine_relance.asc,entreprise.asc`),
    sb('iae_crm_contacts?select=lead_id,prenom,nom,principal&order=principal.desc'),
    sb('iae_crm_entrants?select=de_nom,de_email,objet,canal&statut=eq.a_trier&order=recu_le.desc&limit=10'),
  ]);
  if (!leads.length && !entrants.length) return { envoye: false, raison: 'rien_a_faire' };
  const qui = (id) => { const c = contacts.find((x) => x.lead_id === id); return c ? [c.prenom, c.nom].filter(Boolean).join(' ') : ''; };
  const ACTION = { email: 'email', appel: 'appel', rdv: 'rendez-vous', autre: 'à faire' };
  const ecart = (d) => Math.round((Date.parse(jour) - Date.parse(d)) / 86400000);
  const ligne = (l) => {
    const retard = ecart(l.prochaine_relance);
    const nom = qui(l.id);
    return `- ${l.entreprise}${nom ? ` (${nom})` : ''} : ${ACTION[l.prochaine_action] || 'relance'}${retard > 0 ? `, en retard de ${retard} jour${retard > 1 ? 's' : ''}` : ''}${l.prochaine_note ? `. ${String(l.prochaine_note).slice(0, 160)}` : ''}`;
  };
  const retards = leads.filter((l) => l.prochaine_relance < jour);
  const dujour = leads.filter((l) => l.prochaine_relance === jour);
  const dateLongue = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const resume = [dujour.length && `${dujour.length} relance${dujour.length > 1 ? 's' : ''} pour aujourd'hui`, retards.length && `${retards.length} en retard`,
    entrants.length && `${entrants.length} message${entrants.length > 1 ? 's' : ''} à trier`].filter(Boolean).join(', ');
  const corps = [
    'Bonjour Gabriel,', '',
    `Aujourd'hui, ${dateLongue} : ${resume}.`, '',
    retards.length ? `En retard\n${retards.map(ligne).join('\n')}\n` : null,
    dujour.length ? `Aujourd'hui\n${dujour.map(ligne).join('\n')}\n` : null,
    entrants.length ? `À trier\n${entrants.map((e) => `- ${e.de_nom || e.de_email} : ${e.objet || ''}`).join('\n')}\n` : null,
    "Pour tout enchaîner : https://ia-entrepreneur.fr/crm/ (bouton « Enchaîner les relances »).", '',
    'Bonne journée,', 'Ton CRM',
  ].filter((x) => x !== null).join('\n');
  const total = leads.length;
  const objet = total ? `Tes ${total} relance${total > 1 ? 's' : ''} du jour${retards.length ? ` (${retards.length} en retard)` : ''}` : `${entrants.length} message${entrants.length > 1 ? 's' : ''} à trier dans ton CRM`;
  const envoi = await envoyerGmail({ a: COMPTE, objet, corps, mode: 'envoyer' });
  await ecrireReglage('rappel_matin_envoye', { le: jour, relances: total, a_trier: entrants.length });
  return { envoye: true, objet, gmail_id: envoi.gmail_id };
}

/* ---------- Logos des entreprises ---------- */

// Le navigateur ne parle qu'à /api/crm : c'est le serveur qui demande le logo
// d'un domaine au service de favicons de Google (128 px). Pas de SVG, rien
// au-delà de 300 Ko. Sans logo connu (Google répond 404), on renvoie 204 et la
// page affiche les initiales.
const DOMAINE_RE = /^(?=.{4,100}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;
const TYPES_IMAGE = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'];

async function envoyerLogo(res, domaine) {
  const d = String(domaine).toLowerCase().trim();
  if (!DOMAINE_RE.test(d)) return res.status(400).json({ erreur: 'domaine_invalide' });
  try {
    const r = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=128`, { signal: AbortSignal.timeout(5000) });
    const type = (r.headers.get('content-type') || '').split(';')[0].trim();
    if (r.status !== 200 || !TYPES_IMAGE.includes(type)) return res.status(204).send('');
    const image = Buffer.from(await r.arrayBuffer());
    if (image.length === 0 || image.length > 300000) return res.status(204).send('');
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'private, max-age=604800');
    return res.status(200).send(image);
  } catch {
    return res.status(204).send('');
  }
}

/* ---------- Point d'entrée ---------- */

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (!process.env.CRM_CLE || !supabaseConfigure()) return res.status(503).json({ erreur: 'crm_non_configure' });
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ erreur: 'methode' });
  }
  const tache = req.method === 'GET' ? new URL(req.url, 'http://local').searchParams.get('tache') : null;
  if (tache === 'synchro' || tache === 'matin') {
    const attendu = Buffer.from(process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : '');
    const donne = Buffer.from(String(req.headers.authorization || ''));
    if (!process.env.CRON_SECRET || attendu.length !== donne.length || !timingSafeEqual(attendu, donne)) return res.status(401).json({ erreur: 'non_autorise' });
    if (tache === 'matin') return res.status(200).json(await rappelDuMatin(new URL(req.url, 'http://local').searchParams.get('force') === '1'));
    return res.status(200).json(await synchroniser());
  }
  if (origineEtrangere(req)) return res.status(403).json({ erreur: 'origine' });

  const ip = empreinte(req);
  if (tropDEchecs(ip)) return res.status(429).json({ erreur: 'trop_de_tentatives' });
  if (!cleValide(req)) {
    noterEchec(ip);
    return res.status(401).json({ erreur: 'cle_invalide' });
  }

  try {
    if (req.method === 'GET') {
      const params = new URL(req.url, 'http://local').searchParams;
      const logo = params.get('logo');
      if (logo !== null) return envoyerLogo(res, logo);
      if (params.get('fil') !== null) return res.status(200).json(await filDuCrm(params.get('fil')));
      if (params.get('document') !== null) {
        const id = params.get('document');
        if (!UUID_RE.test(id)) throw new Refus('id_invalide');
        const [d] = (await sb(`iae_crm_documents?id=eq.${id}&select=chemin,mime,nom`)).lignes;
        if (!d) throw new Refus('introuvable', 404);
        const octets = await lireFichier(d.chemin);
        res.setHeader('Content-Type', d.mime || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(d.nom)}`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.status(200).send(octets);
      }
      if (params.get('contrat') !== null) {
        const id = params.get('contrat');
        if (!UUID_RE.test(id)) throw new Refus('id_invalide');
        const [f] = (await sb(`iae_crm_formateurs?lead_id=eq.${id}&select=signature,contre_signature`)).lignes;
        if (!f || !f.signature) throw new Refus('introuvable', 404);
        return res.status(200).json({ signature: f.signature, contre_signature: f.contre_signature, intact: empreinteTexte(f.signature.texte) === f.signature.empreinte });
      }
      return res.status(200).json(await lireTout());
    }
    let corps = req.body;
    if (typeof corps === 'string') {
      try {
        corps = JSON.parse(corps);
      } catch {
        throw new Refus('json_invalide');
      }
    }
    if (corps && corps.op === 'rediger') return res.status(200).json(await rediger(corps, ip));
    if (corps && corps.op === 'vocal') return res.status(200).json(await interpreterVocal(corps, ip));
    if (corps && ['programme_generer', 'programme_recommander'].includes(corps.op)) {
      if (tropDeRedactions(ip)) throw new Refus('ia_trop_de_demandes', 429);
      return res.status(200).json(await operationProgramme(corps));
    }
    if (corps && corps.op === 'recap') {
      if (tropDeRedactions(ip)) throw new Refus('ia_trop_de_demandes', 429);
      return res.status(200).json(await recapLead(corps));
    }
    return res.status(200).json(await operation(corps));
  } catch (e) {
    if (e instanceof Refus || (e && e.refus)) return res.status(e.statut || 400).json({ erreur: e.code });
    console.error('crm', e);
    return res.status(500).json({ erreur: 'erreur_interne' });
  }
}

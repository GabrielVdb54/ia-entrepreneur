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
const TYPES_LEAD = ['prospect', 'client', 'partenaire', 'fournisseur'];
const ACTIONS = ['email', 'appel', 'rdv', 'autre'];
const TYPES_ACTIVITE = ['note', 'appel', 'appel_sans_reponse', 'email_envoye', 'email_recu',
  'brouillon', 'rdv', 'sms', 'relance_decalee', 'statut', 'import'];

const TABLES = {
  leads: {
    nom: 'iae_crm_leads',
    requis: ['entreprise'],
    colonnes: {
      entreprise: T, type: ['enum', TYPES_LEAD], statut: ['enum', STATUTS], secteur: T, telephone: T,
      site_web: T, localisation: T, adresse: T, siret: T, valeur: 'nombre', besoin: L, service: T,
      budget: T, source: T, tags: 'tags', prochaine_relance: 'date', prochaine_action: ['enum', ACTIONS],
      prochaine_note: T, relances_sans_reponse: 'entier', dernier_contact: 'date', raison_perte: T,
      hubspot_id: T, archive: 'bool',
    },
  },
  contacts: {
    nom: 'iae_crm_contacts',
    requis: ['lead_id'],
    colonnes: {
      lead_id: 'uuid', prenom: T, nom: T, email: T, telephone: T, poste: T, principal: 'bool', notes: L,
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

const REGLAGES_AUTORISES = ['signature'];
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
  const [leads, contacts, activites, memos, modeles, reglages] = await Promise.all([
    toutLire('iae_crm_leads', 'entreprise.asc'),
    toutLire('iae_crm_contacts', 'principal.desc,created_at.asc'),
    toutLire('iae_crm_activites', 'date.desc'),
    toutLire('iae_crm_memos', 'categorie.asc,ordre.asc,titre.asc'),
    toutLire('iae_crm_modeles', 'ordre.asc,nom.asc'),
    toutLire('iae_crm_reglages', 'cle.asc'),
  ]);
  return {
    leads, contacts, activites, memos, modeles,
    reglages: Object.fromEntries(reglages.map((r) => [r.cle, r.valeur])),
    gmail: gmailConfigure(),
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
    const ligne = await inserer('activites', activite);
    const lead = corps.lead ? await modifier('leads', corps.lead_id, nettoyer(corps.lead, 'leads', false)) : null;
    return { activite: ligne, lead };
  }
  if (op === 'lot') return operationLot(corps);
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
    sb(`iae_crm_activites?select=date,type,resume,contenu,source&lead_id=eq.${corps.lead_id}&order=date.desc&limit=12`),
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
    return `- ${jour}, ${a.type} : ${couper(a.resume, 600)}${a.contenu ? `\n  Détail : ${couper(a.contenu.replace(/\s+/g, ' '), 1500)}` : ''}`;
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
  if (origineEtrangere(req)) return res.status(403).json({ erreur: 'origine' });

  const ip = empreinte(req);
  if (tropDEchecs(ip)) return res.status(429).json({ erreur: 'trop_de_tentatives' });
  if (!cleValide(req)) {
    noterEchec(ip);
    return res.status(401).json({ erreur: 'cle_invalide' });
  }

  try {
    if (req.method === 'GET') {
      const logo = new URL(req.url, 'http://local').searchParams.get('logo');
      if (logo !== null) return envoyerLogo(res, logo);
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
    return res.status(200).json(await operation(corps));
  } catch (e) {
    if (e instanceof Refus) return res.status(e.statut).json({ erreur: e.code });
    console.error('crm', e);
    return res.status(500).json({ erreur: 'erreur_interne' });
  }
}

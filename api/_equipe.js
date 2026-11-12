/**
 * Le CRM à plusieurs (10/11/2026).
 *
 * Gabriel, 10/11 : « on arrête HubSpot… il va utiliser le CRM que je suis en
 * train de me faire ». Ses choix : chaque membre de l'équipe a son accès, ne voit
 * que ses leads et envoie depuis sa propre boîte ; Gabriel voit tout.
 *
 * - Gabriel entre avec CRM_CLE, comme avant : rôle « admin », aucun filtre.
 * - Un membre (table iae_crm_utilisateurs) entre avec sa clé personnelle ; seule
 *   son empreinte SHA-256 est gardée. Rôle « closer » ou « setter ».
 * - Qui voit quoi : la colonne visible_par (supabase/iae_crm_equipe.sql). garder()
 *   est appelée par sb() avant CHAQUE requête à la base : pour un membre, elle
 *   ajoute « visible_par contient mon adresse » aux lectures, modifications et
 *   suppressions, refuse les tables réservées à Gabriel (formateurs, pièces,
 *   programmes, LinkedIn, avis, évaluations, utilisateurs, prospection email et
 *   oppositions) et contrôle chaque
 *   création. Un oubli ailleurs dans le code ne peut donc pas montrer la fiche
 *   d'un autre.
 * - LinkedIn (10/11/2026) : un membre qui a un robot sur son ordinateur (clé
 *   robot_cle_hash, créée par Gabriel) voit et valide les envois de son propre
 *   compte (colonne compte de iae_crm_linkedin), jamais ceux d'un autre.
 * - La boîte Gmail et l'agenda d'un membre : il les connecte lui-même depuis le
 *   CRM (client OAuth « Application Web » du Workspace, GOOGLE_CRM_CLIENT_ID /
 *   GOOGLE_CRM_CLIENT_SECRET, retour sur /api/crm-google). Le jeton de
 *   renouvellement est chiffré (AES-256-GCM, clé CRM_CHIFFRE, 32 octets en base64)
 *   avant d'aller en base.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const ADMIN_EMAIL = 'gabriel@ia-entrepreneur.fr';
export const ADMIN = Object.freeze({ email: ADMIN_EMAIL, prenom: 'Gabriel', nom: 'Vanderbecken', role: 'admin', fonction: null, google: true });
export const ROLES = ['closer', 'setter'];
const EMAIL_EQUIPE_RE = /^[a-z0-9._-]+@ia-entrepreneur\.fr$/;
const PORTEES = [
  'openid', 'email',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

class RefusEquipe extends Error {
  constructor(code, statut = 403) {
    super(code);
    this.code = code;
    this.statut = statut;
    this.refus = true;
  }
}

/* ---------- Qui fait la requête ---------- */

const contexte = new AsyncLocalStorage();
export const avecUtilisateur = (u, fn) => contexte.run(u, fn);
// Hors requête (tâches planifiées, robot LinkedIn) : c'est Gabriel.
export const moi = () => contexte.getStore() || ADMIN;
export const estAdmin = (u = moi()) => u.role === 'admin';
export const nomComplet = (u = moi()) => [u.prenom, u.nom].filter(Boolean).join(' ');
export const compte = () => moi().email;

const FONCTION_DEFAUT = { closer: 'conseiller formation IA', setter: 'conseillère formation IA' };
export const fonctionDe = (u = moi()) => u.fonction || FONCTION_DEFAUT[u.role] || "fondateur d'IA-Entrepreneur";

// Les consignes données à Claude sont écrites pour Gabriel : pour un membre, elles
// parlent de lui (nom, adresse, fonction). Le mémo, lui, reste tel quel.
export function pourMoi(texte) {
  const u = moi();
  if (estAdmin(u) || !texte) return texte;
  const nom = nomComplet(u);
  const fonction = fonctionDe(u);
  return String(texte)
    .replaceAll(ADMIN_EMAIL, u.email)
    .replace(/Gabriel Vanderbecken, fondateur de l'organisme de formation IA-Entrepreneur/g, `${nom}, ${fonction} de l'organisme de formation IA-Entrepreneur`)
    .replace(/fondateur d'IA-Entrepreneur/g, `${fonction} chez IA-Entrepreneur`)
    .replace(/Gabriel Vanderbecken/g, nom)
    .replace(/\bGabriel\b/g, u.prenom);
}

// Les réglages d'un membre sont rangés sous « clé|adresse ».
export const cleReglage = (cle) => (estAdmin() ? cle : `${cle}|${moi().email}`);
export const cleReglageLue = (cle) => (estAdmin() ? cle : String(cle).replace(/\|[^|]*$/, ''));

/* ---------- Base (clé de service), pour la table des utilisateurs ---------- */

async function sbBrut(chemin, { methode = 'GET', corps, prefer } = {}) {
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const entetes = { apikey: cle, Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' };
  if (prefer) entetes.Prefer = prefer;
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${chemin}`, {
    method: methode, headers: entetes, body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  if (!r.ok) {
    console.error('crm equipe supabase', methode, chemin.split('?')[0], r.status, (await r.text()).slice(0, 200));
    throw new RefusEquipe('base_indisponible', 502);
  }
  const t = r.status === 204 ? '' : await r.text();
  return t ? JSON.parse(t) : null;
}

const CHAMPS_PUBLICS = 'email,prenom,nom,role,fonction,telephone,actif,cle_le,google,created_at,robot_cle_le';
function publique(u) {
  if (!u) return null;
  const { google, cle_hash: _empreinte, robot_cle_hash: _robot, ...reste } = u;
  return { ...reste, google: Boolean(google && google.refresh), google_email: google ? google.email || null : null, google_le: google ? google.le || null : null };
}

export const empreinteCle = (cle) => createHash('sha256').update(String(cle)).digest('hex');

// Une clé de membre : 32 caractères au moins (les nôtres en font 32).
export async function utilisateurParCle(cle) {
  const c = String(cle || '');
  if (c.length < 32 || c.length > 200) return null;
  const lignes = await sbBrut(`iae_crm_utilisateurs?cle_hash=eq.${empreinteCle(c)}&actif=is.true&select=${CHAMPS_PUBLICS}`);
  return publique(lignes && lignes[0]);
}

// La clé du robot LinkedIn d'un membre (10/11/2026) : le robot de son ordinateur agit en son nom, avec sa file.
export async function utilisateurParCleRobot(cle) {
  const c = String(cle || '');
  if (c.length < 32 || c.length > 200) return null;
  const lignes = await sbBrut(`iae_crm_utilisateurs?robot_cle_hash=eq.${empreinteCle(c)}&actif=is.true&select=${CHAMPS_PUBLICS}`);
  return publique(lignes && lignes[0]);
}

let cacheEquipe = { le: 0, liste: [] };
export async function membres({ frais = false } = {}) {
  if (!frais && Date.now() - cacheEquipe.le < 60000) return cacheEquipe.liste;
  const lignes = await sbBrut(`iae_crm_utilisateurs?select=${CHAMPS_PUBLICS}&order=prenom.asc`);
  cacheEquipe = { le: Date.now(), liste: (lignes || []).map(publique) };
  return cacheEquipe.liste;
}

// Ceux à qui on peut confier un lead : Gabriel et les closers actifs.
export async function closers() {
  return [{ email: ADMIN_EMAIL, prenom: ADMIN.prenom, nom: ADMIN.nom, role: 'admin' },
    ...(await membres()).filter((m) => m.actif && m.role === 'closer').map(({ email, prenom, nom, role }) => ({ email, prenom, nom, role }))];
}

// Ce que la page reçoit sur l'équipe : tout pour Gabriel, les noms seulement pour un membre.
export async function equipePourPage() {
  const liste = await membres();
  if (estAdmin()) return liste;
  return liste.filter((m) => m.actif).map(({ email, prenom, nom, role }) => ({ email, prenom, nom, role }));
}

/* ---------- Le garde de la base ---------- */

const FILTREES = new Set(['iae_crm_leads', 'iae_crm_contacts', 'iae_crm_activites', 'iae_crm_entrants']);
const LECTURE_SEULE = new Set(['iae_crm_memos', 'iae_crm_modeles']);
const ajouterFiltre = (chemin, f) => chemin + (chemin.includes('?') ? '&' : '?') + f;

async function leadsVisibles(ids, email) {
  const uniques = [...new Set(ids)];
  if (!uniques.length) return true;
  if (!uniques.every((x) => /^[0-9a-f-]{36}$/i.test(String(x)))) return false;
  const lignes = await sbBrut(`iae_crm_leads?id=in.(${uniques.join(',')})&visible_par=cs.${encodeURIComponent(`{"${email}"}`)}&select=id`);
  return (lignes || []).length === uniques.length;
}

async function proprietaireAutorise(email) {
  const e = String(email || '').toLowerCase();
  return (await closers()).some((c) => c.email === e);
}

/**
 * Appelée par sb() avant chaque requête. Renvoie le chemin et le corps à utiliser.
 * Gabriel : rien ne change. Un membre : filtre, refus ou contrôle.
 */
export async function garder(chemin, methode = 'GET', corps) {
  const u = moi();
  if (estAdmin(u)) return { chemin, corps };
  const table = chemin.split('?')[0];
  const visible = `visible_par=cs.${encodeURIComponent(`{"${u.email}"}`)}`;

  if (table === 'iae_crm_reglages') {
    if (methode === 'GET') return { chemin: ajouterFiltre(chemin, `cle=like.${encodeURIComponent(`*|${u.email}`)}`), corps };
    const lignes = Array.isArray(corps) ? corps : [corps];
    if (methode !== 'POST' || !lignes.every((l) => l && typeof l.cle === 'string' && l.cle.endsWith(`|${u.email}`))) throw new RefusEquipe('reserve_admin');
    return { chemin, corps };
  }
  if (table === 'iae_crm_linkedin') {
    // LinkedIn d'un membre (10/11/2026) : seulement les envois de son propre compte, et sur ses leads.
    const sien = `compte=eq.${encodeURIComponent(u.email)}`;
    if (methode === 'GET' || methode === 'DELETE') return { chemin: ajouterFiltre(chemin, sien), corps };
    if (methode === 'PATCH') {
      const c = corps && typeof corps === 'object' ? { ...corps } : corps;
      if (c && typeof c === 'object') { delete c.compte; delete c.lead_id; delete c.contact_id; }
      return { chemin: ajouterFiltre(chemin, sien), corps: c };
    }
    if (methode === 'POST') {
      if (/[?&]on_conflict=/.test(chemin)) throw new RefusEquipe('reserve_admin');
      const lignes = (Array.isArray(corps) ? corps : [corps]).map((l) => ({ ...(l || {}), compte: u.email }));
      if (!(await leadsVisibles(lignes.map((l) => l.lead_id), u.email))) throw new RefusEquipe('lead_inaccessible');
      return { chemin, corps: Array.isArray(corps) ? lignes : lignes[0] };
    }
    throw new RefusEquipe('reserve_admin');
  }
  if (LECTURE_SEULE.has(table)) {
    if (methode !== 'GET') throw new RefusEquipe('reserve_admin');
    return { chemin: table === 'iae_crm_memos' ? ajouterFiltre(chemin, 'prive=is.false') : chemin, corps };
  }
  if (!FILTREES.has(table)) throw new RefusEquipe('reserve_admin');

  if (methode === 'GET' || methode === 'DELETE') return { chemin: ajouterFiltre(chemin, visible), corps };

  if (methode === 'PATCH') {
    let c = corps;
    if (table === 'iae_crm_leads' && c && typeof c === 'object') {
      c = { ...c };
      delete c.setter;
      if ('proprietaire' in c) {
        // Seul un setter confie un lead à un closer (ou le reprend) ; un closer ne le donne pas.
        if (u.role !== 'setter' || !(c.proprietaire === u.email || await proprietaireAutorise(c.proprietaire))) delete c.proprietaire;
      }
    }
    if (c && typeof c === 'object') {
      delete c.visible_par;
      // Déplacer un contact ou une ligne du journal : seulement vers un de ses leads.
      if (c.lead_id && !(await leadsVisibles([c.lead_id], u.email))) throw new RefusEquipe('lead_inaccessible');
    }
    return { chemin: ajouterFiltre(chemin, visible), corps: c };
  }

  if (methode === 'POST') {
    if (/[?&]on_conflict=/.test(chemin) && table !== 'iae_crm_entrants') throw new RefusEquipe('reserve_admin');
    const lignes = (Array.isArray(corps) ? corps : [corps]).map((l) => ({ ...(l || {}) }));
    for (const l of lignes) delete l.visible_par;
    if (table === 'iae_crm_leads') {
      for (const l of lignes) {
        if (u.role === 'setter') {
          l.setter = u.email;
          if (!l.proprietaire || !(l.proprietaire === u.email || await proprietaireAutorise(l.proprietaire))) l.proprietaire = u.email;
        } else {
          l.proprietaire = u.email;
          delete l.setter;
        }
      }
    } else if (table === 'iae_crm_entrants') {
      for (const l of lignes) l.proprietaire = u.email;
    } else if (!(await leadsVisibles(lignes.map((l) => l.lead_id), u.email))) {
      throw new RefusEquipe('lead_inaccessible');
    }
    return { chemin, corps: Array.isArray(corps) ? lignes : lignes[0] };
  }
  throw new RefusEquipe('reserve_admin');
}

/* ---------- Chiffrement du jeton Google ---------- */

function cleChiffrement() {
  const b = Buffer.from(process.env.CRM_CHIFFRE || '', 'base64');
  if (b.length !== 32) throw new RefusEquipe('chiffrement_non_configure', 503);
  return b;
}
export function chiffrer(texte) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', cleChiffrement(), iv);
  const chiffre = Buffer.concat([c.update(String(texte), 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), chiffre.toString('base64')].join('.');
}
export function dechiffrer(valeur) {
  const [v, iv, tag, chiffre] = String(valeur || '').split('.');
  if (v !== 'v1' || !iv || !tag || !chiffre) throw new RefusEquipe('google_a_reconnecter', 409);
  const d = createDecipheriv('aes-256-gcm', cleChiffrement(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(chiffre, 'base64')), d.final()]).toString('utf8');
}

/* ---------- Boîte Gmail et agenda d'un membre ---------- */

export const googleEquipeConfigure = () => Boolean(process.env.GOOGLE_CRM_CLIENT_ID && process.env.GOOGLE_CRM_CLIENT_SECRET && process.env.CRM_CHIFFRE);
export const REDIRECTION_GOOGLE = () => process.env.GOOGLE_CRM_REDIRECTION || 'https://ia-entrepreneur.fr/api/crm-google';

const jetons = new Map(); // email -> { valeur, expire, verifie }
export async function jetonGoogle(u = moi()) {
  const enCache = jetons.get(u.email);
  if (enCache && enCache.expire > Date.now() + 60000) return enCache.valeur;
  if (!googleEquipeConfigure()) throw new RefusEquipe('gmail_non_configure', 503);
  const lignes = await sbBrut(`iae_crm_utilisateurs?email=eq.${encodeURIComponent(u.email)}&actif=is.true&select=google`);
  const g = lignes && lignes[0] && lignes[0].google;
  if (!g || !g.refresh) throw new RefusEquipe('google_a_connecter', 409);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CRM_CLIENT_ID, client_secret: process.env.GOOGLE_CRM_CLIENT_SECRET,
      refresh_token: dechiffrer(g.refresh), grant_type: 'refresh_token',
    }),
  });
  if (!r.ok) {
    const detail = (await r.text()).slice(0, 200);
    console.error('crm equipe jeton', u.email, r.status, detail);
    // Accès retiré ou mot de passe changé : il faut reconnecter la boîte.
    if (/invalid_grant/.test(detail)) throw new RefusEquipe('google_a_reconnecter', 409);
    throw new RefusEquipe('gmail_connexion', 502);
  }
  const j = await r.json();
  if (!enCache || !enCache.verifie) {
    const p = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', { headers: { Authorization: `Bearer ${j.access_token}` } });
    const profil = p.ok ? await p.json() : {};
    if (String(profil.emailAddress || '').toLowerCase() !== u.email) throw new RefusEquipe('gmail_mauvaise_boite', 502);
  }
  jetons.set(u.email, { valeur: j.access_token, expire: Date.now() + (j.expires_in || 3000) * 1000, verifie: true });
  return j.access_token;
}

const b64url = (b) => Buffer.from(b).toString('base64url');
function signature(texte) {
  return createHmac('sha256', cleChiffrement()).update(`etat-google:${texte}`).digest('base64url');
}

export function urlConnexionGoogle() {
  const u = moi();
  if (estAdmin(u)) throw new RefusEquipe('reserve_equipe', 400);
  if (!googleEquipeConfigure()) throw new RefusEquipe('gmail_non_configure', 503);
  const charge = b64url(JSON.stringify({ e: u.email, x: Date.now() + 15 * 60000, n: randomBytes(9).toString('base64url') }));
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CRM_CLIENT_ID,
    redirect_uri: REDIRECTION_GOOGLE(),
    response_type: 'code',
    scope: PORTEES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'false',
    login_hint: u.email,
    hd: 'ia-entrepreneur.fr',
    state: `${charge}.${signature(charge)}`,
  });
  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
}

// Retour de Google (api/crm-google.js) : l'état signé dit pour qui, le jeton d'identité dit qui s'est connecté.
export async function retourGoogle(code, etat) {
  const [charge, sig] = String(etat || '').split('.');
  const attendue = charge ? signature(charge) : '';
  if (!charge || !sig || sig.length !== attendue.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(attendue))) throw new RefusEquipe('etat_invalide', 400);
  const { e: email, x } = JSON.parse(Buffer.from(charge, 'base64url').toString('utf8'));
  if (!x || Date.now() > x) throw new RefusEquipe('lien_expire', 400);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: String(code || ''), client_id: process.env.GOOGLE_CRM_CLIENT_ID, client_secret: process.env.GOOGLE_CRM_CLIENT_SECRET,
      redirect_uri: REDIRECTION_GOOGLE(), grant_type: 'authorization_code',
    }),
  });
  if (!r.ok) {
    console.error('crm equipe code', r.status, (await r.text()).slice(0, 200));
    throw new RefusEquipe('google_refus', 400);
  }
  const j = await r.json();
  let identite = {};
  try { identite = JSON.parse(Buffer.from(String(j.id_token || '').split('.')[1] || '', 'base64url').toString('utf8')); } catch { /* vide */ }
  const connecte = String(identite.email || '').toLowerCase();
  if (!identite.email_verified || connecte !== email) throw new RefusEquipe('mauvais_compte', 400);
  const portees = String(j.scope || '').split(' ');
  if (!['gmail.compose', 'gmail.readonly', 'calendar.events'].every((p) => portees.some((x) => x.endsWith(p)))) throw new RefusEquipe('portees_manquantes', 400);
  if (!j.refresh_token) throw new RefusEquipe('pas_de_jeton', 400);
  const lignes = await sbBrut(`iae_crm_utilisateurs?email=eq.${encodeURIComponent(email)}&actif=is.true`, {
    methode: 'PATCH', prefer: 'return=representation',
    corps: { google: { refresh: chiffrer(j.refresh_token), email: connecte, le: new Date().toISOString() }, updated_at: new Date().toISOString() },
  });
  if (!lignes || !lignes.length) throw new RefusEquipe('utilisateur_inconnu', 404);
  jetons.delete(email);
  cacheEquipe.le = 0;
  return { email };
}

/* ---------- Gestion de l'équipe (Gabriel seulement) ---------- */

const nouvelleCle = () => randomBytes(24).toString('base64url'); // 32 caractères
const texteCourt = (v, max = 120) => {
  const t = String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim();
  if (t.length > max) throw new RefusEquipe('trop_long', 400);
  return t || null;
};

export async function operationEquipe(corps) {
  if (!estAdmin()) throw new RefusEquipe('reserve_admin');
  const email = String(corps.email || '').trim().toLowerCase();
  if (!EMAIL_EQUIPE_RE.test(email) || email === ADMIN_EMAIL) throw new RefusEquipe('email_invalide', 400);
  const maintenant = new Date().toISOString();

  if (corps.op === 'equipe_creer') {
    if (!ROLES.includes(corps.role)) throw new RefusEquipe('role_invalide', 400);
    const prenom = texteCourt(corps.prenom);
    if (!prenom) throw new RefusEquipe('champ_requis:prenom', 400);
    const cle = nouvelleCle();
    const ligne = { email, prenom, nom: texteCourt(corps.nom), role: corps.role, fonction: texteCourt(corps.fonction), telephone: texteCourt(corps.telephone, 40), cle_hash: empreinteCle(cle), cle_le: maintenant, actif: true };
    const lignes = await sbBrut('iae_crm_utilisateurs', { methode: 'POST', corps: ligne, prefer: 'return=representation' });
    cacheEquipe.le = 0;
    return { utilisateur: publique(lignes[0]), cle };
  }
  if (corps.op === 'equipe_cle') {
    const cle = nouvelleCle();
    const lignes = await sbBrut(`iae_crm_utilisateurs?email=eq.${encodeURIComponent(email)}`, { methode: 'PATCH', corps: { cle_hash: empreinteCle(cle), cle_le: maintenant, updated_at: maintenant }, prefer: 'return=representation' });
    if (!lignes || !lignes.length) throw new RefusEquipe('introuvable', 404);
    cacheEquipe.le = 0;
    return { utilisateur: publique(lignes[0]), cle };
  }
  if (corps.op === 'equipe_robot_cle') {
    // La clé du robot LinkedIn de son ordinateur : montrée une fois, à coller dans sa configuration à l'installation.
    const cle = nouvelleCle();
    const lignes = await sbBrut(`iae_crm_utilisateurs?email=eq.${encodeURIComponent(email)}`, { methode: 'PATCH', corps: { robot_cle_hash: empreinteCle(cle), robot_cle_le: maintenant, updated_at: maintenant }, prefer: 'return=representation' });
    if (!lignes || !lignes.length) throw new RefusEquipe('introuvable', 404);
    cacheEquipe.le = 0;
    return { utilisateur: publique(lignes[0]), cle };
  }
  if (corps.op === 'equipe_maj') {
    const v = { updated_at: maintenant };
    if (corps.role !== undefined) {
      if (!ROLES.includes(corps.role)) throw new RefusEquipe('role_invalide', 400);
      v.role = corps.role;
    }
    if (corps.actif !== undefined) v.actif = corps.actif === true;
    for (const k of ['prenom', 'nom', 'fonction']) if (corps[k] !== undefined) v[k] = texteCourt(corps[k]);
    if (corps.telephone !== undefined) v.telephone = texteCourt(corps.telephone, 40);
    if (corps.google_retirer === true) v.google = null;
    if (v.prenom === null) throw new RefusEquipe('champ_requis:prenom', 400);
    const lignes = await sbBrut(`iae_crm_utilisateurs?email=eq.${encodeURIComponent(email)}`, { methode: 'PATCH', corps: v, prefer: 'return=representation' });
    if (!lignes || !lignes.length) throw new RefusEquipe('introuvable', 404);
    jetons.delete(email);
    cacheEquipe.le = 0;
    return { utilisateur: publique(lignes[0]) };
  }
  throw new RefusEquipe('operation_inconnue', 400);
}

// Les membres dont la boîte est connectée : la synchro et le récap du matin passent pour chacun.
export async function membresConnectes() {
  return (await membres({ frais: true })).filter((m) => m.actif && m.google);
}

// Ce qu'un membre a le droit de demander (le reste est à Gabriel).
export const OPS_EQUIPE = new Set(['creer', 'maj', 'supprimer', 'journal', 'lot', 'synchro', 'entrant', 'recap', 'email',
  'reglage', 'rediger', 'vocal', 'voix', 'importer', 'google_connexion',
  // LinkedIn depuis son propre compte (10/11/2026) : sa file seulement (garder filtre par compte).
  'linkedin_preparer', 'linkedin_rediger', 'linkedin_valider', 'linkedin_annuler', 'linkedin_parti', 'linkedin_auto_couper']);
export const REGLAGES_EQUIPE = new Set(['signature', 'rappel_matin']);

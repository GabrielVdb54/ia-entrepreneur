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
 *   GET  /api/crm?fil=<id Gmail>     les messages d'un fil lié au CRM (ou échangé avec un contact du CRM), en entier
 *   GET  /api/crm?boite=<lead id>    tous les fils Gmail avec les contacts du lead, du plus récent au plus ancien
 *   GET  /api/crm?piece=<partie>&message=<id>&fil=<id>   une pièce jointe d'un de ces fils
 *   GET  /api/crm?document=<id>      une pièce d'un formateur (bucket privé), pour la regarder
 *   POST { op: 'voix', texte }       le mode oral lu par ElevenLabs (ELEVENLABS_API_KEY,
 *        ELEVENLABS_VOIX, ELEVENLABS_MODELE) ; sans clé, la page garde la voix du navigateur
 *   POST { op: 'formateur_lien' | 'formateur_maj' | 'formateur_siret' | 'piece_deposer'
 *          | 'document_verifier' | 'formateur_valider' | 'formateur_refuser', … }
 *        le dossier des formateurs (voir api/_formateurs.js et api/formateur.js)
 *   POST { op: 'programme_generer' | 'programme_maj' | 'programme_valider'
 *          | 'programme_recommander' | 'programme_choisir', … }
 *        le programme de formation d'un client, rédigé par Claude d'après le
 *        besoin et les échanges, puis les formateurs recommandés pour ce
 *        programme (seul un formateur validé peut être choisi)
 *   GET  /api/crm?tache=synchro      la même synchro, lancée par Vercel Cron
 *        toutes les 15 minutes (en-tête Authorization: Bearer CRON_SECRET) ;
 *        puis la prospection email (Gabriel seul, voir plus bas)
 *   POST { op: 'prospect_email', prospect }   un dirigeant à prospecter par email
 *        (clé du CRM de Gabriel, ou clé du robot de son Mac quand LinkedIn ne
 *        donne pas de profil utilisable)
 *   POST { op: 'email_importer', candidats: [...] }   une liste de dirigeants dont l'adresse
 *        est connue (base Google Maps d'Anna, Outscraper : fiable ou déduite), Gabriel seul
 *   POST { op: 'email_valider' | 'email_rediger' | 'email_ecarter' | 'email_adresse'
 *          | 'email_reprendre' | 'email_pause' | 'email_auto_couper' | 'email_reglage'
 *          | 'email_passage', … }   la prospection email depuis la page
 *   GET|POST /api/crm?stop=<jeton>   public, sans clé : la désinscription d'un
 *        prospect (page avec un bouton ; le POST en un clic de la messagerie)
 *
 * Prospection email (12/11/2026, Gabriel : « il faut qu'on en envoie tous les
 * jours », « vas y molo sur les emails ») : le circuit LinkedIn transposé à
 * l'email. Un dirigeant sans profil LinkedIn utilisable → registre national
 * (toujours en place, pas d'opposition à la prospection) et faits publics datés
 * (marchés publics, RGE, BODACC, BOAMP) → l'adresse du dirigeant trouvée
 * gratuitement (ADEME, BOAMP, site de l'entreprise lu dans le respect de
 * robots.txt) → sinon FullEnrich, seulement pour un contact « ultra qualifié »
 * (3 par jour) → Claude écrit l'objet et l'accroche → Gabriel valide d'un clic
 * (envoi automatique après 10 messages validés tels quels d'affilée) → Brevo
 * envoie les jours ouvrés entre 8 h 30 et 11 h 30, 5 par jour au plus, 2 par
 * passage → événements Brevo, pause automatique (1 spam, ou plus d'1 adresse en
 * erreur), bilan dans « Aujourd'hui » et dans le récap de 7 h. Une réponse, sur
 * n'importe quel canal, arrête tout ce qui attend (email et LinkedIn). Gabriel,
 * 12/11 : « on n'écrit pas aux adresses générales » : partout (recherche gratuite,
 * FullEnrich, adresse posée à la main, envoi), une adresse n'est gardée que si elle
 * est celle du dirigeant ou d'un co-dirigeant au registre, sur un domaine avec MX.
 * Le soir du 12/11, il assouplit : « on tente de les contacter en direct, même si
 * on sait que c'est des mails génériques […] en prenant en compte qu'on écrit à
 * l'accueil ». En dernier recours seulement (pas d'adresse du dirigeant gratuite,
 * ni de la base Google Maps, ni de FullEnrich, ou 3 jours ouvrés d'attente pour un
 * ultra qualifié) : l'adresse générale de l'entreprise elle-même, et un message
 * pour l'accueil (« Ce message est à destination de Monsieur X »). Le quota monte par
 * paliers (10 par jour à partir du 16/11) si le bilan reste propre.
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
 *   BREVO_API_KEY  l'envoi de la prospection email et la lecture de ses
 *       événements (la même clé que /api/rdv et /api/quiz). Sans elle, rien ne
 *       part et la barre le dit.
 *   FULLENRICH_API_KEY  la recherche de l'adresse vérifiée, pour les seuls contacts
 *       ultra qualifiés sans adresse trouvée gratuitement (1 crédit par adresse
 *       trouvée, jamais le téléphone, 3 par jour). Sans elle, ces contacts attendent
 *       et la barre le dit ; Claude Code peut poser l'adresse (op email_adresse).
 */

import { timingSafeEqual, randomBytes, createHash } from 'node:crypto';
import dns from 'node:dns';
import Anthropic from '@anthropic-ai/sdk';
import {
  ADMIN, ADMIN_EMAIL, avecUtilisateur, moi as utilisateurCourant, estAdmin, compte, nomComplet, pourMoi, cleReglage, cleReglageLue, garder,
  utilisateurParCle, utilisateurParCleRobot, fonctionDe, equipePourPage, closers, jetonGoogle, googleEquipeConfigure, urlConnexionGoogle, operationEquipe, membresConnectes,
  OPS_EQUIPE, REGLAGES_EQUIPE,
} from './_equipe.js';
import { creerDemande, GOOGLE_AVIS_RE } from './_avis.js';
import { civiliteDuPrenom } from './_prenoms.js';
import { MODALITES, nouveauJetonEval, questionnaire, propre as propreEval } from './_evaluations.js';
import {
  deposerPiece, empreinte as empreinteTexte, etatDossier, lireFichier, majStatut, nouveauJeton, verifierSiret, aujourdHui as aujourdHuiF,
} from './_formateurs.js';

// La rédaction par Claude peut prendre une quinzaine de secondes.
export const maxDuration = 60;

// L'adresse et le nom de la personne connectée (Gabriel, ou un membre de l'équipe : api/_equipe.js).
const expediteur = () => `${nomComplet()} <${compte()}>`;
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
  'brouillon', 'rdv', 'sms', 'relance_decalee', 'statut', 'import', 'linkedin', 'avis', 'paiement'];

const TABLES = {
  leads: {
    nom: 'iae_crm_leads',
    requis: ['entreprise'],
    colonnes: {
      entreprise: T, type: ['enum', TYPES_LEAD], statut: ['enum', STATUTS], secteur: T, telephone: T,
      site_web: T, localisation: T, adresse: T, siret: T, valeur: 'nombre', besoin: L, service: T,
      budget: T, source: T, tags: 'tags', prochaine_relance: 'date', prochaine_action: ['enum', ACTIONS],
      prochaine_note: T, relances_sans_reponse: 'entier', dernier_contact: 'date', raison_perte: T,
      hubspot_id: T, archive: 'bool', tache_fil: T, proprietaire: 'adresse', setter: 'adresse',
      suivi: ['enum', SUIVIS], formation_debut: 'date', formation_fin: 'date', financeur: T, financement_ref: T,
      facture_le: 'date', facture_echeance: 'date', facture_fil: T, facture_objet: T, paiement_annonce: T, paye_le: 'date',
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
    colonnes: { categorie: T, titre: T, contenu: L, sources: 'tags', date_maj: 'date', ordre: 'entier', prive: 'bool' },
  },
  modeles: {
    nom: 'iae_crm_modeles',
    requis: ['nom', 'objet', 'corps'],
    colonnes: { nom: T, usage: T, objet: T, corps: L, ordre: 'entier', canal: ['enum', ['email', 'sms']] },
  },
};

const REGLAGES_AUTORISES = ['signature', 'rappel_matin', 'lien_avis_google'];
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
    case 'adresse': {
      // Propriétaire ou setter d'un lead : une adresse de l'équipe.
      const a = String(v).trim().toLowerCase();
      if (a === '') return null;
      if (!/^[a-z0-9._-]+@ia-entrepreneur\.fr$/.test(a)) throw new Refus(`adresse_invalide:${cle}`);
      return a;
    }
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
  // Un membre de l'équipe ne lit et n'écrit que ses leads (api/_equipe.js) ; Gabriel n'a aucun filtre.
  ({ chemin, corps } = await garder(chemin, methode, corps));
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
  if (!estAdmin()) return Boolean(googleEquipeConfigure() && utilisateurCourant().google);
  return Boolean(process.env.GMAIL_IAE_CLIENT_ID && process.env.GMAIL_IAE_CLIENT_SECRET && process.env.GMAIL_IAE_REFRESH_TOKEN);
}

let jetonGmail = null;
let boiteVerifiee = false;

async function accesGmail() {
  if (!estAdmin()) return jetonGoogle(utilisateurCourant());
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
    if (String(profil.emailAddress || '').toLowerCase() !== compte()) {
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

// Les pièces jointes envoyées depuis le CRM : 5 au plus, 3,3 Mo en tout (une requête Vercel plafonne à 4,5 Mo, base64 compris).
const ENVOI_PIECES_MAX = 3.3 * 1024 * 1024;
function piecesAEnvoyer(liste) {
  if (liste == null || (Array.isArray(liste) && !liste.length)) return [];
  if (!Array.isArray(liste) || liste.length > 5) throw new Refus('trop_de_pieces');
  let total = 0;
  return liste.map((p) => {
    const nom = String(p?.nom || '').replace(/[\u0000-\u001f"\\/]+/g, ' ').trim().slice(0, 150);
    const type = /^[a-z]+\/[a-z0-9.+-]+$/i.test(p?.type || '') ? String(p.type).toLowerCase() : 'application/octet-stream';
    const b64 = String(p?.donnees || '');
    if (!nom || !b64 || !/^[A-Za-z0-9+/]+=*$/.test(b64)) throw new Refus('piece_invalide');
    const octets = Buffer.from(b64, 'base64');
    total += octets.length;
    if (!octets.length) throw new Refus('piece_invalide');
    if (total > ENVOI_PIECES_MAX) throw new Refus('pieces_trop_lourdes', 413);
    return { nom, type, octets };
  });
}
const en76 = (b64) => b64.replace(/.{76}/g, '$&\r\n');
// Nom de fichier dans un en-tête : un seul mot encodé (pas de pliage dans les guillemets), et la forme RFC 5987.
const motEncode = (t) => (/^[\x20-\x7e]*$/.test(t) ? t.replace(/"/g, '') : `=?UTF-8?B?${Buffer.from(t, 'utf8').toString('base64')}?=`);
const nomRfc5987 = (t) => encodeURIComponent(t).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
function messageBrut({ a, objet, corps, enReponseA, references, pieces = [] }) {
  const idMessage = `<crm-${randomBytes(12).toString('hex')}@ia-entrepreneur.fr>`;
  const lignes = [
    `From: ${expediteur()}`,
    `To: ${a}`,
    `Subject: ${entete(objet)}`,
    `Message-ID: ${idMessage}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
  ];
  if (enReponseA) lignes.push(`In-Reply-To: ${enReponseA}`, `References: ${references || enReponseA}`);
  const texte = en76(Buffer.from(corps.replace(/\r?\n/g, '\r\n'), 'utf8').toString('base64'));
  if (!pieces.length) {
    lignes.push('MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', texte);
  } else {
    const borne = `crm-${randomBytes(12).toString('hex')}`;
    lignes.push('MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${borne}"`, '', `--${borne}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', texte);
    for (const p of pieces) {
      lignes.push(`--${borne}`, `Content-Type: ${p.type}; name="${motEncode(p.nom)}"`, `Content-Disposition: attachment; filename="${motEncode(p.nom)}"; filename*=UTF-8''${nomRfc5987(p.nom)}`, 'Content-Transfer-Encoding: base64', '', en76(p.octets.toString('base64')));
    }
    lignes.push(`--${borne}--`, '');
  }
  return { brut: Buffer.from(lignes.join('\r\n'), 'utf8').toString('base64url'), idMessage };
}

async function envoyerGmail({ a, objet, corps, mode, fil, enReponseA, references, pieces }) {
  const jeton = await accesGmail();
  const { brut, idMessage } = messageBrut({ a, objet, corps, enReponseA, references, pieces });
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
  const { r } = await sb(`iae_crm_activites?select=id&type=eq.email_envoye&source=eq.crm&meta->>de=eq.${encodeURIComponent(compte())}&date=gte.${encodeURIComponent(debut)}`, {
    prefer: 'count=exact',
    plage: '0-0',
  });
  const total = Number((r.headers.get('content-range') || '').split('/')[1]);
  return Number.isFinite(total) ? total : 0;
}

/* ---------- Opérations ---------- */

async function lireTout() {
  const depuisLi = new Date(Date.now() - 45 * 86400000).toISOString();
  // Formateurs, pièces, programmes, LinkedIn, avis et évaluations : à Gabriel seulement.
  const admin = estAdmin();
  const rien = Promise.resolve([]);
  const rienSb = Promise.resolve({ lignes: [] });
  const depuisEmails = new Date(Date.now() - 60 * 86400000).toISOString();
  const [leads, contacts, activites, memos, modeles, reglages, { lignes: entrants }, { lignes: ecartes }, formateurs, documents, programmes, { lignes: linkedin }, { lignes: avis }, { lignes: demandesAvis }, evaluations, evalReponses, equipe, closersListe, { lignes: emails }, { lignes: emailsBilan }] = await Promise.all([
    toutLire('iae_crm_leads', 'entreprise.asc'),
    toutLire('iae_crm_contacts', 'principal.desc,created_at.asc'),
    toutLire('iae_crm_activites', 'date.desc'),
    toutLire('iae_crm_memos', 'categorie.asc,ordre.asc,titre.asc'),
    toutLire('iae_crm_modeles', 'ordre.asc,nom.asc'),
    toutLire('iae_crm_reglages', 'cle.asc'),
    // « À trier » : les emails de sa propre boîte (Gabriel ne trie pas celle de Dorian).
    sb(`iae_crm_entrants?select=*&statut=eq.a_trier&proprietaire=eq.${encodeURIComponent(compte())}&order=recu_le.desc&limit=100`),
    sb(`iae_crm_entrants?select=id,recu_le,canal,de_email,de_nom,objet,fil,meta&statut=eq.ignore&proprietaire=eq.${encodeURIComponent(compte())}&order=recu_le.desc&limit=60`),
    admin ? toutLire('iae_crm_formateurs', 'created_at.asc') : rien,
    !admin ? rien : sb('iae_crm_documents?select=id,created_at,lead_id,type,nom,chemin,mime,taille,depose_par,lecture,statut,motif,verifie_le,expire_le,archive&order=created_at.desc&limit=2000').then((x) => x.lignes),
    admin ? toutLire('iae_crm_programmes', 'created_at.desc') : rien,
    // LinkedIn : la file du compte de la personne connectée (Gabriel : la sienne ; un commercial : la sienne, filtrée aussi par garder).
    sb(`iae_crm_linkedin?${filtreCompteLi()}&or=(statut.in.(brouillon,a_envoyer,en_cours,echec,a_verifier),created_at.gte.${encodeURIComponent(depuisLi)})&order=created_at.desc&limit=500&select=id,created_at,lead_id,contact_id,type,etape,texte,statut,valide_le,envoye_le,detail`),
    !admin ? rienSb : sb('iae_crm_avis?order=created_at.desc&limit=300&select=*'),
    !admin ? rienSb : sb('iae_crm_avis_demandes?order=created_at.desc&limit=300&select=id,lead_id,created_at,expire_le'),
    admin ? toutLire('iae_crm_evaluations', 'created_at.desc') : rien,
    admin ? toutLire('iae_crm_evaluation_reponses', 'created_at.asc') : rien,
    equipePourPage(),
    closers(),
    // Prospection email (12/11/2026), à Gabriel seulement : ce qui attend, et ce qui est parti dans les 60 derniers jours ;
    // puis, pour le bilan depuis le début, toutes les lignes parties (sans leur texte).
    !admin ? rienSb : sb(`iae_crm_emails?or=(statut.in.(a_enrichir,a_rediger,brouillon,a_envoyer,en_cours,echec),created_at.gte.${encodeURIComponent(depuisEmails)})&order=created_at.desc&limit=1000&select=${COLONNES_EMAIL_PAGE}`),
    !admin ? rienSb : lignesBilanEmail().then((lignes) => ({ lignes })),
  ]);
  const moiPublic = utilisateurCourant();
  // L'ordre d'envoi des lignes en file (13/11), pour la page.
  if (admin && emails?.length) {
    const parId = new Map(leads.map((l) => [l.id, l]));
    for (const e of emails) if (e.statut === 'a_envoyer') e.priorite = prioriteEmail({ ...e, adresse: e.adresse ?? e.adresse_source }, parId.get(e.lead_id));
  }
  const prospectionEmailEtat = admin ? await etatProspectionEmail({ lignes: emailsBilan || [], recus: activites.filter((a) => a.type === 'email_recu') }).catch((e) => { console.error('crm email état', e?.code || e?.message); return null; }) : null;
  return {
    leads, contacts, activites, memos, modeles, entrants, ecartes, documents, programmes, linkedin: linkedin || [], avis: avis || [], demandes_avis: demandesAvis || [],
    evaluations, evaluation_reponses: evalReponses, emails: emails || [], prospection_email: prospectionEmailEtat,
    formateurs: formateurs.map(({ jeton_hash: _h, signature, ...f }) => ({ ...f, signature: signature ? { nom: signature.nom, lieu: signature.lieu, date: signature.date, version: signature.version, empreinte: signature.empreinte, ip: signature.ip } : null })),
    reglages: Object.fromEntries(reglages.filter((r) => !r.cle.endsWith('_cle')).map((r) => [cleReglageLue(r.cle), r.valeur])),
    gmail: gmailConfigure(),
    agenda: gmailConfigure(),
    ia: Boolean(process.env.ANTHROPIC_API_KEY),
    voix: Boolean(process.env.ELEVENLABS_API_KEY),
    expediteur: compte(),
    aujourdhui: aujourdHuiParis(),
    // Qui est connecté, l'équipe (tout pour Gabriel, les noms pour un membre) et à qui confier un lead.
    moi: { email: moiPublic.email, prenom: moiPublic.prenom, nom: moiPublic.nom, role: moiPublic.role, google: Boolean(moiPublic.google), robot_cle_le: moiPublic.robot_cle_le || null },
    // Le quota d'invitations LinkedIn du jour, celui que le serveur applique (la page ne le recalcule plus : 12/11, « 20 sur 10 »).
    quota_invitations_li: quotaInvitationsLi(aujourdHuiParis()),
    equipe, closers: closersListe, google_equipe: googleEquipeConfigure(),
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
  if (/^(avis|paiement|facture)_[a-z_]+$/.test(op || '')) return operationApresFormation(corps);
  if (/^evaluation_[a-z_]+$/.test(op || '')) return operationEvaluation(corps);
  // L'équipe : Gabriel crée les accès ; un membre connecte sa boîte Google.
  if (/^equipe_[a-z_]+$/.test(op || '')) return operationEquipe(corps);
  if (op === 'google_connexion') return urlConnexionGoogle();
  if (op === 'reglage') {
    if (!REGLAGES_AUTORISES.includes(corps.cle)) throw new Refus('reglage_inconnu');
    if (!estAdmin() && !REGLAGES_EQUIPE.has(corps.cle)) throw new Refus('reserve_admin', 403);
    if (corps.cle === 'lien_avis_google' && corps.valeur && !GOOGLE_AVIS_RE.test(String(corps.valeur).trim())) throw new Refus('lien_google_invalide');
    const valeur = convertir(corps.valeur ?? '', L, corps.cle) ?? '';
    const { lignes } = await sb('iae_crm_reglages?on_conflict=cle', {
      methode: 'POST',
      corps: { cle: cleReglage(corps.cle), valeur },
      prefer: 'resolution=merge-duplicates,return=representation',
    });
    return { reglage: { ...lignes[0], cle: cleReglageLue(lignes[0].cle) } };
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
  const references = enReponseA && typeof corps.references === 'string' && /^(<[^<>\s\r\n]{3,200}>\s*){1,20}$/.test(corps.references.trim()) ? corps.references.trim().replace(/\s+/g, ' ') : null;
  const pieces = piecesAEnvoyer(corps.pieces);
  const contactId = corps.contact_id && UUID_RE.test(corps.contact_id) ? corps.contact_id : null;
  const majLead = corps.lead ? nettoyer(corps.lead, 'leads', false) : null;

  if (mode === 'envoyer' && (await emailsEnvoyesAujourdhui()) >= MAX_EMAILS_JOUR) throw new Refus('trop_d_emails_aujourdhui', 429);

  const gmail = await envoyerGmail({ a, objet, corps: texte, mode, fil, enReponseA, references, pieces });

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
      meta: { ...gmail, a, objet, de: compte(), ...(pieces.length ? { pieces: pieces.map((p) => p.nom) } : {}) },
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
        { type: 'text', text: pourMoi(CONSIGNES_REDACTION) },
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
  const { lignes } = await sb(`iae_crm_reglages?select=valeur&cle=eq.${encodeURIComponent(cleReglage(cle))}`);
  return lignes[0] ? lignes[0].valeur : null;
}
async function ecrireReglage(cle, valeur) {
  await sb('iae_crm_reglages?on_conflict=cle', { methode: 'POST', corps: { cle: cleReglage(cle), valeur }, prefer: 'resolution=merge-duplicates,return=minimal' });
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
  const { lignes } = await sb(`iae_crm_contacts?select=id,lead_id,prenom,nom&email=ilike.${encodeURIComponent(email)}&order=principal.desc&limit=1`);
  return lignes[0] || null;
}
// Une même adresse peut appartenir à plusieurs fiches (Gabriel, 09/11 : Ludovic écrit de la même adresse pour
// l'appel d'offres de Confluence et pour leur travail commun chez LM Conseil). Le fil décide d'abord, puis le sujet.
async function contactsParEmail(email) {
  const { lignes } = await sb(`iae_crm_contacts?select=id,lead_id,prenom,nom&email=ilike.${encodeURIComponent(email)}&order=principal.desc&limit=10`);
  return lignes;
}
async function leadDuFil(fil) {
  if (!/^[0-9a-f]{6,32}$/i.test(fil || '')) return null;
  const { lignes } = await sb(`iae_crm_activites?select=lead_id,contact_id&meta->>fil=eq.${encodeURIComponent(fil)}&order=date.desc&limit=1`);
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

// Les vraies pièces jointes d'un message (pas les images de signature), avec ce qu'il faut pour les ouvrir.
// La partie (partId) sert d'identifiant : l'attachmentId de Gmail change d'une lecture à l'autre.
function fichiersJoints(p, out = []) {
  const dispo = String((p?.headers || []).find((x) => x.name.toLowerCase() === 'content-disposition')?.value || '');
  const signature = /^image\//i.test(p?.mimeType || '') && /^inline/i.test(dispo);
  const invitation = /^(text\/calendar|application\/ics)$/i.test(p?.mimeType || '') || /\.ics$/i.test(p?.filename || '');
  if (p?.filename && p.body?.attachmentId && !signature && !invitation && !/^(image\d*|\d+_\d+|outlook-\w+)\.(png|jpe?g|gif)$/i.test(p.filename)) {
    out.push({ nom: p.filename.slice(0, 200), type: String(p.mimeType || '').slice(0, 100), taille: Number(p.body.size) || 0, partie: String(p.partId || ''), att: p.body.attachmentId });
  }
  for (const q of p?.parts || []) fichiersJoints(q, out);
  return out.slice(0, 20);
}
function messagesDuFil(t) {
  return (t.messages || []).filter((m) => !(m.labelIds || []).includes('DRAFT')).map((m) => {
    const h = enTetes(m);
    const de = adresse(h.from);
    const brut = partieTexte(m.payload);
    return {
      id: m.id, date: new Date(Number(m.internalDate) || Date.now()).toISOString(), de: de.nom || de.email, email: de.email,
      moi: de.email === compte(), a: String(h.to || '').slice(0, 300), cc: String(h.cc || '').slice(0, 300), objet: String(h.subject || '').slice(0, 300),
      texte: (sansCitation(brut) || texteBrut(m.snippet)).slice(0, 5000), complet: propre(brut).slice(0, 15000), pieces: piecesJointes(m.payload),
      fichiers: fichiersJoints(m.payload).map(({ att: _a, ...f }) => f),
      message_id: /^<[^<>\s]{3,200}>$/.test(String(h['message-id'] || '').trim()) ? String(h['message-id']).trim() : null,
      references: String(h.references || '').slice(0, 2000),
    };
  });
}
async function lireFil(fil) {
  return messagesDuFil(await google(`${GMAIL}/threads/${encodeURIComponent(fil)}?format=full`));
}
// Un fil est lisible s'il est lié au CRM (historique ou « À trier »), ou échangé avec un contact du CRM.
async function filAutorise(fil, messages) {
  const [{ lignes: a }, { lignes: e }] = await Promise.all([
    sb(`iae_crm_activites?select=id&meta->>fil=eq.${fil}&limit=1`),
    sb(`iae_crm_entrants?select=id&fil=eq.${fil}&limit=1`),
  ]);
  if (a.length || e.length) return true;
  const adresses = new Set();
  for (const m of messages || []) {
    const h = enTetes(m);
    for (const x of [...listeAdresses(h.from), ...listeAdresses(h.to), ...listeAdresses(h.cc)]) if (x !== compte()) adresses.add(x.toLowerCase());
  }
  if (!adresses.size) return false;
  const { lignes } = await sb('iae_crm_contacts?select=email&email=not.is.null&limit=5000');
  return lignes.some((c) => adresses.has(String(c.email).toLowerCase()));
}
async function filDuCrm(fil) {
  if (!/^[0-9a-f]{6,32}$/i.test(fil || '')) throw new Refus('id_invalide');
  if (!gmailConfigure()) throw new Refus('gmail_non_configure', 503);
  const t = await google(`${GMAIL}/threads/${encodeURIComponent(fil)}?format=full`);
  if (!(await filAutorise(fil, t.messages))) throw new Refus('introuvable', 404);
  return { fil, messages: messagesDuFil(t) };
}

/* ---------- La boîte d'un lead : ses fils Gmail, comme dans Gmail ---------- */
// Gabriel, 07/11 : « que le CRM je puisse l'utiliser comme mes mails : voir l'historique des échanges, les PJ envoyées… »
// Tous les fils avec les adresses de ses contacts (recherche Gmail, sans limite de date), plus ceux que le CRM a liés.
async function boiteDuLead(leadId) {
  if (!UUID_RE.test(leadId || '')) throw new Refus('id_invalide');
  if (!gmailConfigure()) throw new Refus('gmail_non_configure', 503);
  const [{ lignes: [lead] }, { lignes: contacts }, { lignes: acts }] = await Promise.all([
    sb(`iae_crm_leads?id=eq.${leadId}&select=id,tache_fil`),
    sb(`iae_crm_contacts?lead_id=eq.${leadId}&select=email`),
    sb(`iae_crm_activites?lead_id=eq.${leadId}&select=meta&order=date.desc&limit=300`),
  ]);
  if (!lead) throw new Refus('introuvable', 404);
  const emails = [...new Set(contacts.map((c) => String(c.email || '').trim().toLowerCase()).filter((e) => EMAIL_RE.test(e)))].slice(0, 12);
  const fils = new Map();
  const avecPj = new Set();
  if (emails.length) {
    const q = `{${emails.map((e) => `from:${e} to:${e} cc:${e}`).join(' ')}}`;
    const [tous, pj] = await Promise.all([
      google(`${GMAIL}/threads?maxResults=30&q=${encodeURIComponent(q)}`),
      google(`${GMAIL}/threads?maxResults=30&q=${encodeURIComponent(`${q} has:attachment`)}`),
    ]);
    for (const t of tous.threads || []) if (/^[0-9a-f]{6,32}$/i.test(t.id)) fils.set(t.id, true);
    for (const t of pj.threads || []) avecPj.add(t.id);
  }
  for (const a of acts) {
    const f = a.meta?.fil;
    if (/^[0-9a-f]{6,32}$/i.test(f || '') && fils.size < 40) fils.set(f, true);
  }
  // Un fil rangé sur une autre fiche (même personne, autre dossier) n'apparaît pas ici.
  if (fils.size) {
    const { lignes: ranges } = await sb(`iae_crm_activites?select=lead_id,meta&meta->>fil=in.(${[...fils.keys()].join(',')})&limit=2000`);
    const ici = new Set(ranges.filter((x) => x.lead_id === leadId).map((x) => x.meta.fil));
    for (const x of ranges) if (x.lead_id !== leadId && !ici.has(x.meta.fil)) fils.delete(x.meta.fil);
  }
  const lus = await Promise.all([...fils.keys()].map(async (fil) => {
    // Les fils que Gmail dit « avec pièce jointe » sont lus en entier, pour écarter signatures et invitations d'agenda.
    let t;
    try {
      t = await google(`${GMAIL}/threads/${fil}?${avecPj.has(fil) ? 'format=full' : 'format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc'}`);
    } catch {
      return null;
    }
    const ms = (t.messages || []).filter((m) => !(m.labelIds || []).includes('DRAFT'));
    if (!ms.length) return null;
    const dernier = ms[ms.length - 1];
    const h = enTetes(dernier);
    const de = adresse(h.from);
    const avec = new Set();
    for (const m of ms) {
      const x = enTetes(m);
      for (const ad of [...listeAdresses(x.from), ...listeAdresses(x.to), ...listeAdresses(x.cc)]) if (ad !== compte()) avec.add(ad);
    }
    return {
      fil, objet: String(enTetes(ms[0]).subject || h.subject || '').slice(0, 300), dernier: new Date(Number(dernier.internalDate) || Date.now()).toISOString(), n: ms.length,
      extrait: texteBrut(dernier.snippet).slice(0, 220), dernier_moi: de.email === compte(), dernier_de: de.nom || de.email,
      avec: [...avec].slice(0, 6), pj: avecPj.has(fil) && ms.some((m) => fichiersJoints(m.payload).length > 0),
      non_lu: ms.some((m) => (m.labelIds || []).includes('UNREAD')), tache: fil === lead.tache_fil,
    };
  }));
  return { fils: lus.filter(Boolean).sort((x, y) => (x.dernier < y.dernier ? 1 : -1)), emails };
}

// Une pièce jointe d'un fil autorisé. Les PDF et images s'ouvrent ; le reste se télécharge.
const PIECE_LECTURE_MAX = 4 * 1024 * 1024; // une réponse Vercel plafonne à 4,5 Mo
const TYPES_OUVRABLES = /^(application\/pdf|image\/(png|jpeg|gif|webp))$/i;
async function envoyerPieceGmail(res, params) {
  const fil = params.get('fil');
  const message = params.get('message');
  const partie = params.get('piece');
  if (!/^[0-9a-f]{6,32}$/i.test(fil || '') || !/^[0-9a-f]{6,32}$/i.test(message || '') || !/^[0-9.]{1,20}$/.test(partie || '')) throw new Refus('id_invalide');
  if (!gmailConfigure()) throw new Refus('gmail_non_configure', 503);
  const m = await google(`${GMAIL}/messages/${message}?format=full`);
  if (m.threadId !== fil || !(await filAutorise(fil, [m]))) throw new Refus('introuvable', 404);
  const p = fichiersJoints(m.payload).find((x) => x.partie === partie);
  if (!p) throw new Refus('introuvable', 404);
  if (p.taille > PIECE_LECTURE_MAX) throw new Refus('piece_trop_lourde', 413);
  const d = await google(`${GMAIL}/messages/${message}/attachments/${encodeURIComponent(p.att)}`);
  const octets = Buffer.from(String(d.data || ''), 'base64url');
  const ouvrable = TYPES_OUVRABLES.test(p.type);
  res.setHeader('Content-Type', ouvrable ? p.type.toLowerCase() : 'application/octet-stream');
  res.setHeader('Content-Disposition', `${ouvrable ? 'inline' : 'attachment'}; filename*=UTF-8''${nomRfc5987(p.nom)}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).send(octets);
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
// n jours ouvrés après un jour (jeudi 12/11 + 3 → mardi 17/11).
function apresJoursOuvres(n, depuis) { let d = depuis; for (let k = 0; k < n;) { d = ajouterJoursIso(d, 1); if (estOuvreIso(d)) k++; } return d; }
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
          rdv_date: { type: 'string', description: 'AAAA-MM-JJ du rendez-vous validé, ou vide' },
          rdv_heure: { type: 'string', description: 'HH:MM, ou vide' },
          rdv_detail: { type: 'string' },
          paiement: { type: 'string', description: 'si l\'email annonce un paiement fait ou programmé : une phrase avec la date et le montant si donnés ; vide sinon' },
          tache: { type: 'string' },
          resume: { type: 'string' },
          raison: { type: 'string' },
          type: { type: 'string', enum: ['prospect', 'client', 'partenaire', 'fournisseur', 'formateur'] },
          entreprise: { type: 'string' },
          prenom: { type: 'string' },
          nom: { type: 'string' },
        },
        required: ['ref', 'action', 'lead_id', 'interet', 'a_faire', 'relance_date', 'rdv_date', 'rdv_heure', 'rdv_detail', 'paiement', 'tache', 'resume', 'raison', 'type', 'entreprise', 'prenom', 'nom'],
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

rdv_date, rdv_heure, rdv_detail : seulement quand l'email fixe un rendez-vous accepté des deux côtés : la personne accepte un créneau proposé par Gabriel, ou confirme un rendez-vous (« OK pour jeudi 14 h », « je vous confirme notre rendez-vous du 12 à 10 h »). Pas pour une simple proposition de créneaux qui attend la réponse de Gabriel : là, a_faire = repondre et les trois restent vides. rdv_date en AAAA-MM-JJ, en résolvant « jeudi » ou « demain » d'après la date de réception de l'email ; rdv_heure en HH:MM, vide si l'heure n'est pas dite ; rdv_detail en quelques mots : le format et l'objet (« visio avec son directeur », « au cabinet à Nancy »). Un rendez-vous validé n'appelle pas de réponse (a_faire = rien), sauf si l'email demande aussi quelque chose (un lien, un document) : a_faire = repondre.

paiement : seulement si l'email dit qu'un paiement a été fait ou est programmé (« virement effectué ce jour », « le règlement part en fin de mois », avis de paiement d'un OPCO ou de l'AGEFICE) : une phrase avec la date et le montant s'ils sont donnés (« Virement de 1 800 € annoncé le 12/11 »). Vide sinon, et vide pour une simple question sur une facture.

tache : si a_faire n'est pas rien, une phrase à l'infinitif, adressée à Gabriel, qui dit exactement quoi faire avec les détails utiles (quoi, pour qui, chiffres, dates). Par exemple « Envoyer à Sarah tes tarifs et un plan de cours niveau 2 pour sa cliente (1 personne, Supply Chain, 1er semestre 2027) ». Jamais seulement « Répondre à l'email ».
resume : une phrase qui dit ce que contient l'email, avec les faits.
raison : pourquoi cette décision, en quelques mots (« élève, rendu de TD », « même domaine que Jean Piron, il répondra lundi »).
type : la nature de la relation (prospect, client, partenaire, fournisseur, formateur), même pour un email rattaché ou ignoré.

En français. N'invente rien : seulement ce qui est dans l'email et dans la liste.`;

const resumeAnalyse = (d) => ({
  action: d.action, lead_id: d.lead_id || '', interet: d.interet, a_faire: d.a_faire, relance_date: d.relance_date || '',
  rdv_date: d.rdv_date || '', rdv_heure: d.rdv_heure || '', rdv_detail: couper(d.rdv_detail || '', 200), paiement: couper(d.paiement || '', 300), tache: couper(d.tache, 600),
  resume: couper(d.resume, 600), raison: couper(d.raison, 300), type: d.type || '', entreprise: couper(d.entreprise, 160), prenom: couper(d.prenom, 80), nom: couper(d.nom, 80), le: new Date().toISOString(),
});

async function analyserEmails(items, ann) {
  const decisions = new Map();
  if (!process.env.ANTHROPIC_API_KEY || !items.length) return decisions;
  const jourSemaine = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long' }).format(new Date());
  const lignesLeads = ann.leads.map((l) => [l.id, l.entreprise, `${l.type}, ${l.statut}${l.archive ? ', archivé' : ''}`,
    (ann.parLead.get(l.id) || []).map((c) => `${nomDe(c) || '?'}${c.email ? ` <${c.email}>` : ''}`).join(' ; '),
    [l.besoin ? `sujet : ${couper(l.besoin, 120)}` : '', l.prochaine_note ? couper(l.prochaine_note, 140) : ''].filter(Boolean).join(' ; ')].join(' | ')).join('\n');
  const client = new Anthropic({ timeout: 40000, maxRetries: 1 });
  for (let i = 0; i < items.length; i += 10) {
    const paquet = items.slice(i, i + 10);
    const emails = paquet.map((r) => [
      `--- ref : ${r.ref}`,
      `De : ${r.de.nom ? `${r.de.nom} ` : ''}<${r.de.email}>`,
      `Reçu le : ${new Date(r.quand).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
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
        system: [{ type: 'text', text: pourMoi(CONSIGNES_TRI), cache_control: { type: 'ephemeral' } }],
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
    return adresse(enTetes(dernier || {}).from).email === compte();
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
/* ---------- Les rendez-vous validés par email ---------- */
// Gabriel, 07/11 : « si dans un email on détecte une date de rdv validé, mettre la relance au moment-là ».
// Le RDV entre dans l'historique (type rdv, meta.date_rdv, comme ceux de l'agenda) et devient la tâche du jour J.
const HEURE_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
function rdvValide(x) {
  if (!x || !DATE_RE.test(x.rdv_date || '') || x.rdv_date < aujourdHuiParis()) return null;
  const h = HEURE_RE.exec(x.rdv_heure || '');
  return { date: x.rdv_date, heure: h ? `${Number(h[1])} h${h[2] === '00' ? '' : ` ${h[2]}`}` : '', detail: couper(String(x.rdv_detail || '').trim(), 200) };
}
const texteRdv = (rdv) => `RDV le ${dateCourte(rdv.date)}${rdv.heure ? ` à ${rdv.heure}` : ''}${rdv.detail ? ` (${rdv.detail})` : ''}`;
const AGENDA_SI_BESOIN = "Ajoute-le à ton agenda s'il n'y est pas encore.";
async function noterRdv(leadId, contactId, rdv, origine, { fil, objet }) {
  const { lignes } = await sb(`iae_crm_activites?select=id&lead_id=eq.${leadId}&type=eq.rdv&meta->>date_rdv=eq.${rdv.date}&limit=1`);
  if (lignes.length) return;
  await sb('iae_crm_activites', {
    methode: 'POST', prefer: 'return=minimal',
    corps: { lead_id: leadId, contact_id: contactId || null, type: 'rdv', resume: `${texteRdv(rdv)}, ${origine}`.slice(0, 2000), source: 'gmail iae', meta: { date_rdv: rdv.date, heure: rdv.heure || null, fil: fil || null, objet: objet || null, origine: 'email' } },
  });
}
// Le prochain RDV connu du lead (email ou agenda), pour la tâche qui suit une réponse.
async function prochainRdv(leadId) {
  const { lignes } = await sb(`iae_crm_activites?select=resume,meta&lead_id=eq.${leadId}&type=eq.rdv&order=date.desc&limit=20`);
  const auj = aujourdHuiParis();
  const a = lignes.filter((x) => DATE_RE.test(x.meta?.date_rdv || '') && x.meta.date_rdv >= auj).sort((x, y) => x.meta.date_rdv.localeCompare(y.meta.date_rdv))[0];
  return a ? { date: a.meta.date_rdv, heure: a.meta.heure || '', resume: a.resume } : null;
}
const tacheRdv = (rdv, note) => ({ prochaine_relance: rdv.date, prochaine_action: 'rdv', prochaine_note: note.slice(0, 2000), relances_sans_reponse: 0, tache_fil: null });

// Une réponse automatique d'absence (Gabriel, 13/11) : sans l'en-tête Auto-Submitted, elle comptait comme une vraie réponse
// (arrêt croisé, compteurs remis à zéro, plus d'envoi). Il faut un mot d'absence clair, dans l'objet ou au début du corps :
// « je suis actuellement intéressé » n'en est pas une, « je reviens vers vous après mes congés » non plus. Une date de
// retour lisible (« de retour le 24/11 », « jusqu'au 24 novembre ») décale la relance : retour + 2 jours ouvrés.
const OBJET_ABSENCE_RE = /\b(r[ée]ponse automatique|message automatique|automatic reply|auto[- ]?reply|autoreply|out of (the )?office|absente?s?|absence|en cong[ée]s?|cong[ée]s|en vacances|hors du bureau)\b/i;
const CORPS_ABSENCE_RE = /\b(?:(?:je suis|nous sommes|suis|serai|serons)\s+(?:actuellement\s+|momentan[ée]ment\s+)?(?:absente?s?|en cong[ée]s?|en vacances|hors du bureau|en arr[êe]t)|absente?s? (?:du bureau|jusqu|du \d|à partir|pour)|en cong[ée]s? (?:jusqu|du \d|à partir|annuels?)|r[ée]ponse automatique|message automatique|out of (?:the )?office|automatic reply|i am (?:currently )?(?:out|away)|i'?m (?:currently )?(?:out|away)|on (?:annual )?leave)\b/i;
const MOIS_ABSENCE = { janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12 };
function dateDeRetour(texte, jour = aujourdHuiParis()) {
  const t = String(texte || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
  const intro = "(?:de retour(?: au bureau)?(?: le| a partir du| des le)?|retour(?: prevu)? le|reviendrai le|reprise le|(?:a nouveau |de nouveau )?disponible (?:le|a partir du|des le)|jusqu'(?:au|a)(?: et y compris)?(?: le)?|du \\d{1,2}(?:er)?(?: [a-z]+|[/.]\\d{1,2})? au|until|back on|returning on)";
  const re = new RegExp(`${intro} (?:(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday) )?(\\d{1,2})(?:er)?(?: ([a-z]+)|[/.](\\d{1,2}))(?:[/. ](\\d{4}|\\d{2})\\b)?`);
  const m = t.match(re);
  if (!m) return null;
  const j = Number(m[1]);
  const mois = m[3] ? Number(m[3]) : MOIS_ABSENCE[m[2]];
  if (!mois || mois > 12 || j < 1 || j > 31) return null;
  let an = m[4] ? Number(m[4].length === 2 ? `20${m[4]}` : m[4]) : Number(jour.slice(0, 4));
  const iso = (a) => `${a}-${String(mois).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
  if (!m[4] && iso(an) < ajouterJoursIso(jour, -7)) an += 1;
  const d = iso(an);
  if (!DATE_RE.test(d) || Number.isNaN(Date.parse(`${d}T12:00:00Z`)) || new Date(`${d}T12:00:00Z`).getUTCDate() !== j) return null;
  // Une date passée (vieux message d'absence) ou à plus de 6 mois : rien.
  return d >= jour && d <= ajouterJoursIso(jour, 183) ? d : null;
}
function absenceAuto(r) {
  const objet = String(r.objet || '');
  const debut = String(r.texte || '').replace(/\s+/g, ' ').slice(0, 500);
  const parObjet = OBJET_ABSENCE_RE.test(objet);
  const parCorps = CORPS_ABSENCE_RE.test(debut) && !/int[ée]ress/i.test(debut);
  if (!parObjet && !parCorps) return null;
  return { retour: dateDeRetour(`${objet} ${debut}`) };
}
// L'absence va dans l'historique (une note, pas un email reçu : le filet d'envoi et le bilan ne la prennent pas pour une
// réponse), rien ne s'arrête, aucun compteur ne bouge ; avec une date de retour, la relance prévue est décalée.
async function noterAbsenceEmail(r, leadId, contact, absence, lead) {
  const qui = r.de.nom || r.de.email;
  const relance = absence.retour ? apresJoursOuvres(2, absence.retour) : null;
  await sb('iae_crm_activites', {
    methode: 'POST', prefer: 'return=minimal',
    corps: {
      lead_id: leadId, contact_id: contact?.id || null, date: r.quand, type: 'note',
      resume: `Réponse automatique d'absence de ${qui} (« ${r.objet} »)${absence.retour ? ` : de retour le ${dateCourte(absence.retour)}, relance à partir du ${dateCourte(relance)}` : ''}. Ce n'est pas une réponse : la prospection continue.`.slice(0, 2000),
      contenu: String(r.texte || '').slice(0, 4000) || null, source: 'gmail iae',
      meta: { gmail_id: r.gmailId, fil: r.fil, objet: r.objet, absence: true, retour: absence.retour, canal: 'email' },
    },
  });
  if (!relance) return;
  const maj = { prochaine_relance: relance };
  if (/^Email :/.test(lead?.prochaine_note || '')) maj.prochaine_note = `Email : ${qui} est absent (réponse automatique), de retour le ${dateCourte(absence.retour)} : relance à partir du ${dateCourte(relance)}.`;
  await sb(`iae_crm_leads?id=eq.${leadId}`, { methode: 'PATCH', prefer: 'return=minimal', corps: maj });
  if (lead) Object.assign(lead, maj);
  await avecUtilisateur(ADMIN, () => decalerSequenceEmail(leadId, relance)).catch((x) => console.error('crm absence séquence', x?.code || x?.message));
}

// Une absence décale la relance prévue (13/11) : la relance de la séquence déjà préparée ne part pas avant cette date, et
// celle qui ne l'est pas encore sera prévue au plus tôt ce jour-là.
async function decalerSequenceEmail(leadId, jour) {
  if (!UUID_RE.test(leadId || '') || !DATE_RE.test(jour || '')) return;
  const { lignes } = await sb(`iae_crm_emails?lead_id=eq.${leadId}&select=id,etape,statut,faits`);
  for (const e of lignes) {
    const f = e.faits || {};
    if (e.etape !== 'message' && EN_ATTENTE_EMAIL.includes(e.statut) && f.sequence) {
      if ((f.sequence.prevue_le || '') < jour) await majLigneEmail(e.id, { faits: { ...f, sequence: { ...f.sequence, prevue_le: jour, decalee: 'absence' } } });
    } else if (e.statut === 'envoye' && !f.suite && (f.decale_au || '') < jour) await majLigneEmail(e.id, { faits: { ...f, decale_au: jour } });
  }
}

async function rattacherEmail(r, d, leadId, ann) {
  const lead = ann.lead(leadId);
  const contact = r.contact?.id ? r.contact : await contactPourLead(ann, leadId, r.de, d || {});
  // Gabriel, 13/11 : une absence n'est pas une réponse (ni arrêt croisé, ni remise à zéro).
  const absence = absenceAuto(r);
  if (absence) return noterAbsenceEmail(r, leadId, contact, absence, lead);
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
  const rdv = rdvValide(d);
  if (rdv) await noterRdv(leadId, contact?.id, rdv, `confirmé par ${qui} (« ${r.objet} »)`, { fil: r.fil, objet: r.objet });
  // Un paiement annoncé : le bloc Paiements demande à Gabriel de le vérifier sur son compte.
  if (d?.paiement && String(d.paiement).trim()) maj.paiement_annonce = `${couper(String(d.paiement).trim(), 280)} (email de ${qui} du ${dateCourte(jour)})`;
  if (aFaire === 'repondre') {
    Object.assign(maj, { prochaine_relance: aujourdHuiParis(), prochaine_action: 'email', prochaine_note: `${d?.tache || `Répondre à ${qui} : « ${r.objet} »`}${rdv ? ` Puis ${texteRdv(rdv)}.` : ''}`.slice(0, 2000), tache_fil: r.fil || null });
  } else if (rdv) {
    Object.assign(maj, tacheRdv(rdv, `${texteRdv(rdv)}, confirmé par ${qui} (« ${r.objet} »). ${AGENDA_SI_BESOIN}`));
  } else if (aFaire === 'relancer_le' && DATE_RE.test(d?.relance_date || '') && d.relance_date >= aujourdHuiParis()) {
    Object.assign(maj, { prochaine_relance: estOuvreIso(d.relance_date) ? d.relance_date : dansJoursOuvres(0, d.relance_date), prochaine_action: lead?.prochaine_action || 'email', prochaine_note: (d.tache || d.resume || `Retour prévu de ${qui}`).slice(0, 2000), tache_fil: r.fil || null });
  }
  await sb(`iae_crm_leads?id=eq.${leadId}`, { methode: 'PATCH', prefer: 'return=minimal', corps: maj });
  if (lead) Object.assign(lead, maj);
  await apresReponseProspect(leadId, contact, r);
}

// Un prospect a répondu par email (12/11/2026) : tout ce qui attend sur son lead s'arrête, email et LinkedIn (un canal
// répond, l'autre s'arrête). Une réponse « stop » ou « désinscription » à un email de prospection vaut opposition.
const DESINSCRIPTION_RE = /^\s*(re\s*:\s*)?d[ée]sinscription\s*$/i;
async function apresReponseProspect(leadId, contact, r) {
  // Une réponse automatique (« absent du bureau », en-tête Auto-Submitted) n'est pas une réponse : rien ne s'arrête.
  if (/^auto-(replied|generated)/i.test(String(r.h?.['auto-submitted'] || ''))) return;
  try {
    // LinkedIn s'arrête aussi pour un prospect ; un client ou un partenaire qui écrit garde ce que Gabriel lui a préparé.
    const { lignes: [l] } = await avecUtilisateur(ADMIN, () => sb(`iae_crm_leads?id=eq.${leadId}&select=type,statut`));
    const prospect = Boolean(l) && l.type === 'prospect' && ['nouveau', 'contacte'].includes(l.statut);
    const arret = await arreterEnvoisEnAttente(leadId, `${r.de.nom || r.de.email} a répondu par email le ${dateCourte(jourParis(r.quand))} : la prospection s'arrête.`, { linkedin: prospect });
    if (arret.emails || arret.linkedin) {
      await avecUtilisateur(ADMIN, () => sb('iae_crm_activites', { methode: 'POST', prefer: 'return=minimal', corps: { lead_id: leadId, contact_id: contact?.id || null, type: 'note', resume: `Réponse reçue : ${[arret.emails && `${arret.emails} email${arret.emails > 1 ? 's' : ''}`, arret.linkedin && `${arret.linkedin} message${arret.linkedin > 1 ? 's' : ''} LinkedIn`].filter(Boolean).join(' et ')} en attente annulé${arret.emails + arret.linkedin > 1 ? 's' : ''} (un canal répond, l'autre s'arrête).`, source: 'crm, prospection email', meta: { canal: 'email', etape: 'arret_croise' } } }));
    }
    const stop = DESINSCRIPTION_RE.test(r.objet || '') || /^\s*(stop|d[ée]sinscri\w*)\W{0,3}$/i.test(r.texte || '');
    if (stop) {
      const { lignes } = await avecUtilisateur(ADMIN, () => sb(`iae_crm_emails?email=eq.${encodeURIComponent(r.de.email)}&statut=eq.envoye&select=id,lead_id,contact_id,email,evenements&limit=1`));
      if (lignes.length) await enregistrerOpposition(r.de.email, 'réponse « stop » ou désinscription par email', { ligne: lignes[0] });
    }
  } catch (e) {
    console.error('crm arrêt croisé', e?.code || e?.message);
  }
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
    (await sb(`iae_crm_entrants?select=ref_externe&proprietaire=eq.${encodeURIComponent(compte())}&ref_externe=in.(${ids.join(',')})`)).lignes.forEach((x) => deja.add(x.ref_externe));
    (await sb(`iae_crm_activites?select=meta&meta->>gmail_id=in.(${ids.join(',')})`)).lignes.forEach((x) => deja.add(x.meta.gmail_id));
    for (const id of ids.filter((x) => !deja.has(x))) {
      const r = await lireRecu(id);
      // Newsletters, robots, équipe : jamais dans le CRM.
      if (!r.de.email || interne(r.de.email) || EXPEDITEURS_AUTOMATIQUES.test(r.de.email) || r.h['list-unsubscribe']) continue;
      if (ignores.has(r.de.email) || ignores.has(r.de.email.split('@')[1])) continue;
      let contact = null;
      let candidats = null;
      const duFil = await leadDuFil(r.fil);
      const parAdresse = await contactsParEmail(r.de.email);
      // L'expéditeur n'est pas encore un contact de cette fiche : id vide, il y sera ajouté (et non confondu avec un autre).
      if (duFil) contact = { lead_id: duFil.lead_id, id: parAdresse.find((x) => x.lead_id === duFil.lead_id)?.id || null };
      else if (new Set(parAdresse.map((x) => x.lead_id)).size === 1) contact = parAdresse[0];
      else if (parAdresse.length) candidats = [...new Map(parAdresse.map((x) => [x.lead_id, { lead_id: x.lead_id, raison: `même adresse, ${nomDe(x) || 'ce contact'} a plusieurs dossiers : choisis celui dont parle l'email` }])).values()];
      items.push({ ...r, ref: id, gmailId: id, contact, dernierDeMoi: await dernierMessageDeMoi(r.fil), candidats: contact ? [] : candidats || candidatsPour(ann, r.de) });
    }
  }
  // Du plus ancien au plus récent : la tâche qui reste est celle du dernier message.
  items.sort((a, b) => a.quand.localeCompare(b.quand));
  // Rattrapage : les « À trier » jamais analysés, quelques-uns à chaque passage.
  const { lignes: enAttente } = await sb(`iae_crm_entrants?select=*&statut=eq.a_trier&proprietaire=eq.${encodeURIComponent(compte())}&meta->analyse=is.null&order=recu_le.asc&limit=10`);
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
    await sb('iae_crm_entrants?on_conflict=proprietaire,ref_externe', {
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
// Un email envoyé règle-t-il la tâche du lead ? Si la tâche vient du fil de cet email, oui. Sinon (tâche écrite à la main,
// décalée, étape du suivi client…), Claude compare la tâche et l'email. Gabriel, 07/11 : « j'ai répondu à Sarah et
// Anne-Marie, comment ça se fait que le CRM voit toujours ces relances ? ne serait-il pas possible qu'il le détecte ? »
const SCHEMA_TACHE_FAITE = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tache: { type: 'string', enum: ['faite', 'en_partie', 'sans_rapport'] },
    reste: { type: 'string' },
    attente: { type: 'string' },
    rdv_date: { type: 'string', description: 'AAAA-MM-JJ du rendez-vous validé, ou vide' },
    rdv_heure: { type: 'string', description: 'HH:MM, ou vide' },
    rdv_detail: { type: 'string' },
    facture: { type: 'boolean', description: "vrai si l'email envoie une facture au client" },
    facture_echeance: { type: 'string', description: 'AAAA-MM-JJ, date limite de paiement si l\'email la donne, ou vide' },
  },
  required: ['tache', 'reste', 'attente', 'rdv_date', 'rdv_heure', 'rdv_detail', 'facture', 'facture_echeance'],
};
const CONSIGNES_TACHE_FAITE = `Tu tiens le CRM de Gabriel Vanderbecken (IA-Entrepreneur, formations à l'IA pour les entreprises). On te donne la tâche prévue sur une fiche, c'est-à-dire ce que Gabriel devait faire, et un email qu'il vient d'envoyer à un contact de cette fiche. Dis si cet email fait la tâche (sans_rapport s'il n'y a pas de tâche prévue), s'il valide un rendez-vous, et s'il envoie une facture.
facture : vrai si l'email envoie une facture au client (une pièce jointe qui est une facture, ou « vous trouverez la facture en pièce jointe »). Faux pour un devis, une proposition, une convention ou un simple rappel de paiement. facture_echeance : la date limite de paiement si l'email la donne (« à régler sous 30 jours », « avant le 15/12 »), en AAAA-MM-JJ calculée depuis la date d'envoi ; vide sinon.
- faite : l'email fait tout ce que la tâche demande. Une pièce jointe annoncée dans l'email (« vous trouverez la facture en pièce jointe ») compte comme envoyée.
- en_partie : l'email fait une partie de la tâche seulement.
- sans_rapport : l'email parle d'autre chose, ou il ne fait rien de ce que la tâche demande.
reste : pour en_partie seulement, ce qui manque, en une phrase qui commence par un verbe à l'infinitif (« Envoyer la facture de la mission de Gilles. »). Vide sinon.
attente : ce que Gabriel attend maintenant du destinataire, en une phrase courte (« Sarah doit dire où se trouve sa cliente. »). Vide s'il n'attend rien.
rdv_date, rdv_heure, rdv_detail : seulement si l'email fixe un rendez-vous accepté des deux côtés : Gabriel accepte un créneau que le contact a proposé, ou confirme un rendez-vous déjà convenu (« OK pour jeudi 14 h », « je vous confirme notre visio du 12 à 10 h »). Pas quand Gabriel propose des créneaux sans réponse encore. rdv_date en AAAA-MM-JJ, en résolvant « jeudi » ou « demain » d'après la date d'envoi de l'email ; rdv_heure en HH:MM, vide si l'heure n'est pas dite ; rdv_detail en quelques mots : le format et l'objet (« visio avec son directeur »). Sinon les trois sont vides.
Écris en français. N'invente rien qui ne soit pas dans la tâche ou dans l'email.`;
async function jugerEnvoi(lead, { objet, texte, dest, quand, pieces = [] }) {
  if (!process.env.ANTHROPIC_API_KEY || !texte) return null;
  const tache = lead.prochaine_note ? `Tâche prévue (${lead.prochaine_action || 'autre'}${lead.prochaine_relance ? `, pour le ${dateCourte(lead.prochaine_relance)}` : ''}) : ${lead.prochaine_note}` : 'Tâche prévue : aucune.';
  const envoi = new Date(quand).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  try {
    const r = await appelClaude({
      consignes: CONSIGNES_TACHE_FAITE,
      schema: SCHEMA_TACHE_FAITE,
      max: 1500,
      timeout: 30000,
      contenu: `Fiche : ${lead.entreprise}\n${tache}\n\nEmail envoyé le ${envoi} à ${dest.join(', ')}, objet « ${objet} »${pieces.length ? `, pièces jointes : ${pieces.join(', ')}` : ''} :\n${texte.slice(0, 6000)}`,
    });
    return ['faite', 'en_partie', 'sans_rapport'].includes(r?.tache) ? r : null;
  } catch (e) {
    console.error('crm tache faite', e.code || e.message);
    return null;
  }
}
const SUITE_TACHE = { faite: ' · tâche faite', en_partie: ' · tâche faite en partie' };

async function synchroEnvoyes(depuis, ann) {
  const liste = await google(`${GMAIL}/messages?maxResults=30&q=${encodeURIComponent(`in:sent after:${depuis}`)}`);
  const ids = (liste.messages || []).map((m) => m.id).filter((id) => /^[0-9a-f]+$/i.test(id));
  if (!ids.length) return 0;
  const deja = new Set((await sb(`iae_crm_activites?select=meta&meta->>gmail_id=in.(${ids.join(',')})`)).lignes.map((x) => x.meta.gmail_id));
  const parEmail = new Map();
  for (const c of ann.contacts.filter((x) => x.email)) {
    const e = c.email.toLowerCase();
    if (!parEmail.has(e)) parEmail.set(e, []);
    parEmail.get(e).push(c);
  }
  const messages = [];
  for (const id of ids.filter((x) => !deja.has(x))) {
    const m = await google(`${GMAIL}/messages/${id}?format=full`);
    if (!(m.labelIds || []).includes('DRAFT')) messages.push(m);
  }
  // Dans l'ordre d'envoi : deux réponses du même jour règlent la tâche l'une après l'autre.
  messages.sort((a, b) => Number(a.internalDate || 0) - Number(b.internalDate || 0));
  let n = 0;
  for (const m of messages) {
    const id = m.id;
    const h = enTetes(m);
    const dest = [...listeAdresses(h.to), ...listeAdresses(h.cc)];
    const connus = dest.flatMap((e) => parEmail.get(e) || []);
    const objet = String(h.subject || '(sans objet)').slice(0, 300);
    const quand = new Date(Number(m.internalDate) || Date.now()).toISOString();
    const jour = jourParis(quand);
    const texte = sansCitation(partieTexte(m.payload)).slice(0, 8000);
    let leadId = (await leadDuFil(m.threadId))?.lead_id || null;
    let jugement;
    if (!leadId) {
      const fiches = [...new Set(connus.map((x) => x.lead_id))].filter((x) => ann.ids.has(x));
      if (fiches.length === 1) leadId = fiches[0];
      else if (fiches.length > 1) {
        // Nouveau fil vers une adresse qui a plusieurs dossiers : la fiche dont l'email fait la tâche, sinon la plus active.
        for (const x of fiches.slice(0, 3)) {
          const j = await jugerEnvoi(ann.lead(x), { objet, texte, dest, quand, pieces: piecesJointes(m.payload) });
          if (j && (j.tache === 'faite' || j.tache === 'en_partie')) { leadId = x; jugement = j; break; }
        }
        if (!leadId) leadId = fiches.slice().sort((a, b) => String(ann.lead(b).dernier_contact || '').localeCompare(String(ann.lead(a).dernier_contact || '')))[0];
      }
    }
    if (!leadId || !ann.ids.has(leadId)) continue;
    const c = connus.find((x) => x.lead_id === leadId) || null;
    const lead = ann.lead(leadId);
    const maj = {};
    if (!lead.dernier_contact || lead.dernier_contact < jour) maj.dernier_contact = jour;
    const r = jugement || (await jugerEnvoi(lead, { objet, texte, dest, quand, pieces: piecesJointes(m.payload) }));
    const rdv = rdvValide(r);
    const confirme = `confirmé dans ton email du ${dateCourte(jour)} (« ${objet} »)`;
    if (rdv) await noterRdv(leadId, c?.id, rdv, confirme, { fil: m.threadId, objet });
    const avaitTache = Boolean(lead.prochaine_note || lead.prochaine_relance);
    let verdict = lead.tache_fil && lead.tache_fil === m.threadId ? 'faite' : avaitTache ? (r?.tache || null) : null;
    const attente = String(r?.attente || '').trim().replace(/\.$/, '');
    const reste = String(r?.reste || '').trim();
    if (verdict === 'faite') {
      // Tâche faite : le prochain point est le RDV s'il y en a un (celui-ci ou un déjà prévu), sinon une relance dans 3 jours ouvrés.
      const suivant = rdv ? null : await prochainRdv(leadId);
      if (rdv) Object.assign(maj, tacheRdv(rdv, `${texteRdv(rdv)}, ${confirme}. ${AGENDA_SI_BESOIN}`));
      else if (suivant) Object.assign(maj, tacheRdv(suivant, `${suivant.resume}. Tu as écrit le ${dateCourte(jour)} (« ${objet} »)${attente ? ` : ${attente}` : ''}.`));
      else if (lead.tache_fil && lead.tache_fil === m.threadId) Object.assign(maj, { prochaine_relance: dansJoursOuvres(3), prochaine_action: 'email', prochaine_note: `Tu as répondu le ${dateCourte(jour)} (« ${objet} ») : relancer s'il n'y a pas de réponse.`.slice(0, 2000), tache_fil: null, relances_sans_reponse: 0 });
      else Object.assign(maj, { prochaine_relance: dansJoursOuvres(3), prochaine_action: 'email', prochaine_note: `Tu as écrit le ${dateCourte(jour)} (« ${objet} »)${attente ? ` : ${attente}` : ''}. Relancer s'il n'y a pas de réponse.`.slice(0, 2000), tache_fil: null, relances_sans_reponse: 0 });
    } else if (verdict === 'en_partie' && reste) {
      maj.prochaine_note = `Fait le ${dateCourte(jour)} par email (« ${objet} »). Reste : ${reste}${rdv ? ` Puis ${texteRdv(rdv)}.` : ''}`.slice(0, 2000);
    } else if (rdv) {
      // RDV validé sans toucher à la tâche prévue : il devient la tâche, sauf si quelque chose est prévu avant lui.
      if (!lead.prochaine_relance || lead.prochaine_relance >= rdv.date) Object.assign(maj, tacheRdv(rdv, `${texteRdv(rdv)}, ${confirme}. ${AGENDA_SI_BESOIN}`));
      else maj.prochaine_note = `${lead.prochaine_note || ''} Puis ${texteRdv(rdv)}.`.trim().slice(0, 2000);
    }
    // Une facture dans l'email : le paiement est à vérifier à l'échéance (bloc Paiements), et la suite est la demande d'avis.
    let factureVue = '';
    if (r?.facture === true) {
      const f = majFacture({ ...lead, ...maj }, jour, { fil: m.threadId, objet, echeance: r.facture_echeance });
      Object.assign(maj, f);
      factureVue = ` · facture repérée, paiement à vérifier le ${dateCourte(f.facture_echeance)}`;
      if (verdict === 'faite' && !rdv && (lead.suivi || lead.type === 'client')) {
        Object.assign(maj, { prochaine_relance: dansJoursOuvres(2), prochaine_action: 'email', prochaine_note: `Facture envoyée le ${dateCourte(jour)}. Demande son avis sur la formation (« Demander un avis » sur la fiche, facultatif), puis propose la suite. Paiement à vérifier le ${dateCourte(f.facture_echeance)}.`, tache_fil: null, relances_sans_reponse: 0 });
      }
    }
    await sb('iae_crm_activites', {
      methode: 'POST', prefer: 'return=minimal',
      corps: { lead_id: leadId, contact_id: c?.id || null, date: quand, type: 'email_envoye', resume: `Email envoyé depuis Gmail : « ${objet} »${SUITE_TACHE[verdict] || ''}${rdv ? ` · ${texteRdv(rdv)}` : ''}${factureVue}`.slice(0, 2000), contenu: texte || null, source: 'gmail iae', meta: { gmail_id: id, fil: m.threadId, objet, a: dest.join(', '), tache: verdict } },
    });
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
    sb(`iae_crm_documents?lead_id=eq.${leadId}&select=id,created_at,lead_id,type,nom,chemin,mime,taille,depose_par,lecture,statut,motif,verifie_le,expire_le,archive&order=created_at.desc`),
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
      system: [{ type: 'text', text: pourMoi(consignes), cache_control: { type: 'ephemeral' } }],
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
    recommandation: {
      type: 'object',
      properties: {
        canal: { type: 'string', enum: ['appel', 'email', 'sms', 'linkedin', 'rdv', 'attendre', 'autre'] },
        quoi: { type: 'string' },
        pourquoi: { type: 'string' },
      },
      required: ['canal', 'quoi', 'pourquoi'],
      additionalProperties: false,
    },
  },
  required: ['situation', 'attentes', 'chaleur', 'reactivite', 'ton', 'points', 'prochaine_etape', 'recommandation'],
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
- recommandation : la tâche que tu recommandes à Gabriel pour sa prochaine relance, d'après la façon dont les échanges se passent (Gabriel, 09/11 : « sur la tâche de relance, mets à chaque fois la tâche recommandée, avec le pourquoi »).
  - canal : appel, email, sms, linkedin, rdv (préparer ou tenir un rendez-vous prévu), attendre (la personne a annoncé un retour à une date qui n'est pas passée), autre.
  - quoi : une phrase à l'infinitif, concrète et prête à faire : à qui, quoi, avec les détails utiles (le document à joindre, la question à poser, la date à proposer).
  - pourquoi : une phrase qui s'appuie sur un fait précis des échanges, avec sa date si possible (ce qu'elle a demandé, son silence, sa façon de répondre, un engagement, le canal où elle répond).
  - Repères : une demande sans réponse de Gabriel passe avant tout ; deux relances écrites sans réponse, et un téléphone connu : un appel ; quelqu'un qui répond vite par email : un email ; un retour annoncé à une date à venir : attendre cette date ; une séquence LinkedIn en cours : LinkedIn ; un rendez-vous fixé : le préparer. Ne recommande un appel ou un SMS que si un numéro est connu, LinkedIn que si un profil est connu.
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
        textesFils.push(`Fil « ${ms[0]?.objet || ''} » :\n${ms.map((x) => `- ${new Date(x.date).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}, ${x.moi ? utilisateurCourant().prenom : x.de} : ${couper(x.texte, 900)}`).join('\n')}`);
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
    `Contacts : ${cs.map((c) => [nomDe(c), c.poste, c.email, c.telephone ? 'téléphone connu' : '', c.linkedin ? 'profil LinkedIn connu' : ''].filter(Boolean).join(', ')).join(' ; ') || 'aucun'}${lead.telephone ? ` ; standard : téléphone connu` : ''}`,
    `Prévu : ${lead.prochaine_action} le ${lead.prochaine_relance || 'rien'}${lead.prochaine_note ? `, ${lead.prochaine_note}` : ''}${lead.relances_sans_reponse ? ` (${lead.relances_sans_reponse} relance${lead.relances_sans_reponse > 1 ? 's' : ''} sans réponse)` : ''}`,
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
      system: [{ type: 'text', text: pourMoi(CONSIGNES_RECAP), cache_control: { type: 'ephemeral' } }],
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
    recommandation: r.recommandation && r.recommandation.quoi ? {
      canal: SCHEMA_RECAP.properties.recommandation.properties.canal.enum.includes(r.recommandation.canal) ? r.recommandation.canal : 'autre',
      quoi: couper(r.recommandation.quoi, 400), pourquoi: couper(r.recommandation.pourquoi, 400),
    } : null,
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
        const { lignes: dejaTrie } = await sb(`iae_crm_entrants?select=id&proprietaire=eq.${encodeURIComponent(compte())}&ref_externe=eq.${encodeURIComponent(ref)}&limit=1`);
        if (dejaTrie.length) continue;
        await sb('iae_crm_entrants?on_conflict=proprietaire,ref_externe', { methode: 'POST', prefer: 'resolution=ignore-duplicates,return=minimal', corps: { recu_le: ev.created || debut.toISOString(), canal: 'agenda', de_email: email, de_nom: a.displayName || null, objet: `RDV : ${libelle}`.slice(0, 300), extrait: texteBrut(ev.description).slice(0, 1000) || null, ref_externe: ref, meta: { event_id: ev.id, event_ref: ref, date_rdv: jour, heure, lien_agenda: ev.htmlLink } } });
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
    const rdv = rdvValide(an);
    if (rdv) await noterRdv(lead.id, contactId, rdv, `confirmé par ${qui} (« ${String(e.objet || '').slice(0, 200)} »)`, { fil: e.fil, objet: e.objet });
    if (aFaire === 'repondre' || action === 'creer') Object.assign(maj, { prochaine_relance: aujourdHuiParis(), prochaine_action: 'email', prochaine_note: `${an?.tache || `Répondre à ${qui} : « ${String(e.objet || '').slice(0, 200)} »`}${rdv ? ` Puis ${texteRdv(rdv)}.` : ''}`.slice(0, 2000), tache_fil: e.fil || null });
    else if (rdv) Object.assign(maj, tacheRdv(rdv, `${texteRdv(rdv)}, confirmé par ${qui} (« ${String(e.objet || '').slice(0, 200)} »). ${AGENDA_SI_BESOIN}`));
    else if (aFaire === 'relancer_le' && DATE_RE.test(an?.relance_date || '') && an.relance_date >= aujourdHuiParis()) Object.assign(maj, { prochaine_relance: an.relance_date, prochaine_note: (an.tache || an.resume || '').slice(0, 2000) || null, tache_fil: e.fil || null });
    await modifier('leads', lead.id, maj);
    await apresReponseProspect(lead.id, { id: contactId }, { de: { email: String(e.de_email || '').toLowerCase(), nom: e.de_nom || '' }, quand: e.recu_le, objet: e.objet || '', texte: e.extrait || '' });
  }
  await sb(`iae_crm_entrants?id=eq.${e.id}`, { methode: 'PATCH', corps: { statut: action === 'creer' ? 'cree' : 'rattache', lead_id: lead.id }, prefer: 'return=minimal' });
  return { lead_id: lead.id };
}

/* ---------- LinkedIn : la file d'envoi, le Mac de Gabriel et le contrôle du matin ---------- */
// Gabriel, 09/11 : « lancer les conversations, messages, ajouts directement sur le CRM ; quand ils ajoutent, on le
// détecte et dans les tâches du jour j'envoie le message ». Ses choix : son Mac envoie après son clic dans le CRM,
// et vérifie chaque matin qui a accepté ou répondu. Le serveur ne parle jamais à LinkedIn : il tient la file, le
// Mac (robot local, MCP LinkedIn, clé X-Cle-Robot) l'exécute et rend compte.
const PROFIL_LI_RE = /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[^\s"'<>]+$/;
const ETAPES_LI = ['invitation', 'message', 'relance', 'findia', 'reponse'];
const LIB_ETAPE_LI = { invitation: 'Invitation', message: 'Message 1', relance: 'Relance', findia: 'Dernier message (skill ou FindIA)', reponse: 'Réponse' };
const OUVERTS_LI = ['brouillon', 'a_envoyer', 'en_cours', 'echec', 'a_verifier'];
// Les règles d'écriture de la prospection (mémoire du 06/11) : un filet, en plus des consignes de rédaction.
const INTERDITS_LI = [
  [/(sans|z[ée]ro)\s+reste\s+[àa]\s+charge/i, '« reste à charge »'], [/pris en charge [àa] 100|100\s?%/i, '« 100 % »'], [/\bCPF\b/, 'CPF'],
  [/certifiante/i, '« certifiante »'], [/\bRS\s?\d{4}\b/i, 'un code de certification'], [/\bROI\b|retour sur investissement/i, 'le ROI'], [/€|\d\s?euros?\b/i, 'un prix'],
];
// Pages métier du site : la section #fiche donne les tâches où l'IA fait gagner du temps dans le métier, puis l'appel
// de 30 minutes. Le lien va dans la relance, jamais dans le message 1 (Gabriel, 09/11/2026). Le métier se lit d'abord
// dans le secteur et les tags (saisis à la main ou par la liste), sinon dans le nom et le besoin ; syndic avant immobilier, propreté avant BTP (« nettoyage des bâtiments »).
// Dernier message (étape findia) : pour un métier qui a ses skills gratuits sur skills-ia-gratuits.html, on offre le
// skill du métier à la place de FindIA (Gabriel, 09/11/2026 : « ok vas-y, mets-les dans le CRM »). FindIA reste pour les autres.
const PAGES_METIER_LI = [
  { metier: 'entreprise de propreté', page: 'formation-ia-proprete.html', re: /propret[ée]|nettoyage|entretien des locaux/i,
    skill: { quoi: "transforme vos notes de visite d'un site en plan de nettoyage et en courrier de devis", ancre: 'devis-plan-nettoyage' } },
  { metier: 'entreprise du BTP', page: 'formation-ia-btp.html', skill: { quoi: 'transforme vos notes de réunion de chantier en compte rendu prêt à relire', ancre: 'compte-rendu-chantier' }, re: /\bBTP\b|b[âa]timent|travaux publics|ma[çc]onnerie|gros[- ][oœ]e?uvre|second[- ][oœ]e?uvre|charpente|couverture|plomberie|terrassement/i },
  { metier: 'agence ou cabinet de courtage en assurance', page: 'formation-ia-assurance.html', re: /assuran|agent g[ée]n[ée]ral/i },
  { metier: 'agence immobilière', page: 'formation-ia-agence-immobiliere.html', re: /immobili|agence immo/i },
];
const SYNDIC_LI = { metier: 'syndic de copropriété ou gestion locative', page: 'formation-ia-syndic-gestion-locative.html', re: /syndic|copropri|administrat\w* de biens/i };
function pageMetierLi(l) {
  const curate = [l?.secteur, ...(l?.tags || [])].filter(Boolean).join(' ');
  const libre = [l?.entreprise, l?.besoin].filter(Boolean).join(' ');
  const p = SYNDIC_LI.re.test(`${curate} ${libre}`) ? SYNDIC_LI
    : PAGES_METIER_LI.find((x) => x.re.test(curate)) || PAGES_METIER_LI.find((x) => x.re.test(libre));
  return p ? { metier: p.metier, url: `https://ia-entrepreneur.fr/${p.page}#fiche`,
    skill: p.skill ? { quoi: p.skill.quoi, url: `https://ia-entrepreneur.fr/skills-ia-gratuits.html#${p.skill.ancre}` } : null } : null;
}
const QUOTA_MESSAGES_LI = 20;
// Plusieurs comptes (10/11/2026, Gabriel : « ok on part sur leur ordinateur ») : chaque commercial a son robot sur son
// ordinateur, qui agit en son nom (clé robot_cle_hash, contexte avecUtilisateur) ; chaque envoi porte le compte qui
// l'envoie (colonne compte), chaque contact le compte avec qui il est en relation (linkedin_compte, vide = Gabriel).
const machineLi = () => (estAdmin() ? 'ton Mac' : 'ton ordinateur');
const filtreCompteLi = () => `compte=eq.${encodeURIComponent(compte())}`;
const filtreContactsLi = () => (estAdmin() ? `or=(linkedin_compte.is.null,linkedin_compte.eq.${encodeURIComponent(ADMIN_EMAIL)})` : `linkedin_compte=eq.${encodeURIComponent(compte())}`);
const contactDuCompteLi = (c) => (c.linkedin_compte || ADMIN_EMAIL) === compte();
// 10 par jour au départ ; 20 au plus dès le 12/11, du lundi au vendredi (Gabriel, 10/11, conseil des spécialistes LinkedIn :
// « On m'a conseillé 20 par jour, mais que pendant 5 jours » ; le Mac ne tourne que les jours ouvrés).
const quotaInvitationsLi = (jour) => (jour <= '2026-11-10' ? 10 : 20);

function verifierTexteLi(etape, texte) {
  const t = String(texte ?? '').replace(/\r\n?/g, '\n').trim();
  if (etape === 'invitation') {
    if (t.length > 200) throw new Refus('note_trop_longue');
  } else if (!t) throw new Refus('message_vide');
  else if (t.length > 1900) throw new Refus('message_trop_long');
  if (/[\t\u0000-\u0008\u000b-\u001f\u007f\u0085\u2028\u2029]/.test(t)) throw new Refus('caractere_refuse');
  for (const [re, quoi] of INTERDITS_LI) if (re.test(t)) throw new Refus(`texte_interdit:${quoi}`);
  if (etape !== 'findia' && /gratuit/i.test(t)) throw new Refus('texte_interdit:« gratuit »');
  // Filet des envois automatiques : aucun lien dans le message 1, FindIA ou le skill du métier seulement dans le dernier message.
  if (etape === 'message' && /https?:\/\/|www\.|\.html\b|ia-entrepreneur\.fr/i.test(t)) throw new Refus('lien_interdit:message 1');
  if (etape !== 'findia' && /meilleures-ia|findia|skills-ia-gratuits/i.test(t)) throw new Refus('lien_interdit:FindIA');
  return t || null;
}
const nomContactLi = (c) => [c?.prenom, c?.nom].filter(Boolean).join(' ').trim() || 'ce contact';

async function contactEtLeadLi(contactId) {
  if (!UUID_RE.test(contactId || '')) throw new Refus('id_invalide');
  const [c] = (await sb(`iae_crm_contacts?id=eq.${contactId}&select=*`)).lignes;
  if (!c) throw new Refus('introuvable', 404);
  const [l] = (await sb(`iae_crm_leads?id=eq.${c.lead_id}&select=*`)).lignes;
  if (!l) throw new Refus('introuvable', 404);
  return { c, l };
}
async function actionLi(id) {
  if (!UUID_RE.test(id || '')) throw new Refus('id_invalide');
  const [a] = (await sb(`iae_crm_linkedin?id=eq.${id}&select=*`)).lignes;
  if (!a) throw new Refus('introuvable', 404);
  return a;
}
// Un robot ne touche qu'aux envois de son compte (Gabriel est admin : garder ne le filtre pas).
async function actionDuCompteLi(id) {
  const a = await actionLi(id);
  if ((a.compte || ADMIN_EMAIL) !== compte()) throw new Refus('introuvable', 404);
  return a;
}
async function majActionLi(id, valeurs) {
  const { lignes } = await sb(`iae_crm_linkedin?id=eq.${id}`, { methode: 'PATCH', corps: valeurs, prefer: 'return=representation' });
  return lignes[0];
}
async function majLeadLi(id, valeurs) {
  if (!Object.keys(valeurs).length) return null;
  const { lignes } = await sb(`iae_crm_leads?id=eq.${id}`, { methode: 'PATCH', corps: valeurs, prefer: 'return=representation' });
  return lignes[0];
}
async function majContactLi(id, valeurs) {
  const { lignes } = await sb(`iae_crm_contacts?id=eq.${id}`, { methode: 'PATCH', corps: valeurs, prefer: 'return=representation' });
  return lignes[0];
}
async function journalLi(l, c, etape, resume, contenu = null, extra = {}) {
  await sb('iae_crm_activites', {
    methode: 'POST', prefer: 'return=minimal',
    corps: { lead_id: l.id, contact_id: c?.id || null, type: 'linkedin', resume: resume.slice(0, 2000), contenu: contenu ? String(contenu).slice(0, 8000) : null, source: 'crm, linkedin (Mac)', meta: { canal: 'linkedin', etape, ...extra } },
  });
}

// Gabriel, 09/11 : « envoyer l'invitation automatiquement, et une fois seulement que la personne m'a ajouté en retour,
// rédiger le message automatiquement et que je valide ; une fois validé plus de 10 messages sans modif, on enverra
// automatiquement ». Les réponses à un prospect qui a écrit restent toujours à valider.
const SEUIL_CONFIANCE_LI = 10;
// Invitation impossible : profil introuvable, ou sans « Se connecter » (Gabriel, 09/11 : « il faut aussi que le crm me
// prévienne au cas où il ne trouve plus de profil linkedin »). Une tâche sur le lead, le jour même.
const PROFIL_IMPOSSIBLE_LI = {
  unavailable: (nom) => `LinkedIn : profil introuvable pour ${nom}. Vérifie l'adresse, ou demande à Claude de le rechercher ; sinon Anna peut appeler.`,
  follow_only: (nom) => `LinkedIn : pas d'invitation possible pour ${nom} (son profil ne propose que « Suivre »). Passe par l'email ou le téléphone ; sinon Anna peut appeler.`,
  connect_unavailable: (nom) => `LinkedIn : pas d'invitation possible pour ${nom} (LinkedIn ne propose pas « Se connecter »). Passe par l'email ou le téléphone ; sinon Anna peut appeler.`,
  // Le MCP refuse l'adresse avant toute action (emoji dans /in/…, page qui n'est pas un profil) : rien n'est parti, Gabriel invite à la main.
  invalid_argument: (nom) => `LinkedIn : ${machineLi()} ne lit pas l'adresse du profil de ${nom}, rien n'est parti. Envoie l'invitation à la main depuis son profil (« Se connecter », sans note), puis clique « Je l'ai envoyé moi-même » sur la fiche.`,
};
// La file d'invitations se vide : une ligne dans la barre LinkedIn et dans le récap de 7 h (une par jour, pas une tâche
// par lead). À 0, seulement si une invitation est partie dans les 7 derniers jours : sinon la prospection est en pause.
const SEUIL_FILE_LI = 10;
function alerteFileLi(enFile, derniereEnvoyee, jour) {
  const ajout = 'Pour en ajouter, demande « LinkedIn du jour » à Claude.';
  if (enFile > SEUIL_FILE_LI) return null;
  if (enFile > 0) {
    const j = Math.ceil(enFile / quotaInvitationsLi(jour));
    return `Plus que ${enFile} invitation${enFile > 1 ? 's' : ''} en file (environ ${j} jour${j > 1 ? 's' : ''} ouvré${j > 1 ? 's' : ''}). ${ajout}`;
  }
  if (!derniereEnvoyee || Date.now() - Date.parse(derniereEnvoyee) > 7 * 86400000) return null;
  return `Plus aucune invitation à envoyer : ton Mac n'a plus de profil à inviter. ${ajout}`;
}
const ETAPES_AUTO_LI = ['message', 'relance', 'findia'];
const normeLi = (t) => String(t || '').replace(/\s+/g, ' ').trim();
async function confianceLi() { return (await lireReglage('linkedin_confiance')) || { serie: 0, auto: false }; }

// Un seul brouillon ouvert par personne : préparer le remplace ou le crée. Une invitation part seule.
async function preparerLi(c, l, etape, texte, { claude = false } = {}) {
  if (!PROFIL_LI_RE.test(c.linkedin || '')) throw new Refus('profil_linkedin_absent');
  if (!ETAPES_LI.includes(etape)) throw new Refus('valeur_invalide:etape');
  const type = etape === 'invitation' ? 'invitation' : 'message';
  const t = texte == null ? null : String(texte).replace(/\r\n?/g, '\n').trim().slice(0, 8000) || null;
  const { lignes: ouverts } = await sb(`iae_crm_linkedin?contact_id=eq.${c.id}&statut=in.(${OUVERTS_LI.join(',')})&select=*`);
  const modifiable = ouverts.find((a) => (a.compte || ADMIN_EMAIL) === compte() && ['brouillon', 'echec', 'a_verifier'].includes(a.statut));
  if (ouverts.some((a) => ['a_envoyer', 'en_cours'].includes(a.statut))) throw new Refus('deja_en_file', 409);
  const maintenant = new Date().toISOString();
  let valeurs = { type, etape, texte: t, statut: 'brouillon', detail: null };
  if (claude) valeurs.texte_claude = t;
  if (etape === 'invitation') valeurs = { ...valeurs, texte: null, statut: 'a_envoyer', valide_le: maintenant, detail: 'Invitation automatique, sans note.' };
  else if (claude && t && ETAPES_AUTO_LI.includes(etape) && (await confianceLi()).auto) {
    try {
      verifierTexteLi(etape, t);
      valeurs = { ...valeurs, statut: 'a_envoyer', valide_le: maintenant, detail: 'Envoi automatique : 10 messages validés tels quels d\'affilée.' };
    } catch { /* un mot interdit : le texte reste à relire */ }
  }
  if (modifiable) return majActionLi(modifiable.id, valeurs);
  const { lignes } = await sb('iae_crm_linkedin', { methode: 'POST', corps: { lead_id: l.id, contact_id: c.id, compte: compte(), ...valeurs }, prefer: 'return=representation' });
  return lignes[0];
}

// Claude rédige le texte de l'étape, d'après la fiche (Gabriel relit toujours avant l'envoi).
const SCHEMA_LI = { type: 'object', additionalProperties: false, properties: { texte: { type: 'string' }, appuis: { type: 'array', items: { type: 'string' } } }, required: ['texte', 'appuis'] };
const CONSIGNES_LI = `Tu écris, pour Gabriel Vanderbecken (IA-Entrepreneur, organisme de formation à l'IA pour les entreprises, en Lorraine et dans le Grand Est), un message LinkedIn à une personne de petite entreprise (1 à 99 salariés), souvent dirigeante, qu'il ne connaît pas ou peu. Le message part sous son nom, il le relit avant l'envoi.

Selon l'étape :
- message (message 1, juste après l'acceptation de l'invitation) : 300 à 500 caractères, en quatre temps qui justifient la prise de contact (Gabriel, 09/11/2026 : une phrase générale « on dirait juste une phrase bateau »).
  1) Un fait réel sur la personne ou son entreprise, tiré de la fiche ou de l'historique, en disant d'où il vient (« dans votre post sur… », « avec vos quatre agences… »).
  2) La déduction qui justifie le message, marquée par « sûrement », qui nomme le sujet en toutes lettres (« l'administratif a sûrement grandi avec vos recrutements », jamais « il a dû grossir »). Elle n'affirme rien d'inventé.
  3) Une ligne sur ce que fait Gabriel, rattachée à cette déduction, qui dit que les formations sont éligibles à leur budget formation (« Je forme des équipes de PME du Grand Est à l'alléger grâce à l'IA, avec des formations éligibles à votre budget formation »). Dans le message 1, ni OPCO ni « nous montons le dossier ».
  4) Une question simple sur leur façon de faire aujourd'hui, à deux options dont une qui ne met pas la personne en défaut (Gabriel : « ou avez-vous une autre solution ? »). Modèle : « Chez X, c'est encore surtout fait à la main, ou vous avez déjà trouvé une solution ? ». Une question qui oppose déjà deux façons de faire reste telle quelle (« c'est une personne dédiée qui s'en charge, ou chacun gère ses dossiers ? »).
  Pas de demande de rendez-vous, pas de lien. Exemple validé par Gabriel : « Bonjour Quentin, dans votre post sur les 10 ans de FVP Courtage, vous parliez de « tout le plaisir de l'administratif » à vos débuts. Avec les recrutements et le développement du cabinet depuis, l'administratif a sûrement grandi lui aussi. Je forme des équipes de PME du Grand Est à l'alléger grâce à l'IA, avec des formations éligibles à votre budget formation. Aujourd'hui, c'est une personne dédiée qui s'en charge chez vous, ou chacun gère ses dossiers ? » Ne recopie pas cet exemple : le sujet de la déduction (l'administratif, les devis, les comptes rendus, le recrutement…) découle du fait que tu as trouvé.
- relance (après 4 jours sans réponse) : 200 à 400 caractères (jusqu'à 500 avec le lien de la page métier). Reprend la question autrement. Redit en une phrase que les formations sont éligibles à leur budget formation (peut ajouter « nous montons le dossier avec votre OPCO »). Si la fiche donne une « Page métier » et que l'activité de l'entreprise est bien ce métier, donne ce lien en une phrase, recopié tel quel (« Je vous mets ici les tâches où l'IA fait gagner le plus de temps dans une agence comme la vôtre : <lien> », en nommant son métier), juste avant la proposition des 30 minutes ; sinon, pas de lien. Une seule demande : un échange de 30 minutes, avec deux créneaux précis dans les trois jours ouvrés qui suivent la date du jour.
- findia (dernier message, 8 jours après la relance, seulement si la personne n'a répondu à rien) : 200 à 400 caractères. Apporte quelque chose sans rien demander, et laisse partir poliment (« je ne vous relancerai plus après ce message »).
  - Si la fiche donne un « Skill du métier » et que l'activité de l'entreprise est bien ce métier : offre ce skill, avec ces mots (Gabriel, 09/11/2026) : « Je vous laisse un outil gratuit : un skill qui <ce qu'il fait, recopié de la fiche>, à installer dans Claude ou à copier dans ChatGPT : <lien recopié tel quel> ». Le mot « skill » reste tel quel : c'est celui de la page où arrive la personne. Modèle validé : « Bonjour Paul, je ne vous relancerai plus après ce message. Je vous laisse un outil gratuit : un skill qui transforme vos notes de réunion de chantier en compte rendu prêt à relire, à installer dans Claude ou à copier dans ChatGPT : https://ia-entrepreneur.fr/skills-ia-gratuits.html#compte-rendu-chantier ».
  - Sinon : FindIA, l'outil gratuit du site qui dit quelle IA choisir pour quel usage (https://ia-entrepreneur.fr/meilleures-ia.html).
- reponse : répond à son dernier message, fourni dans la fiche, simplement, en reprenant ce qu'il dit. S'il pose une question, réponds-y. S'il est intéressé, propose 30 minutes avec deux créneaux précis dans les trois jours ouvrés. S'il dit qu'il a déjà un prestataire, demande « vous en êtes satisfait à combien sur 10 ? ». S'il dit non, remercie et laisse la porte ouverte.
- invitation : une note de 200 caractères au plus, une phrase sur eux et une question, sans présentation ni offre.

Règles :
- Vouvoiement, sauf si la consigne demande le tutoiement. Commence par « Bonjour {prénom}, » si le prénom est connu. Finis par « Gabriel » sur sa propre ligne (pas pour une invitation).
- Court, direct, centré sur la personne et son entreprise, pas sur IA-Entrepreneur : au plus une ligne sur Gabriel (temps 3 du message 1). Jamais « nous sommes… » ni « je suis… » en ouverture.
- Jamais le prénom d'un salarié ou d'un tiers, même s'il apparaît dans un post ou dans la fiche.
- FindIA ou le skill du métier, et leur lien, seulement à l'étape findia : jamais dans le message 1, la relance ou une réponse (Gabriel, 09/11/2026). Le lien de la page métier seulement à l'étape relance. Aucun autre lien.
- Interdits : tout prix ou montant, chiffre de gain ou de ROI, « sans reste à charge », « zéro reste à charge », « pris en charge à 100 % », « gratuit » (sauf pour FindIA ou le skill du métier, à l'étape findia), CPF, « certifiante », code de certification, mots techniques (LLM, prompt, agent, automatisation n8n).
- N'invente rien : seulement les faits de la fiche et de l'historique. Sans fait assez fort pour un message vraiment personnalisé, écris un message général assumé, construit sur son métier (Gabriel l'accepte) : ne force jamais un fait faible (la ville seule, un vieux post) pour avoir l'air de connaître la personne.
- Pas de tiret long, pas d'emoji, pas de point d'exclamation.
appuis : les faits de la fiche que tu as utilisés, en quelques mots chacun, avec leur source et leur date si elle est connue (« post sur les 10 ans du cabinet, il y a 5 semaines »). Si tu as donné la page métier, ajoute « page métier : <métier> » ; si tu l'as écartée, dis pourquoi en quelques mots. De même à l'étape findia : « skill : <métier> », ou pourquoi tu as gardé FindIA.`;
async function redigerLi(c, l, etape, { consigne = '', message = '' } = {}) {
  const { lignes: acts } = await sb(`iae_crm_activites?lead_id=eq.${l.id}&order=date.desc&limit=12&select=date,type,resume,contenu`);
  const jour = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const metierLi = ['relance', 'findia'].includes(etape) ? pageMetierLi(l) : null;
  const page = etape === 'relance' ? metierLi : null;
  const skill = etape === 'findia' && metierLi?.skill ? { metier: metierLi.metier, ...metierLi.skill } : null;
  const fiche = [
    `Date du jour : ${jour}`,
    `Étape : ${etape}`,
    `Personne : ${nomContactLi(c)}${c.poste ? `, ${c.poste}` : ''}`,
    `Entreprise : ${l.entreprise}${l.secteur ? ` (${l.secteur})` : ''}${l.localisation ? `, ${l.localisation}` : ''}`,
    l.besoin ? `Ce que Gabriel sait de leur besoin : ${couper(l.besoin, 600)}` : '',
    page ? `Page métier (métier : ${page.metier}) : ${page.url}` : '',
    skill ? `Skill du métier (métier : ${skill.metier}) : un skill qui ${skill.quoi} : ${skill.url}` : '',
    c.notes ? `Notes sur la personne : ${couper(c.notes, 600)}` : '',
    message ? `Son dernier message : ${couper(message, 2000)}` : '',
    consigne ? `Consigne de Gabriel : ${couper(consigne, 300)}` : '',
    estAdmin() ? '' : `Expéditeur : ${nomComplet()}, ${fonctionDe()} chez IA-Entrepreneur (il ne donne pas les formations lui-même) : au temps 3 du message 1, écris « Chez IA-Entrepreneur, nous formons des équipes de PME du Grand Est à… » plutôt que « Je forme… », et signe de son prénom.`,
    acts.length ? `Historique (du plus récent au plus ancien) :\n${acts.map((a) => `- ${String(a.date).slice(0, 10)} ${a.type} : ${couper(a.resume, 200)}${a.contenu && a.type === 'linkedin' ? ` | texte : ${couper(a.contenu, 500)}` : ''}`).join('\n')}` : '',
  ].filter(Boolean).join('\n');
  const r = await appelClaude({ consignes: CONSIGNES_LI, schema: SCHEMA_LI, contenu: fiche, max: 2000, timeout: 40000 });
  return { texte: String(r.texte || '').trim(), appuis: (r.appuis || []).slice(0, 6) };
}
async function preparerAvecClaude(c, l, etape, opts) {
  let texte = null;
  try { texte = (await redigerLi(c, l, etape, opts)).texte || null; } catch (e) { console.error('crm linkedin rédaction', e.code || e.message); }
  try { if (texte) verifierTexteLi(etape, texte); } catch { /* Gabriel corrige : le texte reste en brouillon */ }
  return preparerLi(c, l, etape, texte, { claude: Boolean(texte) });
}

async function operationLinkedin(corps, ip) {
  const op = corps.op;
  if (op === 'linkedin_preparer') {
    const { c, l } = await contactEtLeadLi(corps.contact_id);
    return { action: await preparerLi(c, l, String(corps.etape || 'invitation'), corps.texte ?? null, { claude: corps.claude === true }) };
  }
  if (op === 'linkedin_auto_couper') {
    await ecrireReglage('linkedin_confiance', { serie: 0, auto: false, coupe_le: new Date().toISOString() });
    return { confiance: await confianceLi() };
  }
  if (op === 'linkedin_rediger') {
    if (tropDeRedactions(ip)) throw new Refus('ia_trop_de_demandes', 429);
    const { c, l } = await contactEtLeadLi(corps.contact_id);
    const etape = ETAPES_LI.includes(corps.etape) ? corps.etape : 'message';
    let message = '';
    if (etape === 'reponse') {
      const { lignes } = await sb(`iae_crm_activites?lead_id=eq.${l.id}&type=eq.linkedin&meta->>etape=eq.reponse_recue&order=date.desc&limit=1&select=contenu`);
      message = lignes[0]?.contenu || c.linkedin_vu || '';
    }
    return redigerLi(c, l, etape, { consigne: String(corps.consigne || ''), message });
  }
  const a = await actionLi(corps.id);
  if (op === 'linkedin_valider') {
    if (!['brouillon', 'echec', 'a_verifier'].includes(a.statut)) throw new Refus('deja_en_file', 409);
    const texte = verifierTexteLi(a.etape, corps.texte ?? a.texte);
    // La confiance : des messages de Claude validés tels quels, d'affilée. Un texte modifié remet le compteur à zéro.
    // Un renvoi après un échec du Mac, texte inchangé, ne compte pas une deuxième fois.
    let confiance = null;
    if (a.type === 'message' && ETAPES_AUTO_LI.includes(a.etape) && (a.statut === 'brouillon' || normeLi(texte) !== normeLi(a.texte))) {
      const avant = await confianceLi();
      const telQuel = Boolean(a.texte_claude) && normeLi(texte) === normeLi(a.texte_claude);
      const serie = telQuel ? (avant.serie || 0) + 1 : 0;
      confiance = { ...avant, serie, auto: avant.auto || serie >= SEUIL_CONFIANCE_LI, ...(serie >= SEUIL_CONFIANCE_LI && !avant.auto ? { depuis: new Date().toISOString() } : {}) };
      await ecrireReglage('linkedin_confiance', confiance);
    }
    const action = await majActionLi(a.id, { texte, statut: 'a_envoyer', valide_le: new Date().toISOString(), detail: null });
    // Gabriel, 12/11 : « j'ai validé les messages LinkedIn et ça apparaît toujours dans mes relances du jour ». Validé =
    // plus rien à faire aujourd'hui : la tâche passe au jour ouvré suivant (l'envoi la remplace par la relance à 4 jours ;
    // si rien n'est parti d'ici là, elle revient).
    let lead = null;
    if (a.type === 'message') {
      const [l] = (await sb(`iae_crm_leads?id=eq.${a.lead_id}&select=id,prochaine_note`)).lignes;
      if (l && (!l.prochaine_note || /^LinkedIn :/.test(l.prochaine_note))) {
        const [c] = (await sb(`iae_crm_contacts?id=eq.${a.contact_id}&select=prenom,nom`)).lignes;
        lead = await majLeadLi(l.id, { prochaine_relance: dansJoursOuvres(1), prochaine_action: 'autre', prochaine_note: `LinkedIn : ${LIB_ETAPE_LI[a.etape].toLowerCase()} à ${c?.prenom || nomContactLi(c)} validé le ${dateCourte(aujourdHuiParis())}, ${machineLi()} l'envoie. S'il n'est pas parti, regarde la barre LinkedIn.` });
      }
    }
    return { action, confiance, lead };
  }
  if (op === 'linkedin_annuler') {
    if (['en_cours', 'envoye'].includes(a.statut)) throw new Refus('deja_parti', 409);
    return { action: await majActionLi(a.id, { statut: 'annule', detail: `Annulé par ${utilisateurCourant().prenom}` }) };
  }
  if (op === 'linkedin_parti') {
    // « Ton Mac ne sait pas si c'est parti » : Gabriel a regardé sur LinkedIn, c'est parti. Ou le Mac a échoué
    // (10/11 : « LinkedIn did not expose one usable message composer ») et Gabriel l'a envoyé lui-même.
    if (!['a_verifier', 'echec'].includes(a.statut)) throw new Refus('valeur_invalide:statut');
    return appliquerEnvoiLi(a, { detail: a.statut === 'echec' ? 'Envoyé à la main par Gabriel' : 'Confirmé par Gabriel sur LinkedIn' });
  }
  throw new Refus('op_inconnue');
}

// Les suites d'un envoi : historique, compteurs et tâche suivante, comme la séquence LinkedIn du skill crm-gabriel.
async function appliquerEnvoiLi(a, { detail = '', statutMcp = '', resultat = null } = {}) {
  const { c, l } = await contactEtLeadLi(a.contact_id);
  const jour = aujourdHuiParis();
  const action = await majActionLi(a.id, { statut: 'envoye', envoye_le: new Date().toISOString(), detail: detail || null, resultat });
  const prenom = c.prenom || nomContactLi(c);
  if (a.type === 'invitation') {
    if (statutMcp === 'already_connected') {
      await majContactLi(c.id, { linkedin_etat: 'relation', linkedin_le: new Date().toISOString(), linkedin_compte: a.compte || ADMIN_EMAIL });
      await journalLi(l, c, 'acceptee', `${nomContactLi(c)} est déjà dans tes relations LinkedIn : pas d'invitation, le message 1 est prêt`);
      await preparerAvecClaude(c, l, 'message');
      await majLeadLi(l.id, { prochaine_relance: jour, prochaine_action: 'autre', prochaine_note: `LinkedIn : ${prenom} est déjà dans tes relations. Message 1 prêt à valider.` });
      return { action };
    }
    await majContactLi(c.id, { linkedin_etat: 'invitation_envoyee', linkedin_le: new Date().toISOString(), linkedin_compte: a.compte || ADMIN_EMAIL });
    await journalLi(l, c, 'invitation', `Invitation LinkedIn envoyée à ${nomContactLi(c)}${a.texte ? ', avec une note' : ', sans note'} (par ${machineLi()})`, a.texte);
    await majLeadLi(l.id, { prochaine_relance: dansJoursOuvres(21), prochaine_action: 'autre', prochaine_note: `LinkedIn : invitation envoyée à ${prenom} le ${dateCourte(jour)}. ${machineLi().replace(/^t/, 'T')} regarde chaque matin si elle est acceptée.` });
    return { action };
  }
  await majContactLi(c.id, { linkedin_etat: 'relation', linkedin_compte: a.compte || ADMIN_EMAIL });
  await journalLi(l, c, a.etape, `${LIB_ETAPE_LI[a.etape]} envoyé${a.etape === 'relance' || a.etape === 'reponse' ? 'e' : ''} à ${nomContactLi(c)} sur LinkedIn (par ${machineLi()})`, a.texte);
  const maj = { dernier_contact: jour };
  if (a.etape === 'message') { maj.relances_sans_reponse = 0; if (l.statut === 'nouveau') maj.statut = 'contacte'; }
  if (a.etape === 'relance' || a.etape === 'findia') maj.relances_sans_reponse = (l.relances_sans_reponse || 0) + 1;
  if (a.etape === 'reponse') maj.relances_sans_reponse = 0;
  const suite = {
    message: [dansJoursOuvres(4), 'autre', `LinkedIn : relancer ${prenom} s'il ne répond pas (message envoyé le ${dateCourte(jour)}).`],
    reponse: [dansJoursOuvres(4), 'autre', `LinkedIn : relancer ${prenom} s'il ne répond pas (réponse envoyée le ${dateCourte(jour)}).`],
    relance: [dansJoursOuvres(8), 'autre', `LinkedIn : dernier message à ${prenom} (skill du métier ou FindIA), puis on arrête.`],
    findia: [dansJoursOuvres(90), 'autre', `Séquence LinkedIn terminée avec ${prenom} : prendre des nouvelles.`],
  }[a.etape];
  if (suite) Object.assign(maj, { prochaine_relance: suite[0], prochaine_action: suite[1], prochaine_note: suite[2] });
  await majLeadLi(l.id, maj);
  return { action };
}

// Ce que le Mac voit : quoi envoyer, qui surveiller. Une action restée « en cours » 30 minutes passe à vérifier.
async function etatRobotLi() { return (await lireReglage('linkedin_robot')) || {}; }
async function fileRobotLi() {
  const jour = aujourdHuiParis();
  const coince = new Date(Date.now() - 30 * 60000).toISOString();
  await sb(`iae_crm_linkedin?${filtreCompteLi()}&statut=eq.en_cours&pris_le=lt.${encodeURIComponent(coince)}`, { methode: 'PATCH', corps: { statut: 'a_verifier', detail: `${machineLi().replace(/^t/, 'T')} s'est arrêté pendant l'envoi : regarde sur LinkedIn si c'est parti.` }, prefer: 'return=minimal' });
  const debut = new Date(`${jour}T00:00:00+01:00`).toISOString();
  // Les messages d'abord, puis les invitations, chacun avec sa propre limite (12/11 : la recherche automatique garde
  // 40 invitations d'avance ; une seule limite à 40 aurait caché les messages validés derrière elles).
  const [{ lignes: fileMessages }, { lignes: fileInvitations }, { lignes: suivis }, { lignes: faits }, etat] = await Promise.all([
    sb(`iae_crm_linkedin?${filtreCompteLi()}&statut=eq.a_envoyer&type=eq.message&order=valide_le.asc&limit=40&select=id,type,etape,texte,contact_id,lead_id`),
    sb(`iae_crm_linkedin?${filtreCompteLi()}&statut=eq.a_envoyer&type=eq.invitation&order=valide_le.asc&limit=60&select=id,type,etape,texte,contact_id,lead_id`),
    sb(`iae_crm_contacts?${filtreContactsLi()}&linkedin_etat=not.is.null&select=id,lead_id,prenom,nom,linkedin,linkedin_etat,linkedin_le,linkedin_vu&limit=1000`),
    sb(`iae_crm_linkedin?${filtreCompteLi()}&statut=in.(envoye,en_cours,a_verifier)&pris_le=gte.${encodeURIComponent(debut)}&select=type`),
    etatRobotLi(),
  ]);
  const file = [...fileMessages, ...fileInvitations];
  const ids = [...new Set([...file.map((a) => a.contact_id), ...suivis.map((x) => x.id)])];
  const contacts = new Map(suivis.map((x) => [x.id, x]));
  const manquants = file.map((a) => a.contact_id).filter((id) => !contacts.has(id));
  if (manquants.length) for (const x of (await sb(`iae_crm_contacts?id=in.(${manquants.join(',')})&select=id,lead_id,prenom,nom,linkedin`)).lignes) contacts.set(x.id, x);
  const leadsIds = [...new Set([...contacts.values()].map((x) => x.lead_id))];
  const leads = new Map(leadsIds.length ? (await sb(`iae_crm_leads?id=in.(${leadsIds.join(',')})&select=id,entreprise,statut,archive`)).lignes.map((x) => [x.id, x]) : []);
  const vivant = (x) => { const l = leads.get(x.lead_id); return l && !l.archive && l.statut !== 'perdu'; };
  const qui = (x) => ({ contact_id: x.id, prenom: x.prenom || '', nom: x.nom || '', linkedin: x.linkedin, entreprise: leads.get(x.lead_id)?.entreprise || '' });
  return {
    jour,
    etat: { pause_jusqua: etat.pause_jusqua || null, raison: etat.raison || null, dernier_controle: etat.dernier_controle || null },
    quotas: { invitations: { max: quotaInvitationsLi(jour), faits: faits.filter((x) => x.type === 'invitation').length }, messages: { max: QUOTA_MESSAGES_LI, faits: faits.filter((x) => x.type === 'message').length } },
    a_envoyer: file.filter((a) => contacts.get(a.contact_id) && PROFIL_LI_RE.test(contacts.get(a.contact_id).linkedin || '')).map((a) => ({ id: a.id, type: a.type, etape: a.etape, texte: a.texte || '', ...qui(contacts.get(a.contact_id)) })),
    en_attente: suivis.filter((x) => x.linkedin_etat === 'invitation_envoyee' && vivant(x)).map((x) => ({ ...qui(x), depuis: x.linkedin_le })),
    a_ecouter: suivis.filter((x) => x.linkedin_etat === 'relation' && vivant(x)).map((x) => ({ ...qui(x), vu: x.linkedin_vu || '' })),
  };
}

// Gabriel, 10/11 : « ajouter un maximum de personnes qui sont actives ou en tout cas potentiellement intéressées », avec la
// méthode validée par les spécialistes LinkedIn. Le Mac cherche chaque matin les dirigeants du cœur de cible (liste Altares
// triée : BTP, propreté, assurance, 6 à 99 salariés, Lorraine) et n'envoie ici que les profils sûrs et renseignés ; un profil
// vide ou introuvable reste pour Anna. Ici : aucun doublon (même SIREN, même profil, même nom d'entreprise), puis lead, contact
// et invitation automatique, comme une invitation préparée à la main.
const SECTEURS_PROSPECT_LI = { BTP: 'btp', 'Propreté': 'proprete', Assurance: 'assurance' };
async function ajouterProspectLi(corps) {
  const p = corps.prospect && typeof corps.prospect === 'object' ? corps.prospect : {};
  const linkedin = String(p.linkedin || '').trim();
  if (!PROFIL_LI_RE.test(linkedin)) throw new Refus('profil_linkedin_absent');
  const ident = (linkedin.match(/\/in\/([^/?#]+)/) || [])[1] || '';
  const siret = /^\d{14}$/.test(String(p.siret || '')) ? String(p.siret) : null;
  const entreprise = couper(String(p.entreprise || '').trim(), 200);
  const prenom = couper(String(p.prenom || '').trim(), 80);
  const nom = couper(String(p.nom || '').trim(), 80);
  if (!entreprise || !prenom || !nom || !ident) throw new Refus('valeur_invalide:prospect');
  // Les doublons se cherchent dans toute la base : le robot d'un commercial ne voit que ses leads, et deux comptes ne
  // doivent jamais contacter la même entreprise.
  const [parSiren, parProfil, parNom] = await avecUtilisateur(ADMIN, () => Promise.all([
    siret ? sb(`iae_crm_leads?siret=like.${siret.slice(0, 9)}*&select=id&limit=1`) : { lignes: [] },
    sb(`iae_crm_contacts?linkedin=ilike.*${encodeURIComponent(`/in/${ident}`)}*&select=id&limit=1`),
    sb(`iae_crm_leads?entreprise=ilike.${encodeURIComponent(entreprise)}&select=id&limit=1`),
  ]));
  if (parSiren.lignes.length || parProfil.lignes.length || parNom.lignes.length) return { ok: true, doublon: true };
  const secteur = Object.hasOwn(SECTEURS_PROSPECT_LI, p.secteur) ? p.secteur : null;
  const anna = couper(String(p.anna || '').trim(), 40);
  const chezAnna = Boolean(anna) && anna !== 'hors de sa base';
  const salaries = couper(String(p.salaries || '').trim(), 20);
  const titre = couper(String(p.titre || '').trim(), 220);
  const { lignes: [l] } = await sb('iae_crm_leads', { methode: 'POST', prefer: 'return=representation', corps: {
    entreprise, type: 'prospect', statut: 'nouveau', source: 'LinkedIn · cœur de cible (Altares)', secteur, siret,
    tags: ['linkedin', 'coeur-cible', 'actif-linkedin', ...(secteur ? [SECTEURS_PROSPECT_LI[secteur]] : []), ...(chezAnna ? ['liste-anna'] : [])],
    besoin: `${secteur || 'Entreprise'}${salaries ? ` (${salaries} salariés)` : ''}, cœur de cible${chezAnna ? ` ; dans la base d'Anna (${anna})` : ''}. Profil LinkedIn trouvé par ${machineLi()}${titre ? ` : « ${titre} »` : ''}.`,
    localisation: couper(String(p.localisation || '').trim(), 80) || null, prochaine_action: 'autre', relances_sans_reponse: 0,
    prochaine_note: `LinkedIn : invitation en file d'envoi, ${machineLi()} l'envoie (20 par jour au plus).${chezAnna ? " Anna l'a aussi dans sa base : dès qu'un des deux canaux a une réponse, l'autre s'arrête." : ''}`,
  } });
  const { lignes: [c] } = await sb('iae_crm_contacts', { methode: 'POST', prefer: 'return=representation', corps: {
    lead_id: l.id, prenom, nom, poste: couper(String(p.poste || '').trim(), 80) || null, linkedin, principal: true,
  } });
  await journalLi(l, c, 'trouve', `Profil LinkedIn de ${nomContactLi(c)} trouvé par ${machineLi()} (cœur de cible)`, titre || null);
  await preparerLi(c, l, 'invitation', null);
  return { ok: true, cree: true, lead_id: l.id };
}

// Gabriel, 10/11 : « quelqu'un à qui j'ai envoyé des messages et qui n'a pas répondu, Anna doit être au courant dans le CRM.
// Par contre si quelqu'un m'a répondu et est OK pour un rendez-vous, je le gère moi-même. » Message 1 sans réponse depuis
// 2 jours ouvrés : Anna devient setter du lead, donc le voit avec son journal. Rien ne lui dit d'appeler : à elle et à
// Gabriel de décider. Un lead qui a répondu reste à Gabriel seul.
const ANNA_LI = 'anna@ia-entrepreneur.fr';
async function prevenirAnnaLi(bilan) {
  bilan.anna = 0;
  if (!estAdmin()) return;
  const depuis = new Date(Date.now() - 30 * 86400000).toISOString();
  const { lignes: ecrits } = await sb(`iae_crm_linkedin?${filtreCompteLi()}&type=eq.message&etape=eq.message&statut=eq.envoye&envoye_le=gte.${encodeURIComponent(depuis)}&select=lead_id,contact_id,envoye_le&order=envoye_le.asc&limit=500`);
  for (const m of ecrits) {
    const jourEnvoi = String(m.envoye_le).slice(0, 10);
    if (dansJoursOuvres(2, jourEnvoi) > aujourdHuiParis()) continue;
    const [l] = (await sb(`iae_crm_leads?id=eq.${m.lead_id}&select=id,setter,statut,archive,tags`)).lignes;
    if (!l || l.setter || l.archive || !['nouveau', 'contacte'].includes(l.statut) || !(l.tags || []).includes('linkedin')) continue;
    const { lignes: reponse } = await sb(`iae_crm_activites?lead_id=eq.${l.id}&type=eq.linkedin&meta->>etape=eq.reponse_recue&select=id&limit=1`);
    if (reponse.length) continue;
    const { c } = await contactEtLeadLi(m.contact_id);
    if (c.linkedin_vu) continue;
    await majLeadLi(l.id, { setter: ANNA_LI });
    await journalLi(l, c, 'anna_prevenue', `Pas de réponse de ${nomContactLi(c)} au message LinkedIn du ${dateCourte(jourEnvoi)} : Anna voit maintenant ce lead`);
    bilan.anna++;
  }
}

async function operationRobotLi(corps) {
  const etape = corps.etape;
  const etat = await etatRobotLi();
  const maintenant = new Date().toISOString();
  if (etape === 'etat') {
    const nouvel = { ...etat, dernier_passage: maintenant };
    if (corps.pause) { nouvel.pause_jusqua = String(corps.pause.jusqua || '').slice(0, 40) || null; nouvel.raison = couper(corps.pause.raison || '', 300); }
    if (corps.reprise) { nouvel.pause_jusqua = null; nouvel.raison = null; }
    nouvel.erreur = corps.erreur ? couper(corps.erreur, 300) : null;
    await ecrireReglage('linkedin_robot', nouvel);
    return { ok: true };
  }
  if (etat.pause_jusqua && etat.pause_jusqua > maintenant) return { ok: false, raison: 'pause' };
  if (etape === 'prospect') return ajouterProspectLi(corps);
  if (etape === 'prendre') {
    const a = await actionDuCompteLi(corps.id);
    const file = await fileRobotLi();
    const q = a.type === 'invitation' ? file.quotas.invitations : file.quotas.messages;
    if (q.faits >= q.max) return { ok: false, raison: 'quota' };
    const { lignes } = await sb(`iae_crm_linkedin?id=eq.${a.id}&statut=eq.a_envoyer`, { methode: 'PATCH', corps: { statut: 'en_cours', pris_le: maintenant }, prefer: 'return=representation' });
    return { ok: Boolean(lignes && lignes.length) };
  }
  if (etape === 'rendre') {
    // Le navigateur était occupé avant tout envoi : l'action retourne dans la file.
    const a = await actionDuCompteLi(corps.id);
    if (a.statut === 'en_cours') await majActionLi(a.id, { statut: 'a_envoyer', pris_le: null });
    return { ok: true };
  }
  if (etape === 'resultat') {
    const a = await actionDuCompteLi(corps.id);
    if (a.statut !== 'en_cours') throw new Refus('valeur_invalide:statut');
    const detail = couper(corps.detail || '', 400);
    const resultat = corps.resultat && typeof corps.resultat === 'object' ? JSON.parse(JSON.stringify(corps.resultat).slice(0, 4000)) : null;
    if (corps.issue === 'envoye') return appliquerEnvoiLi(a, { detail, statutMcp: String(corps.statut_mcp || ''), resultat });
    const statut = corps.issue === 'a_verifier' ? 'a_verifier' : 'echec';
    const action = await majActionLi(a.id, { statut, detail: detail || 'Échec sans détail', resultat });
    const mcp = String(corps.statut_mcp || '');
    if (a.type === 'invitation' && statut === 'echec' && Object.hasOwn(PROFIL_IMPOSSIBLE_LI, mcp)) {
      const { c, l } = await contactEtLeadLi(a.contact_id);
      await journalLi(l, c, 'invitation_impossible', `Invitation LinkedIn impossible pour ${nomContactLi(c)} : ${detail || 'profil introuvable'}`);
      await majLeadLi(l.id, { prochaine_relance: aujourdHuiParis(), prochaine_action: 'autre', prochaine_note: PROFIL_IMPOSSIBLE_LI[mcp](nomContactLi(c)) });
    }
    return { action };
  }
  if (etape === 'controle') {
    const bilan = { acceptes: 0, reponses: 0, a_retirer: 0 };
    for (const id of (corps.acceptes || []).slice(0, 50)) {
      const { c, l } = await contactEtLeadLi(id);
      if (c.linkedin_etat !== 'invitation_envoyee' || !contactDuCompteLi(c)) continue;
      await majContactLi(c.id, { linkedin_etat: 'relation', linkedin_le: maintenant });
      await journalLi(l, c, 'acceptee', `${nomContactLi(c)} a accepté ton invitation LinkedIn (vu par ${machineLi()})`);
      await preparerAvecClaude(c, l, 'message');
      await majLeadLi(l.id, { prochaine_relance: aujourdHuiParis(), prochaine_action: 'autre', prochaine_note: `LinkedIn : ${c.prenom || nomContactLi(c)} a accepté ton invitation. Message 1 prêt à valider.`, relances_sans_reponse: 0 });
      bilan.acceptes++;
    }
    for (const r of (corps.reponses || []).slice(0, 50)) {
      const { c, l } = await contactEtLeadLi(r.contact_id);
      const texte = couper(String(r.texte || '').trim(), 4000);
      if (!texte || texte === c.linkedin_vu || !contactDuCompteLi(c)) continue;
      // Une réponse suppose que Gabriel a écrit : sinon c'est un vieux message d'une relation, gardé comme « vu ».
      const { lignes: ecrit } = await sb(`iae_crm_linkedin?contact_id=eq.${c.id}&type=eq.message&statut=eq.envoye&limit=1&select=id`);
      if (!ecrit.length) { await majContactLi(c.id, { linkedin_vu: texte }); continue; }
      await majContactLi(c.id, { linkedin_etat: 'relation', linkedin_vu: texte });
      const fil = /^\/messaging\/thread\/[A-Za-z0-9=_-]+\/?$/.test(r.fil || '') ? `https://www.linkedin.com${r.fil}` : null;
      await journalLi(l, c, 'reponse_recue', `${nomContactLi(c)} t'a répondu sur LinkedIn`, texte, fil ? { fil_linkedin: fil } : {});
      await sb(`iae_crm_linkedin?contact_id=eq.${c.id}&statut=in.(brouillon,a_envoyer)&etape=in.(message,relance,findia)`, { methode: 'PATCH', corps: { statut: 'annule', detail: 'Il a répondu : la séquence s\'arrête.' }, prefer: 'return=minimal' });
      // Un canal répond, l'autre s'arrête (12/11/2026) : l'email de prospection en attente ne part pas.
      await arreterEnvoisEnAttente(l.id, `${nomContactLi(c)} a répondu sur LinkedIn : l'email ne part pas.`, { linkedin: false }).catch((e) => console.error('crm arrêt croisé', e?.code || e?.message));
      await preparerAvecClaude(c, l, 'reponse', { message: texte });
      const anna = /anna/i.test(l.source || '');
      await majLeadLi(l.id, { prochaine_relance: aujourdHuiParis(), prochaine_action: 'autre', prochaine_note: `LinkedIn : ${c.prenom || nomContactLi(c)} t'a répondu. Réponse proposée à relire.${anna ? ' Préviens Anna : elle a aussi cette entreprise dans ses listes.' : ''}`, relances_sans_reponse: 0, dernier_contact: aujourdHuiParis() });
      bilan.reponses++;
    }
    // Invitation sans réponse depuis 3 semaines : on la retire (à la main, aucun outil ne le fait) et on arrête.
    const limite = new Date(Date.now() - 21 * 86400000).toISOString();
    const { lignes: vieilles } = await sb(`iae_crm_contacts?${filtreContactsLi()}&linkedin_etat=eq.invitation_envoyee&linkedin_le=lt.${encodeURIComponent(limite)}&select=id`);
    for (const v of vieilles) {
      const { c, l } = await contactEtLeadLi(v.id);
      await majContactLi(c.id, { linkedin_etat: 'a_retirer' });
      await journalLi(l, c, 'autre', `Invitation LinkedIn à ${nomContactLi(c)} sans réponse depuis 3 semaines`);
      await majLeadLi(l.id, { prochaine_relance: aujourdHuiParis(), prochaine_action: 'autre', prochaine_note: `LinkedIn : retire l'invitation à ${c.prenom || nomContactLi(c)} (en attente depuis 3 semaines), puis on arrête.` });
      bilan.a_retirer++;
    }
    await prevenirAnnaLi(bilan);
    // Les suites du jour (relance, dernier message) sont rédigées par Claude, comme le message 1.
    bilan.suites = 0;
    const { lignes: relations } = await sb(`iae_crm_contacts?${filtreContactsLi()}&linkedin_etat=eq.relation&select=id,lead_id&limit=1000`);
    for (const r of relations) {
      if (bilan.suites >= 10) break;
      const [l] = (await sb(`iae_crm_leads?id=eq.${r.lead_id}&select=*`)).lignes;
      if (!l || l.archive || l.statut === 'perdu' || !l.prochaine_relance || l.prochaine_relance > aujourdHuiParis()) continue;
      const etapeSuite = /^LinkedIn : relancer /.test(l.prochaine_note || '') ? 'relance' : /^LinkedIn : dernier message/.test(l.prochaine_note || '') ? 'findia' : null;
      if (!etapeSuite) continue;
      const { lignes: ouverts } = await sb(`iae_crm_linkedin?${filtreCompteLi()}&contact_id=eq.${r.id}&statut=in.(${OUVERTS_LI.join(',')})&select=id&limit=1`);
      if (ouverts.length) continue;
      const [c] = (await sb(`iae_crm_contacts?id=eq.${r.id}&select=*`)).lignes;
      await preparerAvecClaude(c, l, etapeSuite);
      bilan.suites++;
    }
    await ecrireReglage('linkedin_robot', { ...etat, dernier_passage: maintenant, dernier_controle: aujourdHuiParis(), dernier_bilan: bilan });
    return { ok: true, bilan };
  }
  throw new Refus('op_inconnue');
}

// La clé du Mac de Gabriel : son empreinte SHA-256 est dans iae_crm_reglages (linkedin_robot_cle), jamais la clé elle-même.
// Celle du robot d'un commercial : dans iae_crm_utilisateurs (robot_cle_hash). Renvoie la personne, ou null.
async function robotDeLaCle(req) {
  const donnee = String(req.headers['x-cle-robot'] || '');
  if (!donnee) return null;
  const attendue = await lireReglage('linkedin_robot_cle');
  if (typeof attendue === 'string' && /^[0-9a-f]{64}$/.test(attendue)) {
    const a = Buffer.from(createHash('sha256').update(donnee).digest('hex'));
    const b = Buffer.from(attendue);
    if (a.length === b.length && timingSafeEqual(a, b)) return ADMIN;
  }
  return utilisateurParCleRobot(donnee);
}

/* ---------- Prospection email : registre, adresse vérifiée, faits publics, Claude, Brevo ---------- */
// Gabriel, 12/11 : « mets le bilan dans le crm, il faut qu'on en envoie tous les jours » (avant : « vas y molo sur les
// emails, mais on peut déjà tenter »). Le circuit LinkedIn, déjà validé par Gabriel, transposé à l'email : un dirigeant
// sans profil LinkedIn utilisable → son adresse vérifiée → des faits publics datés → Claude rédige → Gabriel valide d'un
// clic (envoi automatique après 10 messages validés tels quels d'affilée, comme LinkedIn) → le serveur envoie par Brevo
// les matins de jours ouvrés, dans un quota → bilan dans « Aujourd'hui » et dans le récap de 7 h. Tout tourne dans la
// synchro de 15 minutes, pour le seul compte de Gabriel (les emails partent de son adresse). Une ligne par email dans
// iae_crm_emails (supabase/iae_crm_emails.sql) : a_enrichir → a_rediger → brouillon → a_envoyer → en_cours → envoye,
// ou sans_email (pas d'adresse vérifiée : la fiche reste pour Anna, au téléphone), annule, echec.
const EN_ATTENTE_EMAIL = ['a_enrichir', 'a_rediger', 'brouillon', 'a_envoyer', 'echec'];
// « molo » : 5 par jour au plus, 2 par passage pour les étaler, entre 8 h 30 et 11 h 30 à Paris, jours ouvrés. FullEnrich :
// 3 recherches par jour au plus, et seulement pour un contact ultra qualifié (Gabriel, 12/11 : « un peu de fullenrich sur
// des contacts ultra qualifiés »). L'expéditeur est réglable pour passer plus tard à un domaine dédié.
// enrichissements : adresses trouvées par FullEnrich par jour (Gabriel, 12/11 : « on peut partir sur 3 recherches abouties par
// jour ») ; FullEnrich ne fait payer que les adresses trouvées. tentatives_fullenrich : le garde-fou des recherches lancées.
// rdv_minutes : le trajet en voiture depuis Nancy au-delà duquel on ne propose plus de venir (Gabriel, 12/11 : « 40 mn me va,
// pas plus ») ; rdv_km : le seuil à vol d'oiseau quand OSRM ne répond pas (prudent).
// fullenrich_deduites : une adresse déduite (base Google Maps) part aussi chez FullEnrich, dans le même plafond (Gabriel, 12/11).
// paliers : le quota monte seul à une date, si le bilan depuis le début est propre (Gabriel, 12/11 : 10 par jour à partir du
// lundi 16/11 ; pas de palier à 20 sans son accord, et sans doute pas sans domaine dédié).
const EMAIL_PROSPECTION = { par_jour: 5, par_passage: 2, enrichissements: 3, tentatives_fullenrich: 10, debut: '08:30', fin: '11:30', expediteur: ADMIN_EMAIL, expediteur_nom: 'Gabriel Vanderbecken', rdv_minutes: 40, rdv_km: 25,
  fullenrich_deduites: true, paliers: [{ a_partir_du: '2026-11-16', par_jour: 10 }] };
const SEUIL_CONFIANCE_EMAIL = SEUIL_CONFIANCE_LI;
const SOURCE_EMAIL = 'crm, prospection email (Brevo)';
const URL_STOP = 'https://ia-entrepreneur.fr/api/crm?stop=';
const BREVO = 'https://api.brevo.com/v3';
// Documentation officielle lue le 12/11/2026 : https://docs.fullenrich.com/api/v2/contact/enrich/bulk/post.md et
// https://docs.fullenrich.com/api/v2/contact/enrich/bulk/get.md. POST /contact/enrich/bulk (Authorization: Bearer <clé>,
// 100 contacts au plus, enrich_fields par contact, custom renvoyé tel quel) rend { enrichment_id } ; puis
// GET /contact/enrich/bulk/{enrichment_id} rend status (CREATED, IN_PROGRESS, FINISHED, CANCELED, CREDITS_INSUFFICIENT,
// RATE_LIMIT, UNKNOWN ; 400 error.enrichment.in_progress tant que ce n'est pas fini) et data[].contact_info
// .most_probable_work_email { email, status } (DELIVERABLE, HIGH_PROBABILITY, CATCH_ALL, INVALID, INVALID_DOMAIN,
// UNVERIFIED). Email pro : 1 crédit ; le téléphone (10 crédits) n'est jamais demandé.
const FULLENRICH = 'https://app.fullenrich.com/api/v2';
// Sources publiques et gratuites, en JSON, vérifiées le 12/11/2026 (SIREN 323375659).
const DECP = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/decp-2022-marches-valides/records';
const RGE = 'https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines';
const BODACC = 'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records';
const REGISTRE = 'https://recherche-entreprises.api.gouv.fr/search';
const BOAMP = 'https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records';

async function reglageEmail() { return { ...EMAIL_PROSPECTION, ...((await lireReglage('email_prospection')) || {}) }; }
async function majReglageEmail(valeurs) {
  const n = { ...((await lireReglage('email_prospection')) || {}), ...valeurs };
  await ecrireReglage('email_prospection', n);
  return { ...EMAIL_PROSPECTION, ...n };
}
async function confianceEmail() { return (await lireReglage('email_confiance')) || { serie: 0, auto: false }; }
const normEmail = (e) => String(e || '').trim().toLowerCase();
// Minuit à Paris, en instant UTC (heure d'été comme d'hiver).
function minuitParis(jour) {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(new Date(`${jour}T12:00:00Z`)));
  return new Date(Date.parse(`${jour}T00:00:00Z`) - (h - 12) * 3600000).toISOString();
}
const heureMinuteParis = () => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
// « DEFRANCE » → « Defrance » ; un nom déjà écrit en minuscules reste tel quel.
function nomPropre(n) {
  const t = String(n || '').trim().replace(/\s+/g, ' ');
  if (!t || t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
}
const nomContactEmail = (c) => [c?.prenom, nomPropre(c?.nom)].filter(Boolean).join(' ').trim() || 'ce contact';

async function ligneEmail(id) {
  if (!UUID_RE.test(id || '')) throw new Refus('id_invalide');
  const [e] = (await sb(`iae_crm_emails?id=eq.${id}&select=*`)).lignes;
  if (!e) throw new Refus('introuvable', 404);
  return e;
}
async function majLigneEmail(id, valeurs) {
  const { lignes } = await sb(`iae_crm_emails?id=eq.${id}`, { methode: 'PATCH', corps: valeurs, prefer: 'return=representation' });
  return lignes[0];
}
async function leadEtContactEmail(e) {
  const [{ lignes: [l] }, { lignes: cs }] = await Promise.all([
    sb(`iae_crm_leads?id=eq.${e.lead_id}&select=*`),
    e.contact_id ? sb(`iae_crm_contacts?id=eq.${e.contact_id}&select=*`) : sb(`iae_crm_contacts?lead_id=eq.${e.lead_id}&order=principal.desc,created_at.asc&limit=1&select=*`),
  ]);
  return { l: l || null, c: cs[0] || null };
}
async function journalEmail(l, c, type, resume, contenu = null, meta = {}, date = null) {
  await sb('iae_crm_activites', {
    methode: 'POST', prefer: 'return=minimal',
    corps: { lead_id: l.id, contact_id: c?.id || null, type, resume: resume.slice(0, 2000), contenu: contenu ? String(contenu).slice(0, 8000) : null, source: type === 'email_envoye' ? SOURCE_EMAIL : 'crm, prospection email', meta: { canal: 'email', ...meta }, ...(date ? { date } : {}) },
  });
}
// Ce que la page reçoit d'une ligne : ni l'empreinte du lien de désinscription, ni le texte de Claude, ni les faits bruts.
// D'où vient l'adresse (site, ADEME, BOAMP, FullEnrich, à la main), avec le lien, et ce qui a été vu puis écarté.
const emailPourPage = (e) => e && { ...Object.fromEntries(Object.entries(e).filter(([k]) => !['jeton_stop_hash', 'texte_claude', 'faits', 'fullenrich_id'].includes(k))), adresse_source: e.faits?.adresse || null };
const COLONNES_EMAIL_PAGE = 'id,created_at,lead_id,contact_id,etape,statut,email,email_statut,source_email,civilite,objet,texte,appuis,valide_le,envoye_le,brevo_message_id,brevo_campagne,evenements,detail,adresse_source:faits->adresse,rdv_bureaux:faits->rdv->bureaux,siege_cp:faits->registre->siege->code_postal,prospect_dep:faits->prospect->dep';

/* ----- Les textes : le modèle validé par Gabriel le 12/11, l'accroche et l'objet de Claude ----- */

// Le modèle validé par Gabriel le 12/11 (deuxième relecture, sur l'email à Eric Vigneron) : « montrer que c'est du
// personnalisé + aller sur des valeurs ajoutées personnalisées mais aussi dire ce qu'on fait assez généralement ». Refusés
// le même jour : « nous connaissons bien le quotidien d'une entreprise comme la vôtre » (peut être mal perçu) et « vous avez
// déjà trouvé une solution ? » (trop faible). Une seule question dans tout le message ; plus de phrase « Chez X, … ».
// Claude écrit l'objet, l'accroche (« J'ai vu que vous… »), la valeur (la tâche précise liée aux faits, à l'infinitif, avec
// un exemple concret), le reste du bureau (trois tâches de la liste fermée) et le document de l'exemple ; le reste est fixe.
// Un jeu par métier (Gabriel, 12/11, pour la base Google Maps d'Anna : immobilier et assurance en plus du BTP et de la
// propreté) : le reste du bureau en liste fermée (celui par défaut d'abord), des exemples de valeur et de document pour
// Claude, et la valeur neutre quand Claude n'a pas pu rédiger (3 essais), que Gabriel adapte avec l'accroche.
const RESTE_BTP_EMAIL = ['emails', 'devis', 'relation client', 'suivi de chantier', 'plannings', 'factures et relances', 'recrutement'];
const JEUX_METIER_EMAIL = {
  'du BTP': {
    reste: RESTE_BTP_EMAIL, defaut: ['emails', 'devis', 'relation client', 'plannings'],
    valeurs: ["répondre plus vite aux appels d'offres avec l'IA, par exemple en partant de leurs anciens mémoires techniques", "monter plus vite les dossiers d'aides de leurs clients avec l'IA, par exemple à partir des devis signés", "préparer plus vite leurs devis avec l'IA, par exemple à partir de leurs notes de visite"],
    documents: ['mémoires', 'devis', "dossiers d'aides", 'comptes rendus'], objets: ['Vos mémoires techniques', "Vos dossiers d'aides", 'Vos devis', "Vos appels d'offres"],
    neutre: ["préparer plus vite leurs devis avec l'IA, par exemple à partir de leurs notes de visite", 'devis'],
  },
  'de la propreté': {
    reste: RESTE_BTP_EMAIL.filter((x) => x !== 'suivi de chantier'), defaut: ['plannings', 'devis', 'relation client', 'emails'],
    valeurs: ["préparer plus vite les plannings des équipes avec l'IA, par exemple à partir de ceux de la semaine passée", "répondre plus vite aux appels d'offres avec l'IA, par exemple en partant de leurs anciens mémoires techniques", "préparer plus vite leurs devis avec l'IA, par exemple à partir de leurs notes de visite de site"],
    documents: ['plannings', 'devis', 'mémoires'], objets: ["Vos plannings d'équipe", 'Vos mémoires techniques', 'Vos devis'],
    neutre: ["préparer plus vite leurs devis avec l'IA, par exemple à partir de leurs notes de visite de site", 'devis'],
  },
  'des agences immobilières': {
    reste: ['emails', 'annonces', 'comptes rendus de visite', 'relances vendeurs et acquéreurs', 'gestion des mandats', 'estimations', 'relation client'], defaut: ['emails', 'comptes rendus de visite', 'relances vendeurs et acquéreurs', 'annonces'],
    valeurs: ["rédiger plus vite leurs annonces avec l'IA, par exemple à partir de leurs notes de visite", "préparer plus vite les comptes rendus de visite pour leurs vendeurs avec l'IA, par exemple à partir d'une note vocale", "répondre plus vite aux demandes des acquéreurs avec l'IA, par exemple à partir de leurs fiches de biens"],
    documents: ['annonces', 'comptes rendus de visite', 'mandats', 'fiches de biens'], objets: ['Vos annonces', 'Vos comptes rendus', 'Vos relances vendeurs'],
    neutre: ["rédiger plus vite leurs annonces avec l'IA, par exemple à partir de leurs notes de visite", 'annonces'],
  },
  "des cabinets d'assurance": {
    reste: ['emails', 'devis', 'gestion des sinistres', 'relances', 'renouvellements', 'relation client'], defaut: ['emails', 'relances', 'renouvellements', 'devis'],
    valeurs: ["traiter plus vite les déclarations de sinistre avec l'IA, par exemple à partir des emails de leurs clients", "préparer plus vite leurs comparatifs avec l'IA, par exemple à partir des conditions des assureurs", "préparer plus vite les renouvellements avec l'IA, par exemple à partir des contrats en cours"],
    documents: ['dossiers sinistres', 'comparatifs', 'contrats', 'devis'], objets: ['Vos dossiers sinistres', 'Vos comparatifs', 'Vos renouvellements'],
    neutre: ["traiter plus vite les déclarations de sinistre avec l'IA, par exemple à partir des emails de leurs clients", 'dossiers sinistres'],
  },
  'des PME': {
    reste: ['emails', 'devis', 'relation client', 'factures et relances', 'plannings', 'recrutement'], defaut: ['emails', 'devis', 'relation client', 'factures et relances'],
    valeurs: ["traiter plus vite leurs emails avec l'IA, par exemple en partant de leurs réponses types", "préparer plus vite leurs devis avec l'IA, par exemple à partir de leurs anciens devis"],
    documents: ['emails', 'devis', 'comptes rendus'], objets: ['Vos devis', 'Vos emails clients', 'Vos relances clients'],
    neutre: ["traiter plus vite leurs emails avec l'IA, par exemple en partant de leurs réponses types", 'emails'],
  },
};
const jeuMetierEmail = (metier) => JEUX_METIER_EMAIL[metier] || JEUX_METIER_EMAIL['des PME'];
// Au-delà de 40 min de route, la visio seule (Gabriel, 13/11 : plus de « par téléphone ») : « … en 20 minutes de visio … ».
const LIEU_DISTANCE_EMAIL = 'en visio';
const SIGNATURE_EMAIL = 'Gabriel Vanderbecken\nIA-Entrepreneur';
const motsEmail = (t) => String(t || '').split(/\s+/).filter((m) => /[\p{L}\p{N}]/u.test(m)).length;
// La valeur : à l'infinitif, sans point final ni « à » devant (la phrase fixe le met), première lettre en minuscule.
function nettoyerValeurEmail(v) {
  let x = String(v || '').replace(/\s+/g, ' ').trim().replace(/^[àa]\s+/i, '').replace(/[.;:,!\s]+$/, '');
  if (/^\p{Lu}\p{Ll}/u.test(x)) x = x[0].toLowerCase() + x.slice(1);
  return couper(x, 220);
}
// Le reste du bureau : trois tâches de la liste fermée, sans redire la valeur, complétées par celles du métier.
function resteBureauEmail(reste, valeur, metier) {
  const v = normaliser(valeur);
  const jeu = jeuMetierEmail(metier);
  const choisis = [];
  for (const r of [...(Array.isArray(reste) ? reste : []), ...jeu.defaut, ...jeu.reste]) {
    const k = String(r || '').trim().toLowerCase();
    if (!jeu.reste.includes(k) || choisis.includes(k)) continue;
    // « factures et relances » redit « factures » ; « suivi de chantier » redit « chantier » : un mot commun suffit.
    if (normaliser(k).split(' ').some((m) => m.length > 3 && !['client', 'gestion', 'visite'].includes(m) && v.split(' ').some((w) => w === m || w === `${m}s` || `${w}s` === m))) continue;
    choisis.push(k);
    if (choisis.length === 3) break;
  }
  return choisis;
}
// Le document de l'exemple, au pluriel, pour « sur un de vos propres … » (« mémoires », « devis », « comptes rendus »).
function documentEmail(d, defaut = 'devis') {
  const x = String(d || '').replace(/\s+/g, ' ').trim().replace(/^(vos|des|les|leurs)\s+/i, '').replace(/[.,;:!?]+$/, '').toLowerCase();
  return x && x.length <= 40 && x.split(' ').length <= 4 && /^[\p{Ll}' -]+$/u.test(x) ? x : defaut;
}
const ligneValeurEmail = (metier, valeur, reste) => `Je forme les équipes ${metier} à ${valeur}, et aussi à alléger le reste du bureau : ${reste.join(', ')}. Les formations sont éligibles à votre budget formation.`;
// « un de vos propres mémoires », mais « une de vos propres annonces » : le genre se lit sur le premier mot du document.
const DOCUMENTS_FEMININS_EMAIL = /^(annonces|fiches|estimations|factures|offres|réponses|propositions|notes|déclarations|attestations|relances|lettres|synthèses|notices|demandes|candidatures|consultations|analyses)\b/;
// Près de Nancy, « …sur un de vos propres mémoires, en visio ou dans vos bureaux à Lunéville. Ça vous intéresse ? » ; plus loin,
// ou sans commune connue, « …en 20 minutes de visio ce que ça donne sur un de vos propres mémoires. Ça vous intéresse ? ».
const ligneRdvEmail = (document, lieu) => {
  const sur = `${DOCUMENTS_FEMININS_EMAIL.test(document) ? 'une' : 'un'} de vos propres ${document}`;
  return /^en visio ou dans vos bureaux à \S/.test(lieu || '') ? `Si ça vous parle, je peux vous montrer en 20 minutes ce que ça donne sur ${sur}, ${lieu}. Ça vous intéresse ?`
    : `Si ça vous parle, je peux vous montrer en 20 minutes de visio ce que ça donne sur ${sur}. Ça vous intéresse ?`;
};
// Le métier de la phrase fixe (Gabriel, 12/11 : immobilier, gestion locative et syndic → agences immobilières ; assurance
// et courtage → cabinets d'assurance ; sinon des PME).
function metierEmail(l) {
  const m = pageMetierLi(l)?.metier || '';
  return /BTP/.test(m) ? 'du BTP' : /propret/.test(m) ? 'de la propreté' : /immobili|syndic|gestion locative/.test(m) ? 'des agences immobilières' : /assurance/.test(m) ? "des cabinets d'assurance" : 'des PME';
}
// Gabriel, 13/11 : « je suis pas fan d'écrire "Bonjour Olivier Michau", personne n'écrit ça, généralement on écrit Bonjour
// M. Michau ». « Bonjour Monsieur X, » ou « Bonjour Madame X, » ; civilité inconnue (prénom mixte, rare ou absent) : « Bonjour, ».
function salutationEmail(civilite, c) {
  const nom = nomPropre(c?.nom);
  return civilite && nom ? `Bonjour ${civilite === 'Mme' ? 'Madame' : 'Monsieur'} ${nom},` : 'Bonjour,';
}
// La civilité de la ligne, sinon celle du prénom (fichier des prénoms de l'Insee, api/_prenoms.js), sinon null.
const civiliteEmail = (e, c) => e?.civilite || civiliteDuPrenom(c?.prenom);
// Le dirigeant tel qu'on le nomme : « Monsieur Vigneron », sinon « Eric Vigneron » (pour la fiche de Claude et l'accueil).
function nommerDirigeant(civilite, c) {
  const nom = nomPropre(c?.nom);
  return civilite && nom ? `${civilite === 'Mme' ? 'Madame' : 'Monsieur'} ${nom}` : [c?.prenom, nom].filter(Boolean).join(' ');
}
// Le message pour l'accueil (Gabriel, 12/11 à 17 h : « en prenant en compte qu'on écrit à l'accueil ») : « Bonjour, », la
// dirigeant à qui il est destiné (pas une question, pas de « merci de transmettre »), puis le même message, adressé à lui par son nom.
function qualiteCourteEmail(poste, civilite) {
  const p = normaliser(poste);
  const f = civilite === 'Mme';
  if (/president/.test(p)) return f || /presidente/.test(p) ? 'présidente' : 'président';
  if (/directeur general|directrice generale/.test(p)) return f || /directrice/.test(p) ? 'directrice générale' : 'directeur général';
  if (/cogerant/.test(p)) return f || /cogerante/.test(p) ? 'cogérante' : 'cogérant';
  if (/gerant/.test(p)) return f || /gerante/.test(p) ? 'gérante' : 'gérant';
  if (/directeur|directrice/.test(p)) return f || /directrice/.test(p) ? 'directrice' : 'directeur';
  return couper(String(poste || '').trim().toLowerCase(), 40);
}
function destinataireAccueil(civilite, c) {
  const nomme = nommerDirigeant(civilite, c);
  const qualite = qualiteCourteEmail(c?.poste, civilite);
  return { nomme, qualite, avecCivilite: Boolean(civilite && nomPropre(c?.nom)), feminin: civilite === 'Mme' || /^(gérante|présidente|directrice|cogérante)/.test(qualite) };
}
const voyelleEmail = (t) => /^[aeiouyàâäéèêëîïôöùûüœ]/i.test(String(t || ''));
// « de Monsieur Vigneron », « d'Isabelle Moreau », « du gérant », « de la gérante », « de la direction ».
function deDestinataireAccueil(d) {
  if (d.nomme) return `${voyelleEmail(d.nomme) ? "d'" : 'de '}${d.nomme}`;
  if (d.qualite) return `${voyelleEmail(d.qualite) ? "de l'" : d.feminin ? 'de la ' : 'du '}${d.qualite}`;
  return 'de la direction';
}
function objetAccueilEmail(civilite, c) {
  return `À l'attention ${deDestinataireAccueil(destinataireAccueil(civilite, c))}`;
}
function debutAccueilEmail(civilite, c, accroche) {
  const d = destinataireAccueil(civilite, c);
  const a = String(accroche || '').trim();
  // « Ce message est à destination de Monsieur Party, gérant. », sans « merci de bien vouloir le lui transmettre »
  // (Gabriel, 13/11 : « ça fait prétentieux »). Puis « Monsieur Vigneron, j'ai vu que… » ; sans civilité, « J'ai vu que… »
  // sans le nom devant (Gabriel, 13/11).
  return ['Bonjour,', '', `Ce message est à destination ${deDestinataireAccueil(d)}${d.nomme && d.qualite ? `, ${d.qualite}` : ''}.`, '',
    d.avecCivilite && a ? `${d.nomme}, ${a.replace(/^\p{Lu}(?=[\p{Ll}'’])/u, (m) => m.toLowerCase())}` : a];
}
// Le message entier : salutation, accroche, valeur et reste du bureau, proposition de rendez-vous (lieu selon le trajet
// depuis Nancy), signature texte. Ces deux lignes de signature sont remplacées par la signature Gmail à l'envoi.
function texteEmail(e, l, c, { accroche = '', valeur = '', reste = [], document = '', lieu = LIEU_DISTANCE_EMAIL, accueil = false } = {}) {
  const metier = metierEmail(l);
  const [valeurDefaut, documentDefaut] = jeuMetierEmail(metier).neutre;
  const v = nettoyerValeurEmail(valeur) || valeurDefaut;
  const debut = accueil ? debutAccueilEmail(e.civilite, c, accroche) : [salutationEmail(e.civilite, c), '', String(accroche || '').trim()];
  return [...debut, '', ligneValeurEmail(metier, v, resteBureauEmail(reste, v, metier)), '',
    ligneRdvEmail(documentEmail(document, documentDefaut), lieu || LIEU_DISTANCE_EMAIL), '', SIGNATURE_EMAIL].join('\n');
}

// Le filet : les interdits de LinkedIn, plus « gratuit », aucun lien, rien sur l'origine de l'adresse (Gabriel, 28/10 :
// ne jamais dire d'où vient l'adresse), aucune variable oubliée. Un texte qui ne passe pas reste à relire.
const INTERDITS_EMAIL = [...INTERDITS_LI, [/gratuit/i, '« gratuit »'], [/\bOPCO\b/i, 'OPCO']];
const LIEN_EMAIL_RE = /https?:\/\/|www\.|\b[a-z0-9-]+\.(fr|com|net|org|eu|io|info|biz)\b|[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const ORIGINE_EMAIL_RE = /trouv[ée]e? (votre|vos) (adresse|coordonn|e-?mail)|vos coordonn[ée]es|votre (adresse|e-?mail|courriel)[^.]{0,30}(communiqu|transmi|donn|trouv)|fullenrich|altares|linkedin/i;
function verifierTexteEmail(objet, texte) {
  const o = String(objet ?? '').replace(/\s+/g, ' ').trim();
  const t = String(texte ?? '').replace(/\r\n?/g, '\n').trim();
  if (!o) throw new Refus('objet_invalide');
  if (o.length > 90) throw new Refus('objet_trop_long');
  const lettres = o.replace(/[^\p{L}]/gu, '');
  if (lettres.length >= 6 && lettres === lettres.toUpperCase()) throw new Refus('objet_majuscules');
  if (!t) throw new Refus('message_vide');
  if (t.length > 3000) throw new Refus('message_trop_long');
  if (/[\t\u0000-\u0008\u000b-\u001f\u007f]/.test(t)) throw new Refus('caractere_refuse');
  const tout = `${o}\n${t}`;
  for (const [re, quoi] of INTERDITS_EMAIL) if (re.test(tout)) throw new Refus(`email_interdit:${quoi}`);
  if (LIEN_EMAIL_RE.test(tout)) throw new Refus('email_lien');
  if (ORIGINE_EMAIL_RE.test(tout)) throw new Refus('email_origine');
  if (/\{[^}\n]{1,40}\}|<[^>\n]{1,40}>/.test(tout)) throw new Refus('variable_restante');
  return { objet: o, texte: t };
}
// Signalé à côté du texte, sans bloquer l'envoi validé par Gabriel ; un envoi automatique, lui, attend (12/11 : ne jamais
// nommer l'acheteur ni le bailleur ; un lieu ou un bâtiment peut se nommer, comme « Haroué et la Villa Majorelle »).
const ALERTES_EMAIL = [
  // Gabriel, 13/11 : jamais « Bonjour Olivier Michau, » ; « Bonjour Monsieur Michau, » ou « Bonjour, ».
  [/^Bonjour (?!Monsieur\b|Madame\b)(?:\p{Lu}[\p{L}'’-]*\s+){1,2}\p{Lu}[\p{L}'’-]*\s*,/mu, "Le message commence par « Bonjour Prénom Nom, » : on écrit « Bonjour Monsieur Nom, », « Bonjour Madame Nom, » ou « Bonjour, » (Gabriel, 13/11)."],
  [/annuaire|base de donn[ée]es|\bfichier\b|registre/i, "Le texte parle d'un annuaire, d'un fichier ou d'un registre : vérifie qu'il ne dit pas d'où vient l'adresse."],
  [/\b(conseil (d[ée]partemental|r[ée]gional)|mairie|la ville de|commune de|communaut[ée] (de communes|d'agglom[ée]ration)|m[ée]tropole|office public|OPH|bailleur|d[ée]partement de|r[ée]gion grand est)\b/i, "Le texte semble nommer l'acheteur ou un tiers : on ne nomme ni le client, ni la collectivité, ni le bailleur."],
  [/\b(march[ée]|lot) de \d|\b\d{1,3}(?:[\s.]\d{3})+\b|\b\d{5,}\b/i, "Le texte contient un grand nombre : vérifie qu'il ne s'agit pas d'un montant."],
];
const alertesEmail = (objet, texte) => ALERTES_EMAIL.filter(([re]) => re.test(`${objet}\n${texte}`)).map(([, m]) => m);
const MESSAGES_REFUS_EMAIL = {
  objet_invalide: "Il manque l'objet.", objet_trop_long: 'Objet trop long (90 caractères au plus).', objet_majuscules: "L'objet est tout en majuscules.",
  message_vide: 'Le message est vide.', message_trop_long: 'Message trop long (3 000 caractères au plus).', caractere_refuse: 'Le texte contient un caractère invisible.',
  email_interdit: 'Le texte contient un mot interdit (prix, ROI, CPF, OPCO, « reste à charge », « 100 % », « certifiante », « gratuit »).',
  email_lien: "Le texte contient un lien ou une adresse : aucun lien dans le message (le lien de désinscription s'ajoute seul).",
  email_origine: "Le texte parle de l'origine de l'adresse ou de LinkedIn : à retirer.", variable_restante: 'Une variable entre accolades ou chevrons reste à remplacer.',
};
const messageRefusEmail = (x) => MESSAGES_REFUS_EMAIL[String(x?.code || '').split(':')[0]] || 'Le texte ne passe pas le contrôle.';

/* ----- Les faits publics, par SIREN : registre, marchés publics, RGE, BODACC (12 derniers mois) ----- */

async function lireJsonPublic(url, delai = 6000) {
  try {
    const r = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(delai) });
    if (!r.ok) { console.error('crm email faits', new URL(url).hostname, r.status); return null; }
    return await r.json();
  } catch (e) {
    console.error('crm email faits', new URL(url).hostname, e?.name || e?.message);
    return null;
  }
}
// Le registre national (API Recherche d'entreprises, https://recherche-entreprises.api.gouv.fr/openapi.json) : l'entreprise
// est-elle ouverte, le dirigeant toujours en place, et l'entreprise s'est-elle opposée à la prospection commerciale
// (opposition_diffusion_commerciale : « Opposition à la réutilisation des données de l'unité légale à des fins de
// prospection commerciale », article 21.2 du RGPD et R.123-320 du Code de commerce) ? Des autres dirigeants, on ne garde
// que le premier prénom, le nom et la qualité : de quoi reconnaître leur adresse nominative (Gabriel, 12/11 : seulement
// l'adresse du dirigeant ou d'un co-dirigeant), rien d'autre.
// Les holdings de patron (Gabriel, 12/11, pour la liste cœur de cible qui alimente aussi l'email : « holdings de patron
// réintégrées : on n'écarte plus que les vrais groupes »). Une entreprise dirigée par une société (président, gérant ou
// directeur général personne morale, hors commissaires aux comptes) n'est gardée que si cette holding est celle du patron,
// selon les critères du script du 12/11 (holdings.py) : ni un grand groupe (même liste que prospection.py), ni une ETI ou
// une grande entreprise, siège dans le Grand Est, elle-même dirigée par une personne physique et non par une société, aucun
// administrateur judiciaire ni mandataire. Le dirigeant à saluer est alors celui de la holding : il doit être le contact
// de la ligne (sinon on ne devine pas, la ligne s'arrête). L'opposition de la holding à la prospection arrête aussi.
const QUALITE_DIRIGEANT_RE = /pr[ée]sident|g[ée]rant|directeur g[ée]n[ée]ral|directrice g[ée]n[ée]rale/i;
const DIFFICULTE_RE = /administrateur|liquidat|mandataire/i;
const GRANDS_GROUPES_EMAIL = /\b(vinci|bouygues|eiffage|spie|engie|equans|colas|eurovia|fayat|nge|razel|sogea|dodin|cegelec|axians|omexom|citeos|actemium|santerne|sdel|ineo|onet|derichebourg|samsic|atalian|gsf|elior|sodexo|veolia|suez|saint gobain|point p|iss|tfn|challancin)\b/;
const DEPARTEMENTS_HOLDING = new Set(['08', '10', '51', '52', '54', '55', '57', '67', '68', '88']);
const sansCommissaires = (ds) => (ds || []).filter((d) => !/commissaire/i.test(d.qualite || ''));
const departementSiege = (siege) => String(siege?.departement || String(siege?.code_postal || '').slice(0, 2) || '').trim() || null;
// Le dirigeant de la ligne parmi des personnes physiques du registre : le nom suffit (un prénom d'usage peut différer du
// prénom d'état civil) ; le prénom, quand il colle, départage un père et un fils.
function dirigeantDeLaLigne(physiques, c) {
  const qui = normaliser(c?.nom).split(' ').filter((x) => x.length > 1);
  const prenom = normaliser(c?.prenom).split(' ')[0] || '';
  const memeNom = physiques.filter((d) => { const n = new Set(normaliser(d.nom).split(' ')); return qui.length && qui.every((x) => n.has(x)); });
  return memeNom.find((d) => prenom && normaliser(d.prenoms).split(' ').includes(prenom)) || memeNom[0] || null;
}
async function lireEntrepriseRegistre(siren) {
  const j = await lireJsonPublic(`${REGISTRE}?q=${siren}&page=1&per_page=5`);
  if (!j) return null;
  return (j.results || []).find((x) => x.siren === siren) || false;
}
// La holding qui dirige l'entreprise : { patron: true, … } ou { patron: false, raison } ; null si le registre ne répond pas.
async function jugerHolding(h) {
  const nom = couper(String(h.denomination || h.nom || '').trim(), 200) || 'sans nom';
  if (GRANDS_GROUPES_EMAIL.test(normaliser(nom))) return { patron: false, nom, raison: `${nom}, un grand groupe` };
  const siren = String(h.siren || '').replace(/\D/g, '');
  if (!/^\d{9}$/.test(siren)) return { patron: false, nom, raison: `${nom}, holding sans SIREN au registre` };
  const he = await lireEntrepriseRegistre(siren);
  if (he === null) return null;
  if (!he) return { patron: false, nom, siren, raison: `${nom}, holding introuvable au registre` };
  const base = { nom, siren, opposition: he.opposition_diffusion_commerciale === true, departement: departementSiege(he.siege), commune: couper(he.siege?.libelle_commune || '', 80) || null, categorie: he.categorie_entreprise || null };
  if (['GE', 'ETI'].includes(he.categorie_entreprise)) return { ...base, patron: false, raison: `${nom}, ${he.categorie_entreprise === 'GE' ? 'une grande entreprise' : 'une ETI'}` };
  if (base.departement && !DEPARTEMENTS_HOLDING.has(base.departement)) return { ...base, patron: false, raison: `${nom}, holding dont le siège est hors du Grand Est (${base.departement})` };
  const ds = sansCommissaires(he.dirigeants);
  if (ds.some((d) => DIFFICULTE_RE.test(d.qualite || ''))) return { ...base, patron: false, raison: `${nom}, holding sous administrateur ou mandataire` };
  if (ds.some((d) => d.type_dirigeant === 'personne morale')) return { ...base, patron: false, raison: `${nom}, holding elle-même dirigée par une société` };
  const pp = ds.filter((d) => d.type_dirigeant !== 'personne morale');
  const chef = pp.find((d) => QUALITE_DIRIGEANT_RE.test(d.qualite || '')) || pp[0] || null;
  if (!chef) return { ...base, patron: false, raison: `${nom}, holding sans dirigeant personne physique au registre` };
  return { ...base, patron: true, physiques: pp, chef };
}

async function lireRegistre(siren, c, { holding = true } = {}) {
  const e = await lireEntrepriseRegistre(siren);
  if (e === null) return null;
  if (!e) return { trouve: false };
  const ds = sansCommissaires(e.dirigeants);
  const physiques = ds.filter((d) => d.type_dirigeant !== 'personne morale');
  // Une société qui dirige (président, gérant, directeur général) : sa holding est lue (holdings de patron, 12/11).
  const morales = ds.filter((d) => d.type_dirigeant === 'personne morale');
  const tete = morales.find((d) => QUALITE_DIRIGEANT_RE.test(d.qualite || '')) || null;
  let h = null;
  if (holding && tete && !ds.some((d) => DIFFICULTE_RE.test(d.qualite || ''))) {
    h = await jugerHolding(tete);
    if (h === null) return null; // le registre ne répond pas pour la holding : on réessaiera
  }
  const chef = h?.patron ? h.chef : null;
  let sien = dirigeantDeLaLigne(physiques, c);
  // Le dirigeant à saluer est celui de la holding : il doit être le contact de la ligne.
  const contactHolding = chef ? Boolean(dirigeantDeLaLigne([chef], c)) : null;
  if (chef && contactHolding) sien = chef;
  const personnes = [...physiques, ...(chef && !physiques.some((d) => normaliser(d.nom) === normaliser(chef.nom) && normaliser(d.prenoms) === normaliser(chef.prenoms)) ? [chef] : [])];
  const pers = (d) => ({ prenom: couper(String(d.prenoms || '').trim().split(/\s+/)[0] || '', 60), nom: couper(String(d.nom || '').trim(), 80), qualite: couper(d.qualite || '', 60) });
  return {
    trouve: true, nom: couper(e.nom_complet || '', 200), etat: e.etat_administratif || null, creation: e.date_creation || null,
    opposition: e.opposition_diffusion_commerciale === true, effectif: e.tranche_effectif_salarie || null,
    // Administrateur judiciaire, liquidateur ou mandataire au registre : on n'écrit pas.
    difficulte: ds.some((d) => DIFFICULTE_RE.test(d.qualite || '')),
    // Une filiale (dirigée par une société qui n'est pas la holding du patron) n'est jamais contactée (Gabriel et Anna, 10/11 ;
    // holdings de patron réintégrées le 12/11).
    filiale: Boolean(tete) && !h?.patron, filiale_raison: tete && !h?.patron ? (h?.raison || `${couper(tete.denomination || '', 120) || 'une société'} au registre`) : null,
    holding: h ? { siren: h.siren || null, nom: h.nom, patron: Boolean(h.patron), opposition: Boolean(h.opposition), departement: h.departement || null, categorie: h.categorie || null,
      dirigeant: chef ? pers(chef) : null, contact: contactHolding } : null,
    dirigeants_connus: physiques.length + (chef ? 1 : 0), en_place: Boolean(sien), qualite: sien ? couper(`${sien.qualite || ''}${chef && sien === chef ? ` (holding ${h.nom})` : ''}`, 80) : null,
    personnes: personnes.slice(0, 8).map(pers),
    // Le siège (latitude, longitude, commune) : le lieu du rendez-vous proposé dépend du trajet depuis Nancy (Gabriel, 12/11).
    siege: e.siege ? { lat: Number.parseFloat(e.siege.latitude) || null, lon: Number.parseFloat(e.siege.longitude) || null, commune: couper(e.siege.libelle_commune || '', 80) || null, code_commune: e.siege.commune || null, code_postal: e.siege.code_postal || null } : null,
  };
}
// Marchés publics attribués (DECP) : la date et l'objet, jamais le montant (on ne le lit même pas).
async function lireMarches(siren, depuis) {
  const q = new URLSearchParams({ where: `startswith(titulaire_id_1,"${siren}")`, order_by: 'datenotification desc', limit: '10', select: 'datenotification,objet,lieuexecution_code' });
  const j = await lireJsonPublic(`${DECP}?${q}`);
  if (!j) return null;
  const vus = new Set();
  return (j.results || []).filter((m) => m.datenotification && m.datenotification >= depuis && m.objet)
    .filter((m) => { const k = normaliser(m.objet).slice(0, 80); if (vus.has(k)) return false; vus.add(k); return true; })
    .slice(0, 5).map((m) => ({ date: String(m.datenotification).slice(0, 10), objet: couper(String(m.objet).replace(/\s+/g, ' '), 300), lieu: m.lieuexecution_code || null }));
}
// Annuaire RGE de l'ADEME : les qualifications en cours (et leur date), le site internet déclaré et les adresses publiques
// de l'entreprise (souvent générales ; elles donnent au moins le domaine du site, sauf un webmail).
async function lireRge(siren) {
  const j = await lireJsonPublic(`${RGE}?${new URLSearchParams({ qs: `siret:${siren}*`, size: '30' })}`);
  if (!j) return null;
  const jour = aujourdHuiParis();
  const vues = new Map();
  const emails = new Set();
  let domaine = null;
  let site = null;
  for (const x of j.results || []) {
    const email = normEmail(x.email);
    if (EMAIL_RE.test(email)) emails.add(email);
    const d = email.split('@')[1];
    if (d && !WEBMAILS.has(d) && DOMAINE_RE.test(d)) domaine = domaine || d;
    if (!site && /^(https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}/i.test(String(x.site_internet || '').trim())) site = couper(String(x.site_internet).trim(), 200);
    if (!x.nom_qualification || (x.lien_date_fin && x.lien_date_fin < jour)) continue;
    const k = normaliser(x.nom_qualification);
    if (!vues.has(k)) vues.set(k, { qualification: couper(x.nom_qualification, 200), certificat: couper(x.nom_certificat || '', 80), domaine: couper(x.domaine || '', 120), depuis: x.lien_date_debut || null, jusqua: x.lien_date_fin || null });
  }
  return { qualifications: [...vues.values()].sort((a, b) => String(b.depuis).localeCompare(String(a.depuis))).slice(0, 8), domaine, site, emails: [...emails].slice(0, 5), lien: `${RGE}?qs=${encodeURIComponent(`siret:${siren}*`)}` };
}
// BODACC : modifications, créations, ventes des 12 derniers mois (sans les noms des personnes) ; une procédure collective
// ou une radiation arrête la prospection de l'entreprise.
async function lireBodacc(siren, depuis) {
  const q = new URLSearchParams({ where: `registre like "%${siren}%"`, order_by: 'dateparution desc', limit: '20', select: 'dateparution,familleavis,familleavis_lib,modificationsgenerales,listeetablissements,jugement,acte' });
  const j = await lireJsonPublic(`${BODACC}?${q}`);
  if (!j) return null;
  const lire = (v) => { if (!v) return null; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return null; } };
  return (j.results || []).filter((a) => a.dateparution >= depuis && a.familleavis && a.familleavis !== 'dpc').slice(0, 6).map((a) => {
    const modif = lire(a.modificationsgenerales);
    const jugement = lire(a.jugement);
    const etab = lire(a.listeetablissements)?.etablissement;
    const premier = Array.isArray(etab) ? etab[0] : etab;
    const activite = premier?.activite;
    const detail = modif?.descriptif || jugement?.nature || (activite ? `établissement : ${activite}` : '');
    // Un établissement secondaire créé : un signe de développement (critère « ultra qualifié »).
    const secondaire = /secondaire/i.test(`${premier?.qualiteEtablissement || ''} ${lire(a.acte)?.creation?.categorieCreation || ''}`);
    return { date: a.dateparution, famille: a.familleavis, libelle: a.familleavis_lib || a.familleavis, detail: couper(String(detail || ''), 240), secondaire };
  });
}
// Avis d'attribution du BOAMP (12 derniers mois) : au format eForms, chaque titulaire porte son SIRET
// (cac:PartyLegalEntity/cbc:CompanyID) et son email (cac:Contact/cbc:ElectronicMail). Vérifié le 12/11/2026 sur des avis
// réels : 24-127807 et 24-130758 (eForms, l'email du titulaire y est) ; 26-1301 (format simple, sans email) ne donne rien,
// sans erreur.
async function lireBoamp(siren, depuis) {
  const q = new URLSearchParams({ where: `search("${siren}") and dateparution >= date'${depuis}'`, order_by: 'dateparution desc', limit: '5', select: 'idweb,dateparution,donnees' });
  const j = await lireJsonPublic(`${BOAMP}?${q}`, 8000);
  if (!j) return null;
  const trouves = new Map();
  const texteDe = (v) => (v && typeof v === 'object' ? v['#text'] : v);
  for (const a of j.results || []) {
    let d = a.donnees;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch { continue; } }
    const pile = [d];
    for (let n = 0; pile.length && n < 50000; n++) {
      const x = pile.pop();
      if (!x || typeof x !== 'object') continue;
      const ids = [].concat(x['cac:PartyLegalEntity'] || []).map((e) => String(texteDe(e?.['cbc:CompanyID']) || '').replace(/\s/g, ''));
      if (ids.some((id) => id.startsWith(siren))) {
        for (const ct of [].concat(x['cac:Contact'] || [])) {
          const email = normEmail(texteDe(ct?.['cbc:ElectronicMail']));
          if (EMAIL_RE.test(email) && !trouves.has(email)) trouves.set(email, { email, date: a.dateparution, idweb: a.idweb, url: `https://www.boamp.fr/pages/avis/?q=idweb:%22${encodeURIComponent(a.idweb || '')}%22` });
        }
      }
      for (const v of Object.values(x)) if (v && typeof v === 'object') pile.push(v);
    }
  }
  return [...trouves.values()].slice(0, 5);
}
async function lireFaitsPublics(siren, c) {
  const depuis = ajouterJoursIso(aujourdHuiParis(), -365);
  const [registre, marches, rge, bodacc, boamp] = await Promise.all([lireRegistre(siren, c), lireMarches(siren, depuis), lireRge(siren), lireBodacc(siren, depuis), lireBoamp(siren, ajouterJoursIso(aujourdHuiParis(), -730))]);
  return { registre, marches, rge, bodacc, boamp, lu_le: new Date().toISOString() };
}
// Ce qui arrête la prospection de l'entreprise, d'après les faits publics (la raison va sur la ligne et au journal).
function raisonDArret(f, c) {
  const r = f.registre;
  if (r && r.trouve === false) return "SIREN introuvable au registre national : on n'écrit pas.";
  if (r?.etat === 'C') return 'Entreprise fermée au registre national.';
  if (r?.opposition) return "L'entreprise s'est opposée à la prospection commerciale (registre national des entreprises) : on ne lui écrit pas.";
  if (r?.holding?.opposition) return `La holding qui dirige l'entreprise (${r.holding.nom}) s'est opposée à la prospection commerciale (registre national des entreprises) : on ne lui écrit pas.`;
  if (r?.difficulte) return 'Administrateur judiciaire, liquidateur ou mandataire au registre national : on n\'écrit pas.';
  if (r?.filiale) return `Filiale d'un groupe (dirigée par ${r.filiale_raison || 'une personne morale au registre'}) : pas de prospection.`;
  // Holding de patron (12/11) : le dirigeant à saluer est celui de la holding ; si ce n'est pas le contact de la ligne, on ne devine pas.
  if (r?.holding?.patron && !r.holding.contact) return `L'entreprise est dirigée par la holding ${r.holding.nom}, dont le dirigeant au registre est ${[nomPropre(r.holding.dirigeant?.prenom), nomPropre(r.holding.dirigeant?.nom)].filter(Boolean).join(' ') || 'inconnu'}, pas ${nomContactEmail(c)} : à vérifier avant d'écrire.`;
  if (r && r.dirigeants_connus > 0 && !r.en_place) return `${nomContactEmail(c)} n'apparaît plus parmi les dirigeants au registre national : à vérifier avant d'écrire.`;
  const grave = (f.bodacc || []).find((a) => ['collective', 'radiation', 'retablissement_professionnel'].includes(a.famille));
  if (grave) return `${grave.libelle} au BODACC le ${dateCourte(grave.date)} : on n'écrit pas.`;
  return null;
}
/* ----- L'adresse : celle du dirigeant, trouvée d'abord gratuitement, jamais une adresse générale ----- */
// Gabriel, 12/11 : « on n'écrit pas aux adresses générales, idéalement tu m'identifies toutes les adresses non générales,
// sinon un peu de fullenrich sur des contacts ultra qualifiés ». Une adresse n'est gardée que si ce qui précède l'arobase
// est le nom du dirigeant (ou d'un co-dirigeant au registre) : prénom.nom, nom.prénom, initiale(s)+nom, nom+initiale(s),
// prénom seul, nom seul, avec ou sans point, tiret ou soulignement, accents et noms composés ramenés à la même forme
// (mdefrance@, fabrice.adam@, trotzier.jc@, edalla-costa@). Jamais une adresse devinée ou construite : seulement une adresse
// lue telle quelle (site de l'entreprise, ADEME, BOAMP, FullEnrich, ou posée à la main), et dont le domaine a un MX.
const ADRESSES_GENERALES = new Set(['contact', 'contacts', 'info', 'infos', 'information', 'informations', 'accueil', 'secretariat', 'secretaire',
  'administration', 'admin', 'administratif', 'compta', 'comptabilite', 'commercial', 'commerciale', 'commerciaux', 'devis', 'direction', 'bureau',
  'bureaux', 'agence', 'sav', 'rh', 'recrutement', 'emploi', 'emplois', 'jobs', 'job', 'candidature', 'noreply', 'nepasrepondre', 'hello', 'bonjour',
  'mail', 'email', 'courrier', 'office', 'gestion', 'service', 'services', 'facturation', 'facture', 'factures', 'vente', 'ventes', 'achat', 'achats',
  'travaux', 'chantier', 'chantiers', 'atelier', 'technique', 'support', 'qualite', 'rgpd', 'dpo', 'juridique', 'communication', 'marketing', 'presse',
  'planning', 'exploitation', 'etude', 'etudes', 'commande', 'commandes', 'magasin', 'boutique', 'showroom', 'reception', 'standard', 'assistante',
  'assistant', 'adv', 'paie', 'team', 'equipe', 'entreprise', 'societe', 'sarl', 'sas', 'sasu', 'eurl', 'sci', 'snc', 'webmaster', 'postmaster',
  'abuse', 'newsletter', 'general', 'generale', 'siege', 'groupe', 'cabinet', 'mairie', 'gerance', 'location', 'renseignements', 'demande', 'demandes']);
// Les mots qui ne font pas le nom d'une société : formes juridiques, et (12/11, base Google Maps) les mots du métier
// (« Cabinet Safar » : safar@ est la boîte de la société, comme chiarizia@ pour CHIARIZIA).
const FORMES_JURIDIQUES = new Set(['sarl', 'sas', 'sasu', 'sa', 'eurl', 'sci', 'snc', 'scop', 'ets', 'etablissements', 'etablissement', 'entreprise',
  'entreprises', 'societe', 'ste', 'et', 'fils', 'freres', 'cie', 'groupe', 'group', 'holding', 'cabinet', 'agence', 'immobilier', 'immobiliere', 'immo',
  'assurance', 'assurances', 'courtage', 'de', 'des', 'du', 'la', 'le', 'les', 'l', 'd']);
const PARTICULES = new Set(['de', 'du', 'des', 'la', 'le', 'd', 'l', 'van', 'von', 'da', 'di', 'dos']);
// Les domaines des messageries grand public : jamais le domaine d'un site d'entreprise.
const WEBMAILS = new Set([...DOMAINES_PERSO, 'club-internet.fr', 'aliceadsl.fr', 'cegetel.net', 'noos.fr', 'voila.fr', 'ymail.com', 'yahoo.co.uk',
  'skynet.be', 'tele2.fr', '9online.fr', 'libertysurf.fr', 'infonie.fr', 'web.de', 'gmx.de', 'outlook.be', 'hotmail.be', 'live.be', 'netcourrier.com', 'mailo.com']);
const MOTIFS_ADRESSE = {
  invalide: 'adresse invalide', generique: 'adresse générale', societe: 'adresse au nom de la société',
  autre: "pas l'adresse du dirigeant (une autre personne, ou une adresse non nominative)", mx: 'domaine sans serveur de messagerie (MX)',
  ambigue: 'adresse au seul nom de famille de plusieurs dirigeants : impossible de savoir qui la lit',
  domaine: "domaine d'un autre site (agence web, hébergeur…)",
};
const motsDe = (t) => String(t || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const sansWww = (h) => String(h || '').toLowerCase().replace(/^www\./, '');
// Les formes d'adresse d'une personne : « Jean-Claude Trotzier » → jeanclaudetrotzier, trotzierjc, jctrotzier, jtrotzier,
// trotzier, jeanclaude, jean… ; le registre écrit le nom d'usage entre parenthèses (« BLUM (DEFRANCE) ») : les deux comptent.
function formesDuNom(p) {
  const parts = motsDe(String(p.prenom || '').trim().split(/\s+/)[0]);
  const noms = String(p.nom || '').split(/[()]/).map((x) => motsDe(x)).filter((x) => x.length);
  const formes = new Set();
  const P = parts.join('');
  const P1 = parts[0] || '';
  const I = parts.map((x) => x[0]).join('');
  const I1 = P1[0] || '';
  for (const n of noms) {
    for (const N of new Set([n.join(''), n.filter((x) => !PARTICULES.has(x)).join('')])) {
      if (N.length < 2) continue;
      formes.add(N);
      for (const avant of [P, P1, I, I1]) if (avant) { formes.add(avant + N); formes.add(N + avant); }
    }
  }
  if (P.length >= 3) formes.add(P);
  if (P1.length >= 3) formes.add(P1);
  return formes;
}
// { ok, personne } ou { ok: false, raison } : invalide, generique, societe, autre.
function jugerAdresse(email, personnes, entreprise) {
  const a = normEmail(email);
  if (!EMAIL_RE.test(a)) return { ok: false, raison: 'invalide' };
  const local = a.split('@')[0].normalize('NFD').replace(/\p{M}/gu, '');
  const jetons = local.split(/[._+-]|\d+/).filter(Boolean);
  const compact = local.replace(/[._+-]/g, '');
  if (ADRESSES_GENERALES.has(compact) || jetons.some((j) => ADRESSES_GENERALES.has(j)) || /^(no|ne)-?(reply|pas-?repondre)/.test(local)) return { ok: false, raison: 'generique' };
  // Au nom de la société : toute la dénomination (laqueste.alessi@, adamiconstruction@), même quand elle porte le nom du
  // dirigeant (chiarizia@ pour CHIARIZIA : impossible de savoir qui lit cette boîte).
  const societe = motsDe(entreprise).filter((m) => !FORMES_JURIDIQUES.has(m)).join('');
  if (societe.length >= 3 && (compact === societe || compact.replace(/\d+/g, '') === societe)) return { ok: false, raison: 'societe' };
  const qui = (personnes || []).filter((p) => formesDuNom(p).has(compact));
  // safar@ quand le registre a Olivier et Patrick Safar : impossible de savoir lequel la lit (12/11, base Google Maps).
  if (qui.length > 1 && qui.some((p) => !memePersonne(p, qui[0]))) return { ok: false, raison: 'ambigue' };
  if (qui.length) return { ok: true, personne: qui[0] };
  return { ok: false, raison: 'autre' };
}
const memePersonne = (p, c) => {
  const n1 = new Set(motsDe(p?.nom));
  const n2 = motsDe(c?.nom);
  return n2.length > 0 && n2.every((x) => n1.has(x)) && motsDe(String(p?.prenom || '').split(/\s+/)[0])[0] === motsDe(c?.prenom)[0];
};
// Le dirigeant de la ligne d'abord, puis les co-dirigeants du registre (relu pour une ligne d'avant le 12/11 qui ne les a pas).
async function personnesDe(e, c) {
  let reg = e.faits?.registre;
  const siren = String(e.faits?.prospect?.siren || '').replace(/\D/g, '');
  if (reg?.trouve && !Array.isArray(reg.personnes) && /^\d{9}$/.test(siren)) {
    const frais = await lireRegistre(siren, c);
    if (frais?.trouve) { reg = frais; e.faits = { ...(e.faits || {}), registre: frais }; }
  }
  const liste = c ? [{ prenom: c.prenom || '', nom: c.nom || '', contact: true }] : [];
  for (const p of reg?.personnes || []) if (!c || !memePersonne(p, c)) liste.push({ ...p, contact: false });
  return liste;
}

// Le domaine reçoit-il des emails ? 'oui', 'non' (pas de MX, ou un MX nul, RFC 7505), 'inconnu' (le DNS ne répond pas :
// la ligne attend, on ne conclut rien).
const MX_VUS = new Map();
async function avecDelai(promesse, ms) {
  let minuteur;
  return Promise.race([promesse, new Promise((_, rejeter) => { minuteur = setTimeout(() => rejeter(Object.assign(new Error('délai DNS'), { code: 'ETIMEOUT' })), ms); })]).finally(() => clearTimeout(minuteur));
}
async function mxDuDomaine(domaine) {
  const d = String(domaine || '').toLowerCase().replace(/\.$/, '');
  if (!DOMAINE_RE.test(d)) return 'non';
  const vu = MX_VUS.get(d);
  if (vu && Date.now() - vu.le < 3600000) return vu.reponse;
  let reponse;
  try {
    const mx = await avecDelai(dns.promises.resolveMx(d), 4000);
    reponse = mx.length && mx.some((m) => m.exchange && m.exchange !== '.') ? 'oui' : 'non';
  } catch (e) {
    reponse = ['ENOTFOUND', 'ENODATA', 'NXDOMAIN'].includes(e?.code) ? 'non' : 'inconnu';
  }
  if (reponse !== 'inconnu') MX_VUS.set(d, { reponse, le: Date.now() });
  return reponse;
}

// Lire le site de l'entreprise : l'accueil et quelques pages probables (contact, mentions légales, qui sommes-nous,
// équipe), 4 secondes et 600 Ko par page au plus, jamais un lien vers un autre site, et seulement ce que robots.txt permet.
const UA_SITE = 'Mozilla/5.0 (compatible; CRM-prospection/1.0)';
const PAGES_PROBABLES_RE = /contact|mentions|l[ée]gal|qui[-_ ]?sommes|a[-_ ]?propos|about|[ée]quipe|team|notre[-_ ]entreprise|soci[ée]t[ée]|entreprise|nous/i;
const PLATEFORMES = ['facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com', 'youtube.com', 'pagesjaunes.fr', 'societe.com', 'google.com', 'goo.gl'];
const IP_PRIVEE_RE = /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd][0-9a-f]{2}:|fe80:)/i;
function hoteAutorise(h) {
  const hote = String(h || '').toLowerCase();
  if (!DOMAINE_RE.test(hote) || /^\d+(\.\d+){3}$/.test(hote) || hote === 'localhost') return false;
  return !PLATEFORMES.some((p) => hote === p || hote.endsWith(`.${p}`));
}
// Le nom doit mener à une adresse publique (jamais une adresse interne du serveur, même si un annuaire la donnait).
async function hotePublic(hote) {
  try { const { address } = await avecDelai(dns.promises.lookup(hote), 3000); return !IP_PRIVEE_RE.test(address); } catch { return false; }
}
async function lirePage(url, { max = 600000, html = true } = {}) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA_SITE, accept: html ? 'text/html,application/xhtml+xml;q=0.9' : 'text/plain' }, redirect: 'follow', signal: AbortSignal.timeout(4000) });
    const finale = r.url || url;
    if (!r.ok || (html && !/text\/html|application\/xhtml/i.test(r.headers.get('content-type') || ''))) {
      try { await r.body?.cancel(); } catch { /* rien */ }
      return { statut: r.status, url: finale, texte: '' };
    }
    const lecteur = r.body?.getReader?.();
    if (!lecteur) return { statut: r.status, url: finale, texte: (await r.text()).slice(0, max) };
    const morceaux = [];
    let n = 0;
    while (n < max) {
      const { done, value } = await lecteur.read();
      if (done) break;
      morceaux.push(Buffer.from(value));
      n += value.length;
    }
    try { await lecteur.cancel(); } catch { /* rien */ }
    return { statut: r.status, url: finale, texte: Buffer.concat(morceaux).toString('utf8').slice(0, max) };
  } catch (e) {
    return { statut: 0, url, texte: '', erreur: e?.name || 'réseau' };
  }
}
// robots.txt : les règles du groupe « * » (ou du nôtre). null : le fichier ne répond pas (5xx, réseau) et on ne lit rien.
function reglesRobots(texte) {
  const groupes = [];
  let courant = null;
  let enTete = false;
  for (const brute of String(texte || '').split(/\r?\n/)) {
    const ligne = brute.replace(/#.*/, '').trim();
    const i = ligne.indexOf(':');
    if (i < 0) continue;
    const cle = ligne.slice(0, i).trim().toLowerCase();
    const valeur = ligne.slice(i + 1).trim();
    if (cle === 'user-agent') {
      if (!courant || !enTete) { courant = { agents: [], regles: [] }; groupes.push(courant); }
      courant.agents.push(valeur.toLowerCase());
      enTete = true;
      continue;
    }
    enTete = false;
    if (courant && (cle === 'allow' || cle === 'disallow') && valeur) courant.regles.push({ permis: cle === 'allow', chemin: valeur });
  }
  const notres = groupes.filter((g) => g.agents.some((a) => a !== '*' && 'crm-prospection'.includes(a)));
  return (notres.length ? notres : groupes.filter((g) => g.agents.includes('*'))).flatMap((g) => g.regles);
}
function cheminPermis(regles, chemin) {
  let meilleure = null;
  for (const r of regles) {
    const fin = r.chemin.endsWith('$');
    const motif = (fin ? r.chemin.slice(0, -1) : r.chemin).split('*').map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
    if (!new RegExp(`^${motif}${fin ? '$' : ''}`).test(chemin)) continue;
    if (!meilleure || r.chemin.length > meilleure.chemin.length || (r.chemin.length === meilleure.chemin.length && r.permis)) meilleure = r;
  }
  return !meilleure || meilleure.permis;
}
async function lireRobots(origine) {
  const r = await lirePage(`${origine}/robots.txt`, { max: 100000, html: false });
  if (r.statut === 0 || r.statut >= 500) return null;
  if (r.statut >= 400) return [];
  return reglesRobots(r.texte);
}
// Les adresses d'une page : liens mailto, texte (« nom [at] domaine [point] fr » compris), données structurées, et les
// adresses que Cloudflare cache (data-cfemail : un simple XOR avec le premier octet).
function emailsDuHtml(html) {
  const vues = new Set();
  const ajouter = (x) => {
    const a = String(x || '').trim().toLowerCase().replace(/^mailto:/, '').split('?')[0];
    const d = a.split('@')[1] || '';
    if (EMAIL_RE.test(a) && !/\.(png|jpe?g|gif|webp|svg|css|js|ico)$/.test(a) && !/(^|\.)(example|exemple|domain|domaine|sentry|wixpress|votresite|votre-site)\./.test(d)) vues.add(a);
  };
  const cloudflare = (hex) => { const k = parseInt(hex.slice(0, 2), 16); let s = ''; for (let i = 2; i + 1 < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ k); return s; };
  for (const m of html.matchAll(/data-cfemail\s*=\s*["']([0-9a-f]{4,400})["']/gi)) ajouter(cloudflare(m[1]));
  for (const m of html.matchAll(/email-protection#([0-9a-f]{4,400})/gi)) ajouter(cloudflare(m[1]));
  for (const m of html.matchAll(/href\s*=\s*["']\s*mailto:([^"'?]+)/gi)) { try { ajouter(decodeURIComponent(m[1])); } catch { ajouter(m[1]); } }
  const texte = decoderEntites(html.replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (x, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&commat;/gi, '@').replace(/&period;/gi, '.'))
    .replace(/\s*[[({]\s*(?:at|arobase|@)\s*[\])}]\s*/gi, '@').replace(/\s*[[({]\s*(?:dot|point)\s*[\])}]\s*/gi, '.');
  for (const m of texte.matchAll(/[a-z0-9][a-z0-9._%+-]*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi)) ajouter(m[0]);
  return [...vues];
}
function liensProbables(html, base, hote) {
  const rang = (u) => (/contact/i.test(u) ? 0 : /mentions|l[ée]gal/i.test(u) ? 1 : /qui|propos|about|equipe|team/i.test(u) ? 2 : 3);
  const liens = new Set();
  for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]{0,300}?)<\/a>/gi)) {
    let u;
    try { u = new URL(decoderEntites(m[1]).trim(), base); } catch { continue; }
    // Jamais un lien vers un autre site.
    if (!/^https?:$/.test(u.protocol) || sansWww(u.hostname) !== sansWww(hote)) continue;
    if (/\.(pdf|jpe?g|png|gif|webp|zip|docx?|xlsx?)$/i.test(u.pathname)) continue;
    if (!PAGES_PROBABLES_RE.test(`${u.pathname} ${texteBrut(m[2])}`)) continue;
    u.hash = '';
    liens.add(u.toString());
  }
  return [...liens].sort((a, b) => rang(a) - rang(b)).slice(0, 4);
}
async function lireSite(depart) {
  const r = { site: null, pages: [], emails: [], robots: null, erreur: null };
  let u;
  try { u = new URL(/^https?:\/\//i.test(depart) ? depart : `https://${depart}`); } catch { r.erreur = 'adresse du site illisible'; return r; }
  const hote = u.hostname.toLowerCase();
  if (!hoteAutorise(hote)) { r.erreur = 'site exclu (réseau social, annuaire ou adresse non publique)'; return r; }
  if (!(await hotePublic(hote))) { r.erreur = 'site injoignable'; return r; }
  r.site = `${u.protocol}//${hote}/`;
  const regles = await lireRobots(`${u.protocol}//${hote}`);
  if (regles === null) { r.robots = 'injoignable'; r.erreur = 'robots.txt ne répond pas : le site n\'est pas lu'; return r; }
  const permis = (x) => { try { const v = new URL(x); return cheminPermis(regles, `${v.pathname}${v.search}`); } catch { return false; } };
  const accueil = u.pathname && u.pathname !== '/' ? u.toString() : r.site;
  if (!permis(accueil)) { r.robots = 'interdit'; r.erreur = 'robots.txt interdit la lecture du site'; return r; }
  r.robots = 'permis';
  const p0 = await lirePage(accueil);
  let finale;
  try { finale = new URL(p0.url || accueil); } catch { finale = u; }
  if (sansWww(finale.hostname) !== sansWww(hote)) { r.erreur = `l'accueil renvoie vers un autre site (${finale.hostname}) : pas lu`; return r; }
  if (!p0.texte) { r.erreur = `accueil illisible (${p0.statut || p0.erreur || 'erreur'})`; return r; }
  const lues = [{ url: finale.toString(), html: p0.texte }];
  let liens = liensProbables(p0.texte, finale.toString(), hote);
  if (!liens.length) liens = ['/contact', '/mentions-legales'].map((x) => new URL(x, finale).toString());
  liens = liens.filter(permis);
  const pages = await Promise.all(liens.map((x) => lirePage(x)));
  pages.forEach((p, i) => {
    let f;
    try { f = new URL(p.url || liens[i]); } catch { return; }
    if (p.texte && sansWww(f.hostname) === sansWww(hote)) lues.push({ url: f.toString(), html: p.texte });
  });
  for (const p of lues) {
    r.pages.push(p.url);
    for (const email of emailsDuHtml(p.html)) if (!r.emails.some((x) => x.email === email)) r.emails.push({ email, url: p.url });
  }
  return r;
}
// Le site : celui que l'ADEME donne, sinon celui de la fiche, sinon le domaine d'une adresse publique de l'entreprise
// (ADEME, BOAMP) quand ce n'est pas un webmail.
function siteDe(f, l) {
  if (f.rge?.site) return f.rge.site;
  if (l?.site_web) return l.site_web;
  for (const email of [...(f.rge?.emails || []), ...(f.boamp || []).map((x) => x.email), ...(f.adresse_connue?.email ? [f.adresse_connue.email] : [])]) {
    const d = String(email).split('@')[1];
    if (d && !WEBMAILS.has(d) && DOMAINE_RE.test(d)) return `https://${d}/`;
  }
  return null;
}
const CODES_ADRESSE = { invalide: 'adresse_invalide', generique: 'adresse_generale', societe: 'adresse_societe', autre: 'adresse_autre_personne', ambigue: 'adresse_ambigue' };
const SOURCES_GRATUITES = { site: "site de l'entreprise", ademe: "annuaire RGE de l'ADEME", boamp: 'avis BOAMP' };

/* ----- Le repli sur l'adresse générale de l'entreprise (l'accueil), en dernier recours ----- */

// Gabriel, 12/11 à 17 h : « j'aimerais aussi qu'on tente de les contacter en direct, même si on sait que c'est des mails
// génériques. on tente de personnaliser par rapport au domaine etc mais en prenant en compte qu'on écrit à l'accueil ».
// Seulement quand aucune adresse du dirigeant n'est disponible ; le registre reste bloquant. Acceptée : la boîte de
// l'entreprise elle-même (contact@, info@, accueil@, secretariat@, agence@…, ou à son nom ou à celui de sa commune, même sur
// un webmail : laqueste.alessi@wanadoo.fr, chatillon@ pour une agence de Châtillon), vue dans une source publique.
// Refusées : un autre salarié (catherine@), une autre agence du réseau ou un siège (amiens@maif.fr pour Chaumont), une
// agence web (domaine d'un autre site), un service (compta@, rh@, recrutement@, sav@, noreply…). Rang : 0 contact@, info@,
// accueil@, secretariat@ du domaine de l'entreprise ; 1 agence@, bureau@, direction@… ; 2 au nom de la société ou de la
// commune (et tout webmail) ; 3 commercial@ ; 4 devis@ (seulement s'il n'y a rien de plus général).
const RANGS_ACCUEIL = { contact: 0, contacts: 0, info: 0, infos: 0, information: 0, informations: 0, accueil: 0, secretariat: 0,
  agence: 1, bureau: 1, bureaux: 1, direction: 1, administration: 1, administratif: 1, hello: 1, bonjour: 1, mail: 1, email: 1, courrier: 1,
  office: 1, standard: 1, reception: 1, renseignements: 1, gestion: 1, cabinet: 1, siege: 1, general: 1, generale: 1, commercial: 3, commerciale: 3, devis: 4 };
const SERVICES_REFUSES = new Set(['noreply', 'nepasrepondre', 'compta', 'comptabilite', 'facturation', 'facture', 'factures', 'paie', 'rh', 'drh',
  'recrutement', 'emploi', 'emplois', 'jobs', 'job', 'candidature', 'candidatures', 'sav', 'webmaster', 'postmaster', 'hostmaster', 'admin', 'dpo',
  'rgpd', 'privacy', 'newsletter', 'marketing', 'presse', 'abuse', 'support', 'technique', 'informatique', 'juridique', 'communication', 'achat', 'achats']);
const MOTS_VIDES_COMMUNE = new Set(['le', 'la', 'les', 'l', 'de', 'des', 'du', 'd', 'sur', 'sous', 'en', 'lez', 'et', 'aux', 'au', 'cedex']);
const RANG_SOURCE_GENERALE = { site: 0, ademe: 1, boamp: 2, outscraper: 3 };
const SOURCES_GENERALES = { ...SOURCES_GRATUITES, outscraper: 'base Google Maps (Outscraper)' };
// Un morceau d'adresse fait-il de mots connus, chacun d'au moins 2 lettres et l'un d'au moins 3 (« amcest », « contactamc ») ?
function decoupable(jeton, mots) {
  const ok = new Array(jeton.length + 1).fill(null);
  ok[0] = { long: false };
  for (let i = 0; i < jeton.length; i++) {
    if (!ok[i]) continue;
    for (const m of mots) if (m.length >= 2 && jeton.startsWith(m, i) && !ok[i + m.length]) ok[i + m.length] = { long: ok[i].long || m.length >= 3 };
  }
  return Boolean(ok[jeton.length]?.long);
}
function jugerGenerale(email, { entreprise, communes = [], domaineSite = null }) {
  const a = normEmail(email);
  if (!EMAIL_RE.test(a)) return { ok: false, raison: 'invalide' };
  const [loc, dom] = a.split('@');
  const local = loc.normalize('NFD').replace(/\p{M}/gu, '');
  const jetons = local.split(/[._+-]|\d+/).filter(Boolean);
  const compact = jetons.join('');
  if (!jetons.length || /^(no|ne)-?(reply|pas-?repondre)/.test(local) || jetons.some((j) => SERVICES_REFUSES.has(j)) || SERVICES_REFUSES.has(compact)) return { ok: false, raison: 'service' };
  const webmail = WEBMAILS.has(dom);
  if (!webmail && domaineSite && sansWww(dom) !== domaineSite && !dom.endsWith(`.${domaineSite}`)) return { ok: false, raison: 'domaine' };
  // Le nom de la société (sans les mots du métier), ses initiales (era@ pour « Etude et Réalisation d'Assurances »), le nom
  // de son domaine (erassur@erassur.com) et sa commune.
  const motsNom = motsDe(entreprise).filter((m) => !['et', 'de', 'd', 'du', 'des', 'la', 'le', 'l', 'les', 'sa', 'sarl', 'sas', 'sasu', 'eurl', 'sci', 'snc'].includes(m));
  const initiales = motsNom.length >= 2 ? motsNom.map((m) => m[0]).join('') : '';
  const etiquette = webmail ? '' : (dom.split('.').slice(-2)[0] || '').replace(/[^a-z0-9]/g, '');
  const propres = [...new Set([...motsDe(entreprise).filter((m) => !FORMES_JURIDIQUES.has(m)), ...communes.flatMap((c) => motsDe(c)).filter((m) => !MOTS_VIDES_COMMUNE.has(m)), initiales, etiquette])].filter((m) => m.length >= 2);
  const generaux = Object.keys(RANGS_ACCUEIL);
  const tous = [...new Set([...propres, ...generaux, ...[...FORMES_JURIDIQUES].filter((m) => m.length >= 2)])];
  // Un mot inconnu (un prénom, une autre ville, un service) : la boîte d'un autre, pas celle de l'accueil.
  if (!jetons.every((j) => decoupable(j, tous))) return { ok: false, raison: 'autre_boite' };
  const aPropre = jetons.some((j) => propres.some((m) => m.length >= 3 && j.includes(m)));
  if (webmail && !aPropre) return { ok: false, raison: 'autre_boite' };
  const g = Math.min(...jetons.map((j) => RANGS_ACCUEIL[j] ?? 9));
  const rang = webmail ? Math.max(2, g === 9 ? 2 : g) : g <= 1 ? g : g === 9 ? 2 : g;
  return { ok: true, rang, type: g <= 1 && !webmail ? 'accueil' : 'societe' };
}
const MOTIFS_GENERALE = { invalide: 'adresse invalide', service: "adresse d'un service (compta, RH, recrutement, SAV, noreply…)", domaine: "domaine d'un autre site (agence web, hébergeur…)",
  autre_boite: "boîte d'une autre personne, d'une autre agence du réseau ou d'un siège", mx: 'domaine sans serveur de messagerie (MX)' };
// Les adresses générales possibles d'une ligne, d'après ce qui a déjà été lu (site, ADEME, BOAMP de moins de 24 mois, base
// Google Maps), de la meilleure à la moins bonne ; et celles écartées, avec la raison.
function adressesGeneralesDe(e, l) {
  const f = e.faits || {};
  const site = f.adresse?.site || siteDe(f, l);
  let domaineSite = null;
  try { domaineSite = site ? sansWww(new URL(/^https?:\/\//i.test(site) ? site : `https://${site}`).hostname) : null; } catch { /* rien */ }
  const communes = [f.registre?.siege?.commune, f.rdv?.commune, f.prospect?.commune, String(l?.localisation || '').replace(/\s*\(.*$/, '')].filter(Boolean);
  const depuis = ajouterJoursIso(aujourdHuiParis(), -730);
  const vus = new Set(); const choisies = []; const ecartees = [];
  const examiner = (email, source, url, dejaRefusee = null) => {
    const a = normEmail(email);
    if (!EMAIL_RE.test(a) || vus.has(a)) return;
    vus.add(a);
    // Une adresse d'un autre domaine déjà écartée sur le site (agence web) le reste ; les autres sont jugées ici.
    const j = dejaRefusee === MOTIFS_ADRESSE.domaine ? { ok: false, raison: 'domaine' } : jugerGenerale(a, { entreprise: l?.entreprise, communes, domaineSite: source === 'site' ? domaineSite : null });
    if (j.ok) choisies.push({ email: a, source, url: url || null, rang: j.rang, type: j.type });
    else ecartees.push({ email: a, source, raison: MOTIFS_GENERALE[j.raison] || j.raison });
  };
  for (const v of [...(f.adresse?.vues_dirigeant || []), ...(f.adresse?.vues || [])]) examiner(v.email, v.source || 'site', v.url, v.raison);
  for (const em of f.rge?.emails || []) examiner(em, 'ademe', f.rge?.lien);
  for (const x of f.boamp || []) if (!x.date || x.date >= depuis) examiner(x.email, 'boamp', x.url);
  if (f.adresse_connue?.email && f.adresse_connue.fiabilite === 'fiable') examiner(f.adresse_connue.email, 'outscraper', null);
  choisies.sort((a, b) => a.rang - b.rang || (RANG_SOURCE_GENERALE[a.source] ?? 9) - (RANG_SOURCE_GENERALE[b.source] ?? 9));
  return { choisies, ecartees };
}
// Le repli : la meilleure adresse générale qui reçoit des emails (MX), ou sans adresse pour Anna, avec la raison.
async function repliAdresseGenerale(e, l, c, raison, bilan = null, { rattrapage = false } = {}) {
  const { choisies, ecartees } = adressesGeneralesDe(e, l);
  const essai = { le: new Date().toISOString(), raison: couper(raison, 300), ecartees: ecartees.slice(0, 8) };
  for (const g of choisies) {
    if (await enOpposition(g.email)) { essai.ecartees.push({ email: g.email, source: g.source, raison: 'adresse en opposition' }); continue; }
    const mx = await mxDuDomaine(g.email.split('@')[1]);
    if (mx === 'inconnu') { await majLigneEmail(e.id, { detail: "Le DNS ne répond pas pour vérifier l'adresse générale : nouvel essai au prochain passage." }); return { attente: true }; }
    if (mx !== 'oui') { essai.ecartees.push({ email: g.email, source: g.source, raison: MOTIFS_GENERALE.mx }); continue; }
    // La page montre ce qui a été écarté pour l'accueil ; ce qui l'avait été en cherchant le dirigeant reste à côté.
    const avant = e.faits?.adresse || {};
    const adresse = { ...avant, generique: true, email: g.email, source: g.source, url: g.url, rang: g.rang, personne: null, cherchee_le: avant.cherchee_le || essai.le, vues_dirigeant: avant.vues_dirigeant || avant.vues || [], vues: essai.ecartees.slice(0, 8) };
    await majLigneEmail(e.id, { statut: 'a_rediger', email: g.email, email_statut: 'GENERIQUE', source_email: 'site', fullenrich_id: null, detail: null, faits: { ...(e.faits || {}), adresse, repli: essai } });
    if (l) {
      await journalEmail(l, c, 'note', `Prospection email : pas d'adresse de ${nomContactEmail(c)} (${couper(raison, 200)}). Adresse générale de l'entreprise : ${g.email} (${SOURCES_GENERALES[g.source] || g.source}${g.url ? ` : ${g.url}` : ''}), message pour l'accueil à son attention.`, null, { etape: 'adresse', email: g.email, generique: true });
      if (/^Email :/.test(l.prochaine_note || '')) await sb(`iae_crm_leads?id=eq.${l.id}`, { methode: 'PATCH', prefer: 'return=minimal', corps: { prochaine_note: "Email : pas d'adresse du dirigeant, message à l'accueil (adresse générale), à valider dans « Emails à valider »." } });
    }
    if (bilan) bilan.generales = (bilan.generales || 0) + 1;
    return { posee: true, email: g.email };
  }
  // Le rattrapage d'une ligne déjà « sans adresse » ne réécrit pas l'historique : seulement la raison et l'essai.
  if (rattrapage) await majLigneEmail(e.id, { faits: { ...(e.faits || {}), repli: essai }, detail: `${raison}, et aucune adresse générale de l'entreprise utilisable : la fiche reste pour Anna, au téléphone.`.slice(0, 1000) });
  else { await sansAdresse(e, l, c, `${raison}, et aucune adresse générale de l'entreprise utilisable`, { faits: { ...(e.faits || {}), repli: essai } }); if (bilan) bilan.sans_email++; }
  return { posee: false };
}
// La recherche gratuite d'une ligne : l'ADEME et le BOAMP (déjà lus avec les faits publics), puis le site. Elle rend
// { adresse } (ce qui a été vu, pour les faits), { trouvee } (la première adresse du dirigeant dont le domaine a un MX)
// ou { attente } (le DNS n'a pas répondu : on recommencera).
async function chercherAdresseGratuite(e, l, c) {
  const f = { ...(e.faits || {}) };
  const siren = String(f.prospect?.siren || l?.siret || '').replace(/\D/g, '').slice(0, 9);
  // Une ligne lue par la première version (matin du 12/11) n'a ni les adresses de l'ADEME, ni le BOAMP : on les lit maintenant.
  if (/^\d{9}$/.test(siren) && (!f.rge || !('emails' in f.rge) || f.boamp === undefined)) {
    const depuis = ajouterJoursIso(aujourdHuiParis(), -730);
    const [rge, boamp] = await Promise.all([lireRge(siren), lireBoamp(siren, depuis)]);
    if (rge) f.rge = rge;
    if (boamp) f.boamp = boamp;
  }
  e.faits = f;
  const personnes = await personnesDe(e, c);
  const vues = [];
  const candidates = [];
  const examiner = (email, source, url, domaineSite = null) => {
    if (vues.some((v) => v.email === email) || candidates.some((x) => x.email === email)) return;
    const d = email.split('@')[1] || '';
    if (domaineSite && !WEBMAILS.has(d) && sansWww(d) !== domaineSite && !d.endsWith(`.${domaineSite}`)) { vues.push({ email, source, url, raison: MOTIFS_ADRESSE.domaine }); return; }
    const j = jugerAdresse(email, personnes, l?.entreprise);
    if (!j.ok) { vues.push({ email, source, url, raison: MOTIFS_ADRESSE[j.raison] }); return; }
    candidates.push({ email, source, url, personne: j.personne });
  };
  for (const email of e.faits.rge?.emails || []) examiner(email, 'ademe', e.faits.rge.lien || null);
  // Le dirigeant : avis de moins de 12 mois ; les plus anciens (jusqu'à 24 mois) ne servent qu'à l'adresse générale.
  const depuis12 = ajouterJoursIso(aujourdHuiParis(), -365);
  for (const x of e.faits.boamp || []) if (!x.date || x.date >= depuis12) examiner(x.email, 'boamp', x.url);
  const site = siteDe(e.faits, l);
  let lecture = null;
  if (site && !candidates.some((x) => x.personne.contact)) {
    lecture = await lireSite(site);
    const domaineSite = lecture.site ? sansWww(new URL(lecture.site).hostname) : null;
    for (const x of lecture.emails) examiner(x.email, 'site', x.url, domaineSite);
  }
  // Le dirigeant de la ligne avant un co-dirigeant ; le site avant l'ADEME et le BOAMP.
  const ordre = { site: 0, ademe: 1, boamp: 2 };
  candidates.sort((a, b) => (a.personne.contact ? 0 : 1) - (b.personne.contact ? 0 : 1) || ordre[a.source] - ordre[b.source]);
  let trouvee = null;
  let incertain = false;
  for (const x of candidates) {
    const mx = await mxDuDomaine(x.email.split('@')[1]);
    if (mx === 'oui') { trouvee = x; break; }
    if (mx === 'non') vues.push({ email: x.email, source: x.source, url: x.url, raison: MOTIFS_ADRESSE.mx });
    else incertain = true;
  }
  if (!trouvee && incertain) return { attente: "Le DNS ne répond pas pour vérifier le domaine d'une adresse trouvée : nouvel essai au prochain passage." };
  const adresse = {
    cherchee_le: new Date().toISOString(), site: lecture?.site || site || null, pages: (lecture?.pages || []).slice(0, 6),
    robots: lecture?.robots || null, site_erreur: lecture?.erreur || null, vues: vues.slice(0, 12),
    ...(trouvee ? { email: trouvee.email, source: trouvee.source, url: trouvee.url, personne: [trouvee.personne.prenom, trouvee.personne.nom].filter(Boolean).join(' ') } : {}),
  };
  return { adresse, trouvee };
}
// Pose l'adresse retenue sur la ligne. Si c'est celle d'un co-dirigeant, l'email lui est adressé : son contact (créé au
// besoin), sans civilité inventée (« Bonjour Prénom Nom, »), et un brouillon déjà écrit pour un autre est rédigé à nouveau.
async function poserAdresse(e, l, c, { email, personne, source_email, email_statut, faits = null, journal = '' }) {
  let contact = c;
  let civilite = e.civilite;
  if (personne && !personne.contact && l) {
    const { lignes: cs } = await sb(`iae_crm_contacts?lead_id=eq.${l.id}&select=*`);
    contact = cs.find((x) => memePersonne(personne, x)) || null;
    if (!contact) {
      const prenom = motsDe(String(personne.prenom || '').split(/\s+/)[0]).map((x) => x[0].toUpperCase() + x.slice(1)).join('-');
      const nom = nomPropre(String(personne.nom || '').replace(/\s*\([^)]*\)/g, '').trim());
      ({ lignes: [contact] } = await sb('iae_crm_contacts', { methode: 'POST', prefer: 'return=representation', corps: { lead_id: l.id, prenom: prenom || null, nom: nom || null, poste: personne.qualite || null, email, principal: false } }));
    }
    civilite = null;
  }
  if (contact && !contact.email) await sb(`iae_crm_contacts?id=eq.${contact.id}`, { methode: 'PATCH', prefer: 'return=minimal', corps: { email } });
  const autre = Boolean(contact && c && contact.id !== c.id);
  const valeurs = { email, email_statut, source_email, fullenrich_id: null, detail: null, contact_id: contact?.id || e.contact_id, civilite, ...(faits ? { faits } : {}) };
  if (['a_enrichir', 'sans_email'].includes(e.statut) || (autre && ['brouillon', 'echec', 'a_rediger'].includes(e.statut))) valeurs.statut = 'a_rediger';
  const ligne = await majLigneEmail(e.id, valeurs);
  if (l && journal) await journalEmail(l, contact, 'note', journal.replace('{qui}', nomContactEmail(contact)), null, { etape: 'adresse', email });
  return ligne;
}
// La ligne n'a pas d'adresse nominative : elle reste pour Anna, au téléphone.
async function sansAdresse(e, l, c, raison, valeurs = {}) {
  await majLigneEmail(e.id, { statut: 'sans_email', detail: `${raison} : la fiche reste pour Anna, au téléphone.`.slice(0, 1000), ...valeurs });
  if (!l) return;
  await journalEmail(l, c, 'note', `Prospection email : pas d'adresse pour ${nomContactEmail(c)}. ${raison} : la fiche reste pour Anna, au téléphone.`, null, { etape: 'sans_email' });
  if (/^Email :/.test(l.prochaine_note || '')) await sb(`iae_crm_leads?id=eq.${l.id}`, { methode: 'PATCH', prefer: 'return=minimal', corps: { prochaine_note: "Email : pas d'adresse du dirigeant. La fiche reste pour Anna, au téléphone." } });
}

/* ----- FullEnrich, pour les seuls contacts « ultra qualifiés » ----- */
// Gabriel, 12/11 : « sinon un peu de fullenrich sur des contacts ultra qualifiés ». Un crédit ne se dépense que si toutes
// ces conditions sont réunies (et qu'aucune adresse du dirigeant n'a été trouvée gratuitement) ; 3 par jour par défaut
// (réglage email_prospection.enrichissements). Les autres passent en sans_email, avec la raison.
const ULTRA_QUALIFIE = {
  secteurs: ['BTP', 'Propreté', 'Assurance'], // le niveau 1 du cœur de cible (le BTP de la liste Altares est celui du bâtiment)
  effectif: [10, 49], // salariés : la tranche de la liste d'Anna, sinon celle du registre
  mois: 12, // l'âge maximal du fait fort
};
const TRANCHES_INSEE = { '00': [0, 0], '01': [1, 2], '02': [3, 5], '03': [6, 9], 11: [10, 19], 12: [20, 49], 21: [50, 99], 22: [100, 199], 31: [200, 249], 32: [250, 499] };
function effectifDe(e) {
  const m = String(e.faits?.prospect?.salaries || '').match(/(\d+)\s*(?:à|a|-)\s*(\d+)/);
  if (m) return [Number(m[1]), Number(m[2])];
  return TRANCHES_INSEE[e.faits?.registre?.effectif] || null;
}
// Un développement au BODACC : transfert, nouvel établissement, augmentation de capital (les libellés vus le 12/11/2026 :
// « modification survenue sur le capital (augmentation) », « Transfert du siège… », « Nouveau siège. », un établissement secondaire).
function developpementBodacc(a, creation) {
  const d = String(a.detail || '');
  if (/capital \(augmentation\)|augmentation (du |de )?capital/i.test(d)) return 'augmentation de capital';
  if (/transfert|nouveau si[eè]ge|adresse du si[eè]ge/i.test(d)) return 'transfert';
  if (a.secondaire || (['creation', 'immatriculation'].includes(a.famille) && creation && creation < ajouterJoursIso(a.date, -365))) return 'nouvel établissement';
  return null;
}
function faitsForts(f) {
  const depuis = ajouterJoursIso(aujourdHuiParis(), -Math.round(ULTRA_QUALIFIE.mois * 30.5));
  const forts = [];
  for (const m of f.marches || []) if (m.date >= depuis) forts.push({ fait: `marché public attribué : ${couper(m.objet, 120)}`, date: m.date });
  for (const q of f.rge?.qualifications || []) if (q.depuis && q.depuis >= depuis) forts.push({ fait: `qualification ${q.certificat || 'RGE'} : ${couper(q.qualification, 100)}`, date: q.depuis });
  for (const a of f.bodacc || []) { const dev = a.date >= depuis && developpementBodacc(a, f.registre?.creation); if (dev) forts.push({ fait: `${dev} (BODACC)`, date: a.date }); }
  return forts.sort((a, b) => b.date.localeCompare(a.date));
}
function ultraQualifie(e, l) {
  const f = e.faits || {};
  const r = f.registre || {};
  const manque = [];
  if (!(r.trouve && r.etat !== 'C' && !r.opposition && !r.filiale && !r.holding?.opposition && !r.difficulte && r.en_place)) manque.push('dirigeant non confirmé au registre');
  if (!ULTRA_QUALIFIE.secteurs.includes(l?.secteur)) manque.push(`secteur hors niveau 1 (${l?.secteur || 'inconnu'})`);
  const eff = effectifDe(e);
  if (!eff || eff[0] < ULTRA_QUALIFIE.effectif[0] || eff[1] > ULTRA_QUALIFIE.effectif[1]) manque.push(`effectif hors 10 à 49 (${eff ? `${eff[0]} à ${eff[1]}` : 'inconnu'})`);
  const forts = faitsForts(f);
  if (!forts.length) manque.push('aucun fait fort de moins de 12 mois');
  return { ok: manque.length === 0, manque, forts };
}

// Les faits pour Claude, datés et sourcés, du plus récent au plus ancien.
function faitsPourClaude(f) {
  const jour = aujourdHuiParis();
  const recents = [];
  for (const m of f.marches || []) recents.push([m.date, 'marchés publics attribués (DECP)', `marché notifié : ${m.objet}${m.lieu ? ` (lieu d'exécution : ${m.lieu})` : ''}`]);
  for (const q of f.rge?.qualifications || []) if (q.depuis && q.depuis >= ajouterJoursIso(jour, -365)) recents.push([q.depuis, "annuaire RGE de l'ADEME", `qualification obtenue ou renouvelée : « ${q.qualification} »${q.certificat ? ` (${q.certificat})` : ''}`]);
  for (const a of f.bodacc || []) recents.push([a.date, 'BODACC', `${a.libelle}${a.detail ? ` : ${a.detail}` : ''}`]);
  recents.sort((a, b) => b[0].localeCompare(a[0]));
  const autres = [];
  const creation = f.registre?.creation;
  if (creation && DATE_RE.test(creation)) {
    const an = Number(jour.slice(0, 4));
    let anniv = `${an}${creation.slice(4)}`;
    if (anniv < ajouterJoursIso(jour, -30)) anniv = `${an + 1}${creation.slice(4)}`;
    const ans = Number(anniv.slice(0, 4)) - Number(creation.slice(0, 4));
    const proche = anniv <= ajouterJoursIso(jour, 183);
    autres.push([creation, 'registre national des entreprises', `entreprise créée le ${dateCourte(creation)}${proche && ans > 0 ? ` : ${ans} ans le ${dateCourte(anniv)}` : ''}`]);
  }
  const anciennes = (f.rge?.qualifications || []).filter((q) => !q.depuis || q.depuis < ajouterJoursIso(jour, -365));
  if (anciennes.length) autres.push(['', "annuaire RGE de l'ADEME", `qualifications en cours : ${anciennes.map((q) => `« ${q.qualification} »`).join(', ')}`]);
  const ligne = ([d, s, t]) => `- ${d || 'sans date'} · ${s} · ${t}`;
  return { recents: recents.map(ligne), autres: autres.map(ligne) };
}

// Le schéma de la réponse : la liste fermée du reste du bureau est celle du métier.
const schemaEmail = (jeu) => ({
  type: 'object', additionalProperties: false,
  properties: {
    objet: { type: 'string' },
    accroche: { type: 'string' },
    valeur: { type: 'string' },
    reste: { type: 'array', items: { type: 'string', enum: jeu.reste } },
    document: { type: 'string' },
    general: { type: 'boolean' },
    // Gabriel, 13/11 : aucun fait ne passe le test du confrère → Claude le dit, au lieu d'inventer ; le brouillon attend Gabriel.
    accroche_faible: { type: 'boolean' },
    raison_faible: { type: 'string' },
    appuis: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { fait: { type: 'string' }, source: { type: 'string' }, date: { type: 'string' } }, required: ['fait', 'source', 'date'] } },
  },
  required: ['objet', 'accroche', 'valeur', 'reste', 'document', 'general', 'accroche_faible', 'raison_faible', 'appuis'],
});
const CONSIGNES_EMAIL = `Tu écris le premier email de prospection de Gabriel Vanderbecken (IA-Entrepreneur, organisme de formation à l'IA pour les entreprises, à Nancy) au dirigeant d'une petite entreprise (3 à 99 salariés) qu'il ne connaît pas. Gabriel le relit avant l'envoi. Le modèle a été validé par Gabriel le 12/11/2026 : « montrer que c'est du personnalisé + aller sur des valeurs ajoutées personnalisées mais aussi dire ce qu'on fait assez généralement ». Tu écris cinq morceaux (objet, accroche, valeur, reste, document) ; le CRM les place dans le modèle, le reste est fixe. Exemple validé, pour une entreprise du BTP qui a remporté des marchés publics cette année :

Objet : Vos appels d'offres

Bonjour Monsieur Vigneron,

J'ai vu que vous aviez remporté plusieurs chantiers publics cette année, dont la rénovation thermique d'une école.

Je forme les équipes du BTP à répondre plus vite aux appels d'offres avec l'IA, par exemple en partant de leurs anciens mémoires techniques, et aussi à alléger le reste du bureau : emails, devis, relation client. Les formations sont éligibles à votre budget formation.

Si ça vous parle, je peux vous montrer en 20 minutes ce que ça donne sur un de vos propres mémoires, en visio ou dans vos bureaux à Lunéville. Ça vous intéresse ?

Gabriel Vanderbecken
IA-Entrepreneur

Ici : accroche = « J'ai vu que vous aviez remporté plusieurs chantiers publics cette année, dont la rénovation thermique d'une école. » ; valeur = « répondre plus vite aux appels d'offres avec l'IA, par exemple en partant de leurs anciens mémoires techniques » ; reste = ["emails", "devis", "relation client"] ; document = « mémoires ». La phrase « Je forme les équipes {métier} à {valeur}, et aussi à alléger le reste du bureau : {reste}. Les formations sont éligibles à votre budget formation. », la proposition « Si ça vous parle, je peux vous montrer en 20 minutes de visio ce que ça donne sur un (ou une) de vos propres {document}. Ça vous intéresse ? » (près de Nancy : « … sur un de vos propres {document}, en visio ou dans vos bureaux à {commune}. Ça vous intéresse ? ») et la signature sont fixes : ne les écris pas. Le métier (« du BTP », « de la propreté », « des agences immobilières », « des cabinets d'assurance », « des PME »), le lieu et le jeu du métier (liste fermée du reste du bureau, exemples de valeur, de document et d'objet) sont donnés dans la fiche : tiens-t'en à ce jeu.

accroche : une seule phrase qui commence par « J'ai vu que vous », 15 à 30 mots, sur un seul fait réel de la fiche (Gabriel, 13/11).
- Le fait : de préférence daté de moins de 12 mois, ou un fait qui désigne directement la tâche de la valeur (un marché public gagné → les appels d'offres ; une qualification RGE → les dossiers d'aides ; une spécialité « le viager » → les annonces de viager).
- Le test du confrère : remplace l'entreprise par un confrère du même métier ; si la phrase de valeur ne change pas, le fait est trop faible.
- L'ancienneté (« installée à X depuis Y »), l'adresse, le nombre d'avis ou la note Google ne servent jamais seuls.
- La période juste : « cette année » seulement si tous les faits cités sont de l'année civile en cours (la date du jour est dans la fiche) ; sinon le mois et l'année (« en décembre 2025 »), ou « depuis l'an dernier ».
- Jamais de liste de chantiers ou de lieux (« dans un collège et dans un gymnase » est interdit) : un seul chantier, décrit par sa nature (« la rénovation thermique d'une école »). Jamais deux faits collés dans une phrase.
- Fidèle au périmètre réel : si l'entreprise n'a fait qu'un lot, dis le lot (« les sols et faïences de travaux d'accessibilité »), pas le chantier entier ; un seul marché ne devient pas « plusieurs ».
- Pas de « sûrement », pas de déduction sur leur charge de travail, pas de question.

valeur : une seule tâche, celle que le fait implique, à l'infinitif, suivie d'un exemple concret introduit par « par exemple » ; 10 à 20 mots, sans chiffre, sans point final, sans « à » devant (la phrase fixe le met). Inspire-toi des exemples du métier donnés dans la fiche, sans les recopier si un fait permet mieux. Agences immobilières : l'annonce, le compte rendu de visite ou les relances vendeurs et acquéreurs ; « répondre aux avis » seulement si la fiche montre des avis restés sans réponse.

reste : exactement trois tâches du quotidien du bureau, prises dans la liste fermée du métier donnée dans la fiche. Aucune ne redit la valeur (si la valeur parle des annonces, pas « annonces »).

document : le document de l'exemple, au pluriel, pour « sur un de vos propres … » (ou « une » : le CRM accorde) (exemples du métier dans la fiche : « mémoires », « annonces », « dossiers sinistres »…). Il doit coller à la valeur.

objet : 2 à 4 mots qui nomment la tâche ou le document de la valeur (Gabriel, 13/11 : « Vos mémoires techniques », « Vos dossiers d'aides », « Vos comparatifs », « Vos annonces », « Vos devis » ; ceux du métier sont dans la fiche). Jamais de chiffre, de nom de marque (Google…), ni « IA », « formation », « gratuit ». Il ne ressemble pas à un email de veille d'appels d'offres : jamais « Vos chantiers publics », « Vos marchés publics », « Nouveau marché », « Opportunité ». Pas de majuscules partout, pas de point d'exclamation, pas de question, pas de « Re: ».

Le message entier, hors signature, fait 75 à 95 mots : garde l'accroche et la valeur courtes. Une seule question dans tout le message : celle de la phrase fixe.

À l'accueil : quand la fiche dit que le message part à l'adresse générale de l'entreprise (Gabriel, 12/11 : « en prenant en compte qu'on écrit à l'accueil »), écris les mêmes morceaux, sans rien changer à l'accroche : elle reste « J'ai vu que vous… », adressée au dirigeant. Le CRM écrit avant elle « Bonjour, Ce message est à destination de Monsieur X, gérant. » et met « Monsieur X, » devant ton accroche ; l'objet devient « À l'attention de Monsieur X ».

Interdits :
- aucun montant, aucun prix, aucun chiffre de gain ou de ROI, même quand le marché public en donne un ;
- jamais le nom de l'acheteur ni d'un tiers : ni la commune, le département ou la région qui achète, ni le bailleur, ni le client, ni le nom d'une personne. Un lieu ou un bâtiment peut se nommer (« Haroué », « la Villa Majorelle », « une école ») ;
- jamais d'où vient l'adresse, ni comment tu connais l'entreprise : ni annuaire, ni fichier, ni registre, ni LinkedIn (règle de Gabriel du 28/10) ;
- aucun lien ni adresse email, pas de « gratuit », ni CPF, ni OPCO, ni « certifiante », ni code de certification, ni « reste à charge », ni « 100 % » ;
- pas de « nous connaissons bien le quotidien d'une entreprise comme la vôtre » ni rien qui prétend connaître leur quotidien (Gabriel, 12/11 : peut être mal perçu), pas de formule creuse (« j'espère que vous allez bien », « je me permets »), pas de tiret long, pas d'emoji, pas de point d'exclamation. Vouvoiement.

N'invente rien : seulement les faits de la fiche. Si aucun fait ne passe le test du confrère (rien dans les 12 derniers mois, ni de fait qui désigne une tâche ; seulement l'ancienneté, l'adresse, la ville, la taille ou les avis), ne force rien : écris une accroche simple et vraie tirée de la fiche, toujours « J'ai vu que … » (« J'ai vu que votre entreprise de nettoyage est installée à Frouard depuis 2016. »), une valeur tirée du métier, mets general à vrai, accroche_faible à vrai, et dis pourquoi dans raison_faible, en une phrase courte (« seulement l'ancienneté et la commune »). Gabriel décidera. Sinon, accroche_faible à faux et raison_faible vide. L'ancienneté se compte depuis la date de création du registre ; la commune est celle du siège donnée dans la fiche.

appuis : chaque fait utilisé, avec sa source et sa date telles que la fiche les donne (fait : « marché de ferronnerie notifié », source : « marchés publics attribués (DECP) », date : « 2026-09-17 »). Pour une accroche générale : un seul appui, fait « message général sur le métier », source « aucune », date vide.`;

/* ----- Le rendez-vous proposé : dans ses bureaux si le trajet depuis Nancy est court, sinon visio ou téléphone ----- */

// Gabriel, 12/11 : « moi j'habite à Nancy, du coup je veux bien rdv mais pas trop loin, sinon un appel ou visio quand c'est
// plus loin », puis « 40 mn me va, pas plus ». Le temps de route vient d'OSRM (serveur public de démonstration : un seul
// appel par entreprise, gardé dans faits.rdv) ; si OSRM ne répond pas, la distance à vol d'oiseau avec un seuil prudent
// (25 km) ; sans coordonnées sûres du siège, ou sans commune connue, la visio (« … en 20 minutes de visio … », 13/11).
const NANCY = { lat: 48.6921, lon: 6.1844 };
const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const GEO_COMMUNES = 'https://geo.api.gouv.fr/communes';
function kmVolOiseau(a, b) {
  const rad = (x) => (x * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
const coordonneeSure = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && lat > 41 && lat < 52 && lon > -6 && lon < 10;
// La commune du siège, au nom propre (« Lunéville », pas « LUNEVILLE »), et ses coordonnées si le registre n'en a pas.
async function communeGeo(siege, p) {
  if (/^\d[\dAB]\d{3}$/.test(siege?.code_commune || '')) {
    const j = await lireJsonPublic(`${GEO_COMMUNES}/${siege.code_commune}?fields=nom,centre`, 4000);
    if (j?.nom) return { nom: j.nom, centre: j.centre?.coordinates || null };
  }
  const nom = siege?.commune || p?.commune;
  const dep = String(siege?.code_postal || '').slice(0, 2) || p?.dep;
  if (!nom || !/^\d[\dAB]$/.test(dep || '')) return null;
  const j = await lireJsonPublic(`${GEO_COMMUNES}?${new URLSearchParams({ nom, codeDepartement: dep, fields: 'nom,centre', boost: 'population', limit: '5' })}`, 4000);
  // Seulement une commune du même nom (aux accents près) : jamais la plus proche par défaut.
  const x = (Array.isArray(j) ? j : []).find((c) => normaliser(c.nom) === normaliser(nom));
  return x ? { nom: x.nom, centre: x.centre?.coordinates || null } : null;
}
// « MAXEVILLE » → « Maxeville », « PONT-A-MOUSSON » → « Pont-à-Mousson » ; un nom déjà en minuscules reste tel quel.
const PETITS_MOTS_COMMUNE = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'lès', 'sur', 'sous', 'en', 'et', 'aux', 'au', 'd', 'l']);
function communePropre(n) {
  const t = String(n || '').trim().replace(/\s+/g, ' ');
  if (!t) return null;
  if (t !== t.toUpperCase()) return couper(t, 80);
  return couper(t.toLowerCase().split(/([\s'’-])/).map((m, i) => (!m || /^[\s'’-]$/.test(m) ? m : i > 0 && m === 'a' ? 'à' : i > 0 && PETITS_MOTS_COMMUNE.has(m) ? m : m[0].toUpperCase() + m.slice(1))).join(''), 80);
}
async function minutesDeRoute(lat, lon) {
  try {
    const r = await fetch(`${OSRM}/${NANCY.lon},${NANCY.lat};${lon},${lat}?overview=false`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(4000) });
    if (!r.ok) { console.error('crm email osrm', r.status); return null; }
    const j = await r.json();
    const s = j?.code === 'Ok' ? Number(j.routes?.[0]?.duration) : NaN;
    return Number.isFinite(s) && s > 0 ? Math.round(s / 60) : null;
  } catch (x) {
    console.error('crm email osrm', x?.name || x?.message);
    return null;
  }
}
// Le lieu de la phrase fixe, et ce qui le justifie (gardé dans faits.rdv : une seule lecture d'OSRM par entreprise).
async function lieuRdvEmail(e, l, c) {
  const r = await reglageEmail();
  const maxMinutes = Number.isFinite(r.rdv_minutes) ? r.rdv_minutes : EMAIL_PROSPECTION.rdv_minutes;
  const maxKm = Number.isFinite(r.rdv_km) ? r.rdv_km : EMAIL_PROSPECTION.rdv_km;
  const f = e.faits || {};
  // Gardé dès qu'on a les coordonnées (OSRM n'est jamais relu) ; sans coordonnées (registre ou geo.api muets), on recherche
  // à la rédaction suivante : ces deux lectures sont gratuites.
  let rdv = f.rdv && f.rdv.lu_le && f.rdv.coord ? { ...f.rdv } : null;
  if (!rdv) {
    let siege = f.registre?.siege || null;
    const siren = String(f.prospect?.siren || l?.siret || '').replace(/\D/g, '').slice(0, 9);
    // Une ligne lue avant le 12/11 au soir n'a pas le siège : le registre est relu une fois.
    if (!siege && /^\d{9}$/.test(siren)) siege = (await lireRegistre(siren, c, { holding: false }))?.siege || null;
    const geo = await communeGeo(siege, f.prospect);
    let lat = Number(siege?.lat);
    let lon = Number(siege?.lon);
    let coord = 'registre';
    if (!coordonneeSure(lat, lon) && geo?.centre) { [lon, lat] = geo.centre.map(Number); coord = 'commune'; }
    rdv = { lu_le: new Date().toISOString(), commune: geo?.nom || communePropre(siege?.commune || f.prospect?.commune), coord: coordonneeSure(lat, lon) ? coord : null };
    if (rdv.coord) {
      rdv.lat = Math.round(lat * 1e5) / 1e5;
      rdv.lon = Math.round(lon * 1e5) / 1e5;
      rdv.km = Math.round(kmVolOiseau(NANCY, { lat, lon }) * 10) / 10;
      rdv.minutes = await minutesDeRoute(lat, lon);
      rdv.osrm = rdv.minutes == null ? 'sans réponse' : 'ok';
    }
  }
  // Une commune restée vide (INSMATEL, 13/11 : « dans vos bureaux. » sans la commune) : le nom officiel par le code commune
  // (geo.api.gouv.fr), sinon celui du registre ou de la liste en casse propre. Sans commune du tout, la visio.
  if (!rdv.commune) {
    const siege = f.registre?.siege || null;
    rdv.commune = (await communeGeo(siege, f.prospect))?.nom || communePropre(siege?.commune || f.prospect?.commune);
  }
  // La décision se refait à chaque rédaction avec les réglages du moment, sans relire OSRM.
  rdv.calcul = !rdv.coord ? 'sans coordonnées' : rdv.minutes != null ? 'route' : 'vol d\'oiseau';
  rdv.bureaux = rdv.calcul === 'route' ? rdv.minutes <= maxMinutes : rdv.calcul === 'vol d\'oiseau' ? rdv.km <= maxKm : false;
  rdv.seuil = rdv.calcul === 'route' ? `${maxMinutes} min` : rdv.calcul === 'vol d\'oiseau' ? `${maxKm} km` : null;
  const lieu = rdv.bureaux && rdv.commune ? `en visio ou dans vos bureaux à ${rdv.commune}` : LIEU_DISTANCE_EMAIL;
  return { lieu, rdv };
}

/* ----- La rédaction ----- */

async function redigerEmail(e, l, c, { consigne = '', lieu = LIEU_DISTANCE_EMAIL } = {}) {
  const f = e.faits || {};
  const accueil = estGeneraleEmail(e);
  const p = f.prospect || {};
  const { recents, autres } = faitsPourClaude(f);
  const metier = metierEmail(l);
  const jeu = jeuMetierEmail(metier);
  const jour = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const fiche = [
    `Date du jour : ${jour}`,
    `Entreprise : ${l.entreprise}${l.secteur ? ` (${l.secteur})` : ''}${l.localisation ? `, ${l.localisation}` : ''}${p.salaries ? `, ${p.salaries} salariés` : ''}`,
    f.rdv?.commune ? `Commune du siège : ${f.rdv.commune}` : '',
    `Métier dans la phrase fixe : ${metier}`,
    `Reste du bureau, liste fermée pour ce métier : ${jeu.reste.join(', ')}`,
    `Exemples de valeur pour ce métier : ${jeu.valeurs.map((v) => `« ${v} »`).join(' ; ')}`,
    `Exemples de document pour ce métier : ${jeu.documents.join(', ')}`,
    `Exemples d'objet pour ce métier : ${jeu.objets.map((o) => `« ${o} »`).join(', ')}`,
    `Rendez-vous proposé dans la phrase fixe : ${lieu === LIEU_DISTANCE_EMAIL ? '20 minutes de visio' : lieu}`,
    accueil ? "Destinataire : l'adresse générale de l'entreprise (c'est l'accueil qui lit et transmet). Ton accroche reste adressée au dirigeant (« J'ai vu que vous… ») ; le CRM écrit avant elle « Bonjour, Ce message est à destination de … » puis le nom du dirigeant, et l'objet « À l'attention de … ». Ne parle pas de l'accueil." : '',
    `Dirigeant : ${nommerDirigeant(e.civilite, c) || 'inconnu'}${c?.poste ? `, ${qualiteCourteEmail(c.poste, e.civilite) || c.poste}` : ''}`,
    l.besoin ? `Ce que le CRM sait de l'entreprise : ${couper(l.besoin, 400)}` : '',
    `Faits publics des 12 derniers mois, du plus récent au plus ancien :\n${recents.join('\n') || '(aucun)'}`,
    autres.length ? `Autres faits publics :\n${autres.join('\n')}` : '',
    consigne ? `Consigne de Gabriel : ${couper(consigne, 300)}` : '',
  ].filter(Boolean).join('\n');
  const r = await appelClaude({ consignes: CONSIGNES_EMAIL, schema: schemaEmail(jeu), contenu: fiche, max: 3000, timeout: 40000 });
  const objet = String(r.objet || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  const accroche = String(r.accroche || '').replace(/\s+/g, ' ').trim();
  if (!objet || !accroche) throw new Refus('ia_erreur', 502);
  const appuis = (Array.isArray(r.appuis) ? r.appuis : []).slice(0, 4).map((a) => ({ fait: couper(String(a?.fait || ''), 300), source: couper(String(a?.source || ''), 120), date: couper(String(a?.date || ''), 40) }));
  const texte = texteEmail(e, l, c, { accroche, valeur: r.valeur, reste: r.reste, document: r.document, lieu, accueil });
  const faible = r.accroche_faible === true ? { raison: couper(String(r.raison_faible || '').replace(/\s+/g, ' ').trim(), 200) || 'aucun fait ne passe le test du confrère' } : null;
  return { objet: accueil ? objetAccueilEmail(e.civilite, c) : objet, texte, appuis, general: r.general === true, accroche, accueil, accroche_faible: faible };
}

// Ce que le modèle du 12/11 demande et que le filet peut voir, signalé à côté du texte (un envoi automatique attend).
// Gabriel, 13/11 : objet de 2 à 4 mots, sans chiffre ni marque (Google) ; 75 à 95 mots hors signature, alerte au-delà de
// 110 ; une accroche que Claude dit faible attend toujours Gabriel.
const motsCorpsEmail = (corps, accueil) => motsEmail(accueil ? String(corps).replace(/^Ce message est à destination [^\n]*$/m, '') : corps);
function alertesModeleEmail(objet, texte, { appuis = [], accroche = null, general = false, accueil = false, accroche_faible: faible = null } = {}) {
  const a = [];
  if (faible) a.push(`Accroche faible, selon Claude : ${String(faible.raison || 'aucun fait ne passe le test du confrère').replace(/[.\s]+$/, '')}. Choisis un autre fait ou écarte ce message.`);
  const corps = String(texte || '').replace(/\n+Gabriel Vanderbecken(\nIA-Entrepreneur)?\s*$/, '');
  const questions = (corps.match(/\?/g) || []).length;
  if (questions > 1) a.push(`${questions} questions dans le message : une seule (Gabriel, 12/11).`);
  // À l'accueil, la ligne fixe « Ce message est à destination de … » ne compte pas : le reste est le même message.
  const mots = motsCorpsEmail(corps, accueil);
  if (mots > 110 || mots < 60) a.push(`Le message fait ${mots} mots hors signature (75 à 95 visés).`);
  if (!accueil) {
    const motsObjet = motsEmail(objet);
    if (motsObjet < 2 || motsObjet > 4) a.push(`L'objet fait ${motsObjet} mot${motsObjet > 1 ? 's' : ''} (2 à 4).`);
    if (/(chantiers?|march[ée]s?) publics?|nouveau march|opportunit|veille|avis d'appel/i.test(objet || '')) a.push("L'objet ressemble à un email de veille d'appels d'offres.");
  }
  if (/\p{N}/u.test(objet || '')) a.push("L'objet contient un chiffre : on nomme la tâche ou le document (« Vos devis »).");
  if (/google/i.test(objet || '')) a.push("L'objet cite Google : pas de nom de marque dans l'objet.");
  if (accroche != null && !general && !/^J'ai vu que /.test(accroche)) a.push("L'accroche ne commence pas par « J'ai vu que ».");
  const annee = aujourdHuiParis().slice(0, 4);
  if (/cette ann[ée]e/i.test(corps) && appuis.some((x) => /^\d{4}/.test(x.date || '') && x.date.slice(0, 4) !== annee)) a.push(`« Cette année » alors qu'un fait cité date d'avant ${annee}.`);
  return a;
}

// Claude rédige ; le texte reste à valider, sauf si la confiance est acquise et que rien ne cloche (filet et alertes).
// Un brouillon déjà écrit n'est jamais réécrit seul (Gabriel retouche parfois à la main) : seulement « Rédiger avec Claude ».
async function preparerEmailAvecClaude(e0, l, c, { auto = true, consigne = '' } = {}) {
  let place = { lieu: LIEU_DISTANCE_EMAIL, rdv: null };
  try { place = await lieuRdvEmail(e0, l, c); } catch (x) { console.error('crm email lieu', x?.message); }
  // Civilité inconnue : celle du prénom (Insee), gardée sur la ligne avec sa source ; prénom mixte, rare ou absent : aucune.
  const deduite = e0.civilite ? null : civiliteDuPrenom(c?.prenom);
  const e = deduite ? { ...e0, civilite: deduite } : e0;
  // L'accroche faible d'une rédaction précédente ne colle pas à la nouvelle : seule la dernière compte.
  const { accroche_faible: _ancienneFaible, ...faitsAvant } = e0.faits || {};
  const faits = { ...faitsAvant, ...(place.rdv ? { rdv: place.rdv } : {}), ...(e0.civilite ? {} : { civilite: { source: deduite ? 'prénom (fichier des prénoms de l\'Insee)' : 'inconnue (prénom mixte, rare ou absent)', prenom: c?.prenom || null, civilite: deduite, le: new Date().toISOString() } }) };
  let red;
  try {
    red = await redigerEmail({ ...e, faits }, l, c, { consigne, lieu: place.lieu });
  } catch (err) {
    // Claude a échoué : nouvel essai au passage suivant, puis, après 3 essais, la ligne passe à Gabriel avec le modèle vide.
    const essais = (e.faits?.essais_claude || 0) + 1;
    await majLigneEmail(e.id, essais >= 3
      ? { statut: 'brouillon', objet: estGeneraleEmail(e) ? objetAccueilEmail(e.civilite, c) : null, texte: texteEmail(e, l, c, { lieu: place.lieu, accueil: estGeneraleEmail(e) }), civilite: e.civilite || null, faits: { ...faits, essais_claude: essais }, detail: "Claude n'a pas pu rédiger ce message : écris l'objet et l'accroche toi-même, et adapte la valeur." }
      : { faits: { ...faits, essais_claude: essais }, detail: "Claude n'a pas pu rédiger : nouvel essai au prochain passage." });
    throw err;
  }
  const alertes = [...alertesEmail(red.objet, red.texte), ...alertesModeleEmail(red.objet, red.texte, red)];
  let propre = true;
  try { verifierTexteEmail(red.objet, red.texte); } catch (x) { propre = false; alertes.unshift(messageRefusEmail(x)); }
  if (red.accroche_faible) faits.accroche_faible = { ...red.accroche_faible, le: new Date().toISOString() };
  const valeurs = { objet: red.objet, texte: red.texte, texte_claude: `${red.objet}\n---\n${red.texte}`, faits, civilite: e.civilite || null, appuis: red.appuis.length ? red.appuis : [{ fait: 'message général sur le métier', source: 'aucune', date: '' }], statut: 'brouillon', valide_le: null, detail: alertes.length ? alertes.join(' ') : null };
  // Une accroche que Claude dit faible ne part jamais seule, même en confiance (Gabriel, 13/11).
  if (auto && propre && !alertes.length && !red.accroche_faible && (await confianceEmail()).auto) {
    Object.assign(valeurs, { statut: 'a_envoyer', valide_le: new Date().toISOString(), detail: "Envoi automatique : 10 messages validés tels quels d'affilée." });
  }
  return majLigneEmail(e.id, valeurs);
}

/* ----- Opposition et arrêt croisé : un canal répond, l'autre s'arrête ----- */

async function enOpposition(email) {
  const { lignes } = await sb(`iae_crm_oppositions?email=eq.${encodeURIComponent(normEmail(email))}&select=email&limit=1`);
  return lignes.length > 0;
}
// Une réponse, sur n'importe quel canal, arrête tout ce qui attend sur ce lead, email et LinkedIn (règle de Gabriel du
// 09/11 pour la liste BTP d'Anna en double canal, reprise le 12/11 pour l'email). Une réponse LinkedIn déjà préparée pour
// quelqu'un qui a écrit reste (étape reponse). Toujours au nom de Gabriel : la table des emails lui est réservée.
async function arreterEnvoisEnAttente(leadId, pourquoi, { linkedin = true } = {}) {
  if (!UUID_RE.test(leadId || '')) return { emails: 0, linkedin: 0 };
  return avecUtilisateur(ADMIN, async () => {
    const { lignes: emails } = await sb(`iae_crm_emails?lead_id=eq.${leadId}&statut=in.(${EN_ATTENTE_EMAIL.join(',')})`, { methode: 'PATCH', corps: { statut: 'annule', detail: pourquoi }, prefer: 'return=representation' });
    let li = [];
    if (linkedin) ({ lignes: li } = await sb(`iae_crm_linkedin?lead_id=eq.${leadId}&statut=in.(brouillon,a_envoyer,echec,a_verifier)&etape=in.(invitation,message,relance,findia)`, { methode: 'PATCH', corps: { statut: 'annule', detail: pourquoi }, prefer: 'return=representation' }));
    return { emails: (emails || []).length, linkedin: (li || []).length };
  });
}
// Désinscription (lien, bouton de la messagerie, réponse « stop ») ou signalement comme spam : plus jamais rien à cette
// adresse ; le lead passe en perdu, tout ce qui attend s'arrête (email et LinkedIn), et Brevo la met sur liste noire.
async function enregistrerOpposition(email, origine, { leadId = null, ligne = null } = {}) {
  const adresse = normEmail(email);
  if (!EMAIL_RE.test(adresse)) return false;
  return avecUtilisateur(ADMIN, async () => {
    if (await enOpposition(adresse)) return false;
    await sb('iae_crm_oppositions?on_conflict=email', { methode: 'POST', prefer: 'resolution=ignore-duplicates,return=minimal', corps: { email: adresse, origine: couper(origine, 200), lead_id: leadId || ligne?.lead_id || null } });
    const { lignes: lignesEmail } = await sb(`iae_crm_emails?email=eq.${encodeURIComponent(adresse)}&select=id,lead_id,contact_id,evenements`);
    const leads = new Set([leadId, ligne?.lead_id, ...lignesEmail.map((x) => x.lead_id)].filter(Boolean));
    const quand = new Date().toISOString();
    for (const x of lignesEmail) if (!x.evenements?.unsubscribed && /d[ée]sinscri|stop|un clic/i.test(origine)) await majLigneEmail(x.id, { evenements: { ...(x.evenements || {}), unsubscribed: quand } });
    for (const id of leads) {
      await arreterEnvoisEnAttente(id, `Désinscription (${origine}) : plus aucun envoi.`);
      const { l, c } = await leadEtContactEmail({ lead_id: id, contact_id: lignesEmail.find((x) => x.lead_id === id)?.contact_id || null });
      if (!l) continue;
      await journalEmail(l, c, 'note', `${nomContactEmail(c)} ne veut plus recevoir de message (${origine}) : plus aucun email ni message LinkedIn ne partira.`, null, { etape: 'opposition', email: adresse });
      if (['nouveau', 'contacte'].includes(l.statut)) await sb(`iae_crm_leads?id=eq.${l.id}`, { methode: 'PATCH', prefer: 'return=minimal', corps: { statut: 'perdu', raison_perte: 'désinscription email', prochaine_relance: null, prochaine_note: null } });
    }
    // Liste noire des campagnes Brevo (https://developers.brevo.com, POST /v3/contacts, emailBlacklisted) : une campagne
    // future ne lui écrira pas non plus. Nos envois transactionnels, eux, regardent iae_crm_oppositions.
    if (process.env.BREVO_API_KEY) {
      try {
        const r = await fetch(`${BREVO}/contacts`, { method: 'POST', headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ email: adresse, emailBlacklisted: true, updateEnabled: true }), signal: AbortSignal.timeout(8000) });
        if (!r.ok) console.error('crm email liste noire', r.status, (await r.text()).slice(0, 200));
      } catch (e) { console.error('crm email liste noire', e?.message || e); }
    }
    return true;
  });
}

/* ----- Les candidats : le robot du Mac (pas de profil LinkedIn utilisable) ou Claude Code (clé du CRM) ----- */

function civiliteDe(v) {
  const t = String(v || '').trim().replace(/\.$/, '').toLowerCase();
  return ['m', 'mr', 'monsieur'].includes(t) ? 'M.' : ['mme', 'madame', 'mlle', 'mademoiselle'].includes(t) ? 'Mme' : null;
}
async function ajouterProspectEmail(corps) {
  // Les emails partent de l'adresse de Gabriel : le robot d'un commercial garde ses prospects pour LinkedIn et le téléphone.
  if (!estAdmin()) return { ok: false, raison: 'reserve_gabriel' };
  const p = corps.prospect && typeof corps.prospect === 'object' ? corps.prospect : {};
  const siret = /^\d{14}$/.test(String(p.siret || '').replace(/\s/g, '')) ? String(p.siret).replace(/\s/g, '') : null;
  const siren = /^\d{9}$/.test(String(p.siren || '').replace(/\s/g, '')) ? String(p.siren).replace(/\s/g, '') : siret ? siret.slice(0, 9) : null;
  const entreprise = couper(String(p.entreprise || '').trim(), 200);
  let prenom = couper(String(p.prenom || '').trim(), 80);
  let nom = couper(String(p.nom || '').trim(), 80);
  if (!prenom || !nom) {
    const mots = String(p.dirigeant || '').replace(/,/g, ' ').split(/\s+/).filter(Boolean);
    if (mots.length >= 2) { prenom = prenom || couper(mots[0], 80); nom = nom || couper(mots.slice(1).join(' '), 80); }
  }
  if (!entreprise || !siren || !prenom || !nom) throw new Refus('valeur_invalide:prospect');
  const email = p.email ? normEmail(p.email) : null;
  if (email && !EMAIL_RE.test(email)) throw new Refus('adresse_invalide');
  const sourceEmail = email ? (['fullenrich', 'site', 'manuel'].includes(p.source_email) ? p.source_email : 'manuel') : null;
  const statutEmail = email ? String(p.email_statut || (sourceEmail === 'fullenrich' ? '' : 'MANUEL')).toUpperCase().slice(0, 40) : null;
  if (sourceEmail === 'fullenrich' && statutEmail !== 'DELIVERABLE') throw new Refus('adresse_non_verifiee');
  if (email) {
    // Gabriel, 12/11 : jamais d'adresse générale, seulement celle du dirigeant.
    const j = jugerAdresse(email, [{ prenom, nom, contact: true }], entreprise);
    if (!j.ok) throw new Refus(CODES_ADRESSE[j.raison]);
    if ((await mxDuDomaine(email.split('@')[1])) === 'non') throw new Refus('domaine_sans_mx');
  }
  // Aucun doublon dans toute la base, comme LinkedIn : même SIREN, même nom d'entreprise, même adresse.
  const [parSiren, parNom, parEmail] = await avecUtilisateur(ADMIN, () => Promise.all([
    sb(`iae_crm_leads?siret=like.${siren}*&select=id&limit=1`),
    sb(`iae_crm_leads?entreprise=ilike.${encodeURIComponent(entreprise)}&select=id&limit=1`),
    email ? sb(`iae_crm_contacts?email=ilike.${encodeURIComponent(email)}&select=id&limit=1`) : { lignes: [] },
  ]));
  if (parSiren.lignes.length || parNom.lignes.length || parEmail.lignes.length) return { ok: true, doublon: true };
  if (email && (await enOpposition(email))) return { ok: true, opposition: true };
  const secteurBrut = String(p.secteur || '').trim();
  const secteur = Object.hasOwn(SECTEURS_PROSPECT_LI, secteurBrut) ? secteurBrut : /^BTP/i.test(secteurBrut) ? 'BTP' : /propret/i.test(secteurBrut) ? 'Propreté' : /assuranc/i.test(secteurBrut) ? 'Assurance' : null;
  const anna = couper(String(p.anna || '').trim(), 40);
  const chezAnna = Boolean(anna) && anna !== 'hors de sa base';
  const salaries = couper(String(p.salaries || '').trim(), 20);
  const commune = couper(String(p.commune || '').trim(), 80);
  const dep = /^\d{2,3}$|^2[AB]$/i.test(String(p.dep || '').trim()) ? String(p.dep).trim() : '';
  const fonction = couper(String(p.fonction || '').trim(), 80);
  const recherche = ['vide', 'doute', 'introuvable'].includes(p.recherche_linkedin) ? p.recherche_linkedin : '';
  const pourquoi = { vide: 'profil LinkedIn vide', doute: 'plusieurs profils LinkedIn possibles', introuvable: 'pas de profil LinkedIn' }[recherche] || '';
  const { lignes: [l] } = await sb('iae_crm_leads', { methode: 'POST', prefer: 'return=representation', corps: {
    entreprise, type: 'prospect', statut: 'nouveau', source: 'Email · cœur de cible (Altares)', secteur, siret: siret || siren,
    tags: ['email', 'coeur-cible', ...(secteur ? [SECTEURS_PROSPECT_LI[secteur]] : []), ...(chezAnna ? ['liste-anna'] : [])],
    besoin: `${secteur || 'Entreprise'}${salaries ? ` (${salaries} salariés)` : ''}, cœur de cible${chezAnna ? ` ; dans la base d'Anna (${anna})` : ''}.${pourquoi ? ` Prospection par email : ${pourquoi} (recherche du Mac).` : ''}`,
    localisation: commune ? `${nomPropre(commune)}${dep ? ` (${dep})` : ''}` : null, prochaine_action: 'autre', relances_sans_reponse: 0,
    prochaine_note: `Email : ${email ? 'adresse connue' : 'adresse vérifiée en cours de recherche'}, puis message rédigé par Claude, à valider dans « Emails à valider ».${chezAnna ? " Anna l'a aussi dans sa base : dès qu'un canal a une réponse, l'autre s'arrête." : ''}`,
  } });
  const { lignes: [c] } = await sb('iae_crm_contacts', { methode: 'POST', prefer: 'return=representation', corps: { lead_id: l.id, prenom, nom: nomPropre(nom), poste: fonction || null, email, principal: true } });
  const { lignes: [e] } = await sb('iae_crm_emails', { methode: 'POST', prefer: 'return=representation', corps: {
    lead_id: l.id, contact_id: c.id, compte: ADMIN_EMAIL, etape: 'message', statut: email ? 'a_rediger' : 'a_enrichir', email, email_statut: statutEmail, source_email: sourceEmail,
    civilite: civiliteDe(p.civilite), faits: { prospect: { siren, salaries, commune, dep, fonction, recherche_linkedin: recherche || null } },
  } });
  await journalEmail(l, c, 'note', `Prospection email : ${nomContactEmail(c)}${fonction ? ` (${fonction})` : ''}${pourquoi ? `, ${pourquoi}` : ''}. ${email ? 'Adresse connue' : 'Adresse à vérifier'}, puis message à valider.`, null, { etape: 'candidat' });
  return { ok: true, cree: true, lead_id: l.id, email_id: e.id };
}

/* ----- L'import d'une liste de dirigeants dont l'adresse est connue (base Google Maps d'Anna, Outscraper) ----- */

// Gabriel, 12/11 : 1 email par jour, « vraiment pas assez » ; la base Outscraper extraite pour Anna donne des dirigeants
// dont l'adresse à leur nom est connue. L'adresse n'est jamais envoyée telle quelle : elle attend le registre, puis la
// règle de l'adresse du dirigeant et le MX (adressesEmails). « fiable » (trouvée sur le site, trouvée et vérifiée,
// vérifiée par Outscraper) : posée ; « déduite » (modèle prenom.nom@ vu sur le domaine) : seulement si FullEnrich confirme.
// Les courtiers en crédit et conseillers en patrimoine sont écartés (Gabriel, 04/11).
const SECTEURS_ECARTES_EMAIL = /banque|cr[ée]dit|patrimoine/i;
const IMPORT_EMAIL_MAX = 200;
const slugSecteur = (s) => normaliser(s).replace(/\s+/g, '-').slice(0, 40);
async function colonnesDeTout(table, select) {
  const lignes = [];
  for (let debut = 0; debut < 50000; debut += 1000) {
    const { lignes: page } = await sb(`${table}?select=${select}&order=id.asc`, { plage: `${debut}-${debut + 999}` });
    lignes.push(...page);
    if (page.length < 1000) break;
  }
  return lignes;
}
// Un candidat de la liste, tel que Claude Code le passe (ou tel que le fichier de la base le donne : decideur
// « Prénom NOM · qualité », type fiable|deduit).
function candidatImport(x) {
  const d = x?.dirigeant && typeof x.dirigeant === 'object' ? x.dirigeant : null;
  let prenom = couper(String(d?.prenom || '').trim(), 80);
  let nom = couper(String(d?.nom || '').trim(), 80);
  let qualite = couper(String(d?.qualite || '').trim(), 80);
  let plusieurs = false;
  if (!prenom || !nom) {
    const [qui, q] = String((typeof x?.dirigeant === 'string' ? x.dirigeant : x?.decideur) || '').split('·').map((t) => t.trim());
    // « Yohann Saccucci et Didier Vitet » : deux personnes sur une ligne, l'adresse ne peut être celle des deux.
    plusieurs = /\s(et|&)\s|\/|,/i.test(qui || '');
    const mots = (qui || '').split(/\s+/).filter(Boolean);
    // « Maite GENY » : le nom est en majuscules ; sinon le dernier mot.
    const i = mots.findIndex((m, k) => k > 0 && m === m.toUpperCase() && /\p{Lu}/u.test(m));
    if (mots.length >= 2) { prenom = prenom || mots.slice(0, i > 0 ? i : mots.length - 1).join(' '); nom = nom || mots.slice(i > 0 ? i : mots.length - 1).join(' '); }
    qualite = qualite || couper(q || '', 80);
  }
  const fiabiliteBrute = String(x?.fiabilite || '').trim();
  const type = ['fiable', 'deduit'].includes(x?.type) ? x.type : ['fiable', 'deduit'].includes(fiabiliteBrute) ? fiabiliteBrute : /^d[ée]duit/i.test(fiabiliteBrute) ? 'deduit' : 'fiable';
  const siret = String(x?.siret || '').replace(/\s/g, '');
  return {
    entreprise: couper(String(x?.entreprise || '').trim(), 200), siret: /^\d{14}$/.test(siret) ? siret : null, siren: /^\d{14}$|^\d{9}$/.test(siret) ? siret.slice(0, 9) : null,
    secteur: couper(String(x?.secteur || '').trim(), 60), salaries: couper(String(x?.salaries || '').trim(), 20), ville: couper(String(x?.ville || '').trim(), 80),
    region: couper(String(x?.region || '').trim(), 60), anna: couper(String(x?.statut_anna || '').trim(), 60),
    prenom: couper(prenom, 80), nom: couper(nom, 80), qualite, email: normEmail(x?.email), type, detail: couper(fiabiliteBrute || type, 200), plusieurs,
    source: couper(String(x?.source || 'outscraper').trim().toLowerCase(), 40) || 'outscraper',
  };
}
async function importerEmails(corps) {
  const liste = Array.isArray(corps.candidats) ? corps.candidats : [];
  if (!liste.length) throw new Refus('valeur_invalide:candidats');
  if (liste.length > IMPORT_EMAIL_MAX) throw new Refus('trop_de_candidats');
  // Toute la base d'un coup (dédoublonnage), puis les insertions groupées : 67 candidats tiennent dans une requête.
  const [leads, contacts, ouvertes, oppositions] = await Promise.all([
    colonnesDeTout('iae_crm_leads', 'id,entreprise,siret,statut,archive,proprietaire,tags'),
    colonnesDeTout('iae_crm_contacts', 'id,lead_id,prenom,nom,email,principal'),
    colonnesDeTout('iae_crm_emails', 'id,lead_id,statut'),
    colonnesDeTout('iae_crm_oppositions', 'email'),
  ]);
  const opposees = new Set(oppositions.map((o) => normEmail(o.email)));
  const lignesOuvertes = new Map();
  for (const e of ouvertes) if ([...EN_ATTENTE_EMAIL, 'en_cours', 'envoye'].includes(e.statut)) lignesOuvertes.set(e.lead_id, e.statut);
  const leadParSiren = new Map(); const leadParNom = new Map(); const leadParId = new Map(leads.map((l) => [l.id, l]));
  for (const l of leads) {
    const sir = String(l.siret || '').replace(/\D/g, '').slice(0, 9);
    if (sir.length === 9 && !leadParSiren.has(sir)) leadParSiren.set(sir, l);
    const n = normaliser(l.entreprise);
    if (n && !leadParNom.has(n)) leadParNom.set(n, l);
  }
  const leadParEmail = new Map();
  for (const c of contacts) if (c.email && !leadParEmail.has(normEmail(c.email))) leadParEmail.set(normEmail(c.email), c.lead_id);
  const crees = []; const rattaches = []; const ignores = [];
  const vus = new Set();
  const aCreer = []; const aRattacher = [];
  for (const brut of liste) {
    const x = candidatImport(brut);
    const nomListe = x.entreprise || '(sans nom)';
    const ignorer = (raison) => ignores.push({ entreprise: nomListe, email: x.email || null, raison });
    if (!x.entreprise || !x.siren) { ignorer('SIRET manquant ou invalide (le registre est lu avant tout envoi)'); continue; }
    if (x.plusieurs) { ignorer('plusieurs dirigeants sur la même ligne : à séparer à la main (une adresse par personne)'); continue; }
    if (!x.prenom || !x.nom) { ignorer('prénom ou nom du dirigeant manquant'); continue; }
    if (!EMAIL_RE.test(x.email)) { ignorer('adresse invalide'); continue; }
    if (SECTEURS_ECARTES_EMAIL.test(x.secteur)) { ignorer('secteur écarté (courtiers en crédit et conseillers en patrimoine, Gabriel le 04/11)'); continue; }
    const cles = [`s:${x.siren}`, `n:${normaliser(x.entreprise)}`, `e:${x.email}`];
    if (cles.some((k) => vus.has(k))) { ignorer('doublon dans la liste'); continue; }
    cles.forEach((k) => vus.add(k));
    if (opposees.has(x.email)) { ignorer('adresse en opposition (désinscription ou spam)'); continue; }
    const existant = leadParSiren.get(x.siren) || leadParId.get(leadParEmail.get(x.email)) || leadParNom.get(normaliser(x.entreprise));
    if (existant) {
      // Un lead déjà là reçoit la ligne email s'il n'en a pas déjà une ouverte (ou partie), et s'il est encore à prospecter.
      if (existant.archive || existant.statut === 'perdu') { ignorer(`déjà dans le CRM (${existant.entreprise}), archivé ou perdu`); continue; }
      if (!['nouveau', 'contacte'].includes(existant.statut)) { ignorer(`déjà dans le CRM (${existant.entreprise}), à l'étape « ${existant.statut} »`); continue; }
      if (existant.proprietaire && existant.proprietaire !== ADMIN_EMAIL) { ignorer(`déjà dans le CRM (${existant.entreprise}), lead de ${existant.proprietaire}`); continue; }
      if (lignesOuvertes.has(existant.id)) { ignorer(`déjà dans le CRM (${existant.entreprise}), avec un email de prospection ${lignesOuvertes.get(existant.id) === 'envoye' ? 'déjà parti' : 'en cours'}`); continue; }
      const contact = contacts.find((c) => c.lead_id === existant.id && memePersonne({ prenom: x.prenom, nom: x.nom }, c)) || null;
      aRattacher.push({ x, l: existant, contact });
      continue;
    }
    aCreer.push(x);
  }
  const faitsDe = (x) => ({
    prospect: { siren: x.siren, salaries: x.salaries, commune: x.ville, dep: '', region: x.region, fonction: x.qualite, source: x.source, statut_anna: x.anna || null },
    adresse_connue: { email: x.email, source: x.source, fiabilite: x.type, detail: x.detail, importee_le: new Date().toISOString() },
  });
  const secteurDe = (x) => (/^BTP/i.test(x.secteur) ? 'BTP' : /propret/i.test(x.secteur) ? 'Propreté' : /assuranc|courtage/i.test(x.secteur) ? 'Assurance' : /immobili|syndic|gestion locative/i.test(x.secteur) ? 'Immobilier' : x.secteur || null);
  const SOURCE_IMPORT = 'Email · base Google Maps (Outscraper)';
  if (aCreer.length) {
    const { lignes: ls } = await sb('iae_crm_leads', { methode: 'POST', prefer: 'return=representation', corps: aCreer.map((x) => {
      const secteur = secteurDe(x);
      const anna = Boolean(x.anna) && !/hors de sa base/i.test(x.anna);
      return {
        entreprise: x.entreprise, type: 'prospect', statut: 'nouveau', source: SOURCE_IMPORT, secteur, siret: x.siret || x.siren,
        tags: ['email', 'outscraper', ...(secteur ? [SECTEURS_PROSPECT_LI[secteur] || slugSecteur(secteur)] : []), ...(anna ? ['liste-anna'] : [])],
        besoin: `${secteur || 'Entreprise'}${x.salaries ? ` (${x.salaries} salariés)` : ''}, base Google Maps d'Anna (Outscraper)${anna ? ` ; chez Anna : ${x.anna}` : ''}.`,
        localisation: x.ville ? `${x.ville}${x.region ? ` (${x.region})` : ''}` : null, prochaine_action: 'autre', relances_sans_reponse: 0,
        prochaine_note: `Email : adresse connue (base Google Maps, ${x.type === 'fiable' ? 'fiable' : 'déduite, à vérifier'}), vérifiée après le registre, puis message rédigé par Claude, à valider dans « Emails à valider ».${anna ? " Anna l'a aussi dans sa base : dès qu'un canal a une réponse, l'autre s'arrête." : ''}`,
      };
    }) });
    const { lignes: cs } = await sb('iae_crm_contacts', { methode: 'POST', prefer: 'return=representation', corps: aCreer.map((x, k) => ({ lead_id: ls[k].id, prenom: x.prenom, nom: nomPropre(x.nom), poste: x.qualite || null, email: null, principal: true })) });
    const { lignes: es } = await sb('iae_crm_emails', { methode: 'POST', prefer: 'return=representation', corps: aCreer.map((x, k) => ({
      lead_id: ls[k].id, contact_id: cs[k].id, compte: ADMIN_EMAIL, etape: 'message', statut: 'a_enrichir', email: null, email_statut: null, source_email: null, civilite: null, faits: faitsDe(x),
    })) });
    aCreer.forEach((x, k) => crees.push({ entreprise: x.entreprise, lead_id: ls[k].id, email_id: es[k].id, fiabilite: x.type }));
    await sb('iae_crm_activites', { methode: 'POST', prefer: 'return=minimal', corps: aCreer.map((x, k) => ({
      lead_id: ls[k].id, contact_id: cs[k].id, type: 'import', resume: `Prospection email : ${x.prenom} ${nomPropre(x.nom)}${x.qualite ? ` (${x.qualite})` : ''}, importé de la base Google Maps d'Anna (Outscraper). Adresse ${x.type === 'fiable' ? 'connue' : 'déduite'} : ${x.email} (${x.detail}), vérifiée après le registre.`.slice(0, 2000),
      contenu: null, source: 'crm, prospection email', meta: { canal: 'email', etape: 'candidat', source: x.source },
    })) });
  }
  for (const { x, l, contact } of aRattacher) {
    const c = contact || (await sb('iae_crm_contacts', { methode: 'POST', prefer: 'return=representation', corps: { lead_id: l.id, prenom: x.prenom, nom: nomPropre(x.nom), poste: x.qualite || null, email: null, principal: false } })).lignes[0];
    const { lignes: [e] } = await sb('iae_crm_emails', { methode: 'POST', prefer: 'return=representation', corps: { lead_id: l.id, contact_id: c.id, compte: ADMIN_EMAIL, etape: 'message', statut: 'a_enrichir', email: null, civilite: null, faits: faitsDe(x) } });
    await sb(`iae_crm_leads?id=eq.${l.id}`, { methode: 'PATCH', prefer: 'return=minimal', corps: { tags: [...new Set([...(l.tags || []), 'email', 'outscraper'])] } });
    await journalEmail(l, c, 'note', `Prospection email : ${x.prenom} ${nomPropre(x.nom)}, adresse ${x.type === 'fiable' ? 'connue' : 'déduite'} par la base Google Maps d'Anna (Outscraper) : ${x.email}. Vérifiée après le registre.`, null, { etape: 'candidat' });
    rattaches.push({ entreprise: l.entreprise, lead_id: l.id, email_id: e.id, fiabilite: x.type });
  }
  return { ok: true, crees, rattaches, ignores, compte: { crees: crees.length, rattaches: rattaches.length, ignores: ignores.length } };
}

/* ----- Le passage de la synchro : événements, envois, registre et adresses, rédaction ----- */

// Registre et faits publics d'une ligne qui n'en a pas encore. null : le registre ne répond pas, on réessaiera.
async function verifierFaitsEmail(e, l, c, bilan) {
  if (e.faits?.registre) return e;
  const siren = String(e.faits?.prospect?.siren || l?.siret || '').replace(/\D/g, '').slice(0, 9);
  if (!/^\d{9}$/.test(siren)) return e; // lead sans SIREN (ajouté à la main) : rien à vérifier ici
  const f = await lireFaitsPublics(siren, c);
  if (!f.registre) return null;
  const faits = { ...(e.faits || {}), ...f, prospect: { ...(e.faits?.prospect || {}), siren } };
  const raison = raisonDArret(faits, c);
  if (raison) {
    await majLigneEmail(e.id, { statut: 'annule', faits, detail: raison });
    if (l) await journalEmail(l, c, 'note', `Prospection email arrêtée pour ${l.entreprise} : ${raison}`, null, { etape: 'annule' });
    if (bilan) bilan.annules++;
    return false;
  }
  return majLigneEmail(e.id, { faits });
}

async function envoyesDuJourEmail() {
  const debut = minuitParis(aujourdHuiParis());
  const { lignes } = await sb(`iae_crm_emails?statut=eq.envoye&envoye_le=gte.${encodeURIComponent(debut)}&select=envoye_le`);
  return lignes.filter((x) => Date.parse(x.envoye_le) <= Date.now()).length;
}

// Avant chaque envoi : jamais une adresse en opposition, un lead archivé ou perdu, ni quelqu'un qui a déjà répondu
// (email, appel abouti, RDV ou réponse LinkedIn), ni deux fois le même message 1.
async function refusAvantEnvoi(e, l, c) {
  if (!e.email || !EMAIL_RE.test(e.email)) return "Pas d'adresse : rien n'est parti.";
  if (await enOpposition(e.email)) return 'Adresse en opposition (désinscription ou spam) : rien ne part.';
  // Le filet de la règle du 12/11 : l'adresse doit être celle de la personne saluée ; une adresse générale (le repli du soir)
  // doit être celle de l'entreprise elle-même, et le message, celui pour l'accueil.
  if (estGeneraleEmail(e)) {
    const g = adressesGeneralesDe(e, l).choisies.find((x) => x.email === normEmail(e.email)) || (() => { const j = jugerGenerale(e.email, { entreprise: l?.entreprise, communes: [e.faits?.registre?.siege?.commune, e.faits?.rdv?.commune, e.faits?.prospect?.commune].filter(Boolean) }); return j.ok ? j : null; })();
    if (!g) return `${e.email} : pas une adresse générale de l'entreprise. Rien ne part.`;
    if (!/^Bonjour,\s+Ce message est à destination (de |d'|du )/.test(e.texte || '')) return `${e.email} est une adresse générale : le message doit être celui pour l'accueil (« Ce message est à destination de Monsieur X »). Rien ne part.`;
  } else {
    const j = jugerAdresse(e.email, c ? [{ prenom: c.prenom, nom: c.nom, contact: true }] : [], l?.entreprise);
    if (!j.ok) return `${e.email} : ${MOTIFS_ADRESSE[j.raison]}. Rien ne part (Gabriel, 12/11 : jamais d'adresse générale sans le message pour l'accueil, sinon seulement celle du dirigeant).`;
  }
  const mx = await mxDuDomaine(e.email.split('@')[1]);
  if (mx === 'non') return `${e.email} : ${MOTIFS_ADRESSE.mx}. Rien ne part.`;
  if (mx === 'inconnu') return { attente: 'Le DNS ne répond pas pour vérifier le domaine : nouvel essai au prochain passage.' };
  if (!l || l.archive || l.statut === 'perdu') return 'Lead archivé ou perdu : rien ne part.';
  if (!['nouveau', 'contacte'].includes(l.statut)) return `Le lead est déjà à l'étape « ${l.statut} » : plus de message de prospection.`;
  const { lignes: acts } = await sb(`iae_crm_activites?lead_id=eq.${l.id}&type=in.(email_recu,appel,rdv,linkedin)&select=type,meta&limit=200`);
  const repondu = acts.find((a) => a.type !== 'linkedin' || a.meta?.etape === 'reponse_recue');
  if (repondu) return `Il a déjà répondu ou échangé (${{ email_recu: 'email', appel: 'appel', rdv: 'rendez-vous', linkedin: 'LinkedIn' }[repondu.type]}) : le message de prospection ne part pas.`;
  const { lignes: deja } = await sb(`iae_crm_emails?lead_id=eq.${l.id}&etape=eq.${e.etape}&statut=eq.envoye&select=id&limit=1`);
  if (deja.length) return 'Un message de cette étape est déjà parti pour ce lead.';
  return null;
}

const echapperHtml = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
class ErreurBrevo extends Error {
  constructor(message, { arret = false, inconnu = false } = {}) { super(message); this.arret = arret; this.inconnu = inconnu; }
}
/* ----- La signature Gmail de Gabriel, ajoutée à l'envoi ----- */

// Gabriel, 12/11 : « mets MA signature gmail dedans directement ». Lue par l'API Gmail (users.settings.sendAs.get, champ
// signature, en HTML ; la portée gmail.readonly suffit), gardée 24 h dans le réglage email_signature { html, texte, le }.
// Si Gmail ne répond pas : la dernière signature lue, sinon la signature texte du message (« Gabriel Vanderbecken /
// IA-Entrepreneur »). Le texte validé par Gabriel garde ces deux lignes : le filet anti-liens ne voit pas la signature.
const SIGNATURE_DUREE = 24 * 3600 * 1000;
const entitesSignature = (t) => String(t || '').replace(/&nbsp;/gi, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&amp;/gi, '&');
// Une signature Gmail est déjà nettoyée par Gmail ; on retire quand même tout ce qui pourrait exécuter quelque chose.
function nettoyerSignatureHtml(h) {
  const x = String(h || '').slice(0, 30000)
    .replace(/<(script|style|iframe|object|embed|form|svg|math)\b[\s\S]*?<\/\1\s*>/gi, '').replace(/<(script|style|iframe|object|embed|form|meta|link|base)\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*("\s*(javascript|vbscript|data):[^"]*"|'\s*(javascript|vbscript|data):[^']*')/gi, '');
  return x.trim();
}
// La version texte (textContent de Brevo) : les lignes de la signature, le téléphone, « Prendre RDV : <lien> ».
function signatureEnTexte(h) {
  const meme = (a, b) => { const n = (u) => String(u).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, ''); return n(a) === n(b); };
  const t = String(h || '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<a\b[^>]*?href\s*=\s*("([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a\s*>/gi, (_m, _q, h1, h2, dedans) => {
      const href = entitesSignature(h1 ?? h2 ?? '').trim();
      const txt = entitesSignature(dedans.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim(); // « IA<span>-</span>Entrepreneur »
      if (/^(tel|mailto):/i.test(href)) return txt || href.replace(/^(tel|mailto):/i, '');
      // L'accueil du site se lit sans son adresse ; une page précise (« Prendre RDV ») garde son lien.
      const racine = (() => { try { const u = new URL(href); return u.pathname === '/' && !u.search; } catch { return false; } })();
      if (/^https?:\/\//i.test(href)) return !txt ? '' : meme(txt, href) || racine ? txt : `${txt} : ${href}`;
      return txt;
    })
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h[1-6]|table|tbody)\s*>/gi, '\n').replace(/<\/t[dh]\s*>/gi, ' ')
    .replace(/<[^>]+>/g, '');
  const lignes = entitesSignature(t).split('\n').map((x) => x.replace(/[ \t\u00a0]+/g, ' ').trim()).filter(Boolean);
  return lignes.filter((x, i) => x !== lignes[i - 1]).join('\n').slice(0, 1500);
}
async function signatureEmail({ forcer = false } = {}) {
  const cache = await lireReglage('email_signature');
  if (!forcer && cache?.html && cache.le && Date.now() - Date.parse(cache.le) < SIGNATURE_DUREE) return cache;
  try {
    if (!gmailConfigure()) throw new Error('Gmail non configuré');
    const jeton = await accesGmail();
    const r = await fetch(`${GMAIL}/settings/sendAs/${encodeURIComponent(ADMIN_EMAIL)}`, { headers: { Authorization: `Bearer ${jeton}` }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`Gmail ${r.status}`);
    const html = nettoyerSignatureHtml((await r.json()).signature);
    const texte = signatureEnTexte(html);
    if (!html || !texte) throw new Error('signature vide');
    const n = { html, texte, le: new Date().toISOString() };
    await ecrireReglage('email_signature', n);
    return n;
  } catch (x) {
    console.error('crm email signature', x?.code || x?.message);
    return cache?.html ? cache : null;
  }
}
// Le corps sans les deux lignes de signature texte du modèle (remplacées par la signature Gmail).
const sansSignatureTexte = (t) => String(t || '').replace(/\s*\n\s*Gabriel Vanderbecken\s*(\n\s*IA-Entrepreneur\s*)?$/, '').trimEnd();

// Brevo transactionnel (POST /v3/smtp/email, comme api/rdv.js) : le message en paragraphes simples, la signature Gmail de
// Gabriel, le lien d'opposition en bas, et dans les en-têtes List-Unsubscribe (lien https + mailto) et
// List-Unsubscribe-Post (désinscription en un clic, RFC 8058, demandée par Gmail et Yahoo pour les envois en nombre).
async function envoyerBrevoEmail(e, c, r, jeton, signature = null) {
  const lien = `${URL_STOP}${jeton}`;
  const corpsTexte = signature ? sansSignatureTexte(e.texte) : e.texte;
  const paragraphes = corpsTexte.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${echapperHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
  const blocSignature = signature ? `<div style="margin:18px 0 0">${signature.html}</div>` : '';
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"></head><body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1f2330">${paragraphes}${blocSignature}<p style="margin:22px 0 0;font-size:12px;color:#6b7080">Pour ne plus recevoir mes messages : <a href="${echapperHtml(lien)}" style="color:#6b7080">se désinscrire</a></p></body></html>`;
  const corps = {
    sender: { email: r.expediteur, name: r.expediteur_nom },
    replyTo: { email: ADMIN_EMAIL, name: 'Gabriel Vanderbecken' },
    // À l'accueil, l'adresse seule : le nom du dirigeant n'est pas celui de la boîte.
    to: [estGeneraleEmail(e) || nomContactEmail(c) === 'ce contact' ? { email: e.email } : { email: e.email, name: nomContactEmail(c) }],
    subject: e.objet,
    htmlContent: html,
    textContent: `${corpsTexte}${signature ? `\n\n${signature.texte}` : ''}\n\n--\nPour ne plus recevoir mes messages, se désinscrire : ${lien}`,
    headers: { 'List-Unsubscribe': `<${lien}>, <mailto:${ADMIN_EMAIL}?subject=D%C3%A9sinscription>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    ...(r.sans_tag ? {} : { tags: ['prospection-email'] }),
  };
  const poster = async (c2) => {
    try {
      return await fetch(`${BREVO}/smtp/email`, { method: 'POST', headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' }, body: JSON.stringify(c2), signal: AbortSignal.timeout(15000) });
    } catch (x) {
      // Pas de réponse : on ne sait pas si c'est parti. Jamais de second essai.
      throw new ErreurBrevo(`Brevo n'a pas répondu (${x?.name || 'réseau'}) : regarde dans Brevo (journal des emails transactionnels) si c'est parti avant de renvoyer.`, { inconnu: true });
    }
  };
  let rep = await poster(corps);
  let texteErreur = rep.ok ? '' : await rep.text();
  // Si l'offre gratuite refuse les tags, on envoie sans et on suit par messageId (les événements sont relus par messageId).
  if (!rep.ok && rep.status === 400 && corps.tags && /tag/i.test(texteErreur)) {
    const { tags: _t, ...sansTag } = corps;
    rep = await poster(sansTag);
    texteErreur = rep.ok ? '' : await rep.text();
    if (rep.ok) await majReglageEmail({ sans_tag: true });
  }
  if (!rep.ok) {
    console.error('crm email brevo', rep.status, texteErreur.slice(0, 300));
    throw new ErreurBrevo(`Brevo a refusé l'envoi (${rep.status}) : ${couper(texteErreur.replace(/\s+/g, ' '), 200)}`, { arret: [401, 402, 403].includes(rep.status) });
  }
  const d = await rep.json().catch(() => ({}));
  return String(d.messageId || '');
}

// Après l'envoi (ou quand Brevo dit qu'une campagne est partie) : historique, compteurs et tâche du lead.
async function appliquerEnvoiEmail(e, l, c, { messageId = null, envoyeLe = new Date().toISOString(), campagne = null } = {}) {
  const jourEnvoi = jourParis(envoyeLe);
  const ligne = await majLigneEmail(e.id, { statut: 'envoye', envoye_le: envoyeLe, suite_le: new Date().toISOString(), ...(messageId ? { brevo_message_id: messageId } : {}), detail: campagne ? e.detail : null });
  if (!l) return ligne;
  const r = await reglageEmail();
  await journalEmail(l, c, 'email_envoye', `Email de prospection envoyé à ${nomContactEmail(c)}${e.email ? ` (${e.email})` : ''}${campagne ? `, campagne Brevo ${campagne}` : ''} : « ${e.objet || ''} »`, e.texte || null,
    { etape: e.etape, a: e.email, objet: e.objet, de: r.expediteur, brevo_message_id: messageId, brevo_campagne: campagne, prospection_email: e.id }, envoyeLe);
  const maj = { relances_sans_reponse: 0, tache_fil: null };
  if (!l.dernier_contact || l.dernier_contact < jourEnvoi) maj.dernier_contact = jourEnvoi;
  if (l.statut === 'nouveau') maj.statut = 'contacte';
  // Une tâche déjà écrite pour cet envoi (la campagne 1, préparée par Claude Code le 12/11) reste telle quelle.
  if (!(campagne && /^Email :/.test(l.prochaine_note || ''))) {
    Object.assign(maj, { prochaine_relance: dansJoursOuvres(4, jourEnvoi), prochaine_action: 'autre', prochaine_note: `Email : pas de réponse de ${nomContactEmail(c)} au message du ${dateCourte(jourEnvoi).slice(0, 5)} : décider de la relance (email ou appel d'Anna).` });
  }
  await sb(`iae_crm_leads?id=eq.${l.id}`, { methode: 'PATCH', prefer: 'return=minimal', corps: maj });
  return ligne;
}

// L'ordre de la file d'envoi (Gabriel, 13/11), sans changer le quota : 1. au dirigeant (adresse nominative), BTP ou propreté,
// rendez-vous possible dans ses bureaux (trajet de 40 min au plus depuis Nancy, calculé à la rédaction : faits.rdv.bureaux) ;
// 2. BTP ou propreté du Grand Est ; 3. autre métier du Grand Est ; 4. le reste. À rang égal, au dirigeant avant l'accueil, puis
// la ligne validée la première. Le département vient du siège au registre, sinon de la liste (prospect.dep), sinon du lead.
const DEPARTEMENTS_GRAND_EST = new Set(['08', '10', '51', '52', '54', '55', '57', '67', '68', '88']);
const LIBELLES_PRIORITE_EMAIL = { 1: 'BTP ou propreté, au dirigeant, rendez-vous possible dans ses bureaux', 2: 'BTP ou propreté du Grand Est', 3: 'autre métier du Grand Est', 4: 'hors cœur de cible' };
function departementEmail(e, l) {
  const f = e.faits || {};
  const cp = String(e.siege_cp ?? f.registre?.siege?.code_postal ?? '').trim();
  if (/^\d{5}$/.test(cp)) return cp.slice(0, 2);
  const code = String(f.registre?.siege?.code_commune || '').trim();
  if (/^\d{5}$/.test(code)) return code.slice(0, 2);
  const dep = String(e.prospect_dep ?? f.prospect?.dep ?? '').trim();
  if (/^\d{2}$/.test(dep)) return dep;
  return (String(l?.localisation || '').match(/\((\d{2})\d{0,3}\)/) || [])[1] || null;
}
function prioriteEmail(e, l) {
  const metier = metierEmail(l);
  const cible = metier === 'du BTP' || metier === 'de la propreté';
  const nominative = !estGeneraleEmail(e);
  const bureaux = (e.rdv_bureaux ?? e.faits?.rdv?.bureaux) === true;
  const grandEst = DEPARTEMENTS_GRAND_EST.has(departementEmail(e, l));
  const rang = nominative && cible && bureaux ? 1 : cible && grandEst ? 2 : grandEst ? 3 : 4;
  return { rang, nominative, libelle: LIBELLES_PRIORITE_EMAIL[rang] };
}
// Les relances passent avant les nouveaux emails (13/11), puis l'ordre ci-dessus.
function ordonnerFileEmail(lignes, leads) {
  const cle = (e) => { const p = prioriteEmail(e, leads.get(e.lead_id)); return [e.etape === 'message' ? 1 : 0, p.rang, p.nominative ? 0 : 1, String(e.valide_le || '')]; };
  const cles = new Map(lignes.map((e) => [e.id, cle(e)]));
  return [...lignes].sort((a, b) => { const x = cles.get(a.id); const y = cles.get(b.id); for (let k = 0; k < x.length; k++) if (x[k] !== y[k]) return x[k] < y[k] ? -1 : 1; return 0; });
}
async function leadsPourFileEmail(lignes) {
  const ids = [...new Set(lignes.map((e) => e.lead_id).filter((x) => UUID_RE.test(x || '')))];
  if (!ids.length) return new Map();
  const { lignes: ls } = await sb(`iae_crm_leads?id=in.(${ids.join(',')})&select=id,entreprise,secteur,tags,besoin,localisation`);
  return new Map(ls.map((l) => [l.id, l]));
}

// La réserve pour les emails du site (Gabriel, 13/11) : un seul compte Brevo envoie aussi les emails du site (rendez-vous,
// demandes) ; s'il reste moins de 100 envois au compte, aucun email de prospection ne part à ce passage. Documentation
// officielle lue le 13/11/2026 (https://developers.brevo.com/reference/get-account) : GET /v3/account rend plan[], chaque
// élément avec type (free, subscription, payAsYouGo, sms), creditsType (sendLimit : les emails qu'il reste à envoyer) et
// credits (les crédits restants, un nombre, parfois écrit en chaîne). On additionne les sendLimit hors SMS. Si Brevo ne
// répond pas ou rend autre chose, on ne bloque pas l'envoi (null).
const RESERVE_BREVO = 100;
async function creditsBrevo() {
  try {
    const r = await fetch(`${BREVO}/account`, { headers: { 'api-key': process.env.BREVO_API_KEY, accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) { console.error('crm email compte brevo', r.status); return null; }
    const d = await r.json();
    const plans = (Array.isArray(d?.plan) ? d.plan : []).filter((p) => p?.creditsType === 'sendLimit' && p.type !== 'sms' && Number.isFinite(Number.parseFloat(String(p.credits))));
    return plans.length ? plans.reduce((t, p) => t + Number.parseFloat(String(p.credits)), 0) : null;
  } catch (x) {
    console.error('crm email compte brevo', x?.name || x?.message);
    return null;
  }
}

async function envoyerFileEmail(r, bilan, reste, signature = null) {
  let place = Math.min(r.par_passage, r.par_jour - (await envoyesDuJourEmail()));
  if (place <= 0) return;
  const { lignes: file } = await sb('iae_crm_emails?statut=eq.a_envoyer&order=valide_le.asc&limit=100&select=*');
  if (!file.length) return;
  const credits = await creditsBrevo();
  if (credits != null && credits < RESERVE_BREVO) {
    const texte = `Brevo : plus que ${Math.floor(credits)} envois au compte aujourd'hui (réserve de ${RESERVE_BREVO} pour les emails du site) : aucun email de prospection n'est parti au passage de ${heureMinuteParis().replace(':', ' h ')}.`;
    console.log('crm email réserve brevo', credits);
    bilan.reserve_brevo = texte;
    await ecrireReglage('email_prospection_suivi', { ...((await lireReglage('email_prospection_suivi')) || {}), reserve_brevo: { texte, credits, le: new Date().toISOString() } });
    return;
  }
  const lignes = ordonnerFileEmail(file, await leadsPourFileEmail(file));
  for (const e of lignes) {
    if (place <= 0 || !reste()) break;
    // La ligne est prise d'abord : un autre passage qui tournerait en même temps ne l'enverra pas une deuxième fois.
    const jeton = randomBytes(24).toString('base64url');
    const { lignes: pris } = await sb(`iae_crm_emails?id=eq.${e.id}&statut=eq.a_envoyer`, { methode: 'PATCH', prefer: 'return=representation', corps: { statut: 'en_cours', pris_le: new Date().toISOString(), jeton_stop_hash: createHash('sha256').update(jeton).digest('hex') } });
    if (!pris || !pris.length) continue;
    const { l, c } = await leadEtContactEmail(e);
    // Jamais d'envoi sans le registre (opposition à la prospection, entreprise fermée…) : une ligne rédigée à la main
    // pendant que le registre ne répondait pas est vérifiée ici ; s'il ne répond toujours pas, elle attend.
    if (l && !e.faits?.registre) {
      const v = await verifierFaitsEmail(e, l, c, bilan);
      if (v === false) continue;
      if (v === null) { await majLigneEmail(e.id, { statut: 'a_envoyer', pris_le: null }); continue; }
    }
    const refus = await refusAvantEnvoi(e, l, c);
    if (refus?.attente) { await majLigneEmail(e.id, { statut: 'a_envoyer', pris_le: null, detail: refus.attente }); continue; }
    if (refus) { await majLigneEmail(e.id, { statut: 'annule', detail: refus }); bilan.annules++; continue; }
    try { verifierTexteEmail(e.objet, e.texte); } catch (x) { await majLigneEmail(e.id, { statut: 'brouillon', valide_le: null, detail: messageRefusEmail(x) }); continue; }
    let messageId;
    try {
      messageId = await envoyerBrevoEmail(e, c, r, jeton, signature);
    } catch (x) {
      await majLigneEmail(e.id, { statut: 'echec', detail: couper(x.message, 400) });
      bilan.echecs++;
      if (x.arret) break;
      continue;
    }
    await appliquerEnvoiEmail(e, l, c, { messageId });
    place--;
    bilan.envoyes++;
  }
}

// L'ordre du circuit (Gabriel, 12/11) : registre et faits publics → adresse gratuite du dirigeant (ADEME, BOAMP, site) →
// FullEnrich seulement pour un contact ultra qualifié → rédaction par Claude → validation. Deux recherches de site par
// passage au plus (une lecture prend jusqu'à une dizaine de secondes).
const RECHERCHES_GRATUITES_PAR_PASSAGE = 2;
async function adressesEmails(r, bilan, reste) {
  const { lignes } = await sb('iae_crm_emails?statut=eq.a_enrichir&fullenrich_id=is.null&order=created_at.asc&limit=20&select=*');
  if (!lignes.length) return;
  const cle = process.env.FULLENRICH_API_KEY;
  let place = 0;
  if (cle) {
    // Le plafond compte les recherches abouties (adresse du dirigeant posée) et celles en cours, qui peuvent aboutir.
    const { lignes: dujour } = await sb(`iae_crm_emails?fullenrich_le=gte.${encodeURIComponent(minuitParis(aujourdHuiParis()))}&select=id,statut,email,source_email,fullenrich_id`);
    const abouties = dujour.filter((x) => x.source_email === 'fullenrich' && x.email).length;
    const enCours = dujour.filter((x) => x.statut === 'a_enrichir' && x.fullenrich_id).length;
    place = Math.max(0, Math.min(r.enrichissements - abouties - enCours, r.tentatives_fullenrich - dujour.length, 100));
  }
  let recherches = 0;
  const lot = [];
  for (const e0 of lignes) {
    if (!reste(5000)) break;
    const { l, c } = await leadEtContactEmail(e0);
    if (!l || !c) { await majLigneEmail(e0.id, { statut: 'annule', detail: 'Lead ou contact supprimé.' }); continue; }
    // 1. Le registre et les faits publics (gratuits) : une entreprise fermée, opposée ou en procédure s'arrête là.
    let e = await verifierFaitsEmail(e0, l, c, bilan);
    if (!e) continue;
    bilan.verifies++;
    // Sans nom, pas d'adresse du dirigeant à chercher : l'adresse générale, « à l'attention du gérant » (Gabriel, 12/11).
    if (!c.prenom || !c.nom) { await repliAdresseGenerale(e, l, c, 'Prénom ou nom du dirigeant manquant', bilan); continue; }
    // 2. Une adresse déjà connue (import de la base Google Maps d'Anna) : la règle de l'adresse du dirigeant, avec les
    // dirigeants du registre, et le MX, une fois. « fiable » : posée ; « déduite » : jamais envoyée telle quelle, seulement
    // si FullEnrich confirme une adresse du dirigeant (plus bas). Une adresse qui ne passe pas : le circuit normal.
    const connue = e.faits?.adresse_connue;
    if (connue?.email && !connue.jugee_le) {
      const personnes = await personnesDe(e, c);
      const j = jugerAdresse(connue.email, personnes, l.entreprise);
      const mx = j.ok ? await mxDuDomaine(connue.email.split('@')[1]) : null;
      if (mx === 'inconnu') { await majLigneEmail(e.id, { detail: "Le DNS ne répond pas pour vérifier le domaine de l'adresse connue : nouvel essai au prochain passage." }); continue; }
      const refus = !j.ok ? MOTIFS_ADRESSE[j.raison] : mx === 'non' ? MOTIFS_ADRESSE.mx : null;
      const qui = j.ok ? [j.personne.prenom, j.personne.nom].filter(Boolean).join(' ') : null;
      const faits = { ...(e.faits || {}), adresse_connue: { ...connue, jugee_le: new Date().toISOString(), ...(refus ? { refus } : { personne: qui }) } };
      if (!refus && connue.fiabilite === 'fiable') {
        if (await enOpposition(connue.email)) { await majLigneEmail(e.id, { statut: 'annule', email: connue.email, faits, detail: 'Adresse en opposition (désinscription ou spam) : rien ne part.' }); continue; }
        const adresse = { cherchee_le: new Date().toISOString(), source: 'outscraper', email: connue.email, fiabilite: connue.detail || 'fiable', url: null, personne: qui, vues: [] };
        await poserAdresse(e, l, c, { email: connue.email, personne: j.personne, source_email: 'site', email_statut: 'OUTSCRAPER', faits: { ...faits, adresse }, journal: `Adresse de {qui} connue par la base Google Maps d'Anna (Outscraper : ${connue.detail || 'fiable'}) : ${connue.email}, conforme à la règle de l'adresse du dirigeant. Message en cours de rédaction.` });
        bilan.gratuites++;
        continue;
      }
      e = await majLigneEmail(e.id, { faits });
    }
    const deduite = e.faits?.adresse_connue?.fiabilite === 'deduit' && !e.faits.adresse_connue.refus ? e.faits.adresse_connue.email : null;
    const ecartee = e.faits?.adresse_connue?.refus ? `Adresse de la base Google Maps écartée (${e.faits.adresse_connue.email} : ${e.faits.adresse_connue.refus}). ` : '';
    // 3. L'adresse du dirigeant dans les sources publiques, une fois par ligne.
    if (!e.faits?.adresse?.cherchee_le) {
      if (recherches >= RECHERCHES_GRATUITES_PAR_PASSAGE || !reste(15000)) continue;
      recherches++;
      const res = await chercherAdresseGratuite(e, l, c);
      if (res.attente) { await majLigneEmail(e.id, { detail: res.attente }); continue; }
      const ac = e.faits?.adresse_connue;
      if (ac?.refus && res.adresse) res.adresse.vues = [{ email: ac.email, source: 'outscraper', url: null, raison: ac.refus }, ...(res.adresse.vues || [])].slice(0, 12);
      const faits = { ...(e.faits || {}), adresse: res.adresse };
      if (res.trouvee) {
        const t = res.trouvee;
        if (await enOpposition(t.email)) { await majLigneEmail(e.id, { statut: 'annule', email: t.email, faits, detail: 'Adresse en opposition (désinscription ou spam) : rien ne part.' }); continue; }
        await poserAdresse(e, l, c, { email: t.email, personne: t.personne, source_email: 'site', email_statut: 'PUBLIQUE', faits, journal: `Adresse de {qui} trouvée gratuitement (${SOURCES_GRATUITES[t.source]}${t.url ? ` : ${t.url}` : ''}) : ${t.email}. Message en cours de rédaction.` });
        bilan.gratuites++;
        continue;
      }
      e = await majLigneEmail(e.id, { faits });
    }
    // 4. Pas d'adresse gratuite : FullEnrich pour un contact ultra qualifié, ou pour vérifier une adresse déduite (réglage
    // fullenrich_deduites, oui depuis le 12/11) ; elle n'est utilisée que si FullEnrich confirme une adresse DELIVERABLE du
    // dirigeant. 5. Sinon, l'adresse générale de l'entreprise (repli).
    const u = ultraQualifie(e, l);
    const verifierDeduite = Boolean(deduite) && r.fullenrich_deduites !== false;
    if (!u.ok && !verifierDeduite) {
      await repliAdresseGenerale(e, l, c, `${ecartee}${deduite ? `Adresse déduite (${deduite}) jamais vérifiée, ` : ''}${deduite ? "pas d'adresse" : "Pas d'adresse"} du dirigeant dans les sources publiques, et pas assez qualifié pour FullEnrich (${u.manque.join(', ')})`, bilan);
      continue;
    }
    const enAttente = deduite ? `Adresse déduite à vérifier (${deduite})` : 'Ultra qualifié, en attente de FullEnrich';
    const cause = !cle ? "la clé FullEnrich n'est pas sur Vercel" : lot.length >= place ? `plafond du jour atteint (${r.enrichissements} adresses trouvées par jour)` : null;
    const attente = cause ? `${enAttente} : ${cause}${!cle ? ' (Claude Code peut chercher l\'adresse avec le MCP FullEnrich)' : ''}.` : null;
    if (!e.faits?.ultra || attente !== e.detail) e = await majLigneEmail(e.id, { faits: { ...(e.faits || {}), ultra: { le: e.faits?.ultra?.le || new Date().toISOString(), forts: u.forts.slice(0, 3), ...(u.ok ? {} : { deduite: true }) } }, detail: attente });
    // Au plus 3 jours ouvrés d'attente d'une adresse du dirigeant (Gabriel, 12/11), puis l'adresse générale.
    if (attente && aujourdHuiParis() >= apresJoursOuvres(3, jourParis(e.faits.ultra.le))) {
      await repliAdresseGenerale(e, l, c, `${enAttente} depuis 3 jours ouvrés (${cause})`, bilan);
      continue;
    }
    if (attente) continue;
    if (c.email && (await enOpposition(c.email))) { await majLigneEmail(e.id, { statut: 'annule', detail: 'Adresse en opposition.' }); continue; }
    const site = siteDe(e.faits || {}, l);
    let domaine = null;
    try { domaine = site ? sansWww(new URL(/^https?:\/\//i.test(site) ? site : `https://${site}`).hostname) : null; } catch { /* rien */ }
    lot.push({ e, l, c, domaine: domaine && DOMAINE_RE.test(domaine) ? domaine : null });
  }
  if (!lot.length) return;
  const corps = {
    name: `CRM IA-Entrepreneur, prospection email du ${dateCourte(aujourdHuiParis())}`,
    data: lot.map(({ e, l, c, domaine }) => ({ first_name: c.prenom, last_name: nomPropre(c.nom), company_name: l.entreprise, ...(domaine ? { domain: domaine } : {}), enrich_fields: ['contact.work_emails'], custom: { ligne: e.id } })),
  };
  let rep;
  try {
    rep = await fetch(`${FULLENRICH}/contact/enrich/bulk`, { method: 'POST', headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corps), signal: AbortSignal.timeout(15000) });
  } catch (x) {
    console.error('crm email fullenrich', x?.name || x?.message);
    return;
  }
  if (!rep.ok) {
    const t = (await rep.text()).slice(0, 300);
    console.error('crm email fullenrich', rep.status, t);
    await ecrireReglage('email_prospection_suivi', { ...((await lireReglage('email_prospection_suivi')) || {}), fullenrich_erreur: `FullEnrich a refusé la recherche (${rep.status}) le ${dateCourte(aujourdHuiParis())}${rep.status === 402 ? ' : crédits épuisés' : rep.status === 401 ? ' : clé refusée' : ''}.` });
    return;
  }
  const { enrichment_id: id } = await rep.json();
  if (!id) return;
  const maintenant = new Date().toISOString();
  await sb(`iae_crm_emails?id=in.(${lot.map((x) => x.e.id).join(',')})`, { methode: 'PATCH', prefer: 'return=minimal', corps: { fullenrich_id: String(id).slice(0, 80), fullenrich_le: maintenant, detail: 'Ultra qualifié : adresse en cours de recherche (FullEnrich).' } });
  const suivi = (await lireReglage('email_prospection_suivi')) || {};
  if (suivi.fullenrich_erreur) await ecrireReglage('email_prospection_suivi', { ...suivi, fullenrich_erreur: null });
  bilan.enrichis += lot.length;
}

async function lireEnrichissements(bilan, reste) {
  const cle = process.env.FULLENRICH_API_KEY;
  if (!cle) return;
  const { lignes } = await sb('iae_crm_emails?statut=eq.a_enrichir&fullenrich_id=not.is.null&select=*&limit=200');
  const parId = new Map();
  for (const e of lignes) { if (!parId.has(e.fullenrich_id)) parId.set(e.fullenrich_id, []); parId.get(e.fullenrich_id).push(e); }
  for (const [id, ls] of parId) {
    if (!reste(5000)) break;
    let rep;
    try {
      rep = await fetch(`${FULLENRICH}/contact/enrich/bulk/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${cle}` }, signal: AbortSignal.timeout(15000) });
    } catch { continue; }
    if (rep.status === 400) continue; // error.enrichment.in_progress : pas encore fini
    const d = rep.status === 402 || rep.ok ? await rep.json().catch(() => null) : null;
    if (!d) { console.error('crm email fullenrich lecture', rep.status); continue; }
    if (['CREATED', 'IN_PROGRESS'].includes(d.status)) continue;
    const resultats = new Map((d.data || []).map((x) => [x?.custom?.ligne, x]));
    for (const e of ls) {
      const x = resultats.get(e.id);
      const trouve = x?.contact_info?.most_probable_work_email || (x?.contact_info?.work_emails || []).find((w) => w?.status === 'DELIVERABLE') || null;
      const adresse = normEmail(trouve?.email);
      const { l, c } = await leadEtContactEmail(e);
      if (!x && d.status !== 'FINISHED') {
        // Crédits épuisés, annulé, limite : la ligne repart dans la file des recherches (demain, le plafond du jour étant pris).
        await majLigneEmail(e.id, { fullenrich_id: null, detail: `FullEnrich n'a pas fini (${d.status}) : nouvel essai plus tard.` });
        continue;
      }
      if (trouve?.status !== 'DELIVERABLE' || !EMAIL_RE.test(adresse)) {
        await majLigneEmail(e.id, { fullenrich_id: null, email_statut: trouve?.status || 'INTROUVABLE' });
        await repliAdresseGenerale(e, l, c, `Pas d'adresse vérifiée du dirigeant (${trouve?.status ? `FullEnrich : ${trouve.status}` : 'FullEnrich ne trouve rien'})`, bilan);
        continue;
      }
      // Même une adresse vérifiée doit être celle du dirigeant (Gabriel, 12/11 : jamais d'adresse générale).
      const j = jugerAdresse(adresse, await personnesDe(e, c), l?.entreprise);
      const mx = j.ok ? await mxDuDomaine(adresse.split('@')[1]) : null;
      if (!j.ok || mx === 'non') {
        await majLigneEmail(e.id, { fullenrich_id: null });
        await repliAdresseGenerale(e, l, c, `FullEnrich donne ${adresse} : ${MOTIFS_ADRESSE[j.ok ? 'mx' : j.raison]}`, bilan);
        continue;
      }
      if (await enOpposition(adresse)) { await majLigneEmail(e.id, { statut: 'annule', email: adresse, detail: 'Adresse en opposition (désinscription ou spam) : rien ne part.' }); continue; }
      await poserAdresse(e, l, c, { email: adresse, personne: j.personne, source_email: 'fullenrich', email_statut: 'DELIVERABLE', journal: `Adresse vérifiée trouvée pour {qui} (FullEnrich) : ${adresse}. Message en cours de rédaction.` });
      bilan.adresses++;
    }
  }
}

async function redigerEmails(bilan, reste) {
  if (!process.env.ANTHROPIC_API_KEY) return;
  const { lignes } = await sb('iae_crm_emails?statut=eq.a_rediger&order=created_at.asc&limit=4&select=*');
  let n = 0;
  for (const e0 of lignes) {
    // Deux rédactions par passage : la synchro a 60 secondes en tout, et la boîte Gmail passe avant.
    if (n >= 2 || !reste(15000)) break;
    const { l, c } = await leadEtContactEmail(e0);
    if (!l) { await majLigneEmail(e0.id, { statut: 'annule', detail: 'Lead supprimé.' }); continue; }
    const e = await verifierFaitsEmail(e0, l, c, bilan);
    if (!e) continue;
    n++;
    try {
      await preparerEmailAvecClaude(e, l, c);
      bilan.rediges++;
    } catch (x) {
      console.error('crm email rédaction', x?.code || x?.message);
    }
  }
}

/* ----- Le bilan : événements Brevo, campagne, pause automatique ----- */

// Les noms d'événements de Brevo (GET /v3/smtp/statistics/events), ramenés aux nôtres.
const EVENEMENTS_BREVO = {
  delivered: 'delivered', hardbounces: 'hard_bounce', hardbounce: 'hard_bounce', softbounces: 'soft_bounce', softbounce: 'soft_bounce',
  spam: 'spam', complaint: 'spam', unsubscribed: 'unsubscribed', unsubscribe: 'unsubscribed', blocked: 'blocked', invalid: 'invalid',
  error: 'error', deferred: 'deferred', opened: 'opened', loadedbyproxy: 'opened', clicks: 'clicked', click: 'clicked', requests: 'demande', request: 'demande',
};
const ERREURS_ADRESSE = ['hard_bounce', 'invalid', 'blocked'];
const sansChevrons = (m) => String(m || '').trim().replace(/^<|>$/g, '');
const instantIso = (d) => { const t = Date.parse(d || ''); return new Date(Number.isNaN(t) ? Date.now() : t).toISOString(); };

// Ajoute les nouveaux événements d'une ligne et en tire les conséquences (spam, désinscription, adresse en erreur).
async function noterEvenementsEmail(e, nouveaux, bilan, { raison = '' } = {}) {
  const avant = e.evenements || {};
  const ajout = Object.fromEntries(Object.entries(nouveaux).filter(([k, v]) => v && !avant[k]));
  if (!Object.keys(ajout).length) return;
  const evenements = { ...avant, ...ajout, ...(raison && !avant.raison ? { raison: couper(raison, 200) } : {}) };
  await majLigneEmail(e.id, { evenements });
  bilan.evenements += Object.keys(ajout).length;
  const { l, c } = await leadEtContactEmail(e);
  if (ajout.spam) await enregistrerOpposition(e.email, 'signalé comme spam (Brevo)', { ligne: e });
  else if (ajout.unsubscribed) await enregistrerOpposition(e.email, 'désinscription Brevo', { ligne: e });
  if (ERREURS_ADRESSE.some((k) => ajout[k]) && l) {
    await majLigneEmail(e.id, { detail: `Adresse en erreur${raison ? ` (${couper(raison, 160)})` : ''} : l'email n'est pas arrivé.` });
    await journalEmail(l, c, 'note', `L'email de prospection à ${e.email} n'est pas arrivé (adresse en erreur${raison ? ` : ${couper(raison, 160)}` : ''}).`, null, { etape: 'erreur_adresse' });
    if (['nouveau', 'contacte'].includes(l.statut)) await sb(`iae_crm_leads?id=eq.${l.id}`, { methode: 'PATCH', prefer: 'return=minimal', corps: { prochaine_relance: aujourdHuiParis(), prochaine_action: 'autre', prochaine_note: `Email : l'adresse de ${nomContactEmail(c)} est en erreur, le message n'est pas arrivé. Passer par le téléphone (Anna) ou trouver une autre adresse.` } });
  }
}

async function suivreEvenementsEmail(bilan) {
  const depuis30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const { lignes } = await sb(`iae_crm_emails?statut=eq.envoye&brevo_message_id=not.is.null&envoye_le=gte.${encodeURIComponent(depuis30)}&select=*`);
  if (!lignes.length) return;
  const parMessage = new Map(lignes.map((e) => [sansChevrons(e.brevo_message_id), e]));
  const jour = aujourdHuiParis();
  const plusAncien = lignes.map((e) => jourParis(e.envoye_le)).sort()[0];
  const suivi = (await lireReglage('email_prospection_suivi')) || {};
  // Depuis le dernier passage (un jour de marge : Brevo compte en dates), jamais plus de 30 jours.
  const debut = [suivi.evenements_depuis ? ajouterJoursIso(suivi.evenements_depuis, -1) : plusAncien, plusAncien].sort().pop();
  const q = new URLSearchParams({ startDate: debut, endDate: jour, limit: '2500', sort: 'asc' });
  const r = await fetch(`${BREVO}/smtp/statistics/events?${q}`, { headers: { 'api-key': process.env.BREVO_API_KEY, accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) { console.error('crm email événements', r.status, (await r.text()).slice(0, 200)); return; }
  const d = await r.json();
  const parLigne = new Map();
  for (const ev of d.events || []) {
    const e = parMessage.get(sansChevrons(ev.messageId));
    const nom = EVENEMENTS_BREVO[String(ev.event || '').toLowerCase()];
    if (!e || !nom) continue;
    if (!parLigne.has(e.id)) parLigne.set(e.id, { e, nouveaux: {}, raison: '' });
    const x = parLigne.get(e.id);
    if (!x.nouveaux[nom]) x.nouveaux[nom] = instantIso(ev.date);
    if (ev.reason && !x.raison) x.raison = String(ev.reason);
  }
  for (const { e, nouveaux, raison } of parLigne.values()) await noterEvenementsEmail(e, nouveaux, bilan, { raison });
  await ecrireReglage('email_prospection_suivi', { ...((await lireReglage('email_prospection_suivi')) || {}), evenements_depuis: jour, evenements_le: new Date().toISOString() });
}

// La campagne Brevo 1 du 13/11 (et les suivantes) : GET /v3/emailCampaigns/{id} pour l'état et les chiffres, et les
// statistiques de chaque destinataire (GET /v3/contacts/{email}/campaignStats) pour savoir qui s'est désinscrit ou a
// signalé un spam. Quand Brevo la dit partie, l'envoi entre dans l'historique du lead, une seule fois.
async function suivreCampagnesEmail(bilan) {
  const depuis30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const { lignes } = await sb(`iae_crm_emails?brevo_campagne=not.is.null&statut=eq.envoye&or=(suite_le.is.null,envoye_le.gte.${encodeURIComponent(depuis30)})&select=*`);
  if (!lignes.length) return;
  const cle = process.env.BREVO_API_KEY;
  const suivi = (await lireReglage('email_prospection_suivi')) || {};
  const campagnes = { ...(suivi.campagnes || {}) };
  for (const n of [...new Set(lignes.map((e) => e.brevo_campagne))]) {
    const r = await fetch(`${BREVO}/emailCampaigns/${Number(n)}`, { headers: { 'api-key': cle, accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) { console.error('crm email campagne', n, r.status); continue; }
    const k = await r.json();
    const g = k.statistics?.globalStats || {};
    campagnes[n] = { statut: k.status || null, partie_le: k.sentDate || null, envoyes: g.sent ?? null, arrives: g.delivered ?? null, erreurs: g.hardBounces ?? null, spam: g.complaints ?? null, desinscriptions: g.unsubscriptions ?? null, lu_le: new Date().toISOString() };
    if (k.status !== 'sent') continue;
    for (const e of lignes.filter((x) => x.brevo_campagne === n)) {
      const { l, c } = await leadEtContactEmail(e);
      if (!e.suite_le) {
        // Pas deux fois le même envoi dans l'historique (Claude Code a pu le noter à la main).
        const { lignes: deja } = await sb(`iae_crm_activites?lead_id=eq.${e.lead_id}&type=eq.email_envoye&meta->>brevo_campagne=eq.${n}&select=id&limit=1`);
        if (deja.length) await majLigneEmail(e.id, { suite_le: new Date().toISOString(), envoye_le: k.sentDate || e.envoye_le });
        else await appliquerEnvoiEmail({ ...e, texte: e.texte }, l, c, { envoyeLe: k.sentDate || e.envoye_le, campagne: n });
        e.envoye_le = k.sentDate || e.envoye_le;
      }
      const rs = await fetch(`${BREVO}/contacts/${encodeURIComponent(e.email)}/campaignStats`, { headers: { 'api-key': cle, accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      if (!rs.ok) continue;
      const s = await rs.json();
      const quand = (liste) => { const t = Array.isArray(liste) ? liste.find((x) => Number(x.campaignId) === Number(n))?.eventTime : null; return t ? instantIso(t) : null; };
      await noterEvenementsEmail(e, {
        delivered: quand(s.delivered), hard_bounce: quand(s.hardBounces), soft_bounce: quand(s.softBounces), spam: quand(s.complaints),
        unsubscribed: quand(s.unsubscriptions?.userUnsubscription), opened: quand(s.opened), clicked: quand(s.clicked),
      }, bilan);
    }
  }
  await ecrireReglage('email_prospection_suivi', { ...((await lireReglage('email_prospection_suivi')) || {}), campagnes });
}

// Pause automatique (Gabriel, 12/11 : « molo ») : dès 1 signalement comme spam, ou plus d'1 adresse en erreur, depuis la
// dernière reprise ; depuis le 13/11, aussi 2 désinscriptions ou « stop » sur 7 jours, ou un email différé plus de 24 h.
// Seul Gabriel reprend (bouton « Reprendre »).
async function verifierPauseEmail() {
  const r = await reglageEmail();
  if (r.pause) return r.pause;
  const depuis = r.reprise_le || '2000-01-01T00:00:00Z';
  const depuis60 = new Date(Date.now() - 60 * 86400000).toISOString();
  const { lignes } = await sb(`iae_crm_emails?statut=eq.envoye&evenements=not.is.null&envoye_le=gte.${encodeURIComponent(depuis60)}&select=evenements`);
  const apres = (ev, k) => ev?.[k] && Date.parse(ev[k]) >= Date.parse(depuis);
  const spam = lignes.filter((x) => apres(x.evenements, 'spam')).length;
  const erreurs = lignes.filter((x) => ERREURS_ADRESSE.some((k) => apres(x.evenements, k))).length;
  // Gabriel, 13/11 : aussi 2 désinscriptions ou « stop » sur 7 jours glissants, et un email différé depuis plus de 24 h sans
  // remise (toujours depuis la dernière reprise : une pause n'est jamais levée toute seule).
  const il7 = Date.now() - 7 * 86400000;
  const desinscriptions = lignes.filter((x) => apres(x.evenements, 'unsubscribed') && Date.parse(x.evenements.unsubscribed) >= il7).length;
  const differes = lignes.filter((x) => apres(x.evenements, 'deferred') && differeSansRemise(x)).length;
  const raison = spam >= 1 ? `${spam} message${spam > 1 ? 's' : ''} signalé${spam > 1 ? 's' : ''} comme spam`
    : erreurs > 1 ? `${erreurs} adresses en erreur`
      : desinscriptions >= 2 ? `${desinscriptions} désinscriptions ou « stop » sur 7 jours`
        : differes ? `${differes > 1 ? `${differes} emails différés` : 'un email différé'} depuis plus de 24 h sans être arrivé${differes > 1 ? 's' : ''}` : null;
  if (!raison) return null;
  const pause = { le: new Date().toISOString(), raison: `${raison} : envois arrêtés automatiquement.`, auto: true };
  await majReglageEmail({ pause });
  return pause;
}

// Le bilan, pour la barre et le récap de 7 h : aujourd'hui N envoyés sur le quota ; depuis le début et sur 7 jours :
// envoyés, arrivés, adresses en erreur, spam, désinscriptions, réponses (email reçu sur le lead après l'envoi). Pas de
// taux d'ouverture : Apple le fausse.
function bilanEmail(envoyes, recus, { quota, jour = aujourdHuiParis() } = {}) {
  const maintenant = Date.now();
  const partis = envoyes.filter((e) => e.statut === 'envoye' && e.envoye_le && Date.parse(e.envoye_le) <= maintenant);
  const recuParLead = new Map();
  for (const a of recus) { if (!recuParLead.has(a.lead_id)) recuParLead.set(a.lead_id, []); recuParLead.get(a.lead_id).push(a.date); }
  const a = (e, ...k) => k.some((x) => e.evenements?.[x]);
  const compterBase = (liste) => ({
    envoyes: liste.length,
    arrives: liste.filter((e) => a(e, 'delivered')).length,
    erreurs: liste.filter((e) => a(e, ...ERREURS_ADRESSE)).length,
    spam: liste.filter((e) => a(e, 'spam')).length,
    desinscriptions: liste.filter((e) => a(e, 'unsubscribed')).length,
    reponses: liste.filter((e) => (recuParLead.get(e.lead_id) || []).some((d) => Date.parse(d) >= Date.parse(e.envoye_le))).length,
  });
  // Au dirigeant (adresse nominative) et à l'accueil (adresse générale), comptés à part (Gabriel, 12/11).
  const compter = (liste) => ({ ...compterBase(liste), nominatives: compterBase(liste.filter((e) => !estGeneraleEmail(e))), generales: compterBase(liste.filter(estGeneraleEmail)) });
  const il7 = maintenant - 7 * 86400000;
  return { aujourdhui: { envoyes: partis.filter((e) => jourParis(e.envoye_le) === jour).length, quota }, debut: compter(partis), semaine: compter(partis.filter((e) => Date.parse(e.envoye_le) >= il7)) };
}
const estGeneraleEmail = (e) => e.email_statut === 'GENERIQUE' || Boolean((e.adresse ?? e.faits?.adresse)?.generique);
// Le bilan propre, condition d'un palier (Gabriel, 13/11) : sur les emails partis depuis le dernier changement de palier (le
// début du palier d'avant ; depuis le début pour le premier), aucun signalement comme spam, au plus 1 adresse en erreur (rebond
// dur), au plus 1 désinscription ou « stop », aucun email resté « différé » plus de 24 h sans être arrivé. Pas de nombre
// minimum d'envois (10 par jour le 16/11 si le bilan est propre, validé par Gabriel).
const DIFFERE_MAX_MS = 24 * 3600000;
const differeSansRemise = (e, maintenant = Date.now()) => {
  const ev = e.evenements || {};
  return Boolean(ev.deferred) && !ev.delivered && !ERREURS_ADRESSE.some((k) => ev[k]) && maintenant - Date.parse(ev.deferred) > DIFFERE_MAX_MS;
};
function raisonsBilanEmail(partis) {
  const a = (e, ...k) => k.some((x) => e.evenements?.[x]);
  const spam = partis.filter((e) => a(e, 'spam')).length;
  const erreurs = partis.filter((e) => a(e, ...ERREURS_ADRESSE)).length;
  const desinscriptions = partis.filter((e) => a(e, 'unsubscribed')).length;
  const differes = partis.filter((e) => differeSansRemise(e)).length;
  const r = [];
  if (spam > 0) r.push(`${pluriel(spam, 'signalement', 'signalements')} comme spam`);
  if (erreurs > 1) r.push(`${pluriel(erreurs, 'adresse en erreur', 'adresses en erreur')} (1 au plus)`);
  if (desinscriptions > 1) r.push(`${pluriel(desinscriptions, 'désinscription')} ou « stop » (1 au plus)`);
  if (differes) r.push(`${pluriel(differes, 'email différé', 'emails différés')} depuis plus de 24 h sans être arrivé${differes > 1 ? 's' : ''}`);
  return r;
}
// Le quota du jour : le plus haut palier atteint dont le bilan est propre sur sa fenêtre ; sinon le quota de base. Si le
// dernier palier atteint n'est pas pris, bloque dit pourquoi (et depuis quand le bilan est compté).
function quotaEmail(r, lignes, pause, jour = aujourdHuiParis()) {
  const paliers = (Array.isArray(r.paliers) ? r.paliers : []).filter((x) => DATE_RE.test(String(x?.a_partir_du || '')) && Number.isInteger(x.par_jour)).sort((a, b) => a.a_partir_du.localeCompare(b.a_partir_du));
  const atteints = paliers.filter((x) => x.a_partir_du <= jour);
  const maintenant = Date.now();
  const partis = (lignes || []).filter((e) => e.statut === 'envoye' && e.envoye_le && Date.parse(e.envoye_le) <= maintenant);
  // La fenêtre d'un palier : depuis le début du palier d'avant (le dernier changement), sinon depuis le début.
  const fenetre = (i) => (i > 0 ? atteints[i - 1].a_partir_du : null);
  const raisonsDepuis = (d) => {
    const x = raisonsBilanEmail(d ? partis.filter((e) => Date.parse(e.envoye_le) >= Date.parse(minuitParis(d))) : partis);
    if (pause) x.push('prospection en pause');
    return x;
  };
  let choisi = -1;
  for (let i = atteints.length - 1; i >= 0 && choisi < 0; i--) if (!raisonsDepuis(fenetre(i)).length) choisi = i;
  const dernier = atteints.length - 1;
  // Sans palier atteint : la fenêtre du prochain (depuis le début), pour annoncer « si le bilan reste propre ».
  const depuis = dernier >= 0 ? fenetre(dernier) : null;
  const raisons = raisonsDepuis(depuis);
  const propre = !raisons.length;
  const palier = choisi >= 0 ? atteints[choisi] : null;
  const quand = depuis ? `depuis le ${dateCourte(depuis).slice(0, 5)}` : 'depuis le début';
  return {
    par_jour: palier ? palier.par_jour : r.par_jour, palier, prochain: paliers.find((x) => x.a_partir_du > jour) || null,
    bloque: dernier >= 0 && choisi !== dernier ? { par_jour: atteints[dernier].par_jour, raison: `${raisons.join(', ')} ${quand}` } : null, propre, raisons, depuis,
  };
}
function texteQuotaEmail(q) {
  const jourCourt = (iso) => dateCourte(iso).slice(0, 5);
  const morceaux = [];
  if (q.bloque) morceaux.push(`palier de ${q.bloque.par_jour} par jour suspendu : ${q.bloque.raison}`);
  if (q.prochain) morceaux.push(`${q.prochain.par_jour} par jour à partir du ${jourCourt(q.prochain.a_partir_du)}${q.propre ? ' si le bilan reste propre' : ' quand le bilan sera propre'}`);
  return morceaux.join(' ; ');
}
const pluriel = (n, un, plusieurs = `${un}s`) => `${n} ${n > 1 ? plusieurs : un}`;
function texteCandidatsEmail(etat) {
  const k = etat.candidats || {};
  return [`${k.en_attente || 0} en attente (registre, adresse)`, `${pluriel(k.gratuites || 0, 'adresse trouvée', 'adresses trouvées')} gratuitement`,
    `${k.ultra_attente || 0} en attente de FullEnrich (ultra qualifiés ou adresses déduites)${k.ultra_attente && !etat.fullenrich ? ', clé FullEnrich absente' : ''}`,
    ...(k.ultra_en_cours ? [`${k.ultra_en_cours} en cours chez FullEnrich`] : []), `${pluriel(k.generales || 0, 'adresse générale', 'adresses générales')} (accueil)`, `${k.sans_adresse || 0} sans adresse (pour Anna)`].join(', ');
}
function texteBilanEmail(b) {
  return `${pluriel(b.envoyes, 'envoyé')}, ${pluriel(b.arrives, 'arrivé')}, ${pluriel(b.erreurs, 'adresse en erreur', 'adresses en erreur')}, ${pluriel(b.spam, 'spam', 'spams')}, ${pluriel(b.desinscriptions, 'désinscription')}, ${pluriel(b.reponses, 'réponse')}`;
}
// Toutes les lignes, sans leur texte (Supabase plafonne une réponse à 1 000 lignes : on pagine, comme toutLire).
async function lignesBilanEmail() {
  const lignes = [];
  for (let debut = 0; debut < 50000; debut += 1000) {
    const { lignes: page } = await sb('iae_crm_emails?select=id,lead_id,statut,email_statut,envoye_le,evenements,fullenrich_id,adresse:faits->adresse,ultra:faits->ultra&order=created_at.asc', { plage: `${debut}-${debut + 999}` });
    lignes.push(...page);
    if (page.length < 1000) break;
  }
  return lignes;
}
async function etatProspectionEmail({ lignes = null, recus = null } = {}) {
  const r = await reglageEmail();
  const tout = lignes || (await lignesBilanEmail());
  const leadsEnvoyes = [...new Set(tout.filter((e) => e.statut === 'envoye').map((e) => e.lead_id))];
  const rec = recus || (leadsEnvoyes.length ? (await sb(`iae_crm_activites?type=eq.email_recu&lead_id=in.(${leadsEnvoyes.join(',')})&select=lead_id,date`)).lignes : []);
  const suivi = (await lireReglage('email_prospection_suivi')) || {};
  const signature = await lireReglage('email_signature');
  const n = (s) => tout.filter((e) => e.statut === s).length;
  // Où en sont les candidats (Gabriel, 12/11) : en attente du registre ou de la recherche gratuite, adresse trouvée
  // gratuitement, ultra qualifiés en attente de FullEnrich, sans adresse (pour Anna).
  const adresseDe = (e) => e.adresse ?? e.faits?.adresse ?? null;
  const ultraDe = (e) => e.ultra ?? e.faits?.ultra ?? null;
  const candidats = {
    en_attente: tout.filter((e) => e.statut === 'a_enrichir' && !ultraDe(e)).length,
    gratuites: tout.filter((e) => e.statut !== 'annule' && !estGeneraleEmail(e) && ['site', 'ademe', 'boamp', 'outscraper'].includes(adresseDe(e)?.source)).length,
    generales: tout.filter((e) => e.statut !== 'annule' && estGeneraleEmail(e)).length,
    ultra_attente: tout.filter((e) => e.statut === 'a_enrichir' && ultraDe(e) && !e.fullenrich_id).length,
    ultra_en_cours: tout.filter((e) => e.statut === 'a_enrichir' && e.fullenrich_id).length,
    sans_adresse: n('sans_email'),
  };
  const bilan = bilanEmail(tout, rec, { quota: r.par_jour });
  const q = quotaEmail(r, tout, r.pause);
  bilan.aujourdhui.quota = q.par_jour;
  return {
    candidats,
    actif: tout.length > 0, pause: r.pause || null, quota: q.par_jour, palier: { actuel: q.palier, prochain: q.prochain, bloque: q.bloque, texte: texteQuotaEmail(q) || null },
    fenetre: [r.debut, r.fin], expediteur: r.expediteur,
    fullenrich: Boolean(process.env.FULLENRICH_API_KEY), brevo: Boolean(process.env.BREVO_API_KEY), fullenrich_erreur: suivi.fullenrich_erreur || null,
    // La réserve Brevo du jour (13/11) : un passage sans envoi parce qu'il restait moins de 100 envois au compte.
    reserve_brevo: suivi.reserve_brevo?.le && jourParis(suivi.reserve_brevo.le) === aujourdHuiParis() ? suivi.reserve_brevo.texte : null,
    a_valider: n('brouillon') + n('echec'), en_file: n('a_envoyer') + n('en_cours'), a_enrichir: n('a_enrichir'), a_rediger: n('a_rediger'), sans_email: n('sans_email'),
    campagnes: suivi.campagnes || {}, dernier_passage: suivi.passage_le || null,
    // La signature ajoutée à l'envoi : sa version texte pour l'aperçu de la page (jamais son HTML, qui ne s'affiche pas ici).
    signature: signature?.texte ? { texte: signature.texte, le: signature.le || null } : null, gmail: gmailConfigure(),
    rdv: { minutes: Number.isFinite(r.rdv_minutes) ? r.rdv_minutes : EMAIL_PROSPECTION.rdv_minutes, km: Number.isFinite(r.rdv_km) ? r.rdv_km : EMAIL_PROSPECTION.rdv_km },
    bilan,
  };
}

// Un passage, toutes les 15 minutes, après la boîte de Gabriel (une réponse arrivée entre-temps arrête l'envoi).
async function prospectionEmail({ limite = Date.now() + 40000 } = {}) {
  if (!estAdmin()) return { ignore: 'equipe' };
  const bilan = { verifies: 0, gratuites: 0, generales: 0, enrichis: 0, adresses: 0, sans_email: 0, rediges: 0, envoyes: 0, echecs: 0, annules: 0, evenements: 0 };
  const { lignes: ouvertes } = await sb('iae_crm_emails?statut=in.(a_enrichir,a_rediger,a_envoyer,en_cours,envoye)&select=id&limit=1');
  if (!ouvertes.length) return { rien: true };
  // marge : le temps qu'il faut encore pour finir proprement ce qu'on commence (une lecture de site, une rédaction).
  const reste = (marge = 0) => Date.now() + marge < limite;
  // 1. Ce que Brevo a vu (tous les jours, même en pause : c'est le bilan, et ce qui déclenche la pause).
  if (process.env.BREVO_API_KEY) {
    await suivreEvenementsEmail(bilan).catch((x) => console.error('crm email événements', x?.code || x?.message));
    await suivreCampagnesEmail(bilan).catch((x) => console.error('crm email campagnes', x?.code || x?.message));
  }
  const pause = await verifierPauseEmail();
  // 2. Une ligne restée « en cours » 30 minutes : on ne sait pas si elle est partie, jamais de second essai.
  const coince = new Date(Date.now() - 30 * 60000).toISOString();
  await sb(`iae_crm_emails?statut=eq.en_cours&pris_le=lt.${encodeURIComponent(coince)}`, { methode: 'PATCH', prefer: 'return=minimal', corps: { statut: 'echec', detail: "Le passage s'est arrêté pendant l'envoi : regarde dans Brevo (journal des emails transactionnels) si c'est parti avant de renvoyer." } });
  const jour = aujourdHuiParis();
  const r = await reglageEmail();
  if (!estOuvreIso(jour) || pause) { await noterPassageEmail(bilan); return { ...bilan, pause: Boolean(pause), ouvre: estOuvreIso(jour) }; }
  // La signature Gmail, relue une fois par 24 h : l'aperçu de « Emails à valider » est prêt avant le premier envoi.
  const signature = gmailConfigure() ? await signatureEmail().catch(() => null) : null;
  // 3. Les envois du matin, dans le quota.
  const hm = heureMinuteParis();
  if (process.env.BREVO_API_KEY && hm >= r.debut && hm < r.fin) {
    // Le quota du jour suit les paliers, si le bilan depuis le début est propre (Gabriel, 12/11).
    const q = quotaEmail(r, r.paliers?.some?.((x) => x?.a_partir_du <= jour) ? await lignesBilanEmail() : [], pause);
    await envoyerFileEmail({ ...r, par_jour: q.par_jour }, bilan, reste, signature);
  }
  // 4. Registre et faits publics, adresse gratuite du dirigeant, FullEnrich pour les ultra qualifiés ; 5. lecture des
  // recherches FullEnrich finies ; 6. rédaction par Claude.
  if (reste()) await adressesEmails(r, bilan, reste).catch((x) => console.error('crm email adresses', x?.code || x?.message));
  if (reste()) await lireEnrichissements(bilan, reste).catch((x) => console.error('crm email fullenrich', x?.code || x?.message));
  if (reste()) await redigerEmails(bilan, reste).catch((x) => console.error('crm email rédaction', x?.code || x?.message));
  // 7. Le rattrapage du repli sur l'adresse générale (lignes « sans adresse » depuis le 12/11), 10 par passage.
  if (reste(10000)) await rattraperGenerales(bilan, reste).catch((x) => console.error('crm email repli', x?.code || x?.message));
  await noterPassageEmail(bilan);
  return bilan;
}
// Le rattrapage du repli (12/11 au soir) : les lignes « sans adresse » depuis le 12/11 (sans adresse nominative, ou FullEnrich
// sans résultat) passent une fois par le repli sur l'adresse générale, 10 par passage, sans intervention.
const RATTRAPAGE_REPLI = { depuis: '2026-11-12T00:00:00+01:00', par_passage: 10 };
async function rattraperGenerales(bilan, reste) {
  const { lignes } = await sb(`iae_crm_emails?statut=eq.sans_email&created_at=gte.${encodeURIComponent(RATTRAPAGE_REPLI.depuis)}&order=created_at.asc&limit=200&select=*`);
  let n = 0;
  for (const e of lignes) {
    if (n >= RATTRAPAGE_REPLI.par_passage || !reste(5000)) break;
    if (e.faits?.repli) continue;
    n++;
    const { l, c } = await leadEtContactEmail(e);
    if (!l || l.archive || !['nouveau', 'contacte'].includes(l.statut)) { await majLigneEmail(e.id, { faits: { ...(e.faits || {}), repli: { le: new Date().toISOString(), raison: 'lead archivé, perdu ou déjà plus loin' } } }); continue; }
    await repliAdresseGenerale(e, l, c, String(e.detail || "Pas d'adresse du dirigeant").replace(/ : la fiche reste pour Anna, au téléphone\.$/, ''), bilan, { rattrapage: true });
  }
}
async function noterPassageEmail(bilan) {
  await ecrireReglage('email_prospection_suivi', { ...((await lireReglage('email_prospection_suivi')) || {}), passage_le: new Date().toISOString(), dernier_bilan: bilan });
}

/* ----- Les opérations de la page (Gabriel seul) ----- */

async function operationEmail(corps, ip) {
  const op = corps.op;
  if (op === 'prospect_email') return ajouterProspectEmail(corps);
  if (op === 'email_importer') return importerEmails(corps);
  if (op === 'email_reprendre') {
    const r = await majReglageEmail({ pause: null, reprise_le: new Date().toISOString() });
    return { reglage: r };
  }
  if (op === 'email_pause') return { reglage: await majReglageEmail({ pause: { le: new Date().toISOString(), raison: couper(String(corps.raison || 'Mise en pause par Gabriel.'), 200), auto: false } }) };
  if (op === 'email_auto_couper') {
    await ecrireReglage('email_confiance', { serie: 0, auto: false, coupe_le: new Date().toISOString() });
    return { confiance: await confianceEmail() };
  }
  if (op === 'email_reglage') {
    const v = {};
    const entier = (x, min, max) => { const n = Number(x); if (!Number.isInteger(n) || n < min || n > max) throw new Refus('valeur_invalide:reglage'); return n; };
    if (corps.par_jour !== undefined) v.par_jour = entier(corps.par_jour, 0, 50);
    if (corps.par_passage !== undefined) v.par_passage = entier(corps.par_passage, 1, 5);
    if (corps.enrichissements !== undefined) v.enrichissements = entier(corps.enrichissements, 0, 100);
    if (corps.tentatives_fullenrich !== undefined) v.tentatives_fullenrich = entier(corps.tentatives_fullenrich, 0, 100);
    if (corps.rdv_minutes !== undefined) v.rdv_minutes = entier(corps.rdv_minutes, 0, 180);
    if (corps.rdv_km !== undefined) v.rdv_km = entier(corps.rdv_km, 0, 200);
    if (corps.fullenrich_deduites !== undefined) { if (typeof corps.fullenrich_deduites !== 'boolean') throw new Refus('valeur_invalide:reglage'); v.fullenrich_deduites = corps.fullenrich_deduites; }
    if (corps.paliers !== undefined) {
      if (!Array.isArray(corps.paliers) || corps.paliers.length > 10) throw new Refus('valeur_invalide:reglage');
      v.paliers = corps.paliers.map((x) => { if (!DATE_RE.test(String(x?.a_partir_du || ''))) throw new Refus('valeur_invalide:reglage'); return { a_partir_du: x.a_partir_du, par_jour: entier(x.par_jour, 0, 50) }; }).sort((a, b) => a.a_partir_du.localeCompare(b.a_partir_du));
    }
    if (corps.expediteur !== undefined) { const a = normEmail(corps.expediteur); if (!EMAIL_RE.test(a)) throw new Refus('adresse_invalide'); v.expediteur = a; }
    if (corps.expediteur_nom !== undefined) v.expediteur_nom = couper(String(corps.expediteur_nom).replace(/[\r\n<>"]+/g, ' ').trim(), 70) || EMAIL_PROSPECTION.expediteur_nom;
    if (!Object.keys(v).length) throw new Refus('rien_a_modifier');
    return { reglage: await majReglageEmail(v) };
  }
  if (op === 'email_passage') return { bilan: await prospectionEmail({ limite: Date.now() + 40000 }), etat: await etatProspectionEmail() };
  const e = await ligneEmail(corps.id);
  if (op === 'email_valider') {
    if (!['brouillon', 'echec'].includes(e.statut)) throw new Refus('email_en_file', 409);
    const { objet, texte } = verifierTexteEmail(corps.objet ?? e.objet, corps.texte ?? e.texte);
    if (!e.email) throw new Refus('adresse_manquante');
    if (await enOpposition(e.email)) throw new Refus('adresse_opposee', 409);
    // La confiance : des messages de Claude validés tels quels (objet et texte), d'affilée. Un texte modifié, ou écrit par
    // Gabriel, remet le compteur à zéro. Un renvoi après un échec ne compte pas une deuxième fois.
    let confiance = null;
    if (e.statut === 'brouillon') {
      const avant = await confianceEmail();
      const telQuel = Boolean(e.texte_claude) && normeLi(`${objet}\n---\n${texte}`) === normeLi(e.texte_claude);
      const serie = telQuel ? (avant.serie || 0) + 1 : 0;
      confiance = { ...avant, serie, auto: avant.auto || serie >= SEUIL_CONFIANCE_EMAIL, ...(serie >= SEUIL_CONFIANCE_EMAIL && !avant.auto ? { depuis: new Date().toISOString() } : {}) };
      await ecrireReglage('email_confiance', confiance);
    }
    // Les alertes (tiers nommé, « Bonjour Prénom Nom, »…) restent affichées, sans bloquer le clic de Gabriel.
    const alertes = alertesEmail(objet, texte);
    return { email: emailPourPage(await majLigneEmail(e.id, { objet, texte, statut: 'a_envoyer', valide_le: new Date().toISOString(), detail: alertes.length ? `Validé malgré l'alerte : ${alertes.join(' ')}` : null })), confiance };
  }
  if (op === 'email_ecarter') {
    if (['en_cours', 'envoye'].includes(e.statut)) throw new Refus('deja_parti', 409);
    return { email: emailPourPage(await majLigneEmail(e.id, { statut: 'annule', detail: `Écarté par ${utilisateurCourant().prenom}${corps.raison ? ` : ${couper(String(corps.raison), 200)}` : ''}.` })) };
  }
  if (op === 'email_rediger') {
    if (tropDeRedactions(ip)) throw new Refus('ia_trop_de_demandes', 429);
    if (!['a_rediger', 'brouillon', 'echec'].includes(e.statut)) throw new Refus('email_en_file', 409);
    const { l, c } = await leadEtContactEmail(e);
    if (!l) throw new Refus('introuvable', 404);
    const verifiee = await verifierFaitsEmail(e, l, c, null);
    if (verifiee === false) return { email: emailPourPage(await ligneEmail(e.id)), annule: true };
    const ligne = await preparerEmailAvecClaude(verifiee || e, l, c, { auto: false, consigne: String(corps.consigne || '') });
    return { email: emailPourPage(ligne) };
  }
  if (op === 'email_adresse') {
    // L'adresse posée à la main (Claude Code avec le MCP FullEnrich quand la clé n'est pas sur Vercel, ou une adresse lue
    // sur le site de l'entreprise) : seulement une adresse vérifiée DELIVERABLE quand elle vient de FullEnrich.
    const email = normEmail(corps.email);
    if (!EMAIL_RE.test(email)) throw new Refus('adresse_invalide');
    const source = ['fullenrich', 'site', 'manuel'].includes(corps.source) ? corps.source : 'manuel';
    const statutEmail = String(corps.email_statut || (source === 'fullenrich' ? '' : 'MANUEL')).toUpperCase().slice(0, 40);
    if (source === 'fullenrich' && statutEmail !== 'DELIVERABLE') throw new Refus('adresse_non_verifiee');
    if (!['a_enrichir', 'sans_email', 'a_rediger', 'brouillon', 'echec'].includes(e.statut)) throw new Refus('email_en_file', 409);
    if (await enOpposition(email)) throw new Refus('adresse_opposee', 409);
    const { l, c } = await leadEtContactEmail(e);
    // La même règle partout (Gabriel, 12/11) : l'adresse du dirigeant ou d'un co-dirigeant au registre, avec un MX.
    const j = jugerAdresse(email, await personnesDe(e, c), l?.entreprise);
    if (!j.ok) throw new Refus(CODES_ADRESSE[j.raison]);
    if ((await mxDuDomaine(email.split('@')[1])) === 'non') throw new Refus('domaine_sans_mx');
    const url = /^https:\/\/[^\s"'<>]{4,300}$/.test(String(corps.url || '')) ? String(corps.url) : null;
    const faits = { ...(e.faits || {}), adresse: { ...(e.faits?.adresse || {}), cherchee_le: e.faits?.adresse?.cherchee_le || new Date().toISOString(), email, source: source === 'fullenrich' ? 'fullenrich' : source === 'site' ? 'site' : 'manuel', url, generique: false } };
    let ligne = await poserAdresse(e, l, c, { email, personne: j.personne, source_email: source, email_statut: statutEmail, faits, journal: `Adresse de {qui} posée à la main (${source}${url ? ` : ${url}` : ''}) : ${email}.` });
    // Un message écrit pour l'accueil ne part jamais au dirigeant lui-même : Claude le réécrit.
    if (estGeneraleEmail(e) && ['brouillon', 'echec'].includes(ligne.statut)) ligne = await majLigneEmail(e.id, { statut: 'a_rediger', valide_le: null, detail: "Adresse du dirigeant posée : le message pour l'accueil est réécrit pour lui." });
    return { email: emailPourPage(ligne) };
  }
  throw new Refus('op_inconnue');
}

/* ----- La désinscription : GET /api/crm?stop=<jeton> (une page et un bouton), POST (le bouton, ou un clic dans la messagerie) ----- */

// Un GET ne désinscrit jamais : les antivirus des messageries ouvrent les liens des emails pour les tester, et le
// prospect perdrait le lead sans avoir rien demandé (RFC 8058 : la désinscription en un clic se fait par POST). Le GET
// montre donc un bouton ; le POST (ce bouton, ou le bouton « Se désinscrire » de Gmail) enregistre l'opposition.
const STYLE_STOP = 'body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#f4f5fa;color:#1f2330}main{max-width:520px;margin:12vh auto;padding:28px 22px;background:#fff;border-radius:14px}h1{font-size:22px;margin:6px 0 12px}p{line-height:1.5;margin:0 0 14px}.marque{font-weight:700;color:#2c3e94;margin:0}button{font:inherit;font-weight:700;padding:12px 18px;border:0;border-radius:10px;background:#2c3e94;color:#fff;cursor:pointer;width:100%}';
function pageStop(res, statut, titre, texte, jeton = null) {
  const bouton = jeton ? `<form method="post" action="/api/crm?stop=${encodeURIComponent(jeton)}"><button type="submit">Ne plus recevoir de messages</button></form>` : '';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
  res.setHeader('Referrer-Policy', 'no-referrer');
  return res.status(statut).send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${echapperHtml(titre)}</title><style>${STYLE_STOP}</style></head><body><main><p class="marque">IA-Entrepreneur</p><h1>${echapperHtml(titre)}</h1><p>${echapperHtml(texte)}</p>${bouton}</main></body></html>`);
}
async function desinscription(req, res, jeton) {
  const ip = empreinte(req);
  if (tropDEchecs(ip)) return pageStop(res, 429, 'Trop de tentatives', 'Réessayez dans dix minutes, ou répondez simplement « stop » à mon email.');
  const valide = /^[A-Za-z0-9_-]{20,80}$/.test(jeton);
  const e = valide ? (await sb(`iae_crm_emails?jeton_stop_hash=eq.${createHash('sha256').update(jeton).digest('hex')}&select=id,lead_id,contact_id,email,evenements&limit=1`)).lignes[0] : null;
  if (!e || !e.email) {
    noterEchec(ip);
    return pageStop(res, 404, 'Lien inconnu', 'Ce lien ne correspond à aucun message. Pour ne plus recevoir de message, répondez simplement « stop » à mon email.');
  }
  const deja = await enOpposition(e.email);
  if (req.method === 'POST' && !deja) await enregistrerOpposition(e.email, req.body && String(req.body['List-Unsubscribe'] || '') === 'One-Click' ? 'désinscription en un clic depuis la messagerie' : 'lien de désinscription', { ligne: e });
  if (req.method === 'POST' || deja) return pageStop(res, 200, "C'est noté", "C'est noté, vous ne recevrez plus de message. Gabriel Vanderbecken, IA-Entrepreneur");
  return pageStop(res, 200, 'Ne plus recevoir mes messages', "Un clic sur le bouton, et vous ne recevrez plus aucun message de ma part (Gabriel Vanderbecken, IA-Entrepreneur).", jeton);
}

/* ---------- Après la formation : facture, paiement, avis ---------- */
// Gabriel, 09/11 : « une tâche qui me demande de vérifier que j'ai été payé, en faisant le lien avec mon agenda ou un
// échange de mail » et « un email post formation, d'avis (facultatif) ; si avis positif on le met sur le site, et on
// propose nos services par la suite ». Le CRM n'a pas accès au compte : il dit quand vérifier, Gabriel confirme.
const ORDRE_SUIVI = (k) => SUIVIS.indexOf(k);
// L'échéance de vérification : celle de l'email, sinon 30 jours, 60 si un financeur (OPCO, AGEFICE) paie (son choix du 09/11).
function echeanceFacture(lead, jour, lue = '') {
  if (DATE_RE.test(lue || '') && lue >= jour) return estOuvreIso(lue) ? lue : dansJoursOuvres(0, lue);
  return dansJoursOuvres(lead.financeur ? 60 : 30, jour);
}
function majFacture(lead, jour, { fil = null, objet = null, echeance = '' } = {}) {
  const maj = { facture_le: jour, facture_echeance: echeanceFacture(lead, jour, echeance), facture_fil: fil, facture_objet: objet ? couper(objet, 300) : null, paye_le: null, paiement_annonce: null };
  if (lead.suivi && ORDRE_SUIVI(lead.suivi) < ORDRE_SUIVI('facturee')) maj.suivi = 'facturee';
  return maj;
}
async function operationApresFormation(corps) {
  const op = corps.op;
  if (op === 'avis_demande') {
    if (!UUID_RE.test(corps.lead_id || '')) throw new Refus('id_invalide');
    const [l] = (await sb(`iae_crm_leads?id=eq.${corps.lead_id}&select=id`)).lignes;
    if (!l) throw new Refus('introuvable', 404);
    return creerDemande(l.id);
  }
  if (op === 'avis_publier' || op === 'avis_retirer') {
    if (!UUID_RE.test(corps.id || '')) throw new Refus('id_invalide');
    const [a] = (await sb(`iae_crm_avis?id=eq.${corps.id}&select=*`)).lignes;
    if (!a) throw new Refus('introuvable', 404);
    let maj;
    if (op === 'avis_retirer') maj = { statut: 'retire' };
    else {
      if (!a.accord_publication) throw new Refus('avis_sans_accord', 409);
      if (a.note < 4) throw new Refus('avis_pas_positif', 409);
      const texte = String(corps.texte ?? a.texte_publie ?? a.utile ?? '').replace(/\s+/g, ' ').trim().slice(0, 1200);
      if (!texte) throw new Refus('message_vide');
      maj = { statut: 'publie', texte_publie: texte, publie_le: new Date().toISOString() };
    }
    const { lignes } = await sb(`iae_crm_avis?id=eq.${a.id}`, { methode: 'PATCH', corps: maj, prefer: 'return=representation' });
    let lead = null;
    if (op === 'avis_publier') {
      await inserer('activites', { lead_id: a.lead_id, type: 'avis', resume: `Avis de ${a.nom || 'un participant'} publié sur le site`, source: 'crm', meta: { avis_id: a.id } });
      // Une fois l'avis publié, la suite : proposer le niveau suivant dans une semaine.
      const [l] = (await sb(`iae_crm_leads?id=eq.${a.lead_id}&select=prochaine_note`)).lignes;
      if (l && /^Avis \d\/5 de /.test(l.prochaine_note || '')) lead = await modifier('leads', a.lead_id, { prochaine_relance: dansJoursOuvres(7), prochaine_action: 'email', prochaine_note: `Proposer la suite (avis ${a.note}/5 de ${a.nom || 'un participant'}, publié) : le niveau suivant, en partant de ce qui lui a été utile.` });
    }
    return { avis: lignes[0], lead };
  }
  if (!UUID_RE.test(corps.lead_id || '')) throw new Refus('id_invalide');
  const [lead] = (await sb(`iae_crm_leads?id=eq.${corps.lead_id}&select=*`)).lignes;
  if (!lead) throw new Refus('introuvable', 404);
  const jour = aujourdHuiParis();
  if (op === 'facture_envoyee') {
    // Une facture envoyée hors de Gmail (ou que le CRM n'a pas repérée) : Gabriel le dit.
    const quand = DATE_RE.test(corps.date || '') && corps.date <= jour ? corps.date : jour;
    const maj = majFacture(lead, quand, { echeance: corps.echeance });
    await inserer('activites', { lead_id: lead.id, type: 'paiement', resume: `Facture envoyée le ${dateCourte(quand)} : paiement à vérifier le ${dateCourte(maj.facture_echeance)}`, source: 'crm', meta: { etape: 'facture' } });
    return { lead: await modifier('leads', lead.id, maj) };
  }
  if (op === 'paiement_recu') {
    const quand = DATE_RE.test(corps.date || '') && corps.date <= jour ? corps.date : jour;
    const maj = { paye_le: quand, paiement_annonce: null };
    if (lead.suivi && ORDRE_SUIVI(lead.suivi) < ORDRE_SUIVI('payee')) Object.assign(maj, { suivi: 'payee' });
    await inserer('activites', { lead_id: lead.id, type: 'paiement', resume: `Paiement reçu le ${dateCourte(quand)}${lead.facture_le ? ` (facture du ${dateCourte(lead.facture_le)})` : ''}, vérifié par Gabriel`, source: 'crm', meta: { etape: 'paye' } });
    return { lead: await modifier('leads', lead.id, maj) };
  }
  if (op === 'paiement_decaler') {
    const jours = Math.min(Math.max(Number(corps.jours) || 7, 1), 60);
    const echeance = dansJoursOuvres(jours);
    await inserer('activites', { lead_id: lead.id, type: 'paiement', resume: `Pas encore payé le ${dateCourte(jour)} : nouvelle vérification le ${dateCourte(echeance)}`, source: 'crm', meta: { etape: 'pas_encore' } });
    return { lead: await modifier('leads', lead.id, { facture_echeance: echeance }) };
  }
  throw new Refus('op_inconnue');
}

/* ---------- Évaluations à chaud (10/11/2026) ---------- */

// Gabriel : « construire les évaluations à chaud directement dans le CRM ; envoyer le lien aux apprenants pour qu'ils
// laissent un avis, et piloter le niveau de satisfaction d'une formation ainsi que du formateur qui l'effectue ».
// Questionnaire et calcul de la note : api/_evaluations.js (repris d'Ella). Une évaluation = une formation, un lien.
const FORMATEUR_DEFAUT = 'Gabriel Vanderbecken';
async function champsEvaluation(corps, ancienne = null) {
  const v = {};
  if (corps.titre !== undefined || !ancienne) {
    v.titre = propreEval(corps.titre, 200).replace(/\s+/g, ' ');
    if (!v.titre) throw new Refus('titre_requis');
  }
  for (const k of ['debut', 'fin']) {
    if (corps[k] === undefined) continue;
    if (corps[k] && !DATE_RE.test(corps[k])) throw new Refus('date_invalide');
    v[k] = corps[k] || null;
  }
  const debut = v.debut !== undefined ? v.debut : ancienne?.debut, fin = v.fin !== undefined ? v.fin : ancienne?.fin;
  if (debut && fin && fin < debut) throw new Refus('dates_inversees');
  if (corps.modalite !== undefined) { if (!MODALITES.includes(corps.modalite)) throw new Refus('modalite_invalide'); v.modalite = corps.modalite; }
  if (corps.inscrits !== undefined) {
    const n = corps.inscrits === null || corps.inscrits === '' ? null : Number(corps.inscrits);
    if (n !== null && (!Number.isInteger(n) || n < 1 || n > 500)) throw new Refus('inscrits_invalide');
    v.inscrits = n;
  }
  if (corps.objectifs !== undefined) {
    if (!Array.isArray(corps.objectifs)) throw new Refus('objectifs_invalides');
    v.objectifs = corps.objectifs.map((o) => propreEval(o, 300).replace(/\s+/g, ' ')).filter(Boolean).slice(0, 12);
  }
  for (const k of ['lead_id', 'programme_id']) {
    if (corps[k] === undefined) continue;
    if (corps[k] && !UUID_RE.test(corps[k])) throw new Refus('id_invalide');
    v[k] = corps[k] || null;
  }
  if (v.lead_id) { const [l] = (await sb(`iae_crm_leads?id=eq.${v.lead_id}&select=id`)).lignes; if (!l) throw new Refus('introuvable', 404); }
  if (v.programme_id) { const [p] = (await sb(`iae_crm_programmes?id=eq.${v.programme_id}&select=id`)).lignes; if (!p) throw new Refus('introuvable', 404); }
  if (corps.formateur_id !== undefined) {
    // Le formateur : une fiche de type formateur, ou Gabriel (vide).
    if (corps.formateur_id) {
      if (!UUID_RE.test(corps.formateur_id)) throw new Refus('id_invalide');
      const [f] = (await sb(`iae_crm_leads?id=eq.${corps.formateur_id}&type=eq.formateur&select=id,entreprise`)).lignes;
      if (!f) throw new Refus('formateur_introuvable', 404);
      Object.assign(v, { formateur_id: f.id, formateur_nom: couper(f.entreprise, 120) });
    } else Object.assign(v, { formateur_id: null, formateur_nom: FORMATEUR_DEFAUT });
  } else if (!ancienne) Object.assign(v, { formateur_id: null, formateur_nom: FORMATEUR_DEFAUT });
  if (corps.ouverte !== undefined) v.ouverte = corps.ouverte === true;
  return v;
}
async function operationEvaluation(corps) {
  const op = corps.op;
  if (op === 'evaluation_creer') {
    const v = await champsEvaluation(corps);
    v.modalite = v.modalite || 'distanciel';
    v.objectifs = v.objectifs || [];
    v.questions = questionnaire(v);
    v.jeton = nouveauJetonEval();
    const { lignes } = await sb('iae_crm_evaluations', { methode: 'POST', corps: v, prefer: 'return=representation' });
    if (v.lead_id) await inserer('activites', { lead_id: v.lead_id, type: 'note', source: 'crm', resume: `Évaluation à chaud créée : « ${v.titre} », formateur ${v.formateur_nom}`, meta: { evaluation_id: lignes[0].id } });
    return { evaluation: lignes[0] };
  }
  if (!UUID_RE.test(corps.id || '')) throw new Refus('id_invalide');
  if (op === 'evaluation_reponse_supprimer') {
    // Une réponse de test (Gabriel essaie le lien) fausserait la moyenne : on peut la retirer.
    const { lignes } = await sb(`iae_crm_evaluation_reponses?id=eq.${corps.id}&select=id`);
    if (!lignes.length) throw new Refus('introuvable', 404);
    await sb(`iae_crm_evaluation_reponses?id=eq.${corps.id}`, { methode: 'DELETE' });
    return { supprime: true };
  }
  const [e] = (await sb(`iae_crm_evaluations?id=eq.${corps.id}&select=*`)).lignes;
  if (!e) throw new Refus('introuvable', 404);
  const { lignes: reps } = await sb(`iae_crm_evaluation_reponses?evaluation_id=eq.${e.id}&select=id&limit=1`);
  if (op === 'evaluation_supprimer') {
    // Des réponses reçues sont une preuve (Qualiopi, indicateur 30) : on ferme l'évaluation, on ne l'efface pas.
    if (reps.length) throw new Refus('evaluation_avec_reponses', 409);
    await sb(`iae_crm_evaluations?id=eq.${e.id}`, { methode: 'DELETE' });
    return { supprime: true };
  }
  if (op === 'evaluation_maj') {
    const v = await champsEvaluation(corps, e);
    const changeQuestions = ['objectifs', 'modalite', 'inscrits'].some((k) => v[k] !== undefined && JSON.stringify(v[k]) !== JSON.stringify(e[k]));
    if (changeQuestions) {
      // Les questions sont figées dès la première réponse : sinon deux participants n'auraient pas répondu au même questionnaire.
      if (reps.length && (v.objectifs !== undefined && JSON.stringify(v.objectifs) !== JSON.stringify(e.objectifs) || v.modalite !== undefined && v.modalite !== e.modalite)) throw new Refus('questions_figees', 409);
      if (!reps.length) v.questions = questionnaire({ ...e, ...v });
    }
    if (!Object.keys(v).length) throw new Refus('rien_a_modifier');
    const { lignes } = await sb(`iae_crm_evaluations?id=eq.${e.id}`, { methode: 'PATCH', corps: v, prefer: 'return=representation' });
    return { evaluation: lignes[0] };
  }
  throw new Refus('op_inconnue');
}

/* ---------- La voix du mode oral (ElevenLabs) ---------- */

const VOIX_DEFAUT = 'JBFqnCBsd6RMkjVDRZzb'; // voix multilingue d'ElevenLabs, à remplacer par une voix française (ELEVENLABS_VOIX)
const passagesVoix = new Map();
async function envoyerVoix(res, corps, ip) {
  if (!process.env.ELEVENLABS_API_KEY) throw new Refus('voix_non_configuree', 503);
  const t = Date.now();
  const p = passagesVoix.get(ip) || { n: 0, debut: t };
  if (t - p.debut > 10 * 60 * 1000) { p.n = 0; p.debut = t; }
  p.n++;
  passagesVoix.set(ip, p);
  if (p.n > 400) throw new Refus('ia_trop_de_demandes', 429);
  const texte = String(corps.texte || '').replace(/\s+/g, ' ').trim().slice(0, 1500);
  if (!texte) throw new Refus('message_invalide');
  const voix = /^[A-Za-z0-9]{10,40}$/.test(process.env.ELEVENLABS_VOIX || '') ? process.env.ELEVENLABS_VOIX : VOIX_DEFAUT;
  let r;
  try {
    r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voix}?output_format=mp3_44100_64`, {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: texte, model_id: process.env.ELEVENLABS_MODELE || 'eleven_flash_v2_5', language_code: 'fr' }),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Refus('voix_injoignable', 502);
  }
  if (!r.ok) {
    console.error('crm voix', r.status, (await r.text()).slice(0, 200));
    throw new Refus(r.status === 401 ? 'voix_cle' : r.status === 429 ? 'ia_trop_de_demandes' : 'voix_erreur', r.status === 429 ? 429 : 502);
  }
  res.setHeader('Content-Type', r.headers.get('content-type') || 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(Buffer.from(await r.arrayBuffer()));
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
      system: [{ type: 'text', text: pourMoi(CONSIGNES_VOCAL), cache_control: { type: 'ephemeral' } }],
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
  const admin = estAdmin();
  if (admin) await echeancesFormateurs().catch((e) => console.error('crm échéances formateurs', e?.message || e));
  const rienSb = Promise.resolve({ lignes: [] });
  const [{ lignes: leads }, { lignes: contacts }, { lignes: entrants }, { lignes: fileLi }, { lignes: derniereLi }, { lignes: pasPartisLi }, robotLi] = await Promise.all([
    // Gabriel voit tous les leads dans le CRM, mais son récap ne liste que les siens.
    sb(`iae_crm_leads?select=id,entreprise,prochaine_relance,prochaine_action,prochaine_note,relances_sans_reponse&archive=is.false&prochaine_relance=lte.${jour}${admin ? `&proprietaire=eq.${encodeURIComponent(ADMIN_EMAIL)}` : ''}&order=prochaine_relance.asc,entreprise.asc`),
    sb('iae_crm_contacts?select=id,lead_id,prenom,nom,principal&order=principal.desc'),
    sb(`iae_crm_entrants?select=de_nom,de_email,objet,canal&statut=eq.a_trier&proprietaire=eq.${encodeURIComponent(compte())}&order=recu_le.desc&limit=10`),
    admin ? sb(`iae_crm_linkedin?${filtreCompteLi()}&type=eq.invitation&statut=in.(a_envoyer,en_cours)&select=id`) : rienSb,
    admin ? sb(`iae_crm_linkedin?${filtreCompteLi()}&type=eq.invitation&statut=eq.envoye&order=envoye_le.desc&limit=1&select=envoye_le`) : rienSb,
    admin ? sb(`iae_crm_linkedin?${filtreCompteLi()}&statut=in.(echec,a_verifier)&order=created_at.asc&limit=30&select=lead_id,contact_id,etape,statut,detail`) : rienSb,
    admin ? etatRobotLi() : Promise.resolve({}),
  ]);
  // LinkedIn : la file qui se vide, puis ce qui n'est pas parti (sauf les leads déjà dans la liste du jour, qui ont leur tâche).
  const lignesLi = [];
  if (robotLi.dernier_passage) {
    const alerte = alerteFileLi(fileLi.length, derniereLi[0]?.envoye_le, jour);
    if (alerte) lignesLi.push(`- ${alerte}`);
  }
  const listes = new Set(leads.map((l) => l.id));
  const autresLi = pasPartisLi.filter((a) => !listes.has(a.lead_id));
  if (autresLi.length) {
    const { lignes: ents } = await sb(`iae_crm_leads?id=in.(${[...new Set(autresLi.map((a) => a.lead_id))].join(',')})&select=id,entreprise`);
    for (const a of autresLi) {
      const c = contacts.find((x) => x.id === a.contact_id);
      const nom = c ? [c.prenom, c.nom].filter(Boolean).join(' ') : '';
      lignesLi.push(`- ${ents.find((x) => x.id === a.lead_id)?.entreprise || 'Lead'}${nom ? ` (${nom})` : ''} : ${LIB_ETAPE_LI[a.etape] || 'Envoi'} pas parti${['invitation', 'relance', 'reponse'].includes(a.etape) ? 'e' : ''}${a.statut === 'a_verifier' ? ' ou à vérifier' : ''}. ${String(a.detail || '').slice(0, 200)}`.trim());
    }
  }
  // Prospection email (12/11/2026) : la pause, ce qui attend Gabriel, puis le bilan.
  const lignesEmail = admin ? await lignesRecapEmail().catch((e) => { console.error('crm récap email', e?.code || e?.message); return { lignes: [], urgent: false }; }) : { lignes: [], urgent: false };
  if (!leads.length && !entrants.length && !lignesLi.length && !lignesEmail.urgent) return { envoye: false, raison: 'rien_a_faire' };
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
    entrants.length && `${entrants.length} message${entrants.length > 1 ? 's' : ''} à trier`, lignesLi.length && `${lignesLi.length} point${lignesLi.length > 1 ? 's' : ''} LinkedIn`,
    lignesEmail.resume].filter(Boolean).join(', ');
  const corps = [
    `Bonjour ${utilisateurCourant().prenom},`, '',
    `Aujourd'hui, ${dateLongue} : ${resume}.`, '',
    retards.length ? `En retard\n${retards.map(ligne).join('\n')}\n` : null,
    dujour.length ? `Aujourd'hui\n${dujour.map(ligne).join('\n')}\n` : null,
    entrants.length ? `À trier\n${entrants.map((e) => `- ${e.de_nom || e.de_email} : ${e.objet || ''}`).join('\n')}\n` : null,
    lignesLi.length ? `LinkedIn\n${lignesLi.join('\n')}\n` : null,
    lignesEmail.lignes.length ? `Prospection email\n${lignesEmail.lignes.join('\n')}\n` : null,
    "Pour tout enchaîner : https://ia-entrepreneur.fr/crm/ (bouton « Enchaîner les relances »).", '',
    'Bonne journée,', 'Ton CRM',
  ].filter((x) => x !== null).join('\n');
  const total = leads.length;
  const objet = total ? `Tes ${total} relance${total > 1 ? 's' : ''} du jour${retards.length ? ` (${retards.length} en retard)` : ''}`
    : entrants.length ? `${entrants.length} message${entrants.length > 1 ? 's' : ''} à trier dans ton CRM` : lignesLi.length ? 'LinkedIn : à regarder dans ton CRM' : 'Prospection email : à regarder dans ton CRM';
  const envoi = await envoyerGmail({ a: compte(), objet, corps, mode: 'envoyer' });
  await ecrireReglage('rappel_matin_envoye', { le: jour, relances: total, a_trier: entrants.length });
  return { envoye: true, objet, gmail_id: envoi.gmail_id };
}

// Les lignes du récap de 7 h pour la prospection email : vide tant qu'elle n'a pas commencé. « urgent » : une pause ou des
// emails à valider suffisent à envoyer le récap, le bilan seul non.
const heureLue = (hm) => String(hm).replace(/^0/, '').replace(':', ' h ').replace(/ h 00$/, ' h');
async function lignesRecapEmail() {
  const etat = await etatProspectionEmail();
  if (!etat.actif) return { lignes: [], urgent: false };
  const b = etat.bilan;
  const lignes = [];
  if (etat.pause) lignes.push(`- EN PAUSE : ${etat.pause.raison} Pour reprendre : bouton « Reprendre » dans la barre « Prospection email » du CRM.`);
  if (etat.a_valider) lignes.push(`- ${pluriel(etat.a_valider, 'email')} à valider (bouton « Emails à valider » dans Aujourd'hui).`);
  lignes.push(`- Candidats : ${texteCandidatsEmail(etat)}.`);
  if (etat.fullenrich_erreur) lignes.push(`- ${etat.fullenrich_erreur}`);
  lignes.push(`- Aujourd'hui : ${b.aujourdhui.envoyes} envoyé${b.aujourdhui.envoyes > 1 ? 's' : ''} sur ${b.aujourdhui.quota}${etat.en_file ? ` (${etat.en_file} en file, ils partent entre ${heureLue(etat.fenetre[0])} et ${heureLue(etat.fenetre[1])})` : ''}.${etat.palier?.texte ? ` Palier : ${etat.palier.texte}.` : ''}`);
  // Au dirigeant et à l'accueil, à part (Gabriel, 12/11 : le repli sur l'adresse générale).
  const parType = (x) => `au dirigeant : ${texteBilanEmail(x.nominatives || x)} ; à l'accueil (adresse générale) : ${texteBilanEmail(x.generales || { envoyes: 0, arrives: 0, erreurs: 0, spam: 0, desinscriptions: 0, reponses: 0 })}`;
  lignes.push(`- 7 derniers jours : ${texteBilanEmail(b.semaine)}.`);
  lignes.push(`  (${parType(b.semaine)})`);
  lignes.push(`- Depuis le début : ${texteBilanEmail(b.debut)}.`);
  lignes.push(`  (${parType(b.debut)})`);
  const urgent = Boolean(etat.pause || etat.a_valider);
  return { lignes, urgent, resume: etat.pause ? 'prospection email en pause' : etat.a_valider ? `${pluriel(etat.a_valider, 'email')} à valider` : null };
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
  // La désinscription d'un prospect : publique, sans clé, avant tout le reste (le POST en un clic vient de sa messagerie).
  const stop = new URL(req.url, 'http://local').searchParams.get('stop');
  if (stop !== null) {
    try { return await desinscription(req, res, stop); } catch (e) {
      console.error('crm désinscription', e?.code || e?.message);
      return pageStop(res, 503, 'Un souci de notre côté', 'Réessayez dans un moment, ou répondez simplement « stop » à mon email : je ne vous écrirai plus.');
    }
  }
  const tache = req.method === 'GET' ? new URL(req.url, 'http://local').searchParams.get('tache') : null;
  if (tache === 'synchro' || tache === 'matin') {
    const attendu = Buffer.from(process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : '');
    const donne = Buffer.from(String(req.headers.authorization || ''));
    if (!process.env.CRON_SECRET || attendu.length !== donne.length || !timingSafeEqual(attendu, donne)) return res.status(401).json({ erreur: 'non_autorise' });
    if (tache === 'matin') {
      const force = new URL(req.url, 'http://local').searchParams.get('force') === '1';
      return res.status(200).json(await pourChacun(() => rappelDuMatin(force)));
    }
    const debutTache = Date.now();
    const resultat = await pourChacun(synchroniser);
    // La prospection email de Gabriel, après sa boîte : une réponse arrivée entre-temps arrête l'envoi. 50 secondes au plus
    // depuis le début de la tâche (la fonction en a 60).
    resultat.prospection_email = await prospectionEmail({ limite: debutTache + 50000 }).catch((e) => { console.error('crm prospection email', e?.code || e?.message); return { erreur: e?.code || 'erreur' }; });
    return res.status(200).json(resultat);
  }
  if (origineEtrangere(req)) return res.status(403).json({ erreur: 'origine' });

  // Les robots LinkedIn (le Mac de Gabriel, l'ordinateur d'un commercial) : leur propre clé, et seulement leur file LinkedIn.
  if (req.headers['x-cle-robot']) {
    const ipRobot = empreinte(req);
    if (tropDEchecs(ipRobot)) return res.status(429).json({ erreur: 'trop_de_tentatives' });
    try {
      const qui = await robotDeLaCle(req);
      if (!qui) {
        noterEchec(ipRobot);
        return res.status(401).json({ erreur: 'cle_invalide' });
      }
      // Le robot d'un commercial agit en son nom : ses leads, sa file, ses réglages, ses messages (garder et pourMoi).
      if (req.method === 'GET') return res.status(200).json(await avecUtilisateur(qui, () => fileRobotLi()));
      const corpsRobot = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      // Un dirigeant sans profil LinkedIn utilisable : la prospection passe par l'email (12/11/2026, Gabriel seul).
      if (corpsRobot.op === 'prospect_email') return res.status(200).json(await avecUtilisateur(qui, () => ajouterProspectEmail(corpsRobot)));
      return res.status(200).json(await avecUtilisateur(qui, () => operationRobotLi(corpsRobot)));
    } catch (e) {
      if (e instanceof Refus || (e && e.refus)) return res.status(e.statut || 400).json({ erreur: e.code });
      console.error('crm robot', e);
      return res.status(500).json({ erreur: 'erreur_interne' });
    }
  }

  const ip = empreinte(req);
  if (tropDEchecs(ip)) return res.status(429).json({ erreur: 'trop_de_tentatives' });
  let utilisateur = null;
  try {
    utilisateur = cleValide(req) ? ADMIN : await utilisateurParCle(req.headers['x-cle-crm']);
  } catch {
    return res.status(502).json({ erreur: 'base_indisponible' });
  }
  if (!utilisateur) {
    noterEchec(ip);
    return res.status(401).json({ erreur: 'cle_invalide' });
  }
  // Toute la suite se fait au nom de cette personne (api/_equipe.js) : le garde de la base, la boîte Gmail, les consignes.
  return avecUtilisateur(utilisateur, () => traiter(req, res, ip));
}

// Gabriel, puis chaque membre dont la boîte est connectée, en parallèle et chacun dans son contexte.
async function pourChacun(fn) {
  const resultat = { [ADMIN_EMAIL]: await fn().catch((e) => ({ erreur: e?.code || 'erreur' })) };
  if (!googleEquipeConfigure()) return resultat;
  const liste = await membresConnectes().catch(() => []);
  const issues = await Promise.allSettled(liste.map((m) => avecUtilisateur(m, fn)));
  liste.forEach((m, i) => {
    resultat[m.email] = issues[i].status === 'fulfilled' ? issues[i].value : { erreur: issues[i].reason?.code || 'erreur' };
    if (issues[i].status === 'rejected') console.error('crm tâche', m.email, issues[i].reason?.code || issues[i].reason?.message);
  });
  return resultat;
}

async function traiter(req, res, ip) {
  try {
    if (req.method === 'GET') {
      const params = new URL(req.url, 'http://local').searchParams;
      const logo = params.get('logo');
      if (logo !== null) return await envoyerLogo(res, logo);
      if (params.get('piece') !== null) return await envoyerPieceGmail(res, params);
      if (params.get('fil') !== null) return res.status(200).json(await filDuCrm(params.get('fil')));
      if (params.get('boite') !== null) return res.status(200).json(await boiteDuLead(params.get('boite')));
      if (params.get('document') !== null) {
        const id = params.get('document');
        if (!UUID_RE.test(id)) throw new Refus('id_invalide');
        const [d] = (await sb(`iae_crm_documents?id=eq.${id}&select=chemin,mime,nom`)).lignes;
        if (!d) throw new Refus('introuvable', 404);
        // Une pièce reprise du Drive y reste : la page l'ouvre directement dans Google Drive.
        if (String(d.chemin).startsWith('drive:')) throw new Refus('piece_drive', 409);
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
    if (!estAdmin() && !OPS_EQUIPE.has(String(corps?.op || ''))) throw new Refus('reserve_admin', 403);
    if (corps && corps.op === 'rediger') return res.status(200).json(await rediger(corps, ip));
    if (corps && corps.op === 'vocal') return res.status(200).json(await interpreterVocal(corps, ip));
    if (corps && corps.op === 'voix') return await envoyerVoix(res, corps, ip);
    if (corps && ['programme_generer', 'programme_recommander'].includes(corps.op)) {
      if (tropDeRedactions(ip)) throw new Refus('ia_trop_de_demandes', 429);
      return res.status(200).json(await operationProgramme(corps));
    }
    if (corps && /^linkedin_[a-z_]+$/.test(String(corps.op || ''))) return res.status(200).json(await operationLinkedin(corps, ip));
    // La prospection email : Gabriel seul (un membre est refusé plus haut, ces opérations ne sont pas dans OPS_EQUIPE).
    if (corps && (/^email_[a-z_]+$/.test(String(corps.op || '')) || corps.op === 'prospect_email')) return res.status(200).json(await operationEmail(corps, ip));
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

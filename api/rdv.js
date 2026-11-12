/**
 * rdv.js — la prise de rendez-vous du site, en tour de rôle, sans HubSpot (10/11/2026).
 *
 * Gabriel, 10/11 : « avoir un seul agenda qui met, en fonction des disponibilités,
 * un rendez-vous à Dorian, Axel ou moi » (HubSpot s'arrête). Tour de rôle
 * « équilibré », choisi le même jour : parmi les conseillers libres sur le créneau,
 * celui qui a reçu le moins de RDV de cette page dans la semaine du créneau ; à
 * égalité, celui qui en a reçu un depuis le plus longtemps. Un prospect déjà suivi
 * par l'un d'eux va à celui-là s'il est libre.
 *
 * Réglages repris de la page HubSpot (Round Robin) : 30 minutes, de 9 h à 17 h les
 * jours ouvrés, au moins 24 h à l'avance, jusqu'à 4 semaines, Google Meet, téléphone
 * et entreprise obligatoires. Ils se changent sans code dans le réglage `rdv_tour`
 * (iae_crm_reglages) : conseillers, debut, fin, duree, pas, preavis_heures, semaines.
 *
 *   GET  /api/rdv  → { creneaux: ["2026-11-12T08:00:00.000Z", …], jeton, turnstile? },
 *                    jamais qui est libre
 *   POST /api/rdv  { debut, prenom, nom, email, telephone, entreprise, message?,
 *                    programme?, par?, jeton, turnstile?, _gotcha } → { ok, conseiller, prenom, nom, debut }
 *
 * Agendas : le jeton Google de gabriel@ia-entrepreneur.fr (GMAIL_IAE_*, portée
 * calendar.events), qui est propriétaire des agendas d'Axel et de Dorian dans le
 * Workspace (vérifié le 10/11). Lecture par events.list (freeBusy demande une autre
 * portée). L'événement est posé dans l'agenda du conseiller, qui en est
 * l'organisateur, avec un lien Meet, et le prospect est invité : Google lui envoie
 * l'invitation, comme le faisait HubSpot. C'est voulu ici, à l'inverse de
 * creerEvenement dans le CRM, qui pose ses RDV sans invités.
 *
 * Le lead entre dans le CRM au nom du conseiller (proprietaire), avec la tâche
 * « RDV le … » et une ligne d'historique ; `?par=anna` sur la page met Anna en setter.
 * Le conseiller reçoit un email (Brevo, depuis gabriel@ia-entrepreneur.fr).
 *
 * Route publique : origine vérifiée et champ piège pour la réservation, 20
 * réservations et 120 lectures par IP et par 10 minutes. Depuis les deux faux RDV des
 * 11 et 12/11 (robot, adresse jetable, lien d'hameçonnage dans le message), les barrières
 * de _anti-robot.js : pas de lien, pas d'adresse jetable ni de domaine sans email, jeton
 * de la page (3 s au moins), et Cloudflare Turnstile quand ses clés sont sur Vercel.
 * Créneau revérifié dans
 * les agendas au moment de réserver ; deux réservations simultanées du même
 * créneau sont départagées par l'index unique de iae_crm_rdv (supabase/iae_crm_rdv.sql).
 */
import { randomUUID } from 'node:crypto';
import { crmDisponible, sb, aujourdhui } from './_crm-site.js';
import { contientLien, emailRefuse, jetonPage, jetonRefuse, turnstileCle, turnstileValide } from './_anti-robot.js';

const HOTES = ['ia-entrepreneur.fr', 'www.ia-entrepreneur.fr'];
const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;
const ADMIN = 'gabriel@ia-entrepreneur.fr';
const AGENDA = 'https://www.googleapis.com/calendar/v3/calendars';
const FENETRE_MS = 10 * 60 * 1000;
const passages = { lecture: new Map(), reservation: new Map() };

const DEFAUT = {
  conseillers: [
    { email: 'axel@ia-entrepreneur.fr', prenom: 'Axel', nom: 'Ouhadda', fonction: 'conseiller formation IA' },
    { email: 'dorian@ia-entrepreneur.fr', prenom: 'Dorian', nom: 'Didiot', fonction: 'conseiller formation IA' },
    { email: ADMIN, prenom: 'Gabriel', nom: 'Vanderbecken', fonction: "fondateur d'IA-Entrepreneur" },
  ],
  debut: '09:00', fin: '17:00', duree: 30, pas: 30, preavis_heures: 24, semaines: 4,
  setters: { anna: 'anna@ia-entrepreneur.fr' },
};

/* ---------- Réglages ---------- */

let cacheReglages = { le: 0, valeur: null };
async function reglages() {
  if (cacheReglages.valeur && Date.now() - cacheReglages.le < 60000) return cacheReglages.valeur;
  let perso = {};
  try {
    const [l] = await sb('iae_crm_reglages?cle=eq.rdv_tour&select=valeur');
    if (l && l.valeur && typeof l.valeur === 'object') perso = l.valeur;
  } catch (e) { console.error('rdv reglages', e?.message || e); }
  const heure = (v, d) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || '')) ? v : d);
  const entier = (v, d, min, max) => (Number.isInteger(v) && v >= min && v <= max ? v : d);
  const conseillers = (Array.isArray(perso.conseillers) ? perso.conseillers : DEFAUT.conseillers)
    .filter((c) => c && /^[a-z0-9._-]+@ia-entrepreneur\.fr$/.test(String(c.email || '')) && c.actif !== false)
    .map((c) => ({ email: c.email, prenom: String(c.prenom || c.email.split('@')[0]).slice(0, 40), nom: String(c.nom || '').slice(0, 60), fonction: String(c.fonction || 'conseiller formation IA').slice(0, 80) }));
  const valeur = {
    conseillers,
    debut: heure(perso.debut, DEFAUT.debut), fin: heure(perso.fin, DEFAUT.fin),
    duree: entier(perso.duree, DEFAUT.duree, 15, 120), pas: entier(perso.pas, DEFAUT.pas, 15, 120),
    preavis_heures: entier(perso.preavis_heures, DEFAUT.preavis_heures, 0, 168), semaines: entier(perso.semaines, DEFAUT.semaines, 1, 8),
    setters: perso.setters && typeof perso.setters === 'object' ? perso.setters : DEFAUT.setters,
  };
  cacheReglages = { le: Date.now(), valeur };
  return valeur;
}
const cleDe = (email) => email.split('@')[0];

/* ---------- Dates à Paris ---------- */

function decalageParis(ms) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(ms / 60000) * 60000) / 60000;
}
// « 2026-11-12 », « 09:30 » à Paris → instant (ms).
function instantParis(jour, hhmm) {
  const [y, m, d] = jour.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const naif = Date.UTC(y, m - 1, d, h, mi);
  const t = naif - decalageParis(naif) * 60000;
  return naif - decalageParis(t) * 60000;
}
const jourParis = (ms) => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
const heureParis = (ms) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
const heureLisible = (ms) => heureParis(ms).replace(':', ' h ').replace(/ h 00$/, ' h').replace(/^0/, '');
const dateLongue = (ms) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(ms));
const minutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const hhmmDe = (n) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

function ajouterJours(s, n) { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); }
function paques(an) {
  const a = an % 19, b = Math.floor(an / 100), c = an % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
  return `${an}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
}
// Jours ouvrés : mêmes règles que le CRM (week-end et jours fériés, Pâques calculé).
function estOuvre(s) {
  const an = Number(s.slice(0, 4)), p = paques(an);
  const feries = [`${an}-01-01`, ajouterJours(p, 1), `${an}-05-01`, `${an}-05-08`, ajouterJours(p, 39), ajouterJours(p, 50), `${an}-07-14`, `${an}-08-15`, `${an}-11-01`, `${an}-11-11`, `${an}-12-25`];
  const j = new Date(`${s}T12:00:00Z`).getUTCDay();
  return j !== 0 && j !== 6 && !feries.includes(s);
}
// Le lundi de la semaine d'un jour (« 2026-11-12 » → « 2026-11-09 »).
function lundiDe(s) { const j = new Date(`${s}T12:00:00Z`).getUTCDay(); return ajouterJours(s, -((j + 6) % 7)); }

/* ---------- Google Agenda (jeton de gabriel@ia-entrepreneur.fr) ---------- */

const agendaConfigure = () => Boolean(process.env.GMAIL_IAE_CLIENT_ID && process.env.GMAIL_IAE_CLIENT_SECRET && process.env.GMAIL_IAE_REFRESH_TOKEN);
let jeton = null;
async function jetonGoogle() {
  if (jeton && jeton.expire > Date.now() + 60000) return jeton.valeur;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_IAE_CLIENT_ID, client_secret: process.env.GMAIL_IAE_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_IAE_REFRESH_TOKEN, grant_type: 'refresh_token',
    }),
  });
  if (!r.ok) throw new Error(`jeton google ${r.status} ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  jeton = { valeur: j.access_token, expire: Date.now() + (j.expires_in || 3000) * 1000 };
  return jeton.valeur;
}

async function google(url, { methode = 'GET', corps } = {}) {
  const stop = new AbortController();
  const minuteur = setTimeout(() => stop.abort(), 12000);
  try {
    const r = await fetch(url, {
      method: methode, signal: stop.signal,
      headers: { Authorization: `Bearer ${await jetonGoogle()}`, ...(corps ? { 'Content-Type': 'application/json' } : {}) },
      body: corps ? JSON.stringify(corps) : undefined,
    });
    if (!r.ok) throw new Error(`agenda ${r.status} ${(await r.text()).slice(0, 200)}`);
    const t = await r.text();
    return t ? JSON.parse(t) : {};
  } finally {
    clearTimeout(minuteur);
  }
}

// Les plages occupées d'un agenda entre deux instants : [[début, fin], …] en ms.
// Ne comptent pas : annulé, « Disponible » (transparent), lieu de travail, invitation refusée.
async function occupations(email, de, a) {
  const plages = [];
  let page = '';
  for (let n = 0; n < 5; n += 1) {
    const q = new URLSearchParams({ singleEvents: 'true', orderBy: 'startTime', maxResults: '2500', timeMin: new Date(de).toISOString(), timeMax: new Date(a).toISOString(),
      fields: 'items(status,transparency,eventType,start,end,attendees(self,responseStatus)),nextPageToken', ...(page ? { pageToken: page } : {}) });
    const r = await google(`${AGENDA}/${encodeURIComponent(email)}/events?${q}`);
    for (const e of r.items || []) {
      if (e.status === 'cancelled' || e.transparency === 'transparent' || e.eventType === 'workingLocation') continue;
      if ((e.attendees || []).some((x) => x.self && x.responseStatus === 'declined')) continue;
      const debut = e.start?.dateTime ? Date.parse(e.start.dateTime) : e.start?.date ? instantParis(e.start.date, '00:00') : NaN;
      const fin = e.end?.dateTime ? Date.parse(e.end.dateTime) : e.end?.date ? instantParis(e.end.date, '00:00') : NaN;
      if (Number.isFinite(debut) && Number.isFinite(fin) && fin > debut) plages.push([debut, fin]);
    }
    page = r.nextPageToken;
    if (!page) break;
  }
  return plages;
}

// Pour chaque conseiller : ses plages occupées, ou null si son agenda ne répond pas
// (il n'est alors proposé sur aucun créneau, plutôt que de risquer un doublon).
async function agendas(conseillers, de, a) {
  return Promise.all(conseillers.map(async (c) => {
    try { return { ...c, occupe: await occupations(c.email, de, a) }; } catch (e) {
      console.error('rdv agenda', c.email, e?.message || e);
      return { ...c, occupe: null };
    }
  }));
}
const libre = (c, debut, fin) => Array.isArray(c.occupe) && !c.occupe.some(([d, f]) => d < fin && f > debut);

/* ---------- Créneaux ---------- */

function creneauxPossibles(r, maintenant = Date.now()) {
  const sorties = [];
  const premier = maintenant + r.preavis_heures * 3600000;
  const auj = jourParis(maintenant);
  for (let i = 0; i <= r.semaines * 7; i += 1) {
    const jour = ajouterJours(auj, i);
    if (!estOuvre(jour)) continue;
    for (let m = minutes(r.debut); m + r.duree <= minutes(r.fin); m += r.pas) {
      const debut = instantParis(jour, hhmmDe(m));
      if (debut >= premier) sorties.push(debut);
    }
  }
  return sorties;
}

let cacheCreneaux = { le: 0, valeur: null };
async function creneauxLibres() {
  if (cacheCreneaux.valeur && Date.now() - cacheCreneaux.le < 60000) return cacheCreneaux.valeur;
  const r = await reglages();
  const possibles = creneauxPossibles(r);
  if (!possibles.length) return [];
  const agendasLus = await agendas(r.conseillers, possibles[0], possibles[possibles.length - 1] + r.duree * 60000);
  if (!agendasLus.some((c) => c.occupe)) throw new Error('aucun agenda lisible');
  const valeur = possibles.filter((d) => agendasLus.some((c) => libre(c, d, d + r.duree * 60000))).map((d) => new Date(d).toISOString());
  cacheCreneaux = { le: Date.now(), valeur };
  return valeur;
}

/* ---------- Choix du conseiller ---------- */

async function ordreDuTour(libres, debut, proprietaireActuel) {
  // Un lead déjà suivi par l'un d'eux va d'abord à celui-là, s'il est libre (un lead « Nouveau »,
  // qui n'a encore été traité par personne, suit le tour de rôle).
  const suivi = libres.find((c) => c.email === proprietaireActuel);
  const lundi = lundiDe(jourParis(debut));
  const [semaine, derniers] = await Promise.all([
    sb(`iae_crm_rdv?statut=eq.pose&debut=gte.${new Date(instantParis(lundi, '00:00')).toISOString()}&debut=lt.${new Date(instantParis(ajouterJours(lundi, 7), '00:00')).toISOString()}&select=conseiller`),
    sb('iae_crm_rdv?statut=eq.pose&order=created_at.desc&limit=200&select=conseiller,created_at'),
  ]);
  const nb = (email) => semaine.filter((x) => x.conseiller === email).length;
  const dernier = (email) => { const x = derniers.find((y) => y.conseiller === email); return x ? Date.parse(x.created_at) : 0; };
  const tri = [...libres].sort((x, y) => nb(x.email) - nb(y.email) || dernier(x.email) - dernier(y.email));
  return suivi ? [suivi, ...tri.filter((c) => c !== suivi)] : tri;
}

/* ---------- Lead du CRM ---------- */

const nomComplet = (c) => [c.prenom, c.nom].filter(Boolean).join(' ');

async function leadExistant(email) {
  const [c] = await sb(`iae_crm_contacts?select=id,lead_id&email=ilike.${encodeURIComponent(email)}&limit=1`);
  if (!c) return null;
  const [l] = await sb(`iae_crm_leads?id=eq.${c.lead_id}&select=id,type,statut,proprietaire,setter,archive`);
  return l ? { ...l, contact_id: c.id } : null;
}

async function versCrm({ d, conseiller, debut, fin, evenement, existant, leadId, setter, rdvId }) {
  const jour = jourParis(debut);
  const quand = `${dateLongue(debut)} à ${heureLisible(debut)}`;
  const avec = nomComplet(conseiller);
  const origine = setter ? 'posé par Anna' : 'pris sur le site';
  const tache = {
    prochaine_relance: jour, prochaine_action: 'rdv', relances_sans_reponse: 0,
    prochaine_note: `RDV découverte le ${quand} (30 min, Meet) avec ${avec}, ${origine}. Il est dans ton agenda Google.${d.programme ? ` Programme type regardé sur le site : ${d.programme}.` : ''}`.slice(0, 2000),
  };
  const detail = [
    `Rendez-vous ${origine} : ${quand}, ${Math.round((fin - debut) / 60000)} minutes, avec ${avec}.`,
    evenement.hangoutLink && `Visio : ${evenement.hangoutLink}`,
    `Nom : ${nomComplet(d)}`, `Email : ${d.email}`, `Téléphone : ${d.telephone}`, `Entreprise : ${d.entreprise}`,
    d.programme && `Programme type regardé : ${d.programme}`,
    d.message && `Message :\n${d.message}`,
  ].filter(Boolean).join('\n');
  let contactId;
  if (existant) {
    contactId = existant.contact_id;
    // Un prospect passe au conseiller du RDV ; un client, un formateur ou un partenaire garde le sien.
    const confier = existant.type === 'prospect' && existant.proprietaire !== conseiller.email;
    const maj = { ...tache, archive: false, dernier_contact: aujourdhui(), ...(confier ? { proprietaire: conseiller.email } : {}) };
    if (setter && !existant.setter) maj.setter = setter;
    if (existant.type === 'prospect' && ['nouveau', 'contacte'].includes(existant.statut)) maj.statut = 'qualifie';
    await sb(`iae_crm_leads?id=eq.${leadId}`, { methode: 'PATCH', corps: maj, prefer: 'return=minimal' });
    if (confier) {
      await sb('iae_crm_activites', { methode: 'POST', prefer: 'return=minimal', corps: { lead_id: leadId, contact_id: contactId, type: 'note', resume: `Lead confié à ${avec} pour ce RDV (il était suivi par ${existant.proprietaire}, pas libre sur ce créneau)`, source: 'site' } });
    }
  } else {
    await sb('iae_crm_leads', {
      methode: 'POST', prefer: 'return=minimal',
      corps: {
        id: leadId, entreprise: d.entreprise, type: 'prospect', statut: 'qualifie',
        source: setter ? 'Anna : RDV en tour de rôle' : 'Site : prise de rendez-vous', tags: ['site', 'rdv'],
        besoin: [d.programme, d.message && d.message.slice(0, 400)].filter(Boolean).join(', ') || null,
        dernier_contact: aujourdhui(), proprietaire: conseiller.email, setter: setter || null, ...tache,
      },
    });
    const [contact] = await sb('iae_crm_contacts', { methode: 'POST', prefer: 'return=representation', corps: { lead_id: leadId, prenom: d.prenom, nom: d.nom, email: d.email, telephone: d.telephone, principal: true } });
    contactId = contact && contact.id;
  }
  await sb('iae_crm_activites', {
    methode: 'POST', prefer: 'return=minimal',
    corps: {
      lead_id: leadId, contact_id: contactId || null, type: 'rdv', source: 'site',
      resume: `RDV découverte ${origine} pour le ${quand} avec ${avec}`.slice(0, 2000), contenu: detail,
      meta: { date_rdv: jour, heure: heureParis(debut), origine: setter ? 'setter' : 'site', conseiller: conseiller.email, setter: setter || null, evenement: evenement.id || null, meet: evenement.hangoutLink || null, rdv_tour: rdvId },
    },
  });
  await sb(`iae_crm_rdv?id=eq.${rdvId}`, { methode: 'PATCH', corps: { lead_id: leadId }, prefer: 'return=minimal' });
}

/* ---------- Email au conseiller ---------- */

async function prevenir(conseiller, d, debut, evenement, setter) {
  if (!process.env.BREVO_API_KEY) return;
  const quand = `${dateLongue(debut)} à ${heureLisible(debut)}`;
  const lignes = [
    `Bonjour ${conseiller.prenom},`, '',
    `${setter ? 'Anna vient de te poser' : 'Un prospect vient de réserver'} un RDV découverte avec toi, ${quand} (30 minutes en visio). Il est dans ton agenda Google.`, '',
    `${nomComplet(d)}, ${d.entreprise}`, `Téléphone : ${d.telephone}`, `Email : ${d.email}`,
    d.programme ? `Programme type regardé sur le site : ${d.programme}` : null,
    d.message ? `Son message : ${d.message}` : null,
    evenement.hangoutLink ? `Visio : ${evenement.hangoutLink}` : null, '',
    'La fiche est dans le CRM, à ton nom : https://ia-entrepreneur.fr/crm/', '',
    'Le CRM IA-Entrepreneur',
  ].filter((x) => x !== null);
  const stop = new AbortController();
  const minuteur = setTimeout(() => stop.abort(), 8000);
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', signal: stop.signal,
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: ADMIN, name: 'CRM IA-Entrepreneur' }, to: [{ email: conseiller.email, name: nomComplet(conseiller) }],
        subject: `Nouveau RDV : ${d.entreprise}, ${quand}`.slice(0, 180), textContent: lignes.join('\n'),
      }),
    });
    if (!r.ok) throw new Error(`brevo ${r.status} ${(await r.text()).slice(0, 200)}`);
  } catch (e) {
    console.error('rdv brevo', e?.message || e);
  } finally {
    clearTimeout(minuteur);
  }
}

/* ---------- Réservation ---------- */

function texte(v, max) {
  const t = String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim();
  return t ? t.slice(0, max) : null;
}
const ligne = (v, max) => { const t = texte(v, max); return t ? t.replace(/\s+/g, ' ') : null; };

function origineAutorisee(req) {
  const o = req.headers.origin || req.headers.referer;
  if (!o) return false;
  try {
    const h = new URL(o).hostname;
    return HOTES.includes(h) || h.endsWith('.vercel.app') || h === 'localhost' || h === '127.0.0.1';
  } catch {
    return false;
  }
}

function tropDePassages(sorte, ip, max) {
  const carte = passages[sorte];
  const maintenant = Date.now();
  const r = (carte.get(ip) || []).filter((t) => maintenant - t < FENETRE_MS);
  if (carte.size > 5000) carte.clear();
  if (r.length >= max) return true;
  r.push(maintenant);
  carte.set(ip, r);
  return false;
}

const PROGRAMMES = { 'niveau-1': 'Niveau 1, Acculturation IA', 'niveau-2': 'Niveau 2, IA métier', 'niveau-3': 'Niveau 3, Automatisation & intégration' };

async function reserver(corps, ip) {
  const r = await reglages();
  const d = {
    prenom: ligne(corps.prenom, 80), nom: ligne(corps.nom, 80), email: ligne(corps.email, 254),
    telephone: ligne(corps.telephone, 40), entreprise: ligne(corps.entreprise, 160), message: texte(corps.message, 2000),
    programme: PROGRAMMES[String(corps.programme || '').toLowerCase()] || null,
  };
  for (const champ of ['prenom', 'nom', 'entreprise']) if (!d[champ]) return { statut: 400, corps: { erreur: champ } };
  if (!d.email || !EMAIL_RE.test(d.email)) return { statut: 400, corps: { erreur: 'email' } };
  if (!d.telephone || (d.telephone.match(/\d/g) || []).length < 9) return { statut: 400, corps: { erreur: 'telephone' } };
  // Les faux RDV des 11 et 12/11 portaient un lien d'hameçonnage dans le message.
  for (const champ of ['message', 'entreprise', 'nom', 'prenom']) {
    if (contientLien(d[champ])) { console.error('rdv refusé : lien', champ); return { statut: 400, corps: { erreur: champ, motif: 'lien' } }; }
  }
  const motifEmail = await emailRefuse(d.email);
  if (motifEmail) { console.error('rdv refusé : email', motifEmail, d.email.split('@').pop()); return { statut: 400, corps: { erreur: 'email', motif: motifEmail } }; }
  const debut = Date.parse(String(corps.debut || ''));
  if (!Number.isFinite(debut) || !creneauxPossibles(r).includes(debut)) return { statut: 409, corps: { erreur: 'creneau' } };
  const fin = debut + r.duree * 60000;
  // Le captcha en dernier : son jeton ne sert qu'une fois, la page en redemande un après chaque refus.
  if (!(await turnstileValide(corps.turnstile, ip))) return { statut: 400, corps: { erreur: 'robot', motif: 'captcha' } };
  const setter = r.setters[String(corps.par || '').toLowerCase()] || null;

  // Le créneau est relu dans les agendas à l'instant, sans cache.
  const libres = (await agendas(r.conseillers, debut, fin)).filter((c) => libre(c, debut, fin));
  if (!libres.length) return { statut: 409, corps: { erreur: 'creneau' } };
  const existant = await leadExistant(d.email);
  const leadId = existant ? existant.id : randomUUID();

  const suiviPar = existant && (existant.statut !== 'nouveau' || existant.type !== 'prospect') ? existant.proprietaire : null;
  for (const conseiller of await ordreDuTour(libres, debut, suiviPar)) {
    // La place est prise en base d'abord : l'index unique (conseiller, debut) départage deux réservations simultanées.
    let rdv;
    try {
      [rdv] = await sb('iae_crm_rdv', { methode: 'POST', prefer: 'return=representation', corps: { conseiller: conseiller.email, debut: new Date(debut).toISOString(), fin: new Date(fin).toISOString(), source: setter ? 'setter' : 'site', setter } });
    } catch (e) {
      if (/23505|duplicate|409/.test(String(e?.message))) continue;
      throw e;
    }
    let evenement;
    try {
      evenement = await google(`${AGENDA}/${encodeURIComponent(conseiller.email)}/events?conferenceDataVersion=1&sendUpdates=all`, {
        methode: 'POST',
        corps: {
          summary: `Rendez-vous découverte IA-Entrepreneur : ${d.entreprise}`.slice(0, 200),
          description: [
            `Rendez-vous de ${r.duree} minutes en visio avec ${nomComplet(conseiller)}, ${conseiller.fonction}.`,
            'Pour rejoindre la visio : le lien Google Meet de cette invitation.',
            'Un empêchement ? Répondez à cet email et nous trouverons un autre créneau.', '',
            'Informations données à la réservation :',
            `${nomComplet(d)}, ${d.entreprise}`, `Téléphone : ${d.telephone}`,
            d.programme ? `Programme type regardé : ${d.programme}` : null,
            d.message ? `Message : ${d.message}` : null,
          ].filter((x) => x !== null).join('\n'),
          start: { dateTime: new Date(debut).toISOString(), timeZone: 'Europe/Paris' },
          end: { dateTime: new Date(fin).toISOString(), timeZone: 'Europe/Paris' },
          attendees: [{ email: d.email, displayName: nomComplet(d) }],
          conferenceData: { createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } },
          guestsCanModify: false, guestsCanInviteOthers: false,
          // crm_lead : la synchronisation de l'agenda de Gabriel laisse de côté les événements posés par le CRM.
          extendedProperties: { private: { crm_lead: leadId, rdv_tour: rdv.id } },
        },
      });
    } catch (e) {
      console.error('rdv evenement', conseiller.email, e?.message || e);
      await sb(`iae_crm_rdv?id=eq.${rdv.id}`, { methode: 'DELETE', prefer: 'return=minimal' }).catch(() => {});
      continue;
    }
    await sb(`iae_crm_rdv?id=eq.${rdv.id}`, { methode: 'PATCH', corps: { evenement: evenement.id || null, meet: evenement.hangoutLink || null }, prefer: 'return=minimal' }).catch((e) => console.error('rdv maj', e?.message || e));
    try {
      await versCrm({ d, conseiller, debut, fin, evenement, existant, leadId, setter, rdvId: rdv.id });
    } catch (e) {
      // Le RDV est posé et le prospect invité : une panne du CRM ne doit pas lui afficher une erreur.
      console.error('rdv crm', e?.message || e);
    }
    await prevenir(conseiller, d, debut, evenement, setter);
    cacheCreneaux = { le: 0, valeur: null };
    return { statut: 200, corps: { ok: true, conseiller: cleDe(conseiller.email), prenom: conseiller.prenom, nom: conseiller.nom, debut: new Date(debut).toISOString() } };
  }
  return { statut: 409, corps: { erreur: 'creneau' } };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '?').split(',')[0].trim();
  if (!crmDisponible() || !agendaConfigure()) return res.status(503).json({ erreur: 'indisponible' });
  try {
    if (req.method === 'GET') {
      if (tropDePassages('lecture', ip, 120)) return res.status(429).json({ erreur: 'trop' });
      const cle = turnstileCle();
      return res.status(200).json({ creneaux: await creneauxLibres(), jeton: jetonPage(), ...(cle ? { turnstile: cle } : {}) });
    }
    if (req.method === 'POST') {
      let corps = req.body;
      if (typeof corps === 'string') { try { corps = JSON.parse(corps); } catch { corps = {}; } }
      corps = corps && typeof corps === 'object' ? corps : {};
      if (!origineAutorisee(req)) return res.status(403).json({ erreur: 'origine' });
      if (texte(corps._gotcha, 10)) return res.status(200).json({ ok: true });
      if (tropDePassages('reservation', ip, 20)) return res.status(429).json({ erreur: 'trop' });
      const motifJeton = jetonRefuse(corps.jeton);
      if (motifJeton) { console.error('rdv refusé : jeton', motifJeton); return res.status(400).json({ erreur: 'robot', motif: motifJeton }); }
      const { statut, corps: sortie } = await reserver(corps, ip);
      return res.status(statut).json(sortie);
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ erreur: 'methode' });
  } catch (e) {
    console.error('rdv', e?.message || e);
    return res.status(503).json({ erreur: 'indisponible' });
  }
}

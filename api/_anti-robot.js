/**
 * _anti-robot.js — barrières contre les faux rendez-vous (12/11/2026).
 *
 * Les 11 et 12/11, un robot a réservé deux RDV (Axel puis Gabriel), de nuit, avec une
 * adresse jetable en probox.my.id et, dans le message, un lien d'hameçonnage déguisé en
 * « page de l'offre » (onpartage.online, unpartage.online, domaine créé le 09/11). Le lien
 * arrivait dans l'email du conseiller, dans l'agenda et dans le CRM. Le champ piège ne
 * l'a pas arrêté. D'où, du moins coûteux au plus fort :
 *
 *   1. aucun lien dans les champs libres (le message, le nom, l'entreprise) ;
 *   2. pas d'adresse jetable (liste publique de ~10 000 domaines, plus les sous-domaines
 *      gratuits qu'utilisent ces services), ni de domaine qui ne reçoit pas d'email (DNS) ;
 *   3. un jeton signé, donné par la page à son ouverture : sans lui, pas de réservation, et
 *      il faut au moins 3 secondes entre l'ouverture et l'envoi (un robot qui poste
 *      directement sur l'API, ou remplit tout d'un coup, est arrêté) ;
 *   4. Cloudflare Turnstile, le captcha gratuit et le plus souvent invisible, dès que
 *      TURNSTILE_SITE_KEY et TURNSTILE_SECRET_KEY sont sur Vercel. Sans ces variables, il
 *      est simplement absent.
 *
 * Chaque refus dit au visiteur quoi corriger : un vrai prospect ne doit jamais croire
 * qu'il a réservé alors que rien n'est posé.
 */
import dns from 'node:dns';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { JETABLES } from './_emails-jetables.js';

/* ---------- 1. Liens ---------- */

// Un lien cliquable : http(s)://, www., ou un domaine suivi d'un chemin (« site.online/fr/… »).
// Un simple nom d'outil (« Claude.ai », « Node.js ») reste permis.
const LIEN_RE = /\bhttps?:\/\/|\bwww\.|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\/\S/i;
export const contientLien = (texte) => LIEN_RE.test(String(texte || ''));

/* ---------- 2. Adresse email ---------- */

// Sous-domaines gratuits des services d'adresses jetables (des dizaines de variantes dans la
// liste publique) : aucun prospect n'a son adresse professionnelle sur l'un d'eux.
const SUFFIXES_JETABLES = ['my.id', 'dynv6.net', 'io.vn', 'fr.nf', 'eu.cc', 'cc.cd', 'pp.ua', 'ccwu.cc', 'ooguy.com', 'loseyourip.com', 'mywire.org', 'dpdns.org'];

function delai(promesse, ms) {
  let minuteur;
  return Promise.race([promesse, new Promise((_, rejeter) => { minuteur = setTimeout(() => rejeter(Object.assign(new Error('délai DNS'), { code: 'ETIMEOUT' })), ms); })])
    .finally(() => clearTimeout(minuteur));
}
const INEXISTANT = new Set(['ENOTFOUND', 'ENODATA', 'NXDOMAIN']);

// Le domaine peut-il recevoir un email ? Un enregistrement MX, ou à défaut une adresse (RFC 5321).
// Non seulement s'il n'existe pas, ou s'il le déclare (MX nul, RFC 7505). Une panne DNS laisse passer.
async function recoitEmails(domaine) {
  try {
    const mx = await delai(dns.promises.resolveMx(domaine), 2500);
    if (mx.length && mx.every((m) => !m.exchange || m.exchange === '.')) return false;
    if (mx.length) return true;
  } catch (e) {
    if (!INEXISTANT.has(e?.code)) return true;
    if (e.code === 'ENOTFOUND' || e.code === 'NXDOMAIN') return false;
  }
  try {
    const a = await delai(dns.promises.resolve4(domaine), 2500);
    return a.length > 0;
  } catch (e) {
    return !INEXISTANT.has(e?.code);
  }
}

// null si l'adresse est acceptée, sinon le motif : 'jetable' ou 'domaine'.
export async function emailRefuse(email) {
  const domaine = String(email || '').split('@').pop().toLowerCase().replace(/\.$/, '');
  if (!domaine) return 'domaine';
  const parties = domaine.split('.');
  for (let i = 0; i < parties.length - 1; i += 1) if (JETABLES.has(parties.slice(i).join('.'))) return 'jetable';
  if (SUFFIXES_JETABLES.some((s) => domaine === s || domaine.endsWith(`.${s}`))) return 'jetable';
  return (await recoitEmails(domaine)) ? null : 'domaine';
}

/* ---------- 3. Jeton de la page ---------- */

export const DELAI_MIN_MS = 3000;
const DUREE_MAX_MS = 12 * 3600000;
const cleJeton = () => `rdv-jeton|${process.env.RDV_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`;
const signer = (t) => createHmac('sha256', cleJeton()).update(`rdv|${t}`).digest('base64url').slice(0, 32);

export const jetonPage = (maintenant = Date.now()) => `${maintenant}.${signer(maintenant)}`;

// null si le jeton est bon, sinon le motif : 'jeton' (absent ou faux), 'vite', 'expire'.
export function jetonRefuse(jeton, maintenant = Date.now()) {
  const m = /^(\d{13})\.([A-Za-z0-9_-]{32})$/.exec(String(jeton || ''));
  if (!m) return 'jeton';
  const attendu = Buffer.from(signer(m[1])), recu = Buffer.from(m[2]);
  if (attendu.length !== recu.length || !timingSafeEqual(attendu, recu)) return 'jeton';
  const age = maintenant - Number(m[1]);
  if (age < DELAI_MIN_MS) return 'vite';
  if (age > DUREE_MAX_MS) return 'expire';
  return null;
}

/* ---------- 4. Cloudflare Turnstile ---------- */

export const turnstileActif = () => Boolean(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
export const turnstileCle = () => (turnstileActif() ? process.env.TURNSTILE_SITE_KEY : null);

// true si Cloudflare valide le jeton du widget. Cloudflare injoignable : on laisse passer
// (les trois autres barrières restent), plutôt que de bloquer tous les prospects.
export async function turnstileValide(reponse, ip) {
  if (!turnstileActif()) return true;
  const r = String(reponse || '');
  if (!r || r.length > 2048) return false;
  const stop = new AbortController();
  const minuteur = setTimeout(() => stop.abort(), 6000);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', signal: stop.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: r, ...(ip && ip !== '?' ? { remoteip: ip } : {}) }),
    });
    if (res.status >= 500) throw new Error(`turnstile ${res.status}`);
    const j = await res.json();
    if (!j.success) console.error('rdv turnstile refusé', (j['error-codes'] || []).join(','));
    return j.success === true;
  } catch (e) {
    console.error('rdv turnstile injoignable', e?.message || e);
    return true;
  } finally {
    clearTimeout(minuteur);
  }
}

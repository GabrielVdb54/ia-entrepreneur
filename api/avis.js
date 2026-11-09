/**
 * /api/avis : la page d'avis après une formation (https://ia-entrepreneur.fr/avis/#<jeton>), et les avis publiés.
 *
 *   GET  ?publies=1                     les avis publiés sur le site (note, texte, nom, fonction, entreprise, date)
 *   GET  (en-tête X-Jeton)              l'entreprise de la formation, pour la page
 *   POST (en-tête X-Jeton) { note, utile, ameliorer, nom, fonction, entreprise, accord }
 *        → { merci: true, google: <lien de la fiche Google ou null> }
 *
 * Le jeton voyage dans l'en-tête, jamais dans l'URL d'une requête ; la base n'en garde que l'empreinte. Le lien
 * Google est proposé à tous ceux qui répondent, quelle que soit la note (Google interdit de ne solliciter que les
 * avis positifs). Pas d'adresse IP en base.
 */
import { base } from './_formateurs.js';
import { avisPublies, demandeDuJeton, recevoirAvis, GOOGLE_AVIS_RE, RefusAvis } from './_avis.js';

const FENETRE = 10 * 60 * 1000;
const passages = new Map();
function trop(cle, max) {
  const t = Date.now();
  const p = passages.get(cle) || { n: 0, debut: t };
  if (t - p.debut > FENETRE) { p.n = 0; p.debut = t; }
  p.n++;
  passages.set(cle, p);
  if (passages.size > 5000) passages.clear();
  return p.n > max;
}

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex');
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({ erreur: 'indisponible' });
  const params = new URL(req.url, 'http://local').searchParams;
  try {
    if (req.method === 'GET' && params.get('publies') !== null) {
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
      return res.status(200).json({ avis: await avisPublies() });
    }
    res.setHeader('Cache-Control', 'no-store');
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '?').split(',')[0].trim();
    if (trop(`ip:${ip}`, 60)) return res.status(429).json({ erreur: 'trop_de_demandes' });
    const d = await demandeDuJeton(String(req.headers['x-jeton'] || ''));
    if (!d) return res.status(trop(`echec:${ip}`, 20) ? 429 : 401).json({ erreur: 'lien_invalide' });
    if (d.expire) return res.status(410).json({ erreur: 'lien_expire' });
    const [lead] = (await base(`iae_crm_leads?id=eq.${d.lead_id}&select=entreprise`)) || [];
    if (req.method === 'GET') return res.status(200).json({ entreprise: lead ? lead.entreprise : '' });
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ erreur: 'methode' }); }
    if (trop(`demande:${d.id}`, 50)) return res.status(429).json({ erreur: 'trop_de_demandes' });
    let corps = req.body;
    if (typeof corps === 'string') { try { corps = JSON.parse(corps); } catch { corps = {}; } }
    await recevoirAvis(d, corps && typeof corps === 'object' ? corps : {});
    const [r] = (await base('iae_crm_reglages?cle=eq.lien_avis_google&select=valeur')) || [];
    const lien = r && typeof r.valeur === 'string' && GOOGLE_AVIS_RE.test(r.valeur) ? r.valeur : null;
    return res.status(200).json({ merci: true, google: lien });
  } catch (e) {
    if (e instanceof RefusAvis || (e && e.refus)) return res.status(e.statut || 400).json({ erreur: e.code });
    console.error('avis', e);
    return res.status(500).json({ erreur: 'erreur_interne' });
  }
}

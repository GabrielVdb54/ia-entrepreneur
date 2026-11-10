/**
 * /api/evaluation : l'évaluation à chaud d'une formation (https://ia-entrepreneur.fr/evaluation/#<jeton>).
 *
 *   GET  (en-tête X-Jeton)  le titre, le client, le formateur, les dates et les questions figées
 *   POST (en-tête X-Jeton) { reponses: { q2: 'Totalement', …, q24: 5, q25: true, q26: '…' }, participant,
 *                            accord, nom, fonction, entreprise }
 *        → { merci: true, google: <lien de la fiche Google ou null> }
 *
 * Un seul lien par formation, que Gabriel ou le formateur donne aux participants (chat de la visio, QR code projeté,
 * email transféré par le client) : chacun répond une fois depuis son appareil (la page le retient), sans compte.
 * Les réponses sont vérifiées contre les questions figées ; la note sur 10 est calculée ici, jamais par la page.
 * Le lien Google est proposé à tous ceux qui répondent, quelle que soit la note (Google interdit de ne solliciter que
 * les avis positifs). Pas d'adresse IP en base.
 */
import { base, aujourdHui } from './_formateurs.js';
import { GOOGLE_AVIS_RE } from './_avis.js';
import { JETON_EVAL_RE, RefusEval, SEUIL_MITIGE, etatEvaluation, noteQuestionnaire, propre, surDix, validerReponses } from './_evaluations.js';

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

async function evaluationDuJeton(jeton) {
  if (!JETON_EVAL_RE.test(jeton || '')) return null;
  const [e] = (await base(`iae_crm_evaluations?jeton=eq.${jeton}&select=*`)) || [];
  return e || null;
}

async function recevoir(e, corps) {
  const reponses = validerReponses(e.questions, corps.reponses);
  // Toute une salle peut répondre derrière la même connexion : la limite est par formation, pas seulement par adresse.
  const deja = (await base(`iae_crm_evaluation_reponses?evaluation_id=eq.${e.id}&select=id`)) || [];
  if (deja.length >= Math.min(300, Math.max(30, (e.inscrits || 0) * 2))) throw new RefusEval('trop_de_reponses', 429);
  const note = noteQuestionnaire(e.questions, [reponses]);
  const participant = propre(corps.participant, 120) || null;
  const accord = corps.accord === true && Boolean(e.lead_id);
  const nom = propre(corps.nom, 120) || participant;
  if (accord && !nom) throw new RefusEval('nom_requis');
  if (accord && !reponses.q26) throw new RefusEval('texte_requis');
  const [ligne] = await base('iae_crm_evaluation_reponses', {
    methode: 'POST', prefer: 'return=representation',
    corps: { evaluation_id: e.id, reponses, note: note === null ? null : Math.round(note * 100) / 100, etoiles: reponses.q24 ?? null, recommande: typeof reponses.q25 === 'boolean' ? reponses.q25 : null, participant },
  });
  if (!e.lead_id) return ligne;
  const qui = participant || 'un participant';
  const lignes = [];
  if (accord) {
    // Le commentaire rejoint les avis du client : Gabriel le relit et le publie depuis la fiche (4 ou 5 étoiles).
    const [avis] = await base('iae_crm_avis', {
      methode: 'POST', prefer: 'return=representation',
      corps: { lead_id: e.lead_id, note: reponses.q24, utile: reponses.q26 || null, ameliorer: reponses.q27 || null, nom, fonction: propre(corps.fonction, 120) || null, entreprise: propre(corps.entreprise, 160) || null, accord_publication: true },
    });
    lignes.push({
      lead_id: e.lead_id, type: 'avis', source: 'évaluation à chaud',
      resume: `Évaluation à chaud « ${e.titre} » : ${nom} accepte d'être cité (${reponses.q24}/5, ${surDix(note)}/10)${reponses.q24 >= 4 ? '. Relis son commentaire et publie-le depuis le bloc Avis.' : '.'}`.slice(0, 2000),
      contenu: [reponses.q26 ? `Le plus apprécié : ${reponses.q26}` : '', reponses.q27 ? `À améliorer : ${reponses.q27}` : ''].filter(Boolean).join('\n\n') || null,
      meta: { evaluation_id: e.id, reponse_id: ligne.id, avis_id: avis.id, note: reponses.q24, accord: true },
    });
  }
  if (note !== null && note < SEUIL_MITIGE) {
    lignes.push({
      lead_id: e.lead_id, type: 'avis', source: 'évaluation à chaud',
      resume: `Évaluation à chaud mitigée « ${e.titre} » : ${surDix(note)}/10 de ${qui}${reponses.q27 ? `, à améliorer : « ${reponses.q27.replace(/\s+/g, ' ').slice(0, 300)} »` : ''}. À regarder avec ${e.formateur_nom}.`.slice(0, 2000),
      contenu: reponses.q26 || reponses.q27 ? [reponses.q26 ? `Le plus apprécié : ${reponses.q26}` : '', reponses.q27 ? `À améliorer : ${reponses.q27}` : ''].filter(Boolean).join('\n\n') : null,
      meta: { evaluation_id: e.id, reponse_id: ligne.id, note_sur_10: note },
    });
  }
  if (lignes.length) await base('iae_crm_activites', { methode: 'POST', corps: lignes, prefer: 'return=minimal' });
  return ligne;
}

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({ erreur: 'indisponible' });
  try {
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '?').split(',')[0].trim();
    if (trop(`ip:${ip}`, 300)) return res.status(429).json({ erreur: 'trop_de_demandes' });
    const e = await evaluationDuJeton(String(req.headers['x-jeton'] || ''));
    if (!e) return res.status(trop(`echec:${ip}`, 20) ? 429 : 401).json({ erreur: 'lien_invalide' });
    const etat = etatEvaluation(e, aujourdHui());
    if (etat !== 'ouverte') return res.status(410).json({ erreur: etat === 'fermee' ? 'evaluation_fermee' : 'evaluation_expiree' });
    if (req.method === 'GET') {
      const [lead] = e.lead_id ? (await base(`iae_crm_leads?id=eq.${e.lead_id}&select=entreprise`)) || [] : [];
      return res.status(200).json({ titre: e.titre, entreprise: lead ? lead.entreprise : '', formateur: e.formateur_nom, debut: e.debut, fin: e.fin, modalite: e.modalite, questions: e.questions, citable: Boolean(e.lead_id) });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ erreur: 'methode' }); }
    if (trop(`eval:${e.id}`, 200)) return res.status(429).json({ erreur: 'trop_de_demandes' });
    let corps = req.body;
    if (typeof corps === 'string') { try { corps = JSON.parse(corps); } catch { corps = {}; } }
    await recevoir(e, corps && typeof corps === 'object' ? corps : {});
    const [r] = (await base('iae_crm_reglages?cle=eq.lien_avis_google&select=valeur')) || [];
    const lien = r && typeof r.valeur === 'string' && GOOGLE_AVIS_RE.test(r.valeur) ? r.valeur : null;
    return res.status(200).json({ merci: true, google: lien });
  } catch (err) {
    if (err instanceof RefusEval || (err && err.refus)) return res.status(err.statut || 400).json({ erreur: err.code });
    console.error('evaluation', err);
    return res.status(500).json({ erreur: 'erreur_interne' });
  }
}

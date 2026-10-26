/**
 * /api/quiz — le quiz des formations en visio, à la place de Wooclap.
 *
 * Trois usages, une seule fonction (le plan Hobby de Vercel limite le nombre
 * de fonctions, et les trois partagent la même banque de questions) :
 *
 *   GET  /api/quiz?f=prudence-creole&a=1.2
 *        → l'activité SANS les bonnes réponses, pour la page /quiz/.
 *   POST /api/quiz   { f, a, groupe, prenom, email?, reponses: [index…] }
 *        → le serveur corrige, enregistre, envoie la correction par email si
 *          une adresse est donnée, et renvoie la correction à afficher.
 *   GET  /api/quiz?f=…&vue=resultats&a=1.2&groupe=A   (en-tête X-Cle-Formateur)
 *   GET  /api/quiz?f=…&vue=classement&groupe=A        (en-tête X-Cle-Formateur)
 *        → les résultats en direct et le classement du championnat, pour
 *          /quiz/resultats.html, que le formateur partage dans le Meet.
 *
 * Même discipline que /api/recap : rien de ce qui vient du navigateur ne
 * part tel quel dans un email. La participante envoie des index de réponses ;
 * les questions, les corrections et les explications sont reconstruites ici
 * depuis api/_quiz-prudence.js. Le seul texte libre, le prénom, est réduit à
 * des lettres. Sans cela, n'importe qui pourrait se servir du domaine pour
 * écrire ce qu'il veut à l'adresse de son choix.
 *
 * Aucune inscription à une liste Brevo : ce sont des stagiaires, pas des
 * prospects. L'email ne contient que leur correction.
 *
 * Variables d'environnement :
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  stockage des réponses (table
 *       quiz_reponses, RLS activée sans aucune policy : seule la clé de
 *       service, qui ne quitte jamais le serveur, lit et écrit). Sans elles,
 *       la correction s'affiche quand même, mais rien n'est enregistré.
 *   QUIZ_CLE_FORMATEUR  le mot de passe de la page des résultats. Sans lui,
 *       les vues formateur répondent 503.
 *   BREVO_API_KEY  l'envoi de la correction. Sans elle, la page n'affiche pas
 *       le champ email : on ne promet pas un envoi qu'on ne peut pas faire.
 *   QUIZ_EXPEDITEUR, QUIZ_EXPEDITEUR_NOM  facultatives, sinon celles de
 *       /api/recap. L'adresse doit être un expéditeur vérifié dans Brevo.
 */

import { timingSafeEqual } from 'node:crypto';
import { FORMATIONS } from './_quiz-prudence.js';

export const maxDuration = 15;

const HOTES_AUTORISES = ['ia-entrepreneur.fr', 'www.ia-entrepreneur.fr'];
const EMAIL_MAX = 254;
const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;
// Lettres (accents compris), espace, tiret, apostrophe. Rien qui puisse
// porter un lien ou une phrase dans l'email.
const PRENOM_RE = /^[\p{L}][\p{L} '’-]{0,29}$/u;

const EXPEDITEUR = process.env.QUIZ_EXPEDITEUR || process.env.BREVO_EXPEDITEUR || 'contact@ia-entrepreneur.fr';
const EXPEDITEUR_NOM = process.env.QUIZ_EXPEDITEUR_NOM || process.env.BREVO_EXPEDITEUR_NOM || 'IA-Entrepreneur';
const SITE = 'https://ia-entrepreneur.fr';

// Limites par adresse IP. Plus larges que /api/recap : les participantes d'une
// même agence sortent souvent par la même adresse, et une séance compte
// jusqu'à 4 activités. Les emails, eux, restent comptés serré.
const FENETRE_MS = 10 * 60 * 1000;
const MAX_ENVOIS = 60;
const MAX_EMAILS = 20;
const passages = new Map();
const emails = new Map();
// Une adresse ne reçoit qu'une correction par activité et par instance :
// renvoyer dix fois le formulaire ne doit pas envoyer dix emails.
const dejaEnvoyes = new Set();

function limite(registre, empreinte, max) {
  const maintenant = Date.now();
  const recentes = (registre.get(empreinte) || []).filter((t) => maintenant - t < FENETRE_MS);
  if (registre.size > 5000) registre.clear();
  if (recentes.length >= max) {
    registre.set(empreinte, recentes);
    return true;
  }
  recentes.push(maintenant);
  registre.set(empreinte, recentes);
  return false;
}

function origineEtrangere(req) {
  const origine = req.headers.origin;
  if (!origine) return false;
  try {
    const hote = new URL(origine).hostname;
    return !(HOTES_AUTORISES.includes(hote) || hote.endsWith('.vercel.app') || hote === 'localhost');
  } catch {
    return true;
  }
}

function cleFormateurValide(req) {
  const attendue = process.env.QUIZ_CLE_FORMATEUR || '';
  const donnee = String(req.headers['x-cle-formateur'] || '');
  if (!attendue || !donnee) return false;
  const a = Buffer.from(attendue);
  const b = Buffer.from(donnee);
  return a.length === b.length && timingSafeEqual(a, b);
}

function echapper(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Le prénom sert d'identifiant au championnat : « Marie », « marie » et
// « Marie » suivi d'une espace sont la même personne.
function cleParticipante(prenom) {
  return prenom.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ');
}

/* ---------- Supabase (clé de service, côté serveur uniquement) ---------- */

function supabase() {
  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cle) return null;
  return {
    url: `${url}/rest/v1/quiz_reponses`,
    entetes: { apikey: cle, Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
  };
}

async function enregistrer(ligne) {
  const sb = supabase();
  if (!sb) return false;
  try {
    const r = await fetch(sb.url, {
      method: 'POST',
      headers: { ...sb.entetes, Prefer: 'return=minimal' },
      body: JSON.stringify(ligne),
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function lire(filtres) {
  const sb = supabase();
  if (!sb) return null;
  const params = new URLSearchParams({
    select: 'created_at,activite,groupe,prenom,participante,reponses,score,total',
    order: 'created_at.asc',
    limit: '5000',
  });
  for (const [k, v] of Object.entries(filtres)) params.append(k, v);
  try {
    const r = await fetch(`${sb.url}?${params}`, { headers: sb.entetes });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

/* ---------- Email de correction ---------- */

function composerEmail(prenom, formation, id, act, details, score) {
  const lignes = details.map((d, i) => {
    const q = act.questions[i];
    const reponseDonnee = d.choisie === null ? 'pas de réponse' : q.o[d.choisie];
    const verdict = act.sondage
      ? `<div style="font:400 13px/1.6 Helvetica,Arial,sans-serif;color:#525880;">Votre réponse : ${echapper(reponseDonnee)}</div>`
      : d.juste
        ? `<div style="font:700 13px/1.6 Helvetica,Arial,sans-serif;color:#0E7A57;">Juste : ${echapper(reponseDonnee)}</div>`
        : `<div style="font:400 13px/1.6 Helvetica,Arial,sans-serif;color:#B42318;">Votre réponse : ${echapper(reponseDonnee)}</div>
           <div style="font:700 13px/1.6 Helvetica,Arial,sans-serif;color:#0E7A57;">Bonne réponse : ${echapper(q.o[q.a])}</div>`;
    return `
      <tr><td style="padding:0 0 18px;">
        <div style="font:700 15px/1.45 Helvetica,Arial,sans-serif;color:#0A0F2C;padding-bottom:6px;">${i + 1}. ${echapper(q.q)}</div>
        ${verdict}
        <div style="font:400 13px/1.6 Helvetica,Arial,sans-serif;color:#525880;padding-top:4px;">${echapper(q.e)}</div>
      </td></tr>`;
  }).join('');

  const total = act.questions.length;
  const titreScore = act.sondage ? 'Merci pour votre réponse' : `Votre score : ${score} sur ${total}`;

  return `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#F6F7FB;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7FB;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;padding:32px 28px;">
        <tr><td style="font:700 12px/1.4 Helvetica,Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;color:#0E7A57;padding-bottom:8px;">
          ${echapper(formation.titre)} · Activité ${echapper(id)}
        </td></tr>
        <tr><td style="font:800 21px/1.3 Helvetica,Arial,sans-serif;color:#0A0F2C;padding-bottom:6px;">${echapper(act.titre)}</td></tr>
        <tr><td style="font:400 14px/1.65 Helvetica,Arial,sans-serif;color:#525880;padding-bottom:22px;">
          Bonjour ${echapper(prenom)}, voici votre correction. ${echapper(titreScore)}.
        </td></tr>
        ${lignes}
        <tr><td style="padding:22px 0 0;border-top:1px solid #E7E9F2;font:400 12px/1.6 Helvetica,Arial,sans-serif;color:#8A90AB;">
          Vous recevez cet email parce que vous avez répondu au quiz de votre formation et demandé la correction.
          Vos réponses ne sont visibles que par votre formateur.<br><br>
          IA-Entrepreneur — marque de Clindit SASU · Organisme de formation certifié Qualiopi<br>
          <a href="${SITE}/politique-confidentialite.html" style="color:#8A90AB;">Politique de confidentialité</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function composerTexte(prenom, formation, id, act, details, score) {
  const lignes = details.flatMap((d, i) => {
    const q = act.questions[i];
    const donnee = d.choisie === null ? 'pas de réponse' : q.o[d.choisie];
    return [
      `${i + 1}. ${q.q}`,
      `   Votre réponse : ${donnee}`,
      ...(act.sondage || d.juste ? [] : [`   Bonne réponse : ${q.o[q.a]}`]),
      `   ${q.e}`,
      '',
    ];
  });
  return [
    `${formation.titre} · Activité ${id} · ${act.titre}`,
    '',
    `Bonjour ${prenom}, voici votre correction.` + (act.sondage ? '' : ` Votre score : ${score} sur ${act.questions.length}.`),
    '',
    ...lignes,
    'IA-Entrepreneur — marque de Clindit SASU · Organisme de formation certifié Qualiopi',
  ].join('\n');
}

async function envoyerCorrection(email, prenom, formation, id, act, details, score) {
  const cle = process.env.BREVO_API_KEY;
  if (!cle) return false;
  const abandon = new AbortController();
  const minuteur = setTimeout(() => abandon.abort(), 10000);
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': cle, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: EXPEDITEUR, name: EXPEDITEUR_NOM },
        to: [{ email, name: prenom }],
        replyTo: { email: EXPEDITEUR, name: EXPEDITEUR_NOM },
        subject: act.sondage
          ? `Votre réponse · ${act.titre}`
          : `Votre correction · ${act.titre} : ${score}/${act.questions.length}`,
        htmlContent: composerEmail(prenom, formation, id, act, details, score),
        textContent: composerTexte(prenom, formation, id, act, details, score),
        tags: ['quiz-formation'],
      }),
      signal: abandon.signal,
    });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(minuteur);
  }
}

/* ---------- Vues ---------- */

function activitePublique(f, id, act) {
  return {
    formation: f,
    titreFormation: FORMATIONS[f].titre,
    groupes: FORMATIONS[f].groupes,
    id,
    titre: act.titre,
    seance: act.seance,
    intro: act.intro,
    sondage: act.sondage,
    questions: act.questions.map((q) => ({ q: q.q, o: q.o })),
    email: Boolean(process.env.BREVO_API_KEY),
  };
}

// Une participante qui renvoie le formulaire ne compte qu'une fois : sa
// première réponse, celle donnée sans connaître la correction.
function premieresReponses(lignes) {
  const vues = new Set();
  return lignes.filter((l) => {
    const k = `${l.activite}|${l.groupe}|${l.participante}`;
    if (vues.has(k)) return false;
    vues.add(k);
    return true;
  });
}

function vueResultats(formation, id, lignes) {
  const act = formation.activites[id];
  const uniques = premieresReponses(lignes);
  const comptes = act.questions.map((q) => q.o.map(() => 0));
  for (const l of uniques) {
    (l.reponses || []).forEach((r, i) => {
      if (Number.isInteger(r) && comptes[i] && r >= 0 && r < comptes[i].length) comptes[i][r] += 1;
    });
  }
  return {
    id,
    titre: act.titre,
    sondage: act.sondage,
    questions: act.questions.map((q, i) => ({ q: q.q, o: q.o, a: q.a, e: q.e, comptes: comptes[i] })),
    participantes: uniques
      .map((l) => ({ prenom: l.prenom, score: l.score, total: l.total, date: l.created_at }))
      .sort((x, y) => y.score - x.score || x.date.localeCompare(y.date)),
  };
}

function vueClassement(formation, lignes) {
  const parPersonne = new Map();
  for (const l of premieresReponses(lignes)) {
    const act = formation.activites[l.activite];
    if (!act) continue;
    const p = parPersonne.get(l.participante) || { prenom: l.prenom, points: 0, activites: 0 };
    if (!act.sondage) p.points += l.score;
    p.activites += 1;
    p.prenom = l.prenom;
    parPersonne.set(l.participante, p);
  }
  return [...parPersonne.values()].sort((a, b) => b.points - a.points || a.prenom.localeCompare(b.prenom, 'fr'));
}

/* ---------- Handler ---------- */

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const f = String((req.method === 'POST' ? req.body?.f : req.query.f) || 'prudence-creole');
  const formation = FORMATIONS[f];
  if (!formation) return res.status(404).json({ erreur: 'formation_inconnue' });

  if (req.method === 'GET') {
    const vue = String(req.query.vue || 'activite');

    if (vue === 'activite') {
      const id = String(req.query.a || '');
      const act = formation.activites[id];
      if (!act) return res.status(404).json({ erreur: 'activite_inconnue' });
      return res.status(200).json(activitePublique(f, id, act));
    }

    // Vues formateur
    if (!process.env.QUIZ_CLE_FORMATEUR) return res.status(503).json({ erreur: 'resultats_non_configures' });
    if (!cleFormateurValide(req)) return res.status(401).json({ erreur: 'cle_invalide' });

    if (vue === 'activites') {
      return res.status(200).json({
        titre: formation.titre,
        groupes: formation.groupes,
        activites: Object.entries(formation.activites).map(([id, a]) => ({ id, titre: a.titre, seance: a.seance, sondage: a.sondage })),
      });
    }

    if (!supabase()) return res.status(503).json({ erreur: 'stockage_non_configure' });
    const groupe = formation.groupes[req.query.groupe] ? String(req.query.groupe) : null;
    const filtres = { formation: `eq.${f}` };
    if (groupe) filtres.groupe = `eq.${groupe}`;

    if (vue === 'resultats') {
      const id = String(req.query.a || '');
      if (!formation.activites[id]) return res.status(404).json({ erreur: 'activite_inconnue' });
      const lignes = await lire({ ...filtres, activite: `eq.${id}` });
      if (!lignes) return res.status(502).json({ erreur: 'lecture_impossible' });
      return res.status(200).json(vueResultats(formation, id, lignes));
    }

    if (vue === 'classement') {
      const lignes = await lire(filtres);
      if (!lignes) return res.status(502).json({ erreur: 'lecture_impossible' });
      return res.status(200).json({ classement: vueClassement(formation, lignes) });
    }

    return res.status(400).json({ erreur: 'vue_inconnue' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ erreur: 'methode_non_autorisee' });
  }
  if (origineEtrangere(req)) return res.status(403).json({ erreur: 'origine_refusee' });

  const corps = req.body || {};
  if (typeof corps.piege === 'string' && corps.piege.trim()) return res.status(200).json({ ok: true });

  const id = String(corps.a || '');
  const act = formation.activites[id];
  if (!act) return res.status(404).json({ erreur: 'activite_inconnue' });

  const groupe = formation.groupes[corps.groupe] ? String(corps.groupe) : null;
  if (!groupe) return res.status(400).json({ erreur: 'groupe_invalide' });

  const prenom = String(corps.prenom || '').trim().replace(/\s+/g, ' ');
  if (!PRENOM_RE.test(prenom)) return res.status(400).json({ erreur: 'prenom_invalide' });

  const email = String(corps.email || '').trim().toLowerCase();
  if (email && (email.length < 6 || email.length > EMAIL_MAX || !EMAIL_RE.test(email))) {
    return res.status(400).json({ erreur: 'email_invalide' });
  }

  const brutes = Array.isArray(corps.reponses) ? corps.reponses : [];
  const reponses = act.questions.map((q, i) => {
    const r = brutes[i];
    return Number.isInteger(r) && r >= 0 && r < q.o.length ? r : null;
  });

  const empreinte = (req.headers['x-forwarded-for'] || 'inconnu').split(',')[0].trim();
  if (limite(passages, empreinte, MAX_ENVOIS)) return res.status(429).json({ erreur: 'trop_de_demandes' });

  const details = act.questions.map((q, i) => ({
    choisie: reponses[i],
    bonne: q.a,
    juste: q.a !== null && reponses[i] === q.a,
    e: q.e,
  }));
  const score = details.filter((d) => d.juste).length;
  const total = act.sondage ? 0 : act.questions.length;

  const enregistre = await enregistrer({
    formation: f,
    activite: id,
    groupe,
    prenom,
    participante: cleParticipante(prenom),
    email: email || null,
    reponses,
    score,
    total,
  });

  let emailEnvoye = false;
  const cleEnvoi = `${f}|${id}|${email}`;
  if (email && !dejaEnvoyes.has(cleEnvoi) && !limite(emails, empreinte, MAX_EMAILS)) {
    emailEnvoye = await envoyerCorrection(email, prenom, formation, id, act, details, score);
    if (emailEnvoye) {
      if (dejaEnvoyes.size > 5000) dejaEnvoyes.clear();
      dejaEnvoyes.add(cleEnvoi);
    }
  }

  return res.status(200).json({
    id,
    titre: act.titre,
    sondage: act.sondage,
    score,
    total,
    details,
    enregistre,
    emailEnvoye,
  });
}

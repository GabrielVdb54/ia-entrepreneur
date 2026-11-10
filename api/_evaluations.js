/**
 * Les évaluations à chaud (Gabriel, 10/11/2026 : « envoyer le lien aux apprenants pour qu'ils laissent un avis, et que
 * je puisse piloter le niveau de satisfaction d'une formation ainsi que du formateur qui l'effectue »).
 *
 * Partagé par /api/crm (le CRM) et /api/evaluation (la page publique). Le questionnaire est celui d'Ella
 * (~/Desktop/studio/adminella, migrations 20261016124442 et 20261102100400 : « Évaluation de fin de formation »,
 * reformulé d'après les modèles de Cathy, avec ses retours du 02/11), aux couleurs IA-Entrepreneur :
 *   - la question d'organisation suit la modalité (salle, visio, ou les deux) ;
 *   - la composition du groupe n'est pas demandée quand il n'y a qu'un participant ;
 *   - le bloc « Où en êtes-vous maintenant sur chaque objectif (0 à 10) » d'Ella n'est pas repris : il sert à mesurer
 *     la progression par rapport au positionnement, que le CRM ne fait pas passer. Reste, pour chaque objectif, « la
 *     formation vous a-t-elle permis de l'atteindre ? » (retour de Cathy).
 * Les questions sont figées à la création de l'évaluation : un changement du modèle ne touche pas les réponses reçues.
 *
 * La note sur 10 est celle d'Ella (lib/evaluations/notes.ts, règle de Gabriel du 16/10) : chaque réponse notée devient
 * une note proportionnelle à sa place sur l'échelle, la plus basse valant 0 (« Pas du tout, Insuffisamment, En partie,
 * Totalement » = 0 ; 3,3 ; 6,7 ; 10 ; 1 à 5 étoiles = 0 à 10) ; une rubrique vaut la moyenne de ses questions
 * notées, le questionnaire la moyenne de ses rubriques. Les objectifs, les choix, le oui/non et les textes ne
 * comptent pas dans la satisfaction.
 */
import { randomBytes } from 'node:crypto';

export const NIVEAUX = ['Pas du tout', 'Insuffisamment', 'En partie', 'Totalement'];
const APPORT = ['Non', 'Un peu', 'Beaucoup'];
export const MODALITES = ['presentiel', 'distanciel', 'mixte'];
export const JETON_EVAL_RE = /^[A-Za-z0-9_-]{32}$/;
export const nouveauJetonEval = () => randomBytes(24).toString('base64url');
// Une évaluation à chaud se remplit à la fin de la formation : le lien ne répond plus 60 jours après la fin.
export const JOURS_APRES_FIN = 60;
// Seuil sous lequel une réponse est signalée (historique du client, onglet Satisfaction).
export const SEUIL_MITIGE = 6;

export class RefusEval extends Error {
  constructor(code, statut = 400) { super(code); this.code = code; this.statut = statut; this.refus = true; }
}
export const propre = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').replace(/\r\n?/g, '\n').trim().slice(0, max);

const ORGANISATION = {
  presentiel: "L'accueil, la salle et le matériel vous ont-ils convenu ?",
  distanciel: "L'accueil, la visio (connexion, son, partage d'écran) et les outils utilisés vous ont-ils convenu ?",
  mixte: "L'accueil, la salle ou la visio, et le matériel vous ont-ils convenu ?",
};

// Le questionnaire figé d'une évaluation : celui d'Ella, objectifs dépliés (une question par objectif, obligatoire).
export function questionnaire({ modalite = 'distanciel', objectifs = [], inscrits = null } = {}) {
  const n = (id, intitule, obligatoire = true) => ({ id, type: 'niveaux', intitule, niveaux: NIVEAUX, obligatoire });
  const q = [
    { id: 'q1', type: 'rubrique', intitule: 'Avant la formation' },
    n('q2', "Saviez-vous, en arrivant, ce que la formation allait couvrir et ce qu'elle visait ?"),
    n('q3', 'Si vous êtes salarié : en aviez-vous parlé avec votre responsable ?', false),
    { id: 'q4', type: 'rubrique', intitule: 'Organisation' },
    n('q5', ORGANISATION[modalite] || ORGANISATION.distanciel),
    n('q6', 'La durée de la formation était-elle adaptée ?'),
    { id: 'q7', type: 'rubrique', intitule: 'Animation' },
    n('q8', "Le formateur s'est-il exprimé clairement, avec dynamisme ?"),
    n('q9', 'Les exercices et les mises en pratique vous ont-ils été utiles ?'),
    n('q10', 'Le formateur a-t-il tenu compte de vos besoins et de votre niveau ?'),
    ...(inscrits === 1 ? [] : [n('q11', 'La composition du groupe convenait-elle (taille, niveaux) ?')]),
    { id: 'q12', type: 'choix', intitule: 'Le rythme de la formation était :', choix: ['Adapté', 'Trop rapide', 'Trop lent'], obligatoire: true },
    { id: 'q13', type: 'rubrique', intitule: 'Contenu' },
    n('q14', 'Le programme était-il clair ?'),
    n('q15', 'Correspondait-il à vos besoins ?'),
    n('q16', 'Les supports remis sont-ils clairs et utiles ?'),
    { id: 'q17', type: 'rubrique', intitule: 'Ce que la formation vous apporte' },
    { id: 'q18', type: 'niveaux', intitule: 'Cette formation a-t-elle renforcé vos compétences ?', niveaux: APPORT, obligatoire: true },
    { id: 'q19', type: 'niveaux', intitule: 'Pourrez-vous appliquer ce que vous avez appris dans votre travail ?', niveaux: APPORT, obligatoire: true },
  ];
  const objs = objectifs.map((o) => propre(o, 300)).filter(Boolean).slice(0, 12);
  if (objs.length) {
    q.push({ id: 'q20', type: 'rubrique', intitule: 'Les objectifs de la formation', aide: 'La formation vous a-t-elle permis d\'atteindre chacun de ces objectifs ?' });
    objs.forEach((o, i) => q.push({ id: `o${i + 1}`, type: 'niveaux', intitule: o, niveaux: NIVEAUX, obligatoire: true, objectif: true }));
  }
  q.push(
    { id: 'q23', type: 'rubrique', intitule: 'Appréciation générale' },
    { id: 'q24', type: 'echelle', intitule: 'Quelle note donnez-vous à la formation ?', min: 1, max: 5, etoiles: true, obligatoire: true },
    { id: 'q25', type: 'oui_non', intitule: 'Recommanderiez-vous cette formation à un collègue ?', obligatoire: true },
    { id: 'q26', type: 'texte', intitule: 'Ce que vous avez le plus apprécié', obligatoire: false },
    { id: 'q27', type: 'texte', intitule: 'Ce qui pourrait être amélioré', obligatoire: false },
  );
  return q;
}

/* ---------- Notes sur 10 (port de lib/evaluations/notes.ts d'Ella) ---------- */

export const estNotee = (q) => q.type === 'echelle' || q.type === 'niveaux';
export function noteSur10(q, v) {
  if (q.type === 'echelle' && typeof v === 'number') {
    const min = q.min ?? 1, max = q.max ?? 5;
    return max > min ? ((v - min) / (max - min)) * 10 : null;
  }
  if (q.type === 'niveaux' && typeof v === 'string') {
    const i = (q.niveaux || []).indexOf(v);
    return i < 0 || q.niveaux.length < 2 ? null : (i / (q.niveaux.length - 1)) * 10;
  }
  return null;
}
const moyenne = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
// Les rubriques et leurs notes, sur une ou plusieurs réponses. Une question appartient à la dernière rubrique qui la
// précède ; les objectifs ne comptent pas.
export function notesRubriques(questions, reponses) {
  const rubriques = [{ titre: null, questions: [] }];
  for (const q of questions) {
    if (q.type === 'rubrique') { rubriques.push({ titre: q.intitule, questions: [] }); continue; }
    if (q.objectif || !estNotee(q)) continue;
    const notes = reponses.map((r) => noteSur10(q, r[q.id])).filter((x) => x !== null);
    rubriques.at(-1).questions.push({ id: q.id, note: moyenne(notes), n: notes.length });
  }
  return rubriques.filter((r) => r.questions.length).map((r) => ({ ...r, note: moyenne(r.questions.map((x) => x.note).filter((x) => x !== null)) }))
    .filter((r) => r.note !== null);
}
export const noteQuestionnaire = (questions, reponses) => moyenne(notesRubriques(questions, reponses).map((r) => r.note));

/* ---------- Réception d'une réponse ---------- */

// Vérifie chaque réponse contre les questions figées : une valeur hors liste ou une question inconnue est refusée,
// une question obligatoire sans réponse aussi (code `manque:<id>`, pour que la page montre la bonne question).
export function validerReponses(questions, brutes) {
  const r = brutes && typeof brutes === 'object' && !Array.isArray(brutes) ? brutes : {};
  const propres = {};
  for (const q of questions) {
    if (q.type === 'rubrique') continue;
    const v = r[q.id];
    let ok = null;
    if (q.type === 'niveaux' && typeof v === 'string' && q.niveaux.includes(v)) ok = v;
    else if (q.type === 'choix' && typeof v === 'string' && q.choix.includes(v)) ok = v;
    else if (q.type === 'echelle' && Number.isInteger(v) && v >= (q.min ?? 1) && v <= (q.max ?? 5)) ok = v;
    else if (q.type === 'oui_non' && typeof v === 'boolean') ok = v;
    else if (q.type === 'texte' && typeof v === 'string' && propre(v, 2000)) ok = propre(v, 2000);
    if (ok === null && v !== undefined && v !== null && v !== '' && q.type !== 'texte') throw new RefusEval(`valeur_invalide:${q.id}`);
    if (ok === null && q.obligatoire) throw new RefusEval(`manque:${q.id}`);
    if (ok !== null) propres[q.id] = ok;
  }
  return propres;
}

export function etatEvaluation(e, jour) {
  if (!e.ouverte) return 'fermee';
  if (e.fin) {
    const [y, m, d] = e.fin.split('-').map(Number);
    const limite = new Date(Date.UTC(y, m - 1, d + JOURS_APRES_FIN)).toISOString().slice(0, 10);
    if (jour > limite) return 'expiree';
  }
  return 'ouverte';
}

const surDix = (n) => (n === null || n === undefined ? '' : (Math.round(n * 10) / 10).toFixed(1).replace('.', ','));
export { surDix };

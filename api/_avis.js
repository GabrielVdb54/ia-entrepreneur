/**
 * Les avis après une formation (Gabriel, 09/11/2026 : « envoyer un email post formation, d'avis (facultatif),
 * si avis positif on le met sur le site, et on propose nos services par la suite »).
 *
 * Partagé par /api/crm (le CRM) et /api/avis (la page publique). Une demande = un lien par formation, que le
 * contact peut transférer aux participants ; la base ne garde que l'empreinte du jeton (90 jours). Un avis n'est
 * publié sur le site que si la personne l'accepte et que Gabriel clique « Publier » (4 ou 5 sur 5 seulement).
 * Google interdit de ne solliciter que les avis positifs : le lien Google est proposé à tous ceux qui répondent.
 */
import { base, empreinte, nouveauJeton, aujourdHui } from './_formateurs.js';

export const DUREE_LIEN_AVIS_JOURS = 90;
export const GOOGLE_AVIS_RE = /^https:\/\/(g\.page|maps\.app\.goo\.gl|(www\.)?google\.[a-z.]{2,6}|search\.google\.com)\/[^\s"'<>]*$/;

export class RefusAvis extends Error {
  constructor(code, statut = 400) { super(code); this.code = code; this.statut = statut; this.refus = true; }
}

const propre = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').replace(/\r\n?/g, '\n').trim().slice(0, max);

function ajouterJoursIso(s, n) { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); }
function paques(an) {
  const a = an % 19, b = Math.floor(an / 100), c = an % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
  return `${an}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
}
export function ouvre(s) {
  const an = Number(s.slice(0, 4)), p = paques(an);
  const feries = [`${an}-01-01`, ajouterJoursIso(p, 1), `${an}-05-01`, `${an}-05-08`, ajouterJoursIso(p, 39), ajouterJoursIso(p, 50), `${an}-07-14`, `${an}-08-15`, `${an}-11-01`, `${an}-11-11`, `${an}-12-25`];
  const j = new Date(`${s}T12:00:00Z`).getUTCDay();
  return j !== 0 && j !== 6 && !feries.includes(s);
}
export function jourOuvreApres(n, depuis = aujourdHui()) { let d = ajouterJoursIso(depuis, n); while (!ouvre(d)) d = ajouterJoursIso(d, 1); return d; }
const dateCourte = (iso) => iso.split('-').reverse().join('/');

// Une nouvelle demande d'avis pour un lead : le jeton en clair ne sort qu'ici, pour l'email.
export async function creerDemande(leadId) {
  const jeton = nouveauJeton();
  const expire = new Date(Date.now() + DUREE_LIEN_AVIS_JOURS * 86400000).toISOString();
  const [d] = await base('iae_crm_avis_demandes', { methode: 'POST', corps: { lead_id: leadId, jeton_hash: empreinte(jeton), expire_le: expire }, prefer: 'return=representation' });
  return { jeton, demande: { id: d.id, lead_id: d.lead_id, created_at: d.created_at, expire_le: d.expire_le } };
}

export async function demandeDuJeton(jeton) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(jeton || '')) return null;
  const [d] = (await base(`iae_crm_avis_demandes?jeton_hash=eq.${empreinte(jeton)}&select=*`)) || [];
  if (!d) return null;
  if (new Date(d.expire_le) < new Date()) return { expire: true };
  return d;
}

// Un avis arrive : il entre dans l'historique, et la tâche suivante est prête (publier puis proposer la suite,
// ou appeler si l'avis est mitigé). Un avis mitigé n'est jamais écrasé par un avis positif arrivé après.
export async function recevoirAvis(demande, corps) {
  const note = Number(corps.note);
  if (!Number.isInteger(note) || note < 1 || note > 5) throw new RefusAvis('note_invalide');
  const accord = corps.accord === true;
  const avis = {
    lead_id: demande.lead_id, demande_id: demande.id, note,
    utile: propre(corps.utile, 2000) || null, ameliorer: propre(corps.ameliorer, 2000) || null,
    nom: propre(corps.nom, 120) || null, fonction: propre(corps.fonction, 120) || null, entreprise: propre(corps.entreprise, 160) || null,
    accord_publication: accord,
  };
  if (accord && !avis.nom) throw new RefusAvis('nom_requis');
  if (!avis.utile && !avis.ameliorer && note >= 4 && accord) throw new RefusAvis('texte_requis');
  const [ligne] = await base('iae_crm_avis', { methode: 'POST', corps: avis, prefer: 'return=representation' });
  const [lead] = (await base(`iae_crm_leads?id=eq.${demande.lead_id}&select=id,prochaine_note`)) || [];
  const qui = [avis.nom, avis.fonction].filter(Boolean).join(', ') || 'un participant';
  const extrait = (avis.utile || avis.ameliorer || '').replace(/\s+/g, ' ').slice(0, 220);
  await base('iae_crm_activites', {
    methode: 'POST', prefer: 'return=minimal',
    corps: {
      lead_id: demande.lead_id, type: 'avis', source: 'page avis',
      resume: `Avis ${note}/5 de ${qui}${extrait ? ` : « ${extrait} »` : ''}${accord ? ' (accepte d\'être cité)' : ''}`.slice(0, 2000),
      contenu: [avis.utile ? `Le plus utile : ${avis.utile}` : '', avis.ameliorer ? `À améliorer : ${avis.ameliorer}` : ''].filter(Boolean).join('\n\n') || null,
      meta: { avis_id: ligne.id, note, accord },
    },
  });
  const jour = aujourdHui();
  const mitigeEnCours = /^Avis : appeler/.test(lead?.prochaine_note || '');
  let maj = null;
  if (note <= 3) {
    maj = { prochaine_relance: jour, prochaine_action: 'appel', prochaine_note: `Avis : appeler ${qui} (${note}/5)${avis.ameliorer ? `, à améliorer : « ${avis.ameliorer.replace(/\s+/g, ' ').slice(0, 300)} »` : ''}. Comprendre ce qui a manqué avant de proposer quoi que ce soit.` };
  } else if (!mitigeEnCours) {
    maj = accord
      ? { prochaine_relance: jour, prochaine_action: 'autre', prochaine_note: `Avis ${note}/5 de ${qui} : relis-le et publie-le sur le site (fiche, bloc Avis). Ensuite, propose la suite.` }
      : { prochaine_relance: jourOuvreApres(7), prochaine_action: 'email', prochaine_note: `Proposer la suite (avis ${note}/5 de ${qui} le ${dateCourte(jour)}) : le niveau suivant, en partant de ce qui lui a été utile.` };
  }
  if (maj) await base(`iae_crm_leads?id=eq.${demande.lead_id}`, { methode: 'PATCH', corps: maj, prefer: 'return=minimal' });
  return ligne;
}

// Les avis publiés, pour le site : rien d'autre que ce que la personne a accepté de montrer.
export async function avisPublies() {
  const lignes = (await base('iae_crm_avis?statut=eq.publie&accord_publication=is.true&order=publie_le.desc&limit=30&select=note,texte_publie,utile,nom,fonction,entreprise,created_at')) || [];
  return lignes.map((a) => ({ note: a.note, texte: a.texte_publie || a.utile || '', nom: a.nom || '', fonction: a.fonction || '', entreprise: a.entreprise || '', date: String(a.created_at).slice(0, 10) })).filter((a) => a.texte && a.nom);
}

export { creerDemande as nouvelleDemandeAvis };
export const nouveauJetonAvis = nouveauJeton;

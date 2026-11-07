/**
 * Formateurs du CRM de Gabriel : le dossier, les pièces, leur lecture par
 * Claude et la vérification du SIRET. Partagé par /api/crm (Gabriel, clé du
 * CRM) et /api/formateur (le formateur, avec son lien personnel).
 *
 * Choix de Gabriel (06/11/2026) : dossier complet, envoyé par un lien personnel,
 * contrat-cadre signé dans ce lien. Un formateur n'est « validé » qu'une fois le
 * contrat signé et toutes les pièces reçues et vérifiées ; seul un formateur
 * validé peut être positionné sur une mission.
 *
 * Les pièces (pièce d'identité, RIB…) vont dans le bucket privé
 * « iae-crm-formateurs », lu et écrit seulement ici, avec la clé de service.
 * Rien n'est jamais public : la page du CRM récupère un fichier par /api/crm,
 * avec la clé.
 */

import { createHash, randomBytes } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';

export const BUCKET = 'iae-crm-formateurs';
const MODELE = 'claude-opus-5-5';
const OCTETS_MAX = 3.4 * 1024 * 1024; // une requête Vercel plafonne à 4,5 Mo, base64 compris
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Les pièces de l'article 6 et de l'article 13 du contrat-cadre (modèle du 28/10/2026).
export const PIECES = [
  { type: 'kbis', titre: "Justificatif d'immatriculation", aide: "Extrait Kbis, avis de situation SIRENE ou extrait du registre national des entreprises, de moins de 3 mois." },
  { type: 'identite', titre: "Pièce d'identité", aide: "Carte d'identité (recto et verso) ou passeport, en cours de validité." },
  { type: 'rib', titre: 'RIB', aide: 'À ton nom ou à celui de ta structure.' },
  { type: 'tva', titre: 'Régime de TVA', aide: "Justificatif de ton régime : exonération (NDA), franchise en base (art. 293 B du CGI) ou numéro de TVA." },
  { type: 'rc_pro', titre: 'Assurance RC Pro', aide: "Attestation de responsabilité civile professionnelle en cours de validité, qui couvre ton activité de formation." },
  { type: 'urssaf', titre: 'Attestation de vigilance URSSAF', aide: "De moins de 6 mois, à télécharger sur ton espace urssaf.fr ou autoentrepreneur.urssaf.fr. Elle est redemandée tous les 6 mois." },
  { type: 'cv', titre: 'CV à jour', aide: 'Ton parcours, tes missions de formateur, ton expérience en IA.' },
  { type: 'competences', titre: 'Justificatifs de compétences', aide: 'Diplômes, certifications ou références de missions qui montrent ta légitimité sur les sujets confiés.' },
  { type: 'formation_continue', titre: 'Formation continue', aide: 'Une attestation ou une certification de moins de 12 mois. Elle est redemandée chaque année.' },
  { type: 'nda', titre: "Déclaration d'activité (NDA)", aide: "Seulement si tu as un numéro de déclaration d'activité d'organisme de formation.", facultatif: true },
];
export const TYPES_PIECES = PIECES.map((p) => p.type);
// Durée de validité comptée depuis la date de la pièce, quand elle n'a pas de date de fin.
const VALIDITE_MOIS = { kbis: 3, urssaf: 6, formation_continue: 12, rc_pro: 12 };

export class RefusFormateur extends Error {
  constructor(code, statut = 400) {
    super(code);
    this.code = code;
    this.statut = statut;
    this.refus = true;
  }
}
const refus = (code, statut) => new RefusFormateur(code, statut);

export const aujourdHui = () => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
function ajouterMois(iso, n) {
  const [a, m, j] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, j));
  return d.toISOString().slice(0, 10);
}
const ajouterJours = (iso, n) => { const [a, m, j] = iso.split('-').map(Number); return new Date(Date.UTC(a, m - 1, j + n)).toISOString().slice(0, 10); };

/* ---------- Le lien personnel ---------- */

export const nouveauJeton = () => randomBytes(32).toString('base64url');
export const empreinte = (texte) => createHash('sha256').update(String(texte)).digest('hex');

/* ---------- Supabase (clé de service) ---------- */

function entetes() {
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: cle, Authorization: `Bearer ${cle}` };
}
export async function base(chemin, { methode = 'GET', corps, prefer } = {}) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${chemin}`, {
    method: methode,
    headers: { ...entetes(), 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  if (!r.ok) {
    console.error('formateurs supabase', methode, chemin.split('?')[0], r.status, (await r.text()).slice(0, 300));
    throw refus('base_indisponible', 502);
  }
  if (r.status === 204) return null;
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
async function deposerFichier(chemin, octets, mime) {
  const r = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${chemin}`, {
    method: 'POST',
    headers: { ...entetes(), 'Content-Type': mime, 'x-upsert': 'false', 'Cache-Control': 'no-store' },
    body: octets,
  });
  if (!r.ok) {
    console.error('formateurs stockage dépôt', r.status, (await r.text()).slice(0, 300));
    throw refus('stockage_indisponible', 502);
  }
}
export async function lireFichier(chemin) {
  const r = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${chemin}`, { headers: entetes() });
  if (!r.ok) {
    console.error('formateurs stockage lecture', r.status);
    throw refus('stockage_indisponible', 502);
  }
  return Buffer.from(await r.arrayBuffer());
}

/* ---------- Fichiers acceptés : le contenu fait foi, pas le nom ---------- */

export function formatFichier(o) {
  if (o.subarray(0, 1024).includes(Buffer.from('%PDF-'))) return { mime: 'application/pdf', ext: 'pdf' };
  if (o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (o.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  if (o.subarray(0, 4).toString('latin1') === 'RIFF' && o.subarray(8, 12).toString('latin1') === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  return null;
}
const nomPropre = (n) => String(n || 'piece').normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 160);

/* ---------- SIRET : l'API publique recherche-entreprises (comme Clindit) ---------- */

const FORMES_INSEE = { 1000: 'ei', 5498: 'eurl', 5499: 'sarl', 5710: 'sas', 5720: 'sasu' };
export async function verifierSiret(brut) {
  const siret = String(brut || '').replace(/\s/g, '');
  if (!/^\d{14}$/.test(siret)) throw refus('siret_invalide');
  let data = null;
  try {
    const r = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siret}&page=1&per_page=1`, {
      headers: { Accept: 'application/json', 'User-Agent': 'IA-Entrepreneur-CRM/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) data = await r.json();
  } catch { /* service indisponible : on le dit */ }
  const le = new Date().toISOString();
  if (!data) return { siret, joignable: false, le };
  const e = (data.results || [])[0];
  if (!e || e.siren !== siret.slice(0, 9)) return { siret, joignable: true, trouve: false, le };
  const etab = (e.matching_etablissements || []).find((x) => x.siret === siret) || (e.siege && e.siege.siret === siret ? e.siege : null);
  const lieu = etab || e.siege || {};
  const comp = e.complements || {};
  return {
    siret, joignable: true, trouve: true, le,
    siren: e.siren,
    nom: e.nom_complet || e.nom_raison_sociale || '',
    nature_juridique: String(e.nature_juridique || ''),
    forme: FORMES_INSEE[e.nature_juridique] || '',
    actif: e.etat_administratif === 'A' && (!etab || etab.etat_administratif !== 'F'),
    etablissement_trouve: Boolean(etab),
    adresse: lieu.adresse || '',
    activite: lieu.activite_principale || e.activite_principale || '',
    date_creation: e.date_creation || '',
    organisme_formation: Boolean(comp.est_organisme_formation),
    nda: Array.isArray(comp.liste_id_organisme_formation) ? comp.liste_id_organisme_formation.slice(0, 3) : [],
    dirigeants: (e.dirigeants || []).slice(0, 3).map((d) => [d.prenoms, d.nom].filter(Boolean).join(' ') || d.denomination || '').filter(Boolean),
  };
}

/* ---------- Claude lit chaque pièce ---------- */

const SCHEMA_LECTURE = {
  type: 'object',
  properties: {
    type_reconnu: { type: 'string', enum: [...TYPES_PIECES, 'autre'] },
    lisible: { type: 'boolean' },
    titulaire: { type: 'string' },
    siret: { type: 'string' },
    date_document: { type: 'string', description: 'AAAA-MM-JJ, ou vide' },
    date_expiration: { type: 'string', description: 'AAAA-MM-JJ, ou vide' },
    code_verification: { type: 'string', description: "Code de sécurité d'une attestation URSSAF, sinon vide" },
    details: { type: 'string' },
    conforme: { type: 'boolean' },
    alertes: { type: 'array', items: { type: 'string' } },
  },
  required: ['type_reconnu', 'lisible', 'titulaire', 'siret', 'date_document', 'date_expiration', 'code_verification', 'details', 'conforme', 'alertes'],
  additionalProperties: false,
};
const CONSIGNES_LECTURE = `Tu vérifies une pièce du dossier d'un formateur indépendant qui veut travailler en sous-traitance pour IA-Entrepreneur, organisme de formation certifié Qualiopi. Gabriel, le dirigeant, valide lui-même : tu l'aides en lisant la pièce et en signalant tout ce qui cloche.

Ce qui est attendu, selon le type :
- kbis : extrait Kbis, avis de situation SIRENE (INSEE) ou extrait du registre national des entreprises (INPI), daté de moins de 3 mois, au SIRET ou SIREN déclaré.
- identite : carte d'identité (recto et verso) ou passeport, au nom du représentant déclaré ; date_expiration = fin de validité.
- rib : relevé d'identité bancaire au nom du formateur ou de sa structure.
- tva : document qui justifie le régime de TVA déclaré (exonération avec numéro de déclaration d'activité, franchise en base de l'article 293 B du CGI, ou numéro de TVA intracommunautaire).
- rc_pro : attestation d'assurance responsabilité civile professionnelle, valable à la date du jour, qui couvre une activité de formation ou de conseil ; date_expiration = fin de la période couverte.
- urssaf : attestation de vigilance (pas une attestation de régularité fiscale), datée de moins de 6 mois ; code_verification = le code de sécurité imprimé dessus, sans espaces, pour que Gabriel le vérifie sur urssaf.fr.
- cv : CV de la personne déclarée, avec une expérience de formateur ou dans l'IA et le numérique.
- competences : diplômes, certifications, attestations ou références de missions en lien avec l'IA, le numérique ou la formation.
- formation_continue : preuve d'une formation suivie ou d'une certification obtenue dans les 12 derniers mois ; date_document = sa date.
- nda : récépissé de déclaration d'activité d'organisme de formation (numéro à 11 chiffres).

conforme est vrai seulement si la pièce est du type attendu, lisible, au bon nom et dans les délais. Sinon, alertes dit précisément ce qui ne va pas, en phrases courtes adressées à Gabriel. Une pièce qui semble retouchée ou incohérente (dates impossibles, polices mélangées, nom différent) est une alerte.
details : une phrase qui dit ce que montre la pièce (« Attestation de vigilance URSSAF du 02/11/2026, au nom de … »).
Confidentialité : ne recopie jamais un numéro de pièce d'identité, un IBAN complet ni un numéro de sécurité sociale. Pour un RIB, donne seulement les 4 derniers caractères de l'IBAN.
N'invente rien : ce que tu ne lis pas reste vide. Dates en AAAA-MM-JJ.`;

async function lirePiece({ octets, mime, type, f }) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const piece = PIECES.find((p) => p.type === type);
  const id = f.identite || {};
  const contexte = [
    `Date du jour : ${aujourdHui()}`,
    `Pièce attendue : ${type} (${piece ? piece.titre : 'autre'})`,
    `Formateur déclaré : ${id.representant || '?'}, structure « ${id.raison_sociale || '?'} », SIRET ${f.siret || '?'}`,
    f.regime_tva ? `Régime de TVA déclaré : ${f.regime_tva}${f.nda ? `, NDA ${f.nda}` : ''}` : '',
  ].filter(Boolean).join('\n');
  const fichier = mime === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: octets.toString('base64') } }
    : { type: 'image', source: { type: 'base64', media_type: mime, data: octets.toString('base64') } };
  const client = new Anthropic({ timeout: 45000, maxRetries: 1 });
  const r = await client.beta.messages.create({
    model: MODELE,
    max_tokens: 3000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA_LECTURE } },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [{ type: 'text', text: CONSIGNES_LECTURE, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: [fichier, { type: 'text', text: contexte }] }],
  });
  if (r.stop_reason === 'refusal') return { erreur: 'refus' };
  const l = JSON.parse((r.content || []).filter((b) => b.type === 'text').map((b) => b.text).join(''));
  const date = (x) => (DATE_RE.test(x || '') ? x : '');
  return {
    type_reconnu: l.type_reconnu, lisible: Boolean(l.lisible), titulaire: String(l.titulaire || '').slice(0, 200), siret: String(l.siret || '').replace(/\s/g, '').slice(0, 14),
    date_document: date(l.date_document), date_expiration: date(l.date_expiration),
    code_verification: type === 'urssaf' ? String(l.code_verification || '').replace(/\s/g, '').slice(0, 30) : '',
    details: String(l.details || '').slice(0, 500), conforme: Boolean(l.conforme),
    alertes: (Array.isArray(l.alertes) ? l.alertes : []).slice(0, 6).map((x) => String(x).slice(0, 300)),
  };
}
function expiration(type, lecture) {
  if (!lecture) return null;
  if (['identite', 'rc_pro'].includes(type) && lecture.date_expiration) return lecture.date_expiration;
  if (VALIDITE_MOIS[type] && lecture.date_document) return ajouterMois(lecture.date_document, VALIDITE_MOIS[type]);
  return null;
}

// Une pièce reçue (du formateur ou de Gabriel) : stockée, lue par Claude, à vérifier par Gabriel.
export async function deposerPiece({ f, leadId, type, nom, base64, deposePar }) {
  if (![...TYPES_PIECES, 'contrat', 'autre'].includes(type)) throw refus('type_invalide');
  const octets = Buffer.from(String(base64 || ''), 'base64');
  if (!octets.length) throw refus('fichier_vide');
  if (octets.length > OCTETS_MAX) throw refus('fichier_trop_lourd', 413);
  const format = formatFichier(octets);
  if (!format) throw refus('format_refuse', 415);
  const chemin = `${leadId}/${type}/${Date.now()}-${randomBytes(6).toString('hex')}.${format.ext}`;
  await deposerFichier(chemin, octets, format.mime);
  let lecture = null;
  try { lecture = await lirePiece({ octets, mime: format.mime, type, f }); } catch (e) {
    console.error('formateurs lecture', e?.status || '', e?.message || e);
    lecture = { erreur: 'lecture' };
  }
  // La pièce précédente du même type reste consultable, mais ne compte plus.
  await base(`iae_crm_documents?lead_id=eq.${leadId}&type=eq.${type}&archive=is.false`, { methode: 'PATCH', corps: { archive: true }, prefer: 'return=minimal' });
  const [doc] = await base('iae_crm_documents', {
    methode: 'POST', prefer: 'return=representation',
    corps: { lead_id: leadId, type, nom: nomPropre(nom), chemin, mime: format.mime, taille: octets.length, depose_par: deposePar, lecture, expire_le: expiration(type, lecture), statut: 'a_verifier' },
  });
  return doc;
}

/* ---------- L'état du dossier, et le statut qui en découle ---------- */

const IDENTITE_REQUISE = ['raison_sociale', 'forme', 'siege', 'representant', 'qualite'];
export function etatDossier(f, docs) {
  const t = aujourdHui();
  const actifs = (docs || []).filter((d) => !d.archive);
  const pieces = PIECES.map((p) => {
    const d = actifs.filter((x) => x.type === p.type).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0] || null;
    const expiree = Boolean(d && d.expire_le && d.expire_le < t);
    const bientot = Boolean(d && d.expire_le && !expiree && d.expire_le <= ajouterJours(t, 15));
    const etat = !d ? (p.facultatif ? 'facultative' : 'manquante') : d.statut === 'refuse' ? 'refusee' : expiree ? 'expiree' : d.statut === 'verifie' ? 'verifiee' : 'a_verifier';
    return { type: p.type, titre: p.titre, aide: p.aide, facultatif: Boolean(p.facultatif), etat, bientot, document: d };
  });
  const id = (f && f.identite) || {};
  const identiteOk = IDENTITE_REQUISE.every((k) => String(id[k] || '').trim()) && Boolean(f && f.regime_tva) && (f.regime_tva !== 'exonere' || Boolean(f.nda));
  const siretOk = Boolean(f && f.siret_verif && f.siret_verif.trouve && f.siret_verif.actif);
  const signe = Boolean(f && f.signature);
  const requises = pieces.filter((p) => !p.facultatif);
  const aEnvoyer = requises.filter((p) => ['manquante', 'refusee', 'expiree'].includes(p.etat));
  const aVerifier = pieces.filter((p) => p.etat === 'a_verifier');
  const complet = identiteOk && siretOk && signe && aEnvoyer.length === 0;
  const verifie = complet && aVerifier.length === 0;
  let statut;
  if (f && f.statut === 'refuse') statut = 'refuse';
  else if (f && f.valide_le) statut = verifie ? 'valide' : 'a_renouveler';
  else if (complet) statut = 'a_verifier';
  else if (f && (f.jeton_cree_le || actifs.length || f.signature || f.siret)) statut = 'en_cours';
  else statut = 'a_inviter';
  return {
    statut, pieces, identiteOk, siretOk, signe, complet, verifie,
    a_envoyer: aEnvoyer.map((p) => p.titre), a_verifier: aVerifier.map((p) => p.titre),
    bientot: pieces.filter((p) => p.bientot).map((p) => ({ titre: p.titre, expire_le: p.document.expire_le })),
    recues: requises.filter((p) => ['a_verifier', 'verifiee'].includes(p.etat)).length, requises: requises.length,
  };
}

const LIB_STATUT = { a_inviter: 'À inviter', en_cours: 'Dossier en cours', a_verifier: 'À vérifier', valide: 'Validé', a_renouveler: 'À mettre à jour', refuse: 'Refusé' };
export { LIB_STATUT as LIB_STATUT_FORMATEUR };

// Recalcule le statut ; quand le dossier devient complet ou qu'une pièce expire, la tâche arrive dans « Aujourd'hui ».
export async function majStatut(leadId, { source = 'crm' } = {}) {
  const [f] = (await base(`iae_crm_formateurs?lead_id=eq.${leadId}&select=*`)) || [];
  if (!f) return null;
  const docs = (await base(`iae_crm_documents?lead_id=eq.${leadId}&select=*&order=created_at.desc`)) || [];
  const e = etatDossier(f, docs);
  if (e.statut !== f.statut) {
    await base(`iae_crm_formateurs?lead_id=eq.${leadId}`, { methode: 'PATCH', corps: { statut: e.statut }, prefer: 'return=minimal' });
    const [lead] = (await base(`iae_crm_leads?id=eq.${leadId}&select=entreprise`)) || [];
    const nom = lead ? lead.entreprise : 'ce formateur';
    let tache = null;
    if (e.statut === 'a_verifier') tache = `Vérifier le dossier de ${nom} : contrat signé et toutes les pièces reçues. Valider le formateur s'il n'y a rien à redire.`;
    if (e.statut === 'a_renouveler') tache = `Mettre à jour le dossier de ${nom} : ${[...e.a_envoyer, ...e.a_verifier].join(', ') || 'une pièce'} à ${e.a_envoyer.length ? 'redemander' : 'vérifier'}.`;
    await base('iae_crm_activites', {
      methode: 'POST', prefer: 'return=minimal',
      corps: { lead_id: leadId, type: 'statut', resume: `Dossier formateur : ${LIB_STATUT[f.statut] || f.statut}, puis ${LIB_STATUT[e.statut]}`, source },
    });
    if (tache) await base(`iae_crm_leads?id=eq.${leadId}`, { methode: 'PATCH', corps: { prochaine_relance: aujourdHui(), prochaine_action: 'autre', prochaine_note: tache, archive: false }, prefer: 'return=minimal' });
  }
  return { ...f, statut: e.statut, etat: e };
}

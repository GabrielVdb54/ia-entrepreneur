/**
 * /api/formateur : l'espace d'un formateur, ouvert avec son lien personnel
 * (https://ia-entrepreneur.fr/espace-formateur/#<jeton>). Le jeton voyage dans
 * l'en-tête X-Jeton, jamais dans l'URL d'une requête ; la base n'en garde que
 * l'empreinte SHA-256, et il expire au bout de 30 jours (Gabriel en recrée un
 * depuis le CRM).
 *
 *   GET                                   le dossier : identité, profil, pièces, contrat
 *   POST { op: 'siret', siret }           vérification par l'API publique recherche-entreprises
 *   POST { op: 'identite', identite, regime_tva, nda, intervenants }
 *   POST { op: 'profil', competences, outils, niveaux, secteurs, zone, distanciel, disponibilites, bio }
 *   POST { op: 'piece', type, nom, base64 }   une pièce (PDF, JPEG, PNG, WebP ; 3,4 Mo au plus)
 *   POST { op: 'signer', lieu, nom, mention, accepte }   signature du contrat-cadre
 *
 * Le formateur ne voit jamais ses fichiers en retour (seulement leur état et ce
 * que Claude y a lu), ni rien d'autre du CRM. Après la signature, l'identité ne
 * se modifie plus : le texte signé doit rester celui qui a été lu.
 */

import { timingSafeEqual } from 'node:crypto';
import {
  base, deposerPiece, empreinte, etatDossier, majStatut, verifierSiret, RefusFormateur,
} from './_formateurs.js';
import { VERSION, contratRempli, texteContrat } from './_contrat-formateur.js';

export const maxDuration = 60;

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

const texte = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const liste = (v, max = 30) => (Array.isArray(v) ? v : String(v || '').split(',')).map((x) => texte(x, 80)).filter(Boolean).slice(0, max);
const FORMES = ['ei', 'micro', 'eurl', 'sarl', 'sasu', 'sas', 'autre'];
const REGIMES = ['exonere', 'assujetti', 'franchise'];

async function formateurDuJeton(jeton) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(jeton || '')) return null;
  const h = empreinte(jeton);
  const [f] = (await base(`iae_crm_formateurs?jeton_hash=eq.${h}&select=*`)) || [];
  if (!f || !f.jeton_hash) return null;
  const a = Buffer.from(f.jeton_hash);
  const b = Buffer.from(h);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (f.jeton_expire && new Date(f.jeton_expire) < new Date()) return { expire: true };
  return f;
}

async function dossier(f) {
  const [[lead], contacts, docs] = await Promise.all([
    base(`iae_crm_leads?id=eq.${f.lead_id}&select=entreprise`),
    base(`iae_crm_contacts?lead_id=eq.${f.lead_id}&select=prenom,nom,email&order=principal.desc,created_at.asc&limit=1`),
    base(`iae_crm_documents?lead_id=eq.${f.lead_id}&select=id,created_at,type,nom,statut,motif,expire_le,lecture,archive&order=created_at.desc`),
  ]);
  const c = (contacts || [])[0] || {};
  const e = etatDossier(f, docs || []);
  const sv = f.siret_verif || null;
  return {
    prenom: c.prenom || '', nom: c.nom || '', entreprise: lead ? lead.entreprise : '',
    statut: e.statut, complet: e.complet, verifie: e.verifie,
    identite: f.identite || {}, siret: f.siret || '', regime_tva: f.regime_tva || '', nda: f.nda || '', intervenants: f.intervenants || '',
    siret_verif: sv ? { trouve: sv.trouve, joignable: sv.joignable, actif: sv.actif, nom: sv.nom, adresse: sv.adresse, activite: sv.activite } : null,
    profil: { competences: f.competences || [], outils: f.outils || [], niveaux: f.niveaux || [], secteurs: f.secteurs || [], zone: f.zone || '', distanciel: f.distanciel !== false, disponibilites: f.disponibilites || '', bio: f.bio || '' },
    pieces: e.pieces.map((p) => ({
      type: p.type, titre: p.titre, aide: p.aide, facultatif: p.facultatif, etat: p.etat, bientot: p.bientot,
      document: p.document ? {
        nom: p.document.nom, recu_le: p.document.created_at, motif: p.document.statut === 'refuse' ? p.document.motif : '', expire_le: p.document.expire_le,
        lu: p.document.lecture && !p.document.lecture.erreur ? { details: p.document.lecture.details, alertes: p.document.lecture.alertes, conforme: p.document.lecture.conforme } : null,
      } : null,
    })),
    identite_ok: e.identiteOk, siret_ok: e.siretOk,
    signature: f.signature ? { date: f.signature.date, nom: f.signature.nom, lieu: f.signature.lieu } : null,
    contrat: { version: VERSION, blocs: contratRempli(f, f.signature) },
    lien_expire: f.jeton_expire,
  };
}

async function noter(leadId, resume) {
  await base('iae_crm_activites', { methode: 'POST', prefer: 'return=minimal', corps: { lead_id: leadId, type: 'note', resume: resume.slice(0, 2000), source: 'espace formateur' } });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({ erreur: 'indisponible' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '?').split(',')[0].trim();
  if (trop(`ip:${ip}`, 120)) return res.status(429).json({ erreur: 'trop_de_demandes' });
  try {
    const f = await formateurDuJeton(String(req.headers['x-jeton'] || ''));
    if (!f) return res.status(trop(`echec:${ip}`, 20) ? 429 : 401).json({ erreur: 'lien_invalide' });
    if (f.expire) return res.status(410).json({ erreur: 'lien_expire' });
    if (f.statut === 'refuse') return res.status(403).json({ erreur: 'dossier_clos' });
    if (req.method === 'GET') return res.status(200).json(await dossier(f));
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ erreur: 'methode' }); }
    let corps = req.body;
    if (typeof corps === 'string') { try { corps = JSON.parse(corps); } catch { corps = {}; } }
    corps = corps && typeof corps === 'object' ? corps : {};
    const signe = Boolean(f.signature);

    if (corps.op === 'siret') {
      if (signe) throw new RefusFormateur('deja_signe', 409);
      if (trop(`siret:${f.lead_id}`, 15)) return res.status(429).json({ erreur: 'trop_de_demandes' });
      const v = await verifierSiret(corps.siret);
      const id = { ...(f.identite || {}) };
      // Pré-remplissage depuis le registre, comme sur Clindit, sans écraser ce qui a été saisi.
      if (v.trouve) {
        if (!id.raison_sociale) id.raison_sociale = v.nom;
        if (!id.siege) id.siege = v.adresse;
        if (!id.forme && v.forme) id.forme = v.forme;
      }
      await base(`iae_crm_formateurs?lead_id=eq.${f.lead_id}`, { methode: 'PATCH', prefer: 'return=minimal', corps: { siret: v.siret, siret_verif: v, identite: id } });
      await majStatut(f.lead_id, { source: 'espace formateur' });
      return res.status(200).json({ ...(await dossier({ ...f, siret: v.siret, siret_verif: v, identite: id })), siret_resultat: v.trouve ? (v.actif ? 'actif' : 'ferme') : v.joignable === false ? 'injoignable' : 'introuvable' });
    }

    if (corps.op === 'identite') {
      if (signe) throw new RefusFormateur('deja_signe', 409);
      const s = corps.identite || {};
      const identite = {
        raison_sociale: texte(s.raison_sociale, 160), forme: FORMES.includes(s.forme) ? s.forme : '', forme_libre: texte(s.forme_libre, 80),
        capital: texte(s.capital, 30), siege: texte(s.siege, 300), immatriculation: texte(s.immatriculation, 120),
        representant: texte(s.representant, 120), qualite: texte(s.qualite, 80),
      };
      const regime = REGIMES.includes(corps.regime_tva) ? corps.regime_tva : null;
      const nda = texte(corps.nda, 20).replace(/\s/g, '');
      if (nda && !/^\d{11}$/.test(nda)) throw new RefusFormateur('nda_invalide');
      await base(`iae_crm_formateurs?lead_id=eq.${f.lead_id}`, { methode: 'PATCH', prefer: 'return=minimal', corps: { identite: { ...(f.identite || {}), ...identite }, regime_tva: regime, nda: nda || null, intervenants: texte(corps.intervenants, 300) || null } });
      const nouveau = (await base(`iae_crm_formateurs?lead_id=eq.${f.lead_id}&select=*`))[0];
      await majStatut(f.lead_id, { source: 'espace formateur' });
      return res.status(200).json(await dossier(nouveau));
    }

    if (corps.op === 'profil') {
      const niveaux = (Array.isArray(corps.niveaux) ? corps.niveaux : []).map(Number).filter((n) => [1, 2, 3].includes(n));
      await base(`iae_crm_formateurs?lead_id=eq.${f.lead_id}`, {
        methode: 'PATCH', prefer: 'return=minimal',
        corps: { competences: liste(corps.competences), outils: liste(corps.outils), niveaux: [...new Set(niveaux)], secteurs: liste(corps.secteurs), zone: texte(corps.zone, 200) || null, distanciel: corps.distanciel !== false, disponibilites: texte(corps.disponibilites, 500) || null, bio: texte(corps.bio, 2000) || null },
      });
      const nouveau = (await base(`iae_crm_formateurs?lead_id=eq.${f.lead_id}&select=*`))[0];
      return res.status(200).json(await dossier(nouveau));
    }

    if (corps.op === 'piece') {
      if (trop(`piece:${f.lead_id}`, 30)) return res.status(429).json({ erreur: 'trop_de_demandes' });
      const doc = await deposerPiece({ f, leadId: f.lead_id, type: String(corps.type || ''), nom: corps.nom, base64: corps.base64, deposePar: 'formateur' });
      await noter(f.lead_id, `Pièce reçue par l'espace formateur : ${doc.nom}${doc.lecture && doc.lecture.alertes && doc.lecture.alertes.length ? ` (à regarder : ${doc.lecture.alertes[0]})` : ''}`);
      await majStatut(f.lead_id, { source: 'espace formateur' });
      const nouveau = (await base(`iae_crm_formateurs?lead_id=eq.${f.lead_id}&select=*`))[0];
      return res.status(200).json(await dossier(nouveau));
    }

    if (corps.op === 'signer') {
      if (signe) throw new RefusFormateur('deja_signe', 409);
      const e = etatDossier(f, []);
      if (!e.identiteOk || !e.siretOk) throw new RefusFormateur('identite_incomplete');
      const mention = texte(corps.mention, 80).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
      if (mention !== 'lu et approuve bon pour accord') throw new RefusFormateur('mention_invalide');
      const nom = texte(corps.nom, 120);
      const lieu = texte(corps.lieu, 80);
      if (nom.length < 3 || lieu.length < 2 || corps.accepte !== true) throw new RefusFormateur('signature_incomplete');
      const date = new Date().toISOString();
      const blocs = contratRempli(f, { lieu, date });
      const tout = texteContrat(blocs);
      const signature = {
        nom, lieu, date, mention: 'Lu et approuvé, bon pour accord', version: VERSION, empreinte: empreinte(tout), texte: tout,
        ip, navigateur: texte(req.headers['user-agent'], 300), raison_sociale: (f.identite || {}).raison_sociale || '', siret: f.siret || '',
      };
      await base(`iae_crm_formateurs?lead_id=eq.${f.lead_id}`, { methode: 'PATCH', prefer: 'return=minimal', corps: { signature } });
      await base('iae_crm_activites', { methode: 'POST', prefer: 'return=minimal', corps: { lead_id: f.lead_id, type: 'statut', resume: `Contrat-cadre signé en ligne par ${nom}, à ${lieu} (version ${VERSION}).`, source: 'espace formateur', meta: { empreinte: signature.empreinte, ip } } });
      await majStatut(f.lead_id, { source: 'espace formateur' });
      return res.status(200).json(await dossier({ ...f, signature }));
    }

    throw new RefusFormateur('operation_inconnue');
  } catch (e) {
    if (e && e.refus) return res.status(e.statut || 400).json({ erreur: e.code });
    console.error('formateur', e);
    return res.status(500).json({ erreur: 'erreur_interne' });
  }
}


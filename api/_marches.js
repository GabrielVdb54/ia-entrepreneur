/**
 * Les marchés publics et les pièces de l'organisme (13/11/2026).
 *
 * Point appels d'offres du 13/11 (Gabriel, Anna, Ludovic) : Ludovic fait la veille et
 * envoie 2 à 4 marchés avec une analyse courte (avantages, inconvénients, santé de
 * l'acheteur) ; Gabriel répond oui ou non ; pour chaque oui, Ludovic dit à Anna les
 * profils de formateurs qu'il lui faut, Anna les trouve et rassemble leurs pièces.
 * Gabriel a choisi de mettre ce suivi dans le CRM, avec les pièces de l'organisme
 * (Qualiopi, Kbis, RC Pro, attestations) que Ludovic télécharge pour ses dossiers.
 *
 * Qui fait quoi (rôles de api/_equipe.js) :
 * - Gabriel : tout, et seul à décider (retenu / écarté) ou à supprimer un marché.
 * - Ludovic (partenaire) : propose un marché, le décrit, le suit après la décision
 *   (en montage, déposé, gagné, perdu) ou l'abandonne.
 * - Anna (setter) : les profils demandés, les formateurs rattachés, les notes ;
 *   elle dépose aussi les pièces de l'organisme (elle tient les dossiers).
 * Les tables (supabase/iae_crm_acces_roles.sql) ne sont lues et écrites qu'avec la
 * clé de service, à travers sb() et donc garder().
 */

import { randomBytes } from 'node:crypto';
import { moi, estAdmin, estPartenaire, gereFormateurs, voitMarches } from './_equipe.js';
import { deposerFichier, formatFichier, lireFichier, nomPropre } from './_formateurs.js';

export class RefusMarche extends Error {
  constructor(code, statut = 400) {
    super(code);
    this.code = code;
    this.statut = statut;
    this.refus = true;
  }
}
const refus = (code, statut) => new RefusMarche(code, statut);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const STATUTS_MARCHE = ['propose', 'retenu', 'ecarte', 'en_montage', 'depose', 'gagne', 'perdu', 'abandonne'];
// Après le oui de Gabriel, Ludovic fait avancer le marché lui-même ; il peut toujours l'abandonner.
const SUIVI_PARTENAIRE = ['en_montage', 'depose', 'gagne', 'perdu', 'abandonne'];
const DESCRIPTION = { titre: 300, acheteur: 300, reference: 120, lieu: 200, synthese: 5000, avantages: 5000, inconvenients: 5000, sante_acheteur: 3000 };
const EQUIPE = { profils: 5000, notes: 5000 };

function texte(v, max, cle) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const t = String(v).replace(/\u0000/g, '').trim();
  if (t.length > max) throw refus(`trop_long:${cle}`);
  return t || null;
}
function lien(v) {
  if (v === undefined) return undefined;
  const t = String(v ?? '').trim();
  if (!t) return null;
  if (t.length > 1000 || !/^https:\/\/[^\s<>"']+$/i.test(t)) throw refus('lien_invalide');
  return t;
}
function montant(v) {
  if (v === undefined) return undefined;
  if (v === null || String(v).trim() === '') return null;
  const n = Number(String(v).replace(/[\s €]/g, '').replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 1e10) throw refus('montant_invalide');
  return Math.round(n);
}
function date(v, cle) {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (!DATE_RE.test(String(v))) throw refus(`date_invalide:${cle}`);
  return String(v);
}
const sansIndefinis = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

function description(v) {
  const r = {};
  for (const [k, max] of Object.entries(DESCRIPTION)) r[k] = texte(v[k], max, k);
  r.lien = lien(v.lien);
  r.montant = montant(v.montant);
  r.date_limite = date(v.date_limite, 'date_limite');
  return sansIndefinis(r);
}
function partEquipe(v) {
  const r = {};
  for (const [k, max] of Object.entries(EQUIPE)) r[k] = texte(v[k], max, k);
  return sansIndefinis(r);
}

// Les formateurs rattachés : des leads « formateur » existants, 30 au plus.
async function formateursValides(liste, sb) {
  if (liste === undefined) return undefined;
  if (!Array.isArray(liste) || liste.length > 30 || !liste.every((x) => UUID_RE.test(String(x)))) throw refus('formateurs_invalides');
  const ids = [...new Set(liste.map(String))];
  if (!ids.length) return [];
  const { lignes } = await sb(`iae_crm_leads?id=in.(${ids.join(',')})&type=eq.formateur&select=id`);
  if ((lignes || []).length !== ids.length) throw refus('formateurs_invalides');
  return ids;
}

export async function operationMarche(corps, { sb }) {
  const u = moi();
  if (!voitMarches(u)) throw refus('reserve_admin', 403);
  const op = corps.op;
  const v = corps.valeurs && typeof corps.valeurs === 'object' ? corps.valeurs : {};

  if (op === 'marche_creer') {
    if (!estAdmin(u) && !estPartenaire(u)) throw refus('reserve_admin', 403);
    const ligne = { ...description(v), ...partEquipe(v), cree_par: u.email, statut: 'propose' };
    if (!ligne.titre) throw refus('champ_requis:titre');
    const f = await formateursValides(v.formateurs, sb);
    if (f) ligne.formateurs = f;
    const { lignes: [m] } = await sb('iae_crm_marches', { methode: 'POST', corps: ligne, prefer: 'return=representation' });
    return { marche: m };
  }

  if (!UUID_RE.test(String(corps.id || ''))) throw refus('id_invalide');
  const { lignes: [actuel] } = await sb(`iae_crm_marches?id=eq.${corps.id}&select=*`);
  if (!actuel) throw refus('introuvable', 404);
  const enregistrer = async (maj) => {
    if (!Object.keys(maj).length) throw refus('rien_a_modifier');
    const { lignes: [m] } = await sb(`iae_crm_marches?id=eq.${actuel.id}`, { methode: 'PATCH', corps: maj, prefer: 'return=representation' });
    return { marche: m };
  };

  if (op === 'marche_decider') {
    // Le oui ou le non de Gabriel.
    if (!estAdmin(u)) throw refus('reserve_admin', 403);
    if (!['oui', 'non'].includes(corps.decision)) throw refus('valeur_invalide:decision');
    return enregistrer({ statut: corps.decision === 'oui' ? 'retenu' : 'ecarte', decision_le: new Date().toISOString(), decision_note: texte(corps.note ?? null, 2000, 'note') });
  }

  if (op === 'marche_supprimer') {
    if (!estAdmin(u)) throw refus('reserve_admin', 403);
    await sb(`iae_crm_marches?id=eq.${actuel.id}`, { methode: 'DELETE' });
    return { supprime: true, id: actuel.id };
  }

  if (op === 'marche_maj') {
    let maj = {};
    if (estAdmin(u) || estPartenaire(u)) Object.assign(maj, description(v));
    Object.assign(maj, partEquipe(v));
    const f = await formateursValides(v.formateurs, sb);
    if (f) maj.formateurs = f;
    if (estAdmin(u) || estPartenaire(u)) {
      const d = date(v.depose_le, 'depose_le');
      if (d !== undefined) maj.depose_le = d;
      const r = date(v.resultat_le, 'resultat_le');
      if (r !== undefined) maj.resultat_le = r;
    }
    if (v.statut !== undefined && v.statut !== actuel.statut) {
      if (!STATUTS_MARCHE.includes(v.statut)) throw refus('valeur_invalide:statut');
      if (!estAdmin(u)) {
        // Ludovic ne décide pas à la place de Gabriel : la suite seulement après un oui (abandonner reste possible).
        const apresOui = !['propose', 'ecarte'].includes(actuel.statut);
        if (!estPartenaire(u) || !SUIVI_PARTENAIRE.includes(v.statut) || (!apresOui && v.statut !== 'abandonne')) throw refus('statut_reserve', 403);
      }
      maj.statut = v.statut;
      if (['retenu', 'ecarte'].includes(v.statut)) maj.decision_le = new Date().toISOString();
      if (v.statut === 'depose' && !actuel.depose_le && maj.depose_le === undefined) maj.depose_le = new Date().toISOString().slice(0, 10);
      if (['gagne', 'perdu'].includes(v.statut) && !actuel.resultat_le && maj.resultat_le === undefined) maj.resultat_le = new Date().toISOString().slice(0, 10);
    }
    if (maj.titre === null) throw refus('champ_requis:titre');
    maj = sansIndefinis(maj);
    return enregistrer(maj);
  }
  throw refus('operation_inconnue');
}

/* ---------- Les pièces de l'organisme ---------- */

export const TYPES_ORGANISME = {
  qualiopi: 'Certificat Qualiopi',
  kbis: 'Extrait Kbis',
  rc_pro: 'Attestation RC Pro',
  urssaf: 'Attestation de vigilance URSSAF',
  fiscale: 'Attestation de régularité fiscale',
  nda: "Déclaration d'activité (NDA)",
  references: 'Références clients',
  statuts: 'Statuts',
  rib: "RIB de l'organisme",
  autre: 'Autre document',
};
// Une seule pièce en cours par type, sauf les références et les autres documents.
const UNIQUES = new Set(['qualiopi', 'kbis', 'rc_pro', 'urssaf', 'fiscale', 'nda', 'statuts', 'rib']);
const OCTETS_MAX = 3.4 * 1024 * 1024;
export const COLONNES_PIECE_ORGANISME = 'id,created_at,type,titre,nom,mime,taille,expire_le,depose_par';

export async function operationPieceOrganisme(corps, { sb }) {
  const u = moi();
  if (!gereFormateurs(u)) throw refus('reserve_admin', 403);
  if (corps.op === 'organisme_archiver') {
    if (!UUID_RE.test(String(corps.id || ''))) throw refus('id_invalide');
    const { lignes } = await sb(`iae_crm_pieces_organisme?id=eq.${corps.id}`, { methode: 'PATCH', corps: { archive: true }, prefer: 'return=representation' });
    if (!lignes || !lignes.length) throw refus('introuvable', 404);
    return { archive: corps.id };
  }
  if (corps.op !== 'organisme_deposer') throw refus('operation_inconnue');
  const type = String(corps.type || '');
  if (!TYPES_ORGANISME[type]) throw refus('type_invalide');
  const octets = Buffer.from(String(corps.base64 || ''), 'base64');
  if (!octets.length) throw refus('fichier_vide');
  if (octets.length > OCTETS_MAX) throw refus('fichier_trop_lourd', 413);
  const format = formatFichier(octets);
  if (!format) throw refus('format_refuse', 415);
  const titre = texte(corps.titre ?? null, 160, 'titre') || TYPES_ORGANISME[type];
  const expire = date(corps.expire_le || null, 'expire_le');
  const chemin = `organisme/${type}/${Date.now()}-${randomBytes(6).toString('hex')}.${format.ext}`;
  await deposerFichier(chemin, octets, format.mime);
  if (UNIQUES.has(type)) await sb(`iae_crm_pieces_organisme?type=eq.${type}&archive=is.false`, { methode: 'PATCH', corps: { archive: true }, prefer: 'return=minimal' });
  const { lignes: [piece] } = await sb('iae_crm_pieces_organisme', {
    methode: 'POST', prefer: `return=representation`,
    corps: { type, titre, nom: nomPropre(corps.nom || `${titre}.${format.ext}`), chemin, mime: format.mime, taille: octets.length, expire_le: expire, depose_par: u.email },
  });
  const { chemin: _c, archive: _a, ...publique } = piece;
  return { piece: publique, remplace: UNIQUES.has(type) ? type : null };
}

// GET /api/crm?piece_organisme=<id> : le fichier, pour Gabriel, Anna et Ludovic.
export async function lirePieceOrganisme(id, { sb }) {
  if (!voitMarches()) throw refus('reserve_admin', 403);
  if (!UUID_RE.test(String(id || ''))) throw refus('id_invalide');
  const { lignes: [p] } = await sb(`iae_crm_pieces_organisme?id=eq.${id}&select=chemin,mime,nom`);
  if (!p) throw refus('introuvable', 404);
  return { octets: await lireFichier(p.chemin), mime: p.mime, nom: p.nom };
}

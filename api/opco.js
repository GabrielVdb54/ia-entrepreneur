/**
 * /api/opco — « Quel est mon OPCO, et quel budget pour former mes salariés ? »
 *
 * L'outil de la page /quel-est-mon-opco.html et du bloc posé sur les pages
 * de formation (outil-opco.js). Il remplace le simulateur de financement
 * (Gabriel, 09/11/2026 : « plus besoin de faire un simulateur, il faut juste
 * mettre le SIRET pour avoir les mêmes solutions que Cathy »). Les mêmes
 * réponses que l'outil fait pour Cathy dans Ella : l'OPCO trouvé par le
 * SIRET, la convention collective, et la page où l'OPCO publie ce qu'il
 * finance. Recherche dans _entreprise-opco.js.
 *
 *   GET  /api/opco?siret=<SIRET ou SIREN>
 *        → l'entreprise, son effectif, son OPCO, sa convention. Sans le lien
 *          du barème : c'est ce que le visiteur reçoit par email.
 *   GET  /api/opco?siret=…&idcc=…   (idcc facultatif, saisi par le visiteur)
 *   POST /api/opco { siret, email, page?, duree?, salaries?, newsletter?, idcc? }
 *        → le serveur refait la recherche, envoie le résultat par email
 *          (Brevo), pose le lead dans le CRM, à traiter aujourd'hui, et
 *          prévient Gabriel. Aucune demande n'est jetée sans rien dire.
 *
 * Même discipline que /api/recap : le navigateur n'envoie qu'un numéro et
 * une adresse. Tout le contenu de l'email est reconstruit ici depuis les
 * sources publiques ; sans cela, n'importe qui pourrait écrire ce qu'il veut
 * à l'adresse de son choix depuis notre domaine.
 *
 * Les montants ne sont pas calculés (ils dépendent de la branche et de
 * l'effectif et changent chaque année) : l'email renvoie vers la page où
 * l'OPCO les publie, et dit quelle branche choisir.
 *
 * Variables : BREVO_API_KEY (sans elle, pas d'email : la page affiche alors
 * directement les liens), SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (le CRM).
 * Facultatives : OPCO_EXPEDITEUR (sinon BREVO_EXPEDITEUR, sinon
 * gabriel@ia-entrepreneur.fr, expéditeur vérifié dans Brevo),
 * OPCO_NOTIFICATION (adresse prévenue à chaque demande, gabriel@ par défaut,
 * « non » pour couper).
 */

import { rechercher, SOCLE, FONDS_NON_SALARIES, parIdcc, convention as ficheConvention } from './_entreprise-opco.js';
import { crmDisponible, enregistrerDemande } from './_crm-site.js';
import { baremePour } from './_baremes.js';
import { emailRefuse } from './_anti-robot.js';

export const maxDuration = 20;

const SITE = 'https://ia-entrepreneur.fr';
const RDV = `${SITE}/rendez-vous.html`;
const FRANCE_COMPETENCES = 'https://quel-est-mon-opco.francecompetences.fr/';
const EXPEDITEUR = process.env.OPCO_EXPEDITEUR || process.env.BREVO_EXPEDITEUR || 'gabriel@ia-entrepreneur.fr';
const EXPEDITEUR_NOM = 'Gabriel, IA-Entrepreneur';
const NOTIFICATION = process.env.OPCO_NOTIFICATION === 'non' ? null : process.env.OPCO_NOTIFICATION || 'gabriel@ia-entrepreneur.fr';

const HOTES_AUTORISES = ['ia-entrepreneur.fr', 'www.ia-entrepreneur.fr', 'localhost', '127.0.0.1'];
const EMAIL_RE = /^[^@\s<>,;"]+@[^@\s<>,;".]+(\.[^@\s<>,;".]+)+$/;

// Limites indicatives par instance : elles écartent une boucle ou un robot
// pressé, pas un attaquant décidé. L'envoi d'email est le seul point qui
// écrit à une adresse choisie par l'appelant : il est le plus serré.
const FENETRE_MS = 10 * 60 * 1000;
const passages = { lecture: new Map(), envoi: new Map() };
const MAX = { lecture: 30, envoi: 5 };

function tropDeDemandes(type, ip) {
  const maintenant = Date.now();
  const table = passages[type];
  const recentes = (table.get(ip) || []).filter((t) => maintenant - t < FENETRE_MS);
  if (table.size > 5000) table.clear();
  recentes.push(maintenant);
  table.set(ip, recentes);
  return recentes.length > MAX[type];
}

function origineEtrangere(req) {
  const origine = req.headers.origin;
  if (!origine) return false;
  try {
    const hote = new URL(origine).hostname;
    return !(HOTES_AUTORISES.includes(hote) || hote.endsWith('.vercel.app'));
  } catch {
    return true;
  }
}

const envoiPossible = () => Boolean(process.env.BREVO_API_KEY);

// --- Réponse publique (GET) ------------------------------------------------

/** Les liens des barèmes : réservés à l'email, sauf quand on ne peut pas l'envoyer. */
function liens(r) {
  if (!r.opco) return null;
  return {
    criteres: r.opco.criteres,
    espace: r.opco.espace,
    gestion: r.opco.gestion ? { criteres: r.opco.gestion.criteres, espace: r.opco.gestion.espace } : null,
  };
}

function publique(r) {
  if (r.etat !== 'trouve') return { etat: r.etat };
  const o = r.opco;
  return {
    etat: 'trouve',
    numero: r.numero,
    siret: r.siret,
    siege: r.siege,
    entreprise: r.entreprise,
    effectif: { tranche: r.effectif.tranche, libelle: r.effectif.libelle, annee: r.effectif.annee, moins_de_50: r.effectif.moins_de_50 },
    opco: o
      ? {
          code: o.code,
          nom: o.nom,
          gestion: o.gestion ? o.gestion.nom : null,
          ambigu: Boolean(o.ambigu),
          candidats: o.ambigu ? o.candidats.map((c) => c.nom) : null,
        }
      : null,
    methode: r.methode,
    convention: r.convention ? { idcc: r.convention.idcc, titre: r.convention.titre } : null,
    idcc_saisi: r.idcc_saisi || null,
    // Le montant lui-même part par email ; la page dit seulement qu'il est prêt.
    // Vrai seulement si l'email donnera un montant (pas pour une enveloppe épuisée).
    bareme: Boolean(o && !o.ambigu && baremePour((o.gestion || o).code, r.convention?.idcc, r.effectif.tranche)?.paliers.length),
    envoi: envoiPossible(),
    liens: envoiPossible() ? null : liens(r),
    fonds_non_salaries: envoiPossible() ? null : Object.values(FONDS_NON_SALARIES),
    donnee_maj: SOCLE.donnee_maj,
  };
}

// --- L'email ----------------------------------------------------------------

function echapper(t) {
  return String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function dateFr(iso) {
  if (!iso) return null;
  const [a, m, j] = iso.split('-');
  return `${j}/${m}/${a}`;
}

/** « de AKTO » → « d'AKTO », « de Constructys » reste tel quel. */
function de(nom) {
  return /^[aeiouyhàâéèêîôû]/i.test(nom) ? `d’${nom}` : `de ${nom}`;
}

function nomEntreprise(r) {
  return r.entreprise?.enseigne || r.entreprise?.nom || `SIRET ${r.siret || r.numero}`;
}

/**
 * L'email, court et droit au but (Gabriel, 09/11/2026 : « il ne faut pas que
 * le mail soit long, juste droit au but avec un lien »). L'OPCO, le montant
 * quand le barème de la branche est vérifié (_baremes.js), sinon le lien vers
 * la page où l'OPCO le publie, et la proposition de monter le dossier.
 */
function contenu(r) {
  const o = r.opco;
  const ref = o ? o.gestion || o : null;
  const conv = r.convention;
  const eff = r.effectif;
  const nom = nomEntreprise(r);
  const bareme = o && !o.ambigu ? baremePour(ref.code, conv?.idcc, eff.tranche, eff.bornes) : null;

  const infos = [
    conv && `${conv.titre ? `${conv.titre} (IDCC ${conv.idcc}` : `IDCC ${conv.idcc}`}${r.idcc_saisi === conv.idcc ? ', indiquée par vous' : ''}${conv.titre ? ')' : ''}`,
    eff.declare !== undefined
      ? `${eff.libelle} (selon vous)`
      : eff.libelle && !['NN', '00'].includes(eff.tranche) && `${eff.libelle.toLowerCase()}${eff.annee ? ` (Insee, ${eff.annee})` : ''}`,
  ].filter(Boolean).join(', ');

  const c = { nom, sujet: '', opco: null, infos, budget: [], bouton: null, notes: [], fonds: null, sources: [] };

  if (!o) {
    c.sujet = `Budget formation de ${nom} : votre OPCO à vérifier`;
    c.opco = 'OPCO : à vérifier';
    c.budget = ["Votre établissement n'apparaît pas dans la table de France compétences, qui ne recense que les employeurs déclarant des salariés. Si vous avez des salariés, répondez à cet email : nous vérifions votre OPCO avec vous.",
      "Pour votre propre formation de dirigeant non salarié, le financeur est celui de votre attestation de contribution à la formation (espace Urssaf) :"];
    c.fonds = Object.values(FONDS_NON_SALARIES);
    return c;
  }

  c.sujet = bareme?.paliers.length
    ? (bareme.plusieurs ? `Votre budget formation 2026 chez ${ref.nom}` : `Votre budget formation ${ref.nom} : ${bareme.paliers[0].montant}`)
    : `Budget formation de ${nom} : votre OPCO est ${o.nom}`;
  c.opco = `Votre OPCO : ${o.nom}${o.gestion ? ` (dossier géré par ${o.gestion.nom})` : ''}`;
  // Gabriel, 09/11 : « ajouter le lien vers là où on a trouvé l'info, pour
  // qu'il vérifie lui-même ». Chaque information de l'email renvoie à sa source.
  c.sources.push({ quoi: 'Votre OPCO', texte: 'outil officiel de France compétences (entrez votre SIRET)', url: FRANCE_COMPETENCES });
  if (conv?.lien) c.sources.push({ quoi: 'Votre convention collective', texte: 'Code du travail numérique', url: conv.lien });
  if (o.ambigu) {
    c.notes.push(`Votre convention est partagée entre ${o.candidats.map((x) => x.nom).join(' et ')} : nous vérifions le vôtre avec vous avant tout dépôt.`);
  }

  if (bareme?.epuise) {
    // L'OPCO écrit que l'enveloppe 2026 de la branche est engagée : on le dit tel quel.
    c.budget.push(`${bareme.epuise}.`);
    c.notes.push(`Source : ${bareme.version}, lue le ${dateFr(bareme.lu_le)}.`);
    c.bouton = { texte: `Voir la page de ma branche chez ${ref.nom}`, url: bareme.lien };
    c.sources.push({ quoi: 'Le budget 2026', texte: `page de votre branche, site ${de(ref.nom)}`, url: bareme.lien });
  } else if (bareme) {
    const qui = bareme.plusieurs ? '' : ` (${bareme.paliers[0].libelle})`;
    c.budget.push(`D'après vos informations${qui}, voici ce ${/^[aeiouy]/i.test(ref.nom) ? 'qu’' : 'que '}${ref.nom} finance en 2026 pour former vos salariés :`);
    for (const p of bareme.paliers) {
      c.budget.push({ fort: `${bareme.plusieurs ? `${p.libelle[0].toUpperCase()}${p.libelle.slice(1)} : ` : ''}${p.montant}`, suite: p.detail });
    }
    c.notes.push(`Source : ${bareme.version}, lue le ${dateFr(bareme.lu_le)}. Dans la limite des fonds disponibles.${bareme.delai ? ` ${bareme.delai}` : ''}`);
    c.bouton = { texte: `Voir le barème sur le site ${de(ref.nom)}`, url: bareme.lien };
    c.sources.push({ quoi: 'Le montant', texte: `barème 2026 de votre branche, site ${de(ref.nom)}`, url: bareme.lien });
  } else if (eff.moins_de_50 === false) {
    c.budget.push(`À partir de 50 salariés, les fonds mutualisés de l'OPCO ne s'appliquent plus : la formation se finance sur votre budget ou par un versement volontaire à ${ref.nom}. Le détail est ici :`);
    c.bouton = { texte: `Voir les critères ${de(ref.nom)}`, url: ref.criteres };
  } else {
    c.budget.push(`${ref.nom} publie le montant qu'il prend en charge pour chaque branche${conv?.titre ? ` ; la vôtre est « ${conv.titre} »` : ''}. Votre budget est ici :`);
    c.bouton = { texte: `Voir mon budget chez ${ref.nom}`, url: ref.criteres };
  }
  return c;
}

const P = (t, style = '') => `<p style="margin:0 0 12px;font:400 15px/1.6 Helvetica,Arial,sans-serif;color:#2B3050;${style}">${t}</p>`;
const BOUTON = (b, fond) => `<a href="${echapper(b.url)}" style="display:inline-block;background:${fond};color:#fff;font:700 15px Helvetica,Arial,sans-serif;text-decoration:none;padding:13px 24px;border-radius:50px;">${echapper(b.texte)}</a>`;

function versHtml(c) {
  const budget = c.budget.map((l) => (typeof l === 'string'
    ? P(echapper(l))
    : P(`<strong style="color:#0A0F2C;font-size:17px;">${echapper(l.fort)}</strong>${l.suite ? `<br><span style="color:#525880;font-size:14px;">${echapper(l.suite[0].toUpperCase() + l.suite.slice(1))}.</span>` : ''}`))).join('');
  const fonds = c.fonds ? `<p style="margin:0 0 12px;font:400 14px/1.7 Helvetica,Arial,sans-serif;color:#2B3050;">${c.fonds.map((f) => `<a href="${echapper(f.criteres)}" style="color:#1A3CFF;font-weight:700;text-decoration:none;">${echapper(f.nom)}</a> (${echapper(f.pour)})`).join('<br>')}</p>` : '';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="margin:0;padding:0;background:#F6F7FB;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7FB;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:14px;"><tr><td style="padding:28px 26px;">
${P('Bonjour,')}
<p style="margin:0 0 4px;font:800 19px/1.35 Helvetica,Arial,sans-serif;color:#1A3CFF;">${echapper(c.opco)}</p>
<p style="margin:0 0 18px;font:400 13px/1.55 Helvetica,Arial,sans-serif;color:#8A90AB;">${echapper(c.nom)}${c.infos ? `, ${echapper(c.infos)}` : ''}</p>
${budget}${fonds}
${c.bouton ? `<p style="margin:4px 0 16px;">${BOUTON(c.bouton, '#1A3CFF')}</p>` : ''}
${c.notes.map((n) => `<p style="margin:0 0 10px;font:400 12px/1.55 Helvetica,Arial,sans-serif;color:#8A90AB;">${echapper(n)}</p>`).join('')}
${c.sources.length ? `<p style="margin:0 0 10px;font:400 12px/1.7 Helvetica,Arial,sans-serif;color:#8A90AB;">Pour vérifier vous-même :${c.sources.map((x) => `<br>${echapper(x.quoi)} : <a href="${echapper(x.url)}" style="color:#525880;">${echapper(x.texte)}</a>`).join('')}</p>` : ''}
<div style="height:10px;border-bottom:1px solid #E7E9F2;margin-bottom:18px;"></div>
${P('Nous montons votre dossier de financement avec vous, et vous connaissez votre reste à charge avant de signer.')}
<p style="margin:0 0 20px;">${BOUTON({ texte: 'Prendre rendez-vous (30 min)', url: RDV }, '#10B981')}</p>
${P('Gabriel Vanderbecken<br><span style="color:#8A90AB;font-size:13px;">IA-Entrepreneur, organisme de formation certifié Qualiopi</span>', 'margin:0;')}
</td></tr></table>
<p style="max-width:560px;margin:14px auto 0;font:400 11px/1.5 Helvetica,Arial,sans-serif;color:#8A90AB;">Vous recevez cet email parce que vous l'avez demandé sur <a href="${SITE}/quel-est-mon-opco.html" style="color:#8A90AB;">ia-entrepreneur.fr</a>. Sources publiques : Insee, France compétences, barèmes des OPCO. <a href="${SITE}/politique-confidentialite.html" style="color:#8A90AB;">Confidentialité</a></p>
</td></tr></table></body></html>`;
}

function versTexte(c) {
  const l = ['Bonjour,', '', c.opco, `${c.nom}${c.infos ? `, ${c.infos}` : ''}`, ''];
  for (const b of c.budget) l.push(typeof b === 'string' ? b : `${b.fort}${b.suite ? `, ${b.suite}` : ''}`);
  if (c.fonds) l.push(...c.fonds.map((f) => `${f.nom} (${f.pour}) : ${f.criteres}`));
  if (c.bouton) l.push(`${c.bouton.texte} : ${c.bouton.url}`);
  l.push(...c.notes);
  if (c.sources.length) l.push('Pour vérifier vous-même :', ...c.sources.map((x) => `${x.quoi} : ${x.texte}, ${x.url}`));
  l.push('', 'Nous montons votre dossier de financement avec vous, et vous connaissez votre reste à charge avant de signer.', `Prendre rendez-vous (30 min) : ${RDV}`, '', 'Gabriel Vanderbecken', 'IA-Entrepreneur, organisme de formation certifié Qualiopi');
  return l.join('\n');
}

async function brevoUneFois(message) {
  const stop = new AbortController();
  const minuteur = setTimeout(() => stop.abort(), 10000);
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(message),
      signal: stop.signal,
    });
    if (!r.ok) {
      throw Object.assign(new Error(`brevo ${r.status} ${(await r.text()).slice(0, 200)}`), { rejouable: r.status === 429 || r.status >= 500 });
    }
  } catch (e) {
    // Réseau coupé avant la réponse : rejouable. Délai dépassé : Brevo a pu
    // envoyer, on ne rejoue pas, pour ne pas doubler l'email.
    if (e?.rejouable === undefined) e.rejouable = e?.name !== 'AbortError';
    throw e;
  } finally {
    clearTimeout(minuteur);
  }
}

// Une seconde tentative quand Brevo n'a sûrement rien envoyé (réseau, 429, 5xx).
async function brevo(message) {
  try {
    await brevoUneFois(message);
  } catch (e) {
    if (!e?.rejouable) throw e;
    await new Promise((fin) => setTimeout(fin, 800));
    await brevoUneFois(message);
  }
}

// --- Convention saisie par le visiteur ------------------------------------------

// Gabriel, 10/11/2026 : « au pire proposer de mettre manuellement l'IDCC ».
// Sirene ne montre pas toujours la convention (banc du 10/11 : 11 entreprises
// sur 23 « sans convention » avaient pourtant un OPCO). Quand l'outil ne
// trouve ni OPCO ni convention, le visiteur peut donner son IDCC (bulletin
// de paie). Il complète ce qui manque, jamais ce que la table officielle a
// dit pour cet établissement.
async function avecIdccSaisi(r, saisie) {
  if (r.etat !== 'trouve' || saisie === undefined || saisie === null || String(saisie).trim() === '') return r;
  if (r.opco && r.convention) return r; // rien ne manque : la saisie ne sert pas
  const chiffres = String(saisie).replace(/\D/g, '');
  const idcc = chiffres && chiffres.length <= 4 ? chiffres.padStart(4, '0') : null;
  const opco = idcc ? parIdcc(idcc) : null;
  if (!opco) return { ...r, idcc_saisi: 'inconnu' };
  const res = { ...r, idcc_saisi: idcc };
  if (!r.opco) {
    res.opco = opco;
    res.methode = 'idcc_saisi';
  }
  if (!r.opco || !r.convention) res.convention = await ficheConvention(idcc);
  return res;
}

// --- Effectif déclaré ---------------------------------------------------------

// Le visiteur peut donner son nombre de salariés (facultatif) : il le connaît
// mieux que l'Insee, dont la dernière tranche publiée date de 2024. Il
// remplace alors la tranche pour choisir le palier du barème.
function effectifDeclare(eff, valeur) {
  if (valeur === undefined || valeur === null || valeur === '') return eff;
  const n = Number(String(valeur).trim());
  if (!Number.isInteger(n) || n < 0 || n > 100000) return eff;
  return {
    ...eff,
    declare: n,
    bornes: [n, n],
    libelle: n === 0 ? 'aucun salarié' : `${n.toLocaleString('fr-FR')} salarié${n > 1 ? 's' : ''}`,
    insee: eff.libelle && !['NN', '00'].includes(eff.tranche) ? `${eff.libelle}${eff.annee ? ` en ${eff.annee}` : ''}` : null,
    annee: null,
    moins_de_50: n < 50,
  };
}

// --- La newsletter -------------------------------------------------------------

// Gabriel, 09/11/2026 : « ajoute les personnes qui ont fait des simulations
// dans la newsletter ». Base : prospection B2B (intérêt légitime, art. 6.1.f) ;
// le formulaire l'annonce et propose une case pour refuser, chaque newsletter
// porte un lien de désinscription (Brevo). Liste retrouvée par son nom, créée
// au premier usage, comme celle de FindIA (api/recap.js).
const NOM_LISTE = 'Newsletter IA-Entrepreneur';
let listeConnue = null;

async function listeNewsletter() {
  if (process.env.BREVO_LISTE_NEWSLETTER) return Number(process.env.BREVO_LISTE_NEWSLETTER);
  if (listeConnue) return listeConnue;
  const entetes = { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' };
  const lire = async (url, options) => {
    try {
      const r = await fetch(url, options);
      return r.ok ? await r.json() : null;
    } catch {
      return null;
    }
  };
  const existantes = await lire('https://api.brevo.com/v3/contacts/lists?limit=50', { headers: entetes });
  const deja = (existantes?.lists || []).find((l) => l.name === NOM_LISTE);
  if (deja) return (listeConnue = deja.id);
  const dossiers = await lire('https://api.brevo.com/v3/contacts/folders?limit=10&offset=0', { headers: entetes });
  const dossier = dossiers?.folders?.[0]?.id;
  if (!dossier) return null;
  const creee = await lire('https://api.brevo.com/v3/contacts/lists', {
    method: 'POST', headers: entetes, body: JSON.stringify({ name: NOM_LISTE, folderId: dossier }),
  });
  return (listeConnue = creee?.id || null);
}

async function inscrireNewsletter(email, r) {
  const liste = await listeNewsletter();
  if (!liste) throw new Error('liste newsletter introuvable');
  const ref = r.opco ? r.opco.gestion || r.opco : null;
  const envoyer = (attributs) => fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ email, updateEnabled: true, listIds: [liste], ...(attributs ? { attributes: attributs } : {}) }),
  });
  // De quoi parler à chacun de son secteur : entreprise, OPCO, convention.
  let rep = await envoyer({
    ENTREPRISE: r.entreprise?.nom || '',
    OPCO: ref ? ref.nom : '',
    CONVENTION: r.convention ? `${r.convention.titre || ''} (IDCC ${r.convention.idcc})`.trim() : '',
  });
  // Un attribut supprimé côté Brevo ne doit pas empêcher l'inscription.
  if (rep.status === 400) rep = await envoyer(null);
  if (!rep.ok && rep.status !== 204) throw new Error(`brevo contacts ${rep.status}`);
}

// --- Le CRM ------------------------------------------------------------------

function versCrm(r, email, page, newsletter, { envoi, doute }) {
  const o = r.opco;
  const ref = o ? o.gestion || o : null;
  const conv = r.convention;
  const nom = r.entreprise?.nom || nomEntreprise(r);
  const constat = [
    o ? `OPCO ${o.nom}${o.gestion ? ` (géré par ${o.gestion.nom})` : ''}${o.ambigu ? ' à confirmer' : ''}` : 'OPCO non trouvé (pas dans la table de France compétences)',
    conv && `convention ${conv.titre || ''} (IDCC ${conv.idcc}${r.idcc_saisi === conv.idcc ? ', indiquée par le visiteur' : ''})`.replace('  ', ' '),
    r.effectif.declare !== undefined
      ? `effectif déclaré ${r.effectif.libelle}${r.effectif.insee ? ` (Insee : ${r.effectif.insee})` : ''}`
      : r.effectif.libelle && `effectif ${r.effectif.libelle}${r.effectif.annee ? ` en ${r.effectif.annee}` : ''}`,
  ].filter(Boolean).join(', ');
  return enregistrerDemande({
    email,
    entreprise: nom,
    resume: `A demandé son budget formation sur le site : ${o ? o.nom : 'OPCO à vérifier'}`,
    detail: [
      `Page : ${page}`,
      envoi === 'ok'
        ? 'Outil : Quel est mon OPCO (SIRET), résultat envoyé par email'
        : `Outil : Quel est mon OPCO (SIRET). Email non parti (${envoi}) : lui envoyer son budget à la main`,
      `Email : ${email}`,
      `Entreprise : ${nom}${r.entreprise?.commune ? `, ${r.entreprise.commune}` : ''}`,
      `SIRET : ${r.siret || r.numero}`,
      `Trouvé : ${constat}`,
      ref && (() => {
        const b = !o.ambigu && baremePour(ref.code, conv?.idcc, r.effectif.tranche, r.effectif.bornes);
        if (b?.epuise) return `Annoncé : ${b.epuise} (${b.version}), lien ${b.lien}`;
        return b ? `Montant annoncé : ${b.paliers.map((p) => `${p.libelle} ${p.montant}`).join(' ; ')} (${b.version}), lien ${b.lien}` : `Lien envoyé : ${ref.criteres}`;
      })(),
      `Newsletter : ${newsletter ? 'inscrit' : 'refusée (case cochée)'}`,
      doute && `À vérifier : ${doute}`,
    ].filter(Boolean).join('\n'),
    source: 'Site : Quel est mon OPCO',
    tags: ['site', 'outil-opco'],
    besoin: `Budget formation demandé sur le site. ${constat}.`,
    prochaine_note: (envoi === 'ok' ? '' : "Son email n'est pas parti : lui envoyer son budget à la main. ") + (o
      ? `A demandé son budget formation (${o.nom}${o.gestion ? `, géré par ${o.gestion.nom}` : ''}) : lui écrire aujourd'hui, proposer de vérifier le barème de sa branche et de monter le dossier`
      : "A demandé son budget formation, OPCO non trouvé : lui écrire aujourd'hui pour vérifier s'il a des salariés"),
    champs: {
      siret: r.siret || r.numero,
      financeur: o ? ref.nom : null,
      secteur: conv?.titre || null,
      localisation: [r.entreprise?.code_postal, r.entreprise?.commune].filter(Boolean).join(' ') || null,
    },
  });
}

// --- Aucune demande perdue --------------------------------------------------------

// Gabriel, 12/11/2026 : « fais en sorte que quelqu'un qui fait une demande
// reçoive son budget et que moi je reçoive la lead ». Jusque-là, un champ
// caché (« site_web ») arrivé rempli faisait répondre « envoyé » sans rien
// faire. Le remplissage automatique de son navigateur l'avait rempli : sa
// demande Lilycosy du 12/11 n'a donné ni email, ni alerte, ni lead, alors que
// la page affichait « C'est envoyé ». Plus rien n'est jeté. Restent l'origine,
// la limite par IP, l'adresse vérifiée (domaine qui reçoit des emails, pas
// d'adresse jetable) et un email entièrement reconstruit ici. Un formulaire
// envoyé très vite après son affichage est seulement signalé à Gabriel.
const TROP_RAPIDE_MS = 1500;

function doute(corps) {
  if (corps.duree === undefined || corps.duree === null || corps.duree === '') return null;
  const duree = Number(corps.duree);
  if (!Number.isFinite(duree) || duree < 0 || duree >= TROP_RAPIDE_MS) return null;
  return `formulaire envoyé ${(duree / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} s après son affichage, peut-être un robot`;
}

async function auCrm(enregistrer) {
  if (!crmDisponible()) return 'CRM non configuré';
  try {
    await enregistrer();
    return 'ok';
  } catch (e) {
    console.error('opco crm', e?.message || e);
    return `erreur : ${String(e?.message || e).slice(0, 160)}`;
  }
}

// L'alerte à Gabriel, envoyée quoi qu'il arrive : elle dit si le visiteur a
// reçu son budget et si le lead est dans le CRM, et quoi faire sinon.
async function prevenir({ r, siret, email, page, newsletter, envoi, crm, suspect, nom }) {
  if (!NOTIFICATION || !envoiPossible()) return;
  const trouve = r && r.etat === 'trouve';
  const entreprise = trouve ? r.entreprise?.nom || nom || nomEntreprise(r) : `SIRET ${siret}`;
  const lignes = [
    envoi === 'ok'
      ? `${email} vient de recevoir son budget formation (page ${page}).`
      : `${email} a demandé son budget formation (page ${page}), mais l'email n'est pas parti (${envoi}). Lui envoyer son budget à la main aujourd'hui.`,
    '',
    `Entreprise : ${entreprise}${trouve && r.entreprise?.commune ? `, ${r.entreprise.commune}` : ''}`,
    `SIRET : ${trouve ? r.siret || r.numero : siret}`,
    trouve && `OPCO : ${r.opco ? r.opco.nom : 'non trouvé'}`,
    trouve && r.convention && `Convention : ${r.convention.titre || ''} (IDCC ${r.convention.idcc})`,
    trouve && r.effectif.libelle && `Effectif : ${r.effectif.libelle}${r.effectif.declare !== undefined ? ' (déclaré par le visiteur)' : r.effectif.annee ? ` (Insee ${r.effectif.annee})` : ''}`,
    `Newsletter : ${newsletter ? 'inscrit' : 'refusée'}`,
    suspect && `À vérifier : ${suspect}.`,
    '',
    crm === 'ok'
      ? `Le lead est dans le CRM, à traiter aujourd'hui : ${SITE}/crm/`
      : `Le lead n'a pas pu être enregistré dans le CRM (${crm}) : le créer à la main.`,
  ];
  try {
    await brevo({
      sender: { email: EXPEDITEUR, name: 'Site IA-Entrepreneur' },
      to: [{ email: NOTIFICATION }],
      replyTo: { email },
      subject: `Lead outil OPCO : ${entreprise}${trouve && r.opco ? ` (${r.opco.nom})` : ''}${envoi === 'ok' ? '' : ', email à lui envoyer'}`,
      textContent: lignes.filter((l) => l !== null && l !== undefined && l !== false).join('\n'),
      tags: ['outil-opco-notification'],
    });
  } catch (e) {
    console.error('opco notification', e?.message || e);
  }
}

// --- Handler ------------------------------------------------------------------

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ erreur: 'methode_non_autorisee' });
  }
  if (origineEtrangere(req)) {
    return res.status(403).json({ erreur: 'origine_refusee' });
  }
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'inconnue').split(',')[0].trim();

  if (req.method === 'GET') {
    if (tropDeDemandes('lecture', ip)) return res.status(429).json({ erreur: 'trop_de_demandes' });
    const r = await avecIdccSaisi(await rechercher(req.query?.siret || req.query?.numero), req.query?.idcc);
    return res.status(200).json(publique(r));
  }

  let corps = req.body;
  if (typeof corps === 'string') { try { corps = JSON.parse(corps); } catch { corps = {}; } }
  corps = corps && typeof corps === 'object' ? corps : {};

  // Plus de champ piège : il faisait répondre « envoyé » sans rien faire, et le
  // remplissage automatique du navigateur le remplissait (voir doute()). Un
  // ancien script encore en cache peut l'envoyer : il est ignoré.
  const email = String(corps.email || '').trim().toLowerCase();
  if (email.length < 6 || email.length > 254 || !EMAIL_RE.test(email)) {
    return res.status(400).json({ erreur: 'email_invalide' });
  }
  if (tropDeDemandes('envoi', ip)) return res.status(429).json({ erreur: 'trop_de_demandes' });
  // Une faute de frappe dans le domaine (gmial.com) ferait croire au visiteur
  // que son budget arrive : on le lui dit tout de suite, comme la page de RDV.
  const motif = await emailRefuse(email);
  if (motif) return res.status(400).json({ erreur: motif === 'jetable' ? 'email_jetable' : 'email_domaine' });

  const page = /^\/[a-z0-9\-/.]{0,120}$/i.test(String(corps.page || '')) ? corps.page : '/quel-est-mon-opco.html';
  const newsletter = corps.newsletter !== false; // seule la case « je ne souhaite pas » l'enlève
  const suspect = doute(corps);

  const r = await avecIdccSaisi(await rechercher(corps.siret || corps.numero), corps.idcc);
  if (r.etat !== 'trouve') {
    if (r.etat !== 'indisponible') return res.status(400).json({ erreur: r.etat });
    // Les registres ne répondent plus au moment de l'envoi (le résultat de
    // l'écran n'est gardé que sur l'instance qui l'a calculé). Le visiteur a
    // laissé son adresse : sa demande arrive quand même chez Gabriel.
    const siret = String(corps.siret || corps.numero || '').replace(/\D/g, '').slice(0, 14);
    const envoi = 'registres publics injoignables au moment de l\'envoi';
    const crm = await auCrm(() => enregistrerDemande({
      email,
      entreprise: `SIRET ${siret}`,
      resume: 'A demandé son budget formation sur le site : email non parti, à lui envoyer',
      detail: [`Page : ${page}`, `Outil : Quel est mon OPCO (SIRET). Email non parti (${envoi}) : lui envoyer son budget à la main`, `Email : ${email}`, `SIRET : ${siret}`, `Newsletter : ${newsletter ? 'oui' : 'refusée (case cochée)'}`, suspect && `À vérifier : ${suspect}`].filter(Boolean).join('\n'),
      source: 'Site : Quel est mon OPCO',
      tags: ['site', 'outil-opco'],
      besoin: 'Budget formation demandé sur le site.',
      prochaine_note: "Son email n'est pas parti (registres injoignables) : chercher son OPCO sur ia-entrepreneur.fr/quel-est-mon-opco.html et lui envoyer son budget",
      champs: { siret },
    }));
    await prevenir({ r: null, siret, email, page, newsletter, envoi, crm, suspect });
    return res.status(503).json({ erreur: 'indisponible' });
  }
  r.effectif = effectifDeclare(r.effectif, corps.salaries);
  const message = contenu(r);

  let envoi = 'ok';
  if (!envoiPossible()) {
    envoi = 'Brevo non configuré';
  } else {
    try {
      await brevo({
        sender: { email: EXPEDITEUR, name: EXPEDITEUR_NOM },
        to: [{ email }],
        replyTo: { email: EXPEDITEUR, name: EXPEDITEUR_NOM },
        subject: message.sujet,
        htmlContent: versHtml(message),
        textContent: versTexte(message),
        tags: ['outil-opco'],
      });
    } catch (e) {
      console.error('opco brevo', e?.message || e);
      envoi = `refusé par Brevo : ${String(e?.message || e).slice(0, 160)}`;
    }
  }

  // Le lead après l'envoi, pour que le CRM dise si l'email est parti. Puis
  // Gabriel est prévenu dans tous les cas, échec compris.
  const crm = await auCrm(() => versCrm(r, email, page, newsletter, { envoi, doute: suspect }));
  if (envoi === 'ok' && newsletter) {
    try { await inscrireNewsletter(email, r); } catch (e) { console.error('opco newsletter', e?.message || e); }
  }
  await prevenir({ r, email, page, newsletter, envoi, crm, suspect, nom: message.nom });

  // Email non parti : la page donne les liens tout de suite, et dit que nous
  // lui envoyons son budget nous-mêmes (Gabriel est prévenu, le lead est posé).
  if (!envoiPossible()) return res.status(503).json({ erreur: 'envoi_indisponible', liens: liens(r) });
  if (envoi !== 'ok') return res.status(502).json({ erreur: 'envoi_impossible', liens: liens(r) });
  return res.status(200).json({ ok: true });
}

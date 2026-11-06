/**
 * /api/demande : les demandes des formulaires du site (devis, contact, liste
 * d'attente, AI Act) vont dans le CRM de Gabriel ET dans HubSpot (son choix du
 * 06/11/2026 : « les 2 »). Formspree continue d'envoyer l'email de notification :
 * la page poste aux deux, sans attendre cette route, donc une panne ici ne
 * bloque jamais le visiteur.
 *
 *   POST /api/demande { prenom, nom?, email, entreprise?, telephone?, message?,
 *                       type?, niveau?, participants?, duree?, page?, _gotcha? }
 *
 * Route publique, donc prudente : origine vérifiée, champ piège (_gotcha),
 * 5 demandes par IP et par 10 minutes, champs bornés, rien de ce qui est reçu
 * n'est renvoyé. Réponse toujours { ok: true } (pas d'indice pour un robot).
 *
 * CRM : un lead « Nouveau » à rappeler le jour même (ou une ligne d'historique
 * sur le lead existant si l'email est connu), source « Site : <page> ».
 * HubSpot : contact créé ou mis à jour par email, propriétaire = la setter
 * (les appels entrants du site vont déjà à Anna), plus une note avec la demande.
 *
 * Variables : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (déjà là) ;
 *   HUBSPOT_TOKEN  jeton d'application privée HubSpot (contacts et notes en
 *       écriture). Sans lui, seul le CRM reçoit la demande.
 *   HUBSPOT_PROPRIETAIRE  facultatif, id du propriétaire (défaut : Anna).
 */

export const maxDuration = 15;

const HOTES = ['ia-entrepreneur.fr', 'www.ia-entrepreneur.fr'];
const EMAIL_RE = /^[^@\s<>,;"]+@[^@\s<>,;".]+(\.[^@\s<>,;".]+)+$/;
const PROPRIETAIRE_DEFAUT = '39531283'; // Anna Nilsen, setter
const FENETRE_MS = 10 * 60 * 1000;
const passages = new Map();

const LIBELLES = {
  'devis-formation-entreprise': 'Devis formation entreprise',
  'devis-formation-ai-act': 'Devis formation AI Act',
  'liste-attente-formation': "Liste d'attente formation",
};

function texte(v, max) {
  const t = String(v ?? '').replace(/\u0000/g, '').trim();
  return t ? t.slice(0, max) : null;
}

function origineAutorisee(req) {
  const o = req.headers.origin || req.headers.referer;
  if (!o) return false;
  try {
    const h = new URL(o).hostname;
    return HOTES.includes(h) || h.endsWith('.vercel.app') || h === 'localhost' || h === '127.0.0.1';
  } catch {
    return false;
  }
}

function tropDePassages(ip) {
  const maintenant = Date.now();
  const r = (passages.get(ip) || []).filter((t) => maintenant - t < FENETRE_MS);
  if (passages.size > 5000) passages.clear();
  if (r.length >= 5) return true;
  r.push(maintenant);
  passages.set(ip, r);
  return false;
}

async function sb(chemin, { methode = 'GET', corps, prefer } = {}) {
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${chemin}`, {
    method: methode,
    headers: { apikey: cle, Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  if (!r.ok) throw new Error(`supabase ${r.status} ${(await r.text()).slice(0, 200)}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

function aujourdhui() {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

async function versCrm(d) {
  const resume = `Demande depuis le site (${d.libelle})${d.entreprise ? ` : ${d.entreprise}` : ''}`;
  const detail = [
    `Page : ${d.page}`, `Formulaire : ${d.libelle}`,
    `Nom : ${[d.prenom, d.nom].filter(Boolean).join(' ')}`, `Email : ${d.email}`,
    d.telephone && `Téléphone : ${d.telephone}`, d.entreprise && `Entreprise : ${d.entreprise}`,
    d.participants && `Participants : ${d.participants}`, d.niveau && `Niveau : ${d.niveau}`, d.duree && `Durée : ${d.duree}`,
    d.message && `Message :\n${d.message}`,
  ].filter(Boolean).join('\n');
  const suite = {
    prochaine_relance: aujourdhui(),
    prochaine_action: d.telephone ? 'appel' : 'email',
    prochaine_note: `Nouvelle demande du site (${d.libelle}) : répondre aujourd'hui`,
  };
  // Email déjà connu : la demande va dans l'historique du lead existant.
  const connus = await sb(`iae_crm_contacts?select=id,lead_id&email=ilike.${encodeURIComponent(d.email)}&limit=1`);
  if (connus.length) {
    const { lead_id: leadId, id: contactId } = connus[0];
    await sb('iae_crm_activites', { methode: 'POST', corps: { lead_id: leadId, contact_id: contactId, type: 'email_recu', resume, contenu: detail, source: 'site' }, prefer: 'return=minimal' });
    await sb(`iae_crm_leads?id=eq.${leadId}`, { methode: 'PATCH', corps: { ...suite, archive: false, relances_sans_reponse: 0, dernier_contact: aujourdhui() }, prefer: 'return=minimal' });
    return;
  }
  const [lead] = await sb('iae_crm_leads', {
    methode: 'POST',
    prefer: 'return=representation',
    corps: {
      entreprise: d.entreprise || [d.prenom, d.nom].filter(Boolean).join(' ') || d.email,
      type: 'prospect', statut: 'nouveau', source: `Site : ${d.libelle}`, tags: ['site'],
      besoin: [d.niveau, d.participants && `${d.participants} participants`, d.duree, d.message && d.message.slice(0, 400)].filter(Boolean).join(', ') || null,
      dernier_contact: aujourdhui(), ...suite,
    },
  });
  const [contact] = await sb('iae_crm_contacts', { methode: 'POST', prefer: 'return=representation', corps: { lead_id: lead.id, prenom: d.prenom, nom: d.nom, email: d.email, telephone: d.telephone, principal: true } });
  await sb('iae_crm_activites', { methode: 'POST', corps: { lead_id: lead.id, contact_id: contact.id, type: 'email_recu', resume, contenu: detail, source: 'site' }, prefer: 'return=minimal' });
}

async function versHubspot(d) {
  const jeton = process.env.HUBSPOT_TOKEN;
  if (!jeton) return;
  const entetes = { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' };
  const proprietes = {
    email: d.email, firstname: d.prenom, lastname: d.nom, company: d.entreprise, phone: d.telephone,
    hubspot_owner_id: process.env.HUBSPOT_PROPRIETAIRE || PROPRIETAIRE_DEFAUT,
  };
  const r = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert', {
    method: 'POST',
    headers: entetes,
    body: JSON.stringify({ inputs: [{ idProperty: 'email', id: d.email, properties: Object.fromEntries(Object.entries(proprietes).filter(([, v]) => v)) }] }),
  });
  if (!r.ok) throw new Error(`hubspot contact ${r.status} ${(await r.text()).slice(0, 200)}`);
  const contactId = (await r.json()).results?.[0]?.id;
  if (!contactId) return;
  const note = [`Demande depuis le site (${d.libelle}), page ${d.page}`, d.entreprise && `Entreprise : ${d.entreprise}`,
    d.participants && `Participants : ${d.participants}`, d.niveau && `Niveau : ${d.niveau}`, d.duree && `Durée : ${d.duree}`,
    d.message && `Message : ${d.message}`].filter(Boolean)
    .map((ligne) => ligne.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>'))
    .join('<br>');
  const n = await fetch('https://api.hubapi.com/crm/v3/objects/notes', {
    method: 'POST',
    headers: entetes,
    body: JSON.stringify({
      properties: { hs_timestamp: new Date().toISOString(), hs_note_body: note },
      associations: [{ to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }] }],
    }),
  });
  if (!n.ok) throw new Error(`hubspot note ${n.status} ${(await n.text()).slice(0, 200)}`);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erreur: 'methode' });
  }
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '?').split(',')[0].trim();
  let corps = req.body;
  if (typeof corps === 'string') { try { corps = JSON.parse(corps); } catch { corps = {}; } }
  corps = corps && typeof corps === 'object' ? corps : {};
  // Robot, origine inconnue ou trop de demandes : on répond pareil, sans rien enregistrer.
  if (!origineAutorisee(req) || texte(corps._gotcha, 10) || tropDePassages(ip)) return res.status(200).json({ ok: true });
  const email = texte(corps.email, 254);
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ erreur: 'email' });
  const type = texte(corps.type, 60);
  const d = {
    email,
    prenom: texte(corps.prenom, 80), nom: texte(corps.nom, 80), entreprise: texte(corps.entreprise, 160),
    telephone: texte(corps.telephone || corps.tel, 40), message: texte(corps.message, 5000),
    niveau: texte(corps.niveau, 120), participants: texte(corps.participants, 60), duree: texte(corps.duree, 60),
    page: texte(corps.page, 120) || '/', libelle: LIBELLES[type] || (type ? type.replace(/-/g, ' ') : 'Contact'),
  };
  const resultats = await Promise.allSettled([
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? versCrm(d) : Promise.resolve(),
    versHubspot(d),
  ]);
  resultats.forEach((r, i) => { if (r.status === 'rejected') console.error(i ? 'demande hubspot' : 'demande crm', r.reason?.message || r.reason); });
  return res.status(200).json({ ok: true });
}

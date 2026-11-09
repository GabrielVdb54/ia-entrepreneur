/**
 * _crm-site.js — une demande venue du site entre dans le CRM de Gabriel.
 *
 * Partagé par /api/demande (formulaires de devis, contact, liste d'attente)
 * et /api/opco (l'outil « Quel est mon OPCO ? »), pour que la règle reste la
 * même partout :
 *   · email déjà connu → une ligne d'historique sur le lead existant, remis à
 *     traiter aujourd'hui ;
 *   · sinon → un lead « Nouveau », son contact principal et la ligne
 *     d'historique, à traiter aujourd'hui.
 *
 * Variables : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (les tables du CRM n'ont
 * aucune policy : seule la clé de service, côté serveur, y écrit).
 */

export function crmDisponible() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function sb(chemin, { methode = 'GET', corps, prefer } = {}) {
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

export function aujourdhui() {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/**
 * d : { email, prenom?, nom?, telephone?, entreprise?, resume, detail,
 *       source, tags, besoin?, prochaine_note, champs? }
 * `champs` complète un nouveau lead (siret, financeur, secteur, localisation…)
 * et, sur un lead existant, ne remplit que les colonnes encore vides.
 */
export async function enregistrerDemande(d) {
  const suite = {
    prochaine_relance: aujourdhui(),
    prochaine_action: d.telephone ? 'appel' : 'email',
    prochaine_note: d.prochaine_note,
  };
  const champs = Object.fromEntries(Object.entries(d.champs || {}).filter(([, v]) => v !== null && v !== undefined && v !== ''));

  // Email déjà connu : la demande va dans l'historique du lead existant.
  const connus = await sb(`iae_crm_contacts?select=id,lead_id&email=ilike.${encodeURIComponent(d.email)}&limit=1`);
  if (connus.length) {
    const { lead_id: leadId, id: contactId } = connus[0];
    await sb('iae_crm_activites', { methode: 'POST', corps: { lead_id: leadId, contact_id: contactId, type: 'email_recu', resume: d.resume, contenu: d.detail, source: 'site' }, prefer: 'return=minimal' });
    await sb(`iae_crm_leads?id=eq.${leadId}`, { methode: 'PATCH', corps: { ...suite, archive: false, relances_sans_reponse: 0, dernier_contact: aujourdhui() }, prefer: 'return=minimal' });
    // Ce qu'on vient d'apprendre (SIRET, OPCO…) ne remplace jamais une
    // valeur déjà saisie à la main.
    for (const [col, val] of Object.entries(champs)) {
      await sb(`iae_crm_leads?id=eq.${leadId}&${col}=is.null`, { methode: 'PATCH', corps: { [col]: val }, prefer: 'return=minimal' });
    }
    return { lead: leadId, nouveau: false };
  }
  const [lead] = await sb('iae_crm_leads', {
    methode: 'POST',
    prefer: 'return=representation',
    corps: {
      entreprise: d.entreprise || [d.prenom, d.nom].filter(Boolean).join(' ') || d.email,
      type: 'prospect', statut: 'nouveau', source: d.source, tags: d.tags,
      besoin: d.besoin || null,
      dernier_contact: aujourdhui(), ...suite, ...champs,
    },
  });
  const [contact] = await sb('iae_crm_contacts', { methode: 'POST', prefer: 'return=representation', corps: { lead_id: lead.id, prenom: d.prenom || null, nom: d.nom || null, email: d.email, telephone: d.telephone || null, principal: true } });
  await sb('iae_crm_activites', { methode: 'POST', corps: { lead_id: lead.id, contact_id: contact.id, type: 'email_recu', resume: d.resume, contenu: d.detail, source: 'site' }, prefer: 'return=minimal' });
  return { lead: lead.id, nouveau: true };
}

-- La file LinkedIn du CRM (07-09/11/2026) : Gabriel valide une invitation ou un message dans le CRM,
-- son Mac l'envoie avec le MCP LinkedIn et rend compte ; chaque matin, le Mac relève les acceptations
-- et les réponses. Aucune politique RLS : seul le serveur (clé service) lit et écrit.

create table if not exists public.iae_crm_linkedin (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id uuid not null references public.iae_crm_leads(id) on delete cascade,
  contact_id uuid not null references public.iae_crm_contacts(id) on delete cascade,
  type text not null check (type in ('invitation', 'message')),
  etape text not null check (etape in ('invitation', 'message', 'relance', 'findia', 'reponse')),
  texte text check (texte is null or char_length(texte) <= 8000),
  statut text not null default 'brouillon' check (statut in ('brouillon', 'a_envoyer', 'en_cours', 'envoye', 'echec', 'a_verifier', 'annule')),
  valide_le timestamptz,
  pris_le timestamptz,
  envoye_le timestamptz,
  detail text,
  resultat jsonb
);
create index if not exists iae_crm_linkedin_statut on public.iae_crm_linkedin (statut);
create index if not exists iae_crm_linkedin_contact on public.iae_crm_linkedin (contact_id);
alter table public.iae_crm_linkedin enable row level security;

-- Où en est chaque personne sur LinkedIn : invitation envoyée (date), relation, invitation à retirer.
-- linkedin_vu garde le dernier message reçu d'elle, pour ne signaler une réponse qu'une fois.
alter table public.iae_crm_contacts
  add column if not exists linkedin_etat text check (linkedin_etat is null or linkedin_etat in ('invitation_envoyee', 'relation', 'a_retirer')),
  add column if not exists linkedin_le timestamptz,
  add column if not exists linkedin_vu text;

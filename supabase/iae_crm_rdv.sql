-- Prise de rendez-vous en tour de rôle (10/11/2026), remplace la page HubSpot : api/rdv.js.
-- Une ligne par RDV posé par /rendez-vous.html : elle sert à équilibrer le tour de rôle
-- (RDV de la semaine par conseiller) et à départager deux réservations simultanées
-- du même créneau (index unique). Aucune donnée du prospect ici : elles sont dans le lead.
-- Comme le reste du CRM : RLS activée sans aucune policy, seule la clé de service écrit.
create table if not exists public.iae_crm_rdv (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  conseiller  text not null check (conseiller ~ '^[a-z0-9._-]+@ia-entrepreneur\.fr$'),
  debut       timestamptz not null,
  fin         timestamptz not null check (fin > debut),
  statut      text not null default 'pose' check (statut in ('pose', 'annule')),
  source      text not null default 'site' check (source in ('site', 'setter')),
  setter      text,
  lead_id     uuid references public.iae_crm_leads(id) on delete set null,
  evenement   text,
  meet        text
);
create unique index if not exists iae_crm_rdv_creneau on public.iae_crm_rdv (conseiller, debut) where statut = 'pose';
create index if not exists iae_crm_rdv_debut on public.iae_crm_rdv (debut);
alter table public.iae_crm_rdv enable row level security;
revoke all on public.iae_crm_rdv from anon, authenticated;

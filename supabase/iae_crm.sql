-- CRM personnel de Gabriel (/crm/, /api/crm). Projet Supabase partagé avec
-- Clindit : tout est préfixé iae_crm_ pour ne jamais se mélanger à ses tables.
--
-- RLS activée et AUCUNE policy, comme quiz_reponses : la clé anon, publique,
-- ne peut ni lire ni écrire. Seule api/crm.js y accède, avec
-- SUPABASE_SERVICE_ROLE_KEY, qui ne quitte jamais le serveur. Ces tables
-- contiennent des noms, emails et téléphones de prospects.
--
-- Les données ne passent jamais par le dépôt (public) : elles sont importées
-- directement dans la base.

create table if not exists public.iae_crm_leads (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  entreprise            text not null,
  type                  text not null default 'prospect'
                        check (type in ('prospect', 'client', 'partenaire', 'fournisseur', 'formateur')),
  statut                text not null default 'nouveau'
                        check (statut in ('nouveau', 'contacte', 'qualifie', 'proposition', 'negociation', 'gagne', 'perdu')),
  secteur               text,
  telephone             text,
  site_web              text,
  localisation          text,
  adresse               text,
  siret                 text,
  valeur                numeric(12, 2),
  besoin                text,
  service               text,
  budget                text,
  source                text,                 -- Pomolow, BNI Moncel-lès-Lunéville, recommandation…
  tags                  text[] not null default '{}',
  prochaine_relance     date,                 -- null = rien de prévu
  prochaine_action      text not null default 'email'
                        check (prochaine_action in ('email', 'appel', 'rdv', 'autre')),
  prochaine_note        text,                 -- « Appel prévu avec Eric », « RDV à 10 h »…
  relances_sans_reponse integer not null default 0,
  dernier_contact       date,
  raison_perte          text,
  hubspot_id            text,
  archive               boolean not null default false,
  recap                 jsonb,                -- récap de la relation fait par Claude
  recap_le              timestamptz,
  tache_fil             text,                 -- fil Gmail de la tâche en cours
  -- Suivi client après « Gagné » (06/11/2026)
  suivi                 text check (suivi in ('a_lancer', 'financement_demande', 'financement_accepte', 'programme_valide', 'dates_placees',
                                              'convention_signee', 'convocations', 'formation_terminee', 'facturee', 'payee')),
  formation_debut       date,
  formation_fin         date,
  financeur             text,
  financement_ref       text
);

create table if not exists public.iae_crm_contacts (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id    uuid not null references public.iae_crm_leads (id) on delete cascade,
  prenom     text,
  nom        text,
  email      text,
  telephone  text,
  poste      text,
  principal  boolean not null default false,
  notes      text,
  linkedin   text                           -- URL du profil LinkedIn
);

-- Le journal : tout ce qui s'est passé avec un lead, d'où que ça vienne
-- (CRM, export Pomolow, Gmail, conversations avec Claude, HubSpot…).
create table if not exists public.iae_crm_activites (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id    uuid not null references public.iae_crm_leads (id) on delete cascade,
  contact_id uuid references public.iae_crm_contacts (id) on delete set null,
  date       timestamptz not null default now(),
  type       text not null
             check (type in ('note', 'appel', 'appel_sans_reponse', 'email_envoye', 'email_recu',
                                 'brouillon', 'rdv', 'sms', 'relance_decalee', 'statut', 'import', 'linkedin', 'avis', 'paiement')),
  resume     text not null,
  contenu    text,
  source     text not null default 'crm',
  meta       jsonb
);

create table if not exists public.iae_crm_memos (
  id         uuid primary key default gen_random_uuid(),
  updated_at timestamptz not null default now(),
  categorie  text not null,
  titre      text not null,
  contenu    text not null,
  sources    text[] not null default '{}',
  date_maj   date,
  ordre      integer not null default 0
);

create table if not exists public.iae_crm_modeles (
  id         uuid primary key default gen_random_uuid(),
  updated_at timestamptz not null default now(),
  nom        text not null,
  usage      text,
  objet      text not null,
  corps      text not null,
  ordre      integer not null default 0,
  canal      text not null default 'email' check (canal in ('email', 'sms'))
);

create table if not exists public.iae_crm_reglages (
  cle        text primary key,
  valeur     jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists iae_crm_leads_relance on public.iae_crm_leads (archive, prochaine_relance);
create index if not exists iae_crm_contacts_lead on public.iae_crm_contacts (lead_id);
create index if not exists iae_crm_activites_lead on public.iae_crm_activites (lead_id, date desc);
create index if not exists iae_crm_activites_contact on public.iae_crm_activites (contact_id);

create or replace function public.iae_crm_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists iae_crm_leads_touch on public.iae_crm_leads;
create trigger iae_crm_leads_touch before update on public.iae_crm_leads
  for each row execute function public.iae_crm_touch();
drop trigger if exists iae_crm_memos_touch on public.iae_crm_memos;
create trigger iae_crm_memos_touch before update on public.iae_crm_memos
  for each row execute function public.iae_crm_touch();
drop trigger if exists iae_crm_modeles_touch on public.iae_crm_modeles;
create trigger iae_crm_modeles_touch before update on public.iae_crm_modeles
  for each row execute function public.iae_crm_touch();
drop trigger if exists iae_crm_reglages_touch on public.iae_crm_reglages;
create trigger iae_crm_reglages_touch before update on public.iae_crm_reglages
  for each row execute function public.iae_crm_touch();

alter table public.iae_crm_leads     enable row level security;
alter table public.iae_crm_contacts  enable row level security;
alter table public.iae_crm_activites enable row level security;
alter table public.iae_crm_memos     enable row level security;
alter table public.iae_crm_modeles   enable row level security;
alter table public.iae_crm_reglages  enable row level security;

-- Ceinture et bretelles : même si une policy était ajoutée par erreur, les
-- rôles publics n'ont aucun droit sur ces tables.
revoke all on public.iae_crm_leads, public.iae_crm_contacts, public.iae_crm_activites,
              public.iae_crm_memos, public.iae_crm_modeles, public.iae_crm_reglages
  from anon, authenticated;
revoke execute on function public.iae_crm_touch() from anon, authenticated, public;

-- Messages et RDV de personnes qui ne sont pas encore dans le CRM (« À trier »).
create table if not exists public.iae_crm_entrants (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  recu_le     timestamptz not null,
  canal       text not null check (canal in ('email', 'agenda', 'site')),
  de_email    text,
  de_nom      text,
  objet       text,
  extrait     text,
  ref_externe text unique,                   -- id Gmail ou agenda:<événement>:<email>
  fil         text,
  statut      text not null default 'a_trier' check (statut in ('a_trier', 'cree', 'rattache', 'ignore')),
  lead_id     uuid references public.iae_crm_leads (id) on delete set null,
  meta        jsonb
);
create index if not exists iae_crm_entrants_statut on public.iae_crm_entrants (statut, recu_le desc);
create index if not exists iae_crm_contacts_email on public.iae_crm_contacts (lower(email));
alter table public.iae_crm_entrants enable row level security;
revoke all on public.iae_crm_entrants from anon, authenticated;

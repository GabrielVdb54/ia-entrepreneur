-- Le CRM à plusieurs (10/11/2026) : Gabriel garde tout, chaque membre de
-- l'équipe (closers, setter) n'accède qu'à ses leads.
--
-- Demande de Gabriel : « on arrête HubSpot… il va utiliser le CRM que je suis
-- en train de me faire ». Décisions du 10/11 : Dorian est closer ; chacun a son
-- accès, ne voit que ses leads et envoie depuis sa propre boîte ; Gabriel voit tout.
--
-- Qui voit quoi : la colonne visible_par (tableau d'adresses). Sur un lead, elle
-- vaut [propriétaire, setter] ; les contacts, le journal et les emails « À trier »
-- la recopient (déclencheurs). api/_equipe.js ajoute « visible_par contient
-- mon adresse » à chaque lecture, modification ou suppression faite par un
-- membre de l'équipe : un oubli dans le code ne peut pas montrer la fiche d'un autre.
-- Gabriel (clé CRM_CLE) n'a aucun filtre.
--
-- Comme le reste du CRM : RLS activée sans aucune policy, seule la clé de
-- service (côté serveur) lit et écrit.

-- 1. Les membres de l'équipe. Gabriel n'y figure pas : sa clé reste CRM_CLE.
create table if not exists public.iae_crm_utilisateurs (
  email       text primary key check (email ~ '^[a-z0-9._-]+@ia-entrepreneur\.fr$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  prenom      text not null,
  nom         text,
  role        text not null check (role in ('closer', 'setter')),
  fonction    text,                         -- « Conseillère formation IA »… (consignes de Claude)
  telephone   text,
  actif       boolean not null default true,
  cle_hash    text unique,                  -- SHA-256 de la clé personnelle, jamais la clé
  cle_le      timestamptz,
  google      jsonb                         -- { refresh: chiffré AES-256-GCM, email, le }
);
alter table public.iae_crm_utilisateurs enable row level security;
revoke all on public.iae_crm_utilisateurs from anon, authenticated;

-- 2. Les leads : propriétaire (le closer, ou Gabriel) et setter (qui a posé le RDV).
alter table public.iae_crm_leads add column if not exists proprietaire text not null default 'gabriel@ia-entrepreneur.fr';
alter table public.iae_crm_leads add column if not exists setter text;
alter table public.iae_crm_leads add column if not exists visible_par text[]
  generated always as (array_remove(array[proprietaire, setter], null)) stored;
create index if not exists iae_crm_leads_visible on public.iae_crm_leads using gin (visible_par);
create index if not exists iae_crm_leads_proprietaire on public.iae_crm_leads (proprietaire);

-- 3. Contacts et journal : recopient visible_par de leur lead.
alter table public.iae_crm_contacts  add column if not exists visible_par text[] not null default '{gabriel@ia-entrepreneur.fr}';
alter table public.iae_crm_activites add column if not exists visible_par text[] not null default '{gabriel@ia-entrepreneur.fr}';
create index if not exists iae_crm_contacts_visible  on public.iae_crm_contacts  using gin (visible_par);
create index if not exists iae_crm_activites_visible on public.iae_crm_activites using gin (visible_par);

create or replace function public.iae_crm_visible_du_lead() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.visible_par := coalesce((select l.visible_par from public.iae_crm_leads l where l.id = new.lead_id), '{}');
  return new;
end $$;

drop trigger if exists iae_crm_contacts_visible on public.iae_crm_contacts;
create trigger iae_crm_contacts_visible before insert or update of lead_id, visible_par on public.iae_crm_contacts
  for each row execute function public.iae_crm_visible_du_lead();
drop trigger if exists iae_crm_activites_visible on public.iae_crm_activites;
create trigger iae_crm_activites_visible before insert or update of lead_id, visible_par on public.iae_crm_activites
  for each row execute function public.iae_crm_visible_du_lead();

-- Un lead change de propriétaire ou de setter : ses contacts et son journal suivent.
create or replace function public.iae_crm_visible_propager() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.visible_par is distinct from old.visible_par then
    update public.iae_crm_contacts  set visible_par = new.visible_par where lead_id = new.id;
    update public.iae_crm_activites set visible_par = new.visible_par where lead_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists iae_crm_leads_visible on public.iae_crm_leads;
create trigger iae_crm_leads_visible after update of proprietaire, setter on public.iae_crm_leads
  for each row execute function public.iae_crm_visible_propager();

revoke all on function public.iae_crm_visible_du_lead() from public, anon, authenticated;
revoke all on function public.iae_crm_visible_propager() from public, anon, authenticated;

-- 4. « À trier » : chaque boîte a les siens. Un id Gmail n'est unique que dans
-- sa boîte, et une invitation d'agenda porte le même id chez tous les invités.
alter table public.iae_crm_entrants add column if not exists proprietaire text not null default 'gabriel@ia-entrepreneur.fr';
alter table public.iae_crm_entrants add column if not exists visible_par text[]
  generated always as (array[proprietaire]) stored;
alter table public.iae_crm_entrants drop constraint if exists iae_crm_entrants_ref_externe_key;
create unique index if not exists iae_crm_entrants_ref_par_boite on public.iae_crm_entrants (proprietaire, ref_externe);
create index if not exists iae_crm_entrants_visible on public.iae_crm_entrants using gin (visible_par);

-- 5. Mémo : une fiche « privée » reste à Gabriel (ses leads perso, ses boîtes, le partenariat).
alter table public.iae_crm_memos add column if not exists prive boolean not null default false;

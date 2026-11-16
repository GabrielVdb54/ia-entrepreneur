-- Le CRM d'Anna, d'Axel et de Ludovic (13/11/2026).
--
-- Demande de Gabriel, après le point appels d'offres du 13/11 : « créer une version
-- du CRM pour Anna et ses missions (prospection, import CSV, séances d'appels dans
-- le tableau, accès aux formateurs, les inviter) », « il faudra le faire aussi pour
-- Ludovic, par rapport aux infos dont il a besoin », « idem pour Axel, closer ».
-- Ses choix : Ludovic télécharge toutes les pièces des formateurs ; Anna fait tout
-- sur un dossier formateur sauf le valider (contresignature) ; Ludovic a aussi le
-- suivi des marchés et les pièces de l'organisme.
--
-- 1. Un rôle « partenaire » (Ludovic, LM Conseil) : adresse extérieure permise.
-- 2. Les leads « formateur » portent la marque '@formateurs' dans visible_par :
--    api/_equipe.js donne aux rôles qui voient les formateurs (setter, partenaire)
--    le filtre « visible_par recoupe {mon adresse, @formateurs} ». Les contacts et
--    le journal suivent par les déclencheurs existants.
-- 3. Les marchés publics proposés par Ludovic (iae_crm_marches).
-- 4. Les pièces de l'organisme pour les dossiers (iae_crm_pieces_organisme), dans le
--    bucket privé des formateurs, sous organisme/.
--
-- Comme le reste du CRM : RLS activée sans policy, droits retirés à anon et
-- authenticated ; seule la clé de service (côté serveur) lit et écrit.

-- 1. Le rôle partenaire.
alter table public.iae_crm_utilisateurs drop constraint if exists iae_crm_utilisateurs_email_check;
alter table public.iae_crm_utilisateurs drop constraint if exists iae_crm_utilisateurs_role_check;
alter table public.iae_crm_utilisateurs add constraint iae_crm_utilisateurs_role_check
  check (role in ('closer', 'setter', 'partenaire'));
alter table public.iae_crm_utilisateurs add constraint iae_crm_utilisateurs_email_check
  check (email ~ '^[a-z0-9._-]+@ia-entrepreneur\.fr$'
      or (role = 'partenaire' and email ~ '^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$'));

-- 2. visible_par des leads : + '@formateurs' sur un formateur.
-- Postgres 15 ne sait pas changer l'expression d'une colonne générée : on la recrée.
drop trigger if exists iae_crm_leads_visible on public.iae_crm_leads;
drop index if exists public.iae_crm_leads_visible;
alter table public.iae_crm_leads drop column if exists visible_par;
alter table public.iae_crm_leads add column visible_par text[]
  generated always as (array_remove(array[proprietaire, setter, case when type = 'formateur' then '@formateurs' end], null)) stored;
create index if not exists iae_crm_leads_visible on public.iae_crm_leads using gin (visible_par);
create trigger iae_crm_leads_visible after update of proprietaire, setter, type on public.iae_crm_leads
  for each row execute function public.iae_crm_visible_propager();
-- Contacts et journal des formateurs existants : recopiés depuis leur lead.
update public.iae_crm_contacts c set visible_par = l.visible_par
  from public.iae_crm_leads l where l.id = c.lead_id and c.visible_par is distinct from l.visible_par;
update public.iae_crm_activites a set visible_par = l.visible_par
  from public.iae_crm_leads l where l.id = a.lead_id and a.visible_par is distinct from l.visible_par;

-- 3. Les marchés publics.
create table if not exists public.iae_crm_marches (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  cree_par         text not null,
  titre            text not null,
  acheteur         text,
  lien             text,
  reference        text,
  montant          numeric,                  -- € HT estimé (accord-cadre : le maximum)
  date_limite      date,                     -- remise des offres
  lieu             text,
  synthese         text,                     -- l'analyse courte de Ludovic (« analyse » est un mot réservé)
  avantages        text,
  inconvenients    text,
  sante_acheteur   text,                     -- solvabilité, délais de paiement connus
  statut           text not null default 'propose'
                   check (statut in ('propose', 'retenu', 'ecarte', 'en_montage', 'depose', 'gagne', 'perdu', 'abandonne')),
  decision_le      timestamptz,
  decision_note    text,
  profils          text,                     -- les profils de formateurs demandés
  formateurs       uuid[] not null default '{}',
  notes            text,
  depose_le        date,
  resultat_le      date
);
alter table public.iae_crm_marches enable row level security;
revoke all on public.iae_crm_marches from anon, authenticated;
create index if not exists iae_crm_marches_statut on public.iae_crm_marches (statut, date_limite);
drop trigger if exists iae_crm_marches_touch on public.iae_crm_marches;
create trigger iae_crm_marches_touch before update on public.iae_crm_marches
  for each row execute function public.iae_crm_touch();

-- 4. Les pièces de l'organisme (Qualiopi, Kbis, RC Pro, attestations…).
create table if not exists public.iae_crm_pieces_organisme (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  type        text not null check (type in ('qualiopi', 'kbis', 'rc_pro', 'urssaf', 'fiscale', 'nda', 'references', 'statuts', 'rib', 'autre')),
  titre       text,
  nom         text not null,
  chemin      text not null,
  mime        text,
  taille      integer,
  expire_le   date,
  depose_par  text,
  archive     boolean not null default false
);
alter table public.iae_crm_pieces_organisme enable row level security;
revoke all on public.iae_crm_pieces_organisme from anon, authenticated;

-- 5. Une pièce de formateur déposée par Anna depuis le CRM : depose_par = son adresse
--    (avant : 'formateur' ou 'gabriel' seulement). Migration iae_crm_documents_depose_par_equipe.
alter table public.iae_crm_documents drop constraint if exists iae_crm_documents_depose_par_check;
alter table public.iae_crm_documents add constraint iae_crm_documents_depose_par_check
  check (depose_par in ('formateur', 'gabriel') or depose_par ~ '^[a-z0-9._-]+@ia-entrepreneur\.fr$');

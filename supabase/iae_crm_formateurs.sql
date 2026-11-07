-- CRM de Gabriel : les formateurs, leur dossier, les programmes (06/11/2026).
-- Un formateur est un lead de type « formateur » (historique, emails et récap
-- comme les autres) ; son dossier vit dans iae_crm_formateurs, ses pièces
-- dans iae_crm_documents et dans le bucket privé iae-crm-formateurs.
-- Il n'est « valide » qu'une fois le contrat-cadre signé en ligne et toutes
-- les pièces reçues et vérifiées (choix de Gabriel).

create table if not exists public.iae_crm_formateurs (
  lead_id          uuid primary key references public.iae_crm_leads (id) on delete cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  statut           text not null default 'a_inviter'
                   check (statut in ('a_inviter', 'en_cours', 'a_verifier', 'valide', 'a_renouveler', 'refuse')),
  competences      text[] not null default '{}',
  outils           text[] not null default '{}',
  niveaux          integer[] not null default '{}',
  secteurs         text[] not null default '{}',
  zone             text,
  distanciel       boolean not null default true,
  tarif_jour       numeric(8, 2),             -- interne, jamais montré au client
  bio              text,
  page_site        text,
  disponibilites   text,
  identite         jsonb,                     -- raison sociale, forme, siège, immatriculation, représentant
  siret            text,
  siret_verif      jsonb,                     -- résultat de l'API publique recherche-entreprises
  regime_tva       text check (regime_tva in ('exonere', 'assujetti', 'franchise')),
  nda              text,
  intervenants     text,
  jeton_hash       text,                      -- sha256 du lien d'envoi, jamais le lien lui-même
  jeton_expire     timestamptz,
  jeton_cree_le    timestamptz,
  signature        jsonb,                     -- signature en ligne : nom, mention, lieu, date, IP, navigateur, empreinte du texte
  contre_signature jsonb,
  valide_le        timestamptz,
  notes            text
);

create table if not exists public.iae_crm_documents (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  lead_id     uuid not null references public.iae_crm_leads (id) on delete cascade,
  type        text not null check (type in ('kbis', 'identite', 'rib', 'tva', 'rc_pro', 'urssaf', 'cv', 'competences',
                                            'formation_continue', 'nda', 'contrat', 'autre')),
  nom         text not null,
  chemin      text not null unique,          -- chemin dans le bucket privé
  mime        text,
  taille      integer,
  depose_par  text not null default 'formateur' check (depose_par in ('formateur', 'gabriel')),
  lecture     jsonb,                          -- lecture par Claude : titulaire, dates, code de vérification, alertes
  statut      text not null default 'a_verifier' check (statut in ('a_verifier', 'verifie', 'refuse')),
  motif       text,
  verifie_le  timestamptz,
  expire_le   date,
  archive     boolean not null default false   -- remplacé par une pièce plus récente
);
create index if not exists iae_crm_documents_lead on public.iae_crm_documents (lead_id, type);

create table if not exists public.iae_crm_programmes (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  lead_id          uuid not null references public.iae_crm_leads (id) on delete cascade,
  titre            text not null,
  niveau           integer,
  parametres       jsonb,
  contenu          jsonb not null,
  statut           text not null default 'brouillon' check (statut in ('brouillon', 'valide')),
  valide_le        timestamptz,
  recommandations  jsonb,
  recommande_le    timestamptz,
  formateur_id     uuid references public.iae_crm_leads (id) on delete set null
);
create index if not exists iae_crm_programmes_lead on public.iae_crm_programmes (lead_id, created_at desc);

drop trigger if exists iae_crm_formateurs_touch on public.iae_crm_formateurs;
create trigger iae_crm_formateurs_touch before update on public.iae_crm_formateurs
  for each row execute function public.iae_crm_touch();
drop trigger if exists iae_crm_programmes_touch on public.iae_crm_programmes;
create trigger iae_crm_programmes_touch before update on public.iae_crm_programmes
  for each row execute function public.iae_crm_touch();

alter table public.iae_crm_formateurs enable row level security;
alter table public.iae_crm_documents  enable row level security;
alter table public.iae_crm_programmes enable row level security;
revoke all on public.iae_crm_formateurs, public.iae_crm_documents, public.iae_crm_programmes from anon, authenticated;

-- Pièces des formateurs : bucket privé, lu et écrit seulement par le serveur (clé de service).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('iae-crm-formateurs', 'iae-crm-formateurs', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

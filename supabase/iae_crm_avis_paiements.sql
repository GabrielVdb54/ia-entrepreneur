-- Après la formation (09/11/2026) : facture repérée, paiement à vérifier, demande d'avis, publication sur le site.
-- Aucune politique RLS : seul le serveur (clé service) lit et écrit.

-- La facture et le paiement d'un client. facture_echeance : la date où le CRM demande de vérifier le paiement
-- (délai lu dans l'email de la facture, sinon 30 jours, 60 si un financeur paie). paiement_annonce : ce qu'un
-- email dit du paiement (« virement effectué le… »), en attendant que Gabriel le voie sur son compte.
alter table public.iae_crm_leads
  add column if not exists facture_le date,
  add column if not exists facture_echeance date,
  add column if not exists facture_fil text,
  add column if not exists facture_objet text,
  add column if not exists paiement_annonce text,
  add column if not exists paye_le date;

-- Une demande d'avis : un lien par formation, à transférer aux participants. Seule l'empreinte du jeton est gardée.
create table if not exists public.iae_crm_avis_demandes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id uuid not null references public.iae_crm_leads(id) on delete cascade,
  jeton_hash text not null unique,
  expire_le timestamptz not null
);
create index if not exists iae_crm_avis_demandes_lead on public.iae_crm_avis_demandes (lead_id);
alter table public.iae_crm_avis_demandes enable row level security;

-- Un avis reçu. Publié sur le site seulement si la personne l'accepte et que Gabriel clique « Publier ».
create table if not exists public.iae_crm_avis (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id uuid not null references public.iae_crm_leads(id) on delete cascade,
  demande_id uuid references public.iae_crm_avis_demandes(id) on delete set null,
  note smallint not null check (note between 1 and 5),
  utile text check (utile is null or char_length(utile) <= 2000),
  ameliorer text check (ameliorer is null or char_length(ameliorer) <= 2000),
  nom text check (nom is null or char_length(nom) <= 120),
  fonction text check (fonction is null or char_length(fonction) <= 120),
  entreprise text check (entreprise is null or char_length(entreprise) <= 160),
  accord_publication boolean not null default false,
  statut text not null default 'nouveau' check (statut in ('nouveau', 'publie', 'retire')),
  texte_publie text check (texte_publie is null or char_length(texte_publie) <= 1200),
  publie_le timestamptz
);
create index if not exists iae_crm_avis_lead on public.iae_crm_avis (lead_id);
create index if not exists iae_crm_avis_statut on public.iae_crm_avis (statut);
alter table public.iae_crm_avis enable row level security;

-- Les deux nouveaux types d'historique : un avis reçu ou publié, une étape de facture ou de paiement.
alter table public.iae_crm_activites drop constraint if exists iae_crm_activites_type_check;
alter table public.iae_crm_activites add constraint iae_crm_activites_type_check check (type = any (array['note','appel','appel_sans_reponse','email_envoye','email_recu','brouillon','rdv','sms','relance_decalee','statut','import','linkedin','avis','paiement']));

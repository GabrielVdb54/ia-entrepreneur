-- Évaluations à chaud (10/11/2026). Gabriel : « envoyer le lien aux apprenants pour qu'ils laissent un avis, et piloter
-- le niveau de satisfaction d'une formation ainsi que du formateur qui l'effectue ». Questionnaire repris d'Ella
-- (modèle « Évaluation de fin de formation », avec les retours de Cathy du 02/11), note sur 10 calculée comme dans Ella.
-- Aucune politique RLS : seul le serveur (clé service) lit et écrit.

-- Une évaluation = une formation (une session) : son lien, ses objectifs, son formateur, ses questions figées.
-- Le jeton est gardé en clair, contrairement aux liens formateur et avis : il ne donne accès à aucune donnée (il
-- permet seulement de répondre au questionnaire) et Gabriel doit pouvoir recopier le lien ou réafficher le QR code
-- à tout moment, pendant la formation.
create table if not exists public.iae_crm_evaluations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lead_id uuid references public.iae_crm_leads(id) on delete set null,          -- le client (facultatif : inter-entreprises)
  programme_id uuid references public.iae_crm_programmes(id) on delete set null,
  formateur_id uuid references public.iae_crm_leads(id) on delete set null,     -- fiche formateur ; vide = Gabriel
  formateur_nom text not null check (char_length(formateur_nom) between 1 and 120),
  titre text not null check (char_length(titre) between 1 and 200),
  debut date,
  fin date,
  modalite text not null default 'distanciel' check (modalite in ('presentiel', 'distanciel', 'mixte')),
  inscrits integer check (inscrits is null or inscrits between 1 and 500),
  objectifs jsonb not null default '[]'::jsonb check (jsonb_typeof(objectifs) = 'array'),
  questions jsonb not null check (jsonb_typeof(questions) = 'array'),
  jeton text not null unique,
  ouverte boolean not null default true
);
create index if not exists iae_crm_evaluations_lead on public.iae_crm_evaluations (lead_id);
create index if not exists iae_crm_evaluations_formateur on public.iae_crm_evaluations (formateur_id);

-- Une réponse d'un participant. note : sur 10, calculée par le serveur à l'arrivée (règle d'Ella).
create table if not exists public.iae_crm_evaluation_reponses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  evaluation_id uuid not null references public.iae_crm_evaluations(id) on delete cascade,
  reponses jsonb not null check (jsonb_typeof(reponses) = 'object'),
  note numeric(4,2) check (note is null or note between 0 and 10),
  etoiles smallint check (etoiles is null or etoiles between 1 and 5),
  recommande boolean,
  participant text check (participant is null or char_length(participant) <= 120)
);
create index if not exists iae_crm_evaluation_reponses_eval on public.iae_crm_evaluation_reponses (evaluation_id, created_at);

drop trigger if exists iae_crm_evaluations_touch on public.iae_crm_evaluations;
create trigger iae_crm_evaluations_touch before update on public.iae_crm_evaluations
  for each row execute function public.iae_crm_touch();

alter table public.iae_crm_evaluations enable row level security;
alter table public.iae_crm_evaluation_reponses enable row level security;
revoke all on public.iae_crm_evaluations, public.iae_crm_evaluation_reponses from anon, authenticated;

-- Moyenne pour un appel d'offres, depuis Claude Code (à quelques centièmes près le calcul de l'onglet Satisfaction, qui fait foi : chaque formation
-- pèse son nombre de réponses, comme le taux de satisfaction d'Ella) :
--   select formateur_nom, count(distinct e.id) formations, count(r.id) reponses, round(avg(r.note), 1) note_sur_10
--   from iae_crm_evaluations e join iae_crm_evaluation_reponses r on r.evaluation_id = e.id
--   group by rollup (formateur_nom);

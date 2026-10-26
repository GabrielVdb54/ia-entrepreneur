-- Réponses au quiz des formations (/quiz/, /api/quiz).
-- À exécuter une fois dans l'éditeur SQL de Supabase.
--
-- RLS activée et AUCUNE policy : la clé anon, publique, ne peut ni lire ni
-- écrire ici. Seule api/quiz.js y accède, avec SUPABASE_SERVICE_ROLE_KEY,
-- qui ne quitte jamais le serveur. Les emails des stagiaires ne doivent pas
-- être lisibles avec une clé qui traîne dans le code des pages.

create table if not exists public.quiz_reponses (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  formation    text        not null,
  activite     text        not null,
  groupe       text        not null,
  prenom       text        not null,
  participante text        not null,          -- prénom normalisé, sert d'identifiant au championnat
  email        text,                          -- facultatif, seulement pour envoyer la correction
  reponses     jsonb       not null,          -- index des options choisies, null si pas de réponse
  score        integer     not null default 0,
  total        integer     not null default 0
);

create index if not exists quiz_reponses_lecture
  on public.quiz_reponses (formation, groupe, activite, created_at);

alter table public.quiz_reponses enable row level security;

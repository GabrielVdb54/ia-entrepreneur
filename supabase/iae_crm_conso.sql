-- Relevé de consommation de l'API Claude du CRM (16/11/2026). Le 12/11, l'alerte à 8 $ du workspace
-- « ia-entrepreneur moteur de recherche » a sonné ; ce workspace porte aussi la clé du CRM, et rien ne disait
-- quelle fonction dépensait. Gabriel : « mesurer d'abord ». Une ligne par appel à Claude (api/_conso.js) :
-- la fonction du CRM, le modèle qui a vraiment répondu, les tokens et le coût estimé en dollars.
-- Aucune politique RLS : seul le serveur (clé service) écrit ; on lit avec la requête du bas (MCP Supabase).

create table if not exists public.iae_crm_conso (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  fonction text not null check (char_length(fonction) <= 60),
  modele text check (modele is null or char_length(modele) <= 80),
  compte text check (compte is null or char_length(compte) <= 200),
  entree integer not null default 0,
  sortie integer not null default 0,
  cache_lecture integer not null default 0,
  cache_ecriture integer not null default 0,
  cout_usd numeric(12, 6),
  detail jsonb
);
create index if not exists iae_crm_conso_created_at on public.iae_crm_conso (created_at);
alter table public.iae_crm_conso enable row level security;
revoke all on public.iae_crm_conso from anon, authenticated;

-- Bilan par fonction (coût estimé ; le montant facturé fait foi dans la Claude Console) :
-- select fonction, count(*) as appels, sum(entree) as entree, sum(sortie) as sortie,
--   sum(cache_lecture) as cache_lecture, sum(cache_ecriture) as cache_ecriture,
--   round(sum(cout_usd), 2) as cout_usd, round(sum(cout_usd) / count(*), 4) as cout_par_appel
-- from public.iae_crm_conso where created_at >= now() - interval '7 days'
-- group by fonction order by cout_usd desc nulls last;

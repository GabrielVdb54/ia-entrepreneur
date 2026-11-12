-- La prospection email du CRM (12/11/2026). Gabriel : « mets le bilan dans le crm, il faut qu'on en envoie tous les
-- jours » (avant : « vas y molo sur les emails, mais on peut déjà tenter »). Le même circuit que LinkedIn : un dirigeant
-- sans profil LinkedIn utilisable, son adresse vérifiée (FullEnrich), des faits publics datés, Claude rédige, Gabriel
-- valide d'un clic, le serveur envoie par Brevo les matins de jours ouvrés, dans un quota. Une ligne par email.
-- Aucune politique RLS : seul le serveur (clé service) lit et écrit. Migration à appliquer une fois, sans risque à rejouer.

create table if not exists public.iae_crm_emails (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id uuid not null references public.iae_crm_leads(id) on delete cascade,
  contact_id uuid references public.iae_crm_contacts(id) on delete set null,
  compte text not null default 'gabriel@ia-entrepreneur.fr',
  etape text not null default 'message' check (etape in ('message', 'relance')),
  -- a_enrichir → a_rediger → brouillon → a_envoyer → en_cours → envoye ; ou echec, annule, sans_email.
  -- en_cours : la ligne est prise par un passage de la synchro, pour qu'un autre passage ne l'envoie pas une deuxième fois.
  statut text not null default 'a_enrichir'
    check (statut in ('a_enrichir', 'a_rediger', 'brouillon', 'a_envoyer', 'en_cours', 'envoye', 'echec', 'annule', 'sans_email')),
  email text,
  email_statut text,                         -- DELIVERABLE (FullEnrich), MANUEL…
  source_email text check (source_email is null or source_email in ('fullenrich', 'site', 'manuel')),
  fullenrich_id text,                        -- l'enrichissement en cours (asynchrone)
  fullenrich_le timestamptz,                 -- pour le plafond d'enrichissements par jour
  civilite text check (civilite is null or civilite in ('M.', 'Mme')),
  objet text check (objet is null or char_length(objet) <= 200),
  texte text check (texte is null or char_length(texte) <= 8000),
  texte_claude text check (texte_claude is null or char_length(texte_claude) <= 8000),  -- objet + texte tels que Claude les a écrits
  appuis jsonb,                              -- les faits utilisés : [{ fait, source, date }]
  faits jsonb,                               -- les données publiques lues (marchés, RGE, BODACC, registre), résumées
  valide_le timestamptz,
  pris_le timestamptz,
  envoye_le timestamptz,
  suite_le timestamptz,                      -- quand l'historique et la tâche du lead ont suivi l'envoi
  brevo_message_id text,
  brevo_campagne integer,                    -- campagne Brevo (la campagne 1 du 13/11 : Adam)
  evenements jsonb,                          -- { delivered: date, hard_bounce: date, spam: date, unsubscribed: date… }
  detail text,
  jeton_stop_hash text                       -- empreinte SHA-256 du lien de désinscription, jamais le lien lui-même
);
create index if not exists iae_crm_emails_statut on public.iae_crm_emails (statut);
create index if not exists iae_crm_emails_lead on public.iae_crm_emails (lead_id);
create unique index if not exists iae_crm_emails_jeton on public.iae_crm_emails (jeton_stop_hash) where jeton_stop_hash is not null;
create index if not exists iae_crm_emails_message on public.iae_crm_emails (brevo_message_id) where brevo_message_id is not null;
alter table public.iae_crm_emails enable row level security;
revoke all on public.iae_crm_emails from anon, authenticated;

-- Opposition : une adresse qui s'est désinscrite (lien, bouton de la messagerie, réponse « stop ») ou qui a signalé un
-- message comme spam ne reçoit plus jamais rien. Vérifiée avant chaque enrichissement retenu et avant chaque envoi.
create table if not exists public.iae_crm_oppositions (
  email text primary key check (email = lower(email)),
  le timestamptz not null default now(),
  origine text not null,                     -- lien de désinscription, désinscription en un clic, spam signalé…
  lead_id uuid references public.iae_crm_leads(id) on delete set null
);
alter table public.iae_crm_oppositions enable row level security;
revoke all on public.iae_crm_oppositions from anon, authenticated;

-- La campagne Brevo 1 du 13/11/2026 à 8 h 30 (liste 5, test sur 20) : son email entre dans le bilan. La synchro lit
-- la campagne chez Brevo ; quand Brevo la dit partie, elle met l'envoi dans l'historique du lead (une seule fois).
-- Michael Defrance (Les Métalliers Lorrains) a été retiré de la liste le 12/11 : l'entreprise s'oppose à la prospection
-- commerciale au registre national (opposition_diffusion_commerciale, RGPD art. 21.2) ; son adresse va en opposition.
-- Rejouer cette partie ne crée rien de plus.
insert into public.iae_crm_emails (lead_id, contact_id, statut, email, email_statut, source_email, civilite, objet, envoye_le, brevo_campagne, detail)
select c.lead_id, c.id, 'envoye', lower(c.email), null, 'manuel', 'M.', x.objet, timestamptz '2026-11-13 08:30:00+01', 1,
       'Campagne Brevo 1 (test sur 20), programmée le 13/11 à 8 h 30 : le texte est dans Brevo.'
from public.iae_crm_contacts c
join (values ('fabrice.adam@solemo.fr', 'Vos chantiers d''accessibilité')) as x (email, objet) on lower(c.email) = x.email
where not exists (select 1 from public.iae_crm_emails e where e.brevo_campagne = 1 and e.email = lower(c.email));

insert into public.iae_crm_oppositions (email, origine, lead_id)
select 'mdefrance@metallierslorrains.fr', 'registre national : opposition à la prospection commerciale (vue le 12/11/2026)', l.id
from public.iae_crm_leads l where l.siret like '323375659%'
on conflict (email) do nothing;

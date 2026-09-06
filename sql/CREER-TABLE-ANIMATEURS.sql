-- ============================================================
-- CRÉER LA TABLE DU VIVIER ANIMATEURS — 06/09/2026
--
-- POURQUOI : la vue « Animateurs » du Hub fonctionne déjà avec le
-- fichier de secours data/animateurs.json, mais les modifications
-- restent alors dans le navigateur de chacun. Avec cette table,
-- tout le monde voit les mêmes fiches et la tâche candidatures
-- Gmail pourra alimenter le vivier automatiquement.
--
-- COMMENT L'APPLIQUER : Supabase → SQL Editor → coller → Run.
-- La vue du Hub bascule toute seule sur la table dès qu'elle existe
-- (recharger la page). Les fiches de l'équipe sont pré-remplies
-- ci-dessous, sans rien inventer : les champs inconnus restent vides.
-- ============================================================

create table if not exists animateurs (
  id uuid default gen_random_uuid() primary key,
  nom text unique not null,
  telephone text,
  email text,
  photo_url text,
  competences jsonb default '[]',    -- tags : enfants, micro, hotesse, video, sport, musique, commercial, coordination
  zones jsonb default '[]',          -- Nord, Sud, Ouest, Est
  dispo_weekend boolean,             -- null = pas encore demandé
  dispo_semaine boolean,
  dispo_decembre boolean,            -- le nerf de la guerre pour les arbres de Noël
  note text,                         -- source de la fiche + retours après mission
  source text default 'hub',         -- hub / candidature-gmail
  actif boolean default true,        -- false = ne plus proposer, sans supprimer la fiche
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists animateurs_actif_idx on animateurs (actif);

-- ============================================================
-- LE VERROU (RLS) : réservé à l'équipe Pull Up
-- Même principe que la table devis : seuls les comptes qui ont une
-- fiche dans « profiles » (Romain, Ketsia, Flora, Gloria) peuvent
-- lire et écrire.
-- ============================================================

create or replace function public.est_equipe_pullup()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid())
$$;

alter table animateurs enable row level security;
drop policy if exists equipe_pullup on animateurs;
create policy equipe_pullup on animateurs
  for all to authenticated
  using (public.est_equipe_pullup())
  with check (public.est_equipe_pullup());

-- ============================================================
-- L'ÉQUIPE CONNUE (mêmes fiches que data/animateurs.json).
-- « on conflict do nothing » : relancer le script ne crée pas de doublon
-- et n'écrase pas les fiches déjà complétées dans le Hub.
-- ============================================================

insert into animateurs (nom, telephone, email, competences, zones, dispo_weekend, dispo_semaine, dispo_decembre, note) values
  ('Romain Capdepont', '', 'romain@pullup.re', '["micro","sport","coordination"]', '["Nord","Sud","Ouest","Est"]', true, true, true,
   'Fondateur. Anime la plupart des team buildings et ouvre les journées au micro.'),
  ('Ketsia', '0693 49 19 02', '', '["hotesse","coordination"]', '[]', null, null, null,
   'Cheffe hôtesse (téléphone pro hôtesses). Sur les team buildings : service petit-déjeuner, arbitrage et points, logistique des épreuves. Zones et disponibilités à compléter par Romain.'),
  ('Titi le Comik', '', '', '["micro"]', '[]', null, null, null,
   'Humoriste. Co-anime les team buildings (Université de La Réunion, EAM Alice Verdun). Zones et disponibilités à compléter par Romain.'),
  ('Benjam', '', '', '["musique"]', '[]', null, null, null,
   'Chanteur maloya (Benjam, sans i). Ateliers écriture et chant, présent sur le séminaire EGC. Zones et disponibilités à compléter par Romain.'),
  ('DJ Ken', '', '', '["musique"]', '[]', null, null, null,
   'DJ. Détail des prestations, zones et disponibilités à compléter par Romain.'),
  ('Marine', '', '', '[]', '[]', null, null, null,
   'Équipe Pull Up. Compétences terrain, zones et disponibilités à compléter par Romain.'),
  ('Flora', '', '', '[]', '[]', null, null, null,
   'Équipe Pull Up (commercial et administratif). Compétences terrain d''animation, zones et disponibilités à compléter par Romain.'),
  ('Gloria', '', '', '[]', '[]', null, null, null,
   'Commerciale (CDD depuis le 01/09/2026, cachets possibles en plus). Prévue maîtresse de cérémonie sur l''animation Halloween Casabona si le devis est gagné. Compétences terrain, zones et disponibilités à compléter par Romain.')
on conflict (nom) do nothing;

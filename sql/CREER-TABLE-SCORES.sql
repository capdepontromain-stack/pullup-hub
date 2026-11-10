-- ============================================================
-- TABLES DE LA JOURNÉE DE COHÉSION PROXIM'SERVICES : 10/11/2026
--
-- POURQUOI : l'application cohesion.html
-- (https://capdepontromain-stack.github.io/pullup-hub/cohesion.html)
-- est le carnet de route des 28 équipes sur leur téléphone : nom d'équipe,
-- capitaine, photo, épreuves faites, points. À la fin de chaque épreuve,
-- l'animateur saisit le résultat sur le téléphone de l'équipe avec son code.
-- Sans ces trois tables, chaque téléphone garde ses résultats pour lui :
-- pas de classement commun, pas de photos partagées, pas de messagerie.
--
-- COMMENT L'APPLIQUER : Supabase → SQL Editor → coller tout ce fichier → Run.
-- L'application détecte les tables toute seule (recharger la page).
-- On peut relancer ce fichier sans risque : il ne supprime rien.
--
-- SÉCURITÉ : les participants n'ont pas de compte. Les tables sont lisibles
-- par tous (des scores de jeux et des photos d'équipe, rien de sensible) et
-- ne peuvent être écrites qu'avec la clé technique de l'application.
-- Après l'événement, on referme l'écriture (voir tout en bas).
-- ============================================================

-- Les 28 équipes : nom choisi, capitaine, photo d'équipe
create table if not exists tb_equipes (
  id uuid default gen_random_uuid() primary key,
  event text not null,                          -- proxim-2026-11-14 (ou essai-2026-11-14 pour les répétitions)
  team int not null check (team between 1 and 28),
  nom text,
  capitaine text,
  photo text,                                   -- photo d'équipe réduite (image JPEG encodée)
  code text,
  updated_at timestamptz default now(),
  unique (event, team)
);

-- Un passage = une équipe sur une épreuve (une seule ligne par équipe et par épreuve)
create table if not exists tb_passages (
  id uuid default gen_random_uuid() primary key,
  event text not null,
  stand int not null check (stand between 1 and 14),
  team int not null check (team between 1 and 28),
  resultat text check (resultat in ('V','N','D','F','X')),  -- V victoire, N égalité, D défaite (duels), F fait (autres épreuves), X effacé
  mesure numeric,                               -- temps en secondes, points, note sur 10, bonnes réponses ou hauteur en cm
  b_ambiance boolean default false,             -- bonus donnés par l'animateur
  b_cohesion boolean default false,
  b_fairplay boolean default false,
  code text,
  updated_at timestamptz default now(),
  unique (event, stand, team)
);
-- Si une ancienne version de la table existe déjà, on ajoute seulement les colonnes manquantes
alter table tb_passages add column if not exists b_ambiance boolean default false;
alter table tb_passages add column if not exists b_cohesion boolean default false;
alter table tb_passages add column if not exists b_fairplay boolean default false;
alter table tb_passages add column if not exists b_coeur boolean default false;     -- bonus « Coup de cœur » (+2), ajouté le 10/11/2026

-- La messagerie de la journée : messages des équipes (team 1 à 28) et de l'organisation (team 0)
create table if not exists tb_messages (
  id uuid default gen_random_uuid() primary key,
  event text not null,
  cid text not null unique,                     -- identifiant donné par le téléphone (évite les doublons en cas de renvoi)
  team int not null check (team between 0 and 28),
  texte text not null check (char_length(texte) <= 300),
  masque boolean default false,                 -- message masqué par l'organisation
  code text,
  created_at timestamptz default now()
);
create index if not exists tb_messages_event_date on tb_messages (event, created_at desc);

alter table tb_messages enable row level security;
drop policy if exists tb_messages_anon_select on tb_messages;
create policy tb_messages_anon_select on tb_messages for select to anon using (true);
drop policy if exists tb_messages_anon_insert on tb_messages;
create policy tb_messages_anon_insert on tb_messages for insert to anon with check (code = 'PULLUP14');
drop policy if exists tb_messages_anon_update on tb_messages;
create policy tb_messages_anon_update on tb_messages for update to anon using (true) with check (code = 'PULLUP14');
drop policy if exists tb_messages_equipe on tb_messages;
create policy tb_messages_equipe on tb_messages for all to authenticated using (true) with check (true);

alter table tb_equipes enable row level security;
alter table tb_passages enable row level security;

drop policy if exists tb_equipes_anon_select on tb_equipes;
create policy tb_equipes_anon_select on tb_equipes for select to anon using (true);
drop policy if exists tb_equipes_anon_insert on tb_equipes;
create policy tb_equipes_anon_insert on tb_equipes for insert to anon with check (code = 'PULLUP14');
drop policy if exists tb_equipes_anon_update on tb_equipes;
create policy tb_equipes_anon_update on tb_equipes for update to anon using (true) with check (code = 'PULLUP14');
drop policy if exists tb_equipes_equipe on tb_equipes;
create policy tb_equipes_equipe on tb_equipes for all to authenticated using (true) with check (true);

drop policy if exists tb_passages_anon_select on tb_passages;
create policy tb_passages_anon_select on tb_passages for select to anon using (true);
drop policy if exists tb_passages_anon_insert on tb_passages;
create policy tb_passages_anon_insert on tb_passages for insert to anon with check (code = 'PULLUP14');
drop policy if exists tb_passages_anon_update on tb_passages;
create policy tb_passages_anon_update on tb_passages for update to anon using (true) with check (code = 'PULLUP14');
drop policy if exists tb_passages_equipe on tb_passages;
create policy tb_passages_equipe on tb_passages for all to authenticated using (true) with check (true);

-- ============================================================
-- APRÈS L'ÉVÉNEMENT (facultatif) : refermer l'écriture publique.
-- drop policy if exists tb_equipes_anon_insert on tb_equipes;
-- drop policy if exists tb_equipes_anon_update on tb_equipes;
-- drop policy if exists tb_passages_anon_insert on tb_passages;
-- drop policy if exists tb_passages_anon_update on tb_passages;
-- drop policy if exists tb_messages_anon_insert on tb_messages;
-- drop policy if exists tb_messages_anon_update on tb_messages;
-- ============================================================

-- ============================================================
-- AJOUT DU 10/11/2026 : les défis photo et vidéo (épreuve 13)
-- Une ligne par équipe et par défi : « envoyé » (coché par l'équipe après l'envoi WhatsApp)
-- et la note de Romain (0 = pas reçu, 1 à 3 ; vide = 2 points d'office).
-- ============================================================
create table if not exists tb_defis (
  id uuid default gen_random_uuid() primary key,
  event text not null,
  team int not null check (team between 1 and 28),
  defi int not null check (defi between 0 and 20),
  envoye boolean default false,
  note int check (note between 0 and 3),
  code text,
  updated_at timestamptz default now(),
  unique (event, team, defi)
);
alter table tb_defis enable row level security;
create policy tb_defis_anon_select on tb_defis for select to anon using (true);
create policy tb_defis_anon_insert on tb_defis for insert to anon with check (code = 'PULLUP14');
create policy tb_defis_anon_update on tb_defis for update to anon using (true) with check (code = 'PULLUP14');
create policy tb_defis_equipe on tb_defis for all to authenticated using (true) with check (true);

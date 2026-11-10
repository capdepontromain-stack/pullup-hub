-- ============================================================
-- TABLES DE LA KERMESSE PROXIM'SERVICES (Pull Up Score) : 10/11/2026
--
-- POURQUOI : l'application score.html
-- (https://capdepontromain-stack.github.io/pullup-hub/score.html)
-- permet aux animateurs de saisir sur leur téléphone le résultat de chaque
-- passage d'une équipe sur leur stand, aux capitaines de voir leur carnet de
-- route et les stands libres, et à Romain de voir le classement en direct.
-- Sans ces tables, l'application garde les saisies sur chaque téléphone mais
-- rien n'est partagé.
--
-- COMMENT L'APPLIQUER : Supabase → SQL Editor → coller tout ce fichier → Run.
-- L'application détecte les tables toute seule (recharger la page).
--
-- SÉCURITÉ : les animateurs n'ont pas de compte Hub. Les tables sont donc
-- lisibles par tous (des scores de jeux, rien de sensible) et ne peuvent être
-- écrites que si la ligne porte le code PULLUP14, donné au briefing.
-- Après l'événement, on peut retirer l'écriture publique (voir tout en bas).
-- ============================================================

-- Un passage = une équipe sur un stand (une seule ligne par équipe et par stand : la saisie suivante la met à jour)
create table if not exists tb_passages (
  id uuid default gen_random_uuid() primary key,
  event text not null,                          -- proxim-2026-11-14
  stand int not null check (stand between 1 and 14),
  team int not null check (team between 1 and 28),
  resultat text check (resultat in ('V','N','D','F','X')),  -- V victoire, N égalité, D défaite (duels), F fait (autres épreuves), X annulé
  adversaire int,                               -- équipe adverse (duels)
  mesure numeric,                               -- temps en secondes, points, note sur 10, bonnes réponses ou hauteur en cm
  animateur text,
  code text,
  updated_at timestamptz default now(),
  unique (event, stand, team)
);

-- L'état de chaque stand : libre, presque plein, complet
create table if not exists tb_stands (
  id uuid default gen_random_uuid() primary key,
  event text not null,
  stand int not null check (stand between 1 and 14),
  statut text not null check (statut in ('libre','presque','complet')),
  code text,
  updated_at timestamptz default now(),
  unique (event, stand)
);

alter table tb_passages enable row level security;
alter table tb_stands enable row level security;

drop policy if exists tb_passages_anon_select on tb_passages;
create policy tb_passages_anon_select on tb_passages for select to anon using (true);
drop policy if exists tb_passages_anon_insert on tb_passages;
create policy tb_passages_anon_insert on tb_passages for insert to anon with check (code = 'PULLUP14');
drop policy if exists tb_passages_anon_update on tb_passages;
create policy tb_passages_anon_update on tb_passages for update to anon using (true) with check (code = 'PULLUP14');
drop policy if exists tb_passages_equipe on tb_passages;
create policy tb_passages_equipe on tb_passages for all to authenticated using (true) with check (true);

drop policy if exists tb_stands_anon_select on tb_stands;
create policy tb_stands_anon_select on tb_stands for select to anon using (true);
drop policy if exists tb_stands_anon_insert on tb_stands;
create policy tb_stands_anon_insert on tb_stands for insert to anon with check (code = 'PULLUP14');
drop policy if exists tb_stands_anon_update on tb_stands;
create policy tb_stands_anon_update on tb_stands for update to anon using (true) with check (code = 'PULLUP14');
drop policy if exists tb_stands_equipe on tb_stands;
create policy tb_stands_equipe on tb_stands for all to authenticated using (true) with check (true);

-- ============================================================
-- APRÈS L'ÉVÉNEMENT (facultatif) : refermer l'écriture publique.
-- drop policy if exists tb_passages_anon_insert on tb_passages;
-- drop policy if exists tb_passages_anon_update on tb_passages;
-- drop policy if exists tb_stands_anon_insert on tb_stands;
-- drop policy if exists tb_stands_anon_update on tb_stands;
-- ============================================================

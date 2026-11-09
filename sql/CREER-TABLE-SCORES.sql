-- ============================================================
-- CRÉER LA TABLE DES SCORES DE TEAM BUILDING (Pull Up Score) : 09/11/2026
--
-- POURQUOI : l'application score.html (https://capdepontromain-stack.github.io/pullup-hub/score.html)
-- permet aux animateurs de saisir sur leur téléphone le résultat de chaque manche
-- de leur stand, et à Romain de voir le classement en direct (grand prix + prix
-- spécial quiz). Sans cette table, l'application garde les saisies sur chaque
-- téléphone mais personne ne voit le classement.
--
-- COMMENT L'APPLIQUER : Supabase → SQL Editor → coller tout ce fichier → Run.
-- L'application détecte la table toute seule (recharger la page).
--
-- SÉCURITÉ : les animateurs n'ont pas de compte Hub. La table est donc ouverte
-- en lecture à tous (des scores de jeux, rien de sensible) et en écriture
-- uniquement si la ligne porte le code PULLUP14 donné au briefing. Après
-- l'événement, on peut retirer les deux règles « anon » (voir tout en bas).
-- ============================================================

create table if not exists tb_scores (
  id uuid default gen_random_uuid() primary key,
  event text not null,                       -- ex. proxim-2026-11-14 (une ligne de réglage par événement dans score.html)
  stand int not null,
  manche int not null,
  team_a int not null,
  team_b int not null,
  result text check (result in ('A','B','N')),  -- A gagne, B gagne, N = égalité
  score_a int,                               -- score brut facultatif (quiz : bonnes réponses sur 10)
  score_b int,
  animateur text,
  code text,
  updated_at timestamptz default now(),
  unique (event, stand, manche)              -- une seule ligne par stand et par manche : l'application met à jour
);

alter table tb_scores enable row level security;

drop policy if exists tb_scores_anon_select on tb_scores;
create policy tb_scores_anon_select on tb_scores
  for select to anon using (true);

drop policy if exists tb_scores_anon_insert on tb_scores;
create policy tb_scores_anon_insert on tb_scores
  for insert to anon with check (code = 'PULLUP14');

drop policy if exists tb_scores_anon_update on tb_scores;
create policy tb_scores_anon_update on tb_scores
  for update to anon using (true) with check (code = 'PULLUP14');

drop policy if exists tb_scores_equipe on tb_scores;
create policy tb_scores_equipe on tb_scores
  for all to authenticated using (true) with check (true);

-- ============================================================
-- APRÈS L'ÉVÉNEMENT (facultatif) : refermer l'écriture publique.
-- drop policy if exists tb_scores_anon_insert on tb_scores;
-- drop policy if exists tb_scores_anon_update on tb_scores;
-- ============================================================

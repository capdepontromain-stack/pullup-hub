-- Ajouter la colonne end_date à la table events
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date date;

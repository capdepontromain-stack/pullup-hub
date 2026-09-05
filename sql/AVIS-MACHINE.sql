-- ============================================================
-- MACHINE À AVIS — colonnes à ajouter à la table events
-- À COLLER PAR ROMAIN dans l'éditeur SQL de Supabase :
--   https://supabase.com/dashboard/project/vincxrmtfjbenlzhjwby/sql
--   (coller tout le fichier, puis bouton « Run »)
-- Sans risque : on AJOUTE des colonnes, on ne touche à rien d'existant.
-- ============================================================

-- L'adresse mail du contact client (pour envoyer le mail de remerciement)
ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_email text;

-- Le mail de remerciement J+2 a été préparé/envoyé
ALTER TABLE events ADD COLUMN IF NOT EXISTS avis_mail_j2_fait boolean DEFAULT false;

-- La relance unique J+9 a été préparée/envoyée
ALTER TABLE events ADD COLUMN IF NOT EXISTS avis_relance_j9_faite boolean DEFAULT false;

-- Le client a laissé son avis Google (coché à la main dans le Hub)
ALTER TABLE events ADD COLUMN IF NOT EXISTS avis_recu boolean DEFAULT false;

-- Ne jamais relancer ce client (coché à la main dans le Hub)
ALTER TABLE events ADD COLUMN IF NOT EXISTS avis_exclu boolean DEFAULT false;

---
description: Sauvegarde les données Supabase de Pull Up Hub dans un dossier local horodaté
---

Tu vas sauvegarder les données de Pull Up Hub (base Supabase). Objectif : un filet de sécurité avant toute opération risquée. Explique simplement, Romain n'est pas développeur.

Contexte : projet `pullup-hub`, base Supabase (URL dans supabase.js). Tables à sauvegarder : profiles, events, event_checklists, tasks, task_comments, clients, suppliers, finances, mileage, inventory, messages, mail_templates, quick_links, knowledge, personnel_records.

Méthode :
1. Crée un dossier de sauvegarde horodaté : `sauvegarde-YYYY-MM-JJ-HHMM/` à la racine du projet (déjà couvert par .gitignore, ne sera pas committé).
2. Pour lire les données, il faut une clé Supabase autorisée. La clé "anon" seule ne suffit PAS (protégée par RLS). Vérifie dans cet ordre :
   - a) Une variable d'environnement `SUPABASE_SERVICE_KEY` est-elle définie localement ? Si oui, utilise-la pour interroger l'API REST Supabase (`/rest/v1/<table>?select=*`) avec les en-têtes `apikey` et `Authorization: Bearer`. Exporte chaque table en JSON dans le dossier.
   - b) Sinon, explique à Romain les 2 façons sûres de sauvegarder :
     • La plus simple : Supabase Dashboard → Database → Backups (ou Table editor → Export CSV par table).
     • Ou : définir temporairement la clé `service_role` en variable d'environnement `SUPABASE_SERVICE_KEY` le temps de la sauvegarde (⚠️ ne JAMAIS la mettre dans un fichier du projet ni la committer).
3. À la fin, liste les fichiers créés et leur taille, et confirme où se trouve la sauvegarde.
4. Ne modifie ni ne supprime AUCUNE donnée. Lecture seule.

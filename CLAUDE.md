# Pull Up Hub — outil de gestion interne de Pull Up Événements

Application web privée utilisée par l'équipe (Romain, Flora, Gloria, Ketsia) pour gérer l'activité de l'agence événementielle : événements, tâches, clients, fournisseurs, finances, etc. À ne pas confondre avec le site public **pullup.re** (vitrine WordPress, projet séparé).

## Stack technique
- **Front-end** : HTML/CSS/JavaScript pur (aucun framework, pas de build). Le navigateur exécute directement les fichiers.
- **Back-end** : Supabase (base PostgreSQL + authentification + realtime). Client JS chargé via CDN.
- **Hébergement** : Netlify (déploiement par `git push`). Une fonction serverless : `netlify/functions/calendar.js`.
- **PWA** : installable (`manifest.json` + service worker `sw.js`).

## Fichiers principaux
- `index.html` (~2 660 lignes) — toute l'interface (structure des écrans + modales).
- `supabase.js` (~4 500 lignes) — **le cœur applicatif** : connexion, accès données, rendu, logique métier. Fichier monolithique, chercher par nom de fonction.
- `app.js` (~1 080 lignes) — logique complémentaire côté UI.
- `style.css` (~660 lignes) — styles.
- `sw.js` — service worker (cache PWA).
- `netlify/functions/calendar.js` — endpoint agenda (⚠️ voir Sécurité).
- Fichiers `*.sql` — schéma et migrations Supabase (`schema.sql` = référence).

## Tables Supabase
`profiles`, `events`, `event_checklists`, `tasks`, `task_comments`, `clients`, `suppliers`, `finances`, `mileage`, `inventory`, `messages`, `mail_templates`, `quick_links`, `knowledge`, `personnel_records`.

## Conventions
- **Langue** : tout le code, les commentaires et l'interface sont en **français**.
- Les fonctions d'accès aux données suivent le motif `fetchX` / `createX` / `updateX` / `deleteX` dans `supabase.js`.
- Pas d'outil de build : une modification d'un fichier est immédiatement active en local (ouvrir index.html ou via le serveur de preview).

## Déploiement
Le site se met en ligne en poussant sur Git (`git push`) → Netlify redéploie automatiquement. **Un push = une mise en production.** Toujours vérifier que l'app fonctionne avant de pousser.

## Sécurité (important)
- `SUPABASE_ANON_KEY` est présente dans le code : **c'est normal**, c'est la clé publique "anon", protégée par les règles RLS (`fix-rls.sql`). Ne jamais y mettre de clé `service_role`.
- Toute la protection des données repose sur les **règles RLS Supabase** (accès réservé aux utilisateurs authentifiés). Après toute modification de schéma, vérifier que les policies RLS restent en place.
- ⚠️ `netlify/functions/calendar.js` lit les événements avec la clé anon sans contrôle d'appelant — vérifier si l'exposition publique de l'agenda est voulue.

## Règles de travail
- Ne jamais supprimer de données Supabase ni de fichiers sans confirmation explicite.
- Faire une sauvegarde avant toute opération risquée sur les données.
- Expliquer simplement : le propriétaire (Romain) n'est pas développeur.

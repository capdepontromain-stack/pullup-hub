---
description: Met en ligne Pull Up Hub en toute sécurité (commit + push vers Netlify)
---

Tu vas déployer Pull Up Hub. **Un push = une mise en production sur Netlify**, donc procède avec prudence et en expliquant simplement (Romain n'est pas développeur).

Étapes :
1. Affiche `git status` et la liste des fichiers modifiés. Résume en français simple ce qui va être mis en ligne.
2. S'il y a des changements sur du code applicatif (index.html, supabase.js, app.js, style.css, sw.js, netlify/), rappelle qu'il faut avoir vérifié que l'app fonctionne avant. Si un serveur de preview est disponible (launch.json → "pullup-hub"), propose de lancer une vérification rapide.
3. Demande à Romain de confirmer avant de continuer.
4. Après confirmation : `git add -A`, puis `git commit` avec un message clair en français. Si un message est fourni en argument ($ARGUMENTS), utilise-le ; sinon propose-en un basé sur les changements et fais-le valider.
5. `git push`. Confirme que Netlify va redéployer automatiquement (~1-2 min) et donne l'URL du site.
6. Ne force JAMAIS un push (`--force`) et ne touche pas à l'historique git.

Message de commit fourni (optionnel) : $ARGUMENTS

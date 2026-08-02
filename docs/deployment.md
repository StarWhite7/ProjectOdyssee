# Déploiement

## Frontend Cloudflare Pages

Créer un projet relié au dépôt, commande `npm run build -w web`, sortie `apps/web/dist/web/browser`, Node `24.15`. Renseigner uniquement l’URL et la clé anonyme Supabase. Ajouter une règle SPA redirigeant les routes vers `index.html`.

## Supabase

Créer un projet, lier la CLI, exécuter `supabase db push`, définir les secrets serveur, puis déployer `resolve-turn`. Ajouter les URL Cloudflare aux redirect URLs Auth et remplacer le CORS `*` de la fonction par l’origine exacte.

Configurer un Cron serveur qui crée les décisions `timeout` arrivées à échéance puis invoque la résolution. Tester sur un projet de préproduction avant production.

Aucune ressource n’est déployée automatiquement depuis ce dépôt.

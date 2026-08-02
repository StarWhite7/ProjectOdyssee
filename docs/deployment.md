# Déploiement

## 1. Supabase

```powershell
npx supabase login
npx supabase link --project-ref VOTRE_REFERENCE
npx supabase db push
npx supabase secrets set APP_URL=https://votre-domaine.example AI_PROVIDER=mock CRON_SECRET=UNE_VALEUR_ALEATOIRE
npx supabase functions deploy start-game
npx supabase functions deploy resolve-turn
npx supabase functions deploy expire-turns
```

Dans Authentication > URL Configuration, ajouter l’URL Cloudflare aux Site URL et Redirect URLs. Exécuter les tests RLS sur un projet de préproduction avec trois utilisateurs.

Planifier toutes les minutes un appel POST à `functions/v1/expire-turns` avec l’en-tête `x-cron-secret`. La fonction crée les décisions timeout côté serveur et déclenche les résolutions prêtes.

## 2. Frontend Cloudflare Pages

- commande : `npm run build -w web` ;
- sortie : `apps/web/dist/web/browser` ;
- Node : `24.15` ou ultérieur compatible Angular 22.

Avant le build, renseigner `apps/web/public/config.js` avec l’URL et la clé anonyme Supabase. Ces deux valeurs sont publiques par conception. Ne jamais y mettre service role ou Gemini.

Ajouter une règle SPA pour servir `index.html` sur les routes Angular.

## 3. Gemini facultatif

Définir `AI_PROVIDER=gemini`, `GEMINI_API_KEY` et `GEMINI_MODEL` dans les secrets Supabase, redéployer `resolve-turn`, puis tester sur une partie de préproduction avec limites thématiques.

## 4. Contrôles avant ouverture

- `npm run check` et `npm run test:e2e` réussis ;
- migrations appliquées sans erreur ;
- tests RLS avec deux membres et un intrus ;
- CORS limité au domaine final ;
- email Auth et redirections vérifiés ;
- timeout Cron vérifié ;
- quotas et budget Gemini configurés ;
- sauvegardes Supabase activées selon l’offre choisie.

Aucun déploiement n’est automatique depuis ce dépôt.

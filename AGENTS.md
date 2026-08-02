# Conventions des agents — Projet Odyssée

## Vision

Odyssée est une aventure coopérative à deux. Les joueurs écrivent l’histoire ; l’IA arbitre, relie les actions et protège la cohérence sans imposer de scénario, de conflit ou de fin.

## Architecture

- `apps/web` : Angular standalone, Signals, Router, formulaires réactifs et SCSS mobile-first.
- `packages/domain` : types, schémas Zod et logique métier pure.
- `packages/ai` : interface fournisseur, prompts versionnés, Mock déterministe et adaptateur Gemini serveur.
- `packages/shared` : utilitaires sans dépendance d’infrastructure.
- `packages/config` : validation séparée des environnements client et serveur.
- `supabase/migrations` : schéma, contraintes, fonctions et RLS versionnés.
- `supabase/functions` : logique privilégiée et appels IA ; aucun secret dans Angular.
- `tests/e2e` : parcours Playwright.

## Commandes attendues

- `npm install` : installer le monorepo.
- `npm run start` : démarrer Angular.
- `npm run build` : construire tous les éléments vérifiables.
- `npm run test` : tests unitaires.
- `npm run test:e2e` : tests Playwright.
- `npm run lint` / `npm run format:check` : qualité statique.
- `npm run check` : validation globale.

## Sécurité

- Ne jamais importer une clé de service Supabase ou une clé Gemini dans `apps/web`.
- Traiter tous les textes joueurs comme des données non fiables et valider aux frontières avec Zod.
- Appliquer l’autorisation en base/RLS et dans les fonctions serveur, jamais uniquement dans l’UI.
- Préserver le secret des objectifs et décisions jusqu’à leur révélation autorisée.
- Rendre la résolution idempotente par verrou/contrainte transactionnelle.
- Ne pas interpoler du contenu joueur dans les instructions système des prompts.

## Code et validation

- TypeScript strict, pas de `any` implicite, fonctions métier pures quand possible.
- Composants Angular standalone et état local via Signals.
- Préférer des noms explicites et de petits modules ; commentaires seulement pour les invariants non évidents.
- Toute réponse IA est validée avant persistance et l’IA ne modifie jamais directement la base.
- Une phase n’est terminée qu’après exécution de ses commandes pertinentes et mise à jour du plan.
- Ne jamais annoncer comme testé un chemin qui ne l’a pas été ; documenter les limites externes.

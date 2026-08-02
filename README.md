# Projet Odyssée

Odyssée est un MVP narratif coopératif pour deux joueurs. Les joueurs choisissent librement leurs actions ; un moteur IA arbitre et fusionne leurs décisions sans imposer de scénario ni de fin.

![Emplacement prévu pour une capture de l’écran de jeu](docs/assets/game-screen-placeholder.svg)

## État actuel

Le dépôt contient une interface Angular jouable en démonstration locale, les types et validations du domaine, un fournisseur IA Mock déterministe, l’abstraction Gemini, l’orchestrateur narratif, le schéma Supabase avec RLS et une Edge Function de résolution. La connexion réelle du frontend à Supabase et certains écrans secondaires restent à achever ; voir « Limites connues ».

## Prérequis

- Node.js 24.15+ et npm 11+
- Docker Desktop et Supabase CLI pour la pile locale réelle
- Facultatif : un projet Supabase hébergé et une clé Gemini

## Installation et mode Mock

```bash
npm install
npm start
```

Ouvrir `http://localhost:4200`, choisir « Créer une aventure », puis lancer la démo. Le mode Mock ne requiert ni compte Supabase ni clé Gemini. L’état du tour est conservé dans `localStorage`.

## Configuration

Copier `.env.example` vers `.env` et renseigner les valeurs nécessaires. Les seules valeurs destinées au navigateur sont `APP_URL`, `SUPABASE_URL` et `SUPABASE_ANON_KEY`. `SUPABASE_SERVICE_ROLE_KEY` et `GEMINI_API_KEY` sont exclusivement des secrets d’Edge Function.

### Supabase local

```bash
npx supabase start
npx supabase db reset
npx supabase functions serve resolve-turn --env-file .env
```

La migration crée les tables, index, contraintes, RPC et RLS. Pour la seed SQL réaliste, créer deux utilisateurs Auth, remplacer les UUID dans `docs/demo-seed.sql`, puis l’exécuter via `psql` ou l’éditeur SQL. La seed navigateur fonctionne indépendamment.

### Gemini

1. Définir `AI_PROVIDER=gemini`, `GEMINI_API_KEY` et `GEMINI_MODEL` dans les secrets Supabase.
2. Implémenter le transport HTTP Gemini dans l’Edge Function à partir de `GeminiNarrativeAiProvider`.
3. Déployer uniquement après tests : `npx supabase functions deploy resolve-turn`.

L’adaptateur valide déjà les résolutions avec Zod. Dans l’état actuel, les opérations Gemini autres que la résolution signalent explicitement qu’un transport serveur doit être configuré.

## Commandes

```bash
npm run build
npm run test
npm run lint
npm run format:check
npm run test:e2e
npm run check
```

## Architecture

- `apps/web` — interface Angular standalone responsive.
- `packages/domain` — modèle strict, schémas Zod, sélection de mémoire.
- `packages/ai` — fournisseurs, prompts et moteur narratif.
- `supabase` — migration, seed et fonction serveur.
- `tests/e2e` — parcours Playwright.
- `docs` — décisions et guides détaillés.

Consulter [l’architecture](docs/architecture.md), [le moteur narratif](docs/narrative-engine.md) et [la sécurité](docs/security.md).

## Build et déploiement

`npm run build` produit le frontend dans `apps/web/dist/web/browser`. Cloudflare Pages peut utiliser `npm run build -w web` et ce répertoire. Les migrations et fonctions sont déployées séparément vers Supabase. Aucun déploiement n’est effectué automatiquement ; voir [le guide](docs/deployment.md).

## Dépannage

- `spawn EPERM` sous Windows : autoriser `node_modules/esbuild/bin/esbuild.exe` dans l’antivirus/sandbox puis relancer le build.
- Variables Supabase vides : utiliser `/aventure/demo` ou configurer le projet local.
- État de démo incohérent : supprimer les clés `odyssee_demo_*` du stockage local.
- Échec IA : le tour conserve ses décisions et passe à l’état `failed`; relancer la résolution.

## Limites connues

- La démonstration navigateur simule le second joueur ; le flux multi-session réel nécessite le raccordement du client Supabase.
- Auth réelle, création complète de personnage, journal/souvenirs et paramètres ne sont pas encore exposés par tous leurs écrans.
- La migration n’a pas été exécutée ici faute de Docker/CLI Supabase.
- Le transport Gemini complet n’est pas activé faute de clé et d’autorisation de déploiement.
- Le timer serveur doit être planifié via Supabase Cron en production.

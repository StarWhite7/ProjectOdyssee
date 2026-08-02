# Plan d’implémentation — Projet Odyssée

## Hypothèses

- Angular 22 et Node 24 constituent la base stable retenue.
- Le mode Mock est autonome, persistant et testable sans infrastructure externe.
- Supabase porte Auth, PostgreSQL, RLS, Realtime, les transactions logiques et les appels IA.
- Les fonctionnalités payantes, sociales et natives restent hors du MVP.

## Phases

- [x] Inspection, architecture et conventions.
- [x] Monorepo, Angular strict, qualité, domaine, IA Mock et premier écran.
- [x] Migrations, contraintes, RLS, fonctions atomiques, seed et tests statiques de sécurité.
- [x] Authentification, tableau de bord, création/rejointure et salon.
- [x] Univers, formulaire personnage, aperçu et objectifs privés.
- [x] Scènes, choix libre, décisions secrètes, résolution idempotente, Realtime et mode libre.
- [x] Timer UI, expiration serveur et décision de timeout.
- [x] Souvenirs structurés, sélection contextuelle, journal et faits immuables.
- [x] Responsive desktop/mobile, erreurs, chargements, reprise et démonstration.
- [x] Tests unitaires, concurrence, IA invalide, E2E multi-joueur, lint, format et build.
- [ ] Validation d’une pile Supabase réelle : bloquée localement par l’absence de Docker et d’identifiants Supabase.
- [ ] Appel Gemini réel : bloqué par l’absence de clé API.
- [ ] Déploiement : volontairement non exécuté sans autorisation et comptes utilisateur.

## Journal de validation

- Environnement : Node `24.16.0`, npm `11.13.0`, Angular `22.1.x`.
- `npm run check` : lint, format, tests et builds exécutés.
- Vitest : domaine, règles SQL statiques, Mock, concurrence et réponse IA invalide.
- Angular : tests composant.
- Playwright Chromium : démonstration, deux sessions secrètes, résolution unique, persistance et timeout.
- Playwright mobile : démonstration et parcours à deux joueurs.
- Supabase CLI/Docker indisponibles : SQL et Edge Functions non exécutés contre PostgreSQL local.

## Définition de fini locale

Le MVP Mock est fini lorsqu’une installation neuve peut créer deux sessions, rejoindre par code, créer deux personnages, jouer deux tours, conserver le secret, enregistrer un souvenir et reprendre après rechargement. Ce chemin est couvert par Playwright.

Le passage en production nécessite les étapes externes listées dans `docs/user-actions-prompt.md`.

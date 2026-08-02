# Plan d’implémentation — Projet Odyssée

## Hypothèses de départ

- Le dépôt est neuf et peut être structuré en monorepo npm.
- Angular 22 est retenu : il est stable et compatible avec Node 24.16 installé.
- Supabase local sera lancé via sa CLI/Docker par le développeur ; aucun identifiant externe n’est disponible pendant l’implémentation.
- Le mode `mock` est la configuration locale par défaut et doit permettre une démonstration sans Gemini.
- Les appels IA et les opérations privilégiées restent dans des Edge Functions Supabase.
- Le MVP cible exactement deux joueurs et ne prépare que des points d’extension pour les fonctions hors portée.

## Phases et critères de contrôle

- [x] Phase 1 — Inspecter le dépôt, inventorier les outils, documenter le plan et les conventions.
- [x] Phase 2 — Initialiser le monorepo, Angular strict, qualité, packages domaine/IA/config, fournisseur Mock, premier écran, compilation.
- [ ] Phase 3 — Écrire migrations, contraintes, fonctions SQL, RLS, seed et tests des règles critiques. Schéma écrit ; exécution locale en attente de la CLI/Docker.
- [ ] Phase 4 — Authentification, tableau de bord, création/rejointure de partie et salon.
- [ ] Phase 5 — Personnages, univers, validation, objectifs privés et aperçu.
- [ ] Phase 6 — Scènes, décisions secrètes, résolution idempotente, Realtime, timer serveur et mode libre.
- [ ] Phase 7 — Souvenirs, résumé de campagne, sélection contextuelle, faits immuables et journal.
- [ ] Phase 8 — Responsive, accessibilité, erreurs, chargements, reconnexion et démonstration.
- [ ] Phase 9 — Tests unitaires/intégration/E2E, audits secrets/RLS, build production et documentation finale.

## Stratégie technique

1. Garder les types, schémas Zod et règles pures dans `packages/domain`.
2. Garder l’abstraction IA, les prompts et les fournisseurs dans `packages/ai`.
3. Exposer au navigateur uniquement la configuration publique dans `packages/config`.
4. Utiliser Supabase Auth/PostgreSQL/Realtime côté web, et les Edge Functions pour l’orchestration sensible.
5. Garantir l’unicité des décisions et des résolutions au niveau PostgreSQL, pas seulement dans l’interface.
6. Tester le moteur avec un dépôt en mémoire et le fournisseur Mock déterministe.

## Journal de validation

Les commandes réellement exécutées et leurs résultats seront consignés ici à la fin de chaque phase. Les intégrations externes non vérifiables faute d’identifiants seront explicitement marquées comme telles.

- 2026-08-02 : Node `24.16.0`, npm `11.13.0`, Angular `22.1.x`.
- Phase 2 : packages domaine et IA compilés avec `tsc`; build Angular production réussi (230,57 kB initial brut).
- Tests : domaine 1/1, IA 1/1, Angular 2/2 et parcours Playwright Chromium 1/1 réussis.
- Qualité : ESLint et contrôle Prettier réussis.
- Supabase CLI absente : migration et RLS écrites mais non appliquées.

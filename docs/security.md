# Sécurité

- RLS activée sur toutes les tables applicatives.
- Lecture d’une partie limitée à ses membres ; troisième utilisateur exclu.
- Décision adverse visible seulement quand `revealed_at` est renseigné.
- Objectif privé visible seulement par le propriétaire du personnage.
- Unicité `(turn_id, player_id)` contre la double soumission.
- Acquisition atomique `open|failed → claimed` contre la double résolution.
- Tailles bornées en base et par Zod.
- Service role et clé Gemini réservés aux fonctions serveur.
- Prompts séparant instructions, données structurées et texte joueur, avec instruction anti-injection.

Avant production : exécuter les tests RLS avec trois sessions, activer CAPTCHA/rate limits Auth, restreindre CORS au domaine, configurer la rétention des audits et vérifier les journaux sans contenu sensible.

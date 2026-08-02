# Modèle de domaine

Une `Game` possède exactement deux membres au maximum, un `WorldState`, des `StoryTurn` ordonnés et deux `Character`. Chaque tour accepte au plus une `PlayerDecision` par membre. `revealed_at` contrôle le secret. Les `CharacterGoal` privés ne sont lisibles que par le propriétaire du personnage.

Les `Memory` représentent des faits structurés avec importance et entités impliquées. Les `RelationshipState` utilisent des descriptions humaines plutôt qu’un score visible. `NarrativeSummary` compacte périodiquement la campagne et transporte les faits immuables.

Les JSON aux frontières sont validés par Zod ; PostgreSQL apporte les contraintes d’identité, cardinalité, taille et concurrence.

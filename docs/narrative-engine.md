# Moteur narratif

`NarrativeEngine` valide la décision, délègue son insertion à un dépôt, puis tente d’acquérir la résolution. Une seule requête obtient le verrou logique ; les concurrentes reçoivent `null`. En cas d’erreur IA, les décisions restent persistées et le dépôt marque l’échec récupérable.

Le contexte cible les six derniers tours, le résumé de campagne, les objectifs pertinents et une sélection déterministe de souvenirs. `DeterministicMemorySearch` pondère importance, récence, personnages et correspondances textuelles. Une interface permet de remplacer ultérieurement cette stratégie par une recherche sémantique.

Chaque sortie IA est une proposition structurée validée. Le moteur, jamais l’IA, décide des changements applicables.

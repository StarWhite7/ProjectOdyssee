Dette technique critique — Avant l'activation de Gemini

Priorité : Haute (à traiter avant la mise en production avec Gemini)

Problème

Le Cron expire-turns déclenche directement resolve-turn.

Aujourd'hui :

Cron
    ↓
expire-turns
    ↓
resolve-turn
    ↓
Gemini
    ↓
Écriture en base

Le timeout maximal du Cron est de 5 secondes.

Une requête Gemini peut prendre 10 à 30 secondes, voire davantage selon la charge.

Conséquences possibles :

timeout du Cron ;
plusieurs résolutions simultanées ;
risque de doublons ou de réessais ;
mauvaise montée en charge.
Architecture cible

Découpler complètement l'expiration du traitement IA.

Par exemple :

Cron
    ↓
expire-turns
    ↓
Marque les tours expirés
    ↓
Crée une tâche de résolution
    ↓
Fin (<1 s)

Puis :

Worker
    ↓
resolve-turn
    ↓
Gemini
    ↓
Mise à jour de la partie

Ainsi :

le Cron reste très rapide (<1 s) ;
Gemini peut prendre le temps nécessaire ;
meilleure tolérance aux erreurs ;
meilleure scalabilité.
État actuel

✅ Suffisant pour la bêta en mode Mock.

❌ À refondre avant l'activation de Gemini en production.
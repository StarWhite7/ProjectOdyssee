# Actions restantes pour le propriétaire

Ces actions nécessitent vos comptes, vos secrets ou une décision de mise en production :

1. Installer Docker Desktop ou créer un projet Supabase hébergé.
2. Appliquer les migrations et tester les RLS avec trois comptes.
3. Configurer les URL Auth et les emails.
4. Renseigner `config.js` avec l’URL et la clé anonyme.
5. Facultatif : créer une clé Gemini et définir les secrets serveur.
6. Déployer les trois Edge Functions et configurer le Cron.
7. Déployer Angular sur Cloudflare Pages.

## Prompt prêt à copier dans ChatGPT

```text
Tu es mon assistant de mise en production pour Projet Odyssée.

Le dépôt se trouve sur ma machine et contient :
- une application Angular 22 dans apps/web ;
- des migrations Supabase dans supabase/migrations ;
- trois Edge Functions : start-game, resolve-turn et expire-turns ;
- un guide dans README.md et docs/deployment.md.

Le développement local et le mode Mock sont terminés. Je dois maintenant configurer les services externes sans exposer de secrets.

Accompagne-moi étape par étape, une seule étape à la fois, pour :
1. vérifier ou installer Docker Desktop et Supabase CLI, ou choisir Supabase hébergé ;
2. créer/lier mon projet Supabase ;
3. appliquer les migrations et exécuter les tests RLS avec deux joueurs et un intrus ;
4. configurer Supabase Auth, les URL de redirection et les emails ;
5. configurer apps/web/public/config.js uniquement avec SUPABASE_URL et SUPABASE_ANON_KEY ;
6. créer des valeurs sûres pour SUPABASE_SERVICE_ROLE_KEY côté plateforme et CRON_SECRET, sans jamais me demander de les coller dans la conversation ;
7. déployer start-game, resolve-turn et expire-turns ;
8. configurer un Cron d’une minute pour expire-turns avec x-cron-secret ;
9. si je le souhaite, activer Gemini uniquement dans les secrets Supabase avec AI_PROVIDER=gemini, GEMINI_API_KEY et GEMINI_MODEL ;
10. déployer le frontend sur Cloudflare Pages ;
11. effectuer une recette finale avec deux navigateurs et un troisième compte intrus.

Règles impératives :
- ne me demande jamais d’envoyer une clé secrète dans le chat ;
- distingue clairement les valeurs publiques des secrets ;
- donne les commandes PowerShell exactes ;
- attends ma confirmation après chaque étape ;
- si une commande échoue, diagnostique-la avant de continuer ;
- ne déploie et ne supprime rien sans mon accord explicite ;
- à la fin, fournis une checklist de validation et de retour arrière.

Commence par me demander si je préfère Supabase local avec Docker ou Supabase hébergé.
```

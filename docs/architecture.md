# Architecture

Le monorepo sépare quatre anneaux : Angular appelle des ports applicatifs ; le domaine ne connaît ni Angular ni Supabase ; l’IA dépend seulement des types du domaine ; Supabase porte l’autorisation et les opérations sensibles.

Le navigateur utilise la clé anonyme et une session Auth. PostgreSQL/RLS filtre chaque lecture. Les résolutions passent par une Edge Function qui acquiert atomiquement le tour via `claim_turn_resolution`, charge un contexte borné, appelle un fournisseur, valide la sortie puis persiste les changements. La clé de service n’entre jamais dans le bundle web.

La démonstration locale est un adaptateur temporaire `localStorage`, utile sans infrastructure. Elle ne constitue pas une frontière de sécurité.

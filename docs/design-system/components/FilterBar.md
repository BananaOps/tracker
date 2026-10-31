# FilterBar

La barre de filtres partagée par Timeline, Streamline et Calendar. La période et les filtres suivent l'utilisateur d'une vue à l'autre.

- Chaque filtre est un jeton `clé valeur` en mono (`env production`), bordé de `rule-strong`, avec un bouton de retrait accessible.
- `+ Filter` ouvre un sélecteur de clés : type, environment, priority, status, owner, service.
- `scope` rappelle discrètement où s'appliquent les filtres (`synced · timeline, streamline, calendar`). C'est ce qui rend la synchronisation compréhensible.
- L'état des filtres vit dans l'URL, pour qu'une vue filtrée puisse se partager par lien.

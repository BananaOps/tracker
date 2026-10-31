# EventRow

La ligne d'événement, la brique la plus répétée de Tracker. On la trouve dans Timeline, dans le flux d'activité du dashboard, dans Overlaps et dans les résultats de recherche.

Sa structure est fixe sur trois colonnes : l'heure en mono `muted`, le titre en `body-strong` avec la ligne de métadonnées en dessous, puis l'étiquette `StatusMark` alignée à droite sur la première ligne du titre. Il n'y a pas de glyphe en tête de ligne : le statut se lit en descendant le bord droit, où seuls les écarts (failed, warning) et ce qui est en cours (running) ressortent.

- **Densité confort** (par défaut, `row-pad-comfy`) : le titre et les métadonnées tiennent sur deux lignes.
- **Densité compacte** (`density="compact"`, `row-pad-compact`) : tout tient sur une ligne, les métadonnées sont tronquées.
- La ligne sélectionnée prend `signature-wash`. Une sélection ouvre l'`EventDrawer`, et ↑ ↓ déplacent la sélection.
- `impact` ajoute un `ImpactMark` compact, en magenta, juste avant l'étiquette de statut. L'impact se lit ainsi sur le même bord droit que le statut, sans changer la structure de la ligne.
- Les métadonnées se passent sous forme de liste ordonnée : type, environnement, priorité, équipe. Elles sont jointes par « · ».
- Pas de pastilles colorées pour le type ou l'environnement. La couleur appartient au statut.

Utilisez `EventList` pour une liste : elle porte le rôle `listbox` et gère la sélection.

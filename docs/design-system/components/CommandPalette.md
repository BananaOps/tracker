# CommandPalette

La palette ⌘K : chercher, créer et naviguer depuis un seul champ. Elle double le bouton `New`.

- Elle s'ouvre avec ⌘K, ou avec `/` hors d'un champ, au-dessus d'un voile `scrim`. Elle utilise `overlay`, `shadow-overlay` et `radius-lg`.
- Les groupes s'affichent dans un ordre fixe : Jump to, Create, puis les résultats (events, services, teams).
- Chaque création a une lettre de raccourci (`E` event, `L` lock, `D` drift, `S` service, `R` RPA).
- L'item actif prend `signature-wash`. On le déplace avec ↑ ↓, ↵ l'ouvre et esc ferme la palette.
- Un résultat d'événement porte son statut et son heure en indice (`failed · 15:04`).
- Pour une recherche sans résultat, on affiche `No results for “…”` sans illustration.

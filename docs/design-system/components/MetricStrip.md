# MetricStrip

La bande de métriques, posée dans un creux `sunken` sous la phrase de synthèse. Elle compte trois à cinq valeurs.

- Le libellé est en mono minuscule (`events / 24h`), la valeur en style `metric`, et une précision en `caption` peut la compléter (`3 of 5 finished`).
- `tone="failed"` ou `tone="warning"` ne s'applique que si la valeur elle-même est un problème, par exemple un nombre d'échecs supérieur à zéro.
- `tone="impact"` colore en magenta la métrique « users impacted », et seulement quand elle est supérieure à zéro. Elle a sa place sur chaque page qui résume une période.
- Un taux de succès reste neutre, même à 100 %.
- Pas de zéros de remplissage, pas d'icône décorative, pas de petite flèche de tendance colorée.
- **Comparaison avec la période précédente** : `delta` affiche l'écart en mono sous la valeur (« −3.2 pts vs prev. », « +7 min vs prev. »), et `trend` dit si c'est mieux ou moins bien. Seul `worse` prend une couleur (ambre, avec le glyphe warning). `better` reste neutre, comme tout ce qui va bien. Le signe du delta suit la valeur, pas le jugement : un taux d'échec qui baisse s'écrit « −3.2 pts » avec `trend: 'better'`.

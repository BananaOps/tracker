# Maquettes de pages

Ces fichiers sont les maquettes interactives validées, exportées du canevas de conception. Ce sont des **spécifications**, pas du code à réutiliser.

Format d'un fichier `.dc.html` :

- Le balisage HTML décrit la mise en page exacte : structure, espacements, tailles, ordre des éléments, textes de l'interface.
- `{{ … }}` est une valeur calculée. `<sc-for list="{{items}}" as="x">` répète un bloc, `<sc-if value="{{cond}}">` l'affiche sous condition.
- `<x-import component-from-global-scope="Tracker.StatusMark" status="failed">` monte un composant du design system avec ses props (en kebab-case dans l'attribut, en camelCase dans le composant). C'est la liste des composants à utiliser à cet endroit.
- Le `<script type="text/x-dc">` en bas contient `renderVals()` : les données d'exemple, les calculs (filtres, tris, analyse d'impact, mise en page du graphe) et les interactions (`setState`). C'est la spécification du comportement.
- `var(--…)` renvoie aux tokens de `../tokens.json`. `compiled-tokens.css` en donne la version CSS utilisée par les maquettes, en clair et en sombre (`[data-theme="dark"]` dans les maquettes, `.dark` dans l'application).

| Fichier | Page | Points clés |
| --- | --- | --- |
| `dashboard.dc.html` | Dashboard | phrase de synthèse cliquable, MetricStrip, Needs attention, Up next, Activity avec filtres par statut et histogramme cliquable, drawer |
| `streamline.dc.html` | Streamline | vues enregistrées, barre de filtre `key:value` avec autocomplétion, navigateur de chevauchements, groupement, aperçu 24 h, couloirs, drawer de chevauchement |
| `search-and-filters.dc.html` | Spécification | états de la barre de filtre, différence filtre de page / recherche globale ⌘K, syntaxe et raccourcis |
| `architecture.dc.html` | Architecture | barre latérale repliée, graphe en couches gauche → droite, simulation de panne (rayon d'impact), panneau d'impact, vue classement |
| `insights.dc.html` | Insights | MetricStrip comparée à la période précédente, activité par type en couleur, fiabilité et impact par service, tendance 12 mois |

Les données des maquettes sont fictives. Dans l'application, elles viennent de l'API (voir `../IMPLEMENTATION.md`).

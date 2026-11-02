# ImpactMark

Le marqueur d'impact utilisateur : l'icône impact (des ondes) en magenta `impact` sur un fond `impact-wash`, à la même hauteur de 22 px que l'étiquette de statut.

Il signale qu'un événement touche les utilisateurs (attribut `impact` du modèle), quel que soit son statut. Il ne remplace jamais le statut : il s'affiche à côté de lui.

Où il apparaît, sur chaque page :

- **Lignes d'événement** (`EventRow` avec `impact`) : version compacte, juste avant l'étiquette de statut.
- **Listes de triage et d'agenda** (Needs attention, Up next) : version compacte à côté du titre.
- **Barres de Streamline** : liseré magenta en bas de la barre, et version compacte dans le libellé.
- **Métriques** : la valeur « users impacted » en `tone="impact"`.
- **Drawer** : la bande pleine largeur « Users impacted » (portée par `EventDrawer`).
- **Filtres** : la clé `impact:true` dans la barre de filtre, et une vue enregistrée « Impact ».

Variantes :

- **`compact`** : l'icône seule dans un carré de 22 px, avec « Users impacted » comme nom accessible et comme infobulle. C'est la variante par défaut dans les listes.
- **Avec libellé** (`text`, « impact » par défaut) : pour les légendes et les en-têtes, quand la place le permet.

On ne l'utilise pas pour une alerte générique, ni pour une notion de gravité ou de priorité.

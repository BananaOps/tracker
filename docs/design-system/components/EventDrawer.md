# EventDrawer

Le détail d'un événement, dans un panneau latéral de `drawer-w` ouvert à droite de la liste. Sa mise en page « bandeau » met en avant les faits sur lesquels on agit, tous dans l'en-tête.

**En-tête, sur fond `sunken` :**

- Le type en étiquette (icône du type et nom : deployment, operation, drift, incident, rpa usage), le `StatusMark`, l'heure, puis le bouton de fermeture.
- Le titre, en style `title`.
- Les pastilles service, environnement et owner, avec leurs icônes. Chaque pastille est un bouton qui filtre les vues temporelles sur sa valeur (`onFilter('service' | 'env' | 'owner', valeur)`). Les stakeholders figurent dans l'infobulle de l'owner. La priorité suit, en pastille discrète non cliquable.
- Les liens : `PR #1287` et la clé du ticket, en boutons qui ouvrent la source dans un nouvel onglet. Un lien absent (`null`) devient un emplacement en pointillé avec un bouton +. On le montre volontairement, pour inciter à compléter l'événement.

**Bande d'impact.** Si `impact` vaut `true`, une bande pleine largeur en `impact` / `on-impact` affiche « Users impacted » et une note (canal notifié, status page). Si `impact` vaut `false`, une ligne discrète indique « No user impact declared ». L'impact est indépendant du statut : un déploiement réussi peut avoir un impact. C'est la seule couleur hors statut du système.

**Corps :** la phrase de résumé si elle existe, puis `details` pour les champs secondaires (source, horaires, notifications, identifiant), et `history`, le changelog avec ses glyphes.

**Pied :** au plus trois actions, avec une seule primary.

**Comportement :**

- Il n'y a pas de voile : la liste reste visible, et ↑ ↓ dans la liste font défiler le drawer d'un événement à l'autre. esc le ferme.
- Il glisse depuis la droite en 180 ms, `cubic-bezier(0.2, 0, 0, 1)`, et apparaît sans animation avec `prefers-reduced-motion`.
- Le drawer peut s'ouvrir via une URL (`?event=<id>`), pour qu'un lien partagé ouvre directement le détail.

Rétrocompatibilité : sans service, environnement ni owner, l'en-tête revient à la ligne de métadonnées `meta`, et la zone de liens n'apparaît que si `pullRequest` ou `ticket` est fourni.

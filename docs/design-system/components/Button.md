# Button

Trois variantes, deux tailles. Le bouton primary en encre est rare : un seul par zone.

- **primary** (`ink` / `on-ink`) : l'action principale de la page ou du drawer, par exemple `New` dans la barre du haut ou `Edit event` dans le drawer.
- **secondary** (`surface`, bord `rule-strong`) : les actions courantes comme `Lock service` ou `Export`.
- **ghost** : les actions tertiaires et les boutons icône (fermer, copier).
- **sm** (`control-sm`, 30 px) : à utiliser dans les barres de filtres et les en-têtes de panneau.

Le bouton `New` porte un chevron (`iconRight="chevron-down"`) et ouvre un menu : event, lock, drift, service, RPA. On n'aligne jamais plusieurs boutons « New … » côte à côte. Le chartreuse n'est jamais une couleur de bouton : il marque le présent, pas une action. Le focus clavier dessine un anneau `focus-ring` de 2 px.

# Sidebar

La navigation principale, en quatre groupes, avec des libellés de groupe en mono minuscule.

- La page active est surlignée en `signature`, avec le texte et l'icône en `on-signature`. C'est le « vous êtes ici » de la marque.
- `count` n'affiche qu'un nombre qui appelle une action, par exemple les locks actifs ou les drifts ouverts. On ne met pas de compteur sur une page de consultation.
- La largeur vaut `sidebar-w`. Sous 960 px, la barre se replie en symbole seul, avec les icônes et des infobulles.
- **`collapsed`** donne un rail de 60 px : le symbole du logo, les icônes seules (le nom devient infobulle et nom accessible), les groupes séparés par un filet, les compteurs en petites pastilles. On l'utilise par défaut sur les pages plein écran (Architecture, Streamline en grand) et sous 960 px de large.
- `onToggle` affiche en bas un bouton pour replier ou déplier la barre. Le choix de l'utilisateur est mémorisé par page.

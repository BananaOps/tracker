# Icon

Le jeu d'icônes dessiné pour Tracker : grille de 16 px, trait de 1.5 px, extrémités carrées, angles vifs.

Les formes viennent de l'instrument de mesure : axes, graduations, aiguilles, barres. Chaque icône hérite de `currentColor`.

- Au repos, une icône est en `muted`. Elle passe en `ink` au survol, et en `on-signature` dans l'item de navigation actif.
- Une icône décorative n'a pas de `title` et reste masquée aux lecteurs d'écran. Une icône seule dans un bouton a besoin d'un `aria-label` sur le bouton.
- Le triangle est réservé au statut warning, donc aucune icône n'en contient.
- Pour ajouter une icône, on la dessine sur la même grille, avec les mêmes extrémités, et on l'ajoute à `Tracker.icons`.

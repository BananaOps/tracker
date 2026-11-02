# StatusMark

L'étiquette de statut : un glyphe à signe intérieur et un libellé mono, dans un contenant de 22 px. C'est le seul endroit où les couleurs `failed` et `warning` apparaissent.

| status | glyphe (12 px dans l'étiquette) | étiquette |
| --- | --- | --- |
| failed | carré plein marqué d'un ✕ | fond `failed-wash`, texte `failed`, graisse 500 |
| warning | triangle plein marqué d'un ! | fond `warning-wash`, texte `warning`, graisse 500 |
| running | arc ouvert et point central, en rotation lente | fond `signature`, texte `on-signature`, graisse 500 |
| done | cercle et ✓ | filet plein `tag-line`, texte `muted`, graisse 400 |
| open | cercle vide | filet pointillé `tag-line`, texte `muted`, graisse 400 |

**Pourquoi des étiquettes.** Dans une liste, les écarts doivent se repérer de loin, sans lire. Les deux étiquettes lavées (failed, warning) et le surligneur (running) ressortent seules. Les neutres (done, open) restent de simples filets gris, que l'œil saute. Le ✓ de done reste gris : il confirme, il ne célèbre pas.

**Pourquoi un signe dans chaque glyphe.** À petite taille, un carré et un cercle se confondent. Le ✕, le !, le ✓ et l'arc ouvert rendent chaque statut identifiable en niveaux de gris ou pour un lecteur daltonien. Les glyphes ont des extrémités arrondies, ce qui les distingue du jeu d'icônes, dessiné en extrémités carrées.

Règles d'usage :

- Dans une ligne d'événement, l'étiquette se place à droite, alignée sur la première ligne du titre. Il n'y a pas de glyphe en tête de ligne.
- `label={false}` affiche le glyphe seul, à 14 px par défaut, coloré par son ton (`tk-tone--*`), avec le libellé comme nom accessible. On l'utilise là où l'étiquette serait trop lourde : historique du drawer, légendes de graphiques, cellules de calendrier.
- Une seule étiquette par ligne. Pas d'étiquette pour le type, l'environnement ou la priorité, qui restent dans la ligne de métadonnées.
- Le libellé ne se traduit pas et reste en minuscules : `failed`, `warning`, `running`, `done`, `open`.
- La rotation de running s'arrête avec `prefers-reduced-motion`.

# Tracker

L'instrument de bord des équipes ops : ce qui s'est passé, ce qui se passe, ce qui coince.

Tracker suit les déploiements, incidents, drifts, opérations et locks d'une infrastructure distribuée. Il est ouvert par tout le monde : le SRE d'astreinte qui creuse un échec, le dev qui vérifie son déploiement, le lead qui veut savoir en trois secondes si la journée est calme. L'identité, baptisée **Surligneur**, s'inspire du carnet d'ingénieur : papier chaud, encre, trame millimétrée, et un trait de surligneur chartreuse pour ce qui compte maintenant.

## Principes

1. **La couleur signale l'écart.** Seuls `failed` et `warning` portent une couleur de statut, et `impact` signale un impact utilisateur. Ce qui s'est bien passé (`done`) et ce qui attend (`open`) restent dans les neutres (`muted`, `chart-done`, `chart-open`). Le principe a été testé sur le dashboard face à une version « succès en vert » : en neutre, les deux échecs ressortent seuls, et un taux de succès de 60 % n'envoie plus de signal positif trompeur.
2. **Le chartreuse marque le présent.** `signature` signale l'aiguille « now », un événement en cours, la page active de la navigation et la sélection (`signature-wash`). Rien d'autre. S'il apparaît ailleurs, il perd son sens.
3. **Le mono pour les faits, la sans pour les phrases.** Heures, chiffres, versions, identifiants et métadonnées sont en Spline Sans Mono. Les titres et les phrases sont en Spline Sans.
4. **Deux niveaux de lecture.** Chaque écran commence par une phrase de synthèse (style `summary`), puis viennent les chiffres, et le détail s'ouvre au clic dans le drawer. On ne force jamais le lecteur pressé à décoder un graphique.
5. **Filets, pas d'ombres.** Les panneaux se posent sur `paper` et se délimitent par un filet `rule`. `shadow-overlay` est réservée à ce qui flotte : drawer, palette ⌘K, menus.
6. **Deux thèmes égaux.** Clair et sombre sont conçus ensemble. Chaque token a ses deux valeurs, et aucun écran n'est validé tant que les deux n'ont pas été regardés.

## Couleur

Les neutres sont chauds et ne descendent jamais au blanc ou au noir purs : `paper` (#F3F1EC / #131210), `surface`, `sunken`, `overlay`, avec l'encre `ink` et le secondaire `muted`. Les bords décoratifs utilisent `rule` et `rule-soft`. Un contrôle interactif est toujours bordé de `rule-strong`, qui atteint 3:1.

`signature` (#D4F53C) s'utilise toujours en aplat avec `on-signature` par-dessus. Ne jamais écrire en chartreuse sur `paper` : le contraste est d'environ 1.1:1. Dans les graphiques, l'aiguille « now » utilise `needle` (encre le jour, chartreuse la nuit), et le libellé « now 15:31 » est un surligneur.

Les types d'événements ont chacun une couleur de série, réservée aux graphiques : `type-deployment` (cobalt), `type-operation` (sarcelle), `type-drift` (violet), `type-rpa` (ardoise). Les incidents restent en `ink`. Ces teintes ont été choisies pour ne se confondre ni avec les statuts (`failed`, `warning`), ni avec `signature`, ni avec `impact`. On ne les utilise jamais pour colorer une ligne, une étiquette ou un fond : un type se lit par son icône dans l'interface, et par sa couleur seulement dans un graphique.

Les autres données catégorielles (environnements, équipes) utilisent la rampe neutre `data-1` à `data-4`, jamais les couleurs de statut. Au-delà de quatre séries, on regroupe le reste en « other ».

`impact` (magenta, #B5126F en clair, #FF5CB0 en sombre) est la seule couleur hors statut. Elle signale qu'un événement touche les utilisateurs (attribut `impact` de l'événement), quel que soit son statut : un déploiement réussi peut avoir un impact, un échec peut ne pas en avoir. On l'utilise en aplat (`impact` avec `on-impact`) pour la bande du drawer, ou en fond discret (`impact-wash`) pour un marqueur dans une liste. Jamais pour un statut, une catégorie ou une décoration.

L'impact doit se voir sur chaque page, pas seulement dans le détail : marqueur `ImpactMark` dans chaque ligne d'événement et dans les listes de triage, liseré sur les barres de Streamline, métrique « users impacted » dans les bandes de métriques, segment dédié dans la phrase de synthèse, clé `impact:true` dans les filtres et vue enregistrée « Impact ».

À ne pas faire : dégradés, violet ou bleu d'accent, badges de toutes les couleurs, vert de succès, couleur sur un élément purement décoratif.

## Grammaire des statuts

Un statut s'affiche comme une **étiquette** : un glyphe de 12 px à signe intérieur et un libellé mono, dans un contenant de 22 px. Chaque glyphe porte un signe (✕, !, ✓, arc ouvert), pour rester identifiable en niveaux de gris comme pour un lecteur daltonien.

| Statut | Glyphe | Étiquette | Poids visuel |
| --- | --- | --- | --- |
| failed | carré plein marqué d'un ✕ | fond `failed-wash`, texte `failed` | fort |
| warning | triangle plein marqué d'un ! | fond `warning-wash`, texte `warning` | fort |
| running | arc ouvert et point, rotation lente | fond `signature`, texte `on-signature` | fort, c'est le présent |
| done | cercle et ✓ | filet plein `tag-line`, texte `muted` | faible |
| open | cercle vide | filet pointillé `tag-line`, texte `muted` | faible |

Dans une liste, les étiquettes s'alignent sur le bord droit : en descendant la colonne, l'œil ne s'arrête que sur les écarts et sur ce qui est en cours. Le ✓ de done reste gris : il confirme sans célébrer, ce qui garde intact le principe « la couleur signale l'écart ». Ce choix a été testé face à trois autres lectures (glyphes seuls, symboles sans contenant, colonne de statut en tête de ligne).

Hors des listes, quand l'étiquette serait trop lourde (historique du drawer, légendes, cellules de calendrier), on affiche le glyphe seul, coloré par son ton. Le composant `StatusMark` porte cette grammaire : on ne dessine jamais un statut à la main.

## Typographie

Deux familles de la même superfamille, fournies en fichiers variables (OFL) : **Spline Sans** (`--font-sans`) et **Spline Sans Mono** (`--font-mono`).

- Les chiffres sont toujours en mono, avec `font-variant-numeric: tabular-nums`, sans zéro de remplissage : on écrit `2`, pas `02`.
- Les métadonnées sont en minuscules, en mono `data-sm`, séparées par « · » : `deployment · pré-production · P2 · platform-team`.
- On n'utilise pas de labels en capitales espacées. Un label de métrique s'écrit `events / 24h`, pas `TOTAL EVENTS`.
- Les titres sont en casse de phrase. L'interlettrage est négatif sur les grandes tailles, comme l'indique chaque style.

## Voix et contenu

L'interface est en anglais, en casse de phrase, avec des verbes concrets.

- **Heures** au format 24 h : `15:04`, avec les secondes dans le drawer (`15:04:12`).
- **Dates** au format `07 apr 2026`, ou `today` et `yesterday` quand c'est plus clair.
- **Cibles de déploiement** avec une flèche : `Deploy monitoring v2.5.5 → mco`.
- **Phrase de synthèse** construite selon la formule « ce qui demande une action, puis ce qui est en cours, puis ce qui va bien » : *2 deployments failed and need attention. 1 deployment is running on production. 3 events completed, no scheduling overlaps.*
- **États vides** factuels plutôt qu'enjoués : `No overlaps in the last 7 days.`
- Pas d'emoji, pas de points d'exclamation, pas de « Oops ».

## Espace et densité

Grille de 4 px (`space-1` à `space-16`). Les pages ont une marge de `space-8` et les panneaux un padding de `space-5`. Les blocs sont séparés de `space-6`.

Les listes et tableaux existent en deux densités, réglables par l'utilisateur et mémorisées :

| Densité | Padding de ligne | Hauteur | Contenu |
| --- | --- | --- | --- |
| Confort (défaut) | `row-pad-comfy` 12 px | ≈ 62 px | titre puis métadonnées sur deux lignes |
| Compact | `row-pad-compact` 6 px | ≈ 32 px | titre et métadonnées sur une ligne, tronqués |

## Motif : la règle graduée

Le temps est la matière de Tracker, donc l'axe du temps est le motif de la marque. Le composant `TimeRuler` affiche des graduations sur une trame millimétrée `grid` au pas de 8 px, des repères majeurs à l'heure en `ink`, des marques d'événements colorées selon leur statut, et l'aiguille `needle` surmontée d'un surligneur « now ». On le trouve en tête de Timeline, de Streamline et dans le graphique de vélocité. On ne l'utilise pas comme décor.

## Iconographie

Le jeu d'icônes est dessiné pour Tracker. Il est exposé par `Tracker.Icon` et visible dans la carte Icon.

- Grille de 16 px, trait de 1.5 px, extrémités carrées, angles vifs, sans remplissage.
- Les formes viennent du vocabulaire de l'instrument : axes, graduations, aiguilles, barres.
- On ne trouve ni robot, ni fusée, ni bouclier, ni clé à molette. Le triangle est réservé au statut warning et n'apparaît jamais dans une icône.
- Les glyphes de statut forment une famille à part : extrémités arrondies et signe intérieur, là où les icônes ont des extrémités carrées et restent vides.
- Les icônes servent à la navigation, aux types d'événements, aux faits d'un événement (`service`, `environment`, `owner`, `impact`, `pull-request`, `ticket`) et aux actions. Elles ne décorent pas un titre ou une carte.
- Couleur `muted` au repos, `ink` au survol, `on-signature` sur la page active.

## Mouvement

Le mouvement est bref et n'a qu'une seule direction.

- **Durées** : 120 ms pour les survols et les fondus, 180 ms pour le drawer.
- **Courbe** : `cubic-bezier(0.2, 0, 0, 1)`, sans rebond.
- **Drawer** : il glisse depuis la droite sans voile, pour que la liste reste visible.
- **Palette ⌘K** : elle apparaît en fondu, avec un léger déplacement de 4 px.
- **Statut running** : l'arc ouvert du glyphe tourne en 1.6 s. Avec `prefers-reduced-motion`, plus rien ne bouge.

## Architecture et patterns

- **Navigation** : barre latérale de `sidebar-w`, en quatre groupes (operations, services, infrastructure, resources). La page active est surlignée en `signature`.
- **Vues temporelles** : Timeline, Streamline et Calendar restent trois pages, mais partagent une `FilterBar` commune. La période et les filtres suivent l'utilisateur d'une vue à l'autre.
- **Création** : un seul bouton `New` avec menu (event, lock, drift, service, RPA), doublé de la palette ⌘K qui sert aussi à chercher et à naviguer.
- **Détail** : un clic sur un événement ouvre l'`EventDrawer` à droite (`drawer-w`). La liste reste visible et navigable au clavier (↑ ↓), et le drawer suit la sélection.
- **Densité** : un réglage confort ou compact, global, dans le menu utilisateur.
- **Impact** : présent sur toutes les pages qui listent ou résument des événements (voir `ImpactMark`). Une page qui montre des événements sans leur impact est incomplète.

## Logo

Le symbole est un T dont la barre est un trait de surligneur : un fût `surface` sur un carré `ink`, barré de `signature`. Le logotype « tracker » est composé en Spline Sans SemiBold, en minuscules, avec un interlettrage de −0.035 em. Les fichiers se trouvent dans le groupe d'assets Logos, en version encre (fonds clairs) et inverse (fonds sombres). On ne recolore pas le logo, on ne remplace pas le chartreuse, et on ne pose jamais le symbole sur un fond `signature`.

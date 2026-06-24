# Tracker Design System

## Vision

Tracker est une application interne de pilotage des changements et interventions en production. Son rôle est de donner une lecture rapide et fiable de tout ce qui bouge sur le système d'information, avec une interface pensée pour les équipes IT au sens large : développement, opérations, support, management et fonctions transverses.[cite:10]

L'identité visuelle doit évoquer un **mission control** moderne : précise, calme, technologique, aérée, mais capable de faire ressortir immédiatement les zones de risque, les collisions temporelles et les changements importants.[web:16][web:18][web:26]

Le design ne doit jamais ressembler à une démo générée par IA. Il doit privilégier la clarté, la densité maîtrisée, une structure répétable, et une personnalité visuelle spécifique inspirée de l'espace sans tomber dans le cliché sci-fi.[page:1]

## Principes produit

### 1. Scan first

L'utilisateur doit comprendre l'essentiel d'un changement en quelques secondes. Chaque event doit exposer en priorité : service, environnement, impact, action, priorité, titre, date de début et date de fin.[cite:10]

### 2. Calm surfaces, strong signals

L'interface repose sur des surfaces neutres et respirantes. La couleur sert avant tout à signaler, hiérarchiser et attirer l'attention sur les éléments critiques, pas à remplir visuellement l'écran.[web:18][page:1]

### 3. One visual grammar

Les quatre vues principales — dashboard, calendrier, streamline et catalogue de services — doivent partager la même grammaire visuelle : mêmes badges, mêmes priorités de lecture, mêmes conventions de couleur, mêmes espacements, même système d'états.[page:1]

### 4. Space as metaphor, not decoration

L'univers spatial sert de langage visuel fonctionnel : fusée pour le lancement, météorite pour l'impact, orbite pour la planification, constellation pour les relations entre services. Il ne sert pas à produire des fonds illustrés, des halos néon ou une esthétique cockpit futuriste.[web:29][page:1]

### 5. Airy by default

La densité générale doit rester très aérée. Les marges, hauteurs de ligne, tailles de conteneurs et respirations entre blocs doivent donner une sensation de maîtrise et non d'empilement, même dans des vues riches en événements.[page:1]

## Positionnement visuel

### Ton

Le ton visuel de Tracker est : **moderne, tech, coloré, efficace**.

### Références

Les inspirations principales sont Datadog, Grafana et Plane, pour leur capacité à produire des interfaces produit cohérentes, structurées et adaptées à des usages opérationnels.[web:26][web:21][web:14]

### Ce que Tracker doit évoquer

- Une tour de contrôle opérationnelle.
- Un système de navigation dans le temps et les impacts.
- Un cockpit produit sobre, crédible et product-ready.
- Une interface d'observabilité des changements, pas un dashboard marketing.[web:16][web:18]

### Ce que Tracker ne doit pas évoquer

- Une landing page SaaS générique.
- Une UI futuriste illisible avec effets néon.
- Une maquette de concept Dribbble sans logique métier.
- Une interface chargée de couleurs arbitraires ou d'illustrations spatiales décoratives.[page:1]

## Fondations visuelles

### Modes

Le design system doit être conçu nativement en mode clair et mode sombre. Aucun écran ne doit être pensé en light puis “adapté ensuite” au dark mode.[page:1]

### Palette

La palette repose sur un socle neutre et une sémantique colorée claire.

#### Couleurs de marque

- **Primary / Orbit Blue** : bleu spatial profond, utilisé pour la navigation active, les actions principales, les éléments sélectionnés, les focus states et l'identité produit.
- **Primary Soft** : version plus légère du bleu pour fonds subtils, badges sélectionnés, zones de contexte.
- **Impact / Meteor Orange** : orange météorite pour impact fort, criticité élevée, conflits, chevauchements et événements sensibles.
- **Success / Signal Green** : confirmation, changement validé, statut nominal.
- **Warning / Solar Amber** : vigilance, risque modéré, information importante.
- **Neutral** : gamme de gris bleutés ou gris chauds très sobres pour le socle de lecture.

#### Intention couleur

- Le bleu porte l'identité du produit.
- L'orange porte la notion d'impact.
- Le vert porte la sécurité ou la réussite.
- Le jaune/ambre porte l'attention.
- Les services et environnements ne doivent pas consommer la couleur principale ; ils utilisent des accents secondaires ou des badges discrets.[web:18][page:1]

#### Palette suggérée

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--color-primary` | `#1B3575` | `#4A7FDB` | Actions principales, sélection, navigation |
| `--color-primary-soft` | `#EEF1F8` | `#1E2535` | Fonds subtils et états actifs doux |
| `--color-impact-high` | `#E8580A` | `#E8580A` | Impact fort, collision, priorité haute |
| `--color-impact-medium` | `#F59E0B` | `#F59E0B` | Vigilance, priorité intermédiaire |
| `--color-success` | `#16A34A` | `#22C55E` | Statut nominal |
| `--color-bg` | `#EFF1F6` | `#0D1117` | Fond principal |
| `--color-surface` | `#FFFFFF` | `#161C2A` | Cartes, panneaux |
| `--color-surface-2` | `#F3F5F9` | `#1A2030` | Surfaces secondaires |
| `--color-border` | `rgba(15, 25, 55, 0.09)` | `rgba(255, 255, 255, 0.07)` | Bordures discrètes |
| `--color-text` | `#0D1117` | `#E8EBF2` | Texte principal |
| `--color-text-muted` | `#6E7891` | `#7A87A8` | Texte secondaire |

### Règles d'usage couleur

- 80% de l'interface doit rester neutre.
- La couleur ne doit jamais être utilisée pour remplir toutes les cartes d'une vue.
- L'impact se voit d'abord par la couleur, puis par l'icône et le libellé.
- Les services doivent rester identifiables sans transformer l'interface en mosaïque multicolore.[cite:1][page:1]

## Typographie

### Intention

La typographie doit être très lisible, technique, moderne et sans effet de mode excessif. L'application est un outil de lecture et de coordination, pas un site éditorial.[page:1]

### Recommandation

- **Font body** : Inter, Geist ou Satoshi.
- **Font accent possible** : une seule variante plus technique pour certains labels ou chiffres, mais optionnelle.
- **Display font** : aucune police expressive de type landing page ; l'interface doit rester produit et non promotionnelle.[page:1]

### Échelle

- Page title : 28–32px max.
- Section title : 18–20px.
- Card title / event title : 15–16px.
- Body : 14–15px.
- Metadata / badges : 12–13px.

### Règles typo

- Maximum 4 tailles visibles sur un même écran.
- Les nombres de dates, heures et priorités doivent utiliser `tabular-nums`.
- Les labels de colonnes et métadonnées peuvent être semi-majuscules avec tracking léger.
- Les textes longs doivent être rares ; préférer des formulations courtes et structurées.[page:1]

## Iconographie

### Base

Font Awesome est autorisé pour la cohérence technique du projet, mais son usage doit rester sobre et systémique.[cite:1]

### Mapping spatial recommandé

| Concept | Métaphore | Usage |
|---|---|---|
| Marque / produit | Fusée | Logo, onboarding, identité globale |
| Impact fort | Météorite | Badge d'impact élevé, incident potentiel |
| Changement planifié | Orbite / trajectoire | Timeline, planning, vue streamline |
| Service transverse | Satellite | Catalogue, cartes de services |
| Environnement | Planète | Prod, preprod, staging, etc. |
| Fenêtre temporelle | Horizon / anneau | Début-fin, slots, zoom temps |

### Règles iconographiques

- Une icône ne remplace jamais un libellé critique.
- Pas d'icône dans une grosse pastille colorée par défaut.
- Les icônes d'impact doivent être petites, nettes, visibles, mais jamais décoratives.[page:1]

## Layout

### Shell applicatif

- Header compact avec contexte global, sélecteurs temporels, recherche et actions.
- Sidebar ou navigation latérale stable pour les quatre vues principales.
- Surface de contenu large et respirante.
- Gouttières généreuses et alignement strict sur grille 4px/8px.[page:1]

### Densité

La densité doit être volontairement aérée :

- Cartes avec padding généreux.
- Hauteur de ligne confortable.
- Espaces visibles entre filtres, blocs, tableaux et événements.
- Peu de séparateurs lourds ; préférer surfaces et contrastes subtils.

### Bordures et relief

- Bordures fines et neutres.
- Ombres discrètes, surtout en light mode.
- Relief doux, jamais “glassmorphism” ni glow futuriste.[page:1]

## Vues principales

### Dashboard

Objectif : donner une lecture immédiate de la situation.

Contenu attendu :
- événements à venir,
- changements en cours,
- impacts élevés,
- conflits de planning,
- résumé par service ou environnement,
- raccourcis vers les vues détaillées.

Le dashboard doit favoriser la lecture transversale et les points d'attention. Il ne doit pas devenir un mur de widgets.[web:16][web:18]

### Calendrier

Objectif : visualiser les interventions dans le temps.

Principes :
- lisibilité de la plage temporelle,
- hiérarchie claire entre jour, heure et event,
- couleurs d'impact immédiatement visibles,
- zoom facile entre vue 1 jour et vue 7 jours.[page:1]

### Streamline

Objectif : fournir une lecture de type planning board opérationnel.

Structure :
- lignes horizontales regroupées par service ou environnement,
- colonnes temporelles par heure sur une journée ou par jour sur sept jours,
- blocs d'événements positionnés sur leur fenêtre réelle,
- indicateurs visuels de chevauchement, de criticité et de densité.

C'est la vue la plus spécifique du produit. Elle doit évoquer une trajectoire de mission ou une table de navigation, sans effet sci-fi.[page:1]

### Catalogue de service

Objectif : cartographier les projets/services suivis.

Contenu attendu :
- identité du service,
- équipe responsable,
- environnements,
- criticité métier,
- changements récents ou à venir,
- liens vers événements associés.

Cette vue doit être plus structurelle et moins événementielle, avec une hiérarchie claire entre fiche service et activité récente.[page:1]

## Composants clés

### Event card

Structure minimale :
- titre,
- service,
- environnement,
- action,
- impact,
- priorité,
- début,
- fin,
- statut éventuel.

Règles :
- structure identique partout,
- version compacte et version détaillée,
- lecture possible en 2 niveaux : scan rapide puis détail.[cite:10]

### Impact badge

Le badge d'impact est un composant central. Il combine texte, couleur et éventuellement icône météorite pour les cas les plus sensibles.

### Service badge

Le badge service identifie un domaine sans dominer visuellement. Il peut prendre la forme d'un libellé avec accent coloré subtil ou icône dédiée.

### Time rail / time grid

Composant essentiel pour calendrier et streamline :
- repères temporels très lisibles,
- séparations douces,
- état “maintenant”,
- support des survols et sélections,
- collisions visibles sans bruit excessif.

### Filter bar

Toujours simple et stable : période, environnement, service, impact, priorité, type d'action.

### Empty / loading / error states

Ces états doivent être conçus explicitement. Une app opérationnelle sans états soignés paraît immédiatement inachevée.[page:1]

## Motion

La motion doit être courte, utile et discrète.

Usages autorisés :
- survol léger,
- focus net,
- apparition douce de panneaux,
- transition de zoom temporel,
- déplacement fluide dans la streamline.

Usages à éviter :
- effets de particules,
- scintillement,
- pulsations agressives,
- parallaxe décorative,
- animations type radar ou cockpit.[page:1]

## Style par vue

### Dashboard

- cartes larges,
- hiérarchie forte,
- résumé d'abord,
- couleur ponctuelle,
- widgets limités.

### Calendrier

- grille claire,
- repères de temps très visibles,
- events lisibles même en densité moyenne,
- bon contraste light/dark.

### Streamline

- vue signature du produit,
- fort travail sur les axes,
- espaces généreux,
- alignement très propre,
- priorité donnée à la lisibilité horizontale.

### Catalogue

- fiches services sobres,
- accent spatial plus discret,
- lisibilité des relations et métadonnées.

## Anti-patterns

Les éléments suivants sont interdits :

- gradients violet/bleu génériques,
- hero centré de landing page,
- cartes SaaS clonées en 3 colonnes,
- glow néon,
- fonds galaxie ou étoiles décoratives partout,
- usage excessif de la couleur sur les services,
- icônes dans des ronds flashy,
- glassmorphism,
- badges sans hiérarchie,
- timeline trop compacte ou trop “tableur”.[page:1]

## Traduction Tailwind / shadcn

### Principes d'implémentation

- Utiliser `shadcn/ui` comme base structurelle, pas comme rendu final par défaut.
- Surcharger les tokens de couleur, radius, spacing et shadows pour obtenir une identité propre.
- Créer des variants métiers dédiés : `impact-high`, `impact-medium`, `service`, `timeline-event`, `timeline-collision`, `catalog-card`.
- Définir un thème light/dark complet dès le début, sans divergence visuelle entre composants maison et composants shadcn.[page:1]

### Tokens recommandés

- `brand.orbit` (`#1B3575`)
- `brand.orbitSoft` (`#EEF1F8`)
- `semantic.impact.high` (`#E8580A`)
- `semantic.impact.medium` (`#F59E0B`)
- `semantic.danger` (`#C0330A`)
- `semantic.success` (`#16A34A`)
- `surface.default` (`#FFFFFF` / `#161C2A`)
- `surface.elevated` (`#F3F5F9` / `#1E2535`)
- `surface.subtle` (`#EFF1F6` / `#1A2030`)
- `grid.line` (`rgba(15, 25, 55, 0.09)` / `rgba(255, 255, 255, 0.07)`)
- `timeline.now` (`#E8580A`)
- `timeline.collision` (`#C0330A`)

## Voix produit

Le wording UI doit rester clair, technique et humain.

Préférer :
- “Impact élevé”
- “Fenêtre d'intervention”
- “En cours”
- “Conflit potentiel”
- “Service concerné”
- “Changement planifié”

Éviter :
- “Amazing insights”
- “Unlock visibility”
- “Powerful operations”
- “Seamless observability”
- tout wording générique de marketing SaaS.[page:1]

## Résultat attendu

Quand quelqu'un ouvre Tracker, l'impression doit être la suivante :

- l'application est sérieuse et moderne ;
- les changements importants ressortent immédiatement ;
- la timeline est lisible sans effort ;
- l'univers spatial donne une personnalité propre au produit ;
- l'ensemble paraît dessiné, pas généré.[web:16][web:26][page:1]

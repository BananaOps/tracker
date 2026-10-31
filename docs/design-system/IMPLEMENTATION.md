# Implémenter le design system Tracker « Surligneur » dans `web/`

Tu vas refondre l'interface de Tracker (`web/`, React 19, TypeScript, Vite, Tailwind 4) pour appliquer le design system documenté dans `docs/design-system/`. Le travail est découpé en cinq lots. Chaque lot fait l'objet d'une PR séparée, et l'application doit rester fonctionnelle à la fin de chacun.

## Sources, à lire avant tout code

- `docs/design-system/README.md` : le livre de marque. Ses principes, la règle de couleur, la grammaire des statuts, la typographie, la voix, la densité, le mouvement et l'architecture de navigation font foi.
- `docs/design-system/tokens.json` : la source de vérité des couleurs (clair et sombre), de la typographie, des espacements, des rayons, des tailles et de l'ombre.
- `docs/design-system/components/*.md` : la spécification de chaque composant (rôle, variantes, règles d'usage, accessibilité).
- `docs/design-system/reference/` : `bundle.js` et `bundle.css` sont une implémentation de référence en React (sans JSX, avec un namespace global), et `index.d.ts` donne les props attendues. **Ne les importe pas.** Réimplémente proprement en TypeScript, mais reprends exactement les rendus, les classes visuelles, les tracés SVG (icônes, glyphes de statut) et les comportements.
- `docs/design-system/mockups/` : les maquettes de pages validées. Lis d'abord `mockups/README.md` pour comprendre leur format.
- `docs/design-system/assets/logos/` et `docs/design-system/fonts/` : le logo en SVG, et les polices Spline Sans et Spline Sans Mono (licence OFL, en secours si les paquets Fontsource posent problème).
- `CLAUDE.md`, `web/src/index.css`, `web/src/contexts/ThemeContext.tsx`, `web/src/components/Layout.tsx`, `web/src/components/ui/*`, `web/src/types/api.ts` et `proto/event/v1alpha1/event.proto` : l'existant à respecter.

Ignore l'ancien `design.md` : il est remplacé par `docs/design-system/`.

## Règles non négociables

1. **Aucune couleur en dur** dans les composants et les pages (ni hex, ni rgb, ni classes de palette Tailwind comme `blue-500`). Tout passe par les tokens.
2. **La couleur signale l'écart.** Seuls `failed` et `warning` portent une couleur de statut. `done` et `open` restent neutres, et il n'y a jamais de vert de succès. `impact` (magenta) signale un impact utilisateur, quel que soit le statut. Les couleurs `type-*` ne servent que dans les graphiques.
3. **`signature` (chartreuse) marque uniquement le présent** : l'aiguille « now », ce qui est en cours, la page active et la sélection (`signature-wash`). On l'utilise toujours en aplat sous un texte `on-signature`, jamais comme couleur de texte.
4. **Un statut passe toujours par `StatusMark`, un impact par `ImpactMark`.** On ne dessine jamais un statut à la main.
5. **Spline Sans Mono pour les faits** (heures, chiffres, versions, identifiants, métadonnées en minuscules séparées par « · »), **Spline Sans pour les phrases**. Chiffres tabulaires, sans zéro de remplissage, et pas de labels en capitales espacées.
6. **Filets plutôt qu'ombres.** `shadow-overlay` est réservée au drawer, à la palette et aux menus.
7. **Clair et sombre sont égaux.** Chaque écran est vérifié dans les deux thèmes.
8. **Accessibilité** : anneau de focus `focus-ring` de 2 px sur tout élément interactif, noms accessibles pour les boutons icône, les glyphes et l'impact, rôles listbox et option sur les listes navigables, `prefers-reduced-motion` respecté, contrastes du README tenus.
9. **Textes de l'interface en anglais**, en casse de phrase. Pas d'emoji, pas de point d'exclamation.
10. **Pas de dégradés, pas d'accent violet ou bleu générique, pas de pastilles multicolores** pour le type ou l'environnement, et pas de bordure gauche colorée sur les cartes.

## Méthode de travail

- Au début de chaque lot, présente un plan court : fichiers touchés, décisions, risques. **Attends ma validation avant de coder.**
- Ne modifie ni le backend ni `proto/` sans me le demander. Quand une donnée manque, propose l'option côté client et l'option côté API.
- Avant de rendre un lot : `npm run lint`, `npm run build:check` et `npm test` doivent passer dans `web/`. Ajoute des tests Vitest pour la logique pure.
- Transforme `web/src/pages/ThemeTest.tsx` en vitrine vivante du design system : chaque nouveau composant y apparaît dans tous ses états, en clair et en sombre. Mets-la à jour à chaque lot.
- Garde les routes et les fonctionnalités existantes. Un écran pas encore refondu doit continuer de fonctionner.
- Fais des commits petits et explicites.

## Lot 1 — Fondations

1. Copie `docs/design-system/tokens.json` vers `web/src/design/tokens.json`, puis écris `web/scripts/build-tokens.mjs`, qui génère `web/src/design/tokens.css` : les tokens de couleur clairs sous `:root`, les sombres sous `.dark`, et les autres familles (espacement, rayon, taille, ombre) sous `:root`. Branche le script sur `prebuild` et `predev`. Le fichier généré porte une mention « ne pas modifier à la main ».
2. Dans `web/src/index.css`, importe `tokens.css` et déclare un bloc `@theme inline` qui expose les tokens à Tailwind : `--color-paper: var(--paper)`, et de même pour tous les tokens de couleur, plus les polices, les rayons et les espacements. Les utilitaires deviennent `bg-paper`, `text-ink`, `border-rule-strong`, `text-impact`, `bg-signature`, etc. Crée des utilitaires `@utility` pour les styles typographiques de `tokens.json` (`text-metric`, `text-title`, `text-summary`, `text-data-sm`…).
3. Polices : installe `@fontsource-variable/spline-sans` et `@fontsource-variable/spline-sans-mono`, et retire Plus Jakarta Sans, IBM Plex Mono et Space Grotesk.
4. **Pont de compatibilité** : redéfinis les variables `--hud-*` existantes (des composantes RGB utilisées par `rgb(var(--hud-…))`) à partir des nouveaux tokens, en clair et en sombre. `--hud-bg` reprend `paper`, `--hud-surface` reprend `surface`, `--hud-primary` reprend `ink`, `--hud-on-surface-var` reprend `muted`, `--hud-outline-var` reprend `rule`, `--hud-error` reprend `failed`, `--hud-warning` reprend `warning`, et `--hud-success` reprend `muted` (le succès reste neutre). Toute l'application adopte ainsi la palette sans toucher les fichiers qui utilisent `hud-*`. Marque ce bloc comme temporaire.
5. Crée `web/src/lib/status.ts`, avec ses tests :
   - `toDsStatus(apiStatus)` : `failure` et `error` donnent `failed` ; `warning` donne `warning` ; `start` et `in_progress` donnent `running` ; `success`, `done` et `close` donnent `done` ; tout le reste (`open`, `planned`, `waiting_approval`, `snapshot`, `user_update`, `recommandation`, non spécifié) donne `open`.
   - `toTypeIcon(type)` : `deployment`, `operation`, `drift` (icône `drifts`), `incident` et `rpa_usage` (icône `rpa`).
6. Ajoute à `CLAUDE.md` une section « Design system » qui pointe vers `docs/design-system/` et reprend les dix règles ci-dessus.

Le lot 1 est terminé quand l'application tourne avec la nouvelle palette et les nouvelles polices dans les deux thèmes, sans régression fonctionnelle, et quand la vitrine affiche les couleurs et les styles typographiques.

## Lot 2 — Composants de base, dans `web/src/components/ui`

Implémente en TypeScript, avec `class-variance-authority` quand il y a des variantes, en suivant `components/*.md`, `reference/index.d.ts` et le rendu de `reference/bundle.js` et `bundle.css` :

- **`Icon`** : le jeu d'icônes sur mesure. Reprends les tracés de `icons` dans `bundle.js`, sur une grille de 16 px, trait de 1.5, extrémités carrées. Expose `name`, `size` et `title`.
- **`Logo`** : symbole et logotype, à partir des tokens. Les SVG de `assets/logos` servent hors application (favicon, README).
- **`Button`** : variantes `primary`, `secondary` et `ghost`, tailles `md` et `sm`, bouton icône. Fusionne avec l'actuel `button.tsx` et `button-variants.ts`, ou remplace-les.
- **`Kbd`** et **`Highlight`**.
- **`StatusMark`** : étiquette de 22 px avec glyphe à signe intérieur, ou glyphe seul avec `label={false}`. Les tracés des glyphes sont dans `Glyph` de `bundle.js`. La rotation de `running` s'arrête avec `prefers-reduced-motion`.
- **`ImpactMark`** : versions compacte et avec libellé.
- **`SegmentedControl`** : sur `@radix-ui/react-toggle-group`, ou des boutons avec `aria-pressed`.
- **`MetricStrip`** : avec `tone` (`failed`, `warning`, `impact`), `delta` et `trend`. Seul `trend: 'worse'` est coloré.
- **`EventRow`** et **`EventList`** : trois colonnes (heure, titre avec métadonnées, puis `ImpactMark` et `StatusMark` à droite), densités confort et compacte, `role="listbox"`, sélection et navigation ↑ ↓ au clavier.
- **`Sidebar`** : groupes, page active en `signature`, compteurs, et mode `collapsed` en rail de 60 px avec infobulles.
- **`TimeRuler`** : props `startHour` et `endHour`.
- **`EventDrawer`** : mise en page « bandeau » (type, statut, titre, pastilles service, environnement et owner qui déclenchent `onFilter`, liens PR et ticket avec emplacement vide en pointillé, bande d'impact, détails, historique tiré du changelog).
- **`CommandPalette`** : sur `cmdk` dans un Dialog Radix, avec groupes, raccourcis et navigation clavier.

Chaque composant apparaît dans la vitrine et a au moins un test de rendu et d'accessibilité : nom accessible, rôle, état.

## Lot 3 — Coquille et navigation

- **`Layout.tsx`** : la nouvelle `Sidebar` (quatre groupes : operations, services, infrastructure, resources), une barre du haut avec le bouton « Search or jump to… ⌘K » qui ouvre la `CommandPalette`, et **un seul bouton `New`** avec menu (event, lock, drift, service, RPA), branché sur `CreatePanelContext`, à la place des cinq boutons actuels. Supprime les emojis du pied de page.
- **Hook de raccourcis** : `/` focalise le filtre de la page, ⌘K ouvre la palette, G puis D, T ou S navigue, esc ferme. Les raccourcis sont ignorés pendant la saisie dans un champ.
- **`QueryBar`**, nouveau composant décrit dans `mockups/search-and-filters.dc.html` et `mockups/streamline.dc.html` :
  - syntaxe `key:value`, `key:a,b`, `-key:value`, `"phrase"` et texte libre ;
  - clés `env`, `status`, `type`, `owner`, `service`, `priority`, `impact` ;
  - autocomplétion des clés, puis des valeurs avec leur nombre de résultats ;
  - jetons supprimables, ⌫ sur un champ vide retire le dernier jeton.
- **Parseur `parseQuery` et `serializeQuery`**, testé, avec l'état des filtres dans l'URL. Les filtres et la période sont partagés entre Timeline, Streamline et Calendar. Traduis les filtres vers les paramètres de `SearchEvents` quand ils existent. `owner` n'y est pas : filtre côté client et signale-le-moi.
- **Vues enregistrées** (onglets avec compteur, « Save view ») stockées en localStorage pour commencer.

## Lot 4 — Pages, dans cet ordre

Pour chaque page, suis la maquette correspondante. La mise en page, les textes, les composants et les comportements de `renderVals()` font foi. Remplace les données d'exemple par celles de l'API.

1. **Dashboard** (`mockups/dashboard.dc.html`) :
   - phrase de synthèse dont chaque segment filtre l'activité ;
   - `MetricStrip`, dont la métrique « users impacted » ;
   - Needs attention (échecs, impacts, chevauchements à venir, warnings) et Up next (planifié, chevauchements, locks) ;
   - Activity avec filtres par statut et leurs compteurs, histogramme des 24 h cliquable, `EventList` et `EventDrawer` ;
   - sélecteur everyone / my team.
2. **Timeline** (pas de maquette dédiée) : `QueryBar`, `TimeRuler` en tête, `EventList` dans les deux densités et `EventDrawer`. Remplace `EventDetailsModal`, et fais en sorte que `/events/:id` ouvre le drawer.
3. **Streamline** (`mockups/streamline.dc.html`) : garde la logique de `EventsStreamline.tsx` et rhabille-la.
   - vues enregistrées, `QueryBar`, regroupement par environnement ou par équipe, option « Overlaps only » ;
   - navigateur de chevauchements Previous / Next (raccourcis P et N), qui réutilise le calcul de `EventsOverlaps` ;
   - aperçu des 24 h, couloirs, passé grisé, aiguille « now », barres stylées selon le statut avec un liseré `impact`, hachures de chevauchement et de lock ;
   - drawer de résolution de chevauchement.
4. **Architecture** (`mockups/architecture.dc.html`) : garde React Flow.
   - type de nœud `ServiceNode`, et disposition automatique de gauche à droite via `dagre` ou `elkjs` (les points d'entrée à gauche) ;
   - clic sur un service : simulation de panne, avec le rayon d'impact calculé côté client à partir de `dependencies_in` et `dependencies_out` ;
   - panneau d'impact (phrase, métriques, services touchés directement et en cascade, équipes à prévenir via `communication_channels`, événements du jour), mode « what it needs », vue classement par rayon d'impact ;
   - `Sidebar` repliée par défaut, et KPI ainsi que filtres en pastilles supprimés.
5. **Insights** (`mockups/insights.dc.html`) : garde Recharts, avec des couleurs en `var(--type-*)`, `var(--impact)` et `var(--ink)`.
   - `MetricStrip` comparée à la période précédente ;
   - activité quotidienne empilée par type avec la période précédente en pointillé ;
   - répartition par type ;
   - tableau « Reliability and impact by service », triable ;
   - tendance sur 12 mois avec un sélecteur de mesure ;
   - **pas de phrase de synthèse en haut de cette page**.

   Calculs : taux d'échec = déploiements en échec ÷ déploiements (via `GetEventStats` filtré) ; rétablissement = médiane de `metadata.duration` des incidents ; impact = durée cumulée des événements avec `impact = true` ; tendance via `GetEventStatsByMonth`. Signale-moi ce qui demanderait un endpoint dédié.
6. **Le reste**, avec les mêmes composants et règles : Calendar (surcharge le thème Schedule-X avec les tokens), Overlaps, Catalog, Compliance, Drifts, RPA usage, Locks, Links, Docs, ainsi que les formulaires de création.

## Lot 5 — Nettoyage et garde-fous

- Supprime le pont `--hud-*`, puis toute référence restante à `hud-*`. Supprime aussi les couleurs en dur (`T.primary`…), les `.icon-gradient`, Font Awesome et Lucide, une fois toutes les icônes passées au jeu sur mesure.
- Ajoute une règle de lint qui interdit les couleurs en dur et les classes de palette Tailwind dans `web/src`, sauf dans `web/src/design/`.
- Fais une passe d'accessibilité : navigation clavier complète, focus visible, contrastes, `prefers-reduced-motion`.
- Mets à jour `web/README.md` et les captures de `docs/assets/screenshots/`.

## Pour commencer

Lis toutes les sources listées plus haut, puis présente-moi le plan du lot 1. N'écris pas de code avant ma validation.

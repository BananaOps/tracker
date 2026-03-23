# 🔗 Links Page

La page Links est un tableau de bord de liens rapides inspiré de [Homer](https://github.com/bastienwirtz/homer). Elle centralise tous vos outils et ressources en un seul endroit.

## Fonctionnalités

- **Liens personnalisés** : Ajoutez, éditez et supprimez des liens stockés en base MongoDB
- **Intégration Homer** : Importez automatiquement les liens depuis un dashboard Homer existant
- **Recherche rapide** : Filtrez les liens inline ou via `Ctrl+K` depuis n'importe quelle page
- **Groupes** : Organisez vos liens par catégories
- **Favicons automatiques** : Les icônes sont récupérées automatiquement via Google S2 API
- **Icônes Font Awesome** : Supportées via la classe CSS (ex: `fas fa-rocket`)

## Ajouter des Liens Manuellement

1. Cliquer sur **Add Link** en haut à droite de la page
2. Remplir le formulaire :
   - **Name** : Nom affiché du lien
   - **URL** : URL complète (ex: `https://grafana.example.com`)
   - **Group** : Catégorie (existante ou nouvelle)
   - **Description** : Texte secondaire optionnel
   - **Icon** : Classe Font Awesome (ex: `fas fa-chart-bar`) ou laisser vide pour le favicon auto
   - **Logo URL** : URL d'une image logo (prioritaire sur l'icône)
   - **Color** : Couleur de fond de l'icône (si pas de logo/favicon)
3. Cliquer **Save**

### Éditer / Supprimer

Au survol d'un lien personnalisé, les boutons crayon et poubelle apparaissent à droite.

## Intégration Homer

Homer est un dashboard de liens open source. Tracker peut importer ses liens automatiquement.

### Configuration Backend

Définir la variable d'environnement `HOMER_URL` avec l'URL de votre instance Homer :

```bash
# .env
HOMER_URL=http://homer.example.com
```

Le backend expose ensuite `/api/homer-links` qui proxy le fichier `config.yml` de Homer et retourne les liens et services.

### Configuration Frontend (développement)

En mode développement, le frontend utilise un proxy Vite pour éviter les problèmes CORS :

```bash
# web/.env.local
VITE_HOMER_URL=http://homer.example.com
```

```typescript
// web/vite.config.ts — proxy automatiquement configuré
'/homer-proxy': {
  target: process.env.VITE_HOMER_URL,
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/homer-proxy/, '')
}
```

### Configuration Helm

```yaml
# values.yaml
env:
  homer:
    url: "http://homer.example.com"
```

### Format du config.yml Homer

Tracker supporte le format standard Homer :

```yaml
# config.yml Homer
links:
  - name: GitHub
    url: https://github.com
    icon: fab fa-github

services:
  - name: Monitoring
    items:
      - name: Grafana
        url: https://grafana.example.com
        subtitle: Metrics & dashboards
        icon: fas fa-chart-bar
      - name: Prometheus
        url: https://prometheus.example.com
        subtitle: Alerting
        icon: fas fa-bell
```

Les liens Homer sont affichés avec un badge **homer** orange pour les distinguer des liens personnalisés. Ils ne peuvent pas être édités depuis Tracker (modifier directement le `config.yml` Homer).

## Recherche Rapide (Ctrl+K)

Le raccourci `Ctrl+K` (ou `⌘K` sur Mac) ouvre une palette de recherche accessible depuis n'importe quelle page. Elle recherche simultanément dans :

- Les liens (locaux, Homer, personnalisés)
- Les services du catalogue

Utiliser les flèches `↑↓` pour naviguer, `Entrée` pour ouvrir, `Échap` pour fermer.

## Icônes Font Awesome

Font Awesome 6 Free est chargé via CDN. Utiliser les classes CSS directement :

```
fas fa-rocket       # Solid icons
fab fa-github       # Brand icons
far fa-calendar     # Regular icons
```

Référence complète : https://fontawesome.com/icons

## Architecture Technique

```
Frontend (Links.tsx)
  ├── Liens locaux (config.ts)
  ├── Liens Homer (/api/homer-links ou /homer-proxy en dev)
  └── Liens MongoDB (/api/links)

Backend
  ├── server/homer.go    → GET /api/homer-links (proxy Homer config.yml)
  └── server/links.go    → CRUD /api/links (MongoDB)

Store
  └── internal/stores/links.go → Collection MongoDB "links"
```

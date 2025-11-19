# Tracker Web Frontend

Interface web moderne pour Tracker, construite avec React, TypeScript et Vite.

## 🚀 Fonctionnalités

### 📊 Dashboard
- Vue d'ensemble des événements du jour
- Statistiques en temps réel (succès, échecs, en cours)
- Liste des événements récents avec icônes par type
- Badges colorés par type d'événement (déploiement, opération, drift, incident)

### ⏱️ Timeline
- Visualisation chronologique des événements
- **Filtrage temporel** : 7, 15, 30 jours ou tout l'historique
- Icônes et couleurs distinctes par type d'événement
- Détails complets de chaque événement
- Liens vers PRs et tickets
- Badges de priorité et statut

### 📅 Calendrier
- Vue mensuelle des événements
- Navigation entre les mois
- Détails des événements par jour
- Icônes et couleurs par type d'événement
- Indicateurs visuels par statut

### ➕ Création d'événements
- Formulaire complet pour créer des événements
- Support de tous les types (déploiement, opération, drift, incident)
- Gestion des priorités et statuts
- Liens vers PRs et tickets

### 📦 Catalogue
- Vue tableau de tous les éléments du catalogue
- Filtrage et recherche
- Informations détaillées (type, langage, version, owner)
- Liens vers repositories et documentation

### 🔄 Drifts
- Liste des drifts de configuration détectés
- **Création de drifts** : Formulaire dédié pour enregistrer les dérives
- Statistiques (total, résolus, non résolus)
- Détails par service et environnement
- Suivi de résolution
- Gestion de l'impact et des priorités

### 🤖 RPA Usage
- Suivi des opérations RPA
- **Création d'opérations RPA** : Formulaire pour tracker les exécutions
- Statistiques d'utilisation
- Répartition par service
- Historique des opérations
- Suivi des dates de début/fin et durées

## 🛠️ Technologies

- **React 18** - Framework UI
- **TypeScript** - Typage statique
- **Vite** - Build tool rapide
- **TailwindCSS** - Styling
- **React Router** - Navigation
- **TanStack Query** - Gestion des données
- **Axios** - Client HTTP
- **date-fns** - Manipulation de dates
- **Font Awesome** - Icônes (solid + brands)
- **Lucide React** - Icônes complémentaires

## 📦 Installation

```bash
cd web
npm install
```

## 🚀 Démarrage

### Mode développement
```bash
npm run dev
```

L'application sera disponible sur http://localhost:3000

Le proxy Vite redirige automatiquement les appels `/api` vers `http://localhost:8080`

### Build production
```bash
npm run build
```

Les fichiers de production seront générés dans le dossier `dist/`

### Preview production
```bash
npm run preview
```

## 🔧 Configuration

### Proxy API
Le fichier `vite.config.ts` configure le proxy vers l'API backend :

```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
}
```

### Variables d'environnement
Créer un fichier `.env.local` pour personnaliser :

```env
# API
VITE_API_URL=http://localhost:8080

# Jira (pour les liens de tickets)
VITE_JIRA_URL=https://your-company.atlassian.net

# Slack (pour les liens de messages)
VITE_SLACK_WORKSPACE=your-workspace
```

Voir `.env.example` pour plus de détails.

## 📁 Structure du projet

```
web/
├── src/
│   ├── components/      # Composants réutilisables
│   │   └── Layout.tsx   # Layout principal avec navigation
│   ├── pages/           # Pages de l'application
│   │   ├── Dashboard.tsx
│   │   ├── EventsTimeline.tsx
│   │   ├── EventsCalendar.tsx
│   │   ├── CreateEvent.tsx
│   │   ├── CatalogTable.tsx
│   │   ├── DriftsList.tsx
│   │   └── RpaUsage.tsx
│   ├── lib/             # Utilitaires
│   │   └── api.ts       # Client API
│   ├── types/           # Types TypeScript
│   │   └── api.ts       # Types de l'API
│   ├── App.tsx          # Composant racine
│   ├── main.tsx         # Point d'entrée
│   └── index.css        # Styles globaux
├── public/              # Assets statiques
├── index.html           # Template HTML
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 🎨 Personnalisation

### Couleurs
Modifier les couleurs dans `tailwind.config.js` :

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        50: '#f0f9ff',
        500: '#0ea5e9',
        600: '#0284c7',
      },
    },
  },
}
```

### Styles
Les classes utilitaires sont définies dans `src/index.css` :
- `.btn-primary` - Bouton principal
- `.btn-secondary` - Bouton secondaire
- `.card` - Carte de contenu
- `.input` - Champ de saisie
- `.select` - Liste déroulante

## 🔌 API

L'application communique avec l'API Tracker via les endpoints REST :

- `GET /api/v1alpha1/events/list` - Liste des événements
- `GET /api/v1alpha1/events/today` - Événements du jour
- `GET /api/v1alpha1/events/search` - Recherche d'événements
- `POST /api/v1alpha1/event` - Créer un événement
- `GET /api/v1alpha1/catalogs/list` - Liste du catalogue

Voir la documentation complète de l'API : http://localhost:8080/docs

## 📝 Développement

### Ajouter une nouvelle page

1. Créer le composant dans `src/pages/`
2. Ajouter la route dans `src/App.tsx`
3. Ajouter le lien dans `src/components/Layout.tsx`

### Ajouter un nouvel endpoint API

1. Définir les types dans `src/types/api.ts`
2. Ajouter la fonction dans `src/lib/api.ts`
3. Utiliser avec `useQuery` ou `useMutation`

## 🐛 Debug

### Activer les logs React Query
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Dans App.tsx
<ReactQueryDevtools initialIsOpen={false} />
```

## 📄 License

Apache 2.0

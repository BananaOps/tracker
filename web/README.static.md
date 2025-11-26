# Mode Statique - Guide de Test Local

Ce guide explique comment tester le mode statique localement avant le déploiement sur GitHub Pages.

## 🎯 Prérequis

- Node.js 20+
- npm

## 🚀 Étapes

### 1. Générer les données de démo

```bash
# Depuis la racine du projet
sh scripts/generate-test-data.sh
```

Cela créera les fichiers dans `web/public/static-data/` :
- `events.json` (100 événements)
- `catalogs.json` (30 catalogues)
- `locks.json` (5 locks)
- `metadata.json` (métadonnées)

### 2. Installer les dépendances

```bash
cd web
npm install
```

### 3. Build en mode statique

```bash
npm run build:static
```

Cette commande :
- Utilise le fichier `.env.static` pour la configuration
- Active `VITE_STATIC_MODE=true`
- Configure `VITE_BASE_URL=/tracker`
- Génère le build dans `web/dist/`

### 4. Prévisualiser le build

```bash
npm run preview
```

Ouvrez http://localhost:4173/tracker/ dans votre navigateur.

## ✅ Vérifications

### Bandeau de démo
Vous devriez voir un bandeau jaune en haut de la page indiquant :
- "📊 Demo Mode"
- "This is a static demo with generated data"
- Date de dernière mise à jour

### Fonctionnalités en lecture seule
- ✅ Navigation entre les pages
- ✅ Affichage des événements
- ✅ Dashboard avec statistiques
- ✅ Timeline des événements
- ✅ Catalogue des services
- ✅ Vue des locks
- ❌ Création d'événements (erreur attendue)
- ❌ Modification d'événements (erreur attendue)

### Données affichées
- **Dashboard** : Statistiques basées sur les 100 événements générés
- **Events** : Liste des événements avec filtres fonctionnels
- **Catalog** : 30 services avec différents types et langages
- **Locks** : 5 locks actifs

## 🔧 Développement

### Mode développement avec données

```bash
# 1. Générer les données
sh scripts/generate-test-data.sh

# 2. Créer un fichier .env.local
echo "VITE_STATIC_MODE=true" > .env.local
echo "VITE_BASE_URL=/" >> .env.local

# 3. Lancer le serveur de dev
npm run dev
```

Ouvrez http://localhost:5173/

### Régénérer les données

Pour obtenir de nouvelles données aléatoires :

```bash
sh scripts/generate-test-data.sh
```

Puis rechargez la page dans le navigateur.

## 🐛 Dépannage

### Les données ne s'affichent pas

Vérifiez que les fichiers JSON existent :
```bash
ls -lh web/public/static-data/
```

### Erreur 404 sur les données

Vérifiez que `VITE_STATIC_MODE=true` est bien défini :
```bash
cat web/.env.static
```

### Le bandeau ne s'affiche pas

Vérifiez que le composant `StaticModeBanner` est bien importé dans `App.tsx`.

## 📝 Notes

- Les données sont générées aléatoirement à chaque exécution du script
- Le mode statique désactive toutes les opérations d'écriture
- Les filtres et la recherche fonctionnent côté client
- Les données sont chargées depuis les fichiers JSON locaux

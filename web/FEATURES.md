# Guide des fonctionnalités - Tracker Web

## 🎨 Système de couleurs par type d'événement

### Types d'événements et leurs représentations

| Type | Icône | Couleur | Badge | Utilisation |
|------|-------|---------|-------|-------------|
| **Déploiement** | 🚀 Fusée | Bleu | `bg-blue-100 text-blue-800` | Déploiements de services, releases |
| **Opération** | 🔧 Clé à molette | Violet | `bg-purple-100 text-purple-800` | Opérations manuelles, maintenance, RPA |
| **Drift** | 📉 Tendance descendante | Jaune | `bg-yellow-100 text-yellow-800` | Dérives de configuration, écarts |
| **Incident** | ⚠️ Triangle alerte | Rouge | `bg-red-100 text-red-800` | Incidents, pannes, alertes critiques |

## 📊 Dashboard

### Statistiques affichées
- **Total Events** : Nombre total d'événements du jour
- **Succès** : Événements terminés avec succès
- **Échecs** : Événements en erreur ou échec
- **En cours** : Événements actuellement en cours

### Liste des événements récents
- Affiche les 10 derniers événements
- Icône colorée selon le type
- Badges : Type, Statut, Priorité
- Nom du service

## ⏱️ Timeline

### Filtres temporels
Boutons de filtrage rapide :
- **7 jours** : Événements de la dernière semaine
- **15 jours** : Événements des 15 derniers jours
- **30 jours** : Événements du dernier mois
- **Tout** : Historique complet

### Affichage
- Ligne temporelle verticale
- Icône circulaire colorée par type
- Bordure colorée selon le type d'événement
- Badges : Type (avec icône), Priorité, Statut
- Détails complets : titre, message, service, source, owner
- Lien vers PR si disponible
- Date et heure de création

### Priorités
- **P1** : Critique (rouge)
- **P2** : Élevée (orange)
- **P3** : Moyenne (jaune)
- **P4** : Faible (bleu)
- **P5** : Très faible (bleu)

### Statuts
- **SUCCESS** : Vert
- **FAILURE / ERROR** : Rouge
- **START** : Jaune
- **Autres** : Gris

## 📅 Calendrier

### Vue mensuelle
- Grille de 7 colonnes (jours de la semaine)
- Navigation mois précédent/suivant
- Jour actuel surligné en bleu
- Jusqu'à 3 événements affichés par jour
- Indicateur "+X" si plus de 3 événements

### Événements dans le calendrier
- Icône miniature du type
- Couleur de fond selon le type
- Titre tronqué si trop long

### Panneau de détails
- Sélection d'un jour pour voir les détails
- Liste complète des événements du jour
- Icône, type, statut pour chaque événement
- Nom du service

## ➕ Création d'événement

### Champs disponibles
- **Titre** : Nom de l'événement
- **Type** : Déploiement, Opération, Drift, Incident
- **Priorité** : P1 à P5
- **Statut** : Démarré, Succès, Échec, Avertissement, Erreur
- **Environnement** : Development, Integration, UAT, Preproduction, Production
- **Service** : Nom du service concerné
- **Source** : Origine de l'événement (github_actions, gitlab_ci, manual, etc.)
- **Message** : Description détaillée
- **Pull Request** : Lien vers la PR (optionnel)
- **Ticket** : Référence du ticket (optionnel)

## 📦 Catalogue

### Vue tableau
- Colonnes : Nom, Type, Langage, Version, Owner, Description, Liens
- Icônes pour les liens externes (repository, documentation)
- Badges colorés pour type et langage
- Tri et filtrage

### Types de catalogue
- Module, Bibliothèque, Workflow, Projet, Chart, Package, Container

### Langages supportés
- Go, Java, Kotlin, Python, JavaScript, TypeScript
- Terraform, Helm, YAML, Docker
- PHP, Rust, Groovy

## 🔄 Drifts

### Statistiques
- Total des drifts détectés
- Nombre de drifts non résolus
- Nombre de drifts résolus

### Liste des drifts
- Icône de drift (tendance descendante)
- Badge de statut (Résolu / En cours)
- Détails : service, source, environnement, owner
- Référence du ticket si disponible

## 🤖 RPA Usage

### Statistiques
- Total des opérations RPA
- Opérations du mois en cours
- Nombre de services RPA actifs

### Visualisations
- Graphique de répartition par service
- Barre de progression pour chaque service
- Liste des opérations récentes

## 🎯 Bonnes pratiques

### Utilisation des types
- **Déploiement** : Pour tous les déploiements automatisés ou manuels
- **Opération** : Pour les opérations de maintenance, scripts, RPA
- **Drift** : Pour les détections de dérive de configuration
- **Incident** : Pour les incidents, pannes, alertes critiques

### Utilisation des priorités
- **P1** : Incidents critiques, production down
- **P2** : Problèmes majeurs, impact utilisateur
- **P3** : Problèmes modérés, à traiter rapidement
- **P4** : Problèmes mineurs, backlog
- **P5** : Améliorations, nice-to-have

### Utilisation des statuts
- **START** : Événement en cours
- **SUCCESS** : Terminé avec succès
- **FAILURE** : Échec complet
- **ERROR** : Erreur technique
- **WARNING** : Avertissement, attention requise

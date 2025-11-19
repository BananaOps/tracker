# Changelog - Tracker Web Frontend

## [1.2.0] - 2024-11-19

### ✨ Nouvelles fonctionnalités

#### Pages de création dédiées
- **Créer un Drift** : Formulaire spécialisé pour enregistrer les dérives de configuration
  - Champs adaptés : service, environnement, source de détection
  - Gestion de l'impact sur le service
  - Statuts spécifiques (Ouvert, En cours, Résolu, Fermé)
  - Aide contextuelle sur les drifts
  
- **Créer une opération RPA** : Formulaire pour tracker les automatisations
  - Champs RPA : robot/service, plateforme, dates début/fin
  - Gestion des parties prenantes
  - Lien vers logs/dashboard
  - Aide contextuelle sur le RPA

#### Améliorations des listes
- **DriftsList** : Bouton "Créer un drift" ajouté
- **RpaUsage** : Bouton "Créer une opération RPA" ajouté
- Navigation fluide entre liste et création

## [1.1.0] - 2024-11-19

### ✨ Nouvelles fonctionnalités

#### Timeline
- **Filtres temporels** : Ajout de filtres pour afficher les événements des 7, 15, 30 derniers jours ou tout l'historique
- **Compteur d'événements** : Affichage du nombre d'événements filtrés dans le sous-titre

#### Icônes par type d'événement
- 🚀 **Déploiement** : Icône fusée (bleu)
- 🔧 **Opération** : Icône clé à molette (violet)
- 📉 **Drift** : Icône tendance descendante (jaune)
- ⚠️ **Incident** : Icône triangle d'alerte (rouge)

#### Couleurs par type d'événement
- **Déploiement** : Bleu (`bg-blue-100`, `text-blue-800`)
- **Opération** : Violet (`bg-purple-100`, `text-purple-800`)
- **Drift** : Jaune (`bg-yellow-100`, `text-yellow-800`)
- **Incident** : Rouge (`bg-red-100`, `text-red-800`)

### 🐛 Corrections de bugs
- **Timeline** : Correction du bug d'affichage des priorités (affichait "PP1" au lieu de "P1")
- **Timeline** : Amélioration de l'affichage des badges de priorité avec plus de nuances (P1 à P5)

### 🎨 Améliorations UI/UX

#### Dashboard
- Ajout d'icônes colorées pour chaque type d'événement dans la liste
- Meilleure organisation visuelle avec icônes à gauche
- Badges de type d'événement avec couleurs distinctes

#### Timeline
- Bordures colorées autour des icônes selon le type d'événement
- Icônes dans les badges de type pour une meilleure identification
- Interface de filtrage intuitive avec boutons actifs/inactifs
- Amélioration de la hiérarchie visuelle

#### Calendrier
- Icônes miniatures dans les événements du calendrier
- Couleurs distinctes par type dans la vue mensuelle
- Détails enrichis dans le panneau latéral avec icônes et badges

### 🔧 Technique
- Création du module `lib/eventUtils.tsx` pour centraliser la logique des icônes et couleurs
- Fonctions utilitaires :
  - `getEventTypeIcon()` : Retourne l'icône React appropriée
  - `getEventTypeColor()` : Retourne les classes Tailwind de couleur
  - `getEventTypeLabel()` : Retourne le label traduit
- Utilisation de `date-fns` pour le filtrage temporel
- Amélioration de la performance avec filtrage côté client

## [1.0.0] - 2024-11-19

### 🎉 Version initiale
- Dashboard avec statistiques
- Timeline chronologique
- Vue calendrier mensuelle
- Formulaire de création d'événements
- Tableau du catalogue
- Liste des drifts
- Suivi RPA

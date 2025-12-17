# 🚀 Tracker - Guide des Fonctionnalités

## 📊 Vue d'ensemble

Tracker est une plateforme de gestion et visualisation d'événements pour suivre les déploiements, opérations, drifts et activités RPA.

---

## 🎯 Pages Principales

### 1. 📈 **Dashboard**
Vue d'ensemble de l'activité du jour

**Statistiques en temps réel :**
- Total des événements
- Succès / Échecs / En cours
- **Détection de chevauchements** avec alerte gyrophare 🚨
- Répartition par type, statut, priorité et environnement

**Alertes de chevauchements :**
- Bannière orange si des événements se chevauchent
- Liste détaillée des conflits temporels
- Permet d'identifier rapidement les problèmes de coordination

**Liste des événements récents :**
- 10 derniers événements avec badges colorés
- Clic pour voir les détails complets

---

### 2. ⏱️ **Events - Timeline**
Vue chronologique de tous les événements

**Navigation temporelle :**
- Sélecteur de période : 1, 3, 7, 14, 30, 60, 90 jours
- Boutons Précédent / Suivant / Aujourd'hui
- Affichage de la période active

**Tri et filtrage :**
- Tri croissant/décroissant par date
- Filtres avancés : Type, Environnement, Priorité, Status, Service
- Compteur de filtres actifs
- Recherche dans tous les champs

**Affichage :**
- Cartes détaillées avec badges colorés
- Liens vers sources (Slack, GitHub, etc.)
- Clic pour modal de détails complets

---

### 3. 📦 **Events - Streamline**
Vue Gantt des événements avec détection de chevauchements

**Deux modes de visualisation :**
- **By Service** : Groupement par projet/service
- **By Environment** : Groupement par environnement

**Deux vues temporelles :**
- **Vue Semaine** : 7 jours avec colonnes par jour
- **Vue Jour** : 24 heures avec colonnes par heure

**Indicateurs de chevauchements :**
- 🚨 **Gyrophare animé** sur les groupes avec conflits
- Affichage du nombre d'événements concurrents
- Placement automatique sur plusieurs pistes pour éviter la superposition

**Navigation :**
- Boutons Précédent / Suivant / Aujourd'hui
- Sélecteur de période : 1, 3, 7, 14, 30 jours
- Filtres avancés multiples

**Fonctionnalités :**
- Barres d'événements colorées par type
- Durée et horaires visibles
- Clic pour détails complets

---

### 4. 📅 **Events - Calendar**
Vue calendrier mensuel

**Calendrier interactif :**
- Vue mensuelle avec navigation mois par mois
- Indicateur du jour actuel
- **Icône d'alerte** 🚨 sur les jours avec chevauchements

**Sélection de jour :**
- Clic sur un jour pour voir ses événements
- Liste détaillée dans le panneau latéral

**Alertes de chevauchements :**
- Bannière orange avec détails des conflits
- Liste des paires d'événements qui se chevauchent
- Horaires précis de chaque événement

**Événements marqués :**
- Fond orange pour les événements en conflit
- Icône d'alerte sur chaque événement concerné
- Affichage des plages horaires

**Filtres :**
- Type, Environnement, Priorité, Status, Service
- Badges qui s'adaptent automatiquement (wrap)

---

### 5. ⚠️ **Events - Overlaps**
Page dédiée à la gestion des chevauchements

**Statistiques :**
- Nombre total de chevauchements
- Jours concernés
- Services impliqués

**Vue détaillée par jour :**
- Groupement des conflits par date
- Période exacte du chevauchement
- Durée en minutes

**Informations de contact :**
- Owner de chaque service
- Email cliquable (mailto:)
- Canal Slack avec lien direct
- Données issues du Catalogue

**Comparaison côte à côte :**
- Deux cartes pour comparer les événements
- Type, environnement, horaires
- Clic pour détails complets

**Navigation :**
- Sélecteur de période : 1, 3, 7, 14, 30 jours
- Boutons de navigation temporelle

---

### 6. 📚 **Catalog**
Inventaire des modules, bibliothèques et projets

**Filtres rapides :**
- 🔍 **Barre de recherche** : Nom, description, owner
- **Filtres par Type** : Module, Library, Workflow, Project, Chart, Package, Container
- **Filtres par Langage** : Go, Java, Python, PHP, JavaScript, TypeScript, Rust, etc.
- Multi-sélection avec badges cliquables
- Bouton "Clear All" pour réinitialiser

**Tableau détaillé :**
- Nom avec icône
- Type et langage avec badges colorés
- Version, Owner, Description
- Liens vers repository (GitHub) et documentation

**Compteur de résultats :**
- Affiche "X of Y items" selon les filtres

---

### 7. 🔀 **Drifts**
Détection et gestion des dérives de configuration

**Statistiques :**
- Total des drifts
- Non résolus / Résolus

**Gestion des tickets Jira :**
- 🎫 **Bouton "Add Ticket"** sur chaque drift
- Modal de création/mise à jour de ticket
- Lien "Open Jira" pré-rempli avec titre et description
- Sauvegarde du lien dans l'événement
- Affichage du ticket lié avec icône externe

**Filtres avancés :**
- Environnement, Priorité, Status, Service
- Compteur de filtres actifs

**Affichage :**
- Cartes avec statut (Resolved / In Progress)
- Message de drift dans un bloc scrollable
- Informations : Service, Source, Environment, Owner
- Lien vers ticket Jira si existant

---

### 8. 🤖 **RPA Usage**
Suivi des opérations RPA (Robotic Process Automation)

**Statistiques :**
- Total des opérations
- Succès / Échecs / En cours

**Liste des opérations :**
- Cartes détaillées avec badges
- Service, Source, Environment
- Clic pour détails complets

**Filtres :**
- Environnement, Priorité, Status, Service

---

## 🎨 Fonctionnalités Transversales

### 🌓 **Dark Mode**
- Toggle dans la barre de navigation
- Persistance de la préférence
- Couleurs optimisées pour chaque mode

### 🔍 **Filtres Avancés**
Disponibles sur toutes les pages d'événements :
- Checkboxes pour multi-sélection
- Compteur de filtres actifs
- Bouton "Clear All Filters"
- Filtrage instantané

### 📱 **Responsive Design**
- Adaptation automatique mobile/tablette/desktop
- Navigation optimisée pour petits écrans
- Badges qui s'adaptent (flex-wrap)

### 🔗 **Liens Intelligents**
- Détection automatique des sources (Slack, GitHub, etc.)
- Icônes appropriées pour chaque type
- Ouverture dans nouvel onglet

### 📊 **Modal de Détails**
Clic sur n'importe quel événement pour voir :
- Toutes les informations complètes
- Badges colorés (Type, Env, Priorité, Status)
- Message complet
- Tous les liens associés
- Métadonnées (ID, dates)

### 🎯 **Navigation Moderne**
- Barre horizontale style Datadog/Grafana
- Menu déroulant "Events" avec 4 sous-pages
- Sticky header (reste visible au scroll)
- Highlight de la page active

---

## 🚨 Détection de Chevauchements

**Où la trouver :**
- Dashboard : Alerte en haut + compteur
- Calendar : Icône sur les jours concernés + bannière détaillée
- Streamline : Gyrophare sur les groupes + placement multi-pistes
- Overlaps : Page dédiée avec tous les détails

**Informations fournies :**
- Quels événements se chevauchent
- Période exacte du conflit
- Durée du chevauchement
- Contacts des équipes responsables

---

## 🎫 Intégration Jira

**Configuration :**
- Domaine Jira configurable via Helm
- Pas de rebuild nécessaire
- Fonctionne en dev et prod

**Fonctionnalités :**
- Création de ticket pré-rempli
- Lien direct vers Jira
- Sauvegarde du lien dans Tracker
- Affichage et accès rapide au ticket

---

## 🎨 Design System

**Couleurs par Type :**
- 🔵 Deployment : Bleu
- 🟣 Operation : Violet
- 🟡 Drift : Jaune
- 🔴 Incident : Rouge

**Couleurs par Environnement :**
- 🟢 Development : Vert
- 🔵 Integration/UAT : Bleu
- 🟠 Preproduction : Orange
- 🔴 Production : Rouge

**Couleurs par Priorité :**
- 🔴 P1 : Rouge (Critique)
- 🟠 P2 : Orange (Haute)
- 🟡 P3 : Jaune (Moyenne)
- 🔵 P4/P5 : Bleu (Basse)

**Couleurs par Status :**
- 🟢 Success/Done : Vert
- 🔴 Failure/Error : Rouge
- 🟡 Start/In Progress : Jaune
- 🔵 Open : Bleu

---

## 💡 Conseils d'Utilisation

1. **Commencez par le Dashboard** pour avoir une vue d'ensemble
2. **Utilisez Streamline** pour visualiser les plannings et détecter les conflits
3. **Consultez Overlaps** pour coordonner avec les autres équipes
4. **Utilisez les filtres** pour vous concentrer sur vos services
5. **Liez les tickets Jira** aux drifts pour le suivi
6. **Activez le Dark Mode** pour le confort visuel 😎

---

## 🤖 Serveur MCP (Model Context Protocol)

### 📖 Vue d'ensemble

Le serveur MCP permet d'interroger Tracker depuis des agents IA comme Kiro. Il expose les APIs de Tracker en lecture seule via le protocole MCP.

### 🎯 Fonctionnalités

**8 outils disponibles :**

#### Events
- **`list_events`** : Liste les événements avec filtres basiques (type, service, status)
- **`today_events`** : Récupère tous les événements créés aujourd'hui
- **`search_events`** : Recherche avancée avec filtres multiples
- **`get_event`** : Récupère un événement spécifique par ID

#### Catalog
- **`list_catalog`** : Liste les services du catalogue
- **`get_catalog_service`** : Récupère un service spécifique par nom

#### Locks
- **`list_locks`** : Liste les locks actifs
- **`get_lock`** : Récupère un lock spécifique par ID

### 🚀 Installation

> 📖 **Guide complet** : Voir [mcp-server/QUICK_START.md](./mcp-server/QUICK_START.md)

```bash
# 1. Installer uv si nécessaire
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc

# 2. Installer les dépendances
cd mcp-server
uv sync

# 3. Configurer dans Kiro (~/.kiro/settings/mcp.json)
{
  "mcpServers": {
    "tracker": {
      "command": "uvx",
      "args": ["--from", "/chemin/vers/tracker/mcp-server", "tracker-mcp-server"],
      "env": {
        "TRACKER_URL": "http://localhost:8080"
      },
      "disabled": false,
      "autoApprove": ["list_events", "today_events", "search_events", "list_catalog", "list_locks"]
    }
  }
}
```

### ⚙️ Configuration

**Variable d'environnement :**
- `TRACKER_URL` : URL du serveur Tracker (défaut: `http://localhost:8080`)

**Exemples d'URL :**
```bash
# Local
TRACKER_URL=http://localhost:8080

# Production
TRACKER_URL=https://tracker.example.com

# Réseau interne
TRACKER_URL=http://10.0.0.5:9090
```

### 📖 Exemples d'Utilisation dans Kiro

```
# Événements d'aujourd'hui
"Quels sont les événements d'aujourd'hui ?"
"Montre-moi les déploiements d'aujourd'hui"

# Recherche avancée
"Recherche les événements de type deployment en production avec un impact"
"Trouve les incidents P1 du service auth-service entre le 2024-01-01 et 2024-01-15"
"Montre les événements en échec de la semaine dernière"

# Filtres par service
"Trouve les événements du service afrr"
"Montre-moi tous les événements du service user-api"

# Catalogue
"Liste tous les services du catalogue"
"Donne-moi les détails du service auth-service"

# Locks
"Quels sont les locks actifs ?"
"Y a-t-il un lock sur le service payment-api ?"
```

### 🔧 Paramètres de Recherche Avancée

L'outil `search_events` supporte de nombreux filtres :

- **`source`** : Source (github-actions, jenkins, manual, etc.)
- **`type`** : Type (deployment, operation, drift, incident, rpa_usage)
- **`priority`** : Priorité (P1, P2, P3, P4, P5)
- **`status`** : Statut (start, failure, success, warning, error, etc.)
- **`service`** : Nom du service
- **`start_date`** : Date de début (ISO 8601: YYYY-MM-DD ou YYYY-MM-DDTHH:MM:SSZ)
- **`end_date`** : Date de fin (ISO 8601)
- **`environment`** : Environnement (development, production, etc.)
- **`impact`** : Booléen pour filtrer par impact
- **`slack_id`** : ID du message Slack

### 🔒 Sécurité

- **Lecture seule** : Aucune opération de modification possible
- **Pas d'authentification** : À utiliser sur des réseaux de confiance
- **Timeout** : Requêtes HTTP avec timeout de 30 secondes

### 🐛 Debugging

**Vérifier la connexion :**
```bash
# Test direct de l'API
curl http://localhost:8080/api/v1alpha1/events/list?perPage=1

# Vérifier les logs dans Kiro
# Ouvrir la vue "MCP Servers" dans Kiro
```

**Erreurs courantes :**
- **"Connection refused"** : Vérifier que Tracker est démarré et l'URL
- **"Module not found"** : Réinstaller avec `uv pip install -e .`
- **"Tool not found"** : Redémarrer le serveur MCP depuis Kiro

### 📚 Documentation Complète

Voir le fichier `mcp-server/README.md` pour :
- Guide d'installation détaillé
- Exemples de configuration
- Troubleshooting complet
- Guide de développement

---

## 🐛 Besoin d'Aide ?

- Consultez la documentation dans `/docs`
- Voir `mcp-server/README.md` pour le serveur MCP
- Ouvrez une issue sur GitHub
- Contactez l'équipe DevOps

---

**Version :** 1.0  
**Dernière mise à jour :** Décembre 2024

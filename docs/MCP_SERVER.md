# 🤖 Serveur MCP Tracker

## 📖 Introduction

Le serveur MCP (Model Context Protocol) permet aux agents IA comme Kiro d'interroger les APIs de Tracker de manière native. Il expose toutes les fonctionnalités lecture de Tracker via 8 outils MCP.

## 🎯 Cas d'Usage

### Pour les Développeurs
- "Quels sont les déploiements d'aujourd'hui ?"
- "Y a-t-il des incidents sur mon service ?"
- "Montre-moi les événements en échec cette semaine"

### Pour les DevOps
- "Quels services ont des locks actifs ?"
- "Recherche les drifts en production"
- "Liste les opérations RPA du mois"

### Pour les Managers
- "Résumé des événements critiques P1"
- "Quels sont les services les plus impactés ?"
- "Analyse des tendances de déploiement"

## 🛠️ Architecture

```
┌─────────────────┐    MCP Protocol    ┌─────────────────┐    HTTP/REST    ┌─────────────────┐
│                 │ ◄─────────────────► │                 │ ◄──────────────► │                 │
│   Kiro / Agent  │                    │   MCP Server    │                 │   Tracker API   │
│                 │                    │   (Python)     │                 │   (Go/gRPC)     │
└─────────────────┘                    └─────────────────┘                 └─────────────────┘
```

### Composants

1. **Agent IA (Kiro)** : Interface utilisateur, traitement du langage naturel
2. **Serveur MCP** : Traduction entre MCP et APIs REST de Tracker
3. **Tracker API** : Backend Go avec gRPC + grpc-gateway

## 📦 Installation

### Prérequis

- Python 3.10+
- `uv` (gestionnaire de paquets Python moderne)
- Tracker en cours d'exécution

### Installation de uv

```bash
# Installation via curl (recommandé)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Ou via pip si vous l'avez déjà
pip install uv

# Ou via Homebrew (macOS)
brew install uv

# Redémarrer le terminal pour activer uv
source ~/.bashrc  # ou ~/.zshrc
```

### Installation Rapide

```bash
# 1. Cloner le projet Tracker
git clone <tracker-repo>
cd tracker

# 2. Installer le serveur MCP avec uv
cd mcp-server
uv sync

# 3. Tester l'installation
uv run python tracker_mcp_server.py --help
```

### Configuration dans Kiro

Éditer `~/.kiro/settings/mcp.json` :

```json
{
  "mcpServers": {
    "tracker": {
      "command": "uvx",
      "args": ["--from", "/chemin/absolu/vers/tracker/mcp-server", "tracker-mcp-server"],
      "env": {
        "TRACKER_URL": "http://localhost:8080"
      },
      "disabled": false,
      "autoApprove": [
        "list_events",
        "today_events", 
        "search_events",
        "list_catalog",
        "list_locks"
      ]
    }
  }
}
```

### Configuration Alternative (Python Direct)

```json
{
  "mcpServers": {
    "tracker": {
      "command": "python",
      "args": ["/chemin/absolu/vers/tracker/mcp-server/tracker_mcp_server.py"],
      "env": {
        "TRACKER_URL": "http://localhost:8080"
      },
      "disabled": false,
      "autoApprove": ["search_events", "today_events"]
    }
  }
}
```

## 🔧 Configuration

### Variables d'Environnement

| Variable | Description | Défaut | Exemples |
|----------|-------------|---------|----------|
| `TRACKER_URL` | URL du serveur Tracker | `http://localhost:8080` | `https://tracker.prod.com` |

### Environnements Multiples

```bash
# Développement
TRACKER_URL=http://localhost:8080

# Staging
TRACKER_URL=https://tracker-staging.example.com

# Production
TRACKER_URL=https://tracker.example.com

# Réseau interne
TRACKER_URL=http://tracker.internal:9090
```

## 🎯 Outils Disponibles

### 📅 Events

#### `list_events`
Liste les événements avec filtres basiques.

**Paramètres :**
- `per_page` (number) : Événements par page (défaut: 10, max: 100)
- `page` (number) : Numéro de page (défaut: 1)
- `type` (string) : Type d'événement (deployment, operation, drift, incident, rpa_usage)
- `service` (string) : Nom du service
- `status` (string) : Statut (start, failure, success, warning, error, etc.)

**Exemple :**
```
"Liste les 20 derniers déploiements"
"Montre-moi les événements du service auth-api"
```

#### `today_events`
Récupère les événements créés aujourd'hui.

**Paramètres :**
- `per_page` (number) : Événements par page (défaut: 10)
- `page` (number) : Numéro de page (défaut: 1)

**Exemple :**
```
"Quels sont les événements d'aujourd'hui ?"
"Montre-moi tous les événements du jour"
```

#### `search_events`
Recherche avancée avec filtres multiples.

**Paramètres :**
- `source` (string) : Source (github-actions, jenkins, manual)
- `type` (string) : Type d'événement
- `priority` (string) : Priorité (P1, P2, P3, P4, P5)
- `status` (string) : Statut
- `service` (string) : Nom du service
- `start_date` (string) : Date de début (ISO 8601)
- `end_date` (string) : Date de fin (ISO 8601)
- `environment` (string) : Environnement (development, production, etc.)
- `impact` (boolean) : Filtrer par impact
- `slack_id` (string) : ID du message Slack

**Exemples :**
```
"Recherche les déploiements en production avec un impact entre le 2024-01-01 et aujourd'hui"
"Trouve les incidents P1 du service payment-api"
"Montre les événements en échec de la semaine dernière"
```

#### `get_event`
Récupère un événement spécifique par ID.

**Paramètres :**
- `event_id` (string, requis) : ID de l'événement

**Exemple :**
```
"Donne-moi les détails de l'événement 507f1f77bcf86cd799439011"
```

### 📚 Catalog

#### `list_catalog`
Liste les services du catalogue.

**Paramètres :**
- `per_page` (number) : Services par page (défaut: 10)
- `page` (number) : Numéro de page (défaut: 1)

**Exemple :**
```
"Liste tous les services du catalogue"
"Montre-moi les 50 premiers services"
```

#### `get_catalog_service`
Récupère un service spécifique par nom.

**Paramètres :**
- `service_name` (string, requis) : Nom du service

**Exemple :**
```
"Donne-moi les détails du service auth-api"
"Informations sur le service payment-gateway"
```

### 🔒 Locks

#### `list_locks`
Liste les locks actifs.

**Paramètres :**
- `per_page` (number) : Locks par page (défaut: 10)
- `page` (number) : Numéro de page (défaut: 1)

**Exemple :**
```
"Quels sont les locks actifs ?"
"Y a-t-il des services verrouillés ?"
```

#### `get_lock`
Récupère un lock spécifique par ID.

**Paramètres :**
- `lock_id` (string, requis) : ID du lock

**Exemple :**
```
"Détails du lock 507f1f77bcf86cd799439011"
```

## 💡 Exemples d'Usage Avancés

### Analyse de Tendances

```
"Analyse les déploiements des 30 derniers jours par environnement"
"Quels sont les services avec le plus d'incidents P1 ce mois ?"
"Tendance des échecs de déploiement par semaine"
```

### Monitoring Opérationnel

```
"Y a-t-il des événements critiques en cours ?"
"Quels services ont des drifts non résolus ?"
"Liste des opérations RPA en échec aujourd'hui"
```

### Coordination d'Équipes

```
"Quels sont les locks actifs qui pourraient bloquer mon déploiement ?"
"Y a-t-il des événements sur les services de l'équipe Platform ?"
"Qui est le owner du service user-management ?"
```

### Reporting

```
"Résumé des événements de production cette semaine"
"Statistiques de succès des déploiements par service"
"Liste des incidents résolus ce mois"
```

## 🔍 Formats de Dates

Le serveur MCP accepte plusieurs formats de dates pour `start_date` et `end_date` :

```bash
# Date simple
"2024-01-15"

# Date avec heure
"2024-01-15T10:30:00Z"

# Date avec timezone
"2024-01-15T10:30:00+01:00"

# Dates relatives (dans les requêtes en langage naturel)
"hier", "la semaine dernière", "ce mois", "les 7 derniers jours"
```

## 🐛 Troubleshooting

### Problèmes de Connexion

**Erreur : "Connection refused"**
```bash
# Vérifier que Tracker est démarré
curl http://localhost:8080/health

# Vérifier l'URL configurée
echo $TRACKER_URL

# Tester l'API directement
curl http://localhost:8080/api/v1alpha1/events/list?perPage=1
```

**Erreur : "Timeout"**
```bash
# Vérifier la latence réseau
ping tracker.example.com

# Augmenter le timeout (dans le code Python)
# self.client = httpx.AsyncClient(timeout=60.0)
```

### Problèmes d'Installation

**Erreur : "Module not found"**
```bash
# Réinstaller les dépendances avec uv
cd mcp-server
uv sync

# Vérifier l'installation
uv run python -c "import mcp; print('MCP OK')"
uv run python -c "import httpx; print('HTTPX OK')"
```

**Erreur : "Command not found: uvx"**
```bash
# Installer uv (inclut uvx automatiquement)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Redémarrer le terminal
source ~/.bashrc  # ou ~/.zshrc

# Vérifier l'installation
uv --version
uvx --version
```

### Problèmes MCP dans Kiro

**Le serveur n'apparaît pas**
1. Vérifier la syntaxe JSON dans `mcp.json`
2. Redémarrer Kiro
3. Ouvrir la vue "MCP Servers" pour voir les erreurs

**Les outils ne sont pas disponibles**
1. Vérifier que le serveur est "Connected" dans la vue MCP
2. Redémarrer le serveur MCP depuis l'interface
3. Vérifier les logs d'erreur

**Erreurs d'exécution**
1. Vérifier que `TRACKER_URL` est correcte
2. Tester l'API Tracker directement
3. Vérifier les permissions réseau

### Debug Mode

Pour activer le mode debug :

```bash
# Lancer le serveur avec logs détaillés
uv run python tracker_mcp_server.py 2>&1 | tee mcp-debug.log

# Ou modifier le code pour plus de logs
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 🔒 Sécurité

### Considérations

- **Lecture seule** : Le serveur n'expose que des opérations GET
- **Pas d'authentification** : À utiliser sur des réseaux de confiance
- **Données sensibles** : Éviter de logger les réponses complètes
- **Rate limiting** : Respecter les limites de l'API Tracker

### Bonnes Pratiques

```json
{
  "mcpServers": {
    "tracker": {
      "env": {
        "TRACKER_URL": "http://localhost:8080"
      },
      "autoApprove": [
        "list_events",
        "today_events"
      ]
    }
  }
}
```

- Utiliser `autoApprove` uniquement pour les outils sûrs
- Configurer `TRACKER_URL` via variables d'environnement
- Ne pas exposer le serveur MCP sur internet

## 🚀 Développement

### Structure du Code

```
mcp-server/
├── tracker_mcp_server.py    # Serveur principal
├── pyproject.toml           # Configuration Python
├── README.md                # Documentation
├── .gitignore              # Fichiers à ignorer
└── example-mcp-config.json # Exemple de config
```

### Ajouter un Nouvel Outil

1. **Ajouter la méthode dans `TrackerMCPServer`** :
```python
async def my_new_tool(self, param1: str) -> dict[str, Any]:
    """Description de l'outil"""
    response = await self.client.get(f"{self.api_base}/my-endpoint")
    response.raise_for_status()
    return response.json()
```

2. **Déclarer l'outil dans `list_tools()`** :
```python
Tool(
    name="my_new_tool",
    description="Description de ce que fait l'outil",
    inputSchema={
        "type": "object",
        "properties": {
            "param1": {
                "type": "string",
                "description": "Description du paramètre"
            }
        },
        "required": ["param1"]
    }
)
```

3. **Gérer l'appel dans `call_tool()`** :
```python
elif name == "my_new_tool":
    result = await tracker.my_new_tool(arguments["param1"])
```

### Tests

```bash
# Test unitaire d'un outil avec uv
uv run python -c "
import asyncio
from tracker_mcp_server import TrackerMCPServer

async def test():
    tracker = TrackerMCPServer('http://localhost:8080')
    result = await tracker.list_events(per_page=1)
    print(result)
    await tracker.close()

asyncio.run(test())
"
```

## 📚 Ressources

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Tracker API Documentation](../docs/api-specification.md)
- [Kiro MCP Guide](https://docs.kiro.ai/mcp)
- [Python httpx Documentation](https://www.python-httpx.org/)

## 🤝 Contribution

Pour contribuer au serveur MCP :

1. Fork le projet
2. Créer une branche feature
3. Ajouter des tests
4. Mettre à jour la documentation
5. Créer une Pull Request

## 📝 Changelog

### v0.1.0 (Décembre 2024)
- ✅ Implémentation initiale
- ✅ 8 outils MCP (events, catalog, locks)
- ✅ Support de tous les filtres de recherche
- ✅ Configuration via variables d'environnement
- ✅ Documentation complète

---

**Maintenu par :** Équipe DevOps  
**License :** Même que le projet Tracker principal

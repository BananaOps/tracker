# Tracker MCP Server

> ⚠️ **Déprécié** : Tracker sert désormais le MCP directement sur `/mcp`, avec l'authentification et le scope des équipes, sans rien à installer. Voir [docs/MCP_SERVER.md](../docs/MCP_SERVER.md). Ce serveur Python sera supprimé dans une prochaine version.

Serveur MCP (Model Context Protocol) pour interroger les APIs de Tracker en lecture seule.

## 🎯 Fonctionnalités

Le serveur expose 8 outils MCP pour interagir avec Tracker :

### Events
- **`list_events`** : Liste les événements avec filtres optionnels (type, service, status)
- **`today_events`** : Récupère les événements créés aujourd'hui
- **`search_events`** : Recherche avancée avec filtres multiples (date range, environment, priority, impact, etc.)
- **`get_event`** : Récupère un événement spécifique par ID

### Catalog
- **`list_catalog`** : Liste les services du catalogue
- **`get_catalog_service`** : Récupère un service spécifique par nom

### Locks
- **`list_locks`** : Liste les locks actifs
- **`get_lock`** : Récupère un lock spécifique par ID

## 📦 Installation

> 🚀 **Démarrage rapide** : Voir [QUICK_START.md](./QUICK_START.md) pour une installation en 2 minutes

### Prérequis

- Python 3.10+
- `uv` (gestionnaire de paquets Python moderne)

### Installation de uv

```bash
# Installation via curl (recommandé)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Ou via Homebrew (macOS)
brew install uv

# Redémarrer le terminal
source ~/.bashrc  # ou ~/.zshrc
```

### Installation du serveur MCP

```bash
cd mcp-server
uv sync
```

## 🚀 Utilisation

### Configuration dans Kiro

Ajouter dans votre fichier `~/.kiro/settings/mcp.json` :

```json
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

**Ou avec Python directement** :

```json
{
  "mcpServers": {
    "tracker": {
      "command": "python",
      "args": ["/chemin/vers/tracker/mcp-server/tracker_mcp_server.py"],
      "env": {
        "TRACKER_URL": "http://localhost:8080"
      },
      "disabled": false,
      "autoApprove": ["list_events", "today_events", "search_events", "list_catalog", "list_locks"]
    }
  }
}
```

### Variables d'Environnement

- **`TRACKER_URL`** : URL du serveur Tracker (défaut : `http://localhost:8080`)

### Exemples d'URL

```bash
# Local
TRACKER_URL=http://localhost:8080

# Production
TRACKER_URL=https://tracker.example.com

# Avec port personnalisé
TRACKER_URL=http://tracker.internal:9090
```

## 🔧 Développement

### Structure

```
mcp-server/
├── tracker_mcp_server.py  # Serveur MCP principal
├── pyproject.toml          # Configuration Python
└── README.md               # Documentation
```

### Test Local

```bash
# Définir l'URL de Tracker
export TRACKER_URL=http://localhost:8080

# Lancer le serveur avec uv
uv run python tracker_mcp_server.py
```

Le serveur communique via stdio (stdin/stdout) selon le protocole MCP.

## 📖 Exemples d'Utilisation dans Kiro

Une fois configuré, vous pouvez utiliser les outils dans Kiro :

```
# Événements d'aujourd'hui
"Quels sont les événements d'aujourd'hui ?"
"Montre-moi les déploiements d'aujourd'hui"

# Recherche avancée
"Recherche les événements de type deployment en production avec un impact"
"Trouve les incidents P1 du service auth-service entre le 2024-01-01 et 2024-01-15"
"Montre les événements en échec de la semaine dernière"

# Lister les derniers événements
"Liste les 5 derniers événements de type deployment"

# Filtrer par service
"Montre-moi les événements du service auth-service"

# Récupérer un événement spécifique
"Donne-moi les détails de l'événement 507f1f77bcf86cd799439011"

# Consulter le catalogue
"Liste tous les services du catalogue"

# Vérifier les locks
"Quels sont les locks actifs ?"
```

## 🔒 Sécurité

- **Lecture seule** : Le serveur n'expose que des opérations de lecture (GET)
- **Pas d'authentification** : À utiliser uniquement sur des réseaux de confiance
- **Timeout** : Requêtes HTTP avec timeout de 30 secondes

## 🐛 Debugging

### Vérifier la connexion

```bash
# Test avec curl
curl http://localhost:8080/api/v1alpha1/events/list?perPage=1

# Vérifier les logs Kiro
# Ouvrir la vue "MCP Servers" dans Kiro
```

### Erreurs Courantes

**"Connection refused"**
- Vérifier que Tracker est démarré
- Vérifier l'URL dans `TRACKER_URL`

**"Module not found"**
- Réinstaller les dépendances : `uv sync`

**"Tool not found"**
- Redémarrer le serveur MCP depuis la vue Kiro
- Vérifier la configuration dans `mcp.json`

## 📚 Ressources

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Tracker Documentation](../docs/)
- [Kiro MCP Guide](https://docs.kiro.ai/mcp)

## 🤝 Contribution

Pour ajouter de nouveaux outils :

1. Ajouter la méthode dans `TrackerMCPServer`
2. Déclarer l'outil dans `list_tools()`
3. Gérer l'appel dans `call_tool()`
4. Mettre à jour cette documentation

## 📝 License

Même license que le projet Tracker principal.

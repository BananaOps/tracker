# 🚀 Guide de Démarrage Rapide - Serveur MCP Tracker

## Installation Ultra-Rapide avec uvx

### 1. Installer uv (si pas déjà fait)

```bash
# Installation via curl (recommandé)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Redémarrer le terminal
source ~/.bashrc  # ou ~/.zshrc

# Vérifier l'installation
uv --version
uvx --version
```

### 2. Configuration dans Kiro

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

### 3. Démarrer Tracker

```bash
# Avec Docker Compose (recommandé)
docker-compose up -d

# Ou manuellement
go run main.go serv
```

### 4. Tester dans Kiro

```
"Quels sont les événements d'aujourd'hui ?"
"Trouve les événements du service auth-api"
"Liste les services du catalogue"
```

## Configuration Avancée

### Environnements Multiples

```json
{
  "mcpServers": {
    "tracker-dev": {
      "command": "uvx",
      "args": ["--from", "/chemin/vers/tracker/mcp-server", "tracker-mcp-server"],
      "env": {
        "TRACKER_URL": "http://localhost:8080"
      },
      "disabled": false
    },
    "tracker-prod": {
      "command": "uvx", 
      "args": ["--from", "/chemin/vers/tracker/mcp-server", "tracker-mcp-server"],
      "env": {
        "TRACKER_URL": "https://tracker.example.com"
      },
      "disabled": false
    }
  }
}
```

### Auto-Approbation Sélective

```json
{
  "autoApprove": [
    "list_events",      // ✅ Sûr - lecture simple
    "today_events",     // ✅ Sûr - événements du jour
    "search_events",    // ⚠️  Attention - recherche avancée
    "get_event",        // ✅ Sûr - un événement spécifique
    "list_catalog",     // ✅ Sûr - catalogue
    "get_catalog_service", // ✅ Sûr - un service
    "list_locks",       // ✅ Sûr - locks actifs
    "get_lock"          // ✅ Sûr - un lock spécifique
  ]
}
```

## Dépannage Rapide

### Erreur "uvx not found"
```bash
# Réinstaller uv
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
```

### Erreur "Connection refused"
```bash
# Vérifier que Tracker fonctionne
curl http://localhost:8080/api/v1alpha1/events/list?perPage=1
```

### Serveur MCP ne démarre pas
1. Ouvrir la vue "MCP Servers" dans Kiro
2. Vérifier les logs d'erreur
3. Redémarrer le serveur depuis l'interface

## Exemples d'Usage

### Monitoring Quotidien
```
"Résumé des événements d'aujourd'hui"
"Y a-t-il des incidents en cours ?"
"Quels sont les déploiements en échec ?"
```

### Recherche Avancée
```
"Trouve les déploiements en production avec un impact cette semaine"
"Liste les événements P1 du service payment-api"
"Montre les drifts non résolus en production"
```

### Coordination d'Équipes
```
"Quels services ont des locks actifs ?"
"Y a-t-il des événements sur les services de l'équipe Platform ?"
"Qui est le owner du service user-management ?"
```

---

**Temps d'installation :** < 2 minutes  
**Prêt à utiliser :** Immédiatement après configuration dans Kiro

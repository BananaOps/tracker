# 🤖 Serveur MCP Tracker

## 📖 Introduction

Tracker expose un serveur [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) directement dans son serveur HTTP, sur `/mcp`. Les assistants IA (Claude Code, Claude Desktop, Cursor, Kiro, etc.) peuvent ainsi interroger les events, le catalogue et les locks en langage naturel, **sans rien installer** : il suffit de pointer le client sur l'URL de Tracker.

Les outils lisent les events, le catalogue et les locks, et `create_event` permet d'enregistrer un event. Tous respectent l'authentification de Tracker : permissions, scope par service des équipes et accès anonyme s'appliquent exactement comme sur l'API REST.

## 🎯 Cas d'Usage

### Pour les Développeurs
- "Quels sont les déploiements en production aujourd'hui ?"
- "Montre-moi les incidents P1 de la semaine dernière"
- "Quelle est la version du service user-api dans le catalogue ?"

### Pour les DevOps
- "Y a-t-il des locks actifs en production ?"
- "Liste les drifts ouverts sur le service payment-api"
- "Quels déploiements ont échoué cette semaine ?"

### Pour les Managers
- "Résume l'activité de déploiement de ce mois"
- "Quels services ont eu le plus d'incidents ?"

## 🛠️ Architecture

```
Client MCP (Claude Code, Cursor, Kiro…)
        │  Streamable HTTP, POST /mcp
        │  Authorization: Bearer trk_…
        ▼
Tracker :8080 ── auth.HTTPMiddleware (clé API, session, anonyme)
        │
        ▼
server/mcp.go ── outils MCP
        │  appels en interne, sous le nom de la RPC
        ▼
Services Event / Catalog / Lock ── authz (permissions + scope)
        │
        ▼
     MongoDB
```

- Transport **Streamable HTTP** en mode *stateless* : chaque requête MCP est traitée avec le contexte de sa propre requête HTTP, donc avec l'identité de l'appelant à ce moment-là (une clé révoquée ou un scope modifié s'applique à la requête suivante).
- Les outils appellent les services gRPC en mémoire, sans passer par le réseau, sous le nom de la RPC correspondante (`ListEvents`, `GetLock`…). Aucune règle d'autorisation n'est propre au MCP.

## ⚙️ Activation

L'endpoint est activé par défaut.

| Variable | Défaut | Description |
|----------|--------|-------------|
| `MCP_ENABLED` | `true` | Sert l'endpoint MCP sur `/mcp`. `false` le désactive. |

Il est servi sur le port HTTP de Tracker (8080), derrière le même reverse proxy que l'interface et l'API.

## 🔐 Authentification

Le client présente ses identifiants dans un header HTTP, comme pour l'API REST :

```
Authorization: Bearer trk_...
X-Api-Key: trk_...
```

| Appelant | Ce qu'il voit |
|----------|---------------|
| Clé API d'équipe | Les permissions et le scope de l'équipe (relus à chaque requête) |
| Clé API globale | Tout |
| Sans identifiant | Les permissions de `AUTH_ANONYMOUS_PERMISSIONS`, sans restriction de scope |
| Identifiant invalide ou expiré | HTTP 401 avant tout échange MCP |

Recommandations :

- Créez une **clé API dédiée** à l'usage MCP, rattachée à une équipe dont les permissions se limitent à `event:read`, `catalog:read` et `lock:read`, plus `event:write` si l'assistant doit créer des events. Voir [Authentification](./AUTHENTICATION.md#api-keys).
- Les events créés par une clé API ont pour propriétaire `apikey:<préfixe>` (le nom de l'utilisateur pour une session), sauf si `owner` est fourni.
- Pour qu'une clé d'équipe isole vraiment les données de l'équipe, restreignez l'accès anonyme (`AUTH_ANONYMOUS_PERMISSIONS=`). Sinon un client sans clé voit tout ce que l'anonyme voit. Tant que `AUTH_ANONYMOUS_PERMISSIONS` n'est pas défini, l'anonyme garde les permissions transitoires, écriture comprise : un client sans clé peut alors créer des events, comme sur l'API REST.
- Un refus (permission manquante, service hors scope) est renvoyé comme une erreur d'outil, lisible par l'assistant, par exemple `service "payment-api" is outside your scope`.

## 🔌 Configuration des Clients

Remplacez `https://tracker.example.com` par l'URL de votre Tracker (`http://localhost:8080` en local).

### Claude Code

```bash
claude mcp add --transport http tracker https://tracker.example.com/mcp \
  --header "Authorization: Bearer trk_..."
```

### Cursor, Kiro et clients compatibles

```json
{
  "mcpServers": {
    "tracker": {
      "type": "http",
      "url": "https://tracker.example.com/mcp",
      "headers": {
        "Authorization": "Bearer trk_..."
      }
    }
  }
}
```

Le nom de la clé (`type`, `transport`, `serverUrl`…) varie selon les clients : reportez-vous à la documentation du vôtre pour un serveur MCP « Streamable HTTP ».

### Clients limités au transport stdio

Les clients qui ne savent lancer qu'un processus local peuvent passer par un pont stdio vers HTTP, par exemple [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) :

```json
{
  "mcpServers": {
    "tracker": {
      "command": "npx",
      "args": ["mcp-remote", "https://tracker.example.com/mcp", "--header", "Authorization:Bearer trk_..."]
    }
  }
}
```

## 🎯 Outils Disponibles

Toutes les réponses sont du JSON au format de l'API REST (champs en camelCase, enums par leur nom). Les listes sont paginées par le serveur MCP : `per_page` (10 par défaut, 100 au maximum) et `page` (à partir de 1) ; `totalCount` donne le nombre total d'éléments. Les events sont triés du plus récent au plus ancien, le catalogue par nom.

### 📅 Events

| Outil | Paramètres | Description |
|-------|------------|-------------|
| `list_events` | `per_page`, `page`, `type`, `service`, `status` | Liste les events, filtrés si un filtre est donné |
| `today_events` | `per_page`, `page` | Events qui commencent aujourd'hui |
| `search_events` | `source`, `type`, `priority`, `status`, `service`, `environment`, `start_date`, `end_date`, `per_page`, `page` | Recherche multi-critères, au moins un filtre requis |
| `get_event` | `event_id` (requis) | Un event par son id ou par l'id de son message Slack |
| `create_event` | `title`, `type`, `service`, `environment`, `status` (requis) ; `priority`, `message`, `source`, `owner`, `start_date`, `end_date`, `impact`, `pull_request_link`, `ticket`, `related_id` | Crée un event (voir ci-dessous) |

Valeurs acceptées :

- `type` : `deployment`, `operation`, `drift`, `incident`, `rpa_usage`
- `priority` : `P1` à `P5`
- `status` : `start`, `failure`, `success`, `warning`, `error`, `snapshot`, `user_update`, `recommandation`, `open`, `close`, `done`, `in_progress`, `planned`, `waiting_approval`
- `environment` : `development`, `integration`, `TNR`, `UAT`, `recette`, `preproduction`, `production`, `mco`
- `start_date` / `end_date` : filtrent sur la date de début de l'event, au format `YYYY-MM-DD` ou RFC 3339 (`2026-01-15T10:30:00Z`)

`create_event` demande la permission `event:write` sur le service. Valeurs par défaut : `priority` `P3`, `source` `mcp`, `owner` l'appelant, `start_date` maintenant. Comme sur l'API, un `deployment` ou une `operation` créé avec le statut `start` ou `in_progress` pose un lock sur le service dans son environnement, et la création échoue si ce service y est déjà verrouillé. `related_id` relie l'event à un précédent, par exemple la fin d'un déploiement à son début.

### 📚 Catalog

| Outil | Paramètres | Description |
|-------|------------|-------------|
| `list_catalog` | `per_page`, `page` | Services, modules, bibliothèques et conteneurs du catalogue |
| `get_catalog_service` | `service_name` (requis) | Une entrée du catalogue avec ses versions, dépendances et liens |

### 🔒 Locks

| Outil | Paramètres | Description |
|-------|------------|-------------|
| `list_locks` | `per_page`, `page` | Locks actifs |
| `get_lock` | `lock_id` (requis) | Un lock par son id |

## 🐛 Troubleshooting

### Vérifier l'endpoint

```bash
curl -s https://tracker.example.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer trk_..." \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

| Symptôme | Cause probable |
|----------|----------------|
| `404` sur `/mcp` | `MCP_ENABLED=false`, ou une version de Tracker antérieure à l'endpoint MCP |
| `401 invalid or expired credentials` | Clé API inconnue, révoquée ou mal copiée |
| Erreur d'outil `permission denied` | La clé (ou l'anonyme) n'a pas la permission `*:read` correspondante |
| Erreur d'outil `outside your scope` | L'objet appartient à un service hors du scope de l'équipe de la clé |
| Erreur d'outil `password change required` | Session d'un utilisateur qui doit changer son mot de passe : utilisez une clé API |
| Listes vides | Scope d'équipe sans le service recherché, ou filtre trop restrictif |

## 🔄 Migration depuis le Serveur Python

L'ancien serveur Python (`mcp-server/`, stdio, installé avec `uv`) a été supprimé : il appelait l'API REST sans s'authentifier et devait être installé sur chaque poste. Pour migrer :

1. Créez une clé API (voir [Authentification](#-authentification)).
2. Remplacez dans la configuration de votre client l'entrée `uvx … tracker-mcp-server` par la configuration HTTP ci-dessus.
3. Les noms des outils sont inchangés. Différences : `search_events` n'accepte plus `impact` ni `slack_id`, que l'API n'appliquait pas (pour retrouver un event par son message Slack, utilisez `get_event`), et `list_catalog`, `get_catalog_service`, `get_event` et `get_lock` fonctionnent désormais (le serveur Python appelait des routes qui n'existent pas).

## 🚀 Développement

Le code est dans `server/mcp.go`, les tests de bout en bout dans `server/mcp_test.go` (ils nécessitent `MONGO_TEST_URI`, voir [Développement](./DEVELOPMENT.md)).

Pour ajouter un outil :

1. Déclarez-le avec `mcp.AddTool` dans `newMCPServer`, avec une structure d'entrée dont les tags `jsonschema` décrivent les paramètres.
2. Appelez le service avec `rpcContext(ctx, <Service>_<Rpc>_FullMethodName)` : la RPC applique elle-même permissions et scope.
3. Marquez-le `ReadOnlyHint` s'il ne modifie rien (sinon `DestructiveHint: false` s'il ne fait qu'ajouter, comme `create_event`), et couvrez dans `mcp_test.go` le cas d'une clé d'équipe hors scope.

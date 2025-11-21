# Tests K6 - Génération de données

## Installation

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

## Scripts disponibles

### 1. generate-test-data.js

Génère un jeu de données complet et réaliste pour tester l'application.

**Caractéristiques** :
- 5 équipes avec 3 services chacune
- 6 environnements (dev, integration, tnr, uat, preprod, prod)
- Événements sur 35 jours (5 jours passés + 30 jours futurs)
- 3-8 événements par jour
- Distribution réaliste :
  - 35% Deployments
  - 15% Incidents
  - 15% Drifts
  - 15% RPA Usage
  - 20% Operations

**Utilisation** :

```bash
# Avec l'URL par défaut (localhost:8080)
k6 run tests/k6/generate-test-data.js

# Avec une URL personnalisée
k6 run -e BASE_URL=http://your-server:8080 tests/k6/generate-test-data.js
```

**Résultat attendu** :
- ~150-200 événements créés
- Durée : ~1-2 minutes
- Tous les types d'événements représentés
- Événements répartis sur plusieurs jours

### 2. load-test-data.js

Test de charge pour générer des données en continu.

**Caractéristiques** :
- 10 utilisateurs virtuels simultanés
- Durée : 2 minutes
- Génération aléatoire d'événements
- Vérification des performances

**Utilisation** :

```bash
# Test de charge standard
k6 run tests/k6/load-test-data.js

# Test de charge personnalisé
k6 run -e BASE_URL=http://your-server:8080 \
  --vus 20 \
  --duration 5m \
  tests/k6/load-test-data.js
```

**Métriques surveillées** :
- `http_req_duration` : 95% des requêtes < 500ms
- `http_req_failed` : Taux d'échec < 10%

## Données générées

### Équipes et services

| Équipe | Services |
|--------|----------|
| Platform | api-gateway, auth-service, notification-service |
| Data | data-pipeline, analytics-service, etl-jobs |
| Frontend | web-app, mobile-app, admin-portal |
| Infrastructure | monitoring, logging, backup-service |
| Security | firewall, vpn-service, audit-service |

### Types d'événements

#### Deployments (35%)
- Versions : 1.2.3, 1.2.4, 1.3.0, 2.0.0, 2.1.0
- Status : start, success, failure
- Sources : github_actions, gitlab_ci, jenkins, argocd
- Liens : Pull Request + Ticket Jira
- Slack : #deployments ou #deployments-prod

#### Incidents (15%)
- Types : High CPU, Memory leak, Database timeout, API degradation, Service unavailable
- Status : open, close
- Priorité : P1 (prod) ou P2
- Sources : prometheus, datadog, newrelic, manual
- Slack : #incidents

#### Drifts (15%)
- Types : Terraform drift, Config mismatch, Manual change, Resource mismatch
- Status : open, done, warning
- Priorité : P2, P3, P4
- Source : terraform
- Slack : #infrastructure

#### RPA Usage (15%)
- Processus : Invoice processing, Data extraction, Report generation, Email automation
- Status : success, failure, warning
- Priorité : P3, P4, P5
- Source : uipath
- Slack : #rpa-logs

#### Operations (20%)
- Types : Database migration, Cache clear, Index rebuild, Certificate renewal, Scale up/down
- Status : start, success, failure, done
- Priorité : P2, P3, P4
- Sources : manual, scheduled, automated
- Slack : #operations

## Exemples de commandes

### Générer des données de test

```bash
# Génération simple
k6 run tests/k6/generate-test-data.js

# Avec URL personnalisée
k6 run -e BASE_URL=https://tracker.example.com tests/k6/generate-test-data.js
```

### Test de charge

```bash
# Test léger (10 VUs, 2 minutes)
k6 run tests/k6/load-test-data.js

# Test moyen (50 VUs, 5 minutes)
k6 run --vus 50 --duration 5m tests/k6/load-test-data.js

# Test intensif (100 VUs, 10 minutes)
k6 run --vus 100 --duration 10m tests/k6/load-test-data.js
```

### Exporter les résultats

```bash
# Export JSON
k6 run --out json=results.json tests/k6/generate-test-data.js

# Export InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 tests/k6/load-test-data.js

# Export CSV
k6 run --out csv=results.csv tests/k6/load-test-data.js
```

## Nettoyage

Pour supprimer toutes les données de test :

```bash
# Via MongoDB
mongosh "$MONGODB_URI" --eval "db.events.deleteMany({})"

# Via l'API (si implémenté)
curl -X DELETE http://localhost:8080/api/v1alpha1/events
```

## Vérification

Après la génération, vérifiez les données :

```bash
# Compter les événements
curl http://localhost:8080/api/v1alpha1/events | jq '.totalCount'

# Voir les événements récents
curl http://localhost:8080/api/v1alpha1/events | jq '.events[] | {title, type: .attributes.type, status: .attributes.status}'

# Statistiques par type
curl http://localhost:8080/api/v1alpha1/events | jq '[.events[].attributes.type] | group_by(.) | map({type: .[0], count: length})'
```

## Troubleshooting

### Erreur de connexion

```
ERRO[0000] GoError: Get "http://localhost:8080/api/v1alpha1/events": dial tcp [::1]:8080: connect: connection refused
```

**Solution** : Vérifiez que le backend est démarré sur le bon port.

### Taux d'échec élevé

```
✗ http_req_failed..............: 25.00%
```

**Solution** : 
- Vérifiez les logs du backend
- Réduisez le nombre de VUs
- Augmentez le délai entre les requêtes (`sleep`)

### Timeout

```
WARN[0030] Request Failed error="Post \"http://localhost:8080/api/v1alpha1/events\": context deadline exceeded"
```

**Solution** :
- Augmentez le timeout : `--http-debug="full"`
- Vérifiez les performances du backend
- Vérifiez la connexion MongoDB

## Ressources

- [Documentation K6](https://k6.io/docs/)
- [K6 Examples](https://k6.io/docs/examples/)
- [K6 Cloud](https://k6.io/cloud/)

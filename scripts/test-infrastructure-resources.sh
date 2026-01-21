#!/bin/bash

# Script pour tester la fonctionnalité Infrastructure Resources
# Usage: ./scripts/test-infrastructure-resources.sh

set -e

API_URL="${API_URL:-http://localhost:8080}"
API_ENDPOINT="${API_URL}/api/v1alpha1/catalog"

echo "🧪 Test de la fonctionnalité Infrastructure Resources"
echo "=================================================="
echo ""

# Couleurs pour l'output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Créer un service avec des ressources d'infrastructure
echo -e "${BLUE}📝 Création du service auth-service avec ressources d'infrastructure...${NC}"
curl -X PUT "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "auth-service",
    "type": "project",
    "languages": "golang",
    "owner": "platform-team",
    "version": "2.1.0",
    "description": "Authentication and authorization service",
    "repository": "https://github.com/company/auth-service",
    "platform": "kubernetes",
    "sla": {
      "level": "critical",
      "uptime_percentage": {"value": 99.99},
      "response_time_ms": {"value": 100},
      "description": "Mission-critical authentication service"
    },
    "infrastructure_resources": [
      {
        "id": "infra-1",
        "name": "users-db",
        "type": "database_postgresql",
        "description": "Primary PostgreSQL database for user data",
        "provider": "AWS",
        "region": "us-east-1",
        "endpoint": "users-db.cluster-abc123.us-east-1.rds.amazonaws.com:5432",
        "metadata": {
          "instance_type": "db.r5.xlarge",
          "storage": "500GB",
          "multi_az": "true"
        }
      },
      {
        "id": "infra-2",
        "name": "sessions-cache",
        "type": "cache_redis",
        "description": "Redis cache for user sessions",
        "provider": "AWS",
        "region": "us-east-1",
        "endpoint": "sessions-cache.abc123.cache.amazonaws.com:6379",
        "metadata": {
          "node_type": "cache.r5.large",
          "num_nodes": "3"
        }
      },
      {
        "id": "infra-3",
        "name": "auth-secrets",
        "type": "security_secrets_manager",
        "description": "Secrets Manager for API keys",
        "provider": "AWS",
        "region": "us-east-1",
        "endpoint": "secretsmanager.us-east-1.amazonaws.com"
      },
      {
        "id": "infra-4",
        "name": "auth-lb",
        "type": "network_load_balancer",
        "description": "Application Load Balancer",
        "provider": "AWS",
        "region": "us-east-1",
        "endpoint": "auth-lb-123456789.us-east-1.elb.amazonaws.com"
      },
      {
        "id": "infra-5",
        "name": "audit-logs-bucket",
        "type": "storage_s3",
        "description": "S3 bucket for audit logs",
        "provider": "AWS",
        "region": "us-east-1",
        "endpoint": "s3://audit-logs-auth-service"
      }
    ]
  }' | jq '.'

echo ""
echo -e "${GREEN}✅ Service créé avec succès${NC}"
echo ""

# 2. Récupérer le service et vérifier les ressources
echo -e "${BLUE}🔍 Récupération du service auth-service...${NC}"
RESPONSE=$(curl -s "${API_ENDPOINT}?name=auth-service")
echo "$RESPONSE" | jq '.'

# Compter les ressources d'infrastructure
INFRA_COUNT=$(echo "$RESPONSE" | jq '.catalog.infrastructure_resources | length')
echo ""
echo -e "${YELLOW}📊 Nombre de ressources d'infrastructure: ${INFRA_COUNT}${NC}"

if [ "$INFRA_COUNT" -eq 5 ]; then
  echo -e "${GREEN}✅ Toutes les ressources ont été sauvegardées${NC}"
else
  echo -e "${RED}❌ Erreur: ${INFRA_COUNT} ressources trouvées au lieu de 5${NC}"
  exit 1
fi

# 3. Afficher les détails des ressources
echo ""
echo -e "${BLUE}📋 Détails des ressources d'infrastructure:${NC}"
echo "$RESPONSE" | jq -r '.catalog.infrastructure_resources[] | "  - \(.name) (\(.type)) - \(.provider) \(.region)"'

echo ""
echo -e "${GREEN}✅ Test terminé avec succès!${NC}"
echo ""
echo -e "${YELLOW}💡 Prochaines étapes:${NC}"
echo "  1. Ouvrir http://localhost:8080/catalog/auth-service dans le navigateur"
echo "  2. Vérifier que les ressources apparaissent dans la section Infrastructure Resources"
echo "  3. Vérifier que les ressources apparaissent dans le graphique de dépendances"
echo "  4. Tester l'ajout/édition/suppression de ressources via l'interface"

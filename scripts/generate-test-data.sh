#!/bin/bash

# Script pour générer des données de test avec K6
# Usage: ./scripts/generate-test-data.sh [URL]

set -e

API_URL="${1:-http://localhost:8080}"

echo "=== Génération de données de test ==="
echo "API URL: $API_URL"
echo ""

# Vérifier que k6 est installé
if ! command -v k6 &> /dev/null; then
    echo "❌ k6 n'est pas installé"
    echo ""
    echo "Installation:"
    echo "  macOS:   brew install k6"
    echo "  Linux:   https://k6.io/docs/getting-started/installation/"
    echo "  Windows: choco install k6"
    exit 1
fi

# Vérifier que le backend est accessible
echo "Vérification de la connexion au backend..."
if ! curl -s -f "$API_URL/api/v1alpha1/catalogs/list" > /dev/null 2>&1; then
    echo "❌ Impossible de se connecter à $API_URL"
    echo ""
    echo "Assurez-vous que le backend est démarré:"
    echo "  go run cmd/tracker/main.go serv"
    exit 1
fi

echo "✓ Backend accessible"
echo ""

# Lancer la génération
echo "Génération des données de test..."
echo ""

k6 run -e BASE_URL="$API_URL" tests/k6/generate-test-data.js

echo ""
echo "=== Génération terminée ==="
echo ""
echo "Vérification:"
echo "  curl $API_URL/api/v1alpha1/events | jq '.totalCount'"
echo ""
echo "Interface web:"
echo "  $API_URL/events"

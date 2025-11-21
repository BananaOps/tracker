#!/bin/bash

# Test Locks API
# Usage: ./scripts/test-locks.sh [base_url]

set -e

BASE_URL="${1:-http://localhost:8080}"

echo "🔒 Testing Locks API at $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Create a lock
echo -e "${YELLOW}1. Creating a lock...${NC}"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1alpha1/lock" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "test-service",
    "who": "test-user",
    "environment": "production",
    "resource": "deployment"
  }')

LOCK_ID=$(echo "$CREATE_RESPONSE" | jq -r '.lock.id')

if [ "$LOCK_ID" != "null" ] && [ -n "$LOCK_ID" ]; then
  echo -e "${GREEN}✓ Lock created: $LOCK_ID${NC}"
else
  echo -e "${RED}✗ Failed to create lock${NC}"
  echo "$CREATE_RESPONSE" | jq .
  exit 1
fi

echo ""

# Test 2: List locks
echo -e "${YELLOW}2. Listing locks...${NC}"
LIST_RESPONSE=$(curl -s "$BASE_URL/api/v1alpha1/locks/list")
LOCK_COUNT=$(echo "$LIST_RESPONSE" | jq '.locks | length')

if [ "$LOCK_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Found $LOCK_COUNT lock(s)${NC}"
  echo "$LIST_RESPONSE" | jq '.locks[] | {id: .id, service: .service, environment: .environment, who: .who}'
else
  echo -e "${RED}✗ No locks found${NC}"
fi

echo ""

# Test 3: Get specific lock
echo -e "${YELLOW}3. Getting lock $LOCK_ID...${NC}"
GET_RESPONSE=$(curl -s "$BASE_URL/api/v1alpha1/lock/$LOCK_ID")
GET_LOCK_ID=$(echo "$GET_RESPONSE" | jq -r '.lock.id')

if [ "$GET_LOCK_ID" = "$LOCK_ID" ]; then
  echo -e "${GREEN}✓ Lock retrieved successfully${NC}"
  echo "$GET_RESPONSE" | jq '.lock'
else
  echo -e "${RED}✗ Failed to get lock${NC}"
fi

echo ""

# Test 4: Unlock
echo -e "${YELLOW}4. Unlocking $LOCK_ID...${NC}"
UNLOCK_RESPONSE=$(curl -s "$BASE_URL/api/v1alpha1/unlock/$LOCK_ID")
UNLOCK_MESSAGE=$(echo "$UNLOCK_RESPONSE" | jq -r '.message')

if [ -n "$UNLOCK_MESSAGE" ]; then
  echo -e "${GREEN}✓ $UNLOCK_MESSAGE${NC}"
else
  echo -e "${RED}✗ Failed to unlock${NC}"
  echo "$UNLOCK_RESPONSE" | jq .
fi

echo ""

# Test 5: Verify lock is gone
echo -e "${YELLOW}5. Verifying lock is removed...${NC}"
VERIFY_RESPONSE=$(curl -s "$BASE_URL/api/v1alpha1/locks/list")
STILL_EXISTS=$(echo "$VERIFY_RESPONSE" | jq --arg id "$LOCK_ID" '.locks[] | select(.id == $id) | .id')

if [ -z "$STILL_EXISTS" ]; then
  echo -e "${GREEN}✓ Lock successfully removed${NC}"
else
  echo -e "${RED}✗ Lock still exists${NC}"
fi

echo ""
echo -e "${GREEN}✅ All tests completed!${NC}"

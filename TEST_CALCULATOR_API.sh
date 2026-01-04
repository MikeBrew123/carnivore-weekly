#!/bin/bash

# ===================================================================
# Calculator API Testing Script
# Test all endpoints after database migration
# ===================================================================

set -e

API_BASE="http://localhost:8787/api/v1"
SESSION_TOKEN=""
SESSION_ID=""
ACCESS_TOKEN=""

echo "==============================================="
echo "Calculator API Integration Tests"
echo "==============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test 1: Create Session
echo -e "${YELLOW}[TEST 1]${NC} Create Session"
RESPONSE=$(curl -s -X POST "$API_BASE/calculator/session" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "Response: $RESPONSE"

SESSION_TOKEN=$(echo "$RESPONSE" | jq -r '.session_token // empty')
SESSION_ID=$(echo "$RESPONSE" | jq -r '.session_id // empty')

if [ -z "$SESSION_TOKEN" ]; then
    echo -e "${RED}FAILED${NC}: No session_token returned"
    echo "Full response: $RESPONSE"
    exit 1
fi

echo -e "${GREEN}SUCCESS${NC}: Created session"
echo "  session_token: $SESSION_TOKEN"
echo "  session_id: $SESSION_ID"
echo ""

# Test 2: Save Step 1
echo -e "${YELLOW}[TEST 2]${NC} Save Step 1 (Physical Stats)"
RESPONSE=$(curl -s -X POST "$API_BASE/calculator/step/1" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "session_token": "$SESSION_TOKEN",
  "data": {
    "sex": "male",
    "age": 35,
    "height_feet": 5,
    "height_inches": 11,
    "weight_value": 185,
    "weight_unit": "lbs"
  }
}
EOF
)

echo "Response: $RESPONSE"
STATUS=$(echo "$RESPONSE" | jq -r '.step_completed // empty')

if [ "$STATUS" != "2" ]; then
    echo -e "${RED}FAILED${NC}: Step not updated"
    exit 1
fi

echo -e "${GREEN}SUCCESS${NC}: Step 1 saved"
echo "  step_completed: $STATUS"
echo ""

# Test 3: Save Step 2
echo -e "${YELLOW}[TEST 3]${NC} Save Step 2 (Fitness & Diet)"
RESPONSE=$(curl -s -X POST "$API_BASE/calculator/step/2" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "session_token": "$SESSION_TOKEN",
  "data": {
    "lifestyle_activity": "light",
    "exercise_frequency": "3-4",
    "goal": "lose",
    "deficit_percentage": 20,
    "diet_type": "carnivore"
  }
}
EOF
)

echo "Response: $RESPONSE"
STATUS=$(echo "$RESPONSE" | jq -r '.step_completed // empty')

if [ "$STATUS" != "3" ]; then
    echo -e "${RED}FAILED${NC}: Step not updated"
    exit 1
fi

echo -e "${GREEN}SUCCESS${NC}: Step 2 saved"
echo "  step_completed: $STATUS"
echo ""

# Test 4: Get Payment Tiers
echo -e "${YELLOW}[TEST 4]${NC} Get Payment Tiers"
RESPONSE=$(curl -s -X GET "$API_BASE/calculator/payment/tiers" \
  -H "Content-Type: application/json")

echo "Response: $RESPONSE"
TIER_COUNT=$(echo "$RESPONSE" | jq -r '.count // 0')

if [ "$TIER_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}WARNING${NC}: No tiers returned (check if seeding completed)"
else
    echo -e "${GREEN}SUCCESS${NC}: Retrieved payment tiers"
    echo "  tier_count: $TIER_COUNT"
    TIER_ID=$(echo "$RESPONSE" | jq -r '.tiers[0].id // empty')
    echo "  first_tier_id: $TIER_ID"
fi
echo ""

# Test 5: Save Step 3 (with macros)
echo -e "${YELLOW}[TEST 5]${NC} Save Step 3 (Calculated Macros)"
RESPONSE=$(curl -s -X POST "$API_BASE/calculator/step/3" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "session_token": "$SESSION_TOKEN",
  "calculated_macros": {
    "calories": 2100,
    "protein_g": 175,
    "fat_g": 160,
    "carbs_g": 20,
    "calculation_method": "carnivore_formula"
  }
}
EOF
)

echo "Response: $RESPONSE"
STATUS=$(echo "$RESPONSE" | jq -r '.step_completed // empty')
MACROS=$(echo "$RESPONSE" | jq '.calculated_macros // empty')

if [ "$STATUS" != "3" ]; then
    echo -e "${RED}FAILED${NC}: Step not updated"
    exit 1
fi

echo -e "${GREEN}SUCCESS${NC}: Step 3 saved"
echo "  step_completed: $STATUS"
echo "  macros: $MACROS"
echo ""

# Test 6: Initiate Payment
echo -e "${YELLOW}[TEST 6]${NC} Initiate Payment"

if [ -z "$TIER_ID" ]; then
    echo -e "${YELLOW}SKIPPED${NC}: No tier_id available (payment_tiers not seeded)"
else
    RESPONSE=$(curl -s -X POST "$API_BASE/calculator/payment/initiate" \
      -H "Content-Type: application/json" \
      -d @- <<EOF
{
  "session_token": "$SESSION_TOKEN",
  "tier_id": "$TIER_ID"
}
EOF
    )

    echo "Response: $RESPONSE"
    PAYMENT_INTENT=$(echo "$RESPONSE" | jq -r '.payment_intent_id // empty')

    if [ -z "$PAYMENT_INTENT" ]; then
        echo -e "${YELLOW}WARNING${NC}: Payment initiation returned no intent_id"
    else
        echo -e "${GREEN}SUCCESS${NC}: Payment initiated"
        echo "  payment_intent_id: $PAYMENT_INTENT"
    fi
fi
echo ""

echo "==============================================="
echo "Testing Complete"
echo "==============================================="
echo ""
echo "Summary:"
echo "  - Session Creation: SUCCESS"
echo "  - Step 1-3: SUCCESS"
echo "  - Payment Tiers: $([ "$TIER_COUNT" -gt 0 ] && echo 'SUCCESS' || echo 'PENDING (seed tiers)')"
echo ""
echo "Next Steps:"
echo "1. If database not migrated: Run SUPABASE_MIGRATION_COMBINED.sql"
echo "2. If tiers not seeded: Run SUPABASE_SEED_PAYMENT_TIERS.sql"
echo "3. Then re-run this test script"
echo "4. Test complete flow at: http://localhost:8000/public/calculator-form-rebuild.html"
echo ""

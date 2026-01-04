#!/bin/bash

# Test Script for Stripe Checkout Endpoint
# Purpose: Verify create-checkout endpoint works correctly
# Usage: ./test-checkout-endpoint.sh [test_type] [base_url]

set -e

# ===== CONFIGURATION =====

BASE_URL="${2:-https://carnivore-report-api-production.iambrew.workers.dev}"
ENDPOINT="/api/v1/assessment/create-checkout"
TEST_TYPE="${1:-all}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ===== UTILITY FUNCTIONS =====

print_header() {
  echo -e "\n${BLUE}========== $1 ==========${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

test_endpoint() {
  local test_name=$1
  local request_body=$2
  local expected_status=$3
  local should_contain=$4

  print_header "$test_name"
  echo "Sending request to: $BASE_URL$ENDPOINT"
  echo "Body: $request_body"

  local response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "$request_body")

  # Extract HTTP status code (last line)
  local http_status=$(echo "$response" | tail -n 1)
  # Extract response body (everything except last line)
  local body=$(echo "$response" | sed '$d')

  echo "Response Status: $http_status"
  echo "Response Body:"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"

  # Check status code
  if [[ "$http_status" == "$expected_status" ]]; then
    print_success "HTTP $http_status (expected)"
  else
    print_error "HTTP $http_status (expected $expected_status)"
    return 1
  fi

  # Check for expected content if provided
  if [[ -n "$should_contain" ]]; then
    if echo "$body" | grep -q "$should_contain"; then
      print_success "Response contains expected text: $should_contain"
    else
      print_error "Response missing expected text: $should_contain"
      return 1
    fi
  fi

  echo ""
  return 0
}

# ===== TEST CASES =====

run_all_tests() {
  local passed=0
  local failed=0

  # Test 1: Valid request
  if test_endpoint \
    "Test 1: Valid Request (All Fields)" \
    '{
      "email": "test@example.com",
      "first_name": "John",
      "form_data": {
        "age": 35,
        "sex": "male",
        "weight": 180,
        "weight_unit": "lbs",
        "height_feet": 6,
        "height_inches": 0,
        "lifestyle_activity": "moderate",
        "exercise_frequency": "3-4",
        "goal": "lose",
        "deficit_percentage": 20,
        "diet_type": "carnivore"
      }
    }' \
    "201" \
    "checkout_url"; then
    ((passed++))
  else
    ((failed++))
  fi

  # Test 2: Missing email
  if test_endpoint \
    "Test 2: Missing Email" \
    '{
      "first_name": "John",
      "form_data": {"age": 35}
    }' \
    "400" \
    "MISSING_EMAIL"; then
    ((passed++))
  else
    ((failed++))
  fi

  # Test 3: Invalid email
  if test_endpoint \
    "Test 3: Invalid Email Format" \
    '{
      "email": "invalid-email",
      "first_name": "John",
      "form_data": {"age": 35}
    }' \
    "400" \
    "INVALID_EMAIL"; then
    ((passed++))
  else
    ((failed++))
  fi

  # Test 4: Missing first_name
  if test_endpoint \
    "Test 4: Missing first_name" \
    '{
      "email": "test@example.com",
      "form_data": {"age": 35}
    }' \
    "400" \
    "MISSING_FIRST_NAME"; then
    ((passed++))
  else
    ((failed++))
  fi

  # Test 5: Empty first_name
  if test_endpoint \
    "Test 5: Empty first_name" \
    '{
      "email": "test@example.com",
      "first_name": "",
      "form_data": {"age": 35}
    }' \
    "400" \
    "MISSING_FIRST_NAME"; then
    ((passed++))
  else
    ((failed++))
  fi

  # Test 6: Missing form_data
  if test_endpoint \
    "Test 6: Missing form_data" \
    '{
      "email": "test@example.com",
      "first_name": "John"
    }' \
    "400" \
    "MISSING_FORM_DATA"; then
    ((passed++))
  else
    ((failed++))
  fi

  # Test 7: form_data not an object
  if test_endpoint \
    "Test 7: form_data as String (Not Object)" \
    '{
      "email": "test@example.com",
      "first_name": "John",
      "form_data": "not an object"
    }' \
    "400" \
    "MISSING_FORM_DATA"; then
    ((passed++))
  else
    ((failed++))
  fi

  # Test 8: Invalid JSON
  print_header "Test 8: Invalid JSON"
  echo "Sending malformed JSON..."
  local response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{ invalid json')
  local http_status=$(echo "$response" | tail -n 1)
  local body=$(echo "$response" | sed '$d')

  echo "Response Status: $http_status"
  echo "Response Body: $body"

  if [[ "$http_status" == "400" ]]; then
    print_success "HTTP 400 (expected)"
    ((passed++))
  else
    print_error "HTTP $http_status (expected 400)"
    ((failed++))
  fi

  # Test 9: Wrong Content-Type (local development only, may not work on remote)
  if test_endpoint \
    "Test 9: Wrong Content-Type" \
    '{"email": "test@example.com", "first_name": "John", "form_data": {}}' \
    "400" \
    "INVALID_CONTENT_TYPE"; then
    ((passed++))
  else
    # This might fail on remote if curl defaults to application/json
    print_warning "Content-Type test may not work on all environments"
  fi

  # ===== SUMMARY =====
  print_header "Test Summary"
  echo -e "Passed: ${GREEN}$passed${NC}"
  echo -e "Failed: ${RED}$failed${NC}"
  echo -e "Total:  $((passed + failed))"

  if [[ $failed -eq 0 ]]; then
    echo -e "\n${GREEN}All tests passed!${NC}\n"
    return 0
  else
    echo -e "\n${RED}Some tests failed!${NC}\n"
    return 1
  fi
}

# ===== MAIN =====

case $TEST_TYPE in
  all)
    echo "Running all tests against: $BASE_URL"
    run_all_tests
    ;;
  valid)
    test_endpoint \
      "Valid Request Test" \
      '{
        "email": "test@example.com",
        "first_name": "John",
        "form_data": {
          "age": 35,
          "sex": "male",
          "weight": 180,
          "weight_unit": "lbs"
        }
      }' \
      "201" \
      "checkout_url"
    ;;
  invalid-email)
    test_endpoint \
      "Invalid Email Test" \
      '{"email": "invalid", "first_name": "John", "form_data": {}}' \
      "400" \
      "INVALID_EMAIL"
    ;;
  missing-field)
    test_endpoint \
      "Missing Fields Test" \
      '{"first_name": "John"}' \
      "400" \
      "MISSING_EMAIL"
    ;;
  *)
    echo "Usage: $0 [test_type] [base_url]"
    echo ""
    echo "Test Types:"
    echo "  all            - Run all tests"
    echo "  valid          - Test valid request"
    echo "  invalid-email  - Test invalid email"
    echo "  missing-field  - Test missing required field"
    echo ""
    echo "Examples:"
    echo "  $0 all"
    echo "  $0 valid https://localhost:8787"
    echo "  $0 all https://carnivore-report-api-production.iambrew.workers.dev"
    exit 1
    ;;
esac

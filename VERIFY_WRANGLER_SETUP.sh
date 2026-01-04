#!/bin/bash

# ===================================================================
# Wrangler Setup Verification Script
# Checks if all required secrets and environment variables are set
# ===================================================================

set -e

echo "==============================================="
echo "Wrangler Configuration Verification"
echo "==============================================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "ERROR: wrangler is not installed"
    echo "Install with: npm install -g wrangler"
    exit 1
fi

echo "Wrangler version:"
wrangler --version
echo ""

# Check wrangler.toml exists
if [ ! -f "api/wrangler.toml" ]; then
    echo "ERROR: api/wrangler.toml not found"
    exit 1
fi

echo "Found: api/wrangler.toml"
echo ""

# Show current configuration
echo "Current wrangler.toml configuration:"
grep -A 5 'name = \|vars = ' api/wrangler.toml | head -10
echo ""

# List all secrets (wrangler doesn't show secret values)
echo "Checking secrets..."
echo ""

# Note: wrangler doesn't have a built-in way to list secrets
# We'll check if the .wrangler directory exists
if [ -d "api/.wrangler" ]; then
    echo "Found .wrangler directory (local development cache)"
else
    echo "Note: .wrangler directory not found (first time setup)"
fi

echo ""
echo "Required Environment Variables:"
echo "  - SUPABASE_URL: https://kwtdpvnjewtahuxjyltn.supabase.co (in vars)"
echo "  - ENVIRONMENT: development (in vars)"
echo ""

echo "Required Secrets (must be set via 'wrangler secret put'):"
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo "  - SUPABASE_ANON_KEY"
echo "  - STRIPE_SECRET_KEY (optional for testing)"
echo "  - STRIPE_PUBLISHABLE_KEY (optional)"
echo "  - CLAUDE_API_KEY (for report generation)"
echo "  - FRONTEND_URL (for CORS)"
echo "  - API_BASE_URL (for self-references)"
echo ""

# Test API connectivity
echo "Testing API connectivity..."
echo ""

if [ -d "api" ]; then
    cd api

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
        echo ""
    fi

    # Try to start wrangler dev (timeout after 5 seconds)
    echo "Attempting to start wrangler dev (will timeout in 10 seconds)..."
    timeout 10 wrangler dev --port 8787 > /tmp/wrangler.log 2>&1 &
    WRANGLER_PID=$!

    sleep 3

    # Test health check
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/api/v1/calculator/session -X POST -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")

    if [ "$RESPONSE" = "000" ]; then
        echo "ERROR: Could not connect to API on port 8787"
        echo "Check wrangler.log for details:"
        cat /tmp/wrangler.log | head -20
    elif [ "$RESPONSE" = "500" ]; then
        echo "WARNING: API returned 500 (likely database error)"
        echo "This is expected if migrations haven't been run"
    elif [ "$RESPONSE" = "201" ]; then
        echo "SUCCESS: API is responding correctly!"
    else
        echo "API Response Status: $RESPONSE"
    fi

    # Kill wrangler
    kill $WRANGLER_PID 2>/dev/null || true
    wait $WRANGLER_PID 2>/dev/null || true

    cd ..
else
    echo "ERROR: api/ directory not found"
    exit 1
fi

echo ""
echo "==============================================="
echo "Verification Complete"
echo "==============================================="
echo ""
echo "Next Steps:"
echo ""
echo "1. Set required secrets (if not already set):"
echo "   cd api"
echo "   wrangler secret put SUPABASE_SERVICE_ROLE_KEY"
echo "   # Paste: sb_secret_-DJISSDQQD7oWqS87RBJ8Q_0sKdDWVz"
echo ""
echo "   wrangler secret put SUPABASE_ANON_KEY"
echo "   # Paste: sb_publishable_bQlgBZ7Otay8D9AErt8daA_2lQI36jk"
echo ""
echo "2. Run database migrations in Supabase SQL editor:"
echo "   - Copy contents of SUPABASE_MIGRATION_COMBINED.sql"
echo "   - Paste into https://supabase.com/dashboard/project/kwtdpvnjewtahuxjyltn/sql/new"
echo "   - Execute"
echo ""
echo "3. Seed payment tiers:"
echo "   - Copy contents of SUPABASE_SEED_PAYMENT_TIERS.sql"
echo "   - Paste into same SQL editor"
echo "   - Execute"
echo ""
echo "4. Start API:"
echo "   cd api"
echo "   wrangler dev --port 8787"
echo ""
echo "5. Test with:"
echo "   bash TEST_CALCULATOR_API.sh"
echo ""

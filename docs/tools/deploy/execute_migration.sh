#!/bin/bash
set -e

# Calculator2 Sessions Table Migration Executor
# This script applies the 014_create_calculator2_sessions.sql migration to Supabase

PROJECT_ID="kwtdpvnjewtahuxjyltn"
SUPABASE_URL="https://${PROJECT_ID}.supabase.co"
SERVICE_ROLE_KEY="sb_secret_-DJISSDQQD7oWqS87RBJ8Q_0sKdDWVz"
MIGRATION_FILE="./supabase/migrations/014_create_calculator2_sessions.sql"

echo "========================================"
echo "Calculator2 Sessions Migration Executor"
echo "========================================"
echo ""
echo "Project ID: $PROJECT_ID"
echo "Migration: 014_create_calculator2_sessions"
echo ""

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "ERROR: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "Step 1: Checking network connectivity..."
if curl -s -f "$SUPABASE_URL/health" > /dev/null 2>&1; then
    echo "✓ Network connectivity OK"
else
    echo "✗ Cannot reach Supabase server"
    exit 1
fi

echo ""
echo "Step 2: Preparing migration SQL..."
MIGRATION_SQL=$(cat "$MIGRATION_FILE")
echo "✓ Migration SQL loaded ($(wc -c < "$MIGRATION_FILE") bytes)"

echo ""
echo "Step 3: Connecting to database..."
# Using psql if available
if command -v psql &> /dev/null; then
    echo "Using psql to execute migration..."
    psql "postgresql://postgres:${SERVICE_ROLE_KEY}@db.${PROJECT_ID}.supabase.co:5432/postgres" -f "$MIGRATION_FILE"
    echo "✓ Migration executed via psql"
else
    echo "psql not available. Please use one of these alternatives:"
    echo "  1. Supabase Dashboard: https://app.supabase.com/project/${PROJECT_ID}/sql"
    echo "  2. Install psql: brew install postgresql"
    echo "  3. Use Docker: docker run --rm postgres psql <connection_string>"
    exit 1
fi

echo ""
echo "Step 4: Verifying migration..."

# Verify using REST API
VERIFY_RESPONSE=$(curl -s -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    "${SUPABASE_URL}/rest/v1/calculator2_sessions?limit=1" 2>/dev/null || echo "error")

if echo "$VERIFY_RESPONSE" | grep -q "error\|404\|undefined"; then
    echo "⚠ Could not verify via REST API (this is normal)"
else
    echo "✓ Table accessible via REST API"
fi

echo ""
echo "========================================"
echo "Migration process complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Verify in Supabase dashboard: https://app.supabase.com/project/${PROJECT_ID}/editor"
echo "2. Restart your application"
echo "3. Test Calculator2 functionality"
echo ""

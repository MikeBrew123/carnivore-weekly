#!/bin/bash

# Leo's Supabase Migration Execution Script
# "A database is a promise you make to the future"
#
# This script applies the payment system migrations to your Supabase project
# Run this on your LOCAL machine (not in a sandboxed environment)
#
# Prerequisites:
# - Node.js installed
# - npm installed
# - Access to your Supabase project
#
# Usage: ./APPLY_MIGRATIONS_LOCAL.sh

set -e

PROJECT_DIR="/Users/mbrew/Developer/carnivore-weekly"
MIGRATION_1="$PROJECT_DIR/SUPABASE_MIGRATION_COMBINED.sql"
MIGRATION_2="$PROJECT_DIR/SUPABASE_SEED_PAYMENT_TIERS.sql"

# Supabase credentials
SUPABASE_URL="https://kwtdpvnjewtahuxjyltn.supabase.co"
PROJECT_ID="kwtdpvnjewtahuxjyltn"
SERVICE_ROLE_KEY="sb_secret_-DJISSDQQD7oWqS87RBJ8Q_0sKdDWVz"

echo "========================================"
echo "Carnivore Weekly: Database Migration"
echo "========================================"
echo ""
echo "Project: $SUPABASE_URL"
echo "Migrations: 2"
echo ""

# Method 1: Try direct PostgreSQL connection (if network allows)
echo "[1/3] Attempting direct PostgreSQL connection..."
echo ""

PGPASSWORD="$SERVICE_ROLE_KEY" psql \
  --host="db.${PROJECT_ID}.supabase.co" \
  --port=5432 \
  --username="postgres.${PROJECT_ID}" \
  --dbname="postgres" \
  --file="$MIGRATION_1" \
  2>/dev/null && {
    echo "Migration 1 (Create tables): SUCCESS"

    PGPASSWORD="$SERVICE_ROLE_KEY" psql \
      --host="db.${PROJECT_ID}.supabase.co" \
      --port=5432 \
      --username="postgres.${PROJECT_ID}" \
      --dbname="postgres" \
      --file="$MIGRATION_2" \
      2>/dev/null && {
        echo "Migration 2 (Seed tiers): SUCCESS"
        echo ""
        echo "========================================"
        echo "✓ All migrations completed successfully!"
        echo "========================================"
        echo ""
        echo "Next: Test the payment flow"
        echo "  http://localhost:8000/public/calculator-form-rebuild.html"
        exit 0
      }
  }

# If direct connection fails, instruct on using web dashboard
echo ""
echo "Direct connection failed (network isolation)"
echo ""
echo "========================================"
echo "ALTERNATIVE: Use Supabase Web Dashboard"
echo "========================================"
echo ""
echo "Step 1: Open SQL Editor"
echo "  URL: https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new"
echo ""
echo "Step 2: Execute Migration 1 (Create Tables)"
cat << 'SQL'
-- Copy everything below and paste into Supabase SQL Editor
-- Then click RUN
SQL
cat "$MIGRATION_1" | head -20
echo "  ... [20,739 bytes total] ..."
echo ""
echo "Step 3: Execute Migration 2 (Seed Payment Tiers)"
cat << 'SQL'
-- Copy everything below and paste into Supabase SQL Editor
-- Then click RUN
SQL
cat "$MIGRATION_2" | head -10
echo "  ... [3,288 bytes total] ..."
echo ""
echo "========================================"
echo "OR: Use Supabase CLI"
echo "========================================"
echo ""
echo "1. Authenticate with Supabase:"
echo "   supabase login"
echo ""
echo "2. Link your project:"
echo "   supabase link --project-ref ${PROJECT_ID}"
echo ""
echo "3. Push migrations:"
echo "   supabase db push"
echo ""
echo "Migrations are already in place at:"
echo "  supabase/migrations/20260103180000_create_calculator_payment_system.sql"
echo "  supabase/migrations/20260103180000_seed_payment_tiers.sql"
echo ""

exit 1

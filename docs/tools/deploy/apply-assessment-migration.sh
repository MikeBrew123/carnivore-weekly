#!/bin/bash

# Assessment Migration Executor
# This script applies the cw_assessment_sessions migration to production Supabase
# 
# Usage: ./apply-assessment-migration.sh
# 
# Prerequisites:
# - psql installed
# - Network access to Supabase
# - Environment variables loaded from .env

set -e

PROJECT_ROOT="/Users/mbrew/Developer/carnivore-weekly"
MIGRATION_FILE="$PROJECT_ROOT/migrations/020_assessment_sessions_table.sql"
ENV_FILE="$PROJECT_ROOT/.env"

# Load environment variables
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env file not found at $ENV_FILE"
  exit 1
fi

# Extract credentials from .env
SUPABASE_URL=$(grep "SUPABASE_URL=" "$ENV_FILE" | cut -d= -f2)
SERVICE_ROLE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY=" "$ENV_FILE" | cut -d= -f2)

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"
  exit 1
fi

# Extract host and port from URL
DB_HOST="db.$(echo $SUPABASE_URL | sed 's/https:\/\///g' | cut -d. -f1).supabase.co"
DB_PORT=5432
DB_NAME="postgres"
DB_USER="postgres.$(echo $SUPABASE_URL | sed 's/https:\/\///g' | cut -d. -f1)"

echo "=========================================="
echo "Assessment Migration Executor"
echo "=========================================="
echo ""
echo "Configuration:"
echo "  Project URL: $SUPABASE_URL"
echo "  Database Host: $DB_HOST"
echo "  Database Port: $DB_PORT"
echo "  Database User: $DB_USER"
echo "  Migration File: $MIGRATION_FILE"
echo ""

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "ERROR: Migration file not found at $MIGRATION_FILE"
  exit 1
fi

echo "Executing migration..."
echo ""

# Execute migration using psql
PGPASSWORD="$SERVICE_ROLE_KEY" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -f "$MIGRATION_FILE" \
  --set ON_ERROR_STOP=on

if [ $? -eq 0 ]; then
  echo ""
  echo "=========================================="
  echo "SUCCESS: Migration applied successfully"
  echo "=========================================="
  echo ""
  echo "Next steps:"
  echo "1. Verify the migration by running verification queries"
  echo "2. Test assessment session creation"
  echo "3. Deploy the assessment API endpoints"
  echo ""
else
  echo ""
  echo "=========================================="
  echo "ERROR: Migration failed"
  echo "=========================================="
  echo ""
  exit 1
fi

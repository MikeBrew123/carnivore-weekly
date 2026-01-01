#!/bin/bash

# Deploy Phase 4 Migrations via psql
# Executes SQL migrations directly to Supabase PostgreSQL

set -e

# Load environment variables
source /Users/mbrew/Developer/carnivore-weekly/.env

echo "╔════════════════════════════════════════════════════╗"
echo "║  Deploying Phase 4 Migrations via psql             ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Extract Supabase connection details
SUPABASE_URL="$SUPABASE_URL"
SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Missing Supabase credentials in .env"
  exit 1
fi

# Extract host from URL (format: https://xxxx.supabase.co)
SUPABASE_HOST=$(echo "$SUPABASE_URL" | sed 's|https://||' | sed 's|/||g')
PROJECT_REF=$(echo "$SUPABASE_HOST" | cut -d'.' -f1)

echo "📌 Project Reference: $PROJECT_REF"
echo "📌 Supabase Host: $SUPABASE_HOST"
echo "📌 Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
echo ""

# Construct PostgreSQL connection string
# Format: postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?sslmode=require
PGPASSWORD="$SUPABASE_SERVICE_ROLE_KEY"
PGHOST="$SUPABASE_HOST"
PGPORT="5432"
PGDATABASE="postgres"
PGUSER="postgres"

echo "🔌 Connecting to PostgreSQL..."
echo "   Host: $PGHOST"
echo "   Database: $PGDATABASE"
echo "   User: $PGUSER"
echo ""

# Check connection
if ! psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1;" >/dev/null 2>&1; then
  echo "❌ Failed to connect to Supabase PostgreSQL"
  echo ""
  echo "Troubleshooting:"
  echo "1. Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env"
  echo "2. Check if your IP is allowed in Supabase firewall"
  echo "3. Try connecting manually:"
  echo "   psql postgresql://postgres:[PASSWORD]@$SUPABASE_HOST:5432/postgres?sslmode=require"
  exit 1
fi

echo "✅ Connected successfully"
echo ""

# Get migration file path
MIGRATION_FILE="/Users/mbrew/Developer/carnivore-weekly/supabase/migrations/20250101140000_create_content_tables.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "📂 Migration file: $MIGRATION_FILE"
FILE_SIZE=$(du -h "$MIGRATION_FILE" | cut -f1)
echo "📊 File size: $FILE_SIZE"
echo ""

echo "🚀 Executing migration..."
echo ""

# Execute migration
export PGPASSWORD
export PGSSLMODE=require

if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f "$MIGRATION_FILE"; then
  echo ""
  echo "╔════════════════════════════════════════════════════╗"
  echo "║              ✅ MIGRATION SUCCESSFUL               ║"
  echo "╚════════════════════════════════════════════════════╝"
  echo ""

  echo "✨ Tables created:"
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" << EOF
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
EOF

  echo ""
  echo "✨ Next steps:"
  echo "   1. Run data migrations: node scripts/run_phase4_migration.js"
  echo "   2. Verify data integrity"
  echo "   3. Update application code"
  echo ""
else
  echo ""
  echo "❌ Migration failed"
  exit 1
fi

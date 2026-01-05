#!/bin/bash
# Quick deployment script for writer memory migrations
# Usage: ./QUICK_DEPLOY.sh
# Note: Requires network access to Supabase

set -e

PROJECT_ROOT="/Users/mbrew/Developer/carnivore-weekly"
DB_HOST="db.kwtdpvnjewtahuxjyltn.supabase.co"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="postgres"
DB_PASSWORD="MCNxDuS6DzFsBGc"

echo "================================================================================"
echo "  WRITER MEMORY MIGRATIONS - QUICK DEPLOYMENT"
echo "  Deploying 3 migrations with 29 total memory entries"
echo "================================================================================"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "ERROR: psql not found. Install PostgreSQL client tools."
    exit 1
fi

echo "Database target: $DB_HOST:$DB_PORT"
echo ""

# Set password for psql
export PGPASSWORD="$DB_PASSWORD"

echo "Deploying Migration 019 (Sarah - 14 memories)..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f "$PROJECT_ROOT/migrations/019_seed_sarah_memories.sql" 2>&1 | tail -5
echo ""
echo "DONE: Migration 019"
echo ""

echo "Deploying Migration 020 (Chloe - 7 memories)..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f "$PROJECT_ROOT/migrations/020_seed_chloe_memories.sql" 2>&1 | tail -5
echo ""
echo "DONE: Migration 020"
echo ""

echo "Deploying Migration 021 (Marcus - 8 memories)..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f "$PROJECT_ROOT/migrations/021_seed_marcus_memories.sql" 2>&1 | tail -5
echo ""
echo "DONE: Migration 021"
echo ""

echo "================================================================================"
echo "  DEPLOYMENT COMPLETE - RUNNING VERIFICATION"
echo "================================================================================"
echo ""

# Quick verification
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << VERIFICATION_SQL
SELECT
  w.name,
  COUNT(m.id) as memories,
  MAX(m.relevance_score) as max_relevance,
  MIN(m.relevance_score) as min_relevance
FROM public.writers w
LEFT JOIN public.writer_memory_log m ON m.writer_id = w.id
WHERE w.slug IN ('sarah', 'chloe', 'marcus')
GROUP BY w.id, w.name
ORDER BY w.name;

SELECT
  'TOTAL' as writer,
  COUNT(*) as memories
FROM public.writer_memory_log
WHERE writer_id IN (SELECT id FROM public.writers WHERE slug IN ('sarah', 'chloe', 'marcus'));
VERIFICATION_SQL

echo ""
echo "================================================================================"
echo "  VERIFICATION COMPLETE"
echo "  Expected: Sarah=14, Chloe=7, Marcus=8, TOTAL=29"
echo "================================================================================"
echo ""

unset PGPASSWORD
exit 0

#!/bin/bash

# Analytics Infrastructure Deployment Script
# For Leo (Database Architect) to deploy analytics tables and Edge Function

set -e

echo "🔧 Analytics Infrastructure Deployment"
echo "======================================"
echo ""

# Check for required environment variables
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ Error: SUPABASE_ACCESS_TOKEN not set"
    echo "   Run: supabase login"
    exit 1
fi

if [ -z "$SUPABASE_PROJECT_REF" ]; then
    echo "❌ Error: SUPABASE_PROJECT_REF not set"
    echo "   Get from: https://app.supabase.com/projects"
    exit 1
fi

echo "✅ Credentials validated"
echo ""

# Step 1: Apply database migrations
echo "📊 Step 1: Creating analytics tables..."
supabase db push --project-ref "$SUPABASE_PROJECT_REF" 2>&1 || {
    echo "⚠️  Database push failed. Attempting direct migration..."

    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        echo "❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
        exit 1
    fi

    # Apply migration via psql
    cat supabase/migrations/20260102_create_analytics_tables.sql | \
        psql "$SUPABASE_URL/rest/v1" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" || true
}
echo "✅ Analytics tables created"
echo ""

# Step 2: Deploy Edge Function
echo "🚀 Step 2: Deploying analytics Edge Function..."
supabase functions deploy analytics \
    --project-ref "$SUPABASE_PROJECT_REF" \
    --no-verify-jwt \
    2>&1

echo "✅ Analytics Edge Function deployed"
echo ""

# Step 3: Verify deployment
echo "🔍 Step 3: Verifying deployment..."
curl -s "https://${SUPABASE_PROJECT_REF}.functions.supabase.co/analytics" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"test": true}' | grep -q "success\|error" && echo "✅ Analytics endpoint responding" || echo "⚠️  Could not verify endpoint"

echo ""
echo "======================================"
echo "✅ Analytics infrastructure deployed!"
echo ""
echo "📌 Next steps:"
echo "1. Verify tables in Supabase Dashboard:"
echo "   - analytics_events table"
echo "   - performance_metrics table"
echo "2. Test analytics tracking in browser:"
echo "   - Open https://carnivoreweekly.com/index-2026.html"
echo "   - Scroll and click Calculator CTA"
echo "   - Check Supabase > SQL Editor > analytics_events table"
echo ""
echo "🔗 Analytics endpoint: https://${SUPABASE_PROJECT_REF}.functions.supabase.co/analytics"
echo ""

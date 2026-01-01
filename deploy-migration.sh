#!/bin/bash
set -e

echo "🚀 Supabase Database Migration Deployment"
echo "=========================================="
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not installed"
    echo "Install with: npm install -g supabase"
    exit 1
fi

echo "✓ Supabase CLI found"
echo ""

# Check if authenticated
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not authenticated with Supabase"
    echo "Run: supabase login"
    echo "Then run this script again"
    exit 1
fi

echo "✓ Authenticated with Supabase"
echo ""

# Verify we're in the right directory
if [ ! -f "supabase/migrations/20250101120000_create_report_system.sql" ]; then
    echo "❌ Migration file not found"
    echo "Make sure you're in the carnivore-weekly directory"
    exit 1
fi

echo "✓ Migration file found"
echo ""

# Link project if not already linked
echo "Linking Supabase project..."
supabase link --project-ref kwtdpvnjewtahuxjyltn || echo "Already linked"
echo ""

# Deploy migration
echo "📦 Deploying migration..."
echo ""
supabase db push

echo ""
echo "✅ Migration deployed successfully!"
echo ""
echo "Tables created:"
echo "  • user_sessions - User session tracking"
echo "  • generated_reports - Report storage"
echo "  • report_access_log - Analytics"
echo ""
echo "Next steps:"
echo "  1. Deploy Supabase edge function:"
echo "     supabase functions deploy cleanup-expired-reports"
echo ""
echo "  2. Schedule daily cleanup cron job in Supabase Dashboard"
echo ""
echo "  3. Get Resend API key from: https://resend.com/settings/api-keys"
echo ""
echo "  4. Deploy with:"
echo "     wrangler secret put RESEND_API_KEY --env production"
echo "     wrangler deploy --env production"
echo ""

#!/bin/bash
#
# AUTONOMOUS BLOG GENERATION - ONE-COMMAND PIPELINE
#
# This script is the entry point for autonomous weekly content generation.
# It orchestrates the full Supabase-powered writer agent pipeline.
#
# Usage:
#   ./scripts/autonomous_blog_generation.sh [batch_size]
#
# Examples:
#   ./scripts/autonomous_blog_generation.sh           # Generate 5 posts
#   ./scripts/autonomous_blog_generation.sh 15        # Generate 15 posts (Batch 2)
#
# What happens:
#   1. Chloe researches trending topics → blog_topics_queue.json
#   2. Leo fetches Pre-Flight context from Supabase
#   3. All 3 writers generate content in parallel (swarm)
#   4. Leo saves to Supabase (Post-Flight)
#   5. HTML generation via generate_blog_pages.py
#   6. Validation (Wall 1 + final checks)
#   7. Regenerate sitemap, blog index, homepage
#   8. Git commit and push
#
# Invoked by: "Generate this week's blog content" in Claude Code
#

set -e  # Exit on error

# Default batch size
BATCH_SIZE=${1:-5}

echo "=============================================================================="
echo "CARNIVORE WEEKLY - AUTONOMOUS CONTENT GENERATION"
echo "=============================================================================="
echo "Batch size: $BATCH_SIZE posts"
echo "Pipeline: Supabase-powered writer agents (Sarah, Chloe, Marcus)"
echo "=============================================================================="
echo ""

# Change to project root
cd "$(dirname "$0")/.."

# Check dependencies
echo "🔍 Checking dependencies..."
python3 -c "from supabase import create_client" 2>/dev/null || {
    echo "❌ Supabase SDK not found. Install: pip install supabase"
    exit 1
}

python3 -c "from scripts.fetch_writer_context import fetch_writer_context" 2>/dev/null || {
    echo "❌ fetch_writer_context.py not found"
    exit 1
}

echo "✅ Dependencies OK"
echo ""

# Run the pipeline
echo "🚀 Launching autonomous pipeline..."
echo ""

python3 scripts/generate_weekly_content.py --batch-size "$BATCH_SIZE"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "=============================================================================="
    echo "✅ AUTONOMOUS GENERATION COMPLETE"
    echo "=============================================================================="
    echo "Generated: $BATCH_SIZE blog posts"
    echo "Writers: Sarah, Chloe, Marcus (parallel swarm)"
    echo "Validation: Passed (Wall 1 + final checks)"
    echo "Deployment: Committed and pushed to production"
    echo "=============================================================================="
else
    echo ""
    echo "=============================================================================="
    echo "❌ PIPELINE FAILED"
    echo "=============================================================================="
    echo "Check logs for details"
    echo "=============================================================================="
fi

exit $EXIT_CODE

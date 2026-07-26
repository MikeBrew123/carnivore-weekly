#!/bin/bash
# Carnivore Weekly — Weekly Agent Run
# Replaces run_weekly_update.sh
# One YouTube API call. One Reddit scrape. One agent does all AI work.

set -e
cd "$(dirname "$0")/.."

echo "======================================================================"
echo "🥩 CARNIVORE WEEKLY — WEEKLY AGENT RUN"
echo "Started: $(date)"
echo "======================================================================"

# ── Data Collection (external APIs) ──────────────────────────────────────
echo ""
echo "📺 Step 1/4: Collecting YouTube data..."
if ! python3 scripts/youtube_collector.py; then
    echo "❌ YouTube collection failed — aborting. Site not updated."
    exit 1
fi

echo ""
echo "🗣️  Step 2/4: Collecting Reddit data..."
if ! python3 scripts/reddit_collector.py; then
    echo "⚠️  Reddit collection failed (non-fatal — agent will work from YouTube only)"
fi

# ── Agent does all AI work ────────────────────────────────────────────────
echo ""
echo "🤖 Step 3/4: Running weekly agent (all AI analysis)..."
claude --print \
    --allowedTools "Read,Write,Bash,mcp__supabase__execute_sql" \
    --max-turns 30 \
    < scripts/weekly_agent_prompt.md

# ── Pure rendering (no AI) ────────────────────────────────────────────────
echo ""
echo "🔧 Step 4/4: Building site..."

python3 scripts/extract_wiki_keywords.py
python3 scripts/generate_blog_pages.py --site cw
python3 scripts/sync_blog_posts_to_supabase.py || echo "⚠️  Supabase sync failed (non-fatal)"

python3 scripts/generate.py --type pages --site cw
python3 scripts/generate.py --type archive --site cw
python3 scripts/generate.py --type channels --site cw
python3 scripts/generate.py --type wiki --site cw
python3 scripts/generate.py --type newsletter --site cw

# No root copy step: GitHub Pages publishes ./public, so root copies were
# never served (see deploy.yml).

# ── Deploy ────────────────────────────────────────────────────────────────
echo ""
echo "🚀 Deploying to carnivoreweekly.com..."
git add .
git commit -m "Weekly update - $(date +%Y-%m-%d)"
git push

echo ""
echo "======================================================================"
echo "✅ DONE — carnivoreweekly.com is live"
echo "Finished: $(date)"
echo "======================================================================"

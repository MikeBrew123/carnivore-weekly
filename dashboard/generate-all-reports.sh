#!/bin/bash
# Generate all analytics reports for Carnivore Weekly
# Run this script to get a complete analytics overview

set -e  # Exit on any error

echo "======================================================================"
echo "📊 CARNIVORE WEEKLY - ANALYTICS REPORTS"
echo "======================================================================"
echo ""

cd "$(dirname "$0")"

# Check if GA credentials exist
if [ ! -f "./ga4-credentials.json" ]; then
    echo "❌ Error: ga4-credentials.json not found in dashboard/"
    echo "   Please add your Google Analytics credentials first."
    exit 1
fi

echo "📈 Generating reports (this may take 30-60 seconds)..."
echo ""

# Report 1: Site Overview
echo "1/4 📊 Site Overview (traffic, top pages, sources)..."
node site-overview-report.js
echo "   ✅ site-overview-report.html"
echo ""

# Report 2: Calculator Funnel
echo "2/4 🧮 Calculator Funnel (conversion analysis)..."
node calculator-funnel-report.js
echo "   ✅ calculator-funnel-report.html"
echo ""

# Report 3: Wiki Search Analysis
echo "3/4 🔍 Wiki Search Analysis (content gaps)..."
node wiki-search-report.js
echo "   ✅ wiki-search-report.html"
echo ""

# Report 4: Engagement Tracking
echo "4/4 🔗 Engagement Tracking (links, scroll depth)..."
node engagement-tracking-report.js
echo "   ✅ engagement-tracking-report.html"
echo ""

# Report 5: Weekly Report (all-in-one: GA4 + Calculator + Newsletters + Drip + Coach + KD)
echo "5/5 📋 Weekly Report (all-in-one dashboard)..."
node weekly-report.js
echo "   ✅ weekly-report.html"
echo ""

echo "======================================================================"
echo "✅ ALL REPORTS GENERATED!"
echo "======================================================================"
echo ""
echo "📁 Reports saved to dashboard/"
echo ""
echo "View reports:"
echo "  • open dashboard/weekly-report.html          ← START HERE (all-in-one)"
echo "  • open dashboard/site-overview-report.html"
echo "  • open dashboard/calculator-funnel-report.html"
echo "  • open dashboard/wiki-search-report.html"
echo "  • open dashboard/engagement-tracking-report.html"
echo ""
echo "Or run: open dashboard/*.html"
echo ""

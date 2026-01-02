#!/bin/bash

# RESTORE FULL HOMEPAGE SCRIPT
# Run this after YouTube API quota is approved and data is collected
# This swaps the full homepage back into place

set -e  # Exit on error

echo "========================================================================"
echo "🔄 RESTORING FULL CARNIVORE WEEKLY HOMEPAGE"
echo "========================================================================"
echo ""

# Check if quota is restored by trying a test API call
echo "1️⃣  Checking YouTube API quota status..."
if python3 scripts/youtube_collector.py > /dev/null 2>&1; then
    echo "   ✅ YouTube API quota appears to be available"
else
    echo "   ⚠️  YouTube API may still be quota-limited"
    echo "   ℹ️  Check: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas"
    read -p "   Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "   ❌ Restoration cancelled"
        exit 1
    fi
fi

echo ""
echo "2️⃣  Backing up current temporary page..."
if [ -f public/index.html ]; then
    cp public/index.html public/index-temporary-backup.html
    echo "   ✅ Saved: public/index-temporary-backup.html"
else
    echo "   ⚠️  public/index.html not found (unexpected)"
fi

echo ""
echo "3️⃣  Restoring full homepage..."
if [ -f public/index-full.html ]; then
    cp public/index-full.html public/index.html
    echo "   ✅ Restored: public/index.html"
else
    echo "   ❌ ERROR: public/index-full.html not found!"
    echo "   Cannot restore full page - backup missing"
    exit 1
fi

echo ""
echo "4️⃣  Verifying restoration..."
if grep -q "Prime Cuts" public/index.html; then
    echo "   ✅ Full page confirmed (Prime Cuts section found)"
else
    echo "   ⚠️  Warning: Prime Cuts section not found in restored page"
fi

echo ""
echo "========================================================================"
echo "✅ RESTORATION COMPLETE"
echo "========================================================================"
echo ""
echo "Next steps:"
echo "1. Check homepage: https://carnivoreweekly.com"
echo "2. Verify Prime Cuts, trending topics, and community voice are visible"
echo "3. If issues occur, revert with: cp public/index-temporary-backup.html public/index.html"
echo ""

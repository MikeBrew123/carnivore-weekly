#!/bin/bash

# Emergency Rollback Script for 2026 Design Deployment
# Usage: ./ROLLBACK.sh

echo "🚨 ROLLING BACK 2026 DESIGN TO PREVIOUS VERSION"
echo "=================================================="
echo ""

# Restore from backups
echo "Restoring previous homepage..."
cp /Users/mbrew/Developer/carnivore-weekly/backups/index.html.backup /Users/mbrew/Developer/carnivore-weekly/public/index.html
cp /Users/mbrew/Developer/carnivore-weekly/backups/style.css.backup /Users/mbrew/Developer/carnivore-weekly/public/style.css

echo "✅ Files restored from backup"
echo ""

# Commit rollback
echo "Committing rollback to git..."
git add public/index.html public/style.css
git commit -m "Rollback: Revert 2026 design to previous homepage version

Reverted files:
- public/index.html (previous version)
- public/style.css (previous version)

To restore 2026 design later:
git revert <commit-hash-of-2026-deployment>"

echo ""
echo "Pushing to production..."
git push origin main

echo ""
echo "✅ ROLLBACK COMPLETE"
echo ""
echo "Site has been reverted to previous design."
echo "GitHub Pages will update within 1-2 minutes."
echo ""
echo "To view the backup files:"
echo "  - Old index.html: backups/index.html.backup"
echo "  - Old style.css: backups/style.css.backup"

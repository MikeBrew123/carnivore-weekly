#!/bin/bash
# Carnivore Weekly - Complete Update Workflow
# Run this script weekly to update your site with fresh content
#
# IMPORTANT: This workflow includes validation steps:
# - Python code quality checks (flake8)
# - Content validation (before publishing)
# - See VALIDATION_CHECKLIST.md for manual review steps

set -e  # Exit on any error

echo "======================================================================"
echo "🥩 CARNIVORE WEEKLY - WEEKLY UPDATE WORKFLOW"
echo "======================================================================"
echo ""

# Pre-flight checks
echo "🔍 Pre-flight checks..."
echo "   Checking Python code quality..."
python3 -m flake8 scripts/ --count --statistics || {
    echo "   ⚠️  Python code quality issues found (see above)"
    echo "   Continuing anyway (non-critical issues)..."
}
echo "   ✓ Python code quality check complete"
echo ""

# Check JavaScript quality if ESLint is available
if command -v npx &> /dev/null; then
    echo "   Checking JavaScript code quality..."
    if [ -f "api/.eslintrc.json" ]; then
        (cd api && npx eslint *.js --max-warnings=10 2>/dev/null) || {
            echo "   ⚠️  JavaScript code quality issues found"
            echo "   Fix with: cd api && npm run lint:fix"
            echo "   Continuing anyway (non-critical issues)..."
        }
        echo "   ✓ JavaScript code quality check complete"
    fi
fi
echo ""

# Step 1: Collect YouTube Data
echo "📺 Step 1/5: Collecting YouTube data..."
python3 scripts/youtube_collector.py
echo "✓ YouTube data collected"
echo ""

# Step 2: Analyze Content with Claude
echo "🧠 Step 2/5: Analyzing content with Claude AI..."
python3 scripts/content_analyzer.py
echo "✓ Content analyzed"
echo ""

# Step 3: Add Sentiment Analysis
echo "💭 Step 3/5: Adding sentiment analysis..."
python3 scripts/add_sentiment.py
echo "✓ Sentiment analysis complete"
echo ""

# Step 4: Answer Common Questions
echo "❓ Step 4/5: Generating Q&A with scientific citations..."
python3 scripts/answer_questions.py
echo "✓ Q&A generated"
echo ""

# Step 5: Generate Website Pages
echo "🎨 Step 5/6: Generating website..."
python3 scripts/generate_pages.py
echo "✓ Website generated"
echo ""

# Step 6: Generate Archive
echo "📚 Step 6/7: Updating archive..."
python3 scripts/generate_archive.py
echo "✓ Archive updated"
echo ""

# Step 7: Generate Channels Page
echo "📺 Step 7/9: Updating featured channels..."
python3 scripts/generate_channels.py
echo "✓ Channels page updated"
echo ""

# Step 8: Update Wiki with Video Links
echo "🎥 Step 8/9: Updating wiki with featured video links..."
python3 scripts/update_wiki_videos.py
echo "✓ Wiki updated with video links"
echo ""

# Step 9: Generate Newsletter
echo "📧 Step 9/9: Generating newsletter..."
python3 scripts/generate_newsletter.py
echo "✓ Newsletter generated"
echo ""

# Copy to root for GitHub Pages
cp public/index.html index.html
cp public/archive.html archive.html 2>/dev/null || true
cp public/channels.html channels.html 2>/dev/null || true
cp -r public/images images/ 2>/dev/null || true
cp -r public/archive archive/ 2>/dev/null || true
cp public/favicon.ico favicon.ico 2>/dev/null || true
echo "✓ Copied to root directory"
echo ""

echo "======================================================================"
echo "✅ WEEKLY UPDATE COMPLETE!"
echo "======================================================================"
echo ""
echo "⚠️  VALIDATION REQUIRED BEFORE PUBLISHING:"
echo ""
echo "You MUST run content validation before deploying:"
echo ""
echo "1. Copy-Editor Validation:"
echo "   /copy-editor"
echo "   - Check for AI patterns, sentence structure, readability"
echo "   - Fix any issues found"
echo ""
echo "2. Brand Compliance Validation:"
echo "   /carnivore-brand"
echo "   - Verify persona authenticity, voice, evidence-based claims"
echo "   - Fix any issues found"
echo ""
echo "3. Manual Review:"
echo "   - Read newsletter aloud (should sound like a real person)"
echo "   - Check for specific examples (not generic statements)"
echo "   - Verify persona signatures are correct"
echo ""
echo "See VALIDATION_CHECKLIST.md for complete validation process."
echo ""
echo "Next steps after validation:"
echo "1. Review the generated site: open public/index.html"
echo "2. If validation PASSED, deploy with:"
echo "   git add ."
echo "   git commit -m 'Weekly content update - $(date +%Y-%m-%d)'"
echo "   git push"
echo ""
echo "Your site will be live at carnivoreweekly.com in ~1 minute!"
echo ""

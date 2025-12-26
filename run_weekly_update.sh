#!/bin/bash
# Carnivore Weekly - Complete Update Workflow
# Run this script weekly to update your site with fresh content

set -e  # Exit on any error

echo "======================================================================"
echo "🥩 CARNIVORE WEEKLY - WEEKLY UPDATE WORKFLOW"
echo "======================================================================"
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
echo "🎨 Step 5/5: Generating website..."
python3 scripts/generate_pages.py
echo "✓ Website generated"
echo ""

# Copy to root for GitHub Pages
cp public/index.html index.html
echo "✓ Copied to root directory"
echo ""

echo "======================================================================"
echo "✅ WEEKLY UPDATE COMPLETE!"
echo "======================================================================"
echo ""
echo "Next steps:"
echo "1. Review the generated site: open public/index.html"
echo "2. If satisfied, deploy with:"
echo "   git add ."
echo "   git commit -m 'Weekly content update - $(date +%Y-%m-%d)'"
echo "   git push"
echo ""
echo "Your site will be live at carnivoreweekly.com in ~1 minute!"
echo ""

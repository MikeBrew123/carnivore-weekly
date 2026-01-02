# Carnivore Weekly - Workflow Guide

## Overview
This guide explains how to run weekly updates and what persists vs what regenerates.

---

## Quick Start - Weekly Updates

**Run the complete workflow:**
```bash
./run_weekly_update.sh
```

**Then deploy:**
```bash
git add .
git commit -m "Weekly content update - $(date +%Y-%m-%d)"
git push
```

Your site will be live at **carnivoreweekly.com** in ~1 minute!

---

## What PERSISTS (Stays Permanent)

These are in the **template** and will survive every regeneration:

### ✅ Persistent Elements in `templates/index_template.html`:

1. **Impact.com Verification Meta Tag** (Line 6)
   ```html
   <meta name='impact-site-verification' value='165bca80-d4fc-46f0-8717-1c7589c6e98c'>
   ```
   - Required for ButcherBox affiliate verification
   - Stays in template permanently
   - Will be in every regenerated page

2. **Amazon Affiliate Link** (Line ~891)
   ```html
   <a href="https://amzn.to/4pYLqZx" class="ad-link" target="_blank" rel="noopener">
   ```
   - Your cookware affiliate link
   - Persists across all updates

3. **Placeholder Affiliate Links** (Lines ~684, ~790)
   ```html
   <!-- Premium Sponsor Banner -->
   <a href="#" class="sponsor-cta">Get $20 Off Your First Box</a>

   <!-- Inline Ad 1 - Electrolytes -->
   <a href="#" class="ad-link">Try LMNT Risk-Free →</a>
   ```
   - Ready for ButcherBox and LMNT links
   - Update once approved, then they persist

4. **All Styling & Design**
   - Leather theme colors
   - Ad placements
   - Layout and fonts
   - Medical disclaimer

---

## What REGENERATES (Updates Weekly)

These come from **data/analyzed_content.json** and change each week:

### 🔄 Dynamic Content:

1. **Weekly Summary** - New AI-generated overview each week
2. **Trending Topics** - Current discussions in carnivore community
3. **Top Videos** - This week's most viewed/discussed videos
4. **Key Insights** - Fresh insights from this week's content
5. **Community Sentiment** - Current mood and questions
6. **Success Stories** - New testimonials from comments
7. **Q&A Section** - Updated common questions with citations
8. **Recommended Watching** - This week's must-watch videos
9. **Date Stamp** - "Week of [current date]"

---

## The Complete Workflow

### Step-by-Step Process:

**1. Collect YouTube Data** (`youtube_collector.py`)
   - Searches YouTube for carnivore videos from past 7 days
   - Ranks top creators by views
   - Collects video stats and comments
   - Output: `data/youtube_data.json`

**2. Analyze Content** (`content_analyzer.py`)
   - Uses Claude Sonnet to analyze all videos
   - Identifies trending topics
   - Highlights top videos
   - Generates insights
   - Output: Updates `data/analyzed_content.json`

**3. Add Sentiment** (`add_sentiment.py`)
   - Uses Claude Haiku (cost-effective) to analyze comment sentiment
   - Adds positive/negative/neutral percentages
   - Output: Updates `data/analyzed_content.json`

**4. Generate Q&A** (`answer_questions.py`)
   - Uses Claude Haiku to answer common questions
   - Finds scientific citations (PubMed)
   - Adds evidence-based answers
   - Output: Updates `data/analyzed_content.json`

**5. Generate Pages** (`generate_pages.py`)
   - Reads `templates/index_template.html`
   - Injects data from `analyzed_content.json`
   - Renders final HTML
   - Output: `public/index.html`

**6. Deploy**
   - Copy to root: `cp public/index.html index.html`
   - Commit and push to GitHub
   - GitHub Pages updates carnivoreweekly.com

---

## Adding New Affiliate Links

When you get approved for new affiliate programs:

### ButcherBox (When Approved):

**Edit:** `templates/index_template.html` (around line 684)

**Replace:**
```html
<a href="#" class="sponsor-cta">Get $20 Off Your First Box</a>
```

**With:**
```html
<a href="YOUR_BUTCHERBOX_LINK" class="sponsor-cta" target="_blank" rel="noopener">Get $20 Off Your First Box</a>
```

**Then:**
```bash
python3 scripts/generate_pages.py
cp public/index.html index.html
git add .
git commit -m "Add ButcherBox affiliate link"
git push
```

### LMNT (When Approved):

**Edit:** `templates/index_template.html` (around line 790)

**Replace:**
```html
<a href="#" class="ad-link">Try LMNT Risk-Free →</a>
```

**With:**
```html
<a href="YOUR_LMNT_LINK" class="ad-link" target="_blank" rel="noopener">Try LMNT Risk-Free →</a>
```

**Same deployment steps as above.**

---

## Verification Checklist

Before each deploy, verify:

- ✅ Impact verification meta tag is in template
- ✅ Amazon affiliate link is active
- ✅ All affiliate links have `target="_blank"` and `rel="noopener"`
- ✅ New content looks good in `public/index.html`
- ✅ No API keys in committed files (check .gitignore)

---

## Cost Per Update

**Estimated API costs per weekly run:**

- YouTube Data API: **Free** (well within quota)
- Claude Sonnet (content analysis): **~$0.05-0.10**
- Claude Haiku (sentiment + Q&A): **~$0.02-0.05**

**Total per week: ~$0.07-0.15**

**Annual cost: ~$3.60-7.80**

---

## Troubleshooting

**If affiliate links don't persist:**
- Check that you edited the **template** (`templates/index_template.html`)
- NOT the generated file (`public/index.html` or `index.html`)
- Template changes persist, generated file changes don't

**If meta tag disappears:**
- Same as above - must be in template
- Currently at line 6 in template ✅

**If workflow fails:**
- Check API keys in `.env` file
- Ensure all Python packages installed: `pip3 install -r requirements.txt`
- Check API quotas (YouTube: 10,000 units/day)

---

## Future Automation

**GitHub Actions (requires token with workflow scope):**

Once you have a token with the `workflow` scope, you can enable automatic weekly updates:

1. The workflow file is already created: `.github/workflows/weekly-update.yml`
2. Add secrets to GitHub:
   - `YOUTUBE_API_KEY`
   - `ANTHROPIC_API_KEY`
3. Workflow runs every Monday at 10 AM UTC
4. Site updates automatically without manual intervention

**For now:** Run `./run_weekly_update.sh` manually each week.

---

## Summary

**Persistent (in template):**
- ✅ Impact verification meta tag
- ✅ Amazon affiliate link
- ✅ All design/styling
- ✅ Ad placements structure

**Regenerates (from data):**
- 🔄 All content sections
- 🔄 Video links
- 🔄 Community insights
- 🔄 Q&A

**Workflow:**
1. Run `./run_weekly_update.sh`
2. Review output
3. Deploy with git

**Your affiliate links are safe and will persist through every update!** ✅

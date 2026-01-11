# How Carnivore Weekly Site Generation Works

**Last Updated:** January 11, 2026
**Status:** Active & Production-Ready

---

## TL;DR - The Golden Rules

1. **NEVER edit `public/index.html` or `public/channels.html` directly** - They get overwritten by automation
2. **ALWAYS edit `templates/index_template.html` and `templates/channels_template.html`** - These are the source files
3. **Static pages are safe to edit** - `calculator.html`, `wiki.html`, `blog/*.html` are NOT generated
4. **Automation runs weekly** - Sundays at midnight UTC via GitHub Actions, or manually with `run_weekly_update.sh`

---

## What Gets Generated vs What's Static

### Generated Pages (DO NOT EDIT - Changes will be overwritten)

These files are **generated from templates** by `scripts/generate.py`:

| File | Template Source | When Regenerated | Safe to Edit? |
|------|----------------|------------------|---------------|
| `public/index.html` | `templates/index_template.html` | Weekly automation | ❌ NO |
| `public/channels.html` | `templates/channels_template.html` | Weekly automation | ❌ NO |
| `public/archive.html` | `templates/archive_template.html` | Weekly automation | ❌ NO |
| `public/archive/*.html` | `templates/index_template.html` | Weekly automation | ❌ NO |
| `newsletters/latest.html` | `templates/newsletter_template.html` | Weekly automation | ❌ NO |

**If you need to change these pages, edit the TEMPLATE files, not the generated output.**

### Static Pages (SAFE TO EDIT - Never overwritten)

These files are **manually maintained**:

| File | Purpose | Safe to Edit? |
|------|---------|---------------|
| `public/calculator.html` | Macro calculator tool | ✅ YES |
| `public/wiki.html` | Protocols & basics guide | ✅ YES |
| `public/blog.html` | Blog index page | ✅ YES |
| `public/blog/*.html` | Individual blog posts | ✅ YES |
| `public/about.html` | About page | ✅ YES |
| `public/privacy.html` | Privacy policy | ✅ YES |

---

## The Weekly Automation Workflow

### Trigger

**Automatic:** Every Sunday at midnight UTC via `.github/workflows/weekly-update.yml`
**Manual:** Run `./run_weekly_update.sh` locally

### Steps (in order)

1. **Pre-flight Validation** (BLOCKING)
   - Python linting (flake8)
   - Python formatting (black)
   - Template structure validation
   - W3C HTML validation (informational)

2. **YouTube Data Collection**
   - `scripts/youtube_collector.py`
   - Fetches videos from top 10 carnivore creators
   - Saves to `data/youtube_data.json`

3. **Content Analysis**
   - `scripts/content_analyzer_optimized.py`
   - Claude AI analyzes videos/comments
   - 98% token optimization (saves $$$)
   - Saves to `data/analyzed_content.json`

4. **Sentiment Analysis**
   - `scripts/add_sentiment.py`
   - Analyzes comment sentiment
   - Adds to analyzed_content.json

5. **Q&A Generation**
   - `scripts/answer_questions.py`
   - Generates FAQ content with citations
   - Adds to analyzed_content.json

6. **Wiki Keywords Extraction**
   - `scripts/extract_wiki_keywords.py`
   - Extracts keywords for auto-linking
   - Saves to `data/wiki_keywords.json`

7. **Page Generation** (THE CRITICAL PART)
   - `scripts/generate.py --type pages` → Generates `public/index.html` from `templates/index_template.html`
   - `scripts/generate.py --type archive` → Generates `public/archive.html`
   - `scripts/generate.py --type channels` → Generates `public/channels.html` from `templates/channels_template.html`
   - `scripts/generate.py --type wiki` → Updates wiki video links
   - `scripts/generate.py --type newsletter` → Generates newsletter

8. **Structural Validation** (BLOCKING)
   - Validates generated pages
   - Checks for critical structural issues
   - Fails if pages are broken

9. **Copy to Root** (GitHub Pages compatibility)
   - Copies `public/index.html` → `index.html`
   - Copies `public/channels.html` → `channels.html`
   - Copies assets to root

### What Gets Committed

**GitHub Actions:**
- ❌ Does NOT auto-commit generated pages
- ✅ Only commits `data/youtube_data.json`

**Local run:**
- ❌ Does NOT auto-commit
- ✅ Shows instructions to manually commit after validation

**Result:** You maintain control over what gets deployed.

---

## How Templates Work

### Templates Use Jinja2

Templates are HTML files with **Jinja2 template variables** that get replaced with real data during generation.

**Example from `templates/index_template.html`:**

```html
<!-- Static content (stays as-is) -->
<h2 class="hero-title">Your Weekly Carnivore Intelligence</h2>

<!-- Dynamic content (replaced with data) -->
<p class="update-date">Week of {{ analysis_date }}</p>

<!-- Loops (repeat for each item) -->
{% for video in top_videos %}
  <h3>{{ video.title }}</h3>
  <p>{{ video.summary }}</p>
{% endfor %}
```

**After generation (in `public/index.html`):**

```html
<h2 class="hero-title">Your Weekly Carnivore Intelligence</h2>
<p class="update-date">Week of January 9, 2026</p>

<h3>How Many Pints is TOO Many?</h3>
<p>Discussion about carnivore diet and alcohol consumption...</p>

<h3>The Truth About Cholesterol on Carnivore</h3>
<p>Evidence-based analysis of cholesterol levels...</p>
```

### Key Template Variables

**Scalar Variables:**
- `{{ analysis_date }}` - Week date (e.g., "January 9, 2026")
- `{{ generation_timestamp }}` - When page was generated
- `{{ weekly_summary }}` - Chloe's roundup text (markdown)
- `{{ total_videos }}`, `{{ total_creators }}` - Counts

**Arrays/Loops:**
- `{% for video in top_videos %}` - Featured videos
- `{% for topic in trending_topics %}` - Trending topic tags
- `{% for insight in key_insights %}` - Key insights cards
- `{% for qa in qa_section %}` - FAQ items

**Data Sources:**
- All data comes from `data/analyzed_content.json`
- Generated by content analysis pipeline
- Refreshed weekly

---

## Configuration

All automation settings are in `config/project.json`:

```json
{
  "generation": {
    "template_mappings": {
      "pages": {
        "template": "index_template.html",
        "input": "data/analyzed_content.json",
        "output": "public/index.html"
      },
      "channels": {
        "template": "channels_template.html",
        "input": "data/analyzed_content.json",
        "output": "public/channels.html"
      }
    }
  }
}
```

**Want to change which template generates which page?** Edit `config/project.json`.

---

## Common Workflows

### Scenario 1: Update Homepage Design

**WRONG:**
```bash
# ❌ DON'T DO THIS
vim public/index.html  # Your changes will be overwritten!
```

**RIGHT:**
```bash
# ✅ DO THIS
vim templates/index_template.html  # Edit the template
./run_weekly_update.sh              # Test generation locally
git add templates/index_template.html
git commit -m "Update homepage hero section"
git push
```

### Scenario 2: Add New Section to Homepage

**Steps:**
1. Edit `templates/index_template.html`
2. Add your new HTML section
3. If it needs dynamic data, use Jinja2 variables
4. Test generation locally: `./run_weekly_update.sh`
5. Check `public/index.html` - does it look right?
6. Commit the template changes

**Example - Adding a "Featured Products" section:**

```html
<!-- Add to templates/index_template.html -->
<section class="featured-products">
  <h2>Featured Products</h2>
  {% for product in featured_products %}
  <div class="product-card">
    <h3>{{ product.name }}</h3>
    <p>{{ product.description }}</p>
    <a href="{{ product.link }}">Shop Now</a>
  </div>
  {% endfor %}
</section>
```

Then update `scripts/content_analyzer_optimized.py` to generate `featured_products` data.

### Scenario 3: Fix a Bug on Calculator Page

**EASY:**
```bash
# ✅ This page is NOT generated - edit directly
vim public/calculator.html
git add public/calculator.html
git commit -m "Fix calculator mobile layout"
git push
```

### Scenario 4: Test Automation Without Breaking Production

```bash
# Run automation locally
./run_weekly_update.sh

# Check generated pages
open public/index.html
open public/channels.html

# If good → commit
git add public/index.html public/channels.html
git commit -m "Weekly content refresh - $(date +%Y-%m-%d)"
git push

# If bad → revert
git checkout public/index.html public/channels.html
```

---

## Troubleshooting

### "Automation overwrote my changes!"

**Cause:** You edited `public/index.html` or `public/channels.html` directly instead of the template.

**Fix:**
1. Revert to last good commit: `git checkout HEAD~1 -- public/index.html`
2. Make changes in `templates/index_template.html` instead
3. Regenerate: `./run_weekly_update.sh`

### "Template changes aren't showing up"

**Cause:** Template cache or wrong template being used.

**Fix:**
1. Check `config/project.json` - is the right template mapped?
2. Delete generated file: `rm public/index.html`
3. Regenerate: `python3 scripts/generate.py --type pages`
4. Check `public/index.html` for your changes

### "Validation failed - cannot deploy"

**Cause:** Generated pages have structural issues (missing nav, header, etc.).

**Common Culprits:**
- Missing closing tags in template
- Broken Jinja2 syntax (`{% for` without `{% endfor %}`)
- Data missing from `analyzed_content.json`

**Fix:**
1. Check validation output: It tells you which file and which rule failed
2. Inspect the generated file: `open public/index.html`
3. Fix template: `templates/index_template.html`
4. Regenerate and revalidate

### "New template doesn't match data structure"

**Cause:** You added a Jinja2 variable that doesn't exist in `data/analyzed_content.json`.

**Example:**
```html
<!-- Template uses variable that doesn't exist -->
{{ video.thumbnail_hd }}  <!-- ❌ Field doesn't exist in data -->
```

**Fix:**
1. Check `data/analyzed_content.json` - what fields exist?
2. Use correct field name: `{{ video.thumbnail_url }}`
3. OR update `scripts/content_analyzer_optimized.py` to add the new field

---

## File Structure Reference

```
carnivore-weekly/
├── templates/                    # SOURCE OF TRUTH for generated pages
│   ├── index_template.html       # Homepage template (✅ Edit this)
│   ├── channels_template.html    # Channels page template (✅ Edit this)
│   ├── archive_template.html     # Archive index template
│   └── newsletter_template.html  # Newsletter template
│
├── public/                       # OUTPUT (some generated, some static)
│   ├── index.html                # ❌ Generated - DO NOT EDIT
│   ├── channels.html             # ❌ Generated - DO NOT EDIT
│   ├── archive.html              # ❌ Generated - DO NOT EDIT
│   ├── calculator.html           # ✅ Static - SAFE TO EDIT
│   ├── wiki.html                 # ✅ Static - SAFE TO EDIT
│   ├── blog.html                 # ✅ Static - SAFE TO EDIT
│   └── blog/*.html               # ✅ Static - SAFE TO EDIT
│
├── data/                         # Data files (generated by scripts)
│   ├── youtube_data.json         # Raw YouTube API data
│   ├── analyzed_content.json     # Processed + analyzed content
│   ├── wiki_keywords.json        # Wiki auto-linking keywords
│   └── blog_topics_queue.json    # Chloe's suggested topics
│
├── scripts/                      # Automation scripts
│   ├── generate.py               # Main generator (uses templates)
│   ├── youtube_collector.py      # Fetches YouTube data
│   ├── content_analyzer_optimized.py  # Claude analysis
│   └── validate.py               # Structural validation
│
├── config/
│   └── project.json              # Configuration (template mappings)
│
├── .github/workflows/
│   └── weekly-update.yml         # GitHub Actions automation
│
└── run_weekly_update.sh          # Main automation script
```

---

## Quick Reference Card

| If you want to... | Then edit... | Safe to commit? |
|-------------------|--------------|-----------------|
| Change homepage design | `templates/index_template.html` | ✅ YES |
| Change homepage content | `templates/index_template.html` | ✅ YES |
| Fix calculator bug | `public/calculator.html` | ✅ YES |
| Add blog post | `public/blog/YYYY-MM-DD-slug.html` | ✅ YES |
| Update wiki guide | `public/wiki.html` | ✅ YES |
| Change channels page | `templates/channels_template.html` | ✅ YES |
| Manually refresh content | Run `./run_weekly_update.sh` | ⚠️ Test first |
| Fix homepage urgently | Edit `public/index.html` | ⚠️ TEMPORARY ONLY |

---

## History of This System

**Before (Jan 3, 2026):**
- Templates were outdated (missing 2026 redesign)
- Automation ran → used old templates → broke site
- Had to manually revert changes

**After (Jan 11, 2026):**
- Updated `templates/index_template.html` with 2026 redesign
- Merged Jinja2 variables into redesigned layout
- Automation now preserves redesign when regenerating
- Documentation created (you're reading it!)

**Key Lesson:** Templates are source of truth. Keep them updated with design changes.

---

## Need Help?

**Check these files:**
- `config/project.json` - Template mappings
- `run_weekly_update.sh` - Automation workflow
- `scripts/generate.py` - Generation logic
- `data/analyzed_content.json` - Example data structure

**Or run:**
```bash
python3 scripts/generate.py --help
```

---

**Document Version:** 1.0
**Maintained By:** Quinn (Operations Manager)
**Last Incident:** 2026-01-11 - Automation overwrote redesigned homepage (fixed by updating templates)

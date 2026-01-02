# CARNIVORE WEEKLY - AUDIT TECHNICAL INDEX
## File Locations, Dependencies & Implementation Details

**Related Documents:**
- `TEAM_AUDIT_REPORT_COMPREHENSIVE.md` - Full analysis (7,500+ words)
- `AUDIT_EXECUTIVE_SUMMARY.md` - 5-minute overview

---

## PART 1: CRITICAL FILES & LOCATIONS

### Main Orchestration
| File | Path | Purpose | Called By |
|------|------|---------|-----------|
| Weekly Update | `/run_weekly_update.sh` | Master workflow orchestrator | Manual/cron |
| Config | `/data/config.json` | YouTube channels, settings, API keys | All scripts |
| Personas | `/data/personas.json` | Writer definitions (Sarah, Marcus, Chloe) | Newsletter generator, blog generator |

### Data Pipeline
| Step | Script | Input | Output | Reads Config |
|------|--------|-------|--------|-------------|
| 1 | `youtube_collector.py` | YOUTUBE_API_KEY | `data/youtube_data.json` (4.7 MB) | ✓ |
| 2 | `content_analyzer_optimized.py` | `youtube_data.json` | `data/analyzed_content.json` | ✓ |
| 3 | `add_sentiment.py` | `analyzed_content.json` | Updates sentiment scores | ✓ |
| 4 | `answer_questions.py` | `analyzed_content.json` | Adds Q&A section | ✓ |
| 5 | `extract_wiki_keywords.py` | `public/wiki.html` | `data/wiki-keywords.json` | ✓ |
| 6 | `generate_pages.py` | `analyzed_content.json` + templates | `public/index.html` (145 KB) | ✓ |
| 7 | `generate_archive.py` | `data/archive/*.json` | `public/archive.html` | ✓ |
| 8 | `generate_channels.py` | `youtube_data.json` + templates | `public/channels.html` (62 KB) | ✓ |
| 9 | `update_wiki_videos.py` | `wiki_videos_meta.json` | Updates `public/wiki.html` | ✓ |
| 10 | `generate_newsletter.py` | `analyzed_content.json` + templates | `newsletters/*.txt` + Google Drive | ✓ |

### Blog Generation (Separate from Weekly Workflow)
| Script | Input | Output | Dependencies |
|--------|-------|--------|--------------|
| `generate_blog_posts.js` | `data/blog-topic-product-mapping.json` | `public/blog/*.html` (14 files) | `data/wiki-keywords.json`, `data/wiki_videos_meta.json` |
| `fix-blog-seo.py` | `public/blog/*.html` | Updates H1, meta tags | Path hardcoded to `/Users/mbrew/...` |
| `fix-h1-duplicates.py` | `public/blog/*.html` | Fixes duplicate H1 tags | Path hardcoded to `/Users/mbrew/...` |

### Deployment
| File | Purpose | Called From | Deployed To |
|------|---------|------------|------------|
| `api/generate-report.js` | Analytics edge function | (Cloudflare Workers) | https://api.carnivoreweekly.com |
| `supabase/functions/*.ts` | Database edge functions | Supabase edge network | Database triggers |
| `public/index.html` | Homepage | GitHub Pages | carnivoreweekly.com |
| `run_weekly_update.sh` | Copies to root | Final step | GitHub Pages expects root-level files |

---

## PART 2: HARDCODED PATHS (BREAKING POINTS)

### Critical Hardcoded Paths

#### ⚠️ Path 1: Google Drive Newsletter Sync
**File:** `/scripts/generate_newsletter.py`
**Line:** 24
**Current Code:**
```python
GOOGLE_DRIVE_PATH = Path(
    "/Users/mbrew/Library/CloudStorage/GoogleDrive-iambrew@gmail.com/My Drive/Carnivore Weekly/Newsletters"
)
```

**Issues:**
- Breaks if user account path changes
- Not portable to other machines
- Fails if Google Drive isn't mounted

**Fix:**
```python
import os
GOOGLE_DRIVE_PATH = Path.home() / "Library/CloudStorage/GoogleDrive-iambrew@gmail.com/My Drive/Carnivore Weekly/Newsletters"
# OR (better)
GOOGLE_DRIVE_PATH = Path(os.getenv("GOOGLE_DRIVE_NEWSLETTER_PATH",
    Path.home() / "Library/CloudStorage/GoogleDrive-iambrew@gmail.com/My Drive/Carnivore Weekly/Newsletters"
))
```

---

#### ⚠️ Path 2: Blog SEO Fixes
**File:** `/scripts/fix-blog-seo.py`
**Line:** 17
**Current Code:**
```python
blog_dir = Path("/Users/mbrew/Developer/carnivore-weekly/public/blog")
```

**Issues:**
- Absolute hardcoded path breaks if project moves
- Not portable
- Fails in CI/CD pipelines

**Fix:**
```python
from pathlib import Path
PROJECT_ROOT = Path(__file__).parent.parent
blog_dir = PROJECT_ROOT / "public" / "blog"
```

---

#### ⚠️ Path 3: H1 Duplicates
**File:** `/scripts/fix-h1-duplicates.py`
**Line:** 17
**Current Code:**
```python
blog_dir = Path("/Users/mbrew/Developer/carnivore-weekly/public/blog")
```

**Same fix as Path 2**

---

### Safe Paths (Using PROJECT_ROOT)

These are properly implemented:
```python
# ✓ GOOD - generate_pages.py
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
TEMPLATES_DIR = PROJECT_ROOT / "templates"
PUBLIC_DIR = PROJECT_ROOT / "public"

# ✓ GOOD - youtube_collector.py
PROJECT_ROOT = Path(__file__).parent.parent
OUTPUT_FILE = PROJECT_ROOT / "data" / "youtube_data.json"

# ✓ GOOD - Most scripts follow this pattern
sys.path.insert(0, str(Path(__file__).parent))  # For importing sibling scripts
```

---

## PART 3: SCRIPT DEPENDENCIES & IMPORTS

### Import Chain
```
generate_pages.py
  └─ Imports: auto_link_wiki_keywords.py
      └─ Requires: data/wiki-keywords.json
      └─ Requires: data/blog-topic-product-mapping.json (optional)
```

### Environmental Dependencies
```
YOUTUBE_API_KEY          ← From .env or environment
ANTHROPIC_API_KEY        ← From .env or environment
SUPABASE_URL             ← From .env or environment
SUPABASE_SERVICE_ROLE    ← From .env or environment
NEWS_API_KEY             ← Optional
REDDIT_CLIENT_ID         ← Optional
REDDIT_CLIENT_SECRET     ← Optional
```

### File System Dependencies
```
Data Dependencies:
  data/config.json                    ← Loaded by all scripts
  data/personas.json                  ← Loaded by newsletter generator
  data/youtube_data.json              ← Generated weekly, consumed by analyzer
  data/analyzed_content.json          ← Generated by analyzer, consumed by generators
  data/blog_posts.json                ← Blog metadata
  data/wiki-keywords.json             ← Auto-linking
  data/archive/*.json                 ← Archive generation

Template Dependencies:
  templates/index_template.html        ← Homepage generation
  templates/newsletter_template.html   ← Newsletter generation
  templates/blog_template.html         ← Blog page generation
  templates/partials/*                 ← Included components

Generated Files:
  public/index.html                   ← Homepage
  public/blog/*.html                  ← Individual blog posts
  public/archive.html                 ← Archive page
  public/channels.html                ← Featured channels
  newsletters/*.txt                   ← Email newsletters
```

---

## PART 4: DUPLICATE FILES INVENTORY

### Duplicate #1: Blog Directory
```
/Users/mbrew/Developer/carnivore-weekly/blog/
  └─ 21 HTML files (320 KB total)
  └─ NEVER UPDATED - static copies
  └─ Action: DELETE THIS

/Users/mbrew/Developer/carnivore-weekly/public/blog/
  └─ 14 HTML files (208 KB total)
  └─ ACTIVELY GENERATED by scripts/generate_blog_posts.js
  └─ Action: KEEP THIS
```

**Why they differ:**
- `/blog/` was created manually or from old generation
- `/public/blog/` is current output from automation
- When you run `generate_blog_posts.js`, it only updates `/public/blog/`
- `/blog/` never receives updates

**Recommendation:** Delete `/blog/`, it's entirely redundant

---

### Duplicate #2: Content Analyzers
```
/scripts/content_analyzer.py (21 KB)
  └─ Original version
  └─ Slower, higher token usage
  └─ Action: DELETE

/scripts/content_analyzer_phase2.py (34 KB)
  └─ Experimental version
  └─ Not used in production
  └─ Action: DELETE

/scripts/content_analyzer_optimized.py (8 KB) ← CURRENT
  └─ Latest, fastest, token-optimized
  └─ Actually used in run_weekly_update.sh (line 113)
  └─ Action: KEEP THIS ONLY
```

**Verification:**
Check `/run_weekly_update.sh` line 113:
```bash
python3 scripts/content_analyzer_optimized.py
```

Only this one is called!

---

### Duplicate #3: Deploy Scripts
```
/scripts/deploy_edge_functions.js (52 lines)
  └─ Unclear purpose
  └─ Action: INVESTIGATE then DELETE

/scripts/deploy-edge-functions.js (342 lines) ← CURRENT
  └─ Executable and verbose
  └─ Used for Supabase deployment
  └─ Action: KEEP THIS ONLY
```

**Fix:** Verify which one is actually in use, delete the other

---

### Potential Duplicate #4: Writer Tests
```
/scripts/seed_writer_data.js (18 KB)
  └─ Seeds writer data to Supabase

/scripts/test_sarah_migration.js (17 KB)
  └─ Tests Sarah migration to database
  └─ Possibly overlapping functionality?
```

**Action:** Verify they serve different purposes before deleting

---

## PART 5: DUPLICATE CONFIG/DATA

### Persona Data In 4 Places

#### Source #1: `data/personas.json` (JSON)
```json
{
  "personas": {
    "sarah": { "name": "Sarah", "title": "Health Coach", ... },
    "marcus": { "name": "Marcus", "title": "Performance Coach", ... },
    "chloe": { "name": "Chloe", "title": "Marketing & Community", ... }
  }
}
```

#### Source #2: `agents/sarah.md` (Markdown)
```markdown
# Sarah - The Health Coach
Expert & Empathetic
Struggled for a decade with severe Autoimmune...
```

#### Source #3: `agents/marcus.md` (Markdown)
```markdown
# Marcus - Sales & Partnerships
High Energy & Strategic
Former high-level athlete who hit a wall in his 30s...
```

#### Source #4: `agents/chloe.md` (Markdown)
```markdown
# Chloe - Marketing & Community
Creative & Trend-Obsessed
Dealt with severe skin issues (cystic acne) and PCOS...
```

#### Source #5: `scripts/generate_blog_posts.js` (Hardcoded)
```javascript
const writerProfiles = {
  sarah: {
    name: 'Sarah',
    title: 'Health Coach',
    bio: 'Sarah helps you understand the science...',
    // ... duplicated data
  },
  marcus: {
    // ... duplicated data
  }
};
```

**Problem:** If you update persona in one place, broken in others

**Solution:**
1. Keep `data/personas.json` as source of truth
2. Generate agent markdown from JSON automatically
3. Make `generate_blog_posts.js` import from JSON:
```javascript
const personalities = JSON.parse(
  fs.readFileSync('../data/personas.json', 'utf-8')
).personas;
```

---

## PART 6: CONSOLIDATION OPPORTUNITIES

### Validator Consolidation
```
CURRENT STATE (5 separate scripts):
  scripts/validate_structure.py       (41 KB, comprehensive)
  scripts/validate_before_update.py   (10 KB, lightweight)
  scripts/validate-seo.sh             (4 KB, shell script)
  scripts/validate-brand.sh           (4 KB, shell script)
  scripts/validate-w3c.sh             (6 KB, shell script)

PROPOSED STATE:
  scripts/validate_all.py             (combined, 50 KB)
    ├── StructureValidator class
    ├── SEOValidator class
    ├── BrandValidator class
    ├── W3CValidator class
    └── BeforeUpdateValidator class

USAGE:
  python3 scripts/validate_all.py --checks=structure,seo,brand,w3c
  python3 scripts/validate_all.py --checks=structure  # Just structure
```

---

### Generator Consolidation
```
CURRENT STATE (5 separate scripts):
  scripts/generate_pages.py           (Homepage)
  scripts/generate_blog_pages.py      (Blog pages - legacy)
  scripts/generate_newsletter.py      (Email newsletters)
  scripts/generate_channels.py        (Featured channels)
  scripts/generate_archive.py         (Archive page)

PROPOSED STATE:
  scripts/generate_site.py            (Master generator, 120 KB)
    ├── HomepageGenerator class
    ├── BlogGenerator class
    ├── NewsletterGenerator class
    ├── ChannelsGenerator class
    └── ArchiveGenerator class

USAGE:
  python3 scripts/generate_site.py --pages=homepage,blog,newsletter,channels,archive
  python3 scripts/generate_site.py --pages=homepage  # Just homepage
```

---

## PART 7: DATABASE MIGRATION STEPS

### Current State (All JSON)
```
youtube_collector.py
  └─ Writes: data/youtube_data.json

content_analyzer_optimized.py
  └─ Reads: data/youtube_data.json
  └─ Writes: data/analyzed_content.json

generate_pages.py
  └─ Reads: data/analyzed_content.json
  └─ Writes: public/index.html
```

### After Database Migration
```
youtube_collector.py
  └─ INSERT INTO youtube_videos (via Supabase client)

content_analyzer_optimized.py
  └─ SELECT * FROM youtube_videos
  └─ INSERT INTO trending_topics

generate_pages.py
  └─ SELECT * FROM bento_grid_items WHERE grid_position <= 5
  └─ Writes: public/index.html
```

### Migration Sequence
1. Create tables (migration 012)
2. Create import scripts (new .py files)
3. Run import scripts manually
4. Verify data matches
5. Update generators to read from DB
6. Update collectors to write to DB
7. Archive JSON files

---

## PART 8: FILE SIZE INVENTORY

```
Project Size Breakdown:
├── node_modules/              65 MB   (auto-generated, in .gitignore)
├── dashboard/node_modules/    67 MB   (separate Next.js app, in .gitignore)
├── public/                    65 MB   (website files)
│   ├── images/                31 MB   (image assets)
│   ├── index.html             145 KB  (homepage)
│   ├── blog/                  208 KB  (14 blog posts)
│   └── [other assets]
├── screenshots/               44 MB   (visual QA images)
├── images/                    31 MB   (demo/marketing images)
├── docs/                      728 KB  (documentation)
├── scripts/                   728 KB  (49 source files)
├── data/                      1.2 MB  (critical JSON files)
│   ├── youtube_data.json      4.7 MB  (refreshed weekly)
│   ├── blog_posts.json        28 KB
│   ├── personas.json          5 KB
│   ├── config.json            2 KB
│   └── [other config files]
├── dashboard/                 67 MB   (analytics dashboard)
├── blog/                      320 KB  (DUPLICATE - DELETE)
├── migrations/                104 KB  (database migrations)
├── templates/                 180 KB  (Jinja2 templates)
├── agents/                    364 KB  (agent definitions)
├── supabase/                  56 KB   (edge functions)
└── tests/                     16 MB   (test files + snapshots)

TOTAL (excluding node_modules): ~200 MB
```

---

## PART 9: TESTING COVERAGE

### Test Files
```
Unit Tests:
  tests/test_bento_grid_structure.py    ← Bento grid validation
  tests/test_layout_integration.py       ← Layout system
  tests/test_validate_structure.py       ← Structure validator

Integration Tests:
  tests/visual-regression.spec.js        ← Visual comparison (Playwright)
  tests/post-launch-smoke-tests.js       ← Basic functionality

Jest Tests:
  tests/brand-consistency.test.js        ← Brand validation
  tests/content-validation.test.js       ← Content checks
  tests/accessibility.test.js            ← A11y checks
  tests/performance.test.js              ← Performance benchmarks
```

### Test Infrastructure
```
Jest Config:
  jest.config.js                         ← Jest configuration
  jest.setup.js                          ← Test setup

Playwright Config:
  playwright.config.js                   ← Playwright configuration
  tests/visual-regression.spec.js-snapshots/ ← Visual baselines (5 images)

Reports:
  playwright-report/                     ← Latest test run
  test-results/                          ← Results storage
```

---

## PART 10: SUPABASE CONFIGURATION

### Edge Functions
```
supabase/functions/
├── validate-content/                   ← Validate content before publishing
├── prioritize-topics/                  ← Rank topics by engagement
├── generate-writer-prompt/             ← Generate Claude prompts
├── fetch-research-data/                ← Fetch from APIs
├── research-youtube-trends/            ← YouTube analysis
└── research-reddit-trends/             ← Reddit analysis
```

### Migrations
```
migrations/
├── 001_create_core_tables.sql          ← Basic table structure
├── 002_add_indexes.sql                 ← Performance indexes
├── 003_create_rls_policies.sql         ← Row-level security
├── 004_create_triggers.sql             ← Auto-update triggers
├── 005_create_user_interests_table.sql ← User preferences
├── 006_deploy_edge_functions.sql       ← Edge function deployment
├── 007_create_writer_memory_tables.sql ← Agent memory
├── 008_add_not_null_constraints.sql    ← Data integrity
├── 009_async_batch_processing.sql      ← Async operations
├── 010_rls_hardening_inter_agent_access.sql ← Security
└── 011_create_trending_topics_tables.sql ← Content ranking
```

### Database Health
```
From LEO_SYSTEM_AUDIT_REPORT.md:
  Schema Health: 93% (EXCELLENT)
  RLS Compliance: COMPLIANT

Optimizations Needed:
  ✓ validateContent() latency: 500ms → 50ms
  ✓ generateWriterPrompt() latency: 300ms → 30ms
  ✓ seedWriterData() latency: 5s → 1.5s
  ✓ contentAnalyzer() latency: 6s → 4s

Total Potential Gain: 250-800ms per request cycle
```

---

## SUMMARY REFERENCE TABLE

| Aspect | Current | Issue | Fix | Effort |
|--------|---------|-------|-----|--------|
| **Duplicates** | `/blog/` | Never updated | Delete | 5 min |
| **Duplicates** | 3 analyzers | Confusion | Keep only optimized | 10 min |
| **Hardcoded** | Google Drive | Not portable | Use Path.home() | 5 min |
| **Hardcoded** | Blog paths (2) | Not movable | Use PROJECT_ROOT | 10 min |
| **Config** | Scattered | 4 sources | Unify to JSON | 1 hour |
| **Scripts** | 5 validators | Redundant | 1 validate_all.py | 2 hours |
| **Scripts** | 5 generators | Redundant | 1 generate_site.py | 2 hours |
| **Data** | 6 MB JSON | Slow queries | Move to Supabase | 3-4 weeks |
| **Organization** | Flat | Hard to navigate | Restructure `/src/` | 1 day |

---

**End of Technical Index**

For implementation details, see: `TEAM_AUDIT_REPORT_COMPREHENSIVE.md`

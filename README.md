# Carnivore Weekly

**Your weekly digest of carnivore diet content from YouTube's top creators.**

Automated content curation and analysis powered by AI. Every Monday, fresh carnivore content delivered to carnivoreweekly.com.

---

## What It Does

Carnivore Weekly automatically:
- 📺 **Collects** YouTube videos from top 10 carnivore creators (past 7 days)
- 🧠 **Analyzes** content with Claude AI (summaries, insights, trends)
- 💭 **Adds** sentiment analysis from comments
- ❓ **Generates** Q&A section with scientific citations
- 🌐 **Publishes** to carnivoreweekly.com
- 📚 **Archives** past weeks automatically
- 📊 **Ranks** channels by activity

---

## Live Site

🔗 **https://carnivoreweekly.com**

- **Home** - Current week's roundup
- **Weekly Watch** - Top creators ranked by activity
- **Protocols & Basics (Wiki)** - Carnivore diet fundamentals
- **Insights (Blog)** - Original articles and guides
- **Calculator** - Personalized macro calculator
- **Archive** - Browse past weeks
- **The Lab** - Story and mission

---

## How It Works

### Automated Weekly Workflow

Every Monday (or on-demand):

```bash
./run_weekly_update.sh
```

This runs:
1. `youtube_collector.py` - Fetch videos from past 7 days
2. `content_analyzer.py` - Claude AI analyzes content (with persona guidance)
3. `add_sentiment.py` - Sentiment analysis from comments
4. `answer_questions.py` - Generate Q&A with citations (persona-assigned)
5. `generate_pages.py` - Build HTML pages
6. `generate_archive.py` - Archive current week
7. `generate_channels.py` - Update channel rankings
8. `update_wiki_videos.py` - Update wiki with featured videos (30-day expiration)

### Content Validation Process

**Before publishing any content, run validation:**

1. **Copy-Editor Review** - Ensures human-quality writing
   - No em-dashes (max 1 per page)
   - No AI tell words (delve, robust, leverage, navigate)
   - Varied sentence lengths and natural contractions
   - Conversational tone (sounds like a real person)
   - Specific examples, not generic statements

2. **Brand Compliance Review** - Ensures Carnivore Weekly standards
   - Direct and clear voice
   - Evidence-based claims with data
   - No excessive praise or hype
   - Matches persona authenticity (Sarah, Marcus, Chloe)
   - Professional but accessible

**See [CONTENT_VALIDATION.md](docs/qa/CONTENT_VALIDATION.md) for complete validation guidelines.**

### Tech Stack

- **Python 3.9** - Scripts and automation
- **Claude AI (Anthropic)** - Content analysis
- **YouTube Data API** - Video collection
- **Jinja2** - HTML templating
- **GitHub Actions** - Cloud automation
- **GitHub Pages** - Free hosting

---

## Project Structure

```
carnivore-weekly/
├── scripts/
│   ├── youtube_collector.py      # Collect YouTube data
│   ├── content_analyzer.py       # Claude AI analysis
│   ├── add_sentiment.py          # Comment sentiment
│   ├── answer_questions.py       # Q&A generation
│   ├── generate_pages.py         # HTML generation
│   ├── generate_archive.py       # Archive system
│   └── generate_channels.py      # Channel rankings
├── templates/
│   ├── index_template.html       # Main page template
│   ├── archive_template.html     # Archive page
│   ├── channels_template.html    # Weekly Watch page
│   ├── blog_index_template.html  # Blog index
│   └── blog_post_template_2026.html # Blog post template
├── data/
│   ├── youtube_data.json         # Collected videos
│   ├── analyzed_content.json     # AI analysis
│   └── archive/                  # Past weeks
├── public/
│   ├── index.html                # Generated homepage
│   ├── channels.html             # Weekly Watch page
│   ├── wiki.html                 # Protocols & Basics
│   ├── blog.html                 # Blog index
│   ├── calculator.html           # Macro calculator
│   ├── the-lab.html              # Story and mission
│   ├── archive.html              # Archive index
│   ├── archive/                  # Individual weeks
│   └── blog/                     # Blog posts
├── .github/workflows/
│   └── update.yml                # GitHub Actions automation
└── run_weekly_update.sh          # Main automation script
```

---

## Setup

### Prerequisites

- Python 3.9+
- YouTube Data API key
- Anthropic (Claude) API key
- Git & GitHub account

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MikeBrew123/carnivore-weekly.git
   cd carnivore-weekly
   ```

2. **Install dependencies:**
   ```bash
   pip install google-api-python-client python-dotenv anthropic jinja2 requests
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add:
   ```
   YOUTUBE_API_KEY=your_youtube_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

4. **Configure channels** in `scripts/youtube_collector.py`:
   - List of carnivore creator channel IDs
   - Currently tracking top 10 creators

---

## Usage

### Run Locally (Mac)

```bash
cd /Users/mbrew/Developer/carnivore-weekly
./run_weekly_update.sh
```

Wait 5-10 minutes, then:
```bash
open public/index.html  # Preview the site
```

If satisfied:
```bash
git add .
git commit -m "Weekly update - $(date +%Y-%m-%d)"
git push
```

Site goes live at carnivoreweekly.com in ~1 minute!

### Run from Phone (GitHub Actions)

1. Open GitHub mobile app
2. Go to carnivore-weekly repo
3. Tap **Actions** → **Update**
4. Tap **Run workflow**
5. Wait 5-10 minutes
6. Site updates automatically!

Or set it to run automatically every Monday at 9 AM EST (see `update.yml`).

---

## What We've Built

### ✅ Completed Features

- [x] YouTube data collection (top 10 creators)
- [x] Claude AI content analysis
- [x] Sentiment analysis from comments
- [x] Q&A section with scientific citations
- [x] HTML generation with Jinja2 templates
- [x] Archive system (saves past weeks)
- [x] Weekly Watch (channel rankings)
- [x] Wiki (protocols & basics)
- [x] Blog with original content
- [x] Macro calculator (free, no email required)
- [x] Responsive leather-themed design
- [x] GitHub Actions automation
- [x] GitHub Pages deployment
- [x] Google Analytics tracking
- [x] Affiliate links (Amazon, ButcherBox, LMNT)
- [x] Phone trigger via GitHub mobile app
- [x] Medical disclaimer
- [x] GEO optimization (Schema.org markup for AI search visibility)
- [x] robots.txt configured for AI bots (SearchGPT, Perplexity, etc.)

### 🎯 Future Ideas

- [ ] Email newsletter (Mailchimp/ConvertKit)
- [ ] Social media automation (Twitter/X posts)
- [ ] Research paper integration (PubMed)
- [ ] News aggregation
- [ ] Video highlights/clips
- [ ] Creator spotlights
- [ ] Community features

---

## Monetization

### Current Setup

- **Amazon Associates** - Affiliate links for books and products
- **ButcherBox** - Meat delivery partner
- **LMNT** - Electrolyte partner
- **Google Analytics** - Tracking visitors and affiliate clicks

### Potential Revenue

With 1,000+ weekly visitors:
- Affiliate commissions: $200-500/month
- Ad placements: $100-300/month
- Total: $300-800/month (passive)

---

## Development

### Initial Setup

**One-time setup** (run once):
```bash
./setup_dev_environment.sh
```

This configures:
- ✅ Code quality tools (flake8, black)
- ✅ Git pre-commit hooks
- ✅ Python code formatters
- ✅ Black configuration (100 char lines)

### Code Quality Standards

**Automated checks - Python:**
- `flake8` - Code quality (see `.flake8` config)
- `black` - Code formatting (see `pyproject.toml`)

**Automated checks - JavaScript:**
- `eslint` - Code quality for Cloudflare Worker (see `api/.eslintrc.json`)
- Runs in automation script as pre-flight check

**Git pre-commit hooks** - Validates Python code before commits

**Manual review before publishing:**
- `/copy-editor` - AI detection, sentence structure, readability
- `/carnivore-brand` - Voice, authenticity, evidence-based claims
- See `docs/qa/VALIDATION_CHECKLIST.md` for complete checklist

### Testing Individual Scripts

```bash
# Test YouTube collection
python3 scripts/youtube_collector.py

# Test Claude analysis
python3 scripts/content_analyzer.py

# Test page generation
python3 scripts/generate_pages.py

# View locally
python3 -m http.server 8000
# Visit http://localhost:8000/public/
```

### Template Structure Documentation

**Auto-generated reference:** See `docs/architecture/TEMPLATE_STRUCTURE.md` for complete section map of `index_template.html`

The template documentation is **automatically generated** every time you run `generate_pages.py`. It maps:
- All 10 major sections with line numbers
- CSS classes and which sections use them
- JavaScript functions and their dependencies
- Template variables
- Critical shared dependencies (e.g., `.video-card` used by 5 sections)

**When editing the template:**
1. Check `docs/architecture/TEMPLATE_STRUCTURE.md` to see section dependencies
2. Use minimal inline comments (`<!-- SECTION: -->`) as navigation aids
3. Run `python3 scripts/generate_pages.py` (auto-updates docs)
4. Check the updated documentation to verify your changes

This prevents accidental deletions like CSS or JS code used by other sections.

### Code Quality Check

**Python:**
```bash
# Check code quality
python3 -m flake8 scripts/

# Auto-format code
python3 -m black scripts/
```

**JavaScript (Cloudflare Worker):**
```bash
# Check code quality
cd api && npm run lint

# Auto-fix issues
cd api && npm run lint:fix
```

**Full validation before publishing:**
```bash
./run_weekly_update.sh
# Automatically checks both Python and JavaScript
# Then: /copy-editor
# Then: /carnivore-brand
```

### Making Changes

1. Setup dev environment (one-time): `./setup_dev_environment.sh`
2. Create feature branch: `git checkout -b feature-name`
3. Make changes to scripts or templates
4. Code is auto-checked by pre-commit hook before commits
5. Fix any issues: `python3 -m black scripts/`
6. Test locally: `./run_weekly_update.sh`
7. Validate content: `/copy-editor` and `/carnivore-brand`
8. Commit and push - site deploys automatically

### Weekly Automation Workflow

**Complete workflow with validation:**
```bash
./run_weekly_update.sh
# Generates all content + checks Python code quality
# (see output for validation steps)

# Then REQUIRED before deploying:
/copy-editor     # Check for AI patterns, readability
/carnivore-brand # Check voice, personas, authenticity

# If all validations PASS:
git add .
git commit -m "Weekly content update - $(date +%Y-%m-%d)"
git push
```

**Site goes live:** ~1 minute after push to main

---

## Deployment

**GitHub Pages** (current setup):
- Free hosting
- Auto-deploys on push to main
- Custom domain: carnivoreweekly.com
- SSL/HTTPS included

**Alternative Options:**
- Vercel - Free tier, faster builds
- Netlify - Free tier, more features
- CloudFlare Pages - Free tier, global CDN

---

## License

MIT License - Do whatever you want with this code!

---

## Contact

**Site:** https://carnivoreweekly.com
**GitHub:** https://github.com/MikeBrew123/carnivore-weekly
**Built by:** A firefighter who got tired of searching

---

## Acknowledgments

- Built with Claude Code (Anthropic)
- YouTube Data API v3
- Claude AI for content analysis
- Top carnivore creators for amazing content
- Community for support and feedback

---

**Last Updated:** January 20, 2026
**Status:** ✅ Live and automated

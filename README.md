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
- **About** - Story and mission
- **Archive** - Browse past weeks
- **Channels** - Top creators ranked by activity

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

**See [CONTENT_VALIDATION.md](CONTENT_VALIDATION.md) for complete validation guidelines.**

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
│   ├── channels_template.html    # Channels page
│   └── about.html                # About page
├── data/
│   ├── youtube_data.json         # Collected videos
│   ├── analyzed_content.json     # AI analysis
│   └── archive/                  # Past weeks
├── public/
│   ├── index.html                # Generated homepage
│   ├── archive.html              # Archive index
│   ├── channels.html             # Channels page
│   ├── about.html                # About page
│   └── archive/                  # Individual weeks
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
- [x] Channel ranking page
- [x] Responsive leather-themed design
- [x] GitHub Actions automation
- [x] GitHub Pages deployment
- [x] Google Analytics tracking
- [x] Affiliate link integration (Amazon, ButcherBox pending)
- [x] Phone trigger via GitHub mobile app
- [x] Medical disclaimer
- [x] About page with authentic story

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

- **Amazon Associates** - Affiliate links for carnivore products (LMNT, cookware)
- **ButcherBox** - Pending approval via Impact.com
- **Google Analytics** - Tracking visitors and affiliate clicks

### Potential Revenue

With 1,000+ weekly visitors:
- Affiliate commissions: $200-500/month
- Ad placements: $100-300/month
- Total: $300-800/month (passive)

---

## Development

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

### Making Changes

1. Create feature branch
2. Make changes to scripts or templates
3. Test locally with `./run_weekly_update.sh`
4. Commit and push
5. Site deploys automatically

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

**Last Updated:** December 26, 2025
**Status:** ✅ Live and automated

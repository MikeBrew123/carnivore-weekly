# Build Your Own Weekly Content Hub

**A Complete Guide to Replicating This System for Any Niche**

Based on the carnivoreweekly.com project, this guide shows you how to create your own AI-powered weekly content aggregation site for any topic (surfboards, gardening, photography, etc.).

---

## 🎯 What You'll Build

An automated website that:
- Collects YouTube videos from top creators in your niche
- Uses AI to analyze and summarize content
- Generates beautiful HTML pages automatically
- Publishes weekly roundups
- Can be triggered from your phone
- Costs ~$0-5/month to run

**Examples:**
- Foil Surfboard Weekly
- Urban Gardening Weekly
- Film Photography Weekly
- Sourdough Baking Weekly
- Any niche with YouTube content!

---

## 📋 Prerequisites

### Required Accounts (All Free Tiers Work)
1. **GitHub Account** - For hosting code and website
2. **YouTube Data API Key** - To collect videos
3. **Anthropic API Key** - For AI content analysis
4. **Domain Name (Optional)** - ~$12/year

### Skills Needed
- Basic terminal/command line usage
- Ability to copy/paste and edit text files
- No coding experience required!

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    WEEKLY WORKFLOW                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. YouTube Collector  →  Fetch videos from creators    │
│           ↓                                               │
│  2. Content Analyzer   →  Claude AI analyzes content    │
│           ↓                                               │
│  3. Sentiment Analyzer →  Analyze comment sentiment      │
│           ↓                                               │
│  4. Q&A Generator      →  Generate FAQ with citations    │
│           ↓                                               │
│  5. Page Generator     →  Build HTML pages               │
│           ↓                                               │
│  6. Archive Generator  →  Save to archive                │
│           ↓                                               │
│  7. GitHub Pages       →  Publish to web                 │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
your-weekly/
├── scripts/
│   ├── youtube_collector.py      # Collects YouTube data
│   ├── content_analyzer.py       # AI analysis (Claude)
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
│   ├── youtube_data.json         # Raw YouTube data
│   ├── analyzed_content.json     # AI analysis results
│   └── archive/                  # Past weeks
├── public/
│   ├── index.html                # Generated homepage
│   ├── archive.html              # Archive index
│   ├── channels.html             # Channels page
│   └── archive/                  # Individual weeks
├── .github/workflows/
│   └── update.yml                # GitHub Actions automation
├── run_weekly_update.sh          # Main automation script
├── .env                          # API keys (local only)
└── README.md                     # Project documentation
```

---

## 🚀 Step-by-Step Setup

### Step 1: Get Your API Keys

#### YouTube Data API Key
1. Go to https://console.cloud.google.com
2. Create new project (e.g., "Foil Surfboard Weekly")
3. Enable "YouTube Data API v3"
4. Create credentials → API Key
5. Copy your API key

#### Anthropic API Key
1. Go to https://console.anthropic.com
2. Sign up for account
3. Go to API Keys section
4. Create new key
5. Copy your API key

**Cost:** ~$2-5/month for weekly analysis

---

### Step 2: Find Your Top Creators

1. **Research your niche on YouTube**
   - Search for your topic (e.g., "foil surfing")
   - Find the top 10 most active creators
   - Copy their channel IDs

2. **Get Channel IDs**
   - Visit a creator's channel page
   - Look at URL: `youtube.com/channel/UC...` or `youtube.com/@username`
   - For @username format, use this trick:
     - View page source (right-click → View Source)
     - Search for "channelId"
     - Copy the UC... string

3. **Create a list:**
   ```
   Channel 1: UC1234567890abcdefghij
   Channel 2: UC0987654321zyxwvutsrq
   ... (10 total recommended)
   ```

---

### Step 3: Clone and Customize

1. **Clone the carnivore-weekly repository:**
   ```bash
   cd ~/Developer
   git clone https://github.com/MikeBrew123/carnivore-weekly.git foilsurf-weekly
   cd foilsurf-weekly
   ```

2. **Remove the old git history:**
   ```bash
   rm -rf .git
   git init
   git add .
   git commit -m "Initial commit"
   ```

3. **Create your own GitHub repository:**
   - Go to github.com
   - Create new repository (e.g., "foilsurf-weekly")
   - Don't initialize with README
   - Copy the repository URL

4. **Push to your repository:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/foilsurf-weekly.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 4: Customize for Your Niche

#### 4.1 Update Creator List

Edit `scripts/youtube_collector.py`:

```python
# Find this section (around line 30-50):
CHANNELS = {
    'UC1234567890': 'Foil Surfer Pro',
    'UC0987654321': 'Kai Lenny',
    'UC1122334455': 'Hydrofoil Magazine',
    # ... add your 10 creators
}
```

#### 4.2 Update Content Focus

Edit `scripts/content_analyzer.py`:

```python
# Find the prompt section and update the topic:
prompt = f"""You are analyzing foil surfing content from YouTube...

Focus on:
1. New foil board technology and equipment
2. Riding techniques and tips
3. Best locations and conditions
4. Safety considerations
5. Community events and competitions
"""
```

#### 4.3 Customize Questions

Edit `scripts/answer_questions.py`:

```python
QUESTIONS = [
    "What's the best foil board for beginners?",
    "How do I learn to foil surf safely?",
    "What conditions are ideal for foiling?",
    "How much does foil surfing equipment cost?",
    "What's the difference between wing foiling and surf foiling?"
]
```

#### 4.4 Update Branding

Edit `templates/index_template.html`:

1. **Change the title and tagline:**
   ```html
   <h1>FOIL SURF WEEKLY</h1>
   <p class="subtitle">The Hydrofoil Digest</p>
   <p class="tagline">Riding Above the Water</p>
   ```

2. **Update color scheme** (search for these hex colors and replace):
   - `#8b4513` (brown) → `#0077be` (ocean blue)
   - `#d4a574` (tan) → `#00a8e8` (bright blue)
   - `#1a120b` (dark brown) → `#001f3f` (navy)

3. **Update logo:**
   - Replace `images/logo.png` with your own logo

4. **Update About page:**
   - Edit `templates/about.html` with your story

---

### Step 5: Set Up Local Environment

1. **Install Python dependencies:**
   ```bash
   pip install google-api-python-client python-dotenv anthropic jinja2 requests
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` with your API keys:**
   ```
   YOUTUBE_API_KEY=your_youtube_api_key_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

4. **Test the system locally:**
   ```bash
   ./run_weekly_update.sh
   ```

   This will:
   - Collect videos from your creators
   - Analyze with AI
   - Generate HTML pages
   - Take 5-10 minutes

5. **Preview the site:**
   ```bash
   open public/index.html
   ```

---

### Step 6: Set Up GitHub Pages

1. **Push your changes:**
   ```bash
   git add .
   git commit -m "Customize for foil surfing"
   git push
   ```

2. **Enable GitHub Pages:**
   - Go to your repo on GitHub
   - Settings → Pages
   - Source: Deploy from branch
   - Branch: main, folder: / (root)
   - Save

3. **Wait 1-2 minutes, then visit:**
   ```
   https://YOUR_USERNAME.github.io/foilsurf-weekly/
   ```

---

### Step 7: Add Custom Domain (Optional)

1. **Buy a domain:**
   - Namecheap, Google Domains, etc.
   - Example: `foilsurfweekly.com` (~$12/year)

2. **Configure DNS:**
   - Add A records pointing to GitHub's IPs:
     ```
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
     ```
   - Add CNAME record: `www` → `YOUR_USERNAME.github.io`

3. **Configure in GitHub:**
   - Settings → Pages → Custom domain
   - Enter: `foilsurfweekly.com`
   - Check "Enforce HTTPS"

4. **Add CNAME file to repo:**
   ```bash
   echo "foilsurfweekly.com" > public/CNAME
   git add public/CNAME
   git commit -m "Add custom domain"
   git push
   ```

---

### Step 8: Set Up Phone Triggering

1. **Add GitHub Secrets:**
   - Go to repo Settings → Secrets → Actions
   - Click "New repository secret"
   - Add two secrets:
     - Name: `YOUTUBE_API_KEY`, Value: [your key]
     - Name: `ANTHROPIC_API_KEY`, Value: [your key]

2. **Verify workflow file exists:**
   - Check `.github/workflows/update.yml` is in your repo
   - Should already be there from the clone

3. **Test the workflow:**
   - Go to Actions tab on GitHub
   - Click "Update" workflow
   - Click "Run workflow" → "Run workflow"
   - Wait 5-10 minutes
   - Site updates automatically!

4. **Trigger from phone:**
   - Install GitHub mobile app
   - Navigate to your repo
   - Tap Actions → Update → Run workflow
   - Done!

---

## 🎨 Customization Ideas

### Design Themes by Niche

**Foil Surfing:**
- Colors: Ocean blues, wave gradients
- Font: Modern, clean sans-serif
- Images: Aerial shots, sunset sessions

**Urban Gardening:**
- Colors: Greens, earth tones
- Font: Natural, handwritten feel
- Images: Plants, gardens, harvests

**Film Photography:**
- Colors: Black/white, vintage sepia
- Font: Classic serif
- Images: Camera gear, film strips

### Advanced Features

1. **Email Newsletter:**
   - Add Mailchimp integration
   - Send weekly digests to subscribers

2. **Social Media Posts:**
   - Auto-post to Twitter/X
   - Share top video of the week

3. **RSS Feed:**
   - Generate RSS for blog readers
   - Enable podcast apps to follow

4. **Video Embeds:**
   - Embed YouTube players
   - Play videos without leaving site

---

## 💰 Monetization Options

### Affiliate Programs

**For Foil Surfing:**
- Slingshot Foils affiliate program
- Amazon Associates (equipment links)
- Wetsuit brands (O'Neill, Rip Curl)

**Setup:**
1. Join affiliate programs
2. Get your affiliate links
3. Add to templates:
   ```html
   <a href="https://amazon.com/dp/B123?tag=YOUR_TAG">
     Best Foil Board for Beginners
   </a>
   ```

### Display Ads

- Google AdSense
- Wait until ~1,000 visitors/week
- Potential: $100-300/month

### Sponsorships

- Reach out to brands once established
- Offer banner placements
- Potential: $200-500/month

---

## 📅 Weekly Workflow

### Manual (5 minutes)

**Every Monday morning:**

```bash
# 1. Navigate to project
cd ~/Developer/foilsurf-weekly

# 2. Run the update
./run_weekly_update.sh

# 3. Preview locally
open public/index.html

# 4. If good, publish
git add .
git commit -m "Weekly update - $(date +%Y-%m-%d)"
git push
```

Site updates in ~1 minute!

### From Phone (30 seconds)

1. Open GitHub mobile app
2. Go to your repo
3. Actions → Update → Run workflow
4. Done!

### Fully Automatic (0 minutes)

Edit `.github/workflows/update.yml`:

```yaml
on:
  workflow_dispatch:  # Keep manual trigger
  schedule:
    - cron: '0 14 * * 1'  # Every Monday at 9 AM EST
```

Now it runs automatically every Monday!

---

## 🐛 Troubleshooting

### Videos Not Collecting

**Problem:** No videos found or API errors

**Solutions:**
- Check YouTube API key is valid
- Verify channel IDs are correct
- Check API quota (10,000 units/day free)
- Wait a few minutes and try again

### AI Analysis Fails

**Problem:** Anthropic API errors

**Solutions:**
- Check API key is valid
- Verify you have credits ($5 minimum)
- Reduce number of videos if hitting limits
- Check error message for details

### Pages Not Generating

**Problem:** HTML not created

**Solutions:**
- Check `data/analyzed_content.json` exists
- Verify templates are in `templates/` folder
- Run `python3 scripts/generate_pages.py` directly
- Check for Python errors in output

### Site Not Updating

**Problem:** GitHub Pages shows old content

**Solutions:**
- Clear browser cache (Cmd+Shift+R)
- Wait 2-3 minutes for GitHub to rebuild
- Check Actions tab for deployment status
- Verify `public/` folder has new files

---

## 📊 Scaling Up

### Start Small (Week 1-4)
- 5-10 creators
- Weekly updates
- Basic design

### Grow Medium (Month 2-3)
- 15-20 creators
- Add newsletter
- Refine design
- Start monetization

### Scale Large (Month 4+)
- 30+ creators
- Multiple niches/categories
- Paid memberships
- Full automation

---

## 🎯 Success Metrics

### Technical
- ✅ Site loads in < 3 seconds
- ✅ Mobile responsive
- ✅ Weekly updates automated
- ✅ Zero downtime

### Content
- ✅ 10+ videos featured weekly
- ✅ AI analysis is accurate
- ✅ Comments add value
- ✅ Archive growing

### Traffic
- Week 1: 10 visitors
- Month 1: 100 visitors
- Month 3: 500 visitors
- Month 6: 1,000+ visitors

---

## 📚 Resources

### Documentation
- YouTube Data API: https://developers.google.com/youtube/v3
- Anthropic Claude: https://docs.anthropic.com
- GitHub Pages: https://pages.github.com
- Jinja2 Templates: https://jinja.palletsprojects.com

### Community
- Share your site in niche forums
- Post on Reddit (r/YourNiche)
- Tweet about it
- Join Discord communities

---

## 🎁 Example Niches

Here are proven niches that work well:

### Sports & Outdoor
- ✅ Trail Running Weekly
- ✅ Mountain Biking Weekly
- ✅ Climbing Beta Weekly
- ✅ Surfing Weekly

### Food & Cooking
- ✅ Sourdough Weekly
- ✅ BBQ Pitmasters Weekly
- ✅ Vegan Cooking Weekly
- ✅ Coffee Roasting Weekly

### Creative
- ✅ Film Photography Weekly
- ✅ Woodworking Weekly
- ✅ Digital Art Weekly
- ✅ Music Production Weekly

### Tech
- ✅ Homelab Weekly
- ✅ Retro Gaming Weekly
- ✅ 3D Printing Weekly
- ✅ Mechanical Keyboards Weekly

---

## 🚦 Getting Started Checklist

### Phase 1: Setup (Day 1)
- [ ] Get YouTube API key
- [ ] Get Anthropic API key
- [ ] Clone repository
- [ ] Create GitHub repo
- [ ] Find 10 creators in your niche

### Phase 2: Customize (Day 1-2)
- [ ] Update channel list
- [ ] Customize prompts for your niche
- [ ] Update branding (title, colors, logo)
- [ ] Edit About page with your story
- [ ] Test locally

### Phase 3: Deploy (Day 2-3)
- [ ] Push to GitHub
- [ ] Enable GitHub Pages
- [ ] Test live site
- [ ] Buy domain (optional)
- [ ] Configure custom domain

### Phase 4: Automate (Day 3-4)
- [ ] Add GitHub Secrets
- [ ] Test GitHub Actions workflow
- [ ] Set up phone triggering
- [ ] Schedule automatic runs (optional)

### Phase 5: Launch (Week 1)
- [ ] Share on social media
- [ ] Post in community forums
- [ ] Email friends in the niche
- [ ] Run first weekly update

### Phase 6: Grow (Month 1+)
- [ ] Monitor analytics
- [ ] Gather feedback
- [ ] Refine content
- [ ] Add monetization
- [ ] Build audience

---

## 💡 Tips for Success

1. **Pick a passionate niche** - You should care about the content
2. **Start simple** - Get it working first, improve later
3. **Be consistent** - Weekly updates build trust
4. **Engage your community** - Respond to feedback
5. **Add value** - AI analysis should provide insights
6. **Optimize for mobile** - Most traffic is mobile
7. **SEO matters** - Use good titles and descriptions
8. **Share liberally** - Promote on social media
9. **Monitor costs** - Should stay under $10/month
10. **Have fun!** - This should be enjoyable

---

## 🤝 Support

If you get stuck:

1. **Check the original repo:** https://github.com/MikeBrew123/carnivore-weekly
2. **Review this guide** - Most answers are here
3. **Search the error message** - Google is your friend
4. **Ask Claude Code** - I can help debug!

---

## 📝 License

This system is MIT licensed - do whatever you want with it!

Build something awesome and share it with the world. 🚀

---

**Built with:**
- Claude Code (Anthropic)
- YouTube Data API v3
- Claude AI (Sonnet 4.5)
- GitHub Pages
- Python + Jinja2
- Love for niche communities ❤️

**Created:** December 2025
**Last Updated:** December 26, 2025

---

## Next: Start Building! 🎉

Pick your niche, follow the steps, and launch your own weekly content hub. You've got this!

# FLYWHEEL BLUEPRINT: Traffic Ecosystem Technical Flow

**Version:** 1.0.0
**Effective Date:** January 1, 2025
**Owner:** Alex (Developer) + Sarah (Content), Marcus (Strategy), Chloe (Community)
**Authority:** CEO (Mike Brew)

---

## EXECUTIVE SUMMARY

The Traffic Flywheel is our 2026 revenue engine. Content flows once through our creation pipeline, then distributes across 4 channels (YouTube, Instagram, Newsletter, Website), with each channel feeding traffic back to the website where ads/affiliates/sponsorships drive revenue.

**Goal:** One piece of content → 4 channels → 10-20% traffic return per channel → 40-50% organic search authority by end of 2026

---

## THE FLYWHEEL CYCLE

```
Sarah writes blog post
        ↓
Blog published on website
        ↓
        ├→ YouTube: Extract key points → AI voiceover (VAPI) → Video published
        │                                                        ↓
        │                                              YouTube algorithm surfaces
        │                                                        ↓
        │                                        20-30% click back to blog post
        │
        ├→ Instagram: Chloe creates carousel → Design automation → Post 3x/week
        │                                                        ↓
        │                                        Community engagement signals
        │                                                        ↓
        │                                        10-15% swipe-ups to blog post
        │
        ├→ Newsletter: Marcus synthesizes → Email template → Sends to 10k subscribers
        │                                                        ↓
        │                                        15% click-through to full post
        │
        └→ Website: Content lives permanently
                                ↓
                        Accumulates SEO authority
                                ↓
                    Year 2: 40-50% of traffic from organic search
                                ↓
                    Premium ad rates + affiliate commission
```

---

## CHANNEL 1: YOUTUBE (Long-Tail Keyword Authority + Discovery)

### Objective
- Drive long-tail keyword SEO (e.g., "carnivore electrolytes explained")
- Use YouTube algorithm to surface content to cold audience
- Re-direct 20-30% of viewers back to blog for full content

### Content Source
**Sarah's deep-dive blog posts** → Converted to video format

### Video Creation Process

**Step 1: Blog Post Published**
- Sarah publishes blog post on website
- File: `/public/blog/[DATE-SLUG].html`
- Includes key points, research, specific examples

**Step 2: Extract Key Points**
Script: `scripts/youtube_extract_points.py`
```python
# Read blog post HTML
# Extract all <h2> headings as "chapter markers"
# Pull first 1-2 paragraphs of each section
# Create structured outline for voiceover script
# Example output:
# Chapter 1: Insulin Resistance Basics (0:00-2:30)
# Chapter 2: Carnivore's Effect on Glucose (2:31-5:15)
# Chapter 3: Bloodwork Interpretation (5:16-8:45)
```

**Step 3: Generate Voiceover Script**
Script: `scripts/youtube_generate_voiceover.py`
```python
# Using Claude AI (anthropic API)
# Prompt: "Create a 8-15 minute educational video script"
# Style: Sarah's voice (warm, educational, evidence-based)
# Include timestamps for chapters
# Add "Learn more at carnivoreweekly.com/blog/[slug]" CTA

# Example output length: 1,500-2,000 words (≈8-15 minutes at 150-170 wpm)
```

**Step 4: AI Voiceover Generation**
Tool: VAPI (Voice AI Platform)
```
Configuration:
- Voice: Clone of female voice (professional, warm tone)
- Speed: 1.0x (natural pace)
- Emotion: Warm, educational (not robotic)
- Language: English (US)
- Audio format: MP3/WAV

Cost: ~$0.01-0.02 per minute of audio (outsourced)
```

**Step 5: Visual Generation**
Script: `scripts/youtube_generate_visuals.py`
```python
# For each chapter section:
# - Take key point
# - Generate minimal slide with:
#   - Text (chapter title + key stat)
#   - Branded background (#1a120b)
#   - Carnivore Weekly logo
#   - Static image or graph (if relevant)

# Tool: Playwright (screenshots from web) + Figma automation
# Create 15-20 slide deck for 10-minute video

# Output: /assets/youtube/[DATE-SLUG]_slides/
# Example: /assets/youtube/2025-01-05-insulin/
#   ├── slide_01.png
#   ├── slide_02.png
#   └── slide_15.png
```

**Step 6: Video Assembly**
Tool: FFmpeg (open-source video creation)
```bash
# Combine:
# 1. Audio voiceover (VAPI)
# 2. Slide images (Playwright/Figma)
# 3. Transitions (1-2 second fade)
# 4. YouTube intro/outro (animated logo)

# Command:
ffmpeg \
  -f lavfi -i color=c=#1a120b:s=1280x720:d=600 \
  -i voiceover.mp3 \
  -filter_complex "[0]scale=1280:720[v];[v]fps=30[v]" \
  -map "[v]" -map 1:a output.mp4 \
  -y

# Output: /assets/youtube/[DATE-SLUG]_video.mp4
# Duration: 8-15 minutes
# Resolution: 1080p (1920x1080)
# Frame rate: 30fps
```

### YouTube Publishing

**Step 7: Upload to YouTube**
Tool: YouTube Data API (Python `google-api-python-client`)
```python
# Authentication: OAuth2 with YouTube channel credentials
# Upload video with metadata:
# - Title: "[Blog Post Title] - Carnivore Weekly"
# - Description: "Full article: https://carnivoreweekly.com/blog/[SLUG]"
# - Tags: ["carnivore", "keto", specific health topic]
# - Thumbnail: Auto-generated from slide 3
# - Category: "Education"
# - Playlist: "Carnivore Weekly - Health Deep Dives"
# - Privacy: "Unlisted" (24 hours before public, for testing)
# - Then: "Public" (auto-publish)

# Schedule: Publish same day or next morning (9 AM EST)
# Frequency: 2x per week (Wednesday + Saturday)
```

### Embedding Back on Blog

**Step 8: Embed Video on Original Blog Post**
File: `/public/blog/[DATE-SLUG].html`
```html
<div class="blog-video-embed" style="margin: 2em 0; aspect-ratio: 16/9; max-width: 100%;">
  <iframe
    width="100%"
    height="600"
    src="https://www.youtube.com/embed/[VIDEO_ID]"
    title="[Blog Post Title] - Carnivore Weekly"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen>
  </iframe>
  <p style="font-size: 0.9em; margin-top: 1em; opacity: 0.7;">
    Watch this video, or keep reading for the full article below.
  </p>
</div>
```

**Result:** Blog post now includes video (improves SEO + engagement)

### YouTube Traffic Tracking

**Metrics to Track:**
- Video views (daily, weekly)
- Click-through rate to blog post (YouTube Analytics → External link clicks)
- Watch time (time spent watching)
- Audience retention (which sections lose viewers)
- Subscribe rate (new subs from video)

**Tool:** Google Analytics 4 + YouTube Analytics API
```python
# Script: scripts/youtube_analytics.py
# Daily report:
# - Views from last 24 hours
# - CTR to blog (if tracking pixel in description link)
# - New subscribers
# - Top videos (by views)

# Monthly report:
# - Total views this month
# - Average CTR
# - Revenue impact (tracked in GA4)
```

**Expected ROI:**
- 30% of organic search traffic eventually comes from YouTube embeds
- 20-30% of YouTube viewers click through to blog post
- Strong watch time signals boost blog post SEO ranking

---

## CHANNEL 2: INSTAGRAM (Viral Awareness + Community Engagement)

### Objective
- Drive viral awareness through trending topic carousels
- Build community engagement (likes, comments, saves)
- Use "link in bio" strategy to send 10-15% of followers to blog

### Content Source
**Chloe's trend research** → Converted to carousel graphics

### Carousel Creation Process

**Step 1: Identify Trending Topic**
- Chloe monitors: Reddit (r/carnivore), YouTube comments, Discord, Twitter/X
- Identifies trending discussion (e.g., "Lion Diet debate")
- Writes 500-word trend breakdown blog post OR links to existing post
- Files: `/agents/memory/chloe_trends_daily.md` (logged daily)

**Step 2: Design Carousel Graphics**
Tool: Figma automation (Python + Figma API)
```python
# Prompt to Claude AI:
# "Create Instagram carousel copy for [trend] from Chloe's perspective"
# Output: 8-10 slide copy with:
# - Slide 1: Hook question ("Is Lion Diet the ultimate carnivore move?")
# - Slides 2-7: Key points (1 per slide)
# - Slide 8: Controversial take (Chloe's honest opinion)
# - Slide 9: Community action (poll or question)
# - Slide 10: CTA ("Full breakdown on our website")

# Then use Figma API to:
# - Create 10 slides with carousel template
# - Add text (from Claude)
# - Apply Carnivore Weekly brand colors (#1a120b, #d4a574)
# - Add carousel number (1/10, 2/10, etc.)
# - Export as PNG for Instagram

# Output: /assets/instagram/[DATE-TREND]/
# Example: /assets/instagram/2025-01-07-lion-diet/
#   ├── slide_01.png (1/10)
#   ├── slide_02.png (2/10)
#   └── slide_10.png (10/10)
```

**Step 3: Generate Caption**
```
Caption structure:
1. Hook: "Okay so everyone's talking about..." (Chloe's voice)
2. Context: Why this trend matters to the community
3. Take: Chloe's honest perspective
4. Question: Engagement driver ("What's YOUR take?")
5. CTA: "Full breakdown on our site" + link in bio
6. Hashtags: #CarnivoreCommunity #CarnivoreWeekly #HealthTrends

Example length: 250-300 words
Tone: Conversational, insider vibe, relatable
```

### Instagram Publishing

**Step 4: Schedule & Publish**
Tool: Meta Business Suite (Instagram scheduling) OR Buffer
```python
# Schedule carousel posts:
# - 3 posts per week (Mon, Wed, Fri at 9 AM EST)
# - Alternate between: Trend hot-takes, Creator spotlights, Wellness tips
# - Use link in bio strategy (Bio link = latest blog post)

# Post metadata:
# - Alt text for accessibility
# - Captions locked (no scrolling needed)
# - Comments enabled (community engagement)

# Automation:
# Generate→Design→Schedule all in one daily script
```

### Instagram Engagement Tracking

**Metrics:**
- Likes + Comments (engagement rate)
- Saves (shows content resonance)
- Shares (viral potential)
- Link clicks (if trackable)
- Follower growth (net new followers from post)

**Tool:** Instagram Insights + GA4 (track "from Instagram" traffic)
```python
# Chloe monitors daily:
# - Top post from week (by engagement)
# - Trending hashtags in comments
# - Community sentiment (positive/negative)
# - Identifies topics for future posts
```

**Expected ROI:**
- Builds community trust + loyalty
- 10-15% of followers eventually click "link in bio" to blog
- Engagement signals improve algorithm ranking
- Creates pool of fans for newsletter signup

---

## CHANNEL 3: NEWSLETTER (Retention + Premium Conversion)

### Objective
- Retain existing audience + build subscriber list
- Drive 15% of subscribers back to blog for full articles
- Convert newsletter subscribers to "Pro" tier (paid tier, future feature)

### Content Source
**Marcus's synthesis** of week's top posts + exclusive tactical tips

### Newsletter Creation Process

**Step 1: Weekly Synthesis**
Marcus reads all 3 posts from the week (Sarah + Marcus + Chloe)
- Identifies top 3 posts by quality/impact
- Writes 200-word tactical summary ("This week's playbook")
- Example: "Here's what you need to know about insulin resistance without the 10,000 words"

**Step 2: Generate Email Content**
Script: `scripts/newsletter_generate_email.py`
```
Email Structure (240-400 words total):
────────────────────────────────────
HEADER:
[Carnivore Weekly logo]
"This Week's Playbook - [Date]"
────────────────────────────────────

INTRO (50 words):
Marcus's voice - personal, direct
"Okay, so this week we covered three things..."

TOP 3 POSTS (100 words):
- Post 1: Title + 30-word summary + link
- Post 2: Title + 30-word summary + link
- Post 3: Title + 30-word summary + link

EXCLUSIVE TIP (50 words):
Email-only content (not on blog)
Example: "Here's a protocol I haven't shared yet..."

CTA (20 words):
"Read the full deep dives above"

FOOTER:
Unsubscribe + preferences
"Questions? Reply to this email"
────────────────────────────────────
```

**Step 3: Personalize for Email**
Tool: SendGrid or Mailchimp (email marketing platform)
```python
# Template: Marcus's signature style
# Personalization: Hi [Name], based on signup location/interests
# A/B test subject lines:
# - Version A: "This Week's Playbook - [Date]"
# - Version B: "Marcus here: Here's what mattered this week"

# Target: Variant B typically gets 5-10% better open rate
```

### Newsletter Publishing

**Step 4: Send Email**
```
Schedule:
- Send: Wednesday at 6 PM EST (mid-week)
- Frequency: 1 email per week
- Send to: All newsletter subscribers (target: 10k by EOY 2026)

Automation:
- Generate email
- Schedule send
- Track metrics (opens, clicks, unsubscribes)
- Archive copy to /agents/daily_logs/newsletters/
```

### Newsletter Metrics & Tracking

**Key Metrics:**
- Open rate (target: 40%)
- Click-through rate (target: 15%)
- Unsubscribe rate (target: <1%)
- Conversion to "Pro" tier (future)
- Subscriber growth (net new per week)

**Tool:** SendGrid/Mailchimp Analytics + GA4
```python
# Weekly report from Sam (Analytics):
# - Opens: X% (vs. 40% target)
# - Clicks: X% (vs. 15% target)
# - Unsubscribes: X% (monitor for rising trend)
# - Revenue: $X (from future Pro tier)

# If open rate drops:
# - A/B test subject lines more
# - Check email timing
# - Review content relevance
```

**Expected ROI:**
- 40% open rate × 10k subscribers = 4,000 email opens per week
- 15% CTR × 4,000 = 600 clicks back to blog
- 600 clicks × 4 weeks = 2,400 monthly blog visits from email
- Newsletter itself becomes path to future revenue (Pro tier subscriptions)

---

## CHANNEL 4: WEBSITE (SEO Authority + Primary Revenue)

### Objective
- Accumulate permanent SEO authority (organic search = 40-50% of traffic by 2026)
- Monetize through ads, affiliate commissions, sponsorships
- Create permanent home for all long-form educational content

### Content Flow

**Content published to website first (SEO best practice):**
1. Sarah writes blog post (8-15 min read)
2. Post includes: citations, specific examples, wiki deep links
3. Published to: `/public/blog/[DATE-SLUG].html`
4. Meta tags optimized: Title, description, keywords
5. Video embedded (from YouTube)
6. Sponsor callouts integrated naturally

### SEO Optimization

**Step 1: Keyword Research**
Tool: SEMrush or Ahrefs (free tier)
```
Before writing:
- Research target keyword (e.g., "insulin resistance carnivore")
- Check search volume: 100-500 searches/month (good target)
- Check competition: Low-medium (we can rank)
- Understand search intent: Educational (matches our content)
```

**Step 2: On-Page SEO**
```html
<title>Physiological Insulin Resistance on Carnivore: Bloodwork Explained</title>
<meta name="description" content="Why your fasting glucose is 'high' on carnivore (and why that's normal). Science-backed explanation with bloodwork interpretation guide.">
<meta name="keywords" content="insulin resistance, carnivore diet, fasting glucose, bloodwork">

<h1>Physiological Insulin Resistance on Carnivore: What Your Bloodwork Actually Shows</h1>
<!-- First 300 words answer the question directly -->
<!-- Rest of post expands with detail, examples, citations -->
```

**Step 3: Internal Linking**
Blog posts link to:
- Wiki sections (e.g., `/wiki.html#electrolytes`)
- Related blog posts (e.g., "See also: The BUN Confusion")
- Affiliate products (e.g., "ButcherBox for quality meat")

Example:
```html
<p>
  You might be wondering about <a href="/wiki.html#electrolytes">electrolyte balancing</a>
  during your transition. We cover that in detail on the wiki, and if you want to learn
  more about <a href="/blog/2025-01-12-electrolyte-myths.html">common electrolyte myths</a>,
  that post goes deeper.
</p>
```

**Step 4: External Citations**
Every health claim includes citation:
```html
<p>
  Studies show that <a href="https://pubmed.ncbi.nlm.nih.gov/[ID]">carnivore dieters often see
  improved insulin sensitivity</a> after 8-12 weeks, even with slightly elevated fasting glucose.
</p>
```

### Website Traffic Tracking

**Tool:** Google Analytics 4
```python
# Track per post:
# - Page views
# - Average time on page
# - Bounce rate
# - Links clicked (to wiki, related posts, affiliates)
# - Devices (mobile vs. desktop)

# By traffic source:
# - Organic search (Google)
# - Direct (typing URL)
# - YouTube
# - Instagram
# - Newsletter

# Revenue metrics:
# - Ad impressions (if running ads)
# - Affiliate clicks + conversions
# - Sponsorship value
```

### Website Revenue Model

**1. Affiliate Commissions (60% of revenue)**
```
Partner: ButcherBox
- Commission: 5% per sale
- Tracking: Affiliate link in blog post
- Expected: $3-5k/month by 2026

Partner: Supplements (various)
- Commission: 10-20%
- Integrated naturally in health posts
```

**2. Sponsored Content (25% of revenue)**
```
Example sponsorship:
- Carnivore supplement brand pays $1,000
- Sarah writes sponsored blog post: "How [Brand] Optimized My Recovery"
- Clear disclosure: "[Sponsored content from Brand]"
- Links back to brand site

Target: 1-2 sponsored posts per month
Revenue: $1,000-2,000/month
```

**3. Newsletter Pro Subscription (10% of revenue, future)**
```
Coming in Q2 2025:
- Free newsletter: Weekly synthesis (what we have now)
- Pro newsletter: Exclusive protocols, member-only content, Q&A
- Price: $5/month
- Target: 500 Pro subscribers by 2026
- Revenue: $2,500/month
```

**4. Calculators/Tools (5% of revenue)**
```
- Macro calculator: $2 one-time purchase
- Health metrics tracker: Free tier + $1/month Pro
- Target: $200-300/month
```

---

## FLYWHEEL AUTOMATION PIPELINE

### Daily Operations

**Morning (7 AM EST):**
1. Quinn generates AGENDA for the day
2. Writers read AGENDA + memory.log
3. Content team knows what's due when

**Throughout the day:**
- Sarah writes/refines blog post (due by 2 PM for review)
- Marcus prepares newsletter framework
- Chloe scouts trends for next carousel

**Afternoon (2-4 PM EST):**
- Eric reviews Sarah's draft (editorial feedback)
- Alex begins preparing blog post publication
- Video extraction begins (if publishing new post)

**Evening (4-6 PM EST):**
- Blog post published (5 PM)
- YouTube automation triggered
  - Extract key points
  - Generate voiceover script
  - Queue for VAPI processing
- Instagram carousel automation triggered
  - Generate copy and graphics
  - Schedule for next day
- Newsletter queued for Wednesday send

**End of Day (5 PM EST):**
- Quinn generates EOD report
- Team reviews day's status
- Blockers documented for next day

### Weekly Rhythm

**Monday-Friday:**
- 1 blog post per day (different persona)
- 3 Instagram carousels (Mon/Wed/Fri)
- 2 YouTube videos (Tue/Fri)
- 1 Newsletter (Wednesday)

**Batching for efficiency:**
- Write 3 posts at start of week (Mon-Tue)
- Design 3 carousels mid-week (Wed)
- Create videos end of week (Thu-Fri)
- Publish on rolling schedule (Mon-Fri each day)

### Automation Scripts

**Master automation script:** `scripts/flywheel_daily.py`

```python
#!/usr/bin/env python3
"""
Daily Flywheel Automation
Runs at 4:00 PM EST every day
"""

import subprocess
from pathlib import Path
from datetime import datetime

# Step 1: Check if blog post published today
# Step 2: If yes, extract key points
# Step 3: Generate voiceover script
# Step 4: Queue for VAPI processing
# Step 5: Generate carousel copy + design
# Step 6: Schedule Instagram post
# Step 7: Archive logs
# Step 8: Report status to Quinn

# Runs fully automated, no manual intervention needed
```

---

## KPI TARGETS (2026)

| Channel | 2025 | 2026 Target | Owner |
|---------|------|------------|-------|
| **Website** | 5,000 visits/mo | 25,000 visits/mo | Sarah |
| **YouTube** | 500 subscribers | 5,000 subscribers | Alex |
| **Instagram** | 2,000 followers | 15,000 followers | Chloe |
| **Newsletter** | 1,000 subscribers | 10,000 subscribers | Marcus |
| **Organic Search %** | 20% of traffic | 50% of traffic | Sarah |
| **Affiliate Revenue** | $500/mo | $3,000-5,000/mo | Sarah |
| **Sponsorship Revenue** | Base rate | +30% premium | Eric |
| **Total Monthly Revenue** | $500/mo | $6,000-10,000/mo | CEO |

---

## TECHNICAL REQUIREMENTS

### Tools & Services

**Required (Cost: ~$50-100/month):**
- YouTube Data API (free)
- SendGrid/Mailchimp (free tier)
- VAPI (AI voiceover): $0.01-0.02 per minute
- Figma (free tier)
- FFmpeg (open-source, free)
- Google Analytics 4 (free)
- GitHub Actions (free with repo)

**Optional (Nice to have):**
- SEMrush free tier (keyword research)
- Buffer (social scheduling): $15/month
- Meta Business Suite (free)

### Development Requirements

**Scripts to maintain:**
- `scripts/youtube_extract_points.py`
- `scripts/youtube_generate_voiceover.py`
- `scripts/youtube_generate_visuals.py`
- `scripts/youtube_upload.py`
- `scripts/instagram_carousel_design.py`
- `scripts/newsletter_generate_email.py`
- `scripts/flywheel_daily.py` (master automation)

**All scripts:**
- Logged with errors + successes
- Version controlled in GitHub
- Tested on staging before production
- Alex maintains and documents

---

## FAILURE SCENARIOS & MITIGATION

**Scenario: VAPI voiceover quality is poor**
- Mitigation: Test multiple voices, adjust speed/emotion
- Backup: Outsource to Fiverr voiceover artist ($20-50 per video)

**Scenario: Instagram carousel doesn't drive traffic**
- Mitigation: A/B test different formats (single image vs. carousel)
- Check: Are we using links correctly? Analytics set up?
- Pivot: Focus on community engagement over CTR

**Scenario: Blog post SEO ranking too low**
- Mitigation: Backlink building strategy (podcast appearances, guest posts)
- Check: Title/meta tags/keyword targeting correct?
- Expand: Write more posts targeting same keyword cluster

**Scenario: Newsletter unsubscribe rate spikes**
- Mitigation: Cut email frequency (weekly → bi-weekly)
- Check: Is content valuable? Too sales-y?
- Survey: Ask subscribers what they want more of

---

## DEPLOYMENT TIMELINE

**January 2025:**
- ✅ Blog system operational
- ✅ YouTube automation scripting complete
- ✅ 2 test videos published (Sarah posts)
- ✅ Instagram carousel system tested
- ✅ Newsletter template ready

**February 2025:**
- ✅ YouTube: 1 video per week (2 total Feb)
- ✅ Instagram: 3 carousels per week (12 total Feb)
- ✅ Newsletter: Weekly sends (4 total Feb)
- ✅ Measure traffic back to blog (target: 5-10%)

**March-June 2025:**
- ✅ Scale: 2 YouTube videos per week
- ✅ Scale: 3 Instagram carousels per week
- ✅ Scale: 1 Newsletter per week
- ✅ Hit traffic targets (20-30% from channels)
- ✅ Identify top-performing content

**July-December 2025:**
- ✅ Optimize based on data
- ✅ Expand to 3 YouTube videos per week (if scaling well)
- ✅ Begin Pro newsletter beta
- ✅ Hit 2026 targets early if possible

---

## SUCCESS DEFINITION (End of 2026)

✅ Website gets 25,000+ monthly visitors
✅ 40-50% of traffic from organic search
✅ YouTube channel has 5,000+ subscribers
✅ Instagram has 15,000+ followers
✅ Newsletter has 10,000+ subscribers
✅ Monthly revenue: $6,000-10,000
✅ Traffic flywheel runs on autopilot
✅ Brand recognized as AI-augmented media leader

---

## SIGN-OFF

**Created by:** Quinn (Record Keeper)
**Approved by:** CEO (Mike Brew)
**Owners:** Alex (YouTube/technical), Sarah (SEO/blog), Marcus (newsletter), Chloe (Instagram)
**Status:** ACTIVE - Reference for all multi-channel operations

**Last Updated:** January 1, 2025
**Next Review:** April 1, 2025 (KPI checkpoint)

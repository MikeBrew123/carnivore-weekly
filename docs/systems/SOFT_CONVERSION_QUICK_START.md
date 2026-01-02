# Soft Conversion Blog Integration - Quick Start Guide

## TL;DR

Blog generation now automatically includes:
- Wiki links for related topics
- Featured videos matching the blog theme
- Product recommendations (using soft-conversion framework)
- Voice-specific de-risking language

## Run the Generator

```bash
node scripts/generate_blog_posts.js
```

Output shows what's included in each post:
```
✅ Generated: 2025-12-19-psmf-fat-loss.html
   Writer: Casey (casey)
   Title: PSMF and Carnivore: Does Extreme Fat Loss Work?
   Size: 10.6KB
   Topic: fat-loss
   Product Recs: Calculator
```

## How It Automatically Maps Topics

The system detects blog topics from tags:

| Blog Tag | Maps To | Includes |
|----------|---------|----------|
| `fat-loss` | fat-loss topic | Calculator recommendation |
| `performance`, `muscle` | performance | Calculator (pro tier) |
| `budget`, `money-saving` | budget | Budget wiki + 2 videos |
| `new-year`, `getting-started` | new-year | Calculator + 2 videos |
| `health`, `science` | health-science | Wiki links + 1 video |
| `hormones` | hormones | Hormones wiki + video |

## What Gets Added to Each Blog Post

### 1. Wiki Links Section
```html
Related Wiki Topics: Cholesterol • Insulin Resistance • Digestion
[Links to relevant wiki sections]
```

### 2. Featured Videos Section
```html
📺 Featured This Week:
  - Video Title by Channel Creator [Watch →]
  - Video Title by Channel Creator [Watch →]
```

### 3. Product Recommendations (Soft Conversion)

Internal products first:
- **Calculator** - For macros, performance, fat-loss topics
- **Wiki** - Free resource for health questions

Partner products (only if better fit):
- **ButcherBox** - For meat sourcing topics
- **LMNT** - For electrolyte topics

Each with:
- Clear reason why it's relevant
- Voice-specific de-risking ("Use it or don't, just know it exists")
- Clean CTA without pressure

## Soft Conversion Framework (Simple Version)

**What it does:** Recommends products naturally without being pushy

**How it works:**
1. **Problem Mirroring** - Show you understand the issue
2. **Micro Insight** - Give free value first
3. **Natural Bridge** - "If you want to go deeper..."
4. **Product as Tool** - Position as helper, not hero
5. **De-Risk** - "You don't need this if..."
6. **Clean CTA** - "Here's the link if you want it"

**The rule:** If it feels salesy, it's not following the framework.

## Adding New Topics/Products

Edit `/Users/mbrew/Developer/carnivore-weekly/data/blog-topic-product-mapping.json`

```json
"new-topic": {
  "keywords": ["keyword1", "keyword2"],
  "wiki_section": "wiki-section-anchor",
  "featured_videos": ["VIDEO_ID_1"],
  "partner_products": [
    {
      "name": "ProductName",
      "reason": "Why it fits this topic",
      "cta_text": "Call to action"
    }
  ]
}
```

## Customizing De-Risk Language

Voice-specific de-risking is in the script:

```javascript
if (writerName === 'sarah') {
  deRiskText = `This is optional—no tool replaces good nutrition fundamentals.`;
} else if (writerName === 'marcus') {
  deRiskText = `This solves the boring part. You don't need it, but it saves time.`;
} else if (writerName === 'casey') {
  deRiskText = `Use it if it helps. No pressure either way.`;
}
```

Edit `/scripts/generate_blog_posts.js` function `getProductRecommendations()` to adjust per writer.

## Key Files

| File | Purpose |
|------|---------|
| `scripts/generate_blog_posts.js` | Main generator (loads data, renders HTML) |
| `data/blog-topic-product-mapping.json` | Topic-to-resource mappings |
| `data/wiki-keywords.json` | Wiki sections + keywords |
| `data/wiki_videos_meta.json` | Videos + their wiki sections |
| `.claude/skills/soft-conversion/SKILL.md` | Framework definition + examples |

## Soft Conversion Hard Rules

✅ **DO:**
- Value first, product second
- Clear disclosure of partner products
- Voice-specific de-risking
- Multiple exit points (reader can skip)

❌ **DON'T:**
- Guilt the reader
- Inflate urgency ("Last chance!")
- Over-promise results
- Hide partnership disclosures
- Use manipulation tactics

## Example: "New Year, Same You" Post

**Blog topic detected:** `new-year`

**Auto-included:**
- Featured Videos: 2 videos on "getting started"
- Product Recommendation: Calculator
- De-Risk (Marcus voice): "This solves the boring part. You don't need it, but it saves time."
- CTA: "Calculate your macros here" (clean, no pressure)

## Example: "Night Sweats" Post

**Blog topic detected:** `health-science`

**Auto-included:**
- Wiki Links: Cholesterol, Insulin Resistance, Digestion
- Featured Videos: 1 comprehensive video
- De-Risk (Sarah voice): "This is optional—no tool replaces good nutrition fundamentals."

## Testing Your Setup

```bash
# Generate all posts
node scripts/generate_blog_posts.js

# Check a specific post for wiki links
grep "wiki.html" public/blog/2025-12-19-psmf-fat-loss.html

# Check for featured videos
grep "Featured This Week" public/blog/2025-12-25-new-year-same-you.html

# Check for product recommendations
grep "Calculator" public/blog/2025-12-25-new-year-same-you.html
```

## What Changes When You Add a New Blog Post

1. Add post to `blogPosts` array in `generate_blog_posts.js`
2. Include relevant tags (the system maps tags to topics)
3. Run the generator
4. System automatically:
   - Detects topic from tags/title
   - Finds wiki links
   - Fetches featured videos
   - Adds product recommendations
   - Applies writer's voice

No additional markup needed. Everything is automatic.

## Monitoring & Optimization

Watch the console output for what's being added:

```bash
$ node scripts/generate_blog_posts.js

✅ Generated: filename.html
   Writer: [name]
   Title: [title]
   Topic: [detected-topic]
   Wiki Links: [sections]
   Featured Videos: [count]
   Product Recs: [products]
```

Missing sections = verify topic mapping exists in `blog-topic-product-mapping.json`

## Support

**Framework questions?** → See `.claude/skills/soft-conversion/SKILL.md`
**Mapping changes?** → Edit `data/blog-topic-product-mapping.json`
**Script changes?** → Edit `scripts/generate_blog_posts.js`
**Full details?** → Read `SOFT_CONVERSION_BLOG_INTEGRATION.md`

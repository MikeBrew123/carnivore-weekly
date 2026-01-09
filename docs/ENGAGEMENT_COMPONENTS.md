# Engagement Components Usage Guide

## Overview
Three plug-and-play components for user engagement. All components connect to Supabase and include spam prevention via browser fingerprinting.

---

## 1. Newsletter Signup

**Purpose:** Email list building with double opt-in

**File:** `public/components/newsletter-signup.html`

### Usage

```html
<!-- Standard placement (homepage, blog landing) -->
<div class="newsletter-signup" data-source="homepage">
    <!-- Component loads automatically -->
</div>

<!-- Compact variant (sidebar, footer) -->
<div class="newsletter-signup newsletter-signup--compact" data-source="blog_footer">
    <!-- Component loads automatically -->
</div>
```

### Data Attributes

- `data-source`: Required. Tracks signup location
  - Values: `homepage`, `blog_footer`, `calculator`, `wiki`, `manual`

### Features

- Email validation
- Duplicate prevention
- Confirmation token generation (ready for email verification)
- Success/error states
- Mobile responsive

### Supabase Table

`newsletter_subscribers`
- Stores email, source, confirmation_token
- Double opt-in flow ready (send email with confirmation link)
- Unsubscribe tokens pre-generated

### Integration

1. Include component HTML in page
2. Component auto-initializes on page load
3. Supabase ANON key embedded (public read/write via RLS)
4. **TODO:** Send confirmation email via N8N webhook

---

## 2. Feedback Modal (Replaces Google Form)

**Purpose:** Capture user content requests and feedback

**Files:**
- `public/components/feedback-modal.html`
- `public/js/feedback-modal.js`

### Usage

```html
<!-- Add to every page (appears as floating button) -->
<body>
    <!-- Your page content -->

    <!-- Feedback modal (include at end of body) -->
    <!-- Component auto-loads from feedback-modal.html -->
</body>
```

### Features

- Floating action button (fixed bottom-right)
- Modal form with 10-1000 char limit
- Optional email for follow-up
- Rate limiting (1 submission per minute per browser)
- Browser fingerprint spam prevention
- Success/error states
- Mobile responsive

### Supabase Table

`content_feedback`
- Stores request_text, email (optional), fingerprint
- Status workflow: `new` → `reviewed` → `in_progress` → `completed` → `declined`
- Agents query for `status = 'new'` to see trending requests

### Integration

1. Include component HTML once per page
2. Include script: `<script src="/js/feedback-modal.js" defer></script>`
3. Floating button appears automatically
4. **TODO:** N8N webhook to notify on new feedback

---

## 3. Post Reactions (Thumbs Up/Down)

**Purpose:** Blog post helpfulness voting

**Files:**
- `public/components/post-reactions.html`
- `public/js/post-reactions.js`

### Usage

```html
<!-- Add at end of blog post (before footer) -->
<article class="post-content">
    <!-- Blog post content -->
</article>

<div class="post-reactions" data-post-slug="pcos-hormones">
    <!-- Component loads automatically -->
</div>
```

### Data Attributes

- `data-post-slug`: Required. Blog post identifier (without date prefix)
  - Example: `pcos-hormones` (not `2025-12-30-pcos-hormones`)

### Features

- Thumbs up/down buttons with counts
- One reaction per browser (via fingerprint)
- LocalStorage prevents duplicate UI
- Live count updates from Supabase view
- Thank you message after voting
- Mobile responsive

### Supabase Table

`post_reactions`
- Stores post_slug, reaction_type, fingerprint
- UNIQUE constraint: One reaction per fingerprint per post
- View: `v_post_reaction_counts` for aggregated data

### Agent Usage

Agents can query popular content:
```sql
SELECT post_slug, thumbs_up, thumbs_down, approval_percentage
FROM v_post_reaction_counts
WHERE total_reactions > 10
ORDER BY approval_percentage DESC
LIMIT 10;
```

### Integration

1. Include component HTML in blog post template
2. Set `data-post-slug` to match blog filename (without date)
3. Include script: `<script src="/js/post-reactions.js" defer></script>`
4. Component auto-initializes and loads counts

---

## Installation Checklist

### For New Blog Posts

```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="/css/global.css">
    <link rel="stylesheet" href="/css/blog-post.css">
</head>
<body>
    <article class="post-content">
        <!-- Blog post content -->

        <!-- Related content (auto-injected) -->
        <section class="related-content" data-content-type="blog" data-content-id="post-slug"></section>

        <!-- Post reactions -->
        <div class="post-reactions" data-post-slug="post-slug"></div>
    </article>

    <!-- Feedback modal (floating button) -->
    <!-- Load from /components/feedback-modal.html -->

    <script src="/js/related-content.js" defer></script>
    <script src="/js/post-reactions.js" defer></script>
    <script src="/js/feedback-modal.js" defer></script>
</body>
</html>
```

### For Homepage

```html
<!-- Newsletter signup -->
<div class="newsletter-signup" data-source="homepage"></div>

<!-- Feedback modal -->
<!-- Load from /components/feedback-modal.html -->
```

### For Wiki

```html
<!-- Newsletter signup (sidebar or bottom) -->
<div class="newsletter-signup newsletter-signup--compact" data-source="wiki"></div>

<!-- Feedback modal -->
<!-- Load from /components/feedback-modal.html -->
```

---

## Spam Prevention

All components use browser fingerprinting:

```javascript
function generateFingerprint() {
    const data = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset()
    ].join('|');

    // Simple hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'fp_' + Math.abs(hash).toString(36);
}
```

**Rate Limiting:**
- Newsletter: Duplicate email prevented by DB constraint
- Feedback: 1 submission per minute (localStorage)
- Reactions: One per post per fingerprint (DB constraint + localStorage)

---

## Analytics Queries

### Newsletter Growth

```sql
SELECT
    DATE(subscribe_date) as date,
    source,
    COUNT(*) as signups,
    COUNT(*) FILTER (WHERE confirmation_status = 'confirmed') as confirmed
FROM newsletter_subscribers
WHERE subscribe_date > NOW() - INTERVAL '30 days'
GROUP BY date, source
ORDER BY date DESC;
```

### Content Requests Trending

```sql
SELECT
    request_text,
    email,
    submitted_at,
    status
FROM content_feedback
WHERE status = 'new'
ORDER BY submitted_at DESC
LIMIT 20;
```

### Top Performing Posts

```sql
SELECT
    post_slug,
    thumbs_up,
    thumbs_down,
    approval_percentage,
    total_reactions
FROM v_post_reaction_counts
WHERE total_reactions >= 5
ORDER BY approval_percentage DESC, total_reactions DESC
LIMIT 15;
```

---

## TODOs

### Email Automation (N8N)

1. **Newsletter confirmation email:**
   - Trigger: New row in `newsletter_subscribers`
   - Send: Confirmation link with token
   - Update: Set `confirmation_status = 'confirmed'` on click

2. **Feedback notification:**
   - Trigger: New row in `content_feedback`
   - Send: Email/Slack notification to team
   - Include: request_text, email (if provided)

### Agent Integration

**Chloe (Community Scout):**
- Query `content_feedback` weekly for trending topics
- Identify common themes in requests
- Report in "Community Pulse" section

**Content Writers:**
- Check `v_post_reaction_counts` for low-performing posts
- Prioritize topics with most feedback requests
- Reference related content via `content_topics` table

---

## Deployment Steps

1. **Apply Migration 009** (engagement tables)
   - Via Supabase dashboard or CLI
   - Verify tables exist with correct RLS policies

2. **Deploy Components**
   - Upload all files to production
   - Test each component on staging first

3. **Add to Templates**
   - Blog post template: reactions + related content
   - Homepage: newsletter signup
   - All pages: feedback modal

4. **Setup N8N Workflows**
   - Newsletter confirmation emails
   - Feedback notifications

5. **Monitor Analytics**
   - Track signup conversion rates
   - Review feedback requests weekly
   - Analyze post reaction patterns

---

## Support

**Component not working?**
1. Check browser console for errors
2. Verify Supabase tables exist (migration 009)
3. Check RLS policies allow public INSERT
4. Confirm `data-*` attributes are set correctly

**Need to customize?**
- Colors: Update CSS variables in `global.css`
- Text: Edit component HTML directly
- Behavior: Modify JavaScript in `/js/` files

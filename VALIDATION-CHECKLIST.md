# Blog Post Validation Checklist

**MANDATORY: Run before EVERY blog post deployment**

This checklist MUST be completed for all blog posts before they go live. NO EXCEPTIONS.

## 1. Copy Editor Validation (Humanization)

**Run:** `/copy-editor` skill OR manual check

**Requirements:**
- [ ] Zero em-dashes (—) found
- [ ] No AI tells: delve, robust, leverage, navigate, crucial, realm, landscape, utilize
- [ ] Contractions used naturally (don't, can't, won't, you're, it's)
- [ ] Varied sentence lengths (mix short and long)
- [ ] Sounds conversational when read aloud
- [ ] Grade 8-10 reading level
- [ ] Specific examples (not generic platitudes)

**Command to check:**
```bash
grep -n "—\|delve\|robust\|leverage\|navigate\|crucial\|realm\|landscape\|utilize" public/blog/POST.html
# Should return NOTHING
```

## 2. SEO Validation

**Run:** `/seo-validator` skill OR manual check

**Requirements:**
- [ ] Meta description present and 150-160 characters
- [ ] Title tag 50-60 characters
- [ ] Canonical URL correct (no broken `.html` endings)
- [ ] Keywords in meta tags
- [ ] OG tags complete (title, description, image, url)
- [ ] Twitter card tags present
- [ ] Schema markup valid (Article type with author, date)
- [ ] Single H1 tag
- [ ] Proper heading hierarchy (h1→h2→h3, no skips)
- [ ] All images have alt text

**Command to check:**
```bash
# Check meta description
grep 'meta name="description" content=""' public/blog/POST.html
# Should return NOTHING (empty descriptions are bad)

# Check canonical URL
grep 'rel="canonical".*\.html"' public/blog/POST.html
# Should contain proper slug

# Count H1 tags
grep -o '<h1' public/blog/POST.html | wc -l
# Should return exactly 1
```

## 3. Brand Compliance

**Run:** `/carnivore-brand` skill OR manual check

**Requirements:**
- [ ] Fonts: Libre Baskerville (headings), Source Sans 3 (body)
- [ ] Google Fonts link present in <head>
- [ ] Colors match brand (#d4a574 tan, #ffd700 gold, #1a120b text)
- [ ] Tone direct and clear (no excessive praise)
- [ ] Evidence-based claims
- [ ] Professional but accessible voice
- [ ] No marketing hype without substance

**Command to check:**
```bash
# Check Google Fonts
grep "fonts.googleapis.com" public/blog/POST.html
# Should return fonts link

# Check blog-post.css
grep "blog-post.css" public/blog/POST.html
# Should return stylesheet link
```

## 4. Frontend Design Quality

**Run:** `/frontend-design` skill OR visual inspection

**Requirements:**
- [ ] blog-post.css linked
- [ ] Google Fonts loaded
- [ ] `<div class="post-content">` wrapper present
- [ ] Proper spacing (not cramped)
- [ ] Mobile responsive
- [ ] No layout breaks
- [ ] Images sized appropriately
- [ ] No horizontal scroll on mobile

## 5. Visual Validation (Accessibility & Performance)

**Run:** `/visual-validator` skill for comprehensive checks

**Requirements:**
- [ ] Color contrast WCAG 2.1 AA compliant
- [ ] No dark text on dark backgrounds
- [ ] All form inputs have labels
- [ ] Heading hierarchy valid
- [ ] Images have meaningful alt text
- [ ] Links have descriptive text (not "click here")
- [ ] Page loads < 3 seconds
- [ ] No console errors

**Command to check:**
```bash
# Run contrast validator (CRITICAL for blog posts)
node ~/.claude/skills/visual-validator/test-contrast-comprehensive.js http://localhost:8000/public/blog/POST.html
```

## 6. Internal Backlinks

**CRITICAL:** Every blog post should link to 2-3 related posts

**Requirements:**
- [ ] At least 2 internal backlinks to other blog posts
- [ ] Links use descriptive anchor text
- [ ] Links relevant to content
- [ ] No broken internal links

**Where to add backlinks:**
- Within content paragraphs (contextual)
- Related content section (automatic via related-content.js)
- "You might also like" inline references

## 7. Content Completeness

**Requirements:**
- [ ] 800-1200 words (for full posts)
- [ ] TL;DR box with 3-5 bullet points
- [ ] Actionable takeaways
- [ ] No placeholder content ("Full content will be generated...")
- [ ] Author bio present
- [ ] Post date present
- [ ] Related wiki links work

## 8. Technical Validation

**Requirements:**
- [ ] HTML validates (no broken tags)
- [ ] All scripts load without errors
- [ ] Post reactions component present
- [ ] Related content component present
- [ ] Mobile navigation works
- [ ] No 404 links

**Command to check:**
```bash
# Check for broken internal links
grep -o 'href="/[^"]*"' public/blog/POST.html | sed 's/href="//;s/"$//' | while read url; do
  [ -f "public${url}" ] || echo "BROKEN: ${url}"
done
```

## DEPLOY DECISION

### ✅ PASS (Safe to Deploy)
All checkboxes above are checked. No critical issues found.

### ❌ FAIL (Fix Before Deploy)
ANY of these issues present:
- Empty meta description
- Broken canonical URL
- Missing Google Fonts
- AI tells present
- Em-dashes found
- No contractions
- Empty or placeholder content
- Broken internal links
- Missing blog-post.css
- Missing post-content wrapper
- Contrast issues (dark on dark text)

## Automation Integration

Add to `scripts/check_scheduled_posts.py`:

```python
def validate_generated_post(html_file, post):
    """Run all validators on generated post before marking as published"""

    issues = []

    # 1. Check for empty meta description
    with open(html_file) as f:
        content = f.read()
        if 'content=""' in content:
            issues.append("Empty meta description")

        # 2. Check canonical URL
        if 'rel="canonical" href="https://carnivoreweekly.com/blog/.html"' in content:
            issues.append("Broken canonical URL")

        # 3. Check AI tells
        ai_tells = ['delve', 'robust', 'leverage', 'navigate', 'crucial', 'realm', 'landscape', 'utilize']
        for tell in ai_tells:
            if tell.lower() in content.lower():
                issues.append(f"AI tell found: {tell}")

        # 4. Check Google Fonts
        if 'fonts.googleapis.com' not in content:
            issues.append("Missing Google Fonts")

        # 5. Check blog-post.css
        if 'blog-post.css' not in content:
            issues.append("Missing blog-post.css")

        # 6. Check post-content wrapper
        if '<div class="post-content">' not in content:
            issues.append("Missing post-content wrapper")

    return issues
```

## Quick Validation Command

Run all checks at once:

```bash
#!/bin/bash
POST="public/blog/2026-01-27-coffee-carnivore-practical-answer.html"

echo "🔍 Validating: $POST"
echo ""

# AI tells
echo "1️⃣ Checking for AI tells..."
grep -n "—\|delve\|robust\|leverage\|navigate\|crucial\|realm\|landscape\|utilize" "$POST" && echo "❌ FOUND AI TELLS" || echo "✅ No AI tells"

# Meta description
echo "2️⃣ Checking meta description..."
grep 'meta name="description" content=""' "$POST" && echo "❌ EMPTY META DESCRIPTION" || echo "✅ Meta description present"

# Canonical URL
echo "3️⃣ Checking canonical URL..."
grep 'rel="canonical".*/.html"' "$POST" && echo "❌ BROKEN CANONICAL" || echo "✅ Canonical URL valid"

# Google Fonts
echo "4️⃣ Checking Google Fonts..."
grep "fonts.googleapis.com" "$POST" > /dev/null && echo "✅ Google Fonts loaded" || echo "❌ MISSING GOOGLE FONTS"

# blog-post.css
echo "5️⃣ Checking blog-post.css..."
grep "blog-post.css" "$POST" > /dev/null && echo "✅ blog-post.css linked" || echo "❌ MISSING blog-post.css"

# post-content wrapper
echo "6️⃣ Checking post-content wrapper..."
grep '<div class="post-content">' "$POST" > /dev/null && echo "✅ post-content wrapper present" || echo "❌ MISSING post-content wrapper"

# H1 count
echo "7️⃣ Checking H1 count..."
h1_count=$(grep -o '<h1' "$POST" | wc -l | tr -d ' ')
[ "$h1_count" -eq 1 ] && echo "✅ Single H1 tag" || echo "❌ Multiple or missing H1 tags"

echo ""
echo "✅ Validation complete"
```

## When to Run

- **During development:** Before marking post as "ready"
- **Before commit:** As part of git pre-commit hook
- **Before deploy:** As final check in CI/CD pipeline
- **After automation:** When check_scheduled_posts.py generates content

## Responsibility

**Who validates:**
- Manual posts: Content creator
- AI-generated posts: Automation script MUST validate before publishing
- Weekly updates: Run validator on all new posts

**NO EXCEPTIONS.** Invalid posts should never reach production.

# 📊 Carnivore Weekly - Status Dashboard

**Last Updated:** 2025-12-29
**Current Focus:** Phase A - AI Summaries + Auto-Tagging

---

## 🤖 AUTOMATION INSTRUCTION
**When you say "where are we" or "good morning" → I read this file and give you quick status + next steps. No explanations needed.**

---

## 🎯 Overall Progress

```
Phase 0 (Infrastructure)  ████████████████████ 100% ✅ COMPLETE
Phase A (AI Summaries)    ░░░░░░░░░░░░░░░░░░░░  0%  ⏳ READY TO START
Phase B (Schema.org)      ░░░░░░░░░░░░░░░░░░░░  0%  📋 Planned
Phase C (Wiki Search)     ░░░░░░░░░░░░░░░░░░░░  0%  📋 Planned
```

---

## ✅ Phase 0: Infrastructure (COMPLETE)

**Status:** Fully Deployed ✅

**What Was Done:**
- ✅ Global CSS architecture (`public/style.css`)
- ✅ Feedback button on all 7 pages + 3 templates
- ✅ Subtitle centering standardized
- ✅ Header height fixed (min-height: 330px)
- ✅ LMNT affiliate ad converted to image-based
- ✅ All changes synced to master templates
- ✅ questionnaire.html fixed (was missing feedback button)
- ✅ W3C validator skill created
- ✅ Page comparator skill created

**Live Verification:**
- 🌐 All 7 public pages synchronized
- 🌐 All 3 master templates updated
- 🌐 Site deployed and live at carnivoreweekly.com

**Outstanding Issues from Phase 0:**
- ⚠️ Line 6 in `public/index.html` - W3C meta tag error
  - Current: `<meta name='impact-site-verification' value='...'>`
  - Should be: `<meta name='impact-site-verification' content='...'>`
  - Fix time: 2 minutes (awaiting approval)

---

## ⏳ Phase A: AI Summaries + Auto-Tagging (READY TO START)

**Status:** Not Started | **Priority:** 🔴 CRITICAL | **Impact:** ⭐⭐⭐⭐⭐

**Goal:** Transform from link aggregator to editorial curator

**What Needs to Happen:**

### Step 1: Modify `scripts/content_analyzer.py`
```python
# Add two new functions:
- generate_video_summaries(videos, client)  → 2-3 sentence summaries
- auto_tag_videos(videos, client)           → 2-3 topic tags per video

# Integrate into run_analysis() pipeline after sentiment analysis
```

**Files:** `scripts/content_analyzer.py`
**Estimated Time:** 1.5 hours

### Step 2: Modify `templates/index_template.html`
```html
<!-- Add CSS for .video-summary and .video-tags (around line 400) -->
<!-- Update video card loop to display summaries + tags (line 997-1055) -->
<!-- Replace {{ video.why_notable }} with {{ video.summary }} -->
```

**Files:** `templates/index_template.html`
**Estimated Time:** 1 hour

### Step 3: Test & Deploy
```bash
python3 scripts/content_analyzer.py    # Generates summaries
python3 scripts/generate_pages.py      # Regenerates homepage
# Validate with skills
git add . && git commit && git push
```

**Files:** `data/analyzed_content.json` (auto-updated), `public/index.html` (regenerated)
**Estimated Time:** 2 hours

**Total Phase A Time:** 4-5 hours (1 work session)

**Expected Outcome:**
- 40+ videos with original 2-3 sentence summaries
- Each video tagged with 2-3 relevant topics
- Content ratio: 50% links, 50% original text (vs 80/20 now)
- Foundation for Phase C filtering

---

## 📋 Phase B: Schema.org Markup (NEXT AFTER PHASE A)

**Status:** Planned | **Priority:** 🟡 HIGH | **Impact:** ⭐⭐⭐⭐

**Goal:** Tell search engines this is a WebApplication, not a link farm

**What Needs to Happen:**
- Add WebApplication schema to `public/calculator.html`
- Add FAQPage schema to `public/wiki.html`
- Add Article schema to homepage
- Add VideoObject schema to each video (now with summaries!)

**Files:**
- `public/calculator.html`
- `public/wiki.html`
- `templates/index_template.html`

**Estimated Time:** 2-3 hours

**Expected Outcome:**
- Google sees calculator/wiki as interactive tools
- Rich snippets enabled
- Video summaries appear in structured data

---

## 📋 Phase C: Wiki Search + Tag Filtering (FINAL)

**Status:** Planned | **Priority:** 🟢 MEDIUM | **Impact:** ⭐⭐⭐

**Goal:** Improve UX and reduce bounce rate

**Features:**
1. Wiki search box (filter sections in real-time)
2. Tag-based filtering on homepage ("Show all #cholesterol videos")
3. Creator filtering ("Show all Dr. Chaffee videos")

**Files:**
- `public/wiki.html` - Add search box
- `templates/index_template.html` - Add filter UI

**Estimated Time:** 3-4 hours

**Expected Outcome:**
- Wiki becomes searchable and navigable
- Videos filterable by topic
- Better engagement metrics

---

## 📁 Site Architecture Quick Reference

### Static Pages (Manual Edits)
These files are edited directly and NOT auto-generated:
- `public/about.html` - Edit directly
- `public/calculator.html` - Edit directly
- `public/questionnaire.html` - Edit directly
- `public/wiki.html` - Edit directly

### Auto-Generated Pages (Use Templates)
These files are generated from Jinja2 templates. **Always edit the template, not the live page:**
- `public/index.html` ← `templates/index_template.html`
- `public/archive.html` ← `templates/archive_template.html`
- `public/channels.html` ← `templates/channels_template.html`

### Global Assets
- `public/style.css` - Global stylesheet (259 lines)
- `public/lmnt-box.avif` - LMNT affiliate ad image
- `public/style.css` - Referenced in all 10 files (7 pages + 3 templates)

### Key Scripts
- `scripts/content_analyzer.py` - Analyzes YouTube content, generates summaries (Phase A)
- `scripts/generate_pages.py` - Regenerates index.html, archive.html, channels.html from templates
- `data/analyzed_content.json` - Weekly video analysis (updated by content_analyzer.py)

---

## 🛠️ Skills & Tools Available

### Custom Skills Created This Session
1. **Page Comparator** (`~/.claude/skills/page-comparator/`)
   - Visual comparison of pages using Playwright + Pixelmatch
   - Usage: Compare homepage to calculator page, etc.

2. **W3C Validator** (`~/.claude/skills/w3c-validator/`)
   - HTML standard validation using W3C Nu API
   - Checks for meta tag errors, semantic HTML, etc.

### Brand Skills (Use for Validation)
- `/carnivore-brand` - Validates design consistency
- `/copy-editor` - Checks for AI tells, readability
- `/visual-validator` - Tests actual rendering in browser
- `/content-integrity` - Ensures automated fixes don't change meaning
- `/seo-validator` - Verifies SEO compliance
- `/form-optimization` - For questionnaire form improvements

---

## 📋 Quick Command Reference

### Verify All Changes
```bash
# Check feedback button on all pages
grep -c "feedback-side" public/*.html

# Check subtitle centering
grep -c "header p {" public/*.html

# Verify global CSS reference
grep -l "style.css" public/*.html
```

### Run Validators
```bash
# Check W3C compliance
node ~/.claude/skills/w3c-validator/validate.js public/index.html

# Check brand standards
claude /carnivore-brand public/index.html

# Check for AI tells
claude /copy-editor public/index.html

# Visual validation
claude /visual-validator public/index.html
```

### Deploy Changes
```bash
git add .
git commit -m "Your message here"
git push origin main
# Auto-deploys via Cloudflare
```

---

## 📚 Documentation Files

| File | Purpose | Last Updated |
|------|---------|--------------|
| `STATUS_DASHBOARD.md` | **← You are here** - Quick status overview | 2025-12-29 |
| `IMPLEMENTATION_LOG.md` | Detailed technical reference (527 lines) | 2025-12-29 |
| `CHANGES_CHECKLIST.md` | File sync verification matrix | 2025-12-29 |
| `public/upgrade-plan.html` | Interactive HTML upgrade plan | 2025-12-29 |

---

## 🎯 Next Steps (When You Return)

### If Continuing from Phase A:
```
1. Open this file (STATUS_DASHBOARD.md)
2. See "Phase A" section above
3. Follow the 3-step implementation
4. Estimated time: 4-5 hours
```

### If Checking Current Status:
```
1. "Where are we?" → Read the progress bars at top
2. Check STATUS_DASHBOARD.md for what's done/what's next
3. Review outstanding issues (if any)
4. Jump to relevant phase section
```

### If You Forgot Site Architecture:
```
1. See "Site Architecture Quick Reference" section above
2. Remember: Static pages edited directly, auto-generated pages use templates
3. Always modify templates for index/archive/channels
```

---

## 💡 Pro Tips

**When making CSS changes:**
- Edit `public/style.css` for global changes
- Add local rules to page's `<style>` section if needed (higher specificity)

**When updating the homepage:**
- Edit `templates/index_template.html` NOT `public/index.html`
- Run `python3 scripts/generate_pages.py` to regenerate

**When validating:**
- Always run multiple skills: copy-editor + carnivore-brand + visual-validator
- Order matters: Code validation first, then visual, then deploy

---

## 🚨 Outstanding Issues

### Issue #1: W3C Meta Tag (Line 6 of index.html)
**Severity:** ⚠️ High
**File:** `public/index.html`
**Current:** `<meta name='impact-site-verification' value='...'>`
**Fix:** Change `value=` to `content=`
**Status:** Ready to fix (2 min)

---

**Dashboard Version:** 1.0
**Last Generated:** Dec 29, 2025
**Maintained By:** Claude Code

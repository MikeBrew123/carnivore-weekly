# ✅ PRE-AUTOMATION CHECKLIST - Morning of December 30, 2025

**Run this checklist BEFORE running automation tomorrow morning**

---

## 🔍 Quick Verification (5 minutes)

```bash
# 1. Verify feedback button on ALL 7 pages
grep -c "feedback-side" public/*.html
# Expected output: 1 1 1 1 1 1 1 (seven files, each with 1 match)

# 2. Verify subtitle centering on ALL 7 pages
grep -c "header p {" public/*.html
# Expected output: 1 1 1 1 1 1 1 (seven files, each with 1 match)

# 3. Verify global CSS is referenced
grep -l "style.css" public/*.html
# Expected output: (all 7 files listed)

# 4. Verify templates have feedback button
grep -c "feedback-side" templates/*.html
# Expected output: 1 1 1 (three templates, each with 1 match)

# 5. Verify templates have centering
grep -c "header p {" templates/*.html
# Expected output: 1 1 1 (three templates, each with 1 match)
```

---

## ✅ Run Validators (2 minutes each)

**Test W3C compliance on index.html:**
```bash
node ~/.claude/skills/w3c-validator/validate.js public/index.html
# Should show: PASS (or only warnings, no errors)
```

**Test brand standards on index.html:**
```bash
claude /carnivore-brand public/index.html
# Should show: All colors, fonts, spacing correct
```

**Test copy quality on index.html:**
```bash
claude /copy-editor public/index.html
# Should show: No AI tells, professional voice
```

---

## 🚨 Critical Issues to Watch For

If ANY of these fail, **DO NOT RUN AUTOMATION**:

- ❌ feedback-side count is NOT 7 for public files
- ❌ header p count is NOT 7 for public files
- ❌ Templates missing feedback-side or header p
- ❌ W3C validator shows ERRORS (warnings OK)
- ❌ style.css not referenced in files

---

## 🚀 If Everything Passes

```bash
# You're good to go! Run automation:
python3 scripts/content_analyzer.py
python3 scripts/generate_pages.py
# Verify public/index.html updated with new content
```

---

## ⚠️ What Automation Will Do Tomorrow

1. **Run content_analyzer.py** - Analyzes new YouTube videos, creates analyzed_content.json
2. **Run generate_pages.py** - Regenerates:
   - public/index.html (from index_template.html)
   - public/archive.html (from archive_template.html)
   - public/channels.html (from channels_template.html)

**IMPORTANT:** The templates control these files. If templates are wrong, all three files will be wrong.

---

## 📋 What We've Verified

**Phase 0 (Infrastructure):**
- ✅ Global CSS architecture ready
- ✅ Feedback button on all pages + templates
- ✅ Subtitle centering fixed
- ✅ Header heights standardized
- ✅ LMNT ad converted to image-based
- ✅ W3C meta tag error FIXED

**Static Pages (won't be touched by automation):**
- ✅ about.html
- ✅ calculator.html
- ✅ questionnaire.html
- ✅ wiki.html

**Auto-Generated Pages (will be regenerated from templates):**
- ✅ index.html template ready
- ✅ archive.html template ready
- ✅ channels.html template ready

---

## 🎯 Expected Outcome

After automation runs successfully:
- ✅ New videos added to homepage
- ✅ New archive entry created
- ✅ All Phase 0 improvements preserved
- ✅ Feedback button on new content
- ✅ Centered subtitles on new content
- ✅ Global CSS applied to new content

---

**Duration:** ~10 minutes total
**Risk Level:** LOW (Phase 0 is stable)
**Confidence Level:** HIGH ✅

If you see any issues, stop and message me before running automation.

# Structural Validator Agent Specification

## Purpose
Audit HTML/template structural integrity to catch design consistency issues BEFORE deployment. Prevents duplicate headers, missing required sections, conflicting styles, and broken relative paths.

## Why It Exists
Our existing validators (copy-editor, brand, humanization, visual, W3C) check **content quality** but miss **structural problems**:
- Duplicate header/navigation sections
- Conflicting inline styles overriding CSS classes
- Missing required headers on key pages
- Wrong relative image paths
- Logo sizing/positioning inconsistencies

**Result:** Blog pages deployed with broken styling, duplicate headers, and missing branding.

---

## What It Validates

### 1. Header Consistency (CRITICAL)
**Check:** No duplicate header sections on same page
```
✅ PASS: One <header> tag at top, then separate <nav>
❌ FAIL: Two <header> tags, or header inside nav, or nav inside header
```

**Rule:** Each page should have:
- Exactly ONE `<header>` tag (contains site branding)
- Exactly ONE `<nav>` tag (contains navigation links)
- Header comes BEFORE nav
- No nesting of header/nav

### 2. Required Headers (CRITICAL)
**Check:** All key pages have site header with proper structure
```
Pages that MUST have header:
✅ public/index.html
✅ public/blog.html
✅ public/blog/*.html (all individual posts)
✅ public/archive.html
✅ public/channels.html
```

**Structure each header must have:**
```html
<header>
    <div class="container">
        <img src="[relative-path]/images/logo.png" class="logo">
        <h1>CARNIVORE WEEKLY</h1>
        <p class="subtitle">The Meat-Eater's Digest</p>
        <p class="tagline">Premium Cuts of Carnivore Content</p>
    </div>
</header>
```

### 3. Navigation Consistency
**Check:** Navigation structure matches across all pages
```
✅ PASS: All pages use <nav class="nav-menu"> with same links
❌ FAIL: Different nav structures on different pages
❌ FAIL: Inline-styled nav instead of using .nav-menu class
```

### 4. Logo Path Consistency (CRITICAL)
**Check:** Logo paths are correct for page location
```
Pages in /public/:
✅ images/logo.png (relative from /public/)

Pages in /public/blog/:
✅ ../../images/logo.png (relative from /public/blog/)

Pages in /public/archive/:
✅ ../images/logo.png (relative from /public/archive/)
```

**Rule:** Never use absolute paths. Never use inline styles to override `.logo` CSS class positioning.

### 5. CSS Class vs Inline Style Conflicts
**Check:** No inline styles overriding CSS class definitions
```
❌ FAIL: <img class="logo" style="position: absolute; top: 10px;">
✅ PASS: <img class="logo"> (let CSS handle styling)

❌ FAIL: <header style="background: #d4a574;">
✅ PASS: <header> (let CSS handle styling)
```

**Rule:** If an element has a CSS class, don't override it with inline styles. Let the CSS work.

### 6. Container Structure
**Check:** Templates use proper container nesting
```
✅ PASS: <header><div class="container">...</div></header>
✅ PASS: <nav>...</nav>
✅ PASS: <div class="container">content</div>

❌ FAIL: <div class="post-container"><header>...</header>...
(header should be OUTSIDE post-container, not inside)
```

### 7. Relative Path Validity
**Check:** All image/link paths are correct for file location
```
Template: blog_post_template.html (in /templates/, generates to /public/blog/)
Generated file: /public/blog/2025-01-05-slug.html

Images:
✅ ../../images/logo.png (resolves to /public/images/logo.png)
✅ ../../style.css (resolves to /public/style.css)

Links:
✅ ../../index.html (resolves to /public/index.html)
✅ ../../blog.html (resolves to /public/blog.html)
```

---

## Validation Rules (In Order of Importance)

### CRITICAL (Block Deployment)
1. ❌ Duplicate header/nav on any page
2. ❌ Missing required header on key pages
3. ❌ Logo path doesn't resolve (404)
4. ❌ Inline styles conflict with CSS classes

### MAJOR (Warn, but may allow)
5. ⚠️ Inconsistent nav structure across pages
6. ⚠️ Wrong relative paths (not tested, but likely broken)
7. ⚠️ Header/nav not in correct order

### MINOR (Informational)
8. ℹ️ Logo sizing might not match brand standards
9. ℹ️ Header content differs from main site

---

## Implementation

### When to Run
**Automatically (in run_weekly_update.sh):**
- AFTER templates are updated
- BEFORE code generation runs
- Blocks deployment if CRITICAL issues found

**Manually:**
```bash
# Check specific page
python3 scripts/validate_structure.py public/blog/2025-01-05-slug.html

# Check all pages
python3 scripts/validate_structure.py public/

# Check templates before generation
python3 scripts/validate_structure.py templates/
```

### What It Returns
```
VALIDATION REPORT: Structural Integrity Check
===============================================

File: public/blog/2025-12-31-welcome.html
Status: ❌ FAILED

CRITICAL ISSUES (blocks deployment):
  [1] Duplicate header found:
      - Header #1 at line 208: <header style="background: linear-gradient...">
      - Header #2 at line 217: (wrapped in .post-container)
      Fix: Remove inline-styled header, use standard <header> tag

  [2] Logo path conflict:
      - Line 210: src="../../images/logo.png" class="logo" style="position: absolute; top: 10px; right: 0;"
      - Inline style overrides CSS .logo class definition
      Fix: Remove inline styles, let CSS handle logo positioning

MAJOR ISSUES (fix recommended):
  [3] Navigation inconsistency:
      - Found inline-styled <nav> instead of <nav class="nav-menu">
      Fix: Use standard nav structure with .nav-menu class

MINOR ISSUES (informational):
  [4] Header content doesn't match main site
      - Missing "update-date" paragraph
      - Using different colors

Files checked: 1
Status: FAILED
Recommendation: Fix CRITICAL issues before deployment
```

---

## Integration with Workflow

### Pre-Deployment Gate (run_weekly_update.sh)
```bash
# Step 1: Validate template structure
echo "Running structural validation..."
if ! python3 scripts/validate_structure.py templates/; then
    echo "❌ Template validation FAILED. Fix before deploying."
    exit 1
fi

# Step 2: Generate pages
python3 scripts/generate_blog_pages.py

# Step 3: Validate generated pages
echo "Validating generated pages..."
if ! python3 scripts/validate_structure.py public/blog/; then
    echo "❌ Generated page validation FAILED. Fix before deploying."
    exit 1
fi

# Step 4: Content validators (copy-editor, brand, visual, etc.)
# ... existing validation ...

# Step 5: Deploy
git add .
git commit ...
```

---

## Success Criteria

**Structural validator is working when:**
- ✅ Catches duplicate headers
- ✅ Detects missing headers on required pages
- ✅ Identifies logo path errors
- ✅ Flags inline style conflicts with CSS
- ✅ Prevents broken pages from deploying
- ✅ Provides clear actionable fixes
- ✅ Runs automatically in pre-flight checks

---

## Example: How This Prevents Today's Problem

**Scenario:** I incorrectly add conflicting header to blog template

**Old Way (No Validator):**
1. I add header with inline styles ❌
2. I regenerate pages ❌
3. Pages deploy with broken header ❌
4. User complains ❌
5. I fix it manually ❌

**New Way (With Validator):**
1. I add header with inline styles ❌
2. Structural validator runs on templates ✅
3. **Validator catches:** "Line 210: Inline style 'position: absolute' conflicts with CSS .logo class"
4. **Validator blocks generation** ✅
5. **I'm forced to fix template BEFORE generation** ✅
6. Pages deploy correctly ✅
7. Never reaches production with broken styling ✅

---

## Files Affected
- Create: `scripts/validate_structure.py` (new validator)
- Update: `run_weekly_update.sh` (add validation gate)
- Create: `.structural-validation-rules.json` (rules definition)
- Update: `VALIDATION_CHECKLIST.md` (include structural validation)

---

## Owner & Maintenance
- **Owner:** Structural Validator Agent (runs automatically)
- **Maintenance:** Update `.structural-validation-rules.json` if structure standards change
- **Testing:** Run manually on templates after each template change

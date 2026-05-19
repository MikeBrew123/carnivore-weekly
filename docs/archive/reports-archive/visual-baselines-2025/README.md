# Visual Baselines Directory

**Purpose:** Store and manage baseline screenshots for form validation and visual regression testing.

**Manager:** Casey (Visual Director & QA)

**Last Updated:** January 3, 2026

---

## Directory Structure

```
visual_baselines/
├── README.md (this file)
├── form-desktop-baseline-2026-01-03.png (CURRENT)
├── form-mobile-baseline-2026-01-03.png (CURRENT)
├── form-tablet-baseline-2026-01-03.png (CURRENT)
└── archive/
    ├── form-desktop-baseline-2025-12-28.png
    ├── form-mobile-baseline-2025-12-28.png
    └── ... (historical baselines)
```

---

## Baseline File Naming

**Format:** `form-[VIEWPORT]-baseline-[DATE].png`

**Examples:**
- `form-desktop-baseline-2026-01-03.png` (1400x900px)
- `form-mobile-baseline-2026-01-03.png` (375x812px)
- `form-tablet-baseline-2026-01-03.png` (768x1024px)

**Date Format:** YYYY-MM-DD (e.g., 2026-01-03)

---

## Baseline Types

### Desktop Baseline (1400x900px)
- **File:** `form-desktop-baseline-[DATE].png`
- **Viewport:** Exactly 1400x900px
- **Usage:** Desktop form validation at full width
- **Checked for:** Layout, spacing, color accuracy, font rendering

### Mobile Baseline (375x812px)
- **File:** `form-mobile-baseline-[DATE].png`
- **Viewport:** Exactly 375x812px (iPhone SE/8 dimensions)
- **Usage:** Mobile form validation, responsive check
- **Checked for:** No horizontal scroll, touch targets, stacking

### Tablet Baseline (768x1024px)
- **File:** `form-tablet-baseline-[DATE].png`
- **Viewport:** Exactly 768x1024px
- **Usage:** Tablet form validation, intermediate breakpoint
- **Checked for:** Responsive layout, spacing proportionality

---

## When to Update Baseline

**Update after:**
1. Approved CSS changes (by CEO)
2. Approved design changes
3. Successful form rebuild step completion
4. Major visual updates (documented in PR)

**Never update:**
- Unilaterally without documentation
- To hide visual regressions
- Without comparing to previous baseline

**Always document:**
- What changed and why
- Date of update
- Approval source (CEO, PR, decision log)

---

## How to Update Baseline

### Step 1: Take New Screenshots

**Desktop (1400x900px):**
```bash
npx playwright screenshot --viewport-size=1400,900 https://[URL] form-desktop-current.png
```

**Mobile (375x812px):**
```bash
npx playwright screenshot --viewport-size=375,812 https://[URL] form-mobile-current.png
```

**Tablet (768x1024px):**
```bash
npx playwright screenshot --viewport-size=768,1024 https://[URL] form-tablet-current.png
```

### Step 2: Compare to Current Baseline

**Using Mac Preview:**
1. Open current baseline: `form-desktop-baseline-[OLD-DATE].png`
2. Open new screenshot: `form-desktop-current.png`
3. Open side-by-side
4. Look for differences:
   - Layout shifts
   - Color changes
   - Font size changes
   - Spacing changes
5. Document findings

### Step 3: Move Old Baseline to Archive

```bash
# Archive the old baseline
mv form-desktop-baseline-[OLD-DATE].png archive/
mv form-mobile-baseline-[OLD-DATE].png archive/
mv form-tablet-baseline-[OLD-DATE].png archive/
```

### Step 4: Rename New Screenshots as Baseline

```bash
# Rename current screenshots to today's baseline
mv form-desktop-current.png form-desktop-baseline-[TODAY].png
mv form-mobile-current.png form-mobile-baseline-[TODAY].png
mv form-tablet-current.png form-tablet-baseline-[TODAY].png
```

### Step 5: Document the Update

Create a note in today's daily log:

```markdown
# Visual Baseline Update

**Date:** [TODAY]
**Updated by:** Casey
**Reason:** [Step X completion / CSS changes / etc.]

**Changes:**
- Description of what changed visually
- Impact on desktop/mobile/tablet
- Approval source

**Files Updated:**
- form-desktop-baseline-[TODAY].png
- form-mobile-baseline-[TODAY].png
- form-tablet-baseline-[TODAY].png

**Old Baselines Archived:**
- form-desktop-baseline-[OLD-DATE].png → archive/
- form-mobile-baseline-[OLD-DATE].png → archive/
- form-tablet-baseline-[OLD-DATE].png → archive/
```

---

## Baseline Comparison Process

### Visual Regression Check

**Every time Alex builds a new step:**

1. **Take screenshots** at exact viewport sizes
2. **Open baseline** in Preview/image viewer
3. **Open new screenshot** in another window
4. **Compare side-by-side:**
   - Is layout identical?
   - Are colors the same?
   - Is spacing the same?
   - Are fonts the same?
   - Any elements shifted or resized?

5. **Document findings:**
   - PASS: No visual drift detected
   - FAIL: Visual differences found (list them)

### If Visual Drift Detected

**If differences are INTENTIONAL (approved changes):**
- Document in daily log
- Update baseline after approval
- Archive old baseline

**If differences are UNINTENDED (regression):**
- Flag for Alex (developer)
- Describe what changed
- Request fix before approval

---

## Archive Management

**Purpose:** Keep historical record of form design iterations

**Retention:** Keep all archived baselines indefinitely (low storage cost)

**Organization:**
```
archive/
├── form-desktop-baseline-2025-12-28.png
├── form-mobile-baseline-2025-12-28.png
├── form-tablet-baseline-2025-12-28.png
├── form-desktop-baseline-2025-12-21.png
├── form-mobile-baseline-2025-12-21.png
├── form-tablet-baseline-2025-12-21.png
└── ... (more historical baselines)
```

**When to move to archive:**
- When a new baseline of the same viewport is created
- File is immediately renamed with old date
- Moved to archive/ subdirectory

---

## Current Baseline Status

**As of January 3, 2026:**

| Viewport | Baseline File | Status | Last Updated |
|----------|---------------|--------|--------------|
| Desktop (1400x900px) | form-desktop-baseline-2026-01-03.png | INITIAL | 2026-01-03 |
| Mobile (375x812px) | form-mobile-baseline-2026-01-03.png | INITIAL | 2026-01-03 |
| Tablet (768x1024px) | form-tablet-baseline-2026-01-03.png | INITIAL | 2026-01-03 |

**Note:** Initial baselines were created after Step 1 form container approval.

---

## Baseline Validation Checklist

**Before accepting a new baseline screenshot:**

- [ ] Exact viewport dimensions correct (1400x900, 375x812, 768x1024)
- [ ] Screenshot shows complete form (no cut-off content)
- [ ] Colors appear accurate (verify with color picker)
- [ ] Fonts appear correct (Playfair Display headings, Merriweather body)
- [ ] No visual glitches, overlaps, or layout issues
- [ ] No horizontal scroll visible
- [ ] Spacing looks consistent
- [ ] All elements aligned properly
- [ ] Ready to approve for deployment

---

## Tools for Baseline Management

### Taking Screenshots

**Option 1: Playwright (Recommended)**
```bash
npx playwright screenshot --viewport-size=1400,900 https://localhost:3000/form desktop.png
```

**Option 2: Browser DevTools (Manual)**
1. Open form in browser
2. Press F12 (DevTools)
3. Press Ctrl+Shift+M (Device Toolbar)
4. Set viewport: 1400x900 (or 375x812, 768x1024)
5. Press Ctrl+Shift+P
6. Type "Screenshot" → "Capture full page screenshot"

### Comparing Baselines

**Mac Preview (Built-in):**
1. Open baseline1.png
2. Open baseline2.png (opens in new window)
3. Arrange windows side-by-side
4. Compare visually

**Command Line (ImageMagick):**
```bash
# Install (if needed)
brew install imagemagick

# Compare two screenshots
compare form-desktop-baseline-2026-01-03.png form-desktop-current.png diff.png

# View diff
open diff.png
```

**Online Tool:** https://www.diffchecker.com/image-diff (upload both images)

---

## Contact & Escalation

**For baseline questions:** Casey (visual manager)
**For screenshot issues:** Alex (developer)
**For visual regressions:** Quinn (operations)
**For approval decisions:** CEO (design authority)

---

## Version History

| Date | Change | By |
|------|--------|-----|
| 2026-01-03 | Created visual baselines directory and process | Casey |
| TBD | Updated baselines post Step 1 | Casey |
| TBD | Updated baselines post Step 2 | Casey |

---

**Managed by:** Casey (Visual Director & QA)
**Last Reviewed:** January 3, 2026
**Next Review:** After Step 1 completion

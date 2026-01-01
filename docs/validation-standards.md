# Validation Standards & Quality Gates
**Last Updated:** December 31, 2025
**Owner:** Jordan (QA/Validator)
**Purpose:** Pre-deployment quality checklist - nothing ships without this

---

## **THE GATE KEEPER ROLE**

**Jordan's responsibility:** Nothing gets published without sign-off.

**Golden Rule:** If it doesn't pass validation, it doesn't go live. Period.

**Hierarchy of severity:**
- 🔴 **CRITICAL**: Must fix before deployment (breaks site, harmful content, major brand violation)
- 🟠 **HIGH**: Should fix before deployment (noticeable issues, small brand drift)
- 🟡 **MEDIUM**: Recommend fixing before deployment (minor inconsistencies)
- 🔵 **LOW**: Nice to fix (nitpicks, future improvements)

---

## **VALIDATION PIPELINE**

### **Phase 1: Content Validation (For Blog Posts)**

#### Validator 1: Copy-Editor Skill
**Purpose:** Ensure human-quality writing, no AI tells

**Checklist:**
- [ ] No em-dashes (—) found - max 1 acceptable
- [ ] No AI tell words (delve, robust, leverage, navigate, crucial, realm, landscape, utilize, facilitate)
- [ ] No opening: "It's important to note that..."
- [ ] Varied sentence lengths (short + long mix)
- [ ] Contractions used naturally (don't, can't, it's, we're)
- [ ] Direct address to reader ("you")
- [ ] Specific examples, not generic platitudes
- [ ] Reads naturally when read aloud
- [ ] Grade 8-10 reading level

**Failure Criteria:**
- 2+ em-dashes = CRITICAL
- Any AI tell words = HIGH
- All sentences same length = HIGH
- No contractions = MEDIUM
- All generic examples = MEDIUM

**Report to:** Content writers (Sarah, Marcus, Chloe)

---

#### Validator 2: Carnivore-Brand Skill
**Purpose:** Ensure voice consistency and brand alignment

**Checklist:**

**For Sarah posts:**
- [ ] Tone is educational + warm
- [ ] Evidence-based (data, sources visible)
- [ ] No marketing hype
- [ ] Specific medical/health examples
- [ ] Acknowledges complexity
- [ ] "Not a doctor" disclaimer present

**For Marcus posts:**
- [ ] Tone is direct + punchy
- [ ] Protocol/metrics focused
- [ ] Action steps clear
- [ ] High-energy but not cheesy
- [ ] Specific numbers throughout
- [ ] "Not a doctor" disclaimer present

**For Chloe posts:**
- [ ] Tone is conversational + relatable
- [ ] Community references authentic
- [ ] Humor lands naturally
- [ ] Insider perspective visible
- [ ] Personality throughout
- [ ] "Not a doctor" disclaimer present (if health claims)

**Failure Criteria:**
- Voice doesn't match persona = CRITICAL
- Excessive marketing speak = HIGH
- Missing disclaimer on health claims = CRITICAL
- No personality visible = HIGH

**Report to:** Content writers

---

#### Validator 2B: High-Risk Medical Content Detection
**Purpose:** Automatically flag content discussing medications, diagnosed conditions, or acute symptoms that requires Category 7 (strongest) medical disclaimers

**How It Works:**
1. Scans blog content for high-risk keywords:
   - Medications: "prescription", "medication", "drug", specific drug names (metformin, insulin, etc.)
   - Diagnosed conditions: "diagnosed with", "type 1 diabetes", "heart disease", "kidney disease", "cancer", "autoimmune disease", "IBD", "gout", etc.
   - Acute symptoms: "chest pain", "difficulty breathing", "severe pain", "blood in stool", "fainting", "seizures", etc.

2. If high-risk keywords found, checks for Category 7 disclaimer presence:
   - Looks for phrases like "taking medications", "diagnosed condition", "medical oversight", "consult your doctor", "healthcare provider", "work with your doctor", "professional medical management"

3. If high-risk content found WITHOUT Category 7 disclaimer:
   - **CRITICAL FAILURE** (blocks publication)
   - Shows triggered keywords and line numbers
   - References Medical Disclaimer Guide for fix

**Example Validator 2B Failure:**

```
========================================
VALIDATOR 2B: HIGH-RISK MEDICAL CONTENT
========================================

Status: ❌ CRITICAL FAILURE

Issue: Content discusses medications without appropriate Category 7 medical disclaimer.

Triggered Keywords:
- "prescription" (line 47)
- "metformin" (line 52)
- "diagnosed with type 2 diabetes" (line 63)

Required Action:
Add Category 7 disclaimer in [Author]'s voice. This is the STRONGEST disclaimer category and is REQUIRED when discussing medications or diagnosed conditions.

Suggested Fix (Sarah's voice):
"If you're taking medications or have been diagnosed with any medical condition, you need individualized medical oversight. Don't make changes without consulting your doctor."

Reference: /docs/medical-disclaimer-guide.md → Category 7 → [Author] Variations

---

Why this matters:
Content about medications and diagnosed conditions carries significant legal and ethical risk. Category 7 disclaimers ensure readers understand they need professional medical supervision for changes affecting their health and treatment.
```

**Pass Criteria:**
- No high-risk keywords detected, OR
- High-risk keywords present AND appropriate Category 7 disclaimer included

**Failure Criteria:**
- High-risk content (medications, diagnoses, acute symptoms) = CRITICAL if no Category 7 disclaimer

**How to Fix Validator 2B Failures:**
1. Find the high-risk keyword mentioned in the failure report
2. Go to `/docs/medical-disclaimer-guide.md` → Category 7 → [Your Writer] Variations
3. Choose a variation that fits naturally into your content
4. Add it before or after the high-risk content
5. Resubmit to validation

**Report to:** Content writers (Sarah, Marcus, Chloe, Casey)

---

#### Validator 3: AI-Text-Humanization Skill
**Purpose:** Confirm authentic voice, no robotic language

**Checklist:**
- [ ] Authentic personality shining through
- [ ] Natural phrasing (not stiff/formal)
- [ ] Varied sentence structure
- [ ] Conversational flow (reads naturally aloud)
- [ ] Realistic examples + personal perspective
- [ ] No overly polished/corporate language

**Failure Criteria:**
- Sounds robotic/formal = HIGH
- All sentences same structure = MEDIUM
- No personal perspective = MEDIUM
- Examples too generic = MEDIUM

**Report to:** Content writers

---

### **Phase 2: Code Validation (For HTML/CSS/JS)**

#### Validator 4: W3C HTML5 Validation
**Tool:** https://validator.w3.org/

**Checklist:**
- [ ] DOCTYPE present and valid
- [ ] All required meta tags (charset, viewport)
- [ ] No missing closing tags
- [ ] Proper heading hierarchy (h1→h2→h3, no skipping)
- [ ] All images have alt text
- [ ] All links have text
- [ ] No duplicate IDs
- [ ] Semantic HTML used (nav, article, footer, etc.)

**Failure Criteria:**
- Any validation errors = CRITICAL
- Missing meta tags = CRITICAL
- Missing alt text on images = HIGH
- Wrong heading hierarchy = HIGH

**Command to run:**
```bash
# Online validation
https://validator.w3.org/

# Or local with npm
npm install -g html-validator-cli
html-validator [file.html]
```

**Report to:** Developer (Alex)

---

#### Validator 5: CSS Validation
**Purpose:** Ensure brand colors, fonts, spacing are correct

**Checklist:**

**Colors:**
- [ ] H1 color: #ffd700 (gold) - EXACT
- [ ] H2 color: #ffd700 (gold) - EXACT
- [ ] H3 color: #d4a574 (tan) - EXACT
- [ ] Background: #1a120b (dark brown) - EXACT
- [ ] Text on dark: #f4e4d4 (light) - EXACT
- [ ] Links: #d4a574 (tan) - EXACT
- [ ] No unexpected colors introduced

**Fonts:**
- [ ] H1: Playfair Display loaded
- [ ] H2: Playfair Display loaded
- [ ] Body: Merriweather loaded
- [ ] Fallback to Georgia acceptable (if fonts loading fails)
- [ ] No sans-serif fonts (Arial, Helvetica, etc.)

**Spacing:**
- [ ] Container: max-width 800px or 1400px (not random values)
- [ ] Margins/padding: consistent (20px, 40px range)
- [ ] No tight spacing that looks cramped
- [ ] White space is generous

**Layout:**
- [ ] No horizontal scroll on mobile
- [ ] Responsive at: 375px (mobile), 768px (tablet), 1024px (desktop)
- [ ] Elements properly aligned

**Failure Criteria:**
- Color mismatch (even slight) = CRITICAL
- Font not loading = HIGH
- Wrong spacing values = MEDIUM
- Horizontal scroll on mobile = CRITICAL

**How to verify:**
```bash
# Browser DevTools:
1. Right-click element
2. Inspect
3. Check computed styles (color, font, font-size)
4. Compare to style guide hex values exactly
```

**Report to:** Developer (Alex) + Visual QA (Casey)

---

#### Validator 6: CSS Path Validation
**Purpose:** Ensure stylesheets actually load

**Checklist:**
- [ ] CSS file exists at referenced path
- [ ] Path is correct for file location
- [ ] No 404 errors in browser console
- [ ] Styles visibly applied to page

**Path rules:**
- Blog posts at `/public/blog/`: Link is `../../style.css`
- Pages at `/public/`: Link is `../style.css`

**Verify:**
```bash
# Check file exists
ls -la /path/to/style.css

# In browser console, check network tab
# Should see style.css loading (Status 200)
```

**Failure Criteria:**
- CSS file not found = CRITICAL
- Path incorrect = CRITICAL
- 404 on CSS = CRITICAL

**Report to:** Developer (Alex)

---

#### Validator 7: JavaScript Validation
**Purpose:** No console errors, functionality works

**Checklist:**
- [ ] No console errors when page loads
- [ ] No console warnings
- [ ] Interactive features work (filters, hover states, etc.)
- [ ] No syntax errors

**Verify:**
```bash
# In browser console (F12):
# Check console tab - should be empty (no red errors)
# Test interactive elements:
# - Hover effects work
# - Links navigate correctly
# - Filters toggle properly
```

**Failure Criteria:**
- Any console errors = HIGH
- Console warnings = MEDIUM
- Interactive features broken = CRITICAL
- Syntax errors = CRITICAL

**Report to:** Developer (Alex)

---

### **Phase 3: Visual Validation (Casey's Job)**

#### Validator 8: Screenshot Comparison
**Tool:** Playwright + manual inspection

**Checklist:**
- [ ] Screenshot taken at 1400x900px (desktop)
- [ ] Screenshot taken at 375x812px (mobile)
- [ ] Compare to baseline from last week
- [ ] No unexpected layout changes
- [ ] Colors render correctly in screenshot
- [ ] Fonts display with correct weight/style
- [ ] Spacing looks consistent
- [ ] No visual regressions

**Failure Criteria:**
- Visual drift detected = HIGH
- Colors look wrong in screenshot = CRITICAL
- Layout broken on mobile = CRITICAL
- Fonts not rendering = CRITICAL

**How to take screenshot:**
```bash
# Using Playwright
npx playwright screenshot --viewport-size=1400,900 [URL] desktop.png
npx playwright screenshot --viewport-size=375,812 [URL] mobile.png

# Or manually:
# 1. Open page in browser
# 2. F12 → Device toolbar
# 3. Select mobile device
# 4. Take screenshot
```

**Report to:** Visual QA (Casey)

---

#### Validator 9: Brand Detail Inspection
**Tool:** Browser DevTools color picker + manual inspection

**Checklist (for EVERY color):**
- [ ] Use browser color picker (DevTools)
- [ ] Verify hex value exactly matches style guide
- [ ] Verify RGB values if using RGB format

**Specific checks:**
- [ ] H1 titles: Gold (#ffd700)
- [ ] H2 titles: Gold (#ffd700)
- [ ] H3 titles: Tan (#d4a574)
- [ ] Links: Tan (#d4a574)
- [ ] Links on hover: Gold (#ffd700)
- [ ] Background: Dark brown (#1a120b)
- [ ] Text on dark: Light (#f4e4d4)
- [ ] Borders: Dark brown (#8b4513)

**Font checks:**
- [ ] H1/H2/H3: Playfair Display (serif, bold)
- [ ] Body: Merriweather (serif, regular)
- [ ] Font weight correct (700 for headings, 400 for body)
- [ ] Font size reasonable

**Spacing checks:**
- [ ] Margins consistent (20px, 40px)
- [ ] Padding consistent
- [ ] No random spacing values
- [ ] White space feels generous

**Favicon check:**
- [ ] Favicon visible in browser tab
- [ ] Favicon file exists: `/public/favicon.ico`
- [ ] Apple touch icon exists: `/public/apple-touch-icon.png`

**Failure Criteria:**
- Color mismatch = CRITICAL
- Font wrong = CRITICAL
- Favicon missing = HIGH
- Spacing inconsistent = MEDIUM

**How to use color picker:**
```bash
# Browser DevTools:
1. F12 to open DevTools
2. Click color picker icon (dropper)
3. Click on element
4. See hex value at top
5. Compare to style guide (#ffd700, etc.)
```

**Report to:** Visual QA (Casey)

---

### **Phase 4: Performance Validation**

#### Validator 10: Page Load Performance
**Tool:** Browser DevTools Lighthouse

**Target Metrics:**
- LCP (Largest Contentful Paint): ≤ 2.5 seconds
- FID (First Input Delay): ≤ 100ms
- CLS (Cumulative Layout Shift): < 0.1
- Overall Lighthouse score: ≥ 90 (performance)

**How to test:**
```bash
# Browser DevTools:
1. F12 → Lighthouse tab
2. Select "Performance" category
3. Click "Analyze page load"
4. Wait for report
5. Check metrics above

# Or via CLI:
npx lighthouse https://URL --only-categories=performance
```

**Failure Criteria:**
- LCP > 2.5s = HIGH
- Performance score < 80 = MEDIUM
- CLS > 0.1 = MEDIUM

**Report to:** Developer (Alex)

---

#### Validator 11: Mobile Responsiveness
**Tool:** Browser DevTools device toolbar

**Checklist:**
- [ ] No horizontal scroll on mobile (375px)
- [ ] Text readable without zooming
- [ ] Touch targets ≥ 44px
- [ ] Images scale properly
- [ ] Navigation accessible
- [ ] Forms work on mobile
- [ ] Columns stack properly on tablet

**Test viewports:**
- Mobile: 375x812px (iPhone size)
- Tablet: 768x1024px
- Desktop: 1400x900px

**Failure Criteria:**
- Horizontal scroll on mobile = CRITICAL
- Text unreadable = CRITICAL
- Touch targets too small = HIGH
- Layout broken on any size = HIGH

**Report to:** Visual QA (Casey)

---

## **THE VALIDATION REPORT**

**After running ALL validators, Jordan produces:**

### Report Template
```markdown
# Validation Report - [Date]
## Blog Post: [Title]

### Content Quality
- Copy-Editor: ✅ PASS / 🔴 FAIL (details)
- Brand Voice: ✅ PASS / 🔴 FAIL (details)
- Humanization: ✅ PASS / 🔴 FAIL (details)

### Code Quality
- HTML Validation: ✅ PASS / 🔴 FAIL (details)
- CSS Validation: ✅ PASS / 🔴 FAIL (details)
- CSS Path: ✅ PASS / 🔴 FAIL (details)
- JavaScript: ✅ PASS / 🔴 FAIL (details)

### Visual Quality
- Screenshot Comparison: ✅ PASS / 🔴 FAIL (details)
- Brand Details: ✅ PASS / 🔴 FAIL (details)

### Performance
- Page Load: ✅ PASS / 🔴 FAIL (LCP: X.Xs)
- Mobile Responsive: ✅ PASS / 🔴 FAIL (details)

### Issues Found
#### CRITICAL
- [Issue 1]: [Solution]

#### HIGH
- [Issue 2]: [Solution]

#### MEDIUM
- [Issue 3]: [Solution]

### Summary
[Specific issues to fix, who should fix, estimated time]

### Decision
✅ **APPROVED FOR DEPLOYMENT** OR 🔴 **BLOCKED - Fix issues above**

Validated by: Jordan
Date: [date]
```

---

## **COMMUNICATION PROTOCOL**

### If Validation FAILS:

**Immediate Actions:**
1. Create validation report with specific issues
2. Tag the responsible agent (@Sarah for copy, @Alex for code, etc.)
3. Include severity level (🔴 CRITICAL, 🟠 HIGH, etc.)
4. Suggest solutions
5. Set clear deadline for fixes

**Example Failing Report:**
```
🔴 CRITICAL ISSUES:
1. H1 color is #FFD700 (bright yellow) should be #ffd700 (darker gold)
   → Visual QA (Casey): Use color picker, verify exact hex
   → Developer (Alex): Update CSS color value

2. Missing "Not a Doctor" disclaimer
   → Writer (Sarah): Add disclaimer paragraph at end

🟠 HIGH ISSUES:
1. "Utilize" used 3 times (AI tell word)
   → Writer (Sarah): Replace with "use"

2. Em-dash (—) used 2 times (max 1)
   → Writer (Sarah): Replace with period or colon
```

### If Validation PASSES:

**Report:**
```
✅ ALL VALIDATORS PASSED

Blog Post: [Title]
Validation Date: [Date]
Validated by: Jordan

READY FOR DEPLOYMENT ✅

Next steps:
1. Merge to GitHub
2. Deploy to live site
```

---

## **ESCALATION RULES**

**If Jordan finds issues that conflict:**
- Example: Sarah wants to use em-dash, but Copy-Editor fails it
- Escalate to CEO (me): Final decision authority
- Don't force a pass or fail without approval

**Blocking issues (always stop deployment):**
- CRITICAL severity
- Missing security requirements
- Broken HTML/CSS
- Brand violations
- Content that's harmful or misleading

---

## **JORDAN'S DAILY CHECKLIST**

**Every morning:**
- [ ] Check if new posts ready for validation
- [ ] Run all validators
- [ ] Create reports
- [ ] Tag responsible agents with issues
- [ ] Track blockers (what's preventing deployment)

**Every week:**
- [ ] Review validation patterns (what issues repeat?)
- [ ] Share learnings with team
- [ ] Update team members who made same mistakes
- [ ] Update this document if new standards needed

---

## **TOOLS JORDAN USES**

| Tool | Purpose | How to Use |
|------|---------|-----------|
| W3C Validator | HTML validation | https://validator.w3.org/ |
| Browser DevTools | CSS, fonts, colors, performance | F12 in any browser |
| Playwright | Screenshots | `npx playwright screenshot...` |
| Lighthouse | Performance metrics | DevTools → Lighthouse tab |
| Color Picker | Verify exact hex values | DevTools → picker tool |

---

## **SUCCESS METRICS**

**Jordan's performance:**
- Validation pass rate: 95%+ (fewer issues make it through)
- Average issues found per post: < 3
- Average time to validate: 30-45 minutes
- Team satisfaction: "Jordan catches everything"

**Quality improvements:**
- Zero post-launch critical issues
- Zero brand drift over time
- Zero broken links in published content
- Consistent, professional appearance across all posts


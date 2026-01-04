# Calculator Form - Visual Validation Summary

**Status:** Visual standards set and ready for development
**Set by:** Casey (Visual Director & QA)
**Date:** January 3, 2026
**Authority:** Binding visual baseline for all form work

---

## Quick Status

Visual standards are COMPLETE and READY. Alex can begin Step 1 (Container) development immediately.

**Key Documents Created:**
1. `/docs/FORM_VISUAL_STANDARDS.md` - Complete reference (89 sections)
2. `/docs/FORM_BUILDER_VISUAL_CHECKLIST.md` - Quick reference for Alex
3. `/agents/visual_baselines/README.md` - Baseline management process
4. `/agents/memory/casey_memory.log` - Comprehensive tracking log

---

## What Alex Needs to Know

### Before Building Step 1:
1. Read `/docs/FORM_VISUAL_STANDARDS.md` (takes 15-20 minutes)
2. Bookmark `/docs/FORM_BUILDER_VISUAL_CHECKLIST.md` (use during development)
3. Understand the 3 viewport sizes: 1400x900 (desktop), 768x1024 (tablet), 375x812 (mobile)

### While Building Each Step:
1. Build the feature
2. Test at 1400x900px - looks good?
3. Test at 375x812px - no horizontal scroll?
4. Take screenshots (exact dimensions using Playwright or DevTools)
5. Verify colors with browser color picker (F12)
6. Submit screenshots to Casey for validation

### What Casey Checks:
1. Screenshots at exact dimensions
2. Colors verified with color picker (exact hex match)
3. Fonts loading (Playfair + Merriweather)
4. No horizontal scroll at mobile (375px)
5. Touch targets 44px+ height
6. Responsive at all breakpoints
7. Accessibility (focus states, contrast, labels)

---

## Visual Validation Workflow

```
Step 1: Alex builds container
        ↓
Step 2: Alex takes 3 screenshots (1400x900, 768x1024, 375x812)
        ↓
Step 3: Alex checks colors with color picker
        ↓
Step 4: Alex submits screenshots to Casey
        ↓
Step 5: Casey validates against standards checklist
        ↓
Step 6: Casey APPROVES or FLAGS ISSUES
        ↓
        If APPROVED: Baseline set, move to Step 2
        If FLAGGED: Alex fixes, resubmits
```

---

## Critical Standards (Non-Negotiable)

**These MUST be met or form fails validation:**

1. **NO Horizontal Scroll at 375px** (auto-fail if violated)
2. **Exact Color Matching** (e.g., #ffd700 must be exact, no approximations)
3. **18px+ Labels** (accessibility for 30-60 age group)
4. **44px+ Touch Targets** (button and input minimum heights)
5. **Fonts Must Load** (Playfair Display + Merriweather, not system fonts)
6. **Visible Focus States** (2px minimum outline for keyboard navigation)
7. **No Layout Breaks** (responsive at 375px, 768px, 1400px)

---

## Color Palette (Copy-Paste)

All colors must match EXACTLY (use color picker to verify):

```css
/* Backgrounds */
--bg-dark: #1a120b;        /* Page background */
--bg-brown: #2c1810;       /* Input fields */

/* Text Colors */
--text-light: #f4e4d4;     /* Labels, input text */
--text-tan: #d4a574;       /* Secondary headings */
--text-gold: #ffd700;      /* Form title */

/* Borders & UI */
--border: #8b4513;         /* Input borders */
--error: #ff6b6b;          /* Error messages */
```

---

## Typography Quick Reference

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| **Form Title (H1)** | Playfair Display | 36-48px | bold | #ffd700 |
| **Step Headers (H2)** | Playfair Display | 24-28px | bold | #d4a574 |
| **Labels** | Merriweather | 18-20px | bold | #f4e4d4 |
| **Input Text** | Merriweather | 16-18px | regular | #f4e4d4 |
| **Helper Text** | Merriweather | 14-16px | regular | #d4a574 |

---

## Responsive Breakpoints (Exact Dimensions)

**Test and screenshot at these exact sizes:**

- **Desktop:** 1400x900px
- **Tablet:** 768x1024px
- **Mobile:** 375x812px

**Critical mobile requirement:** No horizontal scroll at 375px (auto-fail if violated)

---

## Validation Checklist Summary

### For Each Step:

**Desktop (1400x900px):**
- [ ] Form centered, max-width 600px
- [ ] All elements visible without scroll
- [ ] Colors verified with color picker
- [ ] Fonts loaded (not system fonts)
- [ ] Touch targets 44px+ height
- [ ] Spacing consistent (20-24px between inputs)

**Mobile (375x812px):**
- [ ] NO horizontal scroll (CRITICAL)
- [ ] Form full width with padding
- [ ] Touch targets 44px+ height
- [ ] Text readable (18px+ labels, 16px+ input)
- [ ] Layout stacks vertically

**Tablet (768x1024px):**
- [ ] Responsive (not squeezed)
- [ ] Proportional spacing
- [ ] No horizontal scroll

**Colors (Use Browser Color Picker):**
- [ ] Background: #1a120b
- [ ] Title: #ffd700
- [ ] Labels: #f4e4d4
- [ ] Input background: #2c1810
- [ ] Input border: #8b4513
- [ ] All colors EXACT (no approximations)

**Fonts:**
- [ ] Title: Playfair Display (not system)
- [ ] Labels: Merriweather bold
- [ ] Input text: Merriweather regular
- [ ] All weights correct (700 bold, 400 regular)

**Accessibility:**
- [ ] Focus state visible (2px gold outline)
- [ ] All inputs have labels
- [ ] Tab order logical
- [ ] No color-only information
- [ ] Contrast 4.5:1 minimum

---

## Red Flags (Auto-Fail If Present)

Do NOT submit if any of these are present:

- Horizontal scroll on 375px viewport
- Colors don't match exact hex values
- Fonts not loading (system fonts visible)
- Labels <18px on desktop
- Touch targets <44px
- No visible focus state
- Input borders missing or wrong color
- Layout broken at any breakpoint

---

## Submission Process for Alex

After building each step:

1. **Take 3 screenshots:**
   ```bash
   npx playwright screenshot --viewport-size=1400,900 http://localhost:3000/form step1-desktop.png
   npx playwright screenshot --viewport-size=375,812 http://localhost:3000/form step1-mobile.png
   npx playwright screenshot --viewport-size=768,1024 http://localhost:3000/form step1-tablet.png
   ```

2. **Verify colors with color picker:**
   - F12 (DevTools)
   - Click element inspector
   - Click on element
   - Look at color property in Styles tab
   - Note hex value
   - Compare to standards

3. **Submit to Casey with:**
   - Screenshot files (3 viewports)
   - Brief description of what you built
   - Any color verification notes
   - Confidence level (ready for approval?)

4. **Casey will:**
   - Compare screenshots to baseline
   - Verify all colors with color picker
   - Check fonts loading
   - Test accessibility
   - Approve or flag issues
   - Report to Jordan

---

## Baseline Management

**Baseline location:** `/agents/visual_baselines/`

**Naming:** `form-[viewport]-baseline-[DATE].png`

**Process:**
1. After Step 1 approval, baseline screenshots are created
2. All future steps compared to baseline
3. Visual drift = regression detected
4. Update baseline only after CEO-approved changes
5. Archive old baselines (keep for history)

---

## Contact & Support

**Visual questions:** Casey (daily validation)
**Color/font standards:** Check `/docs/style-guide.md` or ask CEO
**DevTools help:** Ask in team chat
**Visual blockers:** Flag to Quinn immediately
**Design decisions:** CEO (weekly check-in)

---

## Files Reference

**Standards & Checklists:**
- `/docs/FORM_VISUAL_STANDARDS.md` - Complete reference (89 sections)
- `/docs/FORM_BUILDER_VISUAL_CHECKLIST.md` - Quick reference for development
- `/docs/style-guide.md` - Master brand standards

**Baseline & Tracking:**
- `/agents/visual_baselines/` - Screenshot storage
- `/agents/visual_baselines/README.md` - Baseline process
- `/agents/memory/casey_memory.log` - Validation tracking

---

## Success Metrics

**Daily:**
- All assigned steps validated visually
- Screenshots taken and compared
- Color verification complete
- Issues reported clearly

**Weekly:**
- Zero visual drift missed
- All brand standards verified
- Responsive design confirmed on all devices
- Zero post published with visual issues

**Form Completion:**
- All 6 steps validated and approved
- Visual consistency maintained throughout
- Brand colors exact on all pages
- Responsive at 375px, 768px, 1400px

---

## Next Steps

1. **Alex:** Review `/docs/FORM_VISUAL_STANDARDS.md` (20 min read)
2. **Alex:** Review `/docs/FORM_BUILDER_VISUAL_CHECKLIST.md` (bookmark it)
3. **Alex:** Begin Step 1 (Container) development
4. **Alex:** Take screenshots when Step 1 complete
5. **Casey:** Validate screenshots against standards
6. **Repeat for Steps 2-6**

---

## Authority & Approval

**Visual validation is MANDATORY before deployment.**

**Approval chain:**
1. Casey (visual standards validation) ✓ GATE
2. Jordan (functional validation) ✓ GATE
3. CEO (design approval) ✓ GATE

**No form step goes live without Casey's visual validation pass.**

---

**Document Status:** ACTIVE
**Set by:** Casey (Visual Director & QA)
**Authority Level:** Binding visual baseline
**Last Updated:** January 3, 2026
**Next Review:** After Step 1 completion

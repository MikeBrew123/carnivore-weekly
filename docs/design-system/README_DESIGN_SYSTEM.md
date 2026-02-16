# Carnivore Weekly Design System
## Complete Documentation Index

**Version:** 1.0
**Last Updated:** December 31, 2025
**Status:** Active & Maintained
**Owner:** CEO/Brand Team
**Audience:** Designers, Developers, Product Managers

---

## WELCOME

Welcome to the Carnivore Weekly Design System. This is the single source of truth for all visual, interactive, and accessibility standards across our digital properties.

### What This Is

A comprehensive, living design system that governs:
- **Visual Design:** Colors, typography, spacing, visual effects
- **Components:** Reusable UI patterns (cards, buttons, forms, navigation)
- **Responsive Design:** Behavior across mobile, tablet, desktop, and large screens
- **Accessibility:** WCAG AA compliance, keyboard navigation, screen readers
- **Code Standards:** CSS organization, naming conventions, best practices

### What This Is NOT

- Not a design template tool (use Figma for that)
- Not a component library framework (we write vanilla CSS)
- Not a brand book (see `/docs/brand-kit.md` for brand voice/persona)
- Not a content style guide (see `/docs/style-guide.md` for writing standards)

---

## QUICK NAVIGATION

### For Designers
Start here if you're designing new features or components:

1. **[Visual Reference Guide](DESIGN_SYSTEM_VISUAL_GUIDE.html)** (Interactive HTML)
   - See all colors in context
   - Preview component examples
   - Test contrast ratios
   - Responsive grid behavior

2. **[Complete Design System Specification](DESIGN_SYSTEM_BENTO_GRID.md)** (Detailed Reference)
   - Full color palette with contrast ratios
   - Typography scales with rationale
   - Spacing grid with usage guidelines
   - Component specifications
   - Accessibility standards

3. **[Validation Checklist](DESIGN_SYSTEM_VALIDATION.md)** (QA)
   - Color verification process
   - Component sign-off protocol
   - Accessibility compliance checklist

---

### For Developers
Start here if you're implementing components or pages:

1. **[Implementation Guide](DESIGN_SYSTEM_IMPLEMENTATION.md)** (Copy-Paste Ready)
   - CSS variable setup
   - Copy-paste component code (HTML + CSS)
   - Button, card, form examples
   - Responsive grid templates
   - Common mistakes to avoid

2. **[Complete Design System Specification](DESIGN_SYSTEM_BENTO_GRID.md)** (Reference)
   - Design tokens section (9)
   - Code standards section (8)
   - Spacing system section (3)
   - Responsive design section (5)

3. **[Visual Reference Guide](DESIGN_SYSTEM_VISUAL_GUIDE.html)** (Interactive Testing)
   - Test components in browser
   - Inspect component CSS
   - Verify responsive behavior
   - Check focus states and accessibility

---

### For Product/Brand Team
Start here for strategic oversight:

1. **[Refined Traditional vs Bento Grid](DESIGN_SYSTEM_BENTO_GRID.md#10-maintenance--evolution)** (Comparison)
   - Why we redesigned
   - Key improvements
   - Brand impact

2. **[Complete Design System Specification](DESIGN_SYSTEM_BENTO_GRID.md)** (Full Overview)
   - See all decisions in context
   - Understand design rationale
   - Review maintenance process

3. **[Validation Checklist](DESIGN_SYSTEM_VALIDATION.md)** (Launch Readiness)
   - Sign-off protocol
   - Stakeholder roles
   - Deployment checklist

---

## DOCUMENT STRUCTURE

### 1. DESIGN_SYSTEM_BENTO_GRID.md (3,500+ words)
**The Comprehensive Specification Document**

Contains everything designers and developers need:

| Section | Purpose | Audience |
|---------|---------|----------|
| 1. Color System | All brand colors with hex, RGB, contrast ratios | Everyone |
| 2. Typography System | Font families, sizes, weights, line-height | Everyone |
| 3. Spacing System | Spacing grid (5-60px), usage rules | Designers, Developers |
| 4. Component Library | Card types, buttons, forms with HTML/CSS | Developers |
| 5. Responsive Design | Breakpoints (375, 768, 1100, 1400px), grid behavior | Developers |
| 6. Visual Effects & Interactions | Hover, focus, active states, transitions | Developers |
| 7. Accessibility Standards | WCAG AA compliance, keyboard nav, touch targets | QA, Developers |
| 8. Code Standards | CSS organization, BEM naming, variables | Developers |
| 9. Design Tokens | Copy-paste CSS variables | Developers |
| 10. Maintenance & Evolution | How to update and deprecate patterns | Product, Designers |

**Use when:** You need complete reference, understanding rationale, or official spec

---

### 2. DESIGN_SYSTEM_VISUAL_GUIDE.html (Interactive)
**Browser-Based Visual Reference**

Interactive HTML reference showing:
- Color swatches with contrast badges
- Typography examples at each scale
- Spacing grid visualization
- Component examples (cards, buttons, etc.)
- Responsive grid behavior (resize to see)
- Accessibility demonstrations
- Focus state examples
- Before/after comparison

**Use when:** You want to see components in context, test colors, inspect code

---

### 3. DESIGN_SYSTEM_IMPLEMENTATION.md (Developer Guide)
**Ready-to-Use Code Snippets**

Copy-paste code for:
- Hero cards
- Featured cards
- Standard cards
- Buttons (primary, secondary, small)
- Grids (Bento layout)
- Forms & inputs
- Typography examples
- Spacing utilities
- Responsive templates

Also includes:
- CSS variable setup
- Common mistakes to avoid
- Accessibility checklist
- Migration guide

**Use when:** You're coding a component, unsure about implementation, or want example

---

### 4. DESIGN_SYSTEM_VALIDATION.md (QA & Launch)
**Pre-Launch & Ongoing Quality Assurance**

Comprehensive checklists for:
- Pre-launch validation (design, code, docs)
- Color verification (hex values, contrast ratios)
- Typography validation (font loading, sizing)
- Spacing validation (grid adherence)
- Component sign-off
- Responsive testing (mobile, tablet, desktop)
- Accessibility compliance
- Performance metrics
- Browser compatibility
- Post-launch monitoring

**Use when:** Before launching a new page/component, monthly audits, or troubleshooting

---

### 5. README_DESIGN_SYSTEM.md (This File)
**Navigation & Overview**

Entry point explaining:
- What the design system is
- How to use these documents
- Quick navigation by role
- Document structure
- Color palette overview
- Typography overview
- Key decisions
- Common questions

**Use when:** You're new to the team, need quick reference, or getting oriented

---

## KEY DESIGN DECISIONS

### Why Dark Brown Instead of Tan?
- **Premium aesthetic:** Dark backgrounds with accent colors feel more sophisticated
- **Readability:** Light text (#f4e4d4) on dark brown (#1a120b) has 14.2:1 contrast (AAA)
- **Flexibility:** Tan accents on dark background more versatile than tan background
- **Visual hierarchy:** Easier to emphasize important elements with contrasting accents

### Why Two Fonts Instead of One?
- **Playfair Display (headings):** Bold, elegant serif feels premium and authoritative
- **Merriweather (body):** Readable serif optimized for body text at 16px
- **Brand consistency:** Both serif fonts maintain premium aesthetic
- **No sans-serif:** Avoids feeling corporate or generic

### Why Strict Spacing Grid (20px, 30px, 40px)?
- **Consistency:** Designers/devs don't guess at spacing values
- **Scalability:** Adding new pages is predictable, not bespoke
- **Maintenance:** Change one value, updates everywhere via CSS variables
- **Efficiency:** Less time debating "should this be 15px or 18px?"

### Why Bento Grid Over Flexible Sections?
- **Visual consistency:** Users see pattern language, recognize structure
- **Developer efficiency:** Reusable components vs custom per page
- **Responsive certainty:** Tested at 3 breakpoints, predictable behavior
- **Accessibility:** Systematic testing across all screen sizes
- **Scalability:** Add 10 new pages following same pattern

---

## COLOR PALETTE AT A GLANCE

| Color | Hex | Usage | Contrast |
|-------|-----|-------|----------|
| Dark Brown | #1a120b | Page background | — |
| Text Brown | #2c1810 | Text on light | 12.2:1 vs white |
| Tan Accent | #d4a574 | Links, secondary | 7.1:1 ✓ AA |
| Gold | #ffd700 | Headings, focus | 13.8:1 ✓ AAA |
| Light Text | #f4e4d4 | Text on dark | 14.2:1 ✓ AAA |
| Border | #8b4513 | Visual separation | 6.4:1 ✓ AA |

**All combinations meet WCAG AA minimum (4.5:1)**

---

## TYPOGRAPHY AT A GLANCE

| Level | Size | Font | Weight | Color |
|-------|------|------|--------|-------|
| **H1** | 48px | Playfair Display | 900 | #ffd700 |
| **H2** | 32px | Playfair Display | 700 | #ffd700 |
| **H3** | 24px | Playfair Display | 700 | #d4a574 |
| **H4** | 18px | Playfair Display | 700 | #d4a574 |
| **Body** | 16px | Merriweather | 400 | #f4e4d4 |
| **Small** | 14px | Merriweather | 400 | #d4a574 |

**Line-height:** 1.3 (headings) to 1.8 (body) for readability

---

## SPACING GRID AT A GLANCE

```
5px    (0.5 units) - Micro spacing only
10px   (1 unit)    - Tight gaps
20px   (2 units)   - STANDARD (70% of usage)
30px   (3 units)   - Featured cards
40px   (4 units)   - Section margins
60px   (6 units)   - Footer/major breaks
```

**Rule:** All spacing must be in this grid. No ad-hoc values (12px, 15px, 18px, 25px, etc.)

---

## RESPONSIVE BREAKPOINTS AT A GLANCE

| Breakpoint | Width | Columns | Use Case |
|-----------|-------|---------|----------|
| Mobile | 375px | 1 | Phones, small devices |
| Tablet | 768px | 2 | Tablets, larger phones |
| Desktop | 1100px | 3 | Laptops, desktops |
| Large | 1400px+ | 3 | Large monitors, max-width enforced |

**Test at:** 375px (mobile), 768px (tablet), 1100px (desktop)

---

## COMMON QUESTIONS

### Q: Can I use a different spacing value (e.g., 18px)?
**A:** No. Use the grid: 5, 10, 20, 30, 40, 60px only. If something looks "off," adjust the component or design, not the spacing value.

### Q: Can I use a different color (e.g., #e5b896 instead of #d4a574)?
**A:** No. Approved colors only. If brand wants a new color, update the design system first, then update all instances.

### Q: Can I add an animation (e.g., fade-in on scroll)?
**A:** No. The design system only allows smooth transitions (0.15-0.3s) and subtle hover effects. No heavy animations—premium aesthetic requires restraint.

### Q: Can I use Arial or Helvetica if Google Fonts fail?
**A:** The fallback is Georgia serif. Never use sans-serif fonts—they violate brand identity.

### Q: What if the layout looks wrong on my screen size?
**A:** Test at standard breakpoints only (375px, 768px, 1100px). Between breakpoints, behavior is not guaranteed. If broken at a standard size, it's a bug.

### Q: How do I deprecate an old component?
**A:** See "Deprecating Old Patterns" in main design system doc. Announce 2 weeks in advance, provide migration guide, update all usage, remove CSS.

### Q: When should I ask for design system changes?
**A:** When you want to use values outside the system (colors, spacing, fonts, sizes). The system is strict by design—consistency is the goal.

---

## WHO TO CONTACT

| Question | Contact | Urgency |
|----------|---------|----------|
| Brand approval, color/font changes | CEO | Immediate |
| Component design questions | CEO + Design team | Same day |
| Code implementation issues | Primary Developer | Same day |
| Visual bugs/regressions | QA Lead (Casey) | Same day |
| Performance issues | Developer | Same day |
| Accessibility concerns | Developer + QA | Same day |
| Documentation updates | Any team member | Weekly |

---

## UPDATING THIS DESIGN SYSTEM

### Process for Proposing Changes

1. **Identify problem:** What's not working?
2. **Propose solution:** What would work better?
3. **Create variant:** Test in isolated branch/page first
4. **Document:** Update relevant design system docs
5. **Request review:** Show CEO/design team
6. **Get approval:** Only proceed if approved
7. **Update everywhere:** Apply change system-wide
8. **Update documentation:** Update all 4 design system docs
9. **Communicate:** Notify team of changes

### When to Use Design System vs Make Custom

| Scenario | Use Design System |
|----------|------------------|
| Adding new page | ✓ Yes, use existing patterns |
| Existing component needs small tweak | ✓ Yes, update in system |
| Create new component type | ✗ No, propose to design system first |
| One-off styling | ✗ No, likely should be in system |
| Brand-wide change | ✓ Yes, update system first |
| Experimental feature | ? Discuss with team |

**Golden Rule:** When in doubt, make it part of the system. Consistency compounds over time.

---

## VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 31, 2025 | Initial design system for Bento Grid redesign |
| 0.9 | In Review | — |
| — | — | — |

---

## NEXT STEPS

### If You're New
1. Read this README (you're reading it!)
2. Open [DESIGN_SYSTEM_VISUAL_GUIDE.html](DESIGN_SYSTEM_VISUAL_GUIDE.html) in browser
3. Review [DESIGN_SYSTEM_IMPLEMENTATION.md](DESIGN_SYSTEM_IMPLEMENTATION.md) for copy-paste examples
4. Read [DESIGN_SYSTEM_BENTO_GRID.md](DESIGN_SYSTEM_BENTO_GRID.md) sections relevant to your role

### If You're Implementing a Component
1. Check [DESIGN_SYSTEM_IMPLEMENTATION.md](DESIGN_SYSTEM_IMPLEMENTATION.md) for example
2. Copy HTML + CSS template
3. Test with [DESIGN_SYSTEM_VISUAL_GUIDE.html](DESIGN_SYSTEM_VISUAL_GUIDE.html)
4. Validate with [DESIGN_SYSTEM_VALIDATION.md](DESIGN_SYSTEM_VALIDATION.md) checklist

### If You're Reviewing Code
1. Use [DESIGN_SYSTEM_VALIDATION.md](DESIGN_SYSTEM_VALIDATION.md) checklist
2. Verify colors use CSS variables
3. Verify spacing in grid (20, 30, 40px)
4. Verify contrast ratios with WebAIM
5. Test responsive at 375px, 768px, 1100px

### If You Want to Update the System
1. Read "Process for Proposing Changes" (above)
2. Get approval from CEO
3. Update all 4 design system docs
4. Communicate to team
5. Create new version in changelog

---

## HELPFUL LINKS

### Tools & Resources
- [Google Fonts: Playfair Display](https://fonts.google.com/specimen/Playfair+Display)
- [Google Fonts: Merriweather](https://fonts.google.com/specimen/Merriweather)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Chrome DevTools Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WAVE Accessibility Checker](https://wave.webaim.org/)

### Related Documents in This Project
- Brand Kit (voice, personas): `/docs/brand-kit.md`
- Writing Style Guide: `/docs/style-guide.md`
- Validation Standards: `/docs/validation-standards.md`
- Main CSS file: `/public/style.css`

### Learning Resources
- [MDN: CSS Grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout)
- [MDN: Flexbox](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout)
- [Web Accessibility WCAG](https://www.w3.org/WAI/WCAG21/quickref/)
- [Design Systems Handbook](https://www.designsystemshandbook.com/)

---

## FINAL NOTES

### Design System Principles
1. **Consistency over customization** - System > exceptions
2. **Documentation over assumption** - If it's not documented, ask first
3. **Accessibility first** - All changes meet WCAG AA minimum
4. **Scalability by design** - New components follow patterns, not custom builds
5. **Living document** - System evolves but through process, not chaos

### Long-Term Vision
This design system is built to scale. As we add features, pages, and team members, this system should make work:
- **Faster** (reuse, not reinvent)
- **More consistent** (patterns, not opinions)
- **More accessible** (standards, not afterthoughts)
- **Easier to maintain** (CSS variables, not manual updates)

### Maintenance Responsibility
Everyone on the team maintains this system:
- **Designers:** Propose changes, review new components
- **Developers:** Implement standards, suggest improvements
- **QA:** Validate compliance, catch regressions
- **CEO:** Approve brand changes, guide strategy

---

## Document Approved

**Design System Version 1.0**
**Status:** Active
**Last Updated:** December 31, 2025

Created for Carnivore Weekly by the Design & Development Team.

For questions or feedback, contact the CEO or design system owner.

---

**All links in this document are relative to `/docs/` directory.**

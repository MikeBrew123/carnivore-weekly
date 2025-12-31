# Carnivore Weekly Documentation Library
**The Central Context for All Agents**

---

## **Purpose**

This Library is the **single source of truth** for all agents, writers, developers, and designers at Carnivore Weekly. Without this, each agent would create their own version of the brand, resulting in inconsistency and hallucination.

**Rule:** If it's not in the Library, it doesn't exist. If you need to add something, update the Library first.

---

## **The Three Core Documents**

### **1. 📖 Brand Kit** (`/docs/brand-kit.md`)
**"Who are we and how do we talk?"**

Contains:
- Mission & values
- The three personas (Sarah, Marcus, Chloe) with full backstories
- Voice characteristics for each persona
- Content ownership (who writes what)
- Universal writing standards
- AI tell words (banned forever)
- Tone checklist for every post

**Who uses this:**
- Sarah, Marcus, Chloe (writers)
- CEO (me) - for quality oversight
- Validators - to check voice consistency

**Key sections:**
- Sarah's voice: Educational, warm, evidence-based
- Marcus's voice: Direct, punchy, protocol-focused
- Chloe's voice: Conversational, relatable, insider

---

### **2. 🎨 Style Guide** (`/docs/style-guide.md`)
**"How do we look and build?"**

Contains:
- Design system (colors, typography, spacing)
- HTML standards
- CSS standards
- JavaScript standards
- Python standards
- Image & asset requirements
- SEO standards
- Performance targets
- Visual validation checklist

**Who uses this:**
- Alex (developer)
- Casey (visual QA)
- Jordan (validator)
- All agents (for reference)

**Key sections:**
- Exact color hex values (DO NOT CHANGE)
- Required fonts: Playfair Display + Merriweather
- Spacing rules: 25-40px sections, 800px blog container
- Performance targets: < 3 second load time

---

### **3. ✅ Validation Standards** (`/docs/validation-standards.md`)
**"How do we ensure quality before deployment?"**

Contains:
- 11 validators (copy-editor, brand voice, HTML, CSS, visual, performance, etc.)
- Severity levels (CRITICAL, HIGH, MEDIUM, LOW)
- Pre-deployment checklist
- Jordan's validation report template
- Communication protocol for failures
- Tools and how to use them

**Who uses this:**
- Jordan (validator) - primary owner
- All agents - understand what will be checked

**Key sections:**
- Phase 1: Content validation (3 validators)
- Phase 2: Code validation (4 validators)
- Phase 3: Visual validation (2 validators)
- Phase 4: Performance validation (2 validators)

---

## **Quick Navigation**

| Role | Primary Document | Quick Link |
|------|------------------|-----------|
| **Sarah** (Writer) | Brand Kit | [Personas → Sarah's Voice](#) |
| **Marcus** (Writer) | Brand Kit | [Personas → Marcus's Voice](#) |
| **Chloe** (Writer/Researcher) | Brand Kit | [Personas → Chloe's Voice](#) |
| **Alex** (Developer) | Style Guide | [Code Standards](#) |
| **Casey** (Visual QA) | Style Guide + Brand Kit | [Design System](#) |
| **Jordan** (Validator) | Validation Standards | [The Gate Keeper Role](#) |
| **CEO (Me)** | All three | Strategic oversight |

---

## **How Agents Use the Library**

### **Writer's Workflow:**
1. Open Brand Kit
2. Find your persona section (Sarah/Marcus/Chloe)
3. Review voice characteristics
4. Check universal writing standards
5. Write post
6. Self-check against tone checklist
7. Submit to Jordan for validation

### **Developer's Workflow:**
1. Open Style Guide
2. Check design system (colors, fonts, spacing)
3. Check code standards (HTML/CSS/JS/Python)
4. Build/code change
5. Submit to Jordan for validation

### **Visual QA Workflow:**
1. Open Style Guide (design system)
2. Open Validation Standards (Phase 3 checklist)
3. Take screenshots (1400x900 and 375x812)
4. Use color picker to verify exact hex values
5. Compare to baseline
6. Report findings to Jordan

### **Validator Workflow:**
1. Open Validation Standards
2. Run all 11 validators
3. Create validation report using template
4. If PASS: Approve for deployment
5. If FAIL: Specify issues + severity + solutions
6. Tag responsible agent for fixes

---

## **The Golden Rules**

1. **All colors are EXACT hex values**
   - #ffd700 for gold (not #FFD700, not "bright yellow")
   - #d4a574 for tan (never substitute)
   - Use browser color picker to verify

2. **All fonts are Playfair Display (headings) + Merriweather (body)**
   - No sans-serif fonts
   - No system fonts
   - No custom fonts without approval
   - Google Fonts only

3. **All personas have consistent voices**
   - Sarah: Educational, warm
   - Marcus: Direct, punchy
   - Chloe: Conversational, relatable
   - No blending of voices

4. **Nothing ships without validation**
   - Jordan must approve (PASS on all validators)
   - Zero CRITICAL issues allowed
   - HIGH issues strongly discouraged

5. **If it's not in the Library, ask CEO (me)**
   - Don't make up brand standards
   - Don't assume design decisions
   - Escalate uncertainties

---

## **When to Update the Library**

### Update Brand Kit if:
- Adding a new persona
- Changing persona backstory/voice
- Adding new universal writing rules
- Discovering new AI tell words

### Update Style Guide if:
- Adding new design element
- Changing color/font/spacing standards
- New code language standards needed
- New accessibility requirements

### Update Validation Standards if:
- Adding new validator
- Changing severity rules
- New validation tools
- Changing deployment criteria

**Update Process:**
1. Draft changes
2. Tag CEO (me) for review
3. Get approval
4. Update document
5. Notify all agents (so they re-read)

---

## **Quick Reference: Hex Colors**

### Copy-Paste these (use EXACTLY)

```
Background:      #1a120b (dark brown)
Text (light):    #f4e4d4 (pale tan)
Text (dark):     #2c1810 (dark brown)
Accent (tan):    #d4a574 (tan)
Accent (gold):   #ffd700 (bright gold)
Border:          #8b4513 (dark brown)
```

---

## **Quick Reference: Typography**

### H1 (Main title)
```
Playfair Display, 48px, #ffd700, bold
```

### H2 (Section heading)
```
Playfair Display, 24px, #ffd700, bold
```

### H3 (Subsection)
```
Playfair Display, 18px, #d4a574, bold
```

### Body text
```
Merriweather, 16px, #f4e4d4, line-height 1.8
```

---

## **File Locations**

```
/docs/
├── README.md (this file - the index)
├── brand-kit.md (personas, voices, writing standards)
├── style-guide.md (design system, code standards)
└── validation-standards.md (quality gates, validators)
```

---

## **Document Statistics**

| Document | Lines | Size | Purpose |
|----------|-------|------|---------|
| Brand Kit | 288 | 11KB | Personas & voice |
| Style Guide | 552 | 14KB | Design & code |
| Validation Standards | 566 | 14KB | Quality gates |
| **Total** | **1,406** | **39KB** | Single source of truth |

---

## **Questions?**

**If you're confused about:**
- How Sarah should sound → Brand Kit
- What colors to use → Style Guide
- If something passes validation → Validation Standards
- Whether something is a brand standard → This README

**If nothing answers your question:**
→ Ask CEO (me) - we'll update the Library

---

## **Last Updated**
December 31, 2025

**Status:** ✅ Complete and ready for agent deployment

**Next:** Distribute to all agents with mandatory reading checklist


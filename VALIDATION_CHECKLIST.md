# Content Validation Checklist

**BEFORE PUBLISHING ANY CONTENT: Complete this checklist and run both validation skills.**

---

## Quick Validation Steps

1. **Run Copy-Editor Skill**
   ```bash
   # Or use the UI: /copy-editor
   ```
   Check for:
   - [ ] Zero em-dashes (or max 1)
   - [ ] No AI tell words
   - [ ] Sounds human when read aloud
   - [ ] Varied sentence lengths
   - [ ] Natural contractions used

2. **Run Brand Compliance Skill**
   ```bash
   # Or use the UI: /carnivore-brand
   ```
   Check for:
   - [ ] Direct and clear voice
   - [ ] Evidence-based claims
   - [ ] No excessive praise
   - [ ] Persona is authentic
   - [ ] Professional but accessible

3. **Fix All Issues Found**
   - Don't skip items
   - Re-validate after fixing

---

## Critical Rules (Zero Tolerance)

### ❌ Em-Dashes (—)
- **Max:** 1 per page, preferably 0
- **Replace with:** Periods, commas, colons

**Bad:** `The ratio—a critical factor—matters.`
**Good:** `The ratio matters. It's critical.`

### ❌ AI Tell Words
Never use these:
- delve, robust, leverage, navigate
- crucial, critical (excessive use)
- utilize (just say "use")
- realm, landscape, tapestry
- "It's important to note that..."
- "Furthermore," "Moreover," "Nevertheless"

### ❌ AI Sentence Patterns
- All sentences same length? ❌
- Overly formal transitions? ❌
- No contractions? ❌ (use don't, can't, won't)
- Generic platitudes without examples? ❌

---

## Required Human Quality Markers

✅ **Varied Sentence Lengths**
```
Short. Medium length sentence.
And then longer sentences that provide more context and detail about the topic at hand.
```

✅ **Natural Contractions**
- Use: don't, can't, won't, isn't, doesn't
- Sounds natural, not forced

✅ **Direct Address to Reader**
- "You've probably wondered..."
- "Here's what we found..."
- "We're here to help..."

✅ **Specific Examples**
- ❌ "Many people see results"
- ✅ "Sarah lost 23 pounds. Marcus reversed joint pain."

✅ **Conversational Tone**
- Read aloud test: Does it sound like a friend?
- Or like corporate marketing speak?

---

## Persona-Specific Checklist

### Sarah (Health Coach)
- [ ] Warm and encouraging
- [ ] Health/healing focused
- [ ] Personal but professional
- [ ] **NOT claiming clinical expertise**
  - ✅ "Research shows..."
  - ❌ "From my clinical observations..."
- [ ] "Resonates with your body" OK (sparingly)

### Marcus (Sales & Partnerships)
- [ ] High-energy, performance-focused
- [ ] Strategic and analytical
- [ ] Clear calls-to-action
- [ ] Data and ROI oriented
- [ ] No tech metaphors unless relevant
- [ ] Don't oversell or hype

### Chloe (Marketing & Community)
- [ ] Trendy, community-focused
- [ ] Playful and relatable
- [ ] Social and cultural insights
- [ ] **No forced tech metaphors**
  - ❌ "optimize your nutrition tech stack"
  - ✅ "manage your nutrition strategy"
- [ ] Community references natural

---

## Content Type Checklist

### Newsletter
- [ ] Subject line compelling but not hype
- [ ] Opening hook in first 2 sentences
- [ ] Data and metrics cited (BY THE NUMBERS)
- [ ] Trends explained with examples
- [ ] Each section signed by persona
- [ ] Closing with CTA
- [ ] Reading level Grade 8-10

### Q&A
- [ ] Persona matches question type:
  - Health question → Sarah
  - Strategy question → Marcus
  - Community question → Chloe
- [ ] Answer cites research/data
- [ ] No clichés ("wellness warrior," "take a deep breath")
- [ ] Persona signature included
- [ ] Links/citations formatted properly

### Website Copy
- [ ] Direct and clear
- [ ] Specific examples
- [ ] Evidence-based
- [ ] No marketing hype
- [ ] Professional tone
- [ ] Mobile readable

---

## Common Mistakes to Avoid

| Mistake | Fix | Why |
|---------|-----|-----|
| 4+ em-dashes | Replace with periods/commas | AI pattern |
| "wellness warrior" | Remove or vary greeting | Clichéd opener |
| "clinical observations" (Sarah) | "research shows" | False claim |
| "tech stack" (Chloe) | "strategy" or "plan" | Awkward metaphor |
| All sentences same length | Add some short ones | Sounds robotic |
| No contractions | Add don't, can't, won't | Sounds formal |
| Generic statements | Add specific examples | Sounds AI-generated |
| Excessive praise | Use "research shows" | Hype = untrustworthiness |

---

## Validation Decision Matrix

**✅ PUBLISH IF:**
- Copy-editor: PASS ✓
- Brand: PASS ✓
- No critical issues found
- Content sounds human when read aloud

**🛑 REVISE IF:**
- Copy-editor: FAIL ❌
- Brand: FAIL ❌
- Any critical rules violated
- Sounds robotic or overly formal

---

## When Stuck

**If you're not sure:**
1. Read the relevant section in `CONTENT_VALIDATION.md`
2. Compare your text to the "Good" examples
3. Run copy-editor and brand skills
4. Ask for clarification

**If validation keeps failing:**
1. Are you trying to sound too professional?
2. Are you being too generic (no examples)?
3. Is the persona correct for this content type?
4. Read aloud - does it sound like you talking to a friend?

---

## Workflow

**Every Time Before Publishing:**
```
Generate Content
    ↓
Run /copy-editor skill
    ↓
Run /carnivore-brand skill
    ↓
Fix All Issues
    ↓
Re-validate if major changes made
    ↓
PUBLISH ✅
```

**Never:**
- ❌ Skip validation to "save time"
- ❌ Publish with known issues
- ❌ Use "will fix later" as excuse
- ❌ Rely only on one skill (need both)

---

## Questions?

See the full guide: `CONTENT_VALIDATION.md`

Quality content builds trust. Trust builds audience. **Validation is essential.**

---

**Last Updated:** 2025-12-30
**Status:** Active before all publishing

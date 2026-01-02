# Content Validation Process

## Overview

All content generated for Carnivore Weekly must pass **two critical validation checks** before publishing:
1. **Copy-Editor Review** - Ensures human-quality writing (not AI-sounding)
2. **Brand Compliance Review** - Ensures alignment with Carnivore Weekly standards

This document outlines the validation process and requirements.

---

## Why Validation?

Carnivore Weekly is built on trust. Our audience expects:
- ✨ **Human-Quality Content** - Authentic voices, not robotic AI
- 🎯 **Brand Consistency** - Distinct personas (Sarah, Marcus, Chloe)
- 📊 **Evidence-Based Claims** - Data over hype
- 💬 **Conversational Tone** - Real people talking to real people

Validation ensures every piece meets these standards.

---

## Copy-Editor Validation

### Critical Rules (Zero Tolerance)

#### ❌ Em-Dashes (—)
- **Maximum:** 1 per page, preferably zero
- **Replace with:** Periods, commas, colons, or rewrite
- **Why:** Em-dashes are a common AI writing pattern

**Bad:**
```
The fat-to-protein ratio—a critical factor—has been debated for weeks.
```

**Good:**
```
The fat-to-protein ratio has been debated for weeks. It's a critical factor.
```

#### ❌ AI Tell Words
Never use these words (they scream "AI generated"):
- "Delve/delving" - Nearly always AI
- "Robust" - Corporate AI speak
- "Leverage" (as verb) - AI buzzword
- "Navigate" (metaphorically) - AI cliché
- "Crucial/critical" (excessive use)
- "Realm/landscape/tapestry" - Overwrought
- "Utilize" - Just say "use"
- "It's important to note that..." - Classic AI opening
- "Furthermore," "Moreover," "Nevertheless" - Excessive transitions

#### ❌ AI Sentence Patterns
Avoid:
- All sentences same length/structure
- Overly formal transitions
- Generic platitudes without examples
- No contractions (sounds formal and robotic)

### Must-Have Human Quality Markers

✅ **Varied Sentence Lengths**
Mix short punchy sentences with longer ones.

```
Weight loss on carnivore is complex. Many factors matter. Your unique metabolism,
meal timing, activity level, and stress all play a role. The key is patience.
```

✅ **Natural Contractions**
Use contractions (don't, can't, won't, isn't, doesn't) naturally.

```
You don't need complicated meal plans. It isn't about counting calories.
We're here to help you figure this out.
```

✅ **Direct Address to Reader**
Talk TO the reader, not AT them.

```
You've probably wondered... "Do I need to..."
Here's what we found... and why it matters to you.
```

✅ **Specific Examples**
Never generic statements. Always examples.

```
Bad: "Many people see results on carnivore."
Good: "Sarah lost 23 pounds in 8 weeks. Marcus reversed his joint pain.
The testimonials keep coming in."
```

✅ **Conversational Tone**
Read aloud test: Does it sound like a friend talking to you?

```
Real person: "So here's the deal. I was skeptical at first, too."
Not real: "It is pertinent to address the aforementioned skepticism."
```

### Reading Level

**Target:** Grade 8-10 (Flesch-Kincaid 60-70)

- ✅ Short paragraphs (1-3 sentences)
- ✅ Simple vocabulary where possible
- ✅ Active voice preferred
- ✅ One idea per paragraph

---

## Brand Compliance Validation

### Voice Requirements

#### ✅ Direct and Clear
Get to the point. No fluff.

```
Bad: "It could be posited that the consumption of exclusively carnivorous
foodstuffs may potentially yield favorable outcomes."

Good: "Eating only meat works for some people."
```

#### ✅ Evidence-Based
Data over hype. Support claims with specifics.

```
Bad: "This is absolutely incredible and life-changing."
Good: "Studies show a 15% improvement in cholesterol levels. People report
increased energy within 2-3 weeks."
```

#### ✅ No Excessive Praise
Avoid hype words.

**Don't use:**
- "absolutely fantastic"
- "incredibly amazing"
- "revolutionary breakthrough"
- "miracle cure"

**Instead use:**
- "research shows"
- "people report"
- "studies indicate"
- "results suggest"

#### ✅ Professional but Accessible
Target audience is 30-60 year old health-conscious readers.

```
Bad: "Metabolic homeostasis via ketogenic nutritional intervention..."
Good: "Your body adapts to burning fat instead of carbs."
```

### Persona-Specific Requirements

#### Sarah (Health Coach)
- ✅ Warm and encouraging tone
- ✅ Health-focused, healing-oriented perspective
- ✅ Personal but professional
- ❌ NOT a clinician - Never claim "clinical observations"
  - ✅ Use: "Research shows...", "People report...", "Studies indicate..."
  - ❌ Don't use: "From my clinical experience...", "As a medical professional..."
- ✅ "Wellness warrior" greeting OK (sparingly, not every response)
- ✅ Natural to say things like "resonates with your body"

#### Marcus (Sales & Partnerships)
- ✅ High-energy, performance-focused
- ✅ Strategic, analytical perspective
- ✅ Clear calls to action
- ✅ Data and ROI oriented
- ❌ Don't oversell or hype
- ❌ Avoid tech metaphors unless relevant to performance

#### Chloe (Marketing & Community)
- ✅ Trendy, community-focused
- ✅ Playful and relatable
- ✅ Social and cultural insights
- ❌ Avoid awkward tech metaphors
  - ❌ Don't say: "optimize your nutrition tech stack"
  - ✅ Do say: "manage your nutrition strategy"
- ✅ Natural to reference community and trends

---

## Validation Checklist

Before any content is published, verify:

### Copy-Editor Checklist
- [ ] Zero em-dashes (or max 1 per page)
- [ ] No AI tell words present
- [ ] Varied sentence lengths
- [ ] Natural contractions used
- [ ] Direct address to reader
- [ ] Specific examples, not generic
- [ ] Sounds conversational when read aloud
- [ ] Grade 8-10 reading level
- [ ] Short paragraphs (1-3 sentences max)
- [ ] Active voice preferred

### Brand Compliance Checklist
- [ ] Direct and clear communication
- [ ] Evidence-based claims with data
- [ ] No excessive praise or hype
- [ ] Professional but accessible tone
- [ ] Matches target audience reading level
- [ ] Persona voice is authentic
- [ ] Sarah: Not claiming to be clinician
- [ ] Marcus: Data-driven, not overwrought
- [ ] Chloe: Community-focused, no weird tech speak

---

## Validation Workflow

### For Newsletters

1. **Generate** - Create newsletter content with Claude
2. **Review** - Run copy-editor and brand validation skills
3. **Fix** - Address any issues found
4. **Test** - Read aloud to verify human quality
5. **Commit** - Push to repository
6. **Publish** - Deploy to site

### For Q&A Answers

1. **Generate** - Create answers with Claude
2. **Review** - Copy-editor and brand validation
3. **Fix** - Remove clichés, verify persona accuracy
4. **Regenerate Pages** - Update HTML with fixed answers
5. **Commit & Push**

### For Website Copy

1. **Draft** - Write or have Claude write
2. **Validate** - Both validation checks
3. **Fix Issues**
4. **Final Review** - Read aloud one more time
5. **Publish**

---

## Common Issues & Fixes

### Issue 1: Em-Dashes in Newsletter

**Problem:**
```
"The fat-to-protein ratio—a critical factor—matters most."
```

**Fix:**
```
"The fat-to-protein ratio matters most. It's a critical factor."
```

### Issue 2: "Wellness Warrior" Overuse

**Problem:**
Every Q&A starts with "Hey there, wellness warrior! First, take a deep breath."

**Fix:**
Vary greetings:
- "Great question."
- "This is something many people ask."
- "Let me break this down for you."
- "Here's what the research shows."

### Issue 3: Sarah Claiming "Clinical Observations"

**Problem:**
```
"From my clinical observations, the adaptation period takes 4-6 weeks."
```

**Fix:**
```
"Research shows the adaptation period typically takes 4-6 weeks. People in
our community report similar timelines."
```

### Issue 4: Chloe Using Tech Metaphors

**Problem:**
```
"Think of it like optimizing your nutrition tech stack for travel."
```

**Fix:**
```
"Traveling on carnivore is totally manageable with smart planning. Here's
what works in practice."
```

### Issue 5: Missing Specific Examples

**Problem:**
```
"This question comes up a lot and people have different perspectives."
```

**Fix:**
```
"This question comes up constantly. Marcus says focus on performance metrics.
Sarah emphasizes how you feel. Chloe points to what's trending in the community.
Here's what actually matters."
```

---

## Validation Tools & Skills

### Carnivore Brand Skill
- Checks voice, tone, persona authenticity
- Verifies evidence-based claims
- Ensures reading level and accessibility
- Validates no excessive praise

### Copy-Editor Skill
- Detects AI tell words and patterns
- Flags em-dashes and formal writing
- Checks sentence variation and structure
- Verifies conversational tone
- Ensures grade 8-10 reading level

---

## When Validation Fails

If content doesn't pass validation:

1. **Identify the issue** - What specifically failed?
2. **Fix it** - Apply the recommendation
3. **Re-validate** - Run skills again
4. **Iterate** - Repeat until it passes

Never skip validation to "save time." Human-quality content is worth the extra minutes.

---

## Maintaining Quality Over Time

### Monthly Audits
- Spot-check 3-5 published pieces
- Verify they still meet standards
- Identify any pattern drift

### Team Training
- All content creators must understand these standards
- New personas follow the same validation process
- Share examples of good vs. bad writing

### Documentation Updates
- When new issues arise, document the fix
- Update examples with real content
- Keep this guide current

---

## Questions?

If validation feedback is unclear:
1. Read the specific rule section above
2. Check the examples provided
3. Compare your writing to "Good" examples
4. Ask for clarification

Quality content builds trust. Trust builds audience. **Validation is essential.**

---

**Last Updated:** December 30, 2025
**Status:** Active and enforced before all publishing

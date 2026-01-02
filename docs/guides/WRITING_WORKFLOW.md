# Carnivore Weekly Writing Workflow

## Standard Process for All New Content

When writing ANY new content for Carnivore Weekly:

1. **Write/Generate** the content
2. **Review with copy-builder skill** - Run before deployment
3. **Deploy**

## How to Use copy-builder

```bash
# For HTML files
claude /copy-builder public/index.html

# For markdown
claude /copy-builder FILENAME.md

# For specific text
claude /copy-builder "Your text here"
```

## What copy-builder Checks

✅ **Removes AI-speak:**
- Deletes: utilize, leverage, facilitate, comprehensive, implement
- Replaces with plain English

✅ **Ensures Conversational Tone:**
- Uses contractions (don't, it's, we're)
- Explains the "why" not just the "what"
- Sounds like a helpful colleague

✅ **Adds Grounding (20% rule):**
- Whistler/BC references where relevant
- Personal time markers ("90 days tracking...")
- Weather/local context

## Why This Matters for Carnivore Weekly

Your brand is **direct, evidence-based, no hype**.

❌ **AI-speak undermines this:**
- "Comprehensive implementation of macronutrient analysis"
- "Facilitate better nutritional outcomes"

✅ **Plain English reinforces it:**
- "Calculate your macros"
- "Get better nutrition results"

## Examples from Phase A

**Before (AI-generated):**
"This comprehensive analysis facilitates optimization of nutritional parameters through data-driven insights."

**After (copy-builder):**
"Here's why this video matters for your carnivore diet—and who should watch it."

---

**Remember:** Every time you write for the site, use copy-builder. It takes 2 minutes and keeps your voice consistent.

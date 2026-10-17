# Content Creation Guide

## Writer Personas

All content is written through three personas. See `agents/*.md` for full profiles.

### Sarah Chen — Health & Science Editor
- **Voice**: Educational, warm, evidence-based
- **Opens with**: Personal observations from the community
- **Signature move**: Specific biomarker numbers (glucose 110, insulin 5)
- **Uses**: "Your body" phrasing, simplified science
- **Avoids**: Academic jargon, "it's important to note," same-length sentences

### Marcus Rivera — Performance & Optimization
- **Voice**: Direct, punchy, no-nonsense
- **Opens with**: Specific numbers and math ($7/day, 1.5 lbs beef)
- **Signature move**: Actionable protocols with measurements
- **Uses**: Definitive statements, concrete data
- **Avoids**: Hedging ("might," "could"), filler words, vague approximations

### Chloe Park — Community & Lifestyle
- **Voice**: Conversational, humorous, insider bestie
- **Opens with**: Immediate relatability ("Okay so...")
- **Signature move**: Community moments and real-life hacks
- **Uses**: Natural humor, insider language, trending references
- **Avoids**: Corporate speak, try-hard jokes, overly polished writing

## Writing Workflow

1. All content passes through the `copy-editor` skill before deployment
2. Strip AI-speak words: utilize, leverage, facilitate, comprehensive
3. Enforce contractions and conversational tone
4. Add 20% grounding with real-world references

## Blog Post Structure

```json
{
  "id": "2026-02-16-post-slug",
  "title": "Post Title (under 60 chars)",
  "author": "sarah|marcus|chloe",
  "status": "draft|ready|published",
  "publish_date": "2026-02-16",
  "tags": ["tag1", "tag2"],
  "content": "HTML body content only — no template markup"
}
```

**Critical rules:**
- Content = article body only. Template handles reactions, wiki links, videos, footers, tags
- Never set future dates (Google penalizes)
- Amazon book links wrap only the title, not the full citation
- Studies link the full citation to PubMed

## Medical Disclaimers

New content (CONTENT LINE, Brew 2026-10-17, replaces the 7-category system): exactly ONE safety line per page, word for word, near the first number that needs it: "This is not for everyone. Talk to your doctor first if you have high blood pressure, kidney or heart problems, diabetes, are pregnant, or take medicine." Never repeat it after each recommendation. Keep the diet's real numbers, worded as what people on the diet typically do. Never tell a reader to start, stop or change a medicine, diagnose, promise a cure, give drug doses or supplement amounts above the label, or skip medical care. Full rule: `docs/house-claims.md`, "Content line". Checked by `scripts/check_doctor_line.py`. Published posts are not re-edited.

## Publishing Pipeline

- **Schedule**: 2x/week (Sunday + Wednesday midnight UTC)
- **Auto-publish**: GitHub Action at 9 AM EST runs `daily_publish.py`
- **Status flow**: draft → ready → published
- **Validation**: 3-wall system (auto-fix → pre-commit → GitHub Actions)

# CarnivoreWeekly Project Status
Last Updated: January 11, 2026

## 🔴 CRITICAL (Fix First)
1. **Video commentary missing** - content-of-the-week.json exists but generate.py not loading it
2. **Supabase caching disabled** - Keys on Wrangler, need SERVICE_ROLE_KEY added to .env for caching
3. **Newsletter CTA broken** - Shows alert(), needs Supabase connection

## ⚠️ NEEDS ATTENTION
4. **Sentiment analysis not executing** in automation
5. **API failure overwrites good data** (no protection)
6. **Trending topics showing placeholders**
7. **Post reactions/polls untested**
8. **Root directory cleanup** (153 items)

## 🟡 BACKLOG
9. Schema backfill on 24 blog posts
10. Wiki page styling check
11. Partner logos (ButcherBox, LMNT)

## ✅ COMPLETED (Jan 11)
- Mobile nav fixed and working
- Calculator mobile layout centered
- Calculator SEO (schema, FAQ, H1, meta description)
- Templates updated with 2026 design
- Automation tested and generating correct pages
- HOW-IT-WORKS.md documentation created
- Chloe's voice in roundup verified
- Channels page toggle restored
- Validation passing (0 critical errors)
- Blog posts standardized to gold template
- Full feature audit completed

## 📁 KEY FILES
- **CLAUDE.md** - Institutional memory and rules
- **docs/HOW-IT-WORKS.md** - Full system documentation
- **docs/PROJECT-STATUS.md** - Live status (this file)
- **docs/FEATURE-AUDIT-JAN11.md** - Full feature audit
- **docs/SESSION-HANDOFF-JAN11.md** - Last session handoff
- **templates/index_template.html** - Homepage template (edit this, not public/)
- **templates/channels_template.html** - Channels template
- **/agents/*.md** - Writer and QA agent prompts

## 🔑 ENVIRONMENT NEEDED
- **SUPABASE_SERVICE_ROLE_KEY** - Required for caching
  - Location: Supabase Dashboard → Settings → API → service_role
  - Action: Add to .env file
  - Result: Enables YouTube video caching to prevent API quota failures

## 📊 DATA STATUS
- **Supabase tables**: Created but mostly empty
- **youtube_videos**: 0 rows (no caching active - missing SERVICE_ROLE_KEY)
- **Calculator**: 7 sessions, 4 reports (working ✅)
- **Feedback**: 2 submissions (working ✅)
- **Newsletter**: 1 subscriber
- **Blog posts**: 19 posts in database

## 🚀 NEXT SESSION STARTS HERE
1. Read this file and CLAUDE.md
2. Fix video commentary (most visible user-facing issue)
3. Add Supabase SERVICE_ROLE_KEY to .env and test caching
4. Run cleanup after fixes verified

## MANUAL EDITS LOG

Track manual edits to auto-generated files (may be overwritten by automation).

| File | Change | Reason | Date | Will be overwritten? |
|------|--------|--------|------|---------------------|
| _No manual edits yet_ | - | - | - | - |

**When to log**: Any time you manually edit `public/index.html` or `public/channels.html` instead of the template files.

**Example entry**:
```
| public/index.html | Fixed Chloe's byline | Writer attribution error | 2026-01-11 | Yes (update template too) |
```

---

**Session Date**: 2026-01-11
**Next Review**: After fixing critical issues
**Full Audit**: docs/FEATURE-AUDIT-JAN11.md

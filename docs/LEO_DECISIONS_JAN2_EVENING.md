# Decisions for Leo → Supabase Knowledge Entries
**Session:** January 2, 2026 (Evening)
**For:** Leo (Database Architect) - Insert to knowledge_entries table
**Status:** Ready for promotion to immutable record

---

## DECISION #1: Homepage Content Rendering Standard

**Title:** Markdown rendering is default for all homepage content

**Content:** All markdown content on the homepage (including weekly summary, trends, community content) must be rendered as professional HTML via markdown filter. Raw markdown syntax (# ## -) is never displayed to users. CSS styling ensures proper typography hierarchy, spacing, and brand compliance.

**Source File:** docs/project-log/daily/2025-01-02.md
**Tags:** [homepage, content-display, rendering, markdown, quality-standard]
**Type:** decision
**Confidence:** 100% (implemented and live)
**Rationale:** First impression users see must be 100% polished. Raw markdown text looks unprofessional and signals poor quality. Markdown rendering via filter achieves this without manual conversion.

---

## DECISION #2: Supabase as Primary YouTube Data Source

**Title:** Supabase youtube_videos table is primary data source; JSON is fallback

**Content:** YouTube collector writes to Supabase youtube_videos table immediately after API fetch. Generator prioritizes reading from Supabase (cached data) before JSON file before analysis data. This reduces API calls, protects against rate limits, and improves build speed on subsequent runs.

**Source File:** docs/project-log/daily/2025-01-02.md
**Tags:** [supabase, caching, youtube-api, performance, rate-limit-protection]
**Type:** decision
**Confidence:** 95% (implemented, tested in build)
**Rationale:** YouTube API rate limits are production risk. Caching in Supabase provides safety layer and measurable performance improvement. Tested with this week's build: API called once, data cached for generator.

---

## DECISION #3: Blog Topic 80-Day Deduplication Rule

**Title:** Blog topics cannot be repeated within 80 days of publication

**Content:** Chloe's weekly blog topic curation checks data/published_blogs.json and filters out any topics published in the last 80 days. This prevents topic repetition (e.g., "PCOS" published Dec 30 cannot be suggested again until Mar 10). Prevents topic clustering where one trending topic dominates multiple weeks.

**Source File:** docs/project-log/daily/2025-01-02.md
**Tags:** [blog-strategy, content-planning, deduplication, chloe, editorial-standards]
**Type:** decision
**Confidence:** 100% (system designed, deduplication logic created)
**Rationale:** Blog diversity is quality signal. Repeating topics signals lazy content strategy. 80-day window allows seasonal trending cycles (New Year, summer, etc.) without saturation. Prevents "butter trend for 3 weeks straight" scenario.

---

## DECISION #4: Weekly Agent Workflow - Chloe → Sarah → Homepage

**Title:** Weekly automation follows Chloe-generates-report → Sarah-generates-welcome workflow

**Content:**
1. Chloe generates social media report (CHLOE_COMMUNITY_REPORT_[DATE].md) documenting trending topics, creators, commenter sentiment, and WHY things are trending
2. Chloe generates prioritized blog topic queue (blog_topics_queue.json) with 80-day deduplication applied
3. Sarah uses Chloe's report + YouTube data to generate homepage welcome narrative
4. Sarah's narrative replaces current analysis display, rendered as markdown with professional styling

**Source File:** docs/project-log/daily/2025-01-02.md
**Tags:** [automation, agent-workflow, chloe, sarah, homepage, weekly-cycle]
**Type:** decision
**Confidence:** 95% (workflow defined, integration pending)
**Rationale:** Separating data gathering (Chloe) from content generation (Sarah) creates clear responsibility boundaries and allows quality checking at each stage. Weekly cadence matches content publishing cycle. Sarah's warm welcome tone sets better first impression than raw analysis.

---

## ASSUMPTION: Chloe Can Accurately Monitor All Social Platforms Weekly

**Title:** Chloe's weekly social monitoring is sustainable and accurate

**Content:** Assumption that Chloe can reliably monitor Instagram, Reddit, TikTok, Twitter/X, YouTube, and Discord weekly, identify genuine trending topics, understand WHY they're trending (emotional drivers, practical value, controversy), and document with sufficient detail for Sarah to use.

**Source File:** docs/project-log/daily/2025-01-02.md (from CHLOE_COMMUNITY_REPORT_2026-01-01.md)
**Tags:** [chloe, social-monitoring, assumption, weekly-workload]
**Type:** assumption
**Confidence:** 85% (Chloe's Jan 1 report validates capability; sustainability untested over 12 weeks)
**Rationale:** Chloe's Jan 1 report demonstrates quality, depth, and actionability. But "weekly sustainable" has not been proven yet. Will validate after 4-week cycle.

---

## ASSUMPTION: Sarah Can Generate Homepage Welcome Using Chloe Data

**Title:** Sarah can synthesize Chloe's social data + YouTube metrics into coherent homepage narrative

**Content:** Assumption that Sarah can take Chloe's social report + YouTube video trends + world context (New Years, World Carnivore Month, seasonal events) and generate a warm, engaging 4-5 paragraph homepage welcome that feels human and doesn't over-optimize or oversell.

**Source File:** docs/project-log/daily/2025-01-02.md
**Tags:** [sarah, homepage, content-generation, assumption, weekly-workload]
**Type:** assumption
**Confidence:** 80% (Sarah's voice is proven; combining data sources is new)
**Rationale:** Sarah's blog post writing proves she can synthesize complex information. Homepage welcome is shorter/more conversational. Risk: over-analysis or losing conversational tone when working from data. Will validate after first run (Jan 9).

---

## NOTE: Automation Integration Pending

**Title:** Chloe/Sarah roles not yet integrated into run_weekly_update.sh

**Content:** Agent roles are defined and ready, but run_weekly_update.sh has not been updated to:
1. Call Chloe's social monitoring logic
2. Call Sarah's homepage generation logic
3. Pass Chloe's report to Sarah as input
4. Apply blog topic deduplication in automated context

This is 90% ready (design complete) but requires final integration.

**Source File:** docs/project-log/daily/2025-01-02.md
**Tags:** [automation, integration, pending, chloe, sarah, run_weekly_update.sh]
**Type:** note
**Status:** Requires attention before Jan 9 automation run
**Action:** Finalize automation hooks for full workflow (see current-status.md "Critical for Next Week")

---

## TO LEO:

Please insert all 4 DECISION entries and 2 ASSUMPTION entries into knowledge_entries table. Mark NOTE as informational (not inserted to Supabase).

**Mark these as READ-ONLY once inserted** (no updates/deletes allowed per Memory Architecture constraint).

These entries establish the foundation for next week's automation cycle and protect against scope creep or inconsistent implementation.

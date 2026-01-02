# Markdown Cleanup Audit — 2025-01-02

## Overview
Audited 300+ markdown files across carnivore-weekly project. Extracted high-confidence decisions, assumptions, and insights for long-term memory storage in Supabase (via Leo).

## Files Audited
- Root-level: 110+ .md files (PHASE_*.md, DEPLOYMENT_*.md, BENTO_GRID_*.md, etc.)
- docs/: 60+ configuration, design system, API docs
- agents/: 10 persona files + daily logs + protocols
- Test/build artifacts: playwright-report/, test-results/ (auto-generated)
- Project structure: calculator2-demo/, dashboard/, api/, gemini-code-assist-mcp/

## Classification Framework (CLAUDE.md)

**PLAN** - Strategic direction, roadmaps
- FLYWHEEL_BLUEPRINT.md
- BENTO_GRID_EXECUTIVE_SUMMARY.md (Jan 27 launch)
- AGENT_DEPLOYMENT_MATRIX.md
- MONTHLY_STRATEGY_REVIEW.md
- BOARD_VISION_2026.md

**RESEARCH** - Investigation, discovery, analysis
- AUDIT_EXECUTIVE_SUMMARY.md
- AUDIT_TECHNICAL_INDEX.md
- LEO_SYSTEM_AUDIT_REPORT.md
- SUPABASE_DIAGNOSTIC_REPORT.md
- TECHNICAL_ANALYSIS.md

**SPEC** - Technical specifications
- LEO_DATABASE_BLUEPRINT.md (core 4-table architecture)
- BENTO_GRID_SPECIFICATION.md (60+ pages)
- PHASE_2_ARCHITECTURE.md (unified config system)
- DEPLOYMENT_CHECKLIST.md (100+ items)
- QA_VALIDATION_FRAMEWORK.md
- docs/CONFIGURATION_AUDIT.md

**NOTE** - Decisions, observations, logs
- docs/project-log/ (authoritative, maintained by Quinn)
- docs/BOARD_VISION_2026.md
- Session summaries
- Incident reports

**JUNK** - Obsolete, superseded
- PHASE_2_IMPLEMENTATION_CHECKLIST.md (Phase 2 complete)
- PHASE2A_*.md series (old naming convention)
- ACTIVATION_EXECUTION_GUIDE.md (post-launch artifact)
- Old deployment guides for archived phases

**ARCHIVE** - Preserve history, extract first
- PHASE_1_DELIVERY_SUMMARY.md
- PHASE_2_COMPLETION_REPORT.md
- PHASE_3B_EXECUTIVE_SUMMARY.md
- PHASE_4A_DEPLOYMENT_SUMMARY.md
- All completed phase documentation
- Historical deployment reports
- test-results/, playwright-report/ (auto-generated)

## Extracted Insights (Saved for Supabase)

### High-Confidence Decisions
1. **Technology Stack Locked**
   - Python 3.9 + Claude AI (Anthropic)
   - GitHub Pages + GitHub Actions
   - PostgreSQL/Supabase (4-table core: content, engagement, topics, interests)
   - ACID-first philosophy mandatory

2. **Validation Pipeline Non-Negotiable**
   - All content passes: Copy-Editor → Carnivore-Brand → AI-Text-Humanization
   - Em-dash rule: max 1 per post
   - 15+ "AI tell words" blacklisted
   - Quality = brand moat

3. **Persona System Database-Backed**
   - 9 writers with voice formulas in writers table
   - Token optimization: 10,000 → 174 tokens (98.3% reduction)
   - Query performance: 37.75ms avg (<50ms target)

4. **Bento Grid Launch Locked**
   - Date: Jan 27, 2025 (contingency Feb 3)
   - Scope: 3 MVP features (Trending Explorer, Wiki Auto-Linker, Sentiment Visualizer)
   - Team: 5 people, 129 hours, 137-hour contingency

5. **Phase Gate Deployment**
   - 100+ item checklists across 8 categories
   - Pre-launch ceremony culture
   - Rollback procedures documented
   - Emergency contacts identified

### Key Assumptions (Medium-Confidence)
- 10% bounce rate improvement achievable post-launch
- 30% adoption rate for interactive features (no baseline)
- Real-time engagement scoring necessary (could batch hourly)
- Claude maintains consistent persona voice across writers
- 10 "top creators" remain relevant (needs quarterly update)

### Critical Gaps (Found)
- No false-negative rate documented for validators
- No post-mortem from past deployments
- No A/B testing framework for feature adoption
- No quality comparison before/after token optimization
- No historical data on validator effectiveness

## Action Items (For Leo/Supabase)

**Extract to `document_insights` table:**
- source_file (e.g., "LEO_DATABASE_BLUEPRINT.md")
- insight_type (decision | assumption | lesson_learned | risk_pattern | success_factor)
- confidence (HIGH | MEDIUM | LOW)
- content (the actual insight)
- extraction_date (2025-01-02)
- status (extracted | archived)

## Files to Move (After Extraction)

### To docs/plans/
- FLYWHEEL_BLUEPRINT.md
- BENTO_GRID_EXECUTIVE_SUMMARY.md
- PHASE_*.md (all phase plans)
- MONTHLY_STRATEGY_REVIEW.md
- AGENT_DEPLOYMENT_MATRIX.md

### To docs/research/
- AUDIT_*.md (all 4 audit files)
- LEO_SYSTEM_AUDIT_REPORT.md
- SUPABASE_DIAGNOSTIC_REPORT.md
- TECHNICAL_ANALYSIS.md

### To docs/specs/
- LEO_DATABASE_BLUEPRINT.md
- BENTO_GRID_SPECIFICATION.md
- PHASE_2_ARCHITECTURE.md
- DEPLOYMENT_CHECKLIST.md
- QA_VALIDATION_FRAMEWORK.md
- docs/CONFIGURATION_AUDIT.md

### To docs/notes/archive/ (Preserve Git History)
- PHASE_*_DELIVERY_SUMMARY.md
- PHASE_*_COMPLETION_REPORT.md
- Historical deployment reports
- test-results/ (entire directory)
- playwright-report/ (entire directory)

### Delete (No Value) - After Extraction
- None. All files preserved (no deletions per CLAUDE.md)

## Next Steps

1. **Leo**: Create `document_insights` table in Supabase
2. **Quinn**: Extract all HIGH-confidence items to Supabase table
3. **Quinn**: Move PLAN files to docs/plans/
4. **Quinn**: Move RESEARCH files to docs/research/
5. **Quinn**: Move SPEC files to docs/specs/
6. **Quinn**: Archive old phase docs with date prefix
7. **Quinn**: Update README.md with new directory structure
8. **Quinn**: Document extraction completion in daily log

## Status

**Extraction:** COMPLETE (all insights extracted to this document)
**Supabase Load:** PENDING (awaiting Leo setup)
**File Movement:** PENDING (awaiting Quinn review)
**Archive:** PENDING (preserve git history, no deletions)

See docs/project-log/daily/2025-01-02.md for full session notes.

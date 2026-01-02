-- Quinn: Load extracted insights to knowledge_entries table
-- Source: Markdown cleanup audit (2025-01-02)
-- Status: Ready to execute in Supabase SQL Editor

-- DECISIONS (HIGH CONFIDENCE)

INSERT INTO knowledge_entries (type, title, summary, source_file, confidence, tags) VALUES (
  'decision',
  'Quinn as Operations Manager',
  'Single source of truth for project logs, status, decisions. Manages docs/project-log/ daily logs, current-status updates, decision tracking, and institutional memory.',
  'docs/project-log/decisions.md',
  'high',
  ARRAY['operations','logging','authority','jan-2025']
);

INSERT INTO knowledge_entries (type, title, summary, source_file, confidence, tags) VALUES (
  'decision',
  'Daily/Status/Decisions Log Structure',
  'Three-file architecture: daily logs (session notes), current-status (project state), decisions (architectural choices). Clear separation of concerns, easy to search and review.',
  'docs/project-log/decisions.md',
  'high',
  ARRAY['documentation','structure','logging','jan-2025']
);

INSERT INTO knowledge_entries (type, title, summary, source_file, confidence, tags) VALUES (
  'decision',
  'Project Logs Stored in docs/project-log/',
  'Authoritative source of truth versioned in git, accessible to all team members. Not scattered across multiple locations or local .claude directory.',
  'docs/project-log/decisions.md',
  'high',
  ARRAY['git','version-control','authority','documentation']
);

INSERT INTO knowledge_entries (type, title, summary, source_file, confidence, tags) VALUES (
  'decision',
  'Markdown Cleanup Extractions → Supabase via Leo',
  'All institutional knowledge extracted from scattered markdown files before archiving. Prevents knowledge loss during file organization. Long-term memory lives in knowledge_entries table, not raw markdown files.',
  'docs/project-log/decisions.md',
  'high',
  ARRAY['memory','supabase','leo','architecture','jan-2025']
);

INSERT INTO knowledge_entries (type, title, summary, source_file, confidence, tags) VALUES (
  'decision',
  'Technology Stack Locked',
  'Python 3.9 + Claude AI (Anthropic), GitHub Pages + GitHub Actions, PostgreSQL/Supabase with 4-table core (content, engagement, topics, interests). ACID-first philosophy mandatory. Proven in Phase 2. Changes require CEO approval only.',
  'LEO_DATABASE_BLUEPRINT.md',
  'high',
  ARRAY['architecture','technology','locked','phase-2-complete','supabase']
);

INSERT INTO knowledge_entries (type, title, summary, source_file, confidence, tags) VALUES (
  'decision',
  'Validation Pipeline Non-Negotiable',
  'All content passes three mandatory validators: Copy-Editor (AI detection) → Carnivore-Brand (voice consistency) → AI-Text-Humanization (authenticity). Quality is core brand moat. Em-dash rule: max 1 per post. 15+ AI tell-words blacklisted.',
  'VALIDATION_STANDARDS_FOR_TEAM.md',
  'high',
  ARRAY['quality','validation','brand','content','locked']
);

INSERT INTO knowledge_entries (type, title, summary, source_file, confidence, tags) VALUES (
  'decision',
  'Bento Grid Launch Locked to Jan 27, 2025',
  'Fixed deadline with Feb 3 contingency (CEO-approved). Scope locked to 3 MVP features: Trending Explorer, Wiki Auto-Linker, Sentiment Visualizer. 5-person team, 129 hours, 137-hour contingency buffer.',
  'BENTO_GRID_EXECUTIVE_SUMMARY.md',
  'high',
  ARRAY['bento-grid','launch','scope','timeline','locked']
);

INSERT INTO knowledge_entries (type, title, summary, source_file, confidence, tags) VALUES (
  'decision',
  'Phase Gate Deployment Process',
  '100+ item checklists across 8 categories (code quality, performance, brand compliance, database, backup, team sign-offs). Prevents scope creep. Rollback procedures documented. Emergency contacts identified. Pre-launch ceremony culture ensures quality.',
  'DEPLOYMENT_CHECKLIST.md',
  'high',
  ARRAY['deployment','process','quality-gates','phase-gates','locked']
);

-- INSIGHTS (HIGH CONFIDENCE)

INSERT INTO knowledge_entries (type, title, summary, source_file, confidence, tags) VALUES (
  'insight',
  'Persona System Database-Backed',
  'Voice formulas stored in writers table (Supabase). 9 personas fully tested. Token optimization: 10,000 → 174 tokens (98.3% reduction). Query performance: 37.75ms avg (<50ms target). Personas are system-of-record; all content generation flows through database.',
  'EXECUTIVE_SUMMARY.md',
  'high',
  ARRAY['persona','optimization','database','content-generation','performance']
);

INSERT INTO knowledge_entries (type, title, summary, source_file, confidence, tags) VALUES (
  'insight',
  'Markdown File Organization Chaos',
  '110+ markdown files scattered across root, docs/, agents/. Two parallel systems: docs/project-log/ (authoritative) vs scattered planning docs (static). Critical insight: extract decisions BEFORE archiving or knowledge is lost. File cleanup must happen systematically.',
  'MARKDOWN_CLEANUP_AUDIT_2025-01-02.md',
  'high',
  ARRAY['organization','cleanup','documentation','risk','jan-2025']
);

INSERT INTO knowledge_entries (type, title, summary, source_file, confidence, tags) VALUES (
  'insight',
  'Validation Pipeline is Core Moat',
  'Content quality is defensible brand advantage. All content indistinguishable from human writing. Validators catch AI patterns (em-dashes, tell-words, tone consistency). No documented false-negative rate; gap in quality assurance.',
  'VALIDATION_STANDARDS_FOR_TEAM.md',
  'high',
  ARRAY['validation','brand','quality','moat','competitive-advantage']
);

-- ASSUMPTIONS (MEDIUM CONFIDENCE)

INSERT INTO knowledge_entries (type, title, summary, source_file, confidence, tags) VALUES (
  'assumption',
  '10% Bounce Rate Improvement Post-Bento Launch',
  'Target improvement within 1 month post-Bento Grid launch. Basis: time-on-page increase from interactive features. No historical data provided; based on UX patterns from other redesigns. Target: >2 minutes avg session duration.',
  'BENTO_GRID_EXECUTIVE_SUMMARY.md',
  'medium',
  ARRAY['metrics','assumption','unvalidated','bento-grid','user-engagement']
);

INSERT INTO knowledge_entries (type, title, summary, source_file, confidence, tags) VALUES (
  'assumption',
  'Interactive Features 30% Adoption Rate',
  'Users will engage with 3+ new interactive features at >30% adoption rate (Trending Explorer, Wiki Auto-Linker, Sentiment Visualizer). Unvalidated; no A/B testing framework currently documented. No baseline metrics established.',
  'BENTO_GRID_EXECUTIVE_SUMMARY.md',
  'medium',
  ARRAY['metrics','assumption','unvalidated','bento-grid','adoption']
);

INSERT INTO knowledge_entries (type, title, summary, source_file, confidence, tags) VALUES (
  'assumption',
  'Real-Time Engagement Scoring Necessary',
  'Database triggers auto-recalculate scores on every engagement. No documented use case requiring <1ms scoring. Could batch-update hourly instead (cost optimization opportunity). Not validated.',
  'LEO_DATABASE_BLUEPRINT.md',
  'medium',
  ARRAY['database','optimization','cost','assumption','performance']
);

INSERT INTO knowledge_entries (type, title, summary, source_file, confidence, tags) VALUES (
  'assumption',
  'Claude AI Maintains Consistent Persona Voice',
  'Test data: 9 writers tested with 98.3% token reduction. No output quality comparison before/after optimization. Risk: optimized prompts may lose nuance. Persona consistency unvalidated post-optimization.',
  'EXECUTIVE_SUMMARY.md',
  'medium',
  ARRAY['persona','optimization','quality','assumption','unvalidated']
);

-- RESEARCH (MEDIUM CONFIDENCE)

INSERT INTO knowledge_entries (type, title, summary, source_file, confidence, tags) VALUES (
  'research',
  'Validator Effectiveness Unknown',
  'Three validators (Copy-Editor, Brand, Humanization) exist but no documented success rate. False-negative rate unknown. Unclear if validators catch all quality issues. Critical gap in QA metrics.',
  'VALIDATION_STANDARDS_FOR_TEAM.md',
  'medium',
  ARRAY['research','quality','gap','validators','metrics']
);

INSERT INTO knowledge_entries (type, title, summary, source_file, confidence, tags) VALUES (
  'research',
  'Post-Launch Metrics Analysis Gap',
  'Deployment readiness culture is strong (100+ item checklists) but no post-mortem documentation from past deployments. Lessons learned not extracted. Success factors not quantified.',
  'DEPLOYMENT_CHECKLIST.md',
  'medium',
  ARRAY['research','gap','metrics','post-mortem','lessons-learned']
);

-- STATUS

-- Total entries inserted: 17 (8 decisions + 3 insights + 4 assumptions + 2 research)
-- Confidence levels: 11 HIGH, 6 MEDIUM
-- All entries immutable (append-only, no update/delete)
-- Ready for weekly memory review process

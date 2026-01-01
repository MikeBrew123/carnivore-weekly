# Skills Manifest: Agent Capabilities Registry

**Version:** 1.0.0
**Last Updated:** January 1, 2025
**Purpose:** Central registry of all skills available to the agent team
**Owner:** Quinn (Record Keeper)

---

## Skill Categories

### A. Content Generation & Writing Skills

#### 1. **AI-Text-Humanization Skill**
**Type:** Writing Enhancement
**Purpose:** Transform AI-generated text into authentic human voice
**When to use:** Before any content submission to avoid "robotic" language
**Owner:** All content agents (Sarah, Marcus, Chloe)
**Integration:** Part of pre-validation workflow

**What it does:**
- Detects robotic AI patterns (overly formal language, jargon)
- Replaces corporate phrases with conversational language
- Adds personality and authentic voice
- Ensures contractions, varied sentence structure
- Removes AI tell words (delve, robust, leverage, etc.)

**Example:**
```
BEFORE: "This module facilitates the optimization of string manipulation operations."
AFTER: "String helpers for common text operations. We use these all over the codebase."
```

**Success Criteria:**
- ✅ Text sounds like a real person talking
- ✅ No AI tell phrases remaining
- ✅ Contractions used naturally
- ✅ Examples provided
- ✅ Personal perspective visible

---

#### 2. **Copy-Editor Skill**
**Type:** Quality Control
**Purpose:** Validate writing quality, detect AI tells, check reading level
**When to use:** Every blog post before Jordan's validation
**Owner:** Sarah, Marcus, Chloe (self-check) + Jordan (final check)
**Integration:** Part of validation pipeline

**What it does:**
- Detects AI tell words (delve, robust, leverage, navigate, crucial, realm, landscape, utilize, facilitate)
- Checks em-dash usage (max 1 per page)
- Verifies sentence variety (short + long mix)
- Confirms contractions used naturally
- Validates reading level (Grade 8-10)
- Checks for specific examples vs generic platitudes

**Validation Checklist:**
- [ ] No em-dashes OR max 1
- [ ] No AI tell words
- [ ] No opening "It's important to note that..."
- [ ] Varied sentence lengths (not all same)
- [ ] Contractions used naturally
- [ ] Direct address to reader ("you")
- [ ] Specific examples, not generic
- [ ] Reads naturally when read aloud
- [ ] Grade 8-10 reading level

**Failure Criteria:**
- 2+ em-dashes = CRITICAL
- Any AI tell words = HIGH
- All sentences same length = HIGH
- No contractions = MEDIUM
- All generic examples = MEDIUM

---

#### 3. **Carnivore-Brand Skill**
**Type:** Brand Compliance
**Purpose:** Ensure voice consistency and brand alignment
**When to use:** Every blog post to verify persona voice
**Owner:** Sarah, Marcus, Chloe (self-check) + Jordan (final check)
**Integration:** Part of validation pipeline

**What it does:**
- Validates persona voice consistency (Sarah vs Marcus vs Chloe)
- Checks tone matches persona (educational/warm for Sarah, direct/punchy for Marcus, conversational for Chloe)
- Ensures evidence-based content
- Verifies "Not a Doctor" disclaimer in persona's voice
- Detects brand drift (excessive marketing speak, etc.)
- Confirms specific examples over generic

**Voice Validation by Persona:**

**Sarah (Health Coach):**
- [ ] Tone is educational + warm
- [ ] Evidence-based (data, sources visible)
- [ ] No marketing hype
- [ ] Specific medical/health examples
- [ ] Acknowledges complexity
- [ ] "Not a doctor" disclaimer present

**Marcus (Performance Coach):**
- [ ] Tone is direct + punchy
- [ ] Protocol/metrics focused
- [ ] Action steps clear
- [ ] High-energy but not cheesy
- [ ] Specific numbers throughout
- [ ] "Not a doctor" disclaimer present

**Chloe (Community Manager):**
- [ ] Tone is conversational + relatable
- [ ] Community references authentic
- [ ] Humor lands naturally
- [ ] Insider perspective visible
- [ ] Personality throughout
- [ ] "Not a doctor" disclaimer present (if health claims)

**Failure Criteria:**
- Voice doesn't match persona = CRITICAL
- Excessive marketing speak = HIGH
- Missing disclaimer on health claims = CRITICAL
- No personality visible = HIGH

---

### B. Code Validation & Development Skills

#### 4. **W3C HTML5 Validator**
**Type:** Code Compliance
**Purpose:** Validate semantic HTML, check for errors
**When to use:** Before visual validation, when Alex creates new templates
**Owner:** Alex (Developer) + Jordan (QA)
**Tool:** https://validator.w3.org/

**What it checks:**
- DOCTYPE present and valid
- All required meta tags (charset, viewport)
- No missing closing tags
- Proper heading hierarchy (h1→h2→h3, no skipping)
- All images have alt text
- All links have text
- No duplicate IDs
- Semantic HTML used (nav, article, footer, etc.)

**Failure Criteria:**
- Any validation errors = CRITICAL
- Missing meta tags = CRITICAL
- Missing alt text on images = HIGH
- Wrong heading hierarchy = HIGH

---

#### 5. **CSS Color & Font Validator**
**Type:** Brand Compliance
**Purpose:** Ensure exact colors and fonts match style guide
**When to use:** Every page change, whenever CSS is modified
**Owner:** Alex (Developer) + Casey (Visual Director)
**Tool:** Browser DevTools color picker

**What it checks:**
- **Colors:**
  - H1 color: #ffd700 (gold) - EXACT
  - H2 color: #ffd700 (gold) - EXACT
  - H3 color: #d4a574 (tan) - EXACT
  - Background: #1a120b (dark brown) - EXACT
  - Text on dark: #f4e4d4 (light) - EXACT
  - Links: #d4a574 (tan) - EXACT
  - No unexpected colors introduced

- **Fonts:**
  - H1: Playfair Display loaded
  - H2: Playfair Display loaded
  - Body: Merriweather loaded
  - No sans-serif fonts

- **Spacing:**
  - Container: max-width 800px or 1400px (not random)
  - Margins/padding: consistent (20px, 40px range)
  - No tight spacing that looks cramped
  - White space is generous

**Failure Criteria:**
- Color mismatch (even slight) = CRITICAL
- Font not loading = HIGH
- Wrong spacing values = MEDIUM
- Horizontal scroll on mobile = CRITICAL

---

#### 6. **CSS Path Validator**
**Type:** Technical Validation
**Purpose:** Ensure stylesheets actually load
**When to use:** Every new page or when paths change
**Owner:** Alex (Developer) + Jordan (QA)

**What it checks:**
- CSS file exists at referenced path
- Path is correct for file location
- No 404 errors in browser console
- Styles visibly applied to page

**Path Rules:**
- Blog posts at `/public/blog/`: Link is `../../style.css`
- Pages at `/public/`: Link is `../style.css`

**Failure Criteria:**
- CSS file not found = CRITICAL
- Path incorrect = CRITICAL
- 404 on CSS = CRITICAL

---

#### 7. **JavaScript Validator**
**Type:** Technical Validation
**Purpose:** No console errors, functionality works
**When to use:** Before visual validation
**Owner:** Alex (Developer) + Jordan (QA)

**What it checks:**
- No console errors when page loads
- No console warnings
- Interactive features work (filters, hover states, etc.)
- No syntax errors

**Failure Criteria:**
- Any console errors = HIGH
- Console warnings = MEDIUM
- Interactive features broken = CRITICAL
- Syntax errors = CRITICAL

---

### C. Design & Visual Validation Skills

#### 8. **Visual-Validator Skill**
**Type:** Visual Validation
**Purpose:** Verify actual rendering, performance, mobile responsiveness
**When to use:** Before deployment to catch rendering issues
**Owner:** Casey (Visual Director)
**Tool:** Playwright + Browser DevTools

**What it does:**
- Screenshot comparison (desktop 1400x900, mobile 375x812)
- Visual drift detection
- Font rendering verification
- Color accuracy checking
- Spacing consistency
- Mobile responsiveness testing
- Link validation
- Image loading verification

**Checklist:**
- [ ] Screenshot taken at 1400x900px (desktop)
- [ ] Screenshot taken at 375x812px (mobile)
- [ ] Compare to baseline from last week
- [ ] No unexpected layout changes
- [ ] Colors render correctly
- [ ] Fonts display with correct weight
- [ ] Spacing looks consistent
- [ ] No visual regressions
- [ ] All images load
- [ ] All links work
- [ ] No horizontal scroll on mobile

**Failure Criteria:**
- Visual drift detected = HIGH
- Colors look wrong = CRITICAL
- Layout broken on mobile = CRITICAL
- Fonts not rendering = CRITICAL
- Broken links = HIGH
- Images fail to load = HIGH

---

#### 9. **Mobile-Responsiveness Tester**
**Type:** UX Validation
**Purpose:** Verify mobile design works without issues
**When to use:** Before deployment
**Owner:** Casey (Visual Director)
**Tool:** Browser DevTools device toolbar

**Test Viewports:**
- Mobile: 375x812px (iPhone size)
- Tablet: 768x1024px
- Desktop: 1400x900px

**Checklist:**
- [ ] No horizontal scroll on mobile
- [ ] Text readable without zooming
- [ ] Touch targets ≥ 44px
- [ ] Images scale properly
- [ ] Navigation accessible
- [ ] Forms work on mobile
- [ ] Columns stack properly on tablet

**Failure Criteria:**
- Horizontal scroll on mobile = CRITICAL
- Text unreadable = CRITICAL
- Touch targets too small = HIGH
- Layout broken on any size = HIGH

---

### D. Performance & Analytics Skills

#### 10. **Lighthouse Performance Auditor**
**Type:** Performance Validation
**Purpose:** Measure Core Web Vitals and performance metrics
**When to use:** Weekly performance reviews
**Owner:** Alex (Developer) + Jordan (QA)
**Tool:** Browser DevTools Lighthouse

**Target Metrics:**
- LCP (Largest Contentful Paint): ≤ 2.5 seconds
- FID (First Input Delay): ≤ 100ms
- CLS (Cumulative Layout Shift): < 0.1
- Overall Lighthouse score: ≥ 90 (performance)

**Failure Criteria:**
- LCP > 2.5s = HIGH
- Performance score < 80 = MEDIUM
- CLS > 0.1 = MEDIUM

---

#### 11. **SEO-Validator Skill**
**Type:** Search Compliance
**Purpose:** Ensure SEO best practices are followed
**When to use:** Before blog post publication
**Owner:** Sam (Analytics Manager) + Jordan (QA)

**What it checks:**
- Meta title: 50-60 characters, includes keyword
- Meta description: 150-160 characters, persuasive CTA
- H1: One per page, includes primary keyword
- Keywords: Target 1-2 per page, used naturally
- URL structure: Descriptive, date-first format
- Internal linking: Links to related posts/wiki
- Structured data: Consider JSON-LD for BlogPosting

**Failure Criteria:**
- Missing or weak title = HIGH
- Weak meta description = MEDIUM
- No H1 or multiple H1s = HIGH
- Keyword stuffing = MEDIUM

---

#### 12. **Analytics Dashboard Tracker**
**Type:** Metrics & Reporting
**Purpose:** Track engagement, traffic, and performance trends
**When to use:** Weekly/monthly reviews
**Owner:** Sam (Analytics Manager)

**Tracks:**
- Page views by content type
- Time-on-page metrics
- Bounce rates
- Conversion rates (email signup, link clicks)
- Top performing posts (by topic/persona)
- Search traffic keywords
- Device breakdown (mobile/desktop/tablet)
- Referral sources

**Reports Generated:**
- Daily: Traffic snapshot (emails to CEO)
- Weekly: Content performance analysis
- Monthly: Strategic insights and recommendations

---

### E. Form & UX Skills

#### 13. **Form-Optimization Skill**
**Type:** UX/Conversion
**Purpose:** Maximize form completion rates and user experience
**When to use:** When creating/auditing forms (newsletter, comments, feedback)
**Owner:** Chloe (Community Manager) + Casey (Visual Director)

**What it does:**
- CRO (Conversion Rate Optimization) guidance
- Field validation UX (error messages)
- Mobile form responsiveness
- Progressive disclosure (show fields as needed)
- Clear CTA button design
- Help text and placeholder optimization
- Form completion psychology

**Success Criteria:**
- Form completion rate ≥ 70%
- Mobile completion rate ≥ 50%
- Average form time ≤ 2 minutes
- Clear success feedback after submission

---

### F. Research & Content Strategy Skills

#### 14. **Research-Assistant Skill**
**Type:** Content Support
**Purpose:** Help gather, organize, and verify information
**When to use:** During content research phase
**Owner:** All content agents + Sam (Analytics)

**Capabilities:**
- Web research and source aggregation
- Fact-checking and verification
- Topic deep-dives
- Competitor analysis
- Trend identification
- Citation organization
- Outlining and structure suggestions

---

#### 15. **Topic-Queue Manager**
**Type:** Workflow Management
**Purpose:** Maintain and prioritize content backlog
**When to use:** Daily by Quinn, weekly reviews
**Owner:** Quinn + Sam (Analytics)

**Manages:**
- `/data/blog_topics_queue.json` (work backlog)
- Assignment to appropriate persona
- Priority levels (high/medium/low)
- Deadline tracking
- Status updates (pending/in-progress/completed)
- Data-driven prioritization (high-traffic topics first)

---

### G. System Management Skills

#### 16. **State-Manager Skill** (Quinn's Core)
**Type:** Operations Management
**Purpose:** Maintain current status of all agents, projects, blockers
**When to use:** Continuously by Quinn
**Owner:** Quinn (Record Keeper)

**Manages:**
- `/agents/daily_logs/[DATE]_AGENDA.md` (daily priorities)
- `/agents/daily_logs/[DATE]_MORNING_STATE.md` (current state)
- `/agents/daily_logs/[DATE]_EOD.md` (daily summary)
- `/agents/daily_logs/archive/` (historical logs)
- Blocker tracking and escalation
- Agent status dashboard

---

#### 17. **Memory-Logger Skill** (Quinn's Core)
**Type:** Institutional Memory
**Purpose:** Record lessons learned, prevent repeated errors
**When to use:** Every time Jordan finds an error
**Owner:** Quinn (Record Keeper)

**What it does:**
- Updates `/agents/memory/[AGENT]_memory.log` with errors
- Formats lessons (Issue, Root Cause, Prevention, Status)
- Tags agents to read new entries
- Monthly pattern analysis (what keeps going wrong?)
- Coaching recommendations based on memory patterns

---

#### 18. **Deployment-Scheduler Skill**
**Type:** Workflow Automation
**Purpose:** Automated blog post publishing on schedules
**When to use:** Built into GitHub Actions, runs daily
**Owner:** Alex (Developer) + Quinn

**What it does:**
- Monitors `/data/blog_posts.json` for scheduled posts
- Checks if scheduled_date ≤ today
- Marks posts as published
- Generates HTML pages for newly published posts
- Commits and deploys to GitHub Pages
- No manual intervention required

---

### F. Database & Infrastructure Skills (Leo)

#### 19. **Schema-Architect Skill**
**Type:** Database Architecture
**Purpose:** Design relational database schemas and data structures
**When to use:** Before implementing any new data storage feature
**Owner:** Leo (Database Architect)
**Integration:** Foundation for all data operations

**What it does:**
- Designs normalized, efficient database structures
- Selects appropriate data types (JSONB, UUID, pgvector, etc.)
- Creates indexes for performance optimization
- Documents schema decisions with SQL comments
- Ensures ACID compliance

**Success Criteria:**
- ✅ Schema properly normalized
- ✅ Appropriate data types used
- ✅ Indexes created for <50ms queries
- ✅ No unnecessary NULL values
- ✅ Documentation complete

---

#### 20. **RLS-Guardian Skill**
**Type:** Security & Access Control
**Purpose:** Create Row Level Security (RLS) policies to protect data
**When to use:** Whenever data needs user/organization isolation
**Owner:** Leo (Database Architect)
**Integration:** Critical for security compliance

**What it does:**
- Writes Row Level Security policies
- Ensures data isolation between users
- Audits access patterns
- Implements encryption for sensitive data
- Tests security policies before deployment

**Success Criteria:**
- ✅ RLS policies tested and verified
- ✅ Data properly isolated
- ✅ No unauthorized access possible
- ✅ Policies documented

---

#### 21. **Vector-Specialist Skill**
**Type:** AI & Search Optimization
**Purpose:** Optimize pgvector embeddings for semantic search
**When to use:** For AI-powered search and content discovery
**Owner:** Leo (Database Architect)
**Integration:** Powers Sarah's research discovery, content recommendations

**What it does:**
- Manages pgvector embeddings
- Optimizes vector queries for performance
- Integrates with Claude API for embeddings
- Handles embedding lifecycle (updates, deletions)
- Monitors vector index health

**Success Criteria:**
- ✅ Vector queries fast (<100ms)
- ✅ Embeddings accurate
- ✅ Integration with Claude API working
- ✅ Index health monitored

---

#### 22. **Migration-Engine Skill**
**Type:** Change Management
**Purpose:** Manage database migrations safely and reliably
**When to use:** For all schema changes (never manual edits)
**Owner:** Leo (Database Architect)
**Integration:** Foundation of version control for database

**What it does:**
- Writes idempotent migrations (safe to run multiple times)
- Version controls all schema changes
- Tests migrations locally first
- Creates rollback procedures
- Documents breaking changes
- Coordinates with team before large migrations

**Success Criteria:**
- ✅ All changes version-controlled
- ✅ Migrations tested locally
- ✅ Rollback procedure in place
- ✅ Zero manual dashboard edits
- ✅ Team communication completed

---

#### 23. **Edge-Deployer Skill**
**Type:** Serverless Functions
**Purpose:** Deploy Supabase Edge Functions for low-latency operations
**When to use:** For API endpoints, webhooks, automation logic
**Owner:** Leo (Database Architect)
**Integration:** Enables event-driven automation

**What it does:**
- Writes Deno-based Edge Functions
- Deploys serverless logic to Supabase
- Creates webhook handlers
- Manages function versioning
- Monitors function performance

**Success Criteria:**
- ✅ Functions deployed and tested
- ✅ Webhook handlers working
- ✅ Performance meets targets (<100ms)
- ✅ Error handling complete

---

#### 24. **Query-Optimizer Skill**
**Type:** Performance Tuning
**Purpose:** Identify and optimize slow database queries
**When to use:** When queries exceed <50ms target
**Owner:** Leo (Database Architect)
**Integration:** Critical for user experience

**What it does:**
- Analyzes query performance with pg_stat_statements
- Identifies slow queries
- Creates optimized indexes
- Refactors queries for speed
- Benchmarks improvements

**Success Criteria:**
- ✅ All critical queries < 50ms
- ✅ Indexes properly utilized
- ✅ No N+1 query problems
- ✅ Performance improvements verified

---

#### 25. **Webhook-Architect Skill**
**Type:** Event-Driven Automation
**Purpose:** Build database triggers and webhook orchestration
**When to use:** For automated workflows (content to social, notifications)
**Owner:** Leo (Database Architect)
**Integration:** Connects database to n8n automation platform

**What it does:**
- Creates database triggers for events
- Builds webhook payloads
- Integrates with n8n
- Enables Chloe's IG automation
- Enables Marcus's email automation
- Creates error logging and alerting

**Success Criteria:**
- ✅ Triggers working correctly
- ✅ Webhook payloads accurate
- ✅ n8n integration verified
- ✅ Error handling in place

---

#### 26. **Data-Guardian Skill**
**Type:** Data Quality & Integrity
**Purpose:** Implement constraints and guardrails to prevent data corruption
**When to use:** For all data operations (ongoing)
**Owner:** Leo (Database Architect)
**Integration:** Foundation of system reliability

**What it does:**
- Implements database constraints (unique, foreign keys, checks)
- Creates validation triggers
- Monitors for data anomalies
- Ensures referential integrity
- Conducts regular health checks
- Creates audit logs for compliance

**Success Criteria:**
- ✅ All constraints in place
- ✅ No orphaned records
- ✅ Data integrity verified
- ✅ Anomalies detected early
- ✅ Audit logs complete

---

## Skill Integration Map

### Before Content Submission (Sarah/Marcus/Chloe)
1. **AI-Text-Humanization** - Remove robotic language
2. **Copy-Editor** - Check quality, sentence variety, reading level
3. **Carnivore-Brand** - Verify persona voice consistency

### During Validation (Jordan)
1. **Copy-Editor** (second pass)
2. **Carnivore-Brand** (second pass)
3. **W3C HTML5 Validator** - Check semantic HTML
4. **CSS Color & Font Validator** - Exact brand standards
5. **CSS Path Validator** - Stylesheet loading
6. **JavaScript Validator** - No errors
7. **Visual-Validator** - Screenshot comparison
8. **Mobile-Responsiveness Tester** - Mobile works
9. **Lighthouse Performance Auditor** - Speed metrics
10. **SEO-Validator** - Search optimization

### After Validation (Casey + Sam)
1. **Visual-Validator** (deep dive) - Detailed visual QA
2. **Analytics Dashboard Tracker** - Track post performance
3. **SEO-Validator** (monitoring) - Track keyword rankings

### Daily Operations (Quinn)
1. **State-Manager** - Generate AGENDA and EOD report
2. **Memory-Logger** - Update agent memory.log files
3. **Deployment-Scheduler** - Publish scheduled posts
4. **Topic-Queue Manager** - Prioritize next content

---

## Skill Availability & Access

| Skill | Used By | Frequency | Blocker If Missing |
|-------|---------|-----------|-------------------|
| AI-Text-Humanization | Sarah, Marcus, Chloe | Per submission | YES - can't publish |
| Copy-Editor | All | Per submission | YES - critical |
| Carnivore-Brand | All | Per submission | YES - critical |
| W3C HTML5 | Alex, Jordan | Per template change | YES - critical |
| CSS Validator | Alex, Casey | Per design change | YES - critical |
| CSS Path | Alex | Per new page | YES - critical |
| JavaScript | Alex | Per feature | YES - critical |
| Visual-Validator | Casey | Per publication | YES - critical |
| Mobile-Tester | Casey | Per publication | YES - critical |
| Lighthouse | Alex | Weekly | NO - nice to have |
| SEO-Validator | Sam | Per publication | NO - nice to have |
| Form-Optimization | Chloe, Casey | Quarterly | NO - feature dependent |
| Research-Assistant | Content agents | Ongoing | NO - helpful |
| Analytics-Tracker | Sam | Weekly | NO - reporting |
| State-Manager | Quinn | Daily | YES - operations |
| Memory-Logger | Quinn | On error | YES - learning |
| Deployment-Scheduler | Alex, Quinn | Daily | YES - publishing |
| Schema-Architect | Leo | Per new data need | YES - foundation |
| RLS-Guardian | Leo | Per new table | YES - security |
| Vector-Specialist | Leo | Per embedding need | NO - feature dependent |
| Migration-Engine | Leo | Per schema change | YES - change control |
| Edge-Deployer | Leo | Per automation need | NO - feature dependent |
| Query-Optimizer | Leo | When slow queries found | NO - ongoing |
| Webhook-Architect | Leo | Per automation flow | NO - feature dependent |
| Data-Guardian | Leo | Continuous | YES - reliability |

---

## Adding New Skills

When a new capability is needed:

1. **Document** the skill in this file (following template above)
2. **Define** what it does, when to use, success criteria
3. **Integrate** it into the workflow (which phase?)
4. **Assign** ownership (which agent?)
5. **Test** with one post before making mandatory
6. **Train** all relevant agents on the new skill
7. **Update** validation checklist

**Process:** Propose new skill to CEO → Get approval → Add to manifest → Update PROTOCOLS if blocking

---

## Version History

| Date | Change | Reason |
|------|--------|--------|
| 2026-01-01 | Added Leo's 8 Database & Infrastructure Skills | Formalized database architecture layer |
| 2025-01-01 | Created skills manifest v1.0 | Formalized skill system |

---

**Last Updated:** January 1, 2026
**Maintained By:** Quinn (Record Keeper)
**Review Cycle:** Monthly

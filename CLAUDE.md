# CLAUDE.md

---
## ⚠️ BEFORE YOU DO ANYTHING — READ THIS FIRST ⚠️

### 🚨 CRITICAL: ALL Written Content MUST Use Writer Agents

**NEVER publish ANY written content without using writer agents (Sarah, Marcus, Chloe).**

✅ **REQUIRED for ALL user-facing content:**
- Editorial commentary → Use Sarah/Marcus/Chloe
- Blog posts → Use Sarah/Marcus/Chloe
- Newsletter copy → Use Sarah/Marcus/Chloe
- Video descriptions → Use Sarah/Marcus/Chloe
- ANY text users will read → Use Sarah/Marcus/Chloe

✅ **ALWAYS apply humanization:**
- Remove AI tells: delve, landscape, robust, utilize, leverage, facilitate
- No em-dashes (—) — use periods or commas
- Sound conversational (like talking to a friend)
- Use contractions (it's, don't, can't)

✅ **FREQUENTLY use soft-conversion:**
- Natural product mentions (not sales pitches)
- "Some people find X helpful" > "You must buy X"
- Trust readers to decide

📚 **Full details:** See "CONTENT QUALITY RULES" section below + `docs/archive/WRITER_AGENTS_VALIDATED.md`

🤖 **Automation:** `scripts/generate_commentary.py` enforces this automatically

**THE RULE:** No written content goes out without humanization. Ever.

---

## 🔒 BLOG POST PIPELINE (MANDATORY — NO EXCEPTIONS)

Every blog post request MUST follow this pipeline. No shortcuts. No alternative approaches. If you're tempted to do it differently, re-read this section. See recurring-loops.md Loop 9 for why.

### The One Rule
**Writers produce CONTENT ONLY. `generate_blog_pages.py` produces HTML PAGES.**
Writers NEVER open, edit, or create files in `public/blog/` or `templates/`.

### Pipeline Steps (in exact order)

**Step 1 — Pre-Flight (Supabase queries)**
Execute these MCP queries directly (Leo cannot execute MCP):
```sql
-- Get writer persona
SELECT * FROM writers WHERE slug = '{writer}';

-- Get writer memories
SELECT memory_type, title, description
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = '{writer}')
ORDER BY created_at DESC LIMIT 10;

-- Get recent articles for cross-referencing
SELECT title, slug FROM writer_content
WHERE writer_id = (SELECT id FROM writers WHERE slug = '{writer}')
ORDER BY created_at DESC LIMIT 5;
```

**Step 2 — Write Content**
- Read the writer's agent file from `agents/{writer}.md`
- Write article body content as clean HTML: `<h2>`, `<p>`, `<ul>`, `<strong>`, `<blockquote>` only
- NO page-level tags (`<html>`, `<head>`, `<body>`)
- NO Jinja2 variables (`{{ }}`, `{% %}`)
- Target: 1,000-1,500 words (7,000-10,000 characters)
- Follow copy-editor rules:
  - No em-dashes (max 1 per post)
  - No AI tell words
  - Grade 8-10 reading level
  - Use contractions
  - Short paragraphs (2-4 sentences)

**Step 3 — Store in blog_posts.json**
Add or update entry in `data/blog_posts.json`:
- `slug`: `YYYY-MM-DD-topic-name` (MUST have date prefix)
- `content`: full article body HTML from Step 2
- `status`: `"ready"` for scheduled posts (daily cron publishes them), or `"published"` for immediate
- `publish_date`: ISO date string (YYYY-MM-DD)
- `published`: `false` for ready posts, `true` for published
- `author`: writer slug (`sarah`, `marcus`, or `chloe`)
- All other required fields (`title`, `meta_description`, `tags`, etc.)

**Step 4 — Render HTML**
```bash
python3 scripts/generate_blog_pages.py
```
This reads blog_posts.json → applies Jinja2 template → writes to `public/blog/`. It also regenerates sitemap, RSS, and blog index.

**Step 5 — Validate**
```bash
python3 scripts/validate_before_commit.py
```
Must pass with 0 critical errors. Warnings acceptable if pre-existing.

**Step 6 — Post-Flight (Supabase save)**
Save article to `writer_content` table. Save new memories to `writer_memory_log`.

**Step 7 — Commit and Push**
```bash
git add -A
git commit -m "content: {description of posts added}"
git push
```

### PROHIBITED Actions (will break the pipeline)
- ❌ Opening or editing files in `templates/` during content generation
- ❌ Doing find-and-replace on Jinja2 template variables
- ❌ Writing full HTML pages manually instead of using `generate_blog_pages.py`
- ❌ Calling the Anthropic API for content (no Supabase memory access)
- ❌ Creating HTML files without date prefixes in the slug
- ❌ Spawning parallel agents that write to `blog_posts.json` simultaneously
- ❌ Cross-linking to posts that don't exist yet (check slugs first)
- ❌ Skipping validation before commit

### Multiple Posts
When generating multiple posts, process them ONE AT A TIME through Steps 1-3. Then run Steps 4-7 once after all content is stored. Never spawn parallel agents writing to `blog_posts.json` — last writer wins and earlier content is lost.

---

## 📅 WEEKLY CONTENT WORKFLOW

### Cadence
- 9 posts per week (3 per writer: Sarah, Marcus, Chloe)
- Generated in one session using scripts/weekly_content_prompt.md
- Published automatically one per day by daily-publish.yml

### How to Generate
1. Open Claude Code
2. Paste the contents of scripts/weekly_content_prompt.md
3. Approve Chloe's 9 topic assignments
4. Wait for all 9 posts to generate
5. Done — daily cron handles publishing

### How Daily Publishing Works
- GitHub Action runs daily at 9 AM EST
- scripts/daily_publish.py checks for posts with:
  - status = "ready" AND publish_date <= today
- Publishes ALL matching posts (no backlog)
- Commits and pushes automatically
- deploy.yml handles the actual site deployment

### Mid-Week Top-Up
Run the generation prompt again anytime to add more posts. New posts get dates starting after the last queued date. The daily cron doesn't care when content was generated — it only checks publish_date and status.

### Status Values
- draft: not ready, writer still working
- ready: content complete, waiting for publish_date
- published: live on site, don't touch

---

## 🚨 MANDATORY: BLOG POST VALIDATION CHECKLIST

**BEFORE DEPLOYING ANY BLOG POST - RUN ALL VALIDATORS**

Every blog post MUST pass ALL validation steps. **NO EXCEPTIONS.**

### Required Validation Steps (In Order):

1. **Copy Editor** (`/copy-editor` skill)
   - [ ] Zero em-dashes
   - [ ] No AI tells (delve, robust, leverage, navigate, crucial, realm, landscape, utilize)
   - [ ] Contractions present (don't, can't, won't)
   - [ ] Conversational tone
   - [ ] Grade 8-10 reading level

2. **SEO Validator** (`/seo-validator` skill)
   - [ ] Meta description 150-160 chars (NOT empty)
   - [ ] Canonical URL correct (NOT broken `.html`)
   - [ ] Title tag 50-60 chars
   - [ ] Schema markup valid
   - [ ] Single H1, proper heading hierarchy
   - [ ] All images have alt text

3. **Brand Compliance** (`/carnivore-brand` skill)
   - [ ] Google Fonts link present
   - [ ] blog-post.css linked
   - [ ] Fonts: Libre Baskerville + Source Sans 3
   - [ ] Colors match brand
   - [ ] Voice direct and clear

4. **Frontend Design** (`/frontend-design` skill OR visual check)
   - [ ] `<div class="post-content">` wrapper present
   - [ ] Mobile responsive
   - [ ] No layout breaks
   - [ ] Proper spacing

5. **Visual Validator** (`/visual-validator` skill)
   - [ ] Color contrast WCAG 2.1 AA
   - [ ] No dark-on-dark text
   - [ ] Accessibility compliance

6. **Internal Backlinks**
   - [ ] 2-3 links to related blog posts
   - [ ] Links use descriptive anchor text
   - [ ] No broken links

### Quick Validation Command:

```bash
# Check for critical issues
POST="public/blog/YOUR-POST.html"

# AI tells
grep -n "—\|delve\|robust\|leverage\|navigate" "$POST" && echo "❌ FAIL: AI tells found" || echo "✅ PASS: No AI tells"

# Empty meta description
grep 'content=""' "$POST" && echo "❌ FAIL: Empty meta" || echo "✅ PASS: Meta present"

# Broken canonical
grep '/.html"' "$POST" | grep canonical && echo "❌ FAIL: Broken canonical" || echo "✅ PASS: Canonical valid"

# Google Fonts
grep "fonts.googleapis.com" "$POST" > /dev/null && echo "✅ PASS: Fonts loaded" || echo "❌ FAIL: No fonts"

# blog-post.css
grep "blog-post.css" "$POST" > /dev/null && echo "✅ PASS: CSS linked" || echo "❌ FAIL: No CSS"

# post-content wrapper
grep '<div class="post-content">' "$POST" > /dev/null && echo "✅ PASS: Wrapper present" || echo "❌ FAIL: No wrapper"
```

### Automation Integration:

`scripts/validate_before_commit.py` runs all validation checks before commits.
`scripts/content_validator.py` validates individual posts during generation.

### DEPLOY DECISION:

**✅ GO:** All validators pass, zero critical issues
**❌ NO-GO:** ANY validator fails or critical issue found

See `docs/archive/VALIDATION-CHECKLIST.md` for complete details.

---

## 🤖 AUTONOMOUS CONTENT GENERATION WORKFLOW

**One-Command Pipeline:** "Generate this week's blog content"

### How It Works

The autonomous pipeline replaces the old `generate_weekly_blog_posts.py` with a Supabase-powered writer agent swarm:

```bash
# Generate 5 posts (default)
./scripts/autonomous_blog_generation.sh

# Generate 15 posts (Batch 2)
./scripts/autonomous_blog_generation.sh 15

# Dry run (show what would happen)
python3 scripts/generate_weekly_content.py --dry-run
```

### Pipeline Steps (Fully Automated)

1. **Chloe Research** - Web search for trending carnivore topics
   - Searches Reddit (r/carnivore, r/zerocarb)
   - Analyzes YouTube trends
   - Creates assignments in `blog_topics_queue.json`

2. **Leo Pre-Flight** - Fetch writer context from Supabase
   - Persona and voice formula
   - Top 10 memories by relevance score
   - Last 10 past articles (avoid repetition)
   - Recent 20 team articles (cross-reference)

3. **Writer Swarm** - Parallel content generation
   - Sarah (health topics)
   - Chloe (community/lifestyle topics)
   - Marcus (performance/protocol topics)
   - All 3 writers work in parallel using Claude Code teams

4. **Leo Post-Flight** - Save to Supabase
   - Store articles in `writer_content` table
   - Extract lessons for `writer_memory_log`
   - Update cross-references

5. **HTML Generation** - `generate_blog_pages.py`
   - Creates HTML from templates
   - Updates `blog_posts.json`

6. **Wall 1 Validation** - `content_validator.py`
   - AI tell detection
   - Em-dash check
   - Contraction verification

7. **Site Regeneration**
   - Sitemap + blog index (`generate_blog_pages.py`)
   - Homepage (`generate.py --type pages`)

8. **Final Validation** - `validate_before_commit.py`
   - SEO checks
   - Brand compliance
   - Accessibility

9. **Git Automation**
   - Stage changes
   - Commit with co-author attribution
   - Push to production

### Key Files

| File | Purpose |
|------|---------|
| `scripts/autonomous_blog_generation.sh` | Entry point (one-command) |
| `scripts/generate_weekly_content.py` | Master orchestration script |
| `scripts/spawn_writer_swarm.py` | Parallel writer task generator |
| `scripts/fetch_writer_context.py` | Supabase context fetcher |
| `blog_topics_queue.json` | Topic assignments (Chloe creates this) |

### Writer Agent Integration

**All content uses Supabase-powered writer agents:**

- **Sarah** (`sarah-health-coach`) - Health, nutrition, women's health
  - Voice: Conversational, evidence-based, empathetic
  - Memories: Specificity drives engagement, budget barriers, cholesterol panic

- **Chloe** (`chloe-community-manager`) - Community, trending, social
  - Voice: Enthusiastic, trendy, community-focused
  - Memories: Reddit testimonials, fast turnaround, conversational openings

- **Marcus** (`marcus-performance-coach`) - Performance, protocols, training
  - Voice: Professional, strategic, direct
  - Memories: Protocol-heavy content, budget gap, fasting combinations

Each writer:
1. Queries Supabase for persona, memories, past articles
2. Applies voice formula automatically
3. References past work to avoid repetition
4. Stores results back to Supabase for future learning

### Manual Override

If you need to manually generate content without the full pipeline:

```bash
# Prepare writing task for Sarah
python3 scripts/fetch_writer_context.py sarah > /tmp/sarah_context.txt

# Invoke Sarah via Claude Code Task tool
Task(
    subagent_type="general-purpose",
    name="sarah-health-coach",
    prompt=Read("/tmp/sarah_context.txt") + "Write article about [topic]"
)

# Save to Supabase
python3 scripts/orchestrate_writer_content.py --save-article /tmp/article.html --writer sarah --title "Title" --tags "tag1,tag2"
```

### Validation Status

✅ **All 3 writers validated** (2026-02-08)
- Sarah: 1001-word electrolyte article
- Chloe: 1050-word seed oil drama article
- Marcus: 1025-word strength training article

✅ **Supabase integration complete**
- Writers query database for context
- Articles saved to `writer_content` table
- Memories applied correctly

✅ **Ready for Batch 2** (15 posts)
- Topic queue created
- Writer assignments balanced
- Full pipeline tested

See `docs/archive/WRITER_AGENTS_VALIDATED.md` for complete validation report.

---

## 📍 PROJECT STATUS
**Before starting work, read `docs/project-log/current-status.md` for current state.**

### To Resume Next Session
1. **Read `docs/project-log/current-status.md`** for complete project state
2. **Next blog content batch** — when ready, use autonomous pipeline with writer agents

---

## OUTPUT RULES — HIGHEST PRIORITY
- **NEVER** output more than 10 lines of code
- **NEVER** show bash command output unless error
- **NEVER** show file contents after creation
- **NEVER** dump package.json, configs, or lock files
- Parallel agents return SINGLE LINE: "✅ [task] complete → [filename]"
- After any task: `✅ Done → 📁 file.tsx → ⏭️ Next step`
- If user needs code, they will ask

## 🚨 CONTENT QUALITY RULES — NON-NEGOTIABLE

### CRITICAL: All Written Content Must Use Writer Agents
**NEVER publish written content without using writer agents (Sarah, Marcus, Chloe).**

1. **ALWAYS use writer agents** for ANY written content that goes to users:
   - Editorial commentary
   - Blog posts
   - Newsletter copy
   - Video descriptions
   - Social media posts
   - Marketing copy

2. **Writer agents ALWAYS apply humanization skill**:
   - Remove ALL AI tells: "delve", "landscape", "robust", "utilize", "facilitate", "leverage"
   - No em-dashes (use periods or commas)
   - Sound conversational (like talking to a friend)
   - Use contractions (it's, don't, can't)
   - Be specific, not vague

3. **Writer agents FREQUENTLY use soft-conversion skill**:
   - When mentioning products/supplements: natural context, not sales pitches
   - Share what works, don't pressure
   - "Some people find X helpful" > "You must buy X"
   - Trust readers to make decisions

### Enforcement
- `scripts/generate_commentary.py`: Built-in humanization + soft-conversion prompts
- Weekly automation: Humanization is automated (Step 3.5)
- Manual content: Run `/ai-text-humanization` and `/soft-conversion` skills before publishing

### Validation
Before any content goes live:
- [ ] Written by Sarah, Marcus, or Chloe (not generic Claude)
- [ ] Humanization skill applied (no AI tells)
- [ ] Soft-conversion used for product mentions
- [ ] Sounds like a real person (read aloud test)

**Rule:** No written content should ever go out without the humanization skill passing over it first. Ever.

## ⚠️ INFRASTRUCTURE — CREDENTIALS & DATABASE ACCESS

### Database Access (Supabase)
- **MCP server**: `supabase` is configured and authenticated
- **KNOWN BUG**: Custom subagents (Leo, etc.) cannot reliably access MCP tools
- **Workaround**: Main session executes MCP calls, agents prepare SQL only

### Stripe MCP Access

This project has Stripe MCP integration enabled. You can use it to:
- List payments, charges, refunds
- Check payment failure reasons
- View products and prices
- Issue refunds

**To use Stripe MCP:**
1. The connection should already be available
2. Use stripe_* commands (stripe_list_payments, stripe_get_payment_intent, etc.)
3. If connection fails, user may need to re-authorize in Claude Code settings

**Common commands:**
- List recent payments: `stripe.payments.list`
- Get payment details: `stripe.payment_intents.retrieve(id)`
- List products: `stripe.products.list`
- Issue refund: `stripe.refunds.create`

**DO NOT ASK USER TO MANUALLY CHECK STRIPE DASHBOARD** - use MCP directly.

### Workflow for Database Operations
1. **Leo** prepares SQL (schema design, migrations, query optimization)
2. **Main session** executes via: `mcp__supabase__execute_sql({ query: "SQL" })`
3. Or use **general-purpose** agent (built-in agents have MCP access)

### Exact MCP Tool Syntax
```
mcp__supabase__execute_sql({ query: "YOUR SQL HERE" })
```

**Examples:**
- `mcp__supabase__execute_sql({ query: "SELECT COUNT(*) FROM writers" })`
- `mcp__supabase__execute_sql({ query: "CREATE INDEX idx_name ON table(column)" })`

### ❌ NEVER DO THESE THINGS
- Ask for Supabase credentials, tokens, or API keys
- Suggest going to Supabase dashboard to run SQL manually
- Send user to paste SQL anywhere — execute via MCP
- Check Wrangler for Supabase credentials — MCP handles auth
- Expect Leo to execute MCP tools — he can't due to Claude Code bug

### ✅ ALWAYS DO THIS INSTEAD
- Main session runs `mcp__supabase__execute_sql` directly
- Read migration files, then execute SQL via MCP tool
- For complex schema work, have Leo prepare SQL, then main session executes
- Trust that MCP is configured — don't second-guess it

### Credential Locations
| Service | Location | Access Method |
|---------|----------|---------------|
| Supabase | MCP authenticated | `mcp__supabase__execute_sql` |
| ALL other APIs | Cloudflare Wrangler | Already configured, don't ask |

### If MCP Isn't Working
1. Run `/status` — check if `supabase` shows in MCP servers
2. Run `/mcp` — re-authenticate if needed
3. If still broken, restart Claude Code session

---

## BUILD MODE
When executing a project spec:
- Invoke LEO for all database work (no exceptions)
- Invoke CASEY for all visual/brand decisions
- Invoke JORDAN before any deployment
- One story at a time unless parallelizing
- STOP at sync points and wait for verification

## Project
carnivore-weekly - No-bullshit carnivore diet research, tools, and weekly insights.

## Agents
**Quinn** = Operations manager. Source of truth for logs, status, and decisions.

### Quinn Logging Protocol (CRITICAL)
When Quinn logs a session, he MUST:
1. Update `docs/project-log/current-status.md`
2. Update `docs/project-log/decisions.md` (if new decisions)
3. **VERIFY** files exist with `ls` or `cat` command
4. Only report "complete" AFTER verification succeeds

**DO NOT** write to `docs/project-log/daily/`. Daily session notes go to Obsidian only.

**Deprecated locations (NEVER use):**
- `docs/project-log/daily/` - old location, session activity goes to Obsidian
- `agents/daily_logs/` - old location, do not use
- `memory.log` - deprecated

## Visual Validation — ES Module Pattern (Calculator & React Projects)

**Problem:** Playwright debugging loops due to wrong module syntax and missing selectors.

**Solution:** Use proven patterns from calculator2-demo:

### Prerequisites
- Project must use `"type": "module"` in package.json
- Playwright installed: `npm install -D @playwright/test`
- Screenshot directory: `/tmp/calculator-validation-screenshots/`

### Working Script Pattern
```bash
# Copy from calculator2-demo/validate-robust.mjs
node validate-robust.mjs
```

**Key patterns (DO NOT deviate):**
1. **File extension:** `.mjs` (ES modules required for projects with `"type": "module"`)
2. **Import syntax:** `import { chromium } from 'playwright'`
3. **Button selectors:** Use `.last()` when multiple buttons share text
   - Example: `page.locator('button:has-text("See Your Results")').last()`
4. **Form fill:** Use `.selectOption()` for `<select>`, `.fill()` for inputs, `.click()` for radios
5. **Waits:** Always `await page.waitForTimeout(800-1500)` after navigation clicks
6. **Screenshots:** Always save: `${screenshotDir}/step-name.png`

### Button Text for Calculator
- Step 1: `"Continue to Next Step"` (not "Next" or "Continue")
- Step 2: `"See Your Results"` (not "Submit" or "Continue")
- Step 3: `"Upgrade for Full Personalized Protocol"` (CTA button)
- Navigation: `"Back"` (always available)

### Validation Checklist
Run before committing changes to form/calculator:
```bash
cd calculator2-demo
node validate-robust.mjs
# Check output: All elements ✅ visible
# Check screenshot: Results page renders correctly
```

**PASS criteria:**
- ✅ All form steps navigate correctly
- ✅ Results page loads on Step 3
- ✅ All key elements visible (heading, profile, food section, CTA, back button)
- ✅ Brand colors correct (heading #ffd700, background #F2F0E6)
- ✅ No horizontal scroll

**FAIL criteria:**
- ❌ Any navigation step doesn't advance
- ❌ Missing elements on results page
- ❌ Colors rendered incorrectly
- ❌ Layout breaks (horizontal scroll)

## Pre-Deploy Validation (JORDAN)
Before marking any story "complete" or deploying:
1. Run calculator validation: `cd calculator2-demo && node validate-robust.mjs`
2. Check form accessibility: `node test-form-accessibility.js`
3. Mobile test: `node test-mobile.js`
4. All tests PASS = deploy. Any FAIL = fix first.

## Weekly Newsletter

### How It Works
- Content written by Claude Code using writer personas during the weekly session
- Editorial content saved to `data/newsletter_content.json`
- Renderer script combines content + YouTube data + template
- Output: `newsletters/{date}.html` + `public/newsletter-preview.html`

### Generation
```bash
python3 scripts/generate_newsletter.py
python3 scripts/generate_newsletter.py --date 2026-02-16
```

### Content File (`data/newsletter_content.json`)
Written by CC each week. Contains:
- `subject_line` — for email service only, NOT displayed in template
- `opening` (Chloe) — warm intro, what's hot
- `blog_teasers` — 3 recent posts with slug, title, writer, teaser
- `by_the_numbers` (Marcus) — stat blocks as inline HTML
- `whats_trending` (Chloe) — 2-3 trending topics
- `community_pulse` (Sarah) — health/science angle
- `looking_ahead` (Marcus) — next week preview

### Template
- `templates/newsletter_template.html` — table-based, all inline CSS
- Email-safe: no flexbox, no grid, no JS, 600px max
- 2 featured videos pulled from `data/youtube_data.json`

### Delivery
TODO: Connect to email service (Resend)
Currently generates HTML only — manual send or automation TBD.

### Sections (in order)
1. Opening (Chloe) — warm intro
2. This Week on the Blog — 3 posts with teasers (primary traffic driver)
3. By the Numbers (Marcus) — 3 stat blocks
4. What's Trending (Chloe) — hot topics
5. Community Pulse (Sarah) — health/science questions
6. Worth Watching — 2 featured YouTube videos
7. Looking Ahead (Marcus) — next week preview
8. Footer — share links, unsubscribe, writer credits

## DOCUMENTATION STANDARDS

### File Creation Rules
- **Reports:** One-time snapshots go to `/docs/archive/reports-archive/YYYY-MM-DD-topic.md`
- **Guides:** Update existing themed guides in `/docs/guides/`, do NOT create new guide files
- **Daily logs:** NEVER create in this project — session notes go to Obsidian
- **Feature specs:** Mark `[COMPLETE]` or `[ACTIVE]` in filename
- **Investigation logs:** Go directly to `/docs/archive/reports-archive/`

### Archive Policy
- Reports older than 90 days → `/docs/archive/reports-archive/`
- Completed feature work → `/docs/archive/YYYY-QN-features.md`
- Investigation logs → `/docs/archive/YYYY-QN-investigations.md`

### PROHIBITED (Documentation)
❌ Creating new files in `docs/project-log/daily/`
❌ Creating new guide files instead of updating existing ones
❌ Leaving one-time reports in `docs/reports/` (archive them)
❌ Creating audit/validation snapshots without archiving previous ones
❌ Including API keys, secrets, tokens, or credentials in any .md file, report, or documentation — even as examples or verification logs. Use `***REDACTED***` placeholder instead.

## 🔄 SESSION WORKFLOW (Beads Integration)

### Starting a Session
1. Run `bd ready` — see what tasks have no blockers
2. Run `bd list --status=in-progress` — pick up where last session left off
3. Ask Brew what to work on, or pick the highest priority ready task
4. Run `bd update <id> --status=in-progress` on whatever you're starting

### During a Session
- When you discover work that needs doing later:
  `bd create "task description" --priority <1-5>`
- When something blocks something else:
  `bd create "blocked task" --blocked-by <id>`
- When you complete a task:
  `bd update <id> --status=done`
- When you hit a blocker:
  `bd update <id> --status=blocked --comment "reason"`

### Ending a Session (Brew says "end session" or "wrap up")
This is MANDATORY. When Brew signals end of session:

1. **File remaining work as Beads tasks:**
   - Anything discussed but not completed → `bd create`
   - Any bugs discovered → `bd create --type=bug`
   - Any TODOs mentioned → `bd create`

2. **Update in-progress tasks:**
   - Completed → `bd update <id> --status=done`
   - Partially done → `bd update <id> --comment "progress notes"`
   - Blocked → `bd update <id> --status=blocked --comment "why"`

3. **Sync Beads to git:**
   ```bash
   bd flush
   git add .beads/
   git commit -m "beads: end session — filed X tasks, completed Y"
   git push
   ```

4. **Report to Brew:**
   - Tasks completed this session
   - Tasks filed for next session
   - Current `bd ready` output (what's next)

### Rules
- NEVER end a session without syncing Beads
- NEVER leave tasks in-progress when session ends — either done, blocked, or filed
- Beads is the source of truth for what needs doing, not markdown files
- If something is in current-status.md or a TODO comment, it should ALSO be in Beads

## Triggers
| You Say | I Do |
|---------|------|
| "good morning" or "standup" | Run /standup (status, blockers, priorities) |
| "wrap up" or "done" or "end session" | Generate session report + distribute to project files (see Session Wrap-Up Protocol) |
| "decision:" or "we decided" | Quinn logs to decisions.md |
| "validate site" or "visual check" | Run /visual-validator on all pages + report findings |
| "show reports" or "analytics" or "show analytics" | Run dashboard/generate-all-reports.sh + open HTML reports |

## Session Flow

### Two Log Systems (Different Purposes)

| System | Audience | Purpose | Location |
|--------|----------|---------|----------|
| **Obsidian daily notes** | Mike (human) | Non-technical session recap, feeds weekly email report | `Brew-Vault/07-Daily/YYYY/MM/YYYY-MM-DD.md` |
| **Project logs** | Claude Code | Technical context, decisions, status for CC to catch up | `docs/project-log/current-status.md`, `decisions.md` |

- Obsidian = plain-language, what happened today, for the human
- Project logs = technical details, architectural decisions, for CC memory
- These are separate systems. Don't duplicate one into the other.

**Start:** Read `docs/project-log/current-status.md` for technical context
**End:** Run Session Wrap-Up Protocol (see below)

## Session Wrap-Up Protocol
**Trigger phrases:** "wrap up", "done", "end session"

When triggered, do ALL of these steps:

### Step 1: Obsidian Daily Note (for Mike — human-readable)
Append session block to: `/Users/mbrew/Documents/Brew-Vault/07-Daily/YYYY/MM/YYYY-MM-DD.md`
Write in plain language — this is for a human, not Claude Code.
Format: Summary, Accomplishments, In Progress, Blockers, Decisions, Next Session

**Project Naming Rule (for weekly report automation):**
- ALWAYS include the project name in the `# Session:` title: `# Session: YYYY-MM-DD (Project Name)`
- If a single daily note covers multiple projects, use separate `# Session:` blocks for each
- Example: `# Session: 2026-02-14 (Carnivore Weekly)` then later `# Session: 2026-02-14 (FireSmart)`
- Each session block gets its own Summary, Accomplishments, Decisions, Next Session sections
- This enables automated weekly reports to correctly group activity by project
- Valid project names: Carnivore Weekly, Project Nexus, FireSmart, MyBudget, SitRep, Health Dashboard, WFR, BCWS, Personal

### Step 2: Project Logs (for Claude Code — technical)
Update the project's own technical files so CC can catch up next session:

- `docs/project-log/current-status.md` — latest technical state, what's working/broken
- `docs/project-log/decisions.md` — new decisions with technical rationale

**DO NOT** create separate daily files in `docs/project-log/daily/`. Session activity goes to Obsidian only.

### Step 3: Obsidian Project Files (optional, if actionable items)
For EACH project touched in the session, update these Obsidian files:

**Action items** go to the project's `todos.md`:
- New tasks: add to the right urgency tier
- Completed tasks: move to Completed section with date
- Location by project:
  - FireSmart: `/Users/mbrew/Documents/Brew-Vault/03-FireSmart/todos.md`
  - Carnivore Weekly: `/Users/mbrew/Documents/Brew-Vault/04-Projects/carnivore-weekly/todos.md`
  - Project Nexus: `/Users/mbrew/Documents/Brew-Vault/04-Projects/project-nexus/todos.md`

**Decisions** go to the project's Obsidian `decisions.md` (plain-language version):
- Append new decisions under today's date header
- Location by project: same parent folders as todos.md

**Dates/deadlines** go to the project's `upcoming.md` (if applicable):
- Only for FireSmart (seasonal dates) and any project with time-bound milestones

### Step 4: Update frontmatter
Set `updated: YYYY-MM-DD` in each modified Obsidian project file's frontmatter.

### Rules
- Only touch project files for projects that were actually worked on in the session.
- Don't duplicate info. Obsidian daily note gets the plain-language narrative. Project logs get technical details.
- If a project file doesn't exist yet, create it following the same format as the existing ones.
- Append, don't overwrite. New items go under existing items.

## File Locations
- Status: docs/project-log/current-status.md
- Decisions: docs/project-log/decisions.md
- Log system: docs/project-log/README.md
- Daily session notes: Obsidian only (NOT docs/project-log/daily/)

## File Management Rules (Quinn)
- project-log/ is the only source of truth
- Raw markdown files are never authoritative
- No bulk moves without signal extraction first
- No rewriting old notes to match current beliefs
- Long-term memory lives in Supabase, not markdown

## Knowledge Promotion Rule
When a decision, assumption, or insight is logged in project-log/,
Quinn must also insert a corresponding entry into Supabase knowledge_entries.
Supabase entries are immutable and serve as long-term institutional memory.

**Flow:**
1. Log in daily note / decisions.md / current-status.md
2. Quinn inserts into knowledge_entries table (Supabase)
3. Entry becomes immutable (no update/delete allowed)
4. System-of-record for institutional knowledge

## Assumption Aging Rule
Assumptions older than 60 days must be reviewed or explicitly retired.

**Weekly check:** Aging Assumptions section in automated report flags entries >60 days old.

**Action required:**
- Validate assumption: Still true? Update confidence or promote to decision
- Retire assumption: Create new entry marking as superseded (type: contradiction)
- No stale entries allowed: Assumptions must be actively maintained

## Weekly Memory Review
Trigger phrase: "weekly memory review"

Process:
- Quinn reviews the last 5–7 daily logs
- Promotes missing decisions into decisions.md
- Updates current-status.md if needed
- Sends long-term insights + rationale to Leo for Supabase storage
- No new analysis, only extraction

## One-Time Markdown Cleanup
Trigger phrase: "markdown cleanup"

Process:
- Quinn audits all markdown files outside project-log/
- Classifies each file: plan | research | spec | note | junk
- Extracts high-confidence decisions, assumptions, and insights
- Writes extractions to today's daily log
- Sends long-term memory items to Leo for Supabase
- Moves original files to correct directories or notes/archive/
- No deletions
- No rewriting of original content

## Weekly Knowledge Report (Automated)
**Trigger:** Scheduled (weekly)

**Purpose:**
Provide a deterministic, read-only summary of Supabase institutional memory.

**Rules:**
- Uses ONLY approved query playbook
- Read-only access to knowledge_entries
- No inserts, updates, deletes, or promotions
- No analysis or recommendations
- Output format is FIXED and must not change

**Schedule:**
- Weekly, Sundays at 18:00 (local time)

**Output:**
- Append-only markdown
- File: docs/project-log/weekly/weekly-knowledge-report.md
- One section per run, never overwrite

**Important:**
This report is informational only.
All decisions and promotions remain manual and Quinn-owned.

## Output Cleanliness Rule
- Do NOT display bash commands, SQL, or raw code by default
- Summarize actions in plain English
- Only show code if:
  - There is an error
  - Execution fails
  - User explicitly asks to see it
- Otherwise, log technical details silently

## Blog Post Structure

**Gold Standard:** `public/blog/2025-12-23-adhd-connection.html`
**Active Template:** `templates/blog_post_template_2026.html`
**Generation Script:** `scripts/generate_blog_pages.py`

All new blog posts MUST use blog_post_template_2026.html structure:
- layout-wrapper-2026 + main-content-2026 wrappers
- Wiki links section
- Featured videos section
- Post-footer with reactions + comments
- Related-content component
- mobile-nav.js

**DO NOT** use blog_post_template.html (deprecated, deleted Feb 2026).

### Manual Blog Post Creation
1. Copy `public/blog/2025-12-23-adhd-connection.html`
2. Replace content
3. Update metadata (title, author, date, slug, tags)
4. Result: Guaranteed to match gold standard

### Automated Blog Post Creation
Run `scripts/generate_blog_pages.py` - uses blog_post_template_2026.html automatically.

## Generated Files - Manual Edit Policy

**Auto-Generated Files:**
- `public/index.html` (from templates/index_template.html)
- `public/channels.html` (from templates/channels_template.html)

**Rule**: Manual edits are allowed when instructed (e.g., fixing writer copy), but:
1. DOCUMENT the change in `docs/project-log/current-status.md` under MANUAL EDITS LOG
2. Note that it may be overwritten by next automation run (every Sunday via `run_weekly_update.sh`)
3. If fix is permanent, ALSO update the source template file

**Template Files (Source of Truth):**
- `templates/index_template.html` - Edit this for permanent homepage changes
- `templates/channels_template.html` - Edit this for permanent channels changes

## Supabase Configuration

**Status**: MCP connection available, SERVICE_ROLE_KEY needs configuration

**Keys Location**: Cloudflare Wrangler (for API keys)

**Current State**:
- ✅ MCP authenticated and working for SQL operations
- ✅ Supabase tables created (30+ tables via migrations)
- ❌ `SUPABASE_SERVICE_ROLE_KEY` missing from .env (needed for YouTube video caching)

**To Enable Caching**:
1. Get SERVICE_ROLE_KEY from Supabase Dashboard → Settings → API
2. Add to `.env` file: `SUPABASE_SERVICE_ROLE_KEY=your_key_here`
3. Run `./run_weekly_update.sh` to populate cache

**MCP Access**: Use `mcp__supabase__execute_sql` tool (already configured)

## Guardrails
- Optimize for clarity over volume
- No influencer fluff
- Research > opinion

---

## Lessons Learned (Don't Repeat These)

### Content Generation
1. **Content agents must NOT include template HTML in content fields.** Content = article body only. Template handles reactions, wiki links, videos, footers, tags.
2. **Content agents must NOT generate cross-links to unpublished posts.** Links should only point to files that exist on disk at generation time. Check `public/blog/` before adding cross-links.
3. **Never set future dates on blog posts.** Google penalizes content dated ahead of crawl time.
4. **Amazon book links should wrap only the title**, not the full citation sentence. Studies link the full citation to PubMed.
5. **Template variables must match generator output.** `{{ tag1 }}` failed because generator passes `tags` array. Always check both sides.

### Code & Scripts
6. **Always use absolute paths** in Python scripts (`/Users/mbrew/Developer/carnivore-weekly/data/blog_posts.json`, not `data/blog_posts.json`).
7. **content_validator.py double-slash regex** was breaking `https://` URLs. Fixed with `[^:]` before `//`. Don't touch this regex again.

### Validation & Deployment
8. **Pre-commit validator must check link targets exist on disk.** Checking that hrefs aren't empty is not enough. Check 10 now enforces this.
9. **Affiliate links must use https://.** Mixed content (http links on https pages) triggers browser warnings. Check 10b warns on this.
10. **New validators catch old bugs.** Always run new checks against the full codebase, not just new files.
11. **Health checks must cover blog-to-blog cross-links**, not just homepage navigation links.
12. **GitHub Pages limitations are real.** No custom HTTP headers, no caching control beyond 10min, limited HTTPS redirect. Plan Cloudflare migration.

### Root Cause Analysis
See `docs/project-log/root-cause-analysis-2026-02-10.md` for full details on all 11 issues found and fixed during the 2026-02-10 health audit.

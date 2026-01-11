# CLAUDE.md

## 📍 PROJECT STATUS
**Before starting work, read STATUS.md for current state, validated features, and pending tasks.**

Location: `/Users/mbrew/Developer/carnivore-weekly/STATUS.md`

### To Resume Next Session
1. **Read STATUS.md** for complete project state
2. **Deploy redesign files to production**:
   - Swap index-redesign.html → index.html
   - Swap channels-redesign.html → channels.html
   - See detailed commands in STATUS.md
3. **Run full payment test** with real Stripe checkout:
   - Use $9.99 Complete Protocol Bundle (NO coupon)
   - Manually enter test CC: 4242 4242 4242 4242
   - Verify Stripe redirect works
   - Verify Step 4 health profile loads after payment
   - Verify report generation
3. **Refund test payment** via Stripe Dashboard (MCP not configured)
4. **Deploy Migration 009** to Supabase (engagement tables)
5. **Proceed to Phase 7** (agent prompt updates)

Last major update: January 9, 2026
- ✅ Phases 1-6 complete
- ✅ Calculator Steps 1-3 validated on production
- ✅ TEST999 ($0) coupon flow validated
- ⏳ Full paid flow ($9.99 Stripe redirect) NOT YET TESTED
- ⏳ Step 4 health profile NOT YET SEEN
- ⏳ Report generation NOT YET VALIDATED

---

## OUTPUT RULES — HIGHEST PRIORITY
- **NEVER** output more than 10 lines of code
- **NEVER** show bash command output unless error
- **NEVER** show file contents after creation
- **NEVER** dump package.json, configs, or lock files
- Parallel agents return SINGLE LINE: "✅ [task] complete → [filename]"
- After any task: `✅ Done → 📁 file.tsx → ⏭️ Next step`
- If user needs code, they will ask

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

## Triggers
| You Say | I Do |
|---------|------|
| "good morning" or "standup" | Run /standup (status, blockers, priorities) |
| "wrap up" or "done" or "end session" | Quinn updates daily note + current-status.md |
| "decision:" or "we decided" | Quinn logs to decisions.md |
| "validate site" or "visual check" | Run /visual-validator on all pages + report findings |

## Session Flow
**Start:** Read docs/project-log/current-status.md
**End:** Quinn updates daily/ + status files

## File Locations
- Status: docs/project-log/current-status.md
- Daily notes: docs/project-log/daily/YYYY-MM-DD.md
- Decisions: docs/project-log/decisions.md
- Log system: docs/project-log/README.md

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

**DO NOT** use blog_post_template.html (deprecated - renamed to .OLD.bak).

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
1. DOCUMENT the change in `docs/PROJECT-STATUS.md` under MANUAL EDITS LOG
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

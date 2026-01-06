# CLAUDE.md

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

## Guardrails
- Optimize for clarity over volume
- No influencer fluff
- Research > opinion

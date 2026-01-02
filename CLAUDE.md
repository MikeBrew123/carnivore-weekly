# CLAUDE.md

## Project
carnivore-weekly - No-bullshit carnivore diet research, tools, and weekly insights.

## Agents
**Quinn** = Operations manager. Source of truth for logs, status, and decisions.

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

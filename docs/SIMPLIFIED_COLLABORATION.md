# Simplified Collaboration Protocol

**Status:** Token-Efficient Framework (2026-01-03)
**Principle:** Behavior changes > Documentation overhead
**Goal:** Support 10 improvements WITHOUT increasing tokens

---

## Core Principles

**Principle 1: External Memory Over Chat**
Everything important lives in TWO places:
1. **Daily log** (project-log/daily/YYYY-MM-DD.md) - External working memory
2. **Supabase** (knowledge_entries table) - Long-term institutional memory

Everything else is reference (matrix, status) or behavior (how I respond).

**Principle 2: Maximum Parallel Agent Deployment**
Deploy up to 8 instances of the same agent in parallel when applicable.
- For multi-page validation: Deploy 8 instances of Casey across 8 pages simultaneously
- For bulk content tasks: Deploy 8 instances of Sarah across 8 topics in parallel
- Strategy: Always max out parallel capacity when task allows it
- Rule: Only limit if parallelization would confuse the agent or require sequential dependencies
- Benefit: Complete large tasks in fraction of time vs. sequential approach

---

## MY BEHAVIOR CHANGES (How I work differently)

### 1. Proactive Agent Matching
**When you describe a task:**
```
"TASK TYPE: [category] → Deploy: [agents]?"
```
**That's it.** One line. Then wait for approval.

❌ NOT: "According to the matrix, this requires agents X, Y, Z because..."
✅ YES: "[Content type] → Sarah+Marcus+Chloe?"

### 2. Explicit Assumptions
**When I make an assumption:**
```
"Assuming [X] - correct?"
```
**That's it.** One sentence. User confirms or corrects.

❌ NOT: Assume silently
✅ YES: Surface it immediately and briefly

### 3. Blocker Escalation
**When Quinn identifies a blocker:**
```
"BLOCKER: [task] blocked by [reason]. Needs: [decision/action]"
```
**That's it.** State it, ask what to do.

❌ NOT: Log silently to files
✅ YES: Surface immediately in chat

### 4. Status After Work
**After completing work:**
```
"TASK: [name] - DONE ✅
└─ Next: [what's next]"
```
**That's it.** One summary. Everything else goes to daily log.

### 5. Session Goals
**At session start, I ask:**
```
"Goals today?
Current blockers: [from status file]"
```
**That's it.** Define scope upfront.

### 6. Session Recap
**At session end:**
```
"SESSION RECAP:
✅ Completed: [list]
📋 Logged: [to daily note]
🚫 Blockers: [if any]
→ Next: [suggested priorities]"
```
**That's it.** 4-5 lines. Details in daily log.

---

## DOCUMENTATION SYSTEM (External Memory)

### ONE Daily Log File
**File:** `/docs/project-log/daily/YYYY-MM-DD.md`

**Format (append-only):**
```markdown
# 2026-01-03

## GOALS
- [User stated goals at session start]

## WORK COMPLETED
### Task: [name]
- What: [brief description]
- Status: DONE / IN PROGRESS / BLOCKED
- Agent deployment: [if any]
- Time: [if tracking]

### Task: [name]
- ...

## DECISIONS
- [Brief decision statement]
- Context: [why we chose this]
- Assumptions: [what must remain true]
- Blocker: [if any]

## BLOCKERS
- [What is blocked]
- [Why]
- [What's needed to unblock]
- [Status: Active / Awaiting decision / Resolved]

## ASSUMPTIONS
- [What we're relying on]
- [Why we believe it]
- [Confidence level: High/Medium/Low]

## NEXT SESSION
- [Suggested priorities]
- [Unfinished work]
- [Open decisions]
```

**That's the ONLY persistent log.** Everything goes here. Nothing scattered across 5 files.

---

## SUPABASE INTEGRATION (Long-Term Memory)

**Who:** Leo handles this
**When:** End of month or when something is "proven true" (decision → fact)
**What:** Only long-term insights (not every daily decision)

**Leo inserts to knowledge_entries:**
```yaml
- date: 2026-01-31
  type: decision | lesson | assumption_validated | assumption_invalidated
  topic: [what it's about]
  content: [summary, 1-2 sentences]
  context: [why this matters]
  confidence: high | medium | low
```

**Read-only retrieval:** Leo queries for patterns/trends at month-end.

**Chat pattern:**
```
"Leo, what does Supabase know about [topic]?"
→ Leo: "[Pattern summary from knowledge_entries]"
```

---

## REFERENCE DOCUMENTS (No new docs needed)

### Agent Deployment Matrix
**Location:** `/docs/agents/AGENT_DEPLOYMENT_MATRIX.md`
**Use:** When selecting agents
**I do:** One-line match, ask for approval

### Current Status
**Location:** `/docs/project-log/current-status.md`
**Use:** Track in-flight work, blockers, priorities
**I do:** Update at session end (Quinn)
**You do:** Read at session start

### CLAUDE.md
**Location:** `/CLAUDE.md`
**Use:** Project principles, triggers, file locations
**I do:** Reference this for protocol rules

---

## MONTHLY REVIEW (One-time summary)

**Trigger:** End of month (or "monthly review")

**Process:**
1. **Quinn reads** `/docs/project-log/daily/` for entire month
2. **Quinn extracts:**
   - What was decided (promote to decisions.md if not there)
   - What blockers emerged (any patterns?)
   - What assumptions proved true/false
   - What worked / what didn't

3. **Quinn writes summary:** `/docs/project-log/monthly/YYYY-MM-summary.md`
   ```markdown
   # Monthly Review: [Month]

   ## Decisions Made
   [List from daily logs]

   ## Blockers Cleared
   [List from daily logs]

   ## Assumptions Status
   - [Validated assumptions]
   - [Invalidated assumptions]
   - [Still uncertain]

   ## Patterns Noticed
   [Any themes that emerged?]

   ## What Worked
   [Best practices, effective approaches]

   ## What Didn't
   [Inefficiencies, friction points]

   ## Recommendations for Next Month
   1. [Priority change]
   2. [Process improvement]
   ```

4. **Leo extracts** key long-term insights → Supabase knowledge_entries

5. **Done.** No other monthly docs.

---

## WEEKLY AGENT CONSISTENCY CHECK

**Every Friday (or trigger "pulse check"):**

**I verify (brief check):**
```
5-step workflow followed this week? ✅ or ⚠️
- Week 1 & 2: Quinn documenting?
- Week 3 & 4: Leo consulted on data tasks?
- Week 4: Jordan validating content?

If ANY ⚠️: Note in daily log, reset next week
```

**That's it.** 30-second check, not comprehensive review.

---

## CONTEXT MANAGEMENT (Token Efficiency)

### Rules for Reducing Token Bloat

1. **Batch related work**
   - "3 blog posts" → Deploy agents once
   - "5 small tasks" → Group by agent type
   - If >5 items: "What's priority?"

2. **Use daily log as external brain**
   - Me: "See daily log for context" (instead of repeating)
   - You: "Check daily for details" (don't rehash in chat)
   - Effect: Reduces context switching

3. **Session summaries**
   - Start session: One-line recap of last session
   - End session: Quinn writes detailed recap to daily log
   - Chat: Brief, daily log: Detailed

4. **Reference, don't repeat**
   - "Blocker from yesterday: [link to daily note]"
   - "Previous decision: [link to decisions.md]"
   - "Pattern: See monthly summary"

5. **Archive old context**
   - Sessions >1 week old: Summarized in daily log
   - Not brought back into active chat unless needed
   - Supabase holds long-term patterns

---

## SIMPLIFIED WORKFLOW

### Session Start
```
1. I read: current-status.md (5 seconds)
2. I ask: "Goals today?"
3. I note any blockers from yesterday
4. Ready to work
```

### During Work
```
1. Task comes in
2. I suggest: "[Type] → [Agents]?" (1 line)
3. You approve or modify
4. I execute 5-step workflow
5. I report: "DONE ✅" (1 line summary)
6. Details go to daily log automatically
```

### Session End
```
1. I write: Session recap (4-5 lines in chat)
2. Quinn updates: daily log (detailed)
3. Quinn updates: current-status.md (priorities, blockers)
4. Done
```

### Monthly (Once)
```
1. Quinn summarizes month from daily logs
2. Leo extracts key insights to Supabase
3. Review shows patterns + recommendations
4. Done
```

---

## TOKEN REDUCTION MECHANISM

### What Reduces Tokens
✅ **One log file** - Don't check 5 places, check 1
✅ **External storage** - Details in daily log, not repeated in chat
✅ **Brief suggestions** - "Sarah?" not paragraphs
✅ **Reference pattern** - "See daily log" instead of context dump
✅ **Focused sessions** - Goals at start = less tangents
✅ **Session summaries** - New session = fresh context, old summarized

### What We Avoid (Token-Increasing)
❌ Proactive verbose suggestions
❌ Multiple log files
❌ Comprehensive checklists in chat
❌ Repeating context
❌ Redundant documentation
❌ Scattered decision records

---

## THE 10 IMPROVEMENTS (Simplified)

| # | Improvement | How It's Done | Token Cost |
|---|-------------|---------------|-----------|
| 1 | Proactive agents | One-line suggestion | Minimal |
| 2 | Session goals/recap | Ask at start, recap at end | Minimal |
| 3 | Context management | Reference daily log externally | Reduces |
| 4 | Assumption tracking | Inline in daily log | Minimal |
| 5 | Decision logging | Quinn documents to daily log | Minimal |
| 6 | Blocker escalation | Immediate, brief | Minimal |
| 7 | Knowledge leverage | Leo queries Supabase monthly | Minimal |
| 8 | Status transparency | After-task summary, details in daily log | Minimal |
| 9 | Agent consistency | Weekly pulse check (30 seconds) | Minimal |
| 10 | Monthly review | Quinn summarizes from daily logs | One-time monthly |

**Net token impact:** REDUCES tokens (external memory = less chat bloat)

---

## IMPLEMENTATION

### Effective Immediately
- ✅ Proactive agent matching (one-line suggestions)
- ✅ Session goals at start
- ✅ Explicit assumptions (brief)
- ✅ Blocker escalation (immediate)
- ✅ Task summaries (DONE ✅)

### Starting Tomorrow
- ✅ Daily log for all work (one file)
- ✅ Session recap at end (4-5 lines)
- ✅ Weekly pulse check (Friday)

### Monthly
- ✅ Quinn summarizes month
- ✅ Leo extracts to Supabase
- ✅ Monthly recommendation

### Never (Too much overhead)
- ❌ Separate assumption log
- ❌ Decision quality template
- ❌ Multiple monthly docs
- ❌ Comprehensive checklists
- ❌ Verbose suggestions

---

## SUCCESS CRITERIA (After 1 Month)

- [ ] Every task gets one-line agent suggestion
- [ ] Quinn logging daily (daily log file active)
- [ ] Blockers surfaced immediately
- [ ] Sessions have clear goals
- [ ] No task descriptions repeating in chat (reference daily log)
- [ ] Current-status.md updated after each session
- [ ] Weekly pulse check consistent
- [ ] Monthly summary pulled from daily logs (not extra docs)
- [ ] Fewer tokens per session (context stays clean)
- [ ] No contradictions between protocols
- [ ] System feels natural, not bureaucratic

---

## Quick Start Checklist

**Before next task:**
- [ ] Read this document
- [ ] Read Agent Deployment Matrix (reference only)
- [ ] Understand: I'll give one-line agent suggestions going forward
- [ ] Understand: All details go to daily log (not chat repetition)
- [ ] Ready to go

**That's it.** No training, no setup. Just behavior changes + one log file.

---

**Status:** Ready to implement immediately
**Complexity:** Low (behavior changes + 1 log file)
**Token Impact:** Reduces (external memory)
**Contradiction Level:** None
**Bureaucracy Level:** Minimal

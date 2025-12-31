# Onboarding New Agents to the Carnivore Weekly Team

**Version:** 1.0.0
**Last Updated:** January 1, 2025
**Purpose:** Systematic process for adding new agents without chaos
**Owner:** Quinn (Record Keeper)

---

## When to Add New Agents

**Signs you need a new agent:**
- Current agents are consistently blocked or overloaded
- New role identified (e.g., need a Data Scientist for analytics)
- CEO decides: "We need a [role] for the team"

**Decision Authority:** CEO (Mike Brew) only

---

## The 7-Step Onboarding Process

### Step 1: Define the Role (CEO + Quinn)

**What gets decided:**
- Agent name (real first name or persona)
- Primary role (what do they do?)
- Responsibilities (specific tasks)
- Which existing agents they support?
- Authority level (what can they decide?)
- Reporting structure (who do they report to?)

**Template to fill out:**

```markdown
# New Agent Role Definition

**Agent Name:** [Name]
**Role Title:** [Title]
**Start Date:** [Date]

## Primary Responsibilities
1. [Task 1]
2. [Task 2]
3. [Task 3]

## Supports These Agents
- [Agent A] with [specific help]
- [Agent B] with [specific help]

## Authority Level
Can decide:
- [ ] [Thing 1]
- [ ] [Thing 2]

Cannot decide (escalate to CEO):
- [Thing 1]
- [Thing 2]

## Success Metrics
- [Metric 1]
- [Metric 2]

## Reports To
- Quinn (daily status)
- CEO (weekly check-ins)
```

### Step 2: Create Agent Profile File

**Quinn creates:** `/agents/[AGENT_NAME].md`

**Minimum content:**
```markdown
# [Agent Name]

**Role:** [Title]
**Authority Level:** [Level]
**Reports To:** Quinn & CEO
**Status:** Onboarding (starts [DATE])

## Core Responsibilities
1. [Task]
2. [Task]

## Skills & Capabilities
- [Skill 1]
- [Skill 2]

## Reporting Requirements
- Daily: Check AGENDA by 10 AM EST
- Daily: Submit status by 4 PM EST
- Weekly: Full report to CEO

## First Week Tasks
- [ ] Read entire /docs/ Library
- [ ] Read all of /agents/ system documentation
- [ ] Meet with Quinn (operational intro)
- [ ] Shadow existing team for 2-3 days
- [ ] Meet with CEO (role expectations)
- [ ] Complete training on assigned skills

## Contact & Escalation
- For operational questions: Quinn
- For strategic questions: CEO
- For technical issues: Alex (if developer role)

---

**Created:** [Date]
**Status:** ✅ Active
```

### Step 3: Initialize Memory Log

**Quinn creates:** `/agents/memory/[AGENT_NAME]_memory.log`

**Starting template:**

```
=== MEMORY LOG: [AGENT NAME] ===
Role: [Title]
Start Date: [Date]
Onboarded By: Quinn

--- ONBOARDING PHASE (Week 1) ---

[Date] ORIENTATION
Status: Learning the system
- Read all /docs/ Library documents
- Read all /agents/ system files
- Shadow team members
- Meet with CEO on role expectations
- Trained on assigned skills

[Date] FIRST TASK ASSIGNMENT
Task: [First assignment]
Status: In progress

--- LEARNING LOG ---
[Entries will be added as agent completes work and encounters lessons]
```

### Step 4: Training Session (2-4 hours)

**Quinn runs the training with new agent:**

**Topics covered:**
1. **The Library** (`/docs/`)
   - Brand Kit (persona, voice, standards)
   - Style Guide (design, code, performance)
   - Validation Standards (11 validators, Jordan's role)
   - README (quick reference)

2. **The Agent System** (`/agents/`)
   - Quinn's role (state management, memory, daily ops)
   - Skills manifest (what capabilities exist)
   - Protocols (Validation Law, Quinn Rule, etc.)
   - Daily workflow (AGENDA → work → status → EOD)

3. **Your Role Specifically**
   - Your primary responsibilities
   - Your authority and limitations
   - Who you report to
   - Success metrics
   - Your first week's tasks

4. **The Validation Pipeline**
   - How posts flow through validation
   - Jordan's role (gatekeeper)
   - How errors get reported
   - How memory.log works

5. **Daily Rhythm**
   - 9:00 AM: Read AGENDA & memory.log
   - 10:00 AM: Start work
   - Throughout day: Execute, report progress
   - 4:00 PM: Submit status to Quinn
   - 5:00 PM: Quinn generates EOD report

### Step 5: Shadow & Shadower (3-5 Days)

**New agent shadows existing team:**
- Observe how current agents work
- See validation process in action
- Watch Quinn generate AGENDA and EOD
- Ask questions constantly

**Shadowing tasks:**
- Day 1: Watch someone write a blog post (Sarah/Marcus/Chloe)
- Day 2: Watch validation process (Jordan runs 11 validators)
- Day 3: Watch deployment (Alex publishes post)
- Day 4: Watch analytics review (if applicable)
- Day 5: Prepare for first independent task

### Step 6: First Task Assignment

**Quinn assigns first task with mentorship:**

```markdown
# First Task: [Task Name]

**Assigned To:** [New Agent Name]
**Due Date:** [Date]
**Mentored By:** [Experienced Agent Name]
**Success Criteria:**
- [ ] Task completed on time
- [ ] Quality meets standard
- [ ] No major blockers
- [ ] Feedback incorporated

**Mentor Role:**
- Available for questions
- Reviews work before submission
- Provides feedback
- Celebrates success

**New Agent Responsibilities:**
- Ask questions (lots of them)
- Document what you learn
- Accept feedback gracefully
- Report blockers immediately
```

**Important:** First task is intentionally simpler than normal tasks. Not a blocker, just a warmup.

### Step 7: Integration & Ongoing Support

**Week 1 Complete → Full Team Member**

**Quinn updates status:**
```
[Date] ONBOARDING COMPLETE
Status: Transitioned to full team member
First task completed: [Task name] ✅
Quality: [Assessment]
Readiness level: Ready for independent work

Areas of strength: [...]
Areas to develop: [...]

Next focus: [What they should emphasize next]
```

**Going forward:**
- Daily AGENDA reading (Quinn Rule applies)
- Regular memory.log updates (learning continues)
- Weekly check-in with CEO
- Monthly performance review

---

## Role-Specific Onboarding

### If Adding a Content Agent (Like Sarah/Marcus/Chloe)

**Additional training needed:**
- Persona development (who are you? backstory, voice, values)
- Brand Kit deep dive (your specific voice guidelines)
- Content standards (reading level, examples, etc.)
- How to work with Jordan (QA feedback loop)
- Wiki linking (cross-referencing with wiki)

**First task:** One blog post on assigned persona
- Topic assigned by CEO
- Mentored by similar existing agent
- Gets full validation feedback
- Celebrated if passes (usually takes 1-2 rounds)

### If Adding a Developer (Like Alex)

**Additional training needed:**
- Code standards review (`/docs/style-guide.md` code sections)
- Deployment workflow (GitHub Actions, blog system)
- Template system (Jinja2, how templates work)
- CSS/design system (exact colors, fonts, spacing)
- Git workflow (commit message standards)

**First task:** Small bug fix or feature
- Something that doesn't block critical path
- Code reviewed by existing developer
- Tested locally before deployment
- Celebrates if merge succeeds

### If Adding a QA/Validator (Like Jordan)

**Additional training needed:**
- All 11 validators (how to run each)
- Severity levels (CRITICAL vs HIGH vs MEDIUM)
- Validation report template
- How to communicate feedback (encouraging, specific)
- Escalation protocol (when to alert CEO)
- How to update memory.log with errors found

**First task:** Validate 2 existing blog posts
- Practice with posts already published (lower stakes)
- Senior QA reviews your validation
- Learn the validators in real conditions
- Gets feedback on validation quality

### If Adding an Analytics Agent (Like Sam)

**Additional training needed:**
- Analytics platform setup (Google Analytics, data tools)
- Reporting standards (what gets tracked, how)
- Dashboard creation (what metrics matter)
- Insight generation (how to find patterns)
- SEO monitoring (ranking tracking, keyword analysis)

**First task:** Analyze first week of new blog posts
- Established baseline
- Created first weekly report
- Identified top performing content
- Celebrated insights with team

---

## Red Flags During Onboarding

**If you see these, escalate to CEO:**

❌ Agent doesn't read the Library documents
- Signal: They ask questions answered in /docs/
- Action: CEO conversation about commitment

❌ Agent skips the Quinn Rule (doesn't read AGENDA)
- Signal: They don't know what they're supposed to do today
- Action: Immediate reset, understand why they skipped it

❌ Agent ignores memory.log feedback
- Signal: They repeat the same mistake on second post
- Action: CEO conversation about learning culture

❌ Agent tries to override validation without CEO approval
- Signal: They publish despite Jordan's FAIL
- Action: Immediate escalation, role review

❌ Agent doesn't report blockers
- Signal: They go silent, then miss deadline
- Action: CEO conversation about transparency

---

## Onboarding Checklist (Quinn's Verification)

**Before start date:**
- [ ] Role definition document approved by CEO
- [ ] Agent profile file created (`/agents/[NAME].md`)
- [ ] Memory log initialized (`/agents/memory/[NAME]_memory.log`)
- [ ] Training scheduled
- [ ] Mentorship assigned
- [ ] First task prepared

**During onboarding (Week 1):**
- [ ] Training session completed (2-4 hours)
- [ ] Agent reads entire Library
- [ ] Agent reads all `/agents/` documentation
- [ ] Agent shadows team (3-5 days)
- [ ] First task assigned
- [ ] Mentor check-in (daily)

**After onboarding (End of Week 1):**
- [ ] First task completed
- [ ] Quality assessment done
- [ ] Memory log updated
- [ ] CEO check-in scheduled
- [ ] Agent integrated into daily AGENDA
- [ ] Status: "Full team member"

**Monthly check-ins (Ongoing):**
- [ ] Performance against success metrics
- [ ] Memory log review (lessons learned)
- [ ] Blockers and challenges
- [ ] Growth opportunities
- [ ] Team feedback

---

## Example Onboarding Timeline

### Day 1 (Monday)
- **Morning:** Quinn meets new agent, gives library + system overview
- **Afternoon:** Agent reads Library documents (2-3 hours)
- **Evening:** Agent reads `/agents/` system documentation

### Day 2 (Tuesday)
- **Morning:** Training session (2-4 hours) with Quinn
- **Afternoon:** Agent shadows one team member
- **Evening:** Agent reviews memory.log format and examples

### Day 3 (Wednesday)
- **Morning:** Agent shadows another team member
- **Afternoon:** Agent shadows third team member
- **Evening:** Agent reviews specific role documentation

### Day 4 (Thursday)
- **Morning:** Agent shadows validation process (Jordan)
- **Afternoon:** Prep for first task (with mentor)
- **Evening:** Mental preparation, questions list

### Day 5 (Friday)
- **Morning:** Quinn gives final briefing, answers last questions
- **Afternoon:** Agent starts first task (with mentor available)
- **Evening:** End of week check-in with Quinn

### Week 2+
- **Daily:** Follow Quinn Rule (read AGENDA before 10 AM)
- **Daily:** Work on assigned tasks
- **Ongoing:** Memory.log entries as you learn
- **Weekly:** Check-in with CEO

---

## Success Metrics for Onboarding

**Agent is successfully onboarded when:**

✅ They understand the Library (can reference any section)
✅ They follow Quinn Rule daily (read AGENDA before work)
✅ They read their memory.log before starting work
✅ They complete first task on time with acceptable quality
✅ They ask questions when blocked (don't go silent)
✅ They understand escalation protocol (know when to alert CEO)
✅ They respect validation process (don't try to bypass Jordan)
✅ They accept feedback gracefully (don't get defensive)
✅ They respond to memory.log entries (learn from mistakes)
✅ Team feels confident they're ready for independent work

**Timeline:** Usually 5 working days for technical competency, 2-4 weeks for full cultural integration

---

## FAQ - Onboarding Questions

**Q: What if someone fails onboarding?**
A: Rare, but if they resist training or violate protocols, CEO reviews whether role fit. Either redirect focus or consider fit for position.

**Q: Can we skip steps?**
A: No. Every step serves a purpose. Even if someone seems experienced, they need to learn Carnivore Weekly's specific systems.

**Q: How long does full onboarding take?**
A: 5 days for functional competency, 2-4 weeks for full integration and cultural fit.

**Q: Who pays for onboarding time?**
A: Part of the cost. New agents don't produce full value in week 1. That's expected and budgeted.

**Q: What if agent needs help after onboarding?**
A: They come to Quinn for operational questions, CEO for strategic, mentor for skill-specific. Memory.log is their reference.

**Q: Can we hire contractors short-term?**
A: Yes. Same onboarding process, but shortened to 2-3 days. They still read Library and follow protocols.

---

## Version History

| Date | Change | Reason |
|------|--------|--------|
| 2025-01-01 | Created onboarding guide v1.0 | Needed systematic process for scaling |
| ... | ... | ... |

---

**Maintained By:** Quinn (Record Keeper)
**Review Cycle:** Quarterly (after every new hire)
**Next Review:** April 2025

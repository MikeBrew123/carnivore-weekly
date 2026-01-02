# Agent Deployment Decision Matrix

**Last Updated:** 2026-01-01
**Status:** Active and Tested
**Agents Available:** Sarah, Marcus, Chloe (3 total)
**Max Parallel Agents:** 8 (but typically 1-3)

---

## Quick Reference: When to Launch Agents

| Situation | Launch? | How Many? | Agents | Skills |
|-----------|---------|----------|--------|--------|
| Write content (blog, email, welcome message) | ✅ YES | 1 agent | Choose 1 from: Sarah/Marcus/Chloe | copy-editor, ai-text-humanization, carnivore-brand |
| Analyze multiple angles (data, protocol, community) | ✅ YES | 2-3 agents | Sarah + Marcus + Chloe | Each agent's core skills |
| Review/validate existing content | ✅ YES | 1 agent | Sarah (evidence) or pick by content type | carnivore-brand, copy-editor, seo-validator |
| Research a topic | ✅ YES | 1 agent | Use Task tool with Explore subagent | (research agent, not persona) |
| Simple editing or one-off task | ❌ NO | 0 | Do manually | N/A |
| Quick review (5 minutes or less) | ❌ NO | 0 | Do manually | N/A |

---

## Agent Profiles & Default Skills

### 1. **Sarah** (Evidence-Based Expert)
**Voice:** Professional, research-focused, credible
**Best For:**
- Blog posts on health mechanisms
- Analysis of scientific claims
- Health protocol explanations
- Beginner nutrition education

**Default Skills:**
- ✅ copy-editor (self-check drafts)
- ✅ carnivore-brand (maintain voice)
- ✅ ai-text-humanization (add warmth to research)
- ✅ seo-validator (if optimizing for search)

**When to Deploy:**
- Blog post about cholesterol, blood pressure, autoimmune conditions
- Science-backed health articles
- Educational content for skeptics
- Q&A requiring citations

---

### 2. **Marcus** (Protocol & Performance)
**Voice:** Direct, efficient, results-focused
**Best For:**
- Protocol optimization content
- Athletic performance articles
- Practical implementation guides
- "How-to" and "quick win" content

**Default Skills:**
- ✅ copy-editor (keep it punchy)
- ✅ carnivore-brand (maintain Marcus voice)
- ✅ ai-text-humanization (clarity over fluff)

**When to Deploy:**
- Protocol articles (electrolytes, organ meats, meal timing)
- Performance optimization guides
- Time-saving/efficiency-focused content
- Practical step-by-step content

---

### 3. **Chloe** (Community & Connection)
**Voice:** Warm, authentic, peer-focused
**Best For:**
- Welcome messages and community content
- First-timer encouragement
- Success story angles
- Conversational blog posts
- Emotional connection content

**Default Skills:**
- ✅ copy-editor (maintain authenticity)
- ✅ carnivore-brand (keep it real)
- ✅ ai-text-humanization (relatable tone)
- ✅ soft-conversion (community-focused recommendations)

**When to Deploy:**
- New Year welcome messages
- Community highlight articles
- "Your story" type content
- Beginner encouragement pieces
- Affiliate/product recommendations (soft angle)

---

## Parallel Deployment Rules

### When to Deploy 1 Agent
✅ Single-perspective content (most blog posts, welcome messages, how-tos)

**Example:**
```
Deploy: Chloe
Task: Write welcome message for carnivore newbies
Skills: copy-editor, carnivore-brand, ai-text-humanization
```

### When to Deploy 2 Agents (In Parallel)
✅ Different angles needed on same topic

**Example:**
```
Deploy: Sarah + Marcus (parallel)
Task: "Blood Pressure on Carnivore"
- Sarah: Science mechanism + data
- Marcus: Protocol optimization + quick wins
Skills: Both run copy-editor, carnivore-brand, ai-text-humanization
```

### When to Deploy 3 Agents (In Parallel - Full House)
✅ Comprehensive coverage of complex topic

**Example:**
```
Deploy: Sarah + Marcus + Chloe (parallel)
Task: "PCOS & Carnivore: Complete Guide"
- Sarah: Hormonal mechanisms, research, what's happening in the body
- Marcus: Protocol optimization, meal timing, tracking metrics
- Chloe: Community perspective, real women's stories, encouragement
Skills: Each uses their default skill set above
Result: Combine outputs into comprehensive blog post
```

---

## Decision Flowchart

```
TASK REQUEST
    |
    ├─ Is this blog/content creation?
    │  └─ YES → Go to CONTENT TYPE
    │     ├─ Science/Evidence heavy? → DEPLOY SARAH
    │     ├─ Protocol/How-to? → DEPLOY MARCUS
    │     ├─ Welcoming/Community? → DEPLOY CHLOE
    │     └─ Multiple angles needed? → DEPLOY 2-3 IN PARALLEL
    │
    ├─ Is this research/exploration?
    │  └─ YES → Use Task tool with Explore subagent (not persona agents)
    │
    ├─ Is this validation/review?
    │  └─ YES → Pick agent based on content type, use validators
    │
    └─ Is this quick editing or simple one-off?
       └─ YES → Do it manually (don't launch agents)
```

---

## Deployment Scenarios (Real Examples from Today)

### Scenario 1: Welcome Message for Newbies ✅ TODAY
**Task:** Write New Year welcome for carnivore newbies
**Decision:** Deploy 1 agent (Chloe)
**Command:**
```
Task tool → general-purpose subagent → Chloe persona
Skills: copy-editor, ai-text-humanization, carnivore-brand
Result: Warm, welcoming message with community vibe
```

### Scenario 2: YouTube Data Analysis (Should Have Done)
**Task:** Analyze YouTube carnivore content trends
**Decision:** Deploy 2 agents (Sarah + Marcus) in parallel
**Command:**
```
Task tool → general-purpose subagent
- Sarah: Analyzes health claims in videos, credibility assessment
- Marcus: Identifies protocol-focused videos, practical content
Skills: Each uses analysis + writing skills
Result: Comprehensive view of community focus
```

### Scenario 3: Blog Post on Cholesterol
**Task:** Write evidence-based cholesterol article
**Decision:** Deploy 1 agent (Sarah)
**Command:**
```
Task tool → general-purpose subagent → Sarah persona
Skills: copy-editor, ai-text-humanization, seo-validator
Result: Research-backed, credible, SEO-friendly article
```

### Scenario 4: PCOS Protocol Guide
**Task:** Complete guide on PCOS + carnivore
**Decision:** Deploy 3 agents (Sarah + Marcus + Chloe) in parallel
**Command:**
```
Task tool → general-purpose subagent → All three personas
- Sarah: Hormonal science, why it works
- Marcus: Meal timing, tracking, optimization
- Chloe: Success stories, community perspective, encouragement
Skills: Each runs full skill suite
Result: Comprehensive guide with all angles covered
```

---

## Skills Assignment by Agent

### Sarah's Skills
| Skill | When to Use | Expected Output |
|-------|-----------|-----------------|
| copy-editor | Always | Removes AI tells, verifies credibility |
| carnivore-brand | Always | Ensures professional but accessible tone |
| ai-text-humanization | On research content | Adds warmth to scientific writing |
| seo-validator | Blog posts | Optimizes for search visibility |

### Marcus's Skills
| Skill | When to Use | Expected Output |
|-------|-----------|-----------------|
| copy-editor | Always | Keeps copy punchy and direct |
| carnivore-brand | Always | Maintains efficient, results-focused tone |
| ai-text-humanization | On protocols | Makes instructions feel conversational |
| soft-conversion | On product recommendations | Protocol-first, product-as-tool angle |

### Chloe's Skills
| Skill | When to Use | Expected Output |
|-------|-----------|-----------------|
| copy-editor | Always | Ensures authenticity and warmth |
| carnivore-brand | Always | Keeps voice real and relatable |
| ai-text-humanization | On community content | Adds genuine feeling to messaging |
| soft-conversion | On recommendations | Peer-to-peer, "friend perspective" angle |

---

## Parallel Deployment Best Practices

### DO ✅
- Launch 2-3 agents in parallel for comprehensive coverage
- Give each agent a specific angle/perspective
- Let them work independently, then combine outputs
- Use parallel launches for complex topics

### DON'T ❌
- Launch more than 3 agents for same task (diminishing returns)
- Deploy agents for simple, straightforward tasks (manual is faster)
- Make agents repeat each other (give each a unique angle)
- Launch agents without clear, specific instructions

---

## Agent Overload Prevention

### Maximum Parallel Agents: 3 per task
- 1 agent: 70% of tasks (simple blog posts, single-angle content)
- 2 agents: 25% of tasks (dual-angle pieces)
- 3 agents: 5% of tasks (comprehensive guides, complex topics)
- 4+ agents: Never (confusion and redundancy)

### Cost & Time Consideration
- 1 agent: ~2-5 minutes
- 2 agents: ~5-8 minutes (parallel)
- 3 agents: ~8-12 minutes (parallel)
- Sequential deployments: Add 5-10 minutes per agent

**Rule:** Always deploy in parallel when using 2+ agents (not sequentially)

---

## What Changed Today (2026-01-01)

### Before
- Agents were used ad-hoc without clear deployment criteria
- No documented decision matrix
- Unclear which agent for which content type
- No skill assignment consistency

### After (This Document)
- ✅ Clear decision matrix for when to launch agents
- ✅ Defined skill assignments per agent
- ✅ 1-3 parallel agent rule established
- ✅ Scenario examples documented
- ✅ Agent profiles clarified

### Going Forward
When you want an agent deployed, reference:
1. **Decision matrix** (top of this doc) - Quick yes/no
2. **Agent profiles** - Which agent for this content type
3. **Skills assignment** - What skills should they use
4. **Parallel rules** - How many agents, deployed together or separate

---

## Examples: Agent Choice by Content Type

| Content Type | Agent(s) | Why | Skills |
|--------------|----------|-----|--------|
| Blood pressure article | Sarah | Evidence-based, credibility needed | copy-editor, seo-validator |
| Electrolyte protocol | Marcus | Practical implementation | copy-editor, ai-text-humanization |
| Community welcome | Chloe | Warm, welcoming tone | copy-editor, carnivore-brand |
| PCOS health guide | Sarah + Marcus + Chloe | Science + protocol + encouragement | All run their skill suite |
| Budget carnivore meal plan | Marcus | Efficiency-focused | copy-editor, soft-conversion |
| Beginner FAQ | Sarah + Chloe | Answer (Sarah) + encourage (Chloe) | Both run skills in parallel |
| Athletic performance | Marcus | Protocol optimization | copy-editor, ai-text-humanization |
| Success story | Chloe | Community narrative | copy-editor, carnivore-brand |

---

## How to Use This Matrix

### In Decision Point
**"Should I launch an agent for this task?"**
1. Look at Quick Reference table (top)
2. Find your situation
3. Follow the "Launch?" and "How Many?" columns

### For Deployment
**"Which agent and what skills?"**
1. Find task type in agent profiles section
2. Copy the default skills list
3. Deploy using Task tool with those exact skills

### For Complex Content
**"I need multiple perspectives"**
1. Go to "Parallel Deployment Rules"
2. Choose 1, 2, or 3 agents based on complexity
3. Deploy all in parallel (single message, multiple tool calls)
4. Combine outputs into final piece

---

## Review Checklist

Before deploying agents, verify:
- [ ] Task requires agent expertise (not a 5-minute manual job)
- [ ] Agent matches content type (Sarah/Marcus/Chloe aligned)
- [ ] Skills assigned correctly per agent profile
- [ ] Parallel or sequential deployment decided
- [ ] Clear, specific instructions provided to agent
- [ ] No agent is duplicating another's work

---

## Future Updates

This matrix should be updated if:
- New agents are added (update profiles)
- New skills are created (update assignments)
- Parallel deployment limits change (update rules)
- New content types emerge (add to examples table)

**Last Updated:** 2026-01-01
**Next Review:** When new agents/skills added

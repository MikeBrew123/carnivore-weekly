# AGENTS.md

A repository agent entry point. It tells you where the rules are. It is not a rulebook.

## Authority

1. **Brew's explicit current decisions are the highest authority.** They outrank this
   file, `CLAUDE.md`, and any guide or skill.
2. **`CLAUDE.md` is the current interim operating-instruction source.** It is where
   repository operating instructions live today. It is not a settled canonical
   rulebook: a 2026-09-14 governance audit found stale facts in it and found policy,
   procedure and current state mixed together in one file. Treat it as the best
   available source, not as automatically correct.
3. **This file does not override repository operating instructions.** Nothing here
   grants permission that the repository's own instructions, hooks or validators do
   not already grant.

## Two rules that hold everywhere

**Report material conflicts. Do not silently pick one.** If two sources disagree on
anything that changes what gets published, sent, spent or deployed, say so in your run
report or to Brew. Do not resolve it by following whichever version you happen to be
reading.

**Never bypass a blocking control.** Not every check is one, so know which kind you are
looking at before you draw a conclusion from it.

- **Local hooks and validation gates refuse the action when they run.** The PreToolUse
  hooks, the pre-commit checks, the pre-push run of `validate_before_commit.py` and its
  gates, and the Etsy edit cap and in-process guard all stop the thing from happening.
  These are the controls you must never work around.
- **A CI check blocks only where it is configured as a required pre-merge check.**
  Being in a workflow file is not the same as gating a merge.
- **A check that runs after a change reaches `main` is an alarm, not a gate.** It can
  turn a run red and open an issue, and it cannot prevent the change that triggered it.
  Treat a green post-merge result as evidence the code is probably fine, never as
  evidence the change was gated on its way in.
- **Some publishing paths run with no validation gates at all.** The ten
  `validate_before_commit.py` gates fire from the local pre-push hook, so work pushed
  from a session on Brew's machine is covered and work pushed by automation from a
  runner is not. This gap is known and recorded for the governance cleanup. Do not
  close it by editing a workflow here.

When a document tells you to do something a blocking control refuses, **the control
blocks the action until the conflict is resolved.** Report the disagreement and stop.
Either the control or the documentation may be out of date, and which one it is needs
review, not an assumption in the moment. Do not work around the control, and do not
rewrite the document to match it, on your own judgement.

## Where the rules actually are

| Topic | Source |
|---|---|
| Operating instructions, safety rules, standing decisions | `CLAUDE.md` |
| Publishing a CW or KD blog post, end to end | the `cw-blog-publish` skill |
| Etsy listings, the edit cap and the write-first log rule | the `etsy-listing-standards` skill |
| KetoDial recipes | the `kd-recipe-pipeline` skill |
| Email: drip, newsletter, addresses, quota handling | [`docs/guides/email.md`](docs/guides/email.md) |
| Other operational procedure | `docs/guides/` |
| Error protocol and tracked defects | `docs/project-log/recurring-issues.md` |
| Why something is the way it is | `docs/project-log/decisions.md` |
| Current deployed and active state | `docs/project-log/current-status.md` |
| Unfinished work | Beads (`bd ready`, `bd list`) |

Invoke a skill rather than reconstructing its procedure from memory.

## Specialist agents

**Writer and specialist agents are invoked, never read and imitated.** Use the Agent
tool with a `subagent_type`. The harness resolves it from `.claude/agents/`, which
holds the definitions used by this repository's primary Agent-tool workflow.

That is not the same as saying it is the only place a persona exists. Other execution
paths carry their own separate definitions, and at least one automated path that
produces published copy uses an inline persona rather than invoking an agent at all.
Those definitions are not governed by the files in `.claude/agents/` and can drift
from them. This is known migration debt, tracked for the governance cleanup. Do not
assume a change made in `.claude/agents/` reaches those paths.

| Agent | `subagent_type` |
|---|---|
| Sarah, health and science writer | `sarah-health-coach` |
| Marcus, performance and protocol writer | `marcus-performance-coach` |
| Chloe, community and trends writer | `chloe-community-manager` |
| Leo, database architect | `leo-database-architect` |
| Quinn, operations manager | `quinn-operations-manager` |

The short slugs (`sarah`, `marcus`, `chloe`) are the database and `author`-field
identifiers. The `name:` frontmatter inside each agent file is what the Agent tool
resolves. They are not interchangeable.

Subagents resolve from the **session directory**. "Agent type not found" means you are
in the wrong directory: change to the repository root and retry. Never fall back to a
general-purpose agent.

Agents carry their own tool grants, and those grants are the real limit on what they
can do. An agent without database access cannot run a query no matter what a document
asks of it: prepare the work in the agent, then execute it from the main session.

`agents/` without the dot prefix holds retired 2026-06 personas. They are kept as a
historical record and because some procedures were never migrated out of them. Each
one carries a banner saying so. Do not load them as personas.

**Historical memory locations: read-only, never written to.** `agents/daily_logs/`,
`memory.log` and the `agents/memory/*.log` files are a retired mechanism. Whatever is
in them is a record of the past. **Never write new data to any of them**, and never
create `docs/project-log/daily/`.

Some personas and procedures still instruct an agent to read or update one of these.
That instruction is out of date. **Report the conflict rather than following it
silently**, and do not edit the persona yourself to resolve it.

## Database

CW and KetoDial deliberately share one project. Site-scoped tables carry a `site`
column and every query, send or export filters by it unless the task is explicitly
cross-site. The project identity, the table list and the separation rules are in
`CLAUDE.md`.

The connection itself is environment-specific and is configured outside this
repository. **If no approved database connection is available, stop and report it.**
Do not substitute a different connection.

## Adding rules

**Do not add a new rule without a confirmed decision from Brew.** An observation, a
lesson from a failure, or a good idea is not yet a rule. Report it and let him rule on
it.

Once a rule is confirmed, **put it in the source that governs the work it binds**: the
policy, guide, skill or agent definition that the people and processes doing that work
actually load. A rule written where nothing reads it is not a rule.

**The governance cleanup is in progress. If you are unsure where a confirmed rule
belongs, report the uncertainty rather than adding another copy somewhere plausible.**
Duplication across sources is the problem being fixed, and a well-meaning extra copy
sets it back.

`CLAUDE.md` is interim and should not accumulate new material by default. Do not add
policy or copy a procedure into this file.

# Beads - AI-Native Issue Tracking

## LOCAL NOTE, read this first (2026-09-08)

**`.beads/issues.jsonl` and `.beads/interactions.jsonl` are deliberately untracked
in this repository. Do not re-add them.**

`MikeBrew123/carnivore-weekly` is a **public** GitHub repo. Those files hold the
full internal issue tracker, titles and bodies included, among them open P0
safety findings written against the live paid report product. They were tracked
until 2026-09-08, and because the `pre-commit` hook ran `bd sync --flush-only`
and then `git add`ed the JSONL, every commit by every session republished the
tracker. 413 rows were public by the time it was caught.

What changed:

- both JSONL files were removed from the index with `git rm --cached`, so the
  local copies were left fully intact on disk
- they are ignored in the repository root `.gitignore`
- the `git add` step was removed from `scripts/hooks/pre-commit` and from the
  installed `.git/hooks/pre-commit`

Beads itself is unaffected. `.beads/beads.db` is the source of truth, the flush
still runs on every commit, and every `bd` command works as before. The tracker
is simply local now.

Two things to know:

- The rows already in git history are **still public**. Removing the file from
  the index stops new rows, it does not remove old ones. Purging them needs a
  rewrite of published history and is tracked separately.
- The first time a clone made before 2026-09-08 pulls this change, git will
  delete its working copy of `.beads/issues.jsonl`, because the file is being
  removed from the tree. Nothing is lost. Run `bd sync --flush-only` to
  regenerate it from `.beads/beads.db`.

The tracked files under `.beads/` are now config only: `config.yaml`,
`metadata.json`, `README.md`, `.gitignore`. A fresh clone still works.

---

Welcome to Beads! This repository uses **Beads** for issue tracking - a modern, AI-native tool designed to live directly in your codebase alongside your code.

## What is Beads?

Beads is issue tracking that lives in your repo, making it perfect for AI coding agents and developers who want their issues close to their code. No web UI required - everything works through the CLI and integrates seamlessly with git.

**Learn more:** [github.com/steveyegge/beads](https://github.com/steveyegge/beads)

## Quick Start

### Essential Commands

```bash
# Create new issues
bd create "Add user authentication"

# View all issues
bd list

# View issue details
bd show <issue-id>

# Update issue status
bd update <issue-id> --status in_progress
bd update <issue-id> --status done

# Sync with git remote
bd sync
```

### Working with Issues

Issues in Beads are:
- **Git-native**: Stored in `.beads/issues.jsonl` and synced like code
- **AI-friendly**: CLI-first design works perfectly with AI coding agents
- **Branch-aware**: Issues can follow your branch workflow
- **Always in sync**: Auto-syncs with your commits

## Why Beads?

✨ **AI-Native Design**
- Built specifically for AI-assisted development workflows
- CLI-first interface works seamlessly with AI coding agents
- No context switching to web UIs

🚀 **Developer Focused**
- Issues live in your repo, right next to your code
- Works offline, syncs when you push
- Fast, lightweight, and stays out of your way

🔧 **Git Integration**
- Automatic sync with git commits
- Branch-aware issue tracking
- Intelligent JSONL merge resolution

## Get Started with Beads

Try Beads in your own projects:

```bash
# Install Beads
curl -sSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash

# Initialize in your repo
bd init

# Create your first issue
bd create "Try out Beads"
```

## Learn More

- **Documentation**: [github.com/steveyegge/beads/docs](https://github.com/steveyegge/beads/tree/main/docs)
- **Quick Start Guide**: Run `bd quickstart`
- **Examples**: [github.com/steveyegge/beads/examples](https://github.com/steveyegge/beads/tree/main/examples)

---

*Beads: Issue tracking that moves at the speed of thought* ⚡

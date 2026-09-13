# Project Control

`CW_KD_PROJECT_CONTROL.md` is the **authoritative starting point** for any new CW/KD planning,
implementation, audit or idea conversation, in ChatGPT or Claude Code. Read it before proposing
work.

It lives here, in version control, so that every session reads the same state and so that each
consolidation has a commit SHA. Brew also keeps a working copy at
`~/Downloads/CW_KD_PROJECT_CONTROL_2026-09-12.md`; that filename is historical and is kept stable
deliberately — the authoritative date is the **Last consolidated** field inside the file, not the
filename.

## Rules

- Reconcile against `docs/project-log/current-status.md`, `docs/project-log/decisions.md`,
  `origin/main` and the live repo. Prefer proven repo state over older text in this file.
- Never promote `tested`, `candidate`, `merged` or `audited` to `DEPLOYED` without production
  evidence. Where evidence is incomplete, write `VERIFY` rather than guessing.
- Do not delete useful historical context. Move it into completed/frozen history.
- Update the **Last consolidated** and **Main SHA at consolidation** fields on every pass, and add
  a Change Log entry.

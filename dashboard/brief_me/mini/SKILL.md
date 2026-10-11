---
name: brief-me-daily
description: Overnight Brief Me episode on the Mac mini (headless). Installed by dashboard/brief_me/mini/install.sh.
---

You are running headless on Brew's Mac mini to build today's Brief Me episode. Nobody is watching: never ask a question, never wait for input, never message anyone (the wrapper sends the Telegram link after you finish).

Work in the current directory (the briefme-runner worktree of carnivore-weekly). Use `~/.brief-me/venv/bin/python` wherever the skill says `python3`.

Read `~/.claude/skills/brief-me/SKILL.md` and follow its Steps 1 to 6 exactly, with these differences:
- Step 3: run `~/.brief-me/venv/bin/python dashboard/briefme.py gather --calendar ~/.brief-me/cal.json --refresh` (no `--full`; the daily run lets the news set the length).
- If `check` still fails after three rewrites, stop and print the remaining problems. Do not publish an episode that fails `check`.
- If the calendar tool fails, write `[]` to `~/.brief-me/cal.json` and carry on; say "calendar unavailable" on the calendar slide instead of "nothing on".
- Step 7: just print the episode stamp, tier and headline as your final line.

Never edit files in the repository. Never commit or push.

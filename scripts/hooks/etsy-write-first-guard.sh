#!/bin/bash
# PreToolUse (Bash) guard for Etsy writes. Fail closed.
# Any Bash command that runs a script under etsy/ (or curls openapi.etsy.com) is a
# potential write unless the script is on the read-only allowlist. Writes require:
#   1. Live-Changes-Log.md modified in the last 30 min (row written BEFORE the call)
#   2. node etsy/edit-cap.mjs <ids> exits 0 (rolling 7-day cap of 3 distinct listings);
#      with no ids in the command, the window must have headroom (< 3 listings).
# Exit 2 blocks; stderr is shown to Claude. Read-only scripts and non-Etsy commands pass.
set -u
LOG="/Users/mbrew/Documents/Brew-Vault/00-Core/Live-Changes-Log.md"
ROOT="${CLAUDE_PROJECT_DIR:-/Users/mbrew/Developer/carnivore-weekly}"
CMD=$(jq -r '.tool_input.command // ""' 2>/dev/null)
[ -z "$CMD" ] && exit 0
# Does the command touch Etsy at all?
if ! echo "$CMD" | grep -qiE '(^|[^a-z])etsy/[A-Za-z0-9._-]+\.mjs|cd +[^;&|]*etsy[^;&|]*[;&|]+.*\.mjs|openapi\.etsy\.com'; then exit 0; fi
# Read-only allowlist (basenames). Anything else under etsy/ is treated as a write.
RO='^(edit-cap|edit-cap\.test|dump-listing|fetch-listings|sales-summary|etsy-snapshot|audit-[a-z-]+|verify-[a-z-]+|taxonomy-[a-z-]+|chart-swap-preflight|count-files|convert-food-lists|build-carnivore-red-chart|poll-replicate|screenshot-landscape|etsy-oauth|token)\.mjs$'
SCRIPTS=$(echo "$CMD" | grep -oE '[A-Za-z0-9._-]+\.mjs' | sort -u)
WRITE=0
if echo "$CMD" | grep -qiE 'openapi\.etsy\.com' && echo "$CMD" | grep -qiE 'PATCH|POST|PUT|DELETE'; then WRITE=1; fi
for s in $SCRIPTS; do echo "$s" | grep -qE "$RO" || WRITE=1; done
[ "$WRITE" = 0 ] && exit 0
# 1. write-first
if [ ! -f "$LOG" ]; then echo "BLOCKED: Live Changes Log missing at $LOG. Fail closed; no Etsy write." >&2; exit 2; fi
AGE=$(( $(date +%s) - $(stat -f %m "$LOG") ))
if [ "$AGE" -gt 1800 ]; then
  echo "BLOCKED: Etsy write attempted but the Live Changes Log was last modified ${AGE}s ago. Write the row FIRST (date, listing id, what/why), then retry. Scripts: $SCRIPTS" >&2; exit 2
fi
# 2. cap
IDS=$(echo "$CMD" | grep -oE '\b[0-9]{6,}\b' | sort -u | tr '\n' ' ')
if [ -n "$IDS" ]; then
  OUT=$(cd "$ROOT" && node etsy/edit-cap.mjs $IDS 2>&1); RC=$?
  if [ $RC -ne 0 ]; then echo "BLOCKED by Etsy edit cap: $OUT" >&2; exit 2; fi
else
  OUT=$(cd "$ROOT" && node etsy/edit-cap.mjs 2>&1) || { echo "BLOCKED: edit-cap.mjs failed (fail closed): $OUT" >&2; exit 2; }
  N=$(echo "$OUT" | sed -nE 's/^Listings edited in window: ([0-9]+).*/\1/p'); N=${N:-0}
  if [ "$N" -ge 3 ]; then echo "BLOCKED: $N distinct listings already edited in the 7-day window and no listing id found in the command. Brew's word or wait for the window." >&2; exit 2; fi
fi
exit 0

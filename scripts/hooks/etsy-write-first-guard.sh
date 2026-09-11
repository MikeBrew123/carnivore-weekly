#!/bin/bash
# PreToolUse (Bash) guard for Etsy writes. Fail closed.
# Any Bash command that runs a script under etsy/ (or sends a write to openapi.etsy.com) is a
# potential write unless the script is on the read-only allowlist. Writes require:
#   1. Live-Changes-Log.md modified in the last 30 min (row written BEFORE the call)
#   2. node etsy/edit-cap.mjs <ids> exits 0 (rolling 7-day cap of 3 distinct listings);
#      with no ids in the command, the window must have headroom (< 3 listings).
# Exit 2 blocks; stderr is shown to Claude. Read-only scripts and non-Etsy commands pass.
# Test: bash tests/test_etsy_write_guard_hook.sh  (--classify prints read|write, no enforcement)
set -u
LOG="/Users/mbrew/Documents/Brew-Vault/00-Core/Live-Changes-Log.md"
ROOT="${CLAUDE_PROJECT_DIR:-/Users/mbrew/Developer/carnivore-weekly}"
CLASSIFY=0; [ "${1:-}" = "--classify" ] && CLASSIFY=1
CMD=$(jq -r '.tool_input.command // ""' 2>/dev/null)
[ -z "$CMD" ] && { [ "$CLASSIFY" = 1 ] && echo read; exit 0; }
# Does the command touch Etsy at all?
if ! echo "$CMD" | grep -qiE '(^|[^a-z])etsy/[A-Za-z0-9._-]+\.mjs|cd +[^;&|]*etsy[^;&|]*[;&|]+.*\.mjs|openapi\.etsy\.com'; then
  [ "$CLASSIFY" = 1 ] && echo read; exit 0
fi
# Read-only allowlist (basenames). Anything else under etsy/ is treated as a write.
RO='^(edit-cap|edit-cap\.test|dump-listing|fetch-listings|sales-summary|etsy-snapshot|recent-reviews|audit-[a-z-]+|verify-[a-z-]+|taxonomy-[a-z-]+|chart-swap-preflight|count-files|convert-food-lists|build-carnivore-red-chart|poll-replicate|screenshot-landscape|etsy-oauth|token)\.mjs$'
SCRIPTS=$(echo "$CMD" | grep -oE '[A-Za-z0-9._-]+\.mjs' | sort -u)
WRITE=0

# HTTP write to openapi.etsy.com? Methods are matched only in a method context, never as a bare
# substring: the old `grep -i 'PATCH|POST|PUT|DELETE'` blocked read-only `node --input-type=module`
# because "input" contains "put" (2026-09-11). Exit 0 = write, 1 = read-only, anything else
# (perl missing or crashed) = write, so detection itself fails closed.
read -r -d '' HTTP_WRITE_PL <<'PL'
local $/; $_ = <STDIN>;
exit 1 unless /openapi\.etsy\.com/i;
my $safe = qr/(?:GET|HEAD|OPTIONS)(?![\w-])/i;
# 1. Uppercase method as a standalone word, case-sensitive: -X PUT, method:'PATCH', http DELETE url
exit 0 if /(?<![\w-])(?:PATCH|POST|PUT|DELETE)(?![\w-])/;
# 2. curl/wget method flags with any value that is not GET/HEAD: -X put, -sXPATCH, --request "$M"
exit 0 if /(?:^|\s)(?:-[A-Za-z]*X|--request|--method)(?:\s*+=\s*+|\s++)?+(?![\x27"]?+$safe)[^\s=]/m;
# 3. A method key whose value is not a literal GET/HEAD, including lowercase and variables
exit 0 if /\bmethod[\x27"]?+\s*+(?::|=(?!=))\s*+(?![\x27"`]?+$safe)\S/;
# 4. requests.request("DELETE", ...) / requests.request(m, ...)
exit 0 if /\brequests?\.request\(\s*+(?![\x27"]?+$safe)/;
# 5. Client helpers: requests.post(, axios.put(, session.delete(
exit 0 if /\.(?:post|put|patch|delete|del)\s*\(/;
# 6. Body or upload flags imply a write: curl -d/-sSd/-F/-T/--data*/--json/--form, wget --post-*
exit 0 if /(?:^|\s)(?:-[A-Za-z]*[dFT]|--data(?:-[a-z]+)?|--json|--form(?:-string)?|--upload-file|--(?:post|body)-(?:data|file))(?=[\s=@\x27"]|$)/m;
# 7. urllib Request(url, data=...) sends a POST
exit 0 if /\bRequest\([^)]*\bdata\s*=/;
exit 1;
PL
printf '%s' "$CMD" | perl -e "$HTTP_WRITE_PL"; RC=$?
[ "$RC" -ne 1 ] && WRITE=1
for s in $SCRIPTS; do echo "$s" | grep -qE "$RO" || WRITE=1; done
if [ "$CLASSIFY" = 1 ]; then [ "$WRITE" = 1 ] && echo write || echo read; exit 0; fi
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

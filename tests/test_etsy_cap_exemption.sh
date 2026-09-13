#!/bin/bash
# Tests for the cap/exemption decision in scripts/hooks/etsy-write-first-guard.sh.
# Run: bash tests/test_etsy_cap_exemption.sh   (exit 0 = all pass)
#
# Uses the hook's --cap-check mode, which prints allow|block for the CAP branch only and never
# enforces, in the same spirit as the existing --classify mode. That keeps these tests off the real
# Live Changes Log: the write-first rule is deliberately NOT lifted by an exemption and is covered
# by the existing suite, so nothing here needs to age or touch the vault file.
#
# The cap decision is driven entirely by what edit-cap.mjs prints, so each case points
# CLAUDE_PROJECT_DIR at a temp root holding a stub etsy/edit-cap.mjs. The hook must never
# reimplement the exemption regex; it must honour what edit-cap itself recognises.
set -u
HOOK="${HOOK:-$(cd "$(dirname "$0")/.." && pwd)/scripts/hooks/etsy-write-first-guard.sh}"
PASS=0; FAIL=0
TODAY=$(date +%F)
OTHER=$(date -v-9d +%F 2>/dev/null || date -d '9 days ago' +%F)

mkroot() { # mkroot <exit-code> <stdout>  -> prints a temp root holding a stub edit-cap.mjs
  # The stdout is written to a sibling file and the stub replays it verbatim. Embedding it in a JS
  # string literal instead looked simpler and was wrong: a multi-line value became a syntax error,
  # node exited non-zero, and the block-expecting cases passed for that reason rather than the one
  # under test. Replaying a file keeps the stub's exit code the only thing the test controls.
  local rc="$1"; shift
  local d; d=$(mktemp -d)
  mkdir -p "$d/etsy"
  printf '%s\n' "$1" > "$d/etsy/out.txt"
  cat > "$d/etsy/edit-cap.mjs" <<STUB
import { readFileSync } from 'fs';
process.stdout.write(readFileSync(new URL('./out.txt', import.meta.url), 'utf8'));
process.exit($rc);
STUB
  echo "$d"
}

check() { # check <expected allow|block> <name> <root> <command>
  local got
  got=$(jq -n --arg c "$4" '{tool_input:{command:$c}}' \
        | CLAUDE_PROJECT_DIR="$3" bash "$HOOK" --cap-check 2>/dev/null)
  if [ "$got" = "$1" ]; then PASS=$((PASS+1)); echo "  ok   $2"
  else FAIL=$((FAIL+1)); echo "  FAIL $2: expected $1, got '$got'"; fi
}

WRITE_CMD="node etsy/update-listings.mjs 4532542805"
WRITE_NOID="node etsy/build-keto-bundle.mjs"

echo "cap/exemption decision:"

# 1. No exemption and the cap is full -> BLOCKED.
R=$(mkroot 1 "Listings edited in window: 3
ETSY EDIT CAP: this would make 4 listings in the 7 day window and the cap is 3.")
check block "1. no exemption + cap full (with id)"    "$R" "$WRITE_CMD"
R=$(mkroot 0 "Listings edited in window: 3")
check block "1b. no exemption + cap full (no id)"     "$R" "$WRITE_NOID"

# 2. Malformed exemption -> BLOCKED. edit-cap's own regex requires a hex deck id, so a malformed
#    row never produces an EXEMPT line; and a line that merely looks like one must not be enough.
R=$(mkroot 1 "Listings edited in window: 3
  EXEMPT not-a-date deck zzz: \"malformed\" not counted")
check block "2. malformed exemption"                  "$R" "$WRITE_CMD"
R=$(mkroot 1 "Listings edited in window: 3
  the word EXEMPT appears in prose but there is no exemption line")
check block "2b. EXEMPT as a bare substring"          "$R" "$WRITE_CMD"

# 3. Valid same-day exemption that edit-cap recognises -> ALLOWED, even though the cap is full
#    and edit-cap still exits non-zero for the 4th listing.
R=$(mkroot 1 "Listings edited in window: 3
  EXEMPT $TODAY deck b6cc64cf: \"Etsy listings ... digital files only [cap-exempt b6cc64cf]\" not counted
ETSY EDIT CAP: this would make 4 listings in the 7 day window and the cap is 3.")
check allow "3. valid same-day exemption (with id)"   "$R" "$WRITE_CMD"
R=$(mkroot 0 "Listings edited in window: 3
  EXEMPT $TODAY deck b6cc64cf: \"...\" not counted")
check allow "3b. valid same-day exemption (no id)"    "$R" "$WRITE_NOID"

# 4. Exemption dated another day -> BLOCKED. Exemptions are same-day only.
R=$(mkroot 1 "Listings edited in window: 3
  EXEMPT $OTHER deck b6cc64cf: \"stale\" not counted")
check block "4. exemption from another day"           "$R" "$WRITE_CMD"

# 5. Normal write with headroom and no exemption -> ALLOWED, unchanged behaviour.
R=$(mkroot 0 "Listings edited in window: 1
  4495049647  ($TODAY)")
check allow "5. under cap, no exemption (with id)"    "$R" "$WRITE_CMD"
R=$(mkroot 0 "Listings edited in window: 2")
check allow "5b. under cap, no exemption (no id)"     "$R" "$WRITE_NOID"

# 6. Fail closed if edit-cap cannot run at all.
R=$(mktemp -d)   # no etsy/edit-cap.mjs at all
check block "6. edit-cap missing -> fail closed"      "$R" "$WRITE_CMD"

echo
echo "passed $PASS, failed $FAIL"
[ "$FAIL" = 0 ]

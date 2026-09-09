#!/usr/bin/env bash
# tests/mutate-blockquote.sh
#
# MUTATION TEST FOR tests/report-blockquote-render.test.mjs
#
# Per CLAUDE.md: "Test rendered output, and mutation-test the test. A passing
# suite is not evidence until you have broken each protection, watched the suite
# go red on a named assertion, and restored it."
#
# Each script in tests/mutations-blockquote/ reintroduces one specific way the
# renderer was, or could plausibly become, wrong. For every mutation we require:
#   1. the suite exits non-zero, and
#   2. at least one NAMED assertion is reported as FAIL.
#
# A crash alone is NOT accepted as detection. A mutation that makes the suite
# explode before it asserts anything proves nothing about the assertions, so any
# run producing zero "FAIL  [" lines is reported NOT DETECTED even when the exit
# code is non-zero. That rule earned its keep on 2026-09-09: the "keep the >
# prefixes" mutation originally caused unbounded recursion and a RangeError,
# which this harness refused to count, and the renderer gained a depth guard as
# a result.
#
# Run:  bash tests/mutate-blockquote.sh

set -uo pipefail
cd "$(dirname "$0")/.."

export API=api/calculator-api.js
export MED=api/medical-context.js
TEST=tests/report-blockquote-render.test.mjs
MUTATIONS=tests/mutations-blockquote

TMP=$(mktemp -d)
cp "$API" "$TMP/api.js"
cp "$MED" "$TMP/med.js"

restore() {
  cp "$TMP/api.js" "$API"
  cp "$TMP/med.js" "$MED"
}
trap 'restore; rm -rf "$TMP"' EXIT

detected=0
missed=0

echo "Mutation testing $TEST"
echo

for script in "$MUTATIONS"/*.py; do
  name=$(basename "$script" .py)
  restore

  if ! python3 "$script" 2>/dev/null; then
    echo "  ERROR         [$name] mutation could not be applied, anchor has moved"
    missed=$((missed + 1))
    continue
  fi

  out=$(node "$TEST" 2>&1)
  rc=$?
  named=$(printf '%s\n' "$out" | grep -c 'FAIL  \[' || true)

  if [ "$rc" -ne 0 ] && [ "$named" -gt 0 ]; then
    echo "  DETECTED      [$name] $named named assertion(s) failed"
    printf '%s\n' "$out" | grep 'FAIL  \[' | head -2 | sed 's/^/                /'
    detected=$((detected + 1))
  elif [ "$rc" -ne 0 ]; then
    echo "  NOT DETECTED  [$name] exited $rc with no named assertion failure (crash, not detection)"
    printf '%s\n' "$out" | tail -3 | sed 's/^/                /'
    missed=$((missed + 1))
  else
    echo "  NOT DETECTED  [$name] the suite still passed with the mutation applied"
    missed=$((missed + 1))
  fi
done

restore

# The suite must pass again once every mutation is reverted, otherwise the
# restore is incomplete and the "detections" above are not trustworthy.
echo
if node "$TEST" >/dev/null 2>&1; then
  echo "  RESTORED      suite green again after all mutations reverted"
else
  echo "  ERROR         suite is NOT green after restore, results above are unreliable"
  missed=$((missed + 1))
fi

echo
echo "$detected detected, $missed not detected"
[ "$missed" -eq 0 ] || exit 1

#!/bin/bash
# Tests for scripts/hooks/etsy-write-first-guard.sh write detection.
# Run: bash tests/test_etsy_write_guard_hook.sh   (exit 0 = all pass)
# Uses the hook's --classify mode (prints read|write, never enforces) so results do not depend on
# the Live Changes Log age or the edit cap. Read-only cases also run end to end and must exit 0.
# The command strings live in this file because a Bash command containing them would itself be
# screened by the live hook.
HOOK="${HOOK:-$(cd "$(dirname "$0")/.." && pwd)/scripts/hooks/etsy-write-first-guard.sh}"
PASS=0; FAIL=0
payload() { jq -n --arg c "$1" '{tool_input:{command:$c}}'; }
expect() { # expect <read|write> <name> <command>
  local got; got=$(payload "$3" | bash "$HOOK" --classify)
  if [ "$got" = "$1" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); echo "FAIL [$2]: expected $1, got '$got'"; fi
  if [ "$1" = read ]; then
    payload "$3" | bash "$HOOK" 2>/dev/null; local rc=$?
    if [ "$rc" = 0 ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); echo "FAIL [$2 e2e]: read-only command exited $rc"; fi
  fi
}
E=https://openapi.etsy.com/v3/application

# --- read-only: must pass ---
expect read  input-type-reviews   "node --input-type=module -e \"import {getEtsyToken, etsyHeaders} from './etsy/token.mjs'; const t = await getEtsyToken(); const r = await fetch('$E/shops/63916912/reviews?limit=25', { headers: etsyHeaders(t) }); const data = await r.json(); console.log(data.results.length)\""
expect read  input-type-heredoc   "cd /Users/mbrew/Developer/carnivore-weekly && node --input-type=module <<'EOF'
import { getEtsyToken, etsyHeaders } from './etsy/token.mjs';
const res = await fetch('$E/shops/63916912/reviews?limit=25', { headers: etsyHeaders(await getEtsyToken()) });
console.log(await res.json());
EOF"
expect read  curl-plain-get       "curl -sS -H 'x-api-key: k' -o reviews.json '$E/shops/63916912/reviews'"
expect read  curl-explicit-get    "curl -X GET '$E/shops/63916912/reviews'"
expect read  fetch-method-get     "node -e \"fetch('$E/listings/1234567', {method: 'GET'})\""
expect read  method-comparison    "node -e \"const r = new Request('$E/x'); if (r.method === 'GET') console.log(1)\""
expect read  recent-reviews-script "node etsy/recent-reviews.mjs --hours 25"
expect read  audit-reviews-script "node etsy/audit-reviews.mjs"
expect read  non-etsy-put         "curl -X PUT https://api.resend.com/emails/abc"

# --- writes: must be flagged ---
expect write curl-X-PATCH         "curl -X PATCH $E/shops/63916912/listings/1234567890"
expect write curl-XPUT-joined     "curl -sXPUT $E/shops/63916912/listings/1234567890"
expect write curl-request-eq      "curl --request=POST $E/shops/63916912/listings"
expect write curl-request-space   "curl --request DELETE $E/listings/1234567890"
expect write curl-X-lowercase     "curl -X patch $E/listings/1234567890"
expect write curl-X-variable      "curl -X \"\$M\" $E/listings/1234567890"
expect write node-method-DELETE   "node --input-type=module -e \"await fetch('$E/listings/1234567', { method: 'DELETE', headers })\""
expect write node-method-lower    "node -e \"fetch('$E/listings/1234567', {method:\\\"patch\\\"})\""
expect write node-method-variable "node -e \"const m = process.argv[1]; fetch('$E/listings/1234567', {method: m})\""
expect write json-method-key      "node -e 'fetch(\"$E/listings/1\", {\"method\":\"PUT\"})'"
expect write curl-data            "curl -d '{\"title\":\"x\"}' $E/listings/1234567"
expect write curl-cluster-data    "curl -sSd @body.json $E/listings/1234567"
expect write curl-form-upload     "curl -F image=@a.png $E/shops/1/listings/1234567/images"
expect write curl-json            "curl --json '{}' $E/listings/1234567"
expect write curl-header-override "curl -H 'X-HTTP-Method-Override: PUT' $E/listings/1234567"
expect write py-requests-patch    "python3 -c \"import requests; requests.patch('$E/listings/1', json={})\""
expect write py-requests-request  "python3 -c \"import requests; requests.request('delete', '$E/listings/1')\""
expect write py-urllib-data       "python3 -c \"import urllib.request as u; u.urlopen(u.Request('$E/listings/1', data=b'x'))\""
expect write httpie-put           "http PUT $E/listings/1 title=y"
expect write wget-method          "wget --method=PUT $E/listings/1"
expect write non-allowlisted      "node etsy/update-listings.mjs 1234567890"

echo "etsy-write-first-guard: $PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]

#!/bin/bash
# History-wide PII audit. Run it against a FRESH MIRROR CLONE OF THE REMOTE,
# never against a local working copy: the remote is the thing that is public,
# and a local repo carries branches that were never pushed.
#
#   git clone --mirror <remote> /tmp/audit.git
#   ./scripts/audit-pii-history.sh /tmp/audit.git
#
# Exits 1 if it finds anything. Written 2026-09-03 after a purge was reported
# complete on the strength of a fixed-string check that could not see what it
# was not already looking for.
#
# WHY DOMAIN-AGNOSTIC: this scans for ANY address and subtracts an allowlist,
# rather than searching for a known list of addresses. The earlier check did the
# latter and was blind twice over: it could not catch a variant nobody had
# inventoried, and it could not catch a mangled remnant (a JSON \n escape had
# made the scanner read 'nvicndaz1@' where the address was 'vicndaz1@').
#
# WHAT IT CANNOT REACH: GitHub's refs/pull/* refs are server-side and cannot be
# rewritten or deleted by any client push. A mirror clone fetches them, so this
# script SEES them and will report addresses that live there. That is deliberate:
# you need to know, even though only GitHub Support can remove them.
# addresses outside the allowlist. Domain-agnostic: it does not need to know
# which addresses to look for, so it catches variants, mangled remnants and
# anything nobody inventoried.
REPO="${1:-.}"
ALLOW='@(carnivoreweekly\.com|ketodial\.com|test\.ketodial\.com|example\.com|example\.invalid|example\.co\.uk|test\.example\.com|email\.com|company\.com|domain\.com|domain\.something|test\.com|test\.ca|noway\.com|bot\.com|carnivore-demo\.com|carnivore\.com|e\.com|iambrew\.com|anthropic\.com|github\.com|users\.noreply\.github\.com|resend\.com|mail\.beehiiv\.com|sentry\.io|[A-Za-z0-9.-]*supabase\.(co|com)|[A-Za-z0-9.-]*\.iam\.gserviceaccount\.com)$|^(iambrew(\+[A-Za-z0-9._-]+)?|neq\.iambrew|email\.neq\.iambrew|googledrive-iambrew|assistantbrew)@gmail\.com$|^mbrew@telus\.net$|^(you|your|name|user|test|testuser(\+[A-Za-z0-9._-]+)?|someone|somebody|example|x|a|b|foo|bar)@'
# Third-party business contacts deliberately left in place (documented decision).
LEFT='@(homesteadhow\.com|khalidjamil\.com|paulsaladinomd\.co|crowdcow\.com)$|^(realzerocarb|steakandbuttergal|ncarnivore\.quest|mamamitich|luccharb|mattwalkerbda|terrileist|thatspellsmisti)@gmail\.com$'
EMAIL='[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}'

{
  git -C "$REPO" cat-file --batch-all-objects --batch-check='%(objectname) %(objecttype) %(objectsize)' \
    | awk '$2=="blob" && $3<3000000 {print $1}' \
    | git -C "$REPO" cat-file --batch --buffer
  git -C "$REPO" log --all --format='%B%n%an <%ae>%n%cn <%ce>'
  git -C "$REPO" for-each-ref --format='%(contents)' refs/tags
} 2>/dev/null \
  | LC_ALL=C grep -a -o -E "$EMAIL" \
  | tr 'A-Z' 'a-z' | sort -u \
  | grep -E -v "$ALLOW" | grep -E -v "$LEFT" > /tmp/pii-audit-hits.$$

n=$(wc -l < /tmp/pii-audit-hits.$$ | tr -d ' ')
echo "REPO: $REPO"
echo "NON-ALLOWLISTED ADDRESSES FOUND: $n"
sed -E 's/^(.)[^@]*(.)@/  \1***\2@/' /tmp/pii-audit-hits.$$
cp /tmp/pii-audit-hits.$$ "${2:-/dev/null}" 2>/dev/null
rm -f /tmp/pii-audit-hits.$$
[ "$n" -eq 0 ]

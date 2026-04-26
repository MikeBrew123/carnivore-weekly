#!/bin/bash
# Secret scanner for staged git changes.
# Blocks any commit containing common API key / token patterns.
#
# Used by .git/hooks/pre-commit. Can also be run manually:
#   ./scripts/check-secrets.sh
#
# Bypass (NOT RECOMMENDED — only if certain it's a false positive):
#   git commit --no-verify

set -u

# Patterns ordered by likelihood of appearing in this repo.
PATTERNS=(
  'sb_secret_[A-Za-z0-9_-]{20,}'                      # Supabase secret/service-role (new format)
  'sk_live_[A-Za-z0-9]{24,}'                          # Stripe live secret
  'sk_test_[A-Za-z0-9]{24,}'                          # Stripe test secret
  'rk_live_[A-Za-z0-9]{24,}'                          # Stripe restricted live key
  'whsec_[A-Za-z0-9]{32,}'                            # Stripe webhook secret
  'ghp_[A-Za-z0-9]{30,}'                              # GitHub personal access token
  'gho_[A-Za-z0-9]{30,}'                              # GitHub OAuth token
  'github_pat_[A-Za-z0-9_]{50,}'                      # GitHub fine-grained PAT
  'AIza[0-9A-Za-z_-]{35}'                             # Google API key
  're_[A-Za-z0-9]{8}_[A-Za-z0-9_-]{16,}'              # Resend API key
  'AKIA[0-9A-Z]{16}'                                  # AWS access key id
  'r8_[A-Za-z0-9]{30,}'                               # Replicate API token
  'sbp_[a-f0-9]{40}'                                  # Supabase CLI access token
  'eyJ[A-Za-z0-9_=-]{20,}\.eyJ[A-Za-z0-9_=-]{20,}\.[A-Za-z0-9_=+/-]+'  # JWT (legacy Supabase keys, etc.)
  'xox[baprs]-[A-Za-z0-9-]{10,}'                      # Slack tokens
)

# Skip ONLY the scanner itself (its regex strings look secret-like but are patterns).
# Everything else — including gitignored paths if force-added — gets scanned. That's the point.
IGNORE_PATHS_REGEX='^(scripts/check-secrets\.sh|scripts/pre-commit-hook\.sh)$'

# Pull staged additions only.
files=$(git diff --cached --name-only --diff-filter=AM 2>/dev/null || true)
[ -z "$files" ] && exit 0

matched=0
report=""

while IFS= read -r f; do
  [ -z "$f" ] && continue
  echo "$f" | grep -E -q "$IGNORE_PATHS_REGEX" && continue

  # Read the staged blob content.
  content=$(git show ":$f" 2>/dev/null || true)
  [ -z "$content" ] && continue

  for pat in "${PATTERNS[@]}"; do
    hit=$(printf '%s' "$content" | grep -E -o "$pat" 2>/dev/null | head -1 || true)
    if [ -n "$hit" ]; then
      matched=1
      redacted=$(printf '%s' "$hit" | sed -E 's/(.{12}).*/\1.../')
      report+=$'\n'"  file:    $f"
      report+=$'\n'"  pattern: $pat"
      report+=$'\n'"  match:   $redacted"$'\n'
    fi
  done
done <<< "$files"

if [ "$matched" -eq 1 ]; then
  echo ""
  echo "🚫 COMMIT BLOCKED — secret pattern detected in staged changes:"
  echo "$report"
  echo "Fix options (in order of preference):"
  echo "  1. Add the file/folder to .gitignore so it stops getting staged"
  echo "  2. Replace the secret with an env-var reference (e.g. {{\$env.MY_KEY}})"
  echo "  3. Move the value into secrets/api-keys.json (already gitignored)"
  echo ""
  echo "If you're CERTAIN this is a false positive: git commit --no-verify"
  echo ""
  exit 1
fi

exit 0

#!/bin/bash
# Subscriber-PII scanner for staged git changes.
#
# This repo is PUBLIC. A real reader's email address ended up in it on
# 2026-09-01 and stayed there, in four tracked files at HEAD and in history,
# until the 2026-09-03 purge. This script exists so it does not happen again.
#
# It blocks any commit that stages an email address outside the allowlisted
# internal, test, and service domains below.
#
# Used by .git/hooks/pre-commit. Can also be run manually:
#   ./scripts/check-pii.sh
#
# Bypass (only when you are certain the address is not a real person's):
#   git commit --no-verify
#
# If you hit this on a generated report, do not bypass it. Add the output path
# to .gitignore instead: report data belongs in the private backup, the report
# SCRIPT is what belongs in this repo.

set -u

# TLD must be alphabetic: this skips package specifiers (chart.js@4.4.0, std@0.168.0)
# and ssh host strings (mbrew@100.117.74.5), which are not addresses.
EMAIL_RE='[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}'

# Addresses that are allowed to appear. Anything here is ours, a fixture, or a
# machine account. Keep this list tight: every entry is a hole in the guard.
ALLOW_RE='@(carnivoreweekly\.com|carnivore-weekly\.com|ketodial\.com|test\.ketodial\.com|example\.com|example\.invalid|example\.co\.uk|test\.example\.com|email\.com|company\.com|domain\.com|test\.com|test\.ca|noway\.com|bot\.com|carnivore-demo\.com|e\.com|iambrew\.com|anthropic\.com|github\.com|users\.noreply\.github\.com|resend\.com|mail\.beehiiv\.com|sentry\.io|[A-Za-z0-9.-]*supabase\.(co|com)|[A-Za-z0-9.-]*\.iam\.gserviceaccount\.com)$|^(iambrew(\+[A-Za-z0-9._-]+)?|neq\.iambrew|email\.neq\.iambrew|googledrive-iambrew|assistantbrew)@gmail\.com$|^mbrew@telus\.net$|^(you|your|name|user|test|testuser(\+[A-Za-z0-9._-]+)?|someone|somebody|example|x|a|b|foo|bar)@'

# The scanner itself carries example addresses in its own allowlist.
IGNORE_PATHS_REGEX='^(scripts/check-pii\.sh|docs/project-log/decisions\.md)$'

files=$(git diff --cached --name-only --diff-filter=AM 2>/dev/null || true)
[ -z "$files" ] && exit 0

matched=0
report=""

while IFS= read -r f; do
  [ -z "$f" ] && continue
  echo "$f" | grep -E -q "$IGNORE_PATHS_REGEX" && continue

  # Binary and vendored bundles produce nothing but false positives.
  case "$f" in
    *.png|*.jpg|*.jpeg|*.gif|*.webp|*.pdf|*.zip|*.gz|*.ico|*.woff|*.woff2|*.mp4) continue ;;
    *.min.js|*.min.css|*.map|*/node_modules/*|public/assets/calculator2/*) continue ;;
  esac

  content=$(git show ":$f" 2>/dev/null || true)
  [ -z "$content" ] && continue

  hits=$(printf '%s' "$content" | grep -E -o "$EMAIL_RE" 2>/dev/null \
         | tr 'A-Z' 'a-z' | sort -u | grep -E -v "$ALLOW_RE" || true)

  if [ -n "$hits" ]; then
    matched=1
    while IFS= read -r h; do
      [ -z "$h" ] && continue
      # Show enough to identify it, not enough to republish it.
      redacted=$(printf '%s' "$h" | sed -E 's/^(.)[^@]*(.)@/\1***\2@/')
      report+=$'\n'"  file:    $f"
      report+=$'\n'"  address: $redacted"$'\n'
    done <<< "$hits"
  fi
done <<< "$files"

if [ "$matched" -eq 1 ]; then
  echo ""
  echo "🚫 COMMIT BLOCKED — email address outside the allowlist in staged changes."
  echo "   This repo is PUBLIC. Assume anything staged here is permanent."
  echo "$report"
  echo "Fix options (in order of preference):"
  echo "  1. Generated report or export? Add its output path to .gitignore."
  echo "     Commit the SCRIPT, never the DATA."
  echo "  2. Writing a bug note or an ops log? Describe the subscriber without"
  echo "     the address (a Supabase id, or 'a cw day-6 subscriber')."
  echo "  3. Genuinely one of ours or a fixture? Add it to ALLOW_RE in"
  echo "     scripts/check-pii.sh, in the same commit, so the next person sees why."
  echo ""
  echo "If you are CERTAIN this is not a real person: git commit --no-verify"
  echo ""
  exit 1
fi

exit 0

#!/bin/bash
# herm-push.sh — Auto-commit and push CW code changes + sync Brew-Vault
# Run this after making code fixes for Hermes instead of manual git add/commit/push
#
# Usage: ./scripts/herm-push.sh "short description of what changed"

set -e

CW_ROOT="/Users/mbrew/Developer/carnivore-weekly"
VAULT_ROOT="/Users/mbrew/Documents/Brew-Vault"
WORKSPACE="04-Systems/Projects/Carnivore-Weekly-Claude-Hermes-Workspace.md"

MSG="${1:-hermes: fix from audit}"

echo "── Carnivore Weekly repo ──"

cd "$CW_ROOT"

# Check if there are changes to commit
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo "✅ No CW code changes to commit"
else
    git add -A
    git commit -m "$MSG

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
    git push
    echo "✅ CW code pushed"
fi

echo ""
echo "── Brew-Vault sync ──"

cd "$VAULT_ROOT"

# Check if workspace file has uncommitted changes
if git diff --quiet -- "$WORKSPACE" && git diff --cached --quiet -- "$WORKSPACE"; then
    echo "✅ Workspace already committed (Obsidian git plugin likely handled it)"
else
    git add "$WORKSPACE"
    git commit -m "hermes: workspace update — $MSG"
    git push
    echo "✅ Brew-Vault pushed"
fi

echo ""
echo "🤝 Ready for Hermes retest"

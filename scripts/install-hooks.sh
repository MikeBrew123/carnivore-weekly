#!/bin/sh
# Install git hooks for this repo. Run once after cloning.
# Usage: ./scripts/install-hooks.sh

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

cp scripts/hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push

echo "✅ Installed pre-push hook (runs validate_before_commit.py before every push)"
echo "   Bypass when needed: git push --no-verify"

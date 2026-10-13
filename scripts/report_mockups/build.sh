#!/bin/bash
# Rebuild public/images/report-mockups/*.jpg from the REAL CW report (CLAUDE.md mockup
# rule: actual product screenshots composited into an empty Pillow scene, never an AI fake).
# Renders through api/calculator-api.js with the Anthropic call stubbed (no API spend) for a
# fictional reader "Your Name". The two AI-written sections are never screenshotted.
# Usage: bash scripts/report_mockups/build.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; HERE="$ROOT/scripts/report_mockups"
WORK="$(mktemp -d)"; mkdir -p "$WORK/shots"
node "$HERE/render.mjs" "$ROOT" "$WORK/report.html"
python3 "$HERE/shoot.py" "$WORK"
python3 "$HERE/composite.py" "$WORK" "$ROOT/public/images/report-mockups"
echo "Wrote public/images/report-mockups/ (work dir $WORK). Look at every image before committing."

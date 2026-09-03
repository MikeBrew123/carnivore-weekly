#!/bin/bash
# PreToolUse (Bash): generate_kd_blog.py must never run without --only-new (ISSUE-026).
CMD=$(jq -r '.tool_input.command // ""' 2>/dev/null)
if echo "$CMD" | grep -q 'generate_kd_blog.py' && ! echo "$CMD" | grep -q -- '--only-new'; then
  echo "BLOCKED: generate_kd_blog.py without --only-new would overwrite the ~27 legacy KD posts (ISSUE-026, 2026-06-12). Add --only-new." >&2; exit 2
fi
exit 0

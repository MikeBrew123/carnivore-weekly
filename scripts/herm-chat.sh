#!/bin/bash
# herm-chat.sh — Direct Claude ↔ Hermes communication via SSH
# Usage: ./scripts/herm-chat.sh "your message to Hermes"
# Returns Hermes' response to stdout

set -euo pipefail

# Hermes is reachable over Tailscale (hermes-vps, 100.92.115.43).
# The old public IP 148.230.83.87:22 is firewalled and times out — do not use it.
HERMES_HOST="root@100.92.115.43"
SSH_TIMEOUT=10
HERMES_TIMEOUT=60

if [ -z "${1:-}" ]; then
    echo "Usage: herm-chat.sh \"message to Hermes\""
    exit 1
fi

MESSAGE="$1"

# Escape single quotes for SSH
ESCAPED=$(printf '%s' "$MESSAGE" | sed "s/'/'\\\\''/g")

ssh -o ConnectTimeout=$SSH_TIMEOUT -o ServerAliveInterval=15 "$HERMES_HOST" \
    "hermes chat -q '$ESCAPED' -Q 2>/dev/null" 2>/dev/null

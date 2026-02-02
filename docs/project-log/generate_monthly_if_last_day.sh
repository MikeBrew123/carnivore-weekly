#!/bin/bash
# Check if today is the last day of the month, then generate monthly report

TODAY=$(date +%d)
TOMORROW=$(date -v+1d +%d)

# If tomorrow's day is less than today's day, we're at month end
if [ "$TOMORROW" -lt "$TODAY" ]; then
    echo "$(date): Last day of month detected, generating monthly report..."
    /usr/bin/python3 /Users/mbrew/Developer/carnivore-weekly/docs/project-log/generate_reports.py --monthly
else
    echo "$(date): Not last day of month, skipping..."
fi

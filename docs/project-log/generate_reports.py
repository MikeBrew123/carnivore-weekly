#!/usr/bin/env python3
"""
Generate weekly and monthly reports from daily session logs.

Usage:
    python3 generate_reports.py --weekly    # Generate this week's report
    python3 generate_reports.py --monthly   # Generate this month's report
"""

import os
import re
from datetime import datetime, timedelta
from pathlib import Path
import argparse

OBSIDIAN_DAILY = Path("/Users/mbrew/Documents/Brew-Vault/07-Daily")

def get_week_dates():
    """Get start and end dates for current week (Monday-Sunday)"""
    today = datetime.now()
    start = today - timedelta(days=today.weekday())  # Monday
    end = start + timedelta(days=6)  # Sunday
    return start, end

def get_month_dates():
    """Get start and end dates for current month"""
    today = datetime.now()
    start = today.replace(day=1)
    # Last day of month
    next_month = start.replace(day=28) + timedelta(days=4)
    end = next_month - timedelta(days=next_month.day)
    return start, end

def read_daily_notes(start_date, end_date):
    """Read all daily notes between start and end dates"""
    notes = []
    current = start_date

    while current <= end_date:
        year_month = current.strftime("%Y/%m")
        filename = current.strftime("%Y-%m-%d.md")
        filepath = OBSIDIAN_DAILY / year_month / filename

        if filepath.exists():
            with open(filepath, 'r') as f:
                content = f.read()
                notes.append({
                    'date': current.strftime("%Y-%m-%d"),
                    'content': content
                })

        current += timedelta(days=1)

    return notes

def extract_section(content, section_name):
    """Extract a specific section from markdown content"""
    pattern = rf"## {section_name}\n(.*?)(?=\n## |\Z)"
    match = re.search(pattern, content, re.DOTALL)
    return match.group(1).strip() if match else ""

def generate_weekly_report(start_date, end_date):
    """Generate weekly report from daily notes"""
    notes = read_daily_notes(start_date, end_date)

    if not notes:
        print("No daily notes found for this week.")
        return None

    # Extract key information
    all_accomplishments = []
    all_decisions = []
    all_blockers = []

    for note in notes:
        accomplishments = extract_section(note['content'], 'Accomplishments')
        if accomplishments:
            all_accomplishments.append(f"**{note['date']}**\n{accomplishments}\n")

        decisions = extract_section(note['content'], 'Decisions')
        if decisions:
            all_decisions.append(f"**{note['date']}**\n{decisions}\n")

        issues = extract_section(note['content'], 'Issues Found & Fixed')
        if issues:
            all_blockers.append(f"**{note['date']}**\n{issues}\n")

    # Build report
    week_str = f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d, %Y')}"

    report = f"""---
date: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}
type: weekly-report
project: carnivore-weekly
---

# Weekly Report: Week of {week_str}

## Week Summary
{len(notes)} sessions this week covering automation, content generation, and SEO optimization.

## Key Accomplishments
{''.join(all_accomplishments) if all_accomplishments else 'No major accomplishments recorded.'}

## Major Decisions
{''.join(all_decisions) if all_decisions else 'No major decisions recorded.'}

## Issues & Resolutions
{''.join(all_blockers) if all_blockers else 'No issues recorded.'}

## Next Week Focus
- Monitor automated blog post generation
- Continue SEO optimization
- Address any new blockers

---

## Daily Notes Summary
"""

    for note in notes:
        summary = extract_section(note['content'], 'Summary')
        if summary:
            report += f"\n### {note['date']}\n{summary}\n"

    return report

def generate_monthly_report(start_date, end_date):
    """Generate monthly report from daily notes"""
    notes = read_daily_notes(start_date, end_date)

    if not notes:
        print("No daily notes found for this month.")
        return None

    month_name = start_date.strftime("%B %Y")

    # Aggregate all accomplishments
    all_accomplishments = []
    for note in notes:
        accomplishments = extract_section(note['content'], 'Accomplishments')
        if accomplishments:
            all_accomplishments.append(accomplishments)

    report = f"""---
date: {start_date.strftime('%Y-%m')}
type: monthly-report
project: carnivore-weekly
---

# Monthly Report: {month_name}

## Month in Review
{len(notes)} sessions completed this month.

## Major Achievements
{''.join(all_accomplishments) if all_accomplishments else 'No major achievements recorded.'}

## Statistics
- Total sessions: {len(notes)}
- Days active: {len(notes)}

## Next Month Goals
- Continue progress on current initiatives
- Address technical debt
- Optimize workflows
"""

    return report

def main():
    parser = argparse.ArgumentParser(description='Generate session reports')
    parser.add_argument('--weekly', action='store_true', help='Generate weekly report')
    parser.add_argument('--monthly', action='store_true', help='Generate monthly report')
    args = parser.parse_args()

    if args.weekly:
        start, end = get_week_dates()
        report = generate_weekly_report(start, end)
        if report:
            output_file = OBSIDIAN_DAILY / f"weekly-report-{start.strftime('%Y-W%W')}.md"
            with open(output_file, 'w') as f:
                f.write(report)
            print(f"✅ Weekly report generated: {output_file}")

    elif args.monthly:
        start, end = get_month_dates()
        report = generate_monthly_report(start, end)
        if report:
            output_file = OBSIDIAN_DAILY / f"monthly-report-{start.strftime('%Y-%m')}.md"
            with open(output_file, 'w') as f:
                f.write(report)
            print(f"✅ Monthly report generated: {output_file}")

    else:
        parser.print_help()

if __name__ == "__main__":
    main()

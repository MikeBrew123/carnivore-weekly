# Pre-Commit Validation Setup

## Overview

Two-part validation system that blocks commits containing HTML/validation issues:

1. **validate_before_commit.py** - Standalone validation script
2. **pre-commit-hook.sh** - Git hook that runs validation automatically

## Installation

### 1. Install Dependencies

```bash
pip3 install beautifulsoup4
```

### 2. Install Git Hook

```bash
# From project root
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### 3. Test Installation

```bash
# Test standalone script
python3 scripts/validate_before_commit.py --verbose

# Test hook (make a dummy change)
echo "test" >> test.txt
git add test.txt
git commit -m "test validation"  # Hook should run automatically
git reset HEAD~1  # Undo test commit
rm test.txt
```

## Usage

### Standalone Script

Run validation manually anytime:

```bash
# Validate all files
python3 scripts/validate_before_commit.py --verbose

# Validate only staged files (faster)
python3 scripts/validate_before_commit.py --staged-only

# Quick validation (no verbose output)
python3 scripts/validate_before_commit.py
```

### Git Hook

Runs automatically on every commit:

```bash
git commit -m "your message"
# Validation runs automatically
# Commit proceeds if no critical issues
# Commit blocked if critical issues found
```

To bypass validation (emergency only):

```bash
git commit --no-verify -m "emergency fix"
```

## What Gets Validated

### HTML Validation (CRITICAL)
- ❌ Multiple H1 tags
- ❌ Duplicate IDs within page
- ❌ Unrendered template variables ({{ }}, {% %}, {# #})
- ❌ Missing required meta tags (title, description)
- ❌ Empty meta tag content
- ❌ Malformed canonical URLs (/.html)

### HTML Validation (WARNING)
- ⚠️ Skipped heading levels (h1 → h3)
- ⚠️ Images missing alt attributes
- ⚠️ Links with empty href
- ⚠️ Invalid JSON-LD structured data

### Sitemap Validation (CRITICAL)
- ❌ Duplicate URLs
- ❌ Invalid XML structure

### Sitemap Validation (WARNING)
- ⚠️ Invalid lastmod dates

### Python Validation (CRITICAL)
- ❌ Python syntax errors

## Exit Codes

- `0` - All checks passed (commit proceeds)
- `1` - Critical issues found (commit blocked)
- `2` - Warnings only (commit proceeds)

## Output Examples

### Success

```
✅ ALL CHECKS PASSED
- HTML files validated: 79
- Sitemap entries: 51 (0 duplicates)
- Python files checked: 15
- Issues found: 0
```

### Failure (Critical)

```
❌ VALIDATION FAILED — 3 issues found

CRITICAL (blocks commit):
1. blog/post-name.html:45 — Multiple H1 tags (found 2)
   Fix: Change second <h1> to <h2>

2. blog/post-name.html:23 — Unrendered template variable: {{ author }}
   Fix: Replace Jinja2 variable with actual content or remove

3. public/sitemap.xml:1 — Duplicate URLs in sitemap: /blog/post-1
   Fix: Remove duplicate entries from sitemap

Summary: 3 critical, 0 warnings
❌ COMMIT BLOCKED — fix critical issues before committing
```

### Warnings Only

```
❌ VALIDATION FAILED — 2 issues found

WARNING (doesn't block):
1. blog/old-post.html:12 — Image missing alt attribute
   Fix: Add alt="description" to img tag

2. blog/old-post.html:45 — Skipped heading level (h1 to h3)
   Fix: Use h2 instead of h3

Summary: 0 critical, 2 warnings
⚠️  Warnings found — consider fixing before commit
```

## Logs

All validation runs are logged to `logs/commit_validation.log` with timestamps.

View recent validation runs:

```bash
tail -50 logs/commit_validation.log
```

## Uninstalling

Remove the git hook:

```bash
rm .git/hooks/pre-commit
```

The standalone script remains available for manual validation.

## Troubleshooting

### Hook Not Running

Ensure hook is executable:
```bash
chmod +x .git/hooks/pre-commit
```

### BeautifulSoup4 Not Found

Install dependency:
```bash
pip3 install beautifulsoup4
```

### Validation Too Slow

Use staged-only mode (enabled by default in git hook):
```bash
python3 scripts/validate_before_commit.py --staged-only
```

### False Positives

For newsletters and templates with intentional template variables, the validator will flag them as issues. These files should be committed with `--no-verify` if they are intentionally using template syntax for later processing.

Alternatively, exclude template files from validation by adding them to `.gitignore` or creating an exclusion list in the validator script.

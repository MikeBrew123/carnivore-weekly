# Wall 3: GitHub Actions Safety Net

## Overview

Two GitHub Actions workflows provide automated validation and monitoring:

1. **Deployment Gate** (`validate-before-deploy.yml`) - Blocks deployments with validation issues
2. **Weekly Health Check** (`weekly-health-check.yml`) - Proactive monitoring of site health

## Deployment Gate Workflow

**File:** `.github/workflows/validate-before-deploy.yml`

**Triggers:** Push to `main` branch

**Purpose:** Emergency backup validation before deployment (runs AFTER Wall 1 pre-commit and Wall 2 pre-push)

### Validation Checks

1. **Comprehensive validation** - Runs `scripts/full-validation-sweep.py`
2. **JSON-LD structured data** - Validates all `application/ld+json` blocks parse correctly
3. **Sitemap validation** - Ensures `public/sitemap.xml` is valid XML
4. **File size check** - Flags HTML files exceeding 500KB
5. **Asset references** - Verifies all CSS/JS files referenced in HTML exist
6. **404 detection** - Compares sitemap URLs to actual files

### On Success

```
✅ Validation passed — deployment approved
```

- Adds ✅ status check to commit
- Allows deployment workflows to proceed
- Logs success message

### On Failure

```
❌ Deployment blocked
```

- Sets workflow status as failed (blocks deployment)
- Automatically creates GitHub Issue:
  - Title: "🔴 Deployment Blocked: [date] — [N] critical issues"
  - Body: Full validation output, which files failed, how to fix
  - Labels: `validation-failure`, `automated`
  - Assigned to repo owner
- Logs all details in workflow output

### Performance

- Timeout: 5 minutes
- Expected runtime: Under 2 minutes

## Weekly Health Check Workflow

**File:** `.github/workflows/weekly-health-check.yml`

**Triggers:**
- Schedule: Every Sunday at midnight UTC (`cron: '0 0 * * 0'`)
- Manual: `workflow_dispatch` for on-demand runs

**Purpose:** Proactive monitoring to catch drift, regressions, and manual edits

### Health Checks

1. **Full validation suite** - Runs `scripts/full-validation-sweep.py`
2. **Page counting** - Counts HTML files vs sitemap entries, flags mismatches
3. **Manual edit detection** - Identifies pages that bypass generation pipeline
4. **SEO regression patterns:**
   - Pages with empty meta descriptions
   - Pages with invalid structured data
   - Pages with multiple H1 tags (duplicate H1s)
5. **SEO completeness score** - % of pages with all SEO essentials:
   - Meta description
   - Title tag
   - H1 tag
   - Canonical URL

### Reporting

#### Healthy Status (No Issues)

```
📊 Weekly Health Report — 2026-02-08

Pages: 51
Sitemap entries: 51 (mismatch: 0)
Validation errors: 0 critical, 0 warnings
SEO completeness: 100%
Manual edits detected: 0
SEO issues: 0

Status: ✅ HEALTHY
```

**Action:** No GitHub Issue created, just success log

#### Issues Found

```
📊 Weekly Health Report — 2026-02-08

Pages: 51
Sitemap entries: 52 (mismatch: 1)
Validation errors: 3 critical, 5 warnings
SEO completeness: 94%
Manual edits detected: 2
SEO issues: 4

Status: 🟡 NEEDS ATTENTION
```

**Action:** Creates GitHub Issue:
- Title: "🟡 Weekly Health Check: [N] issues found — [date]"
- Body: Detailed report with expandable sections for:
  - Full validation output
  - SEO regression check results
  - Manual edit detection results
  - Recommended actions
- Labels: `health-check`, `automated`

### Status Levels

- **✅ HEALTHY** - 0 critical issues, 0 SEO issues, 0 manual edits
- **🟡 NEEDS ATTENTION** - Warnings or SEO issues present
- **🔴 NEEDS IMMEDIATE ATTENTION** - Critical validation errors

### Performance

- Timeout: 10 minutes
- Expected runtime: 2-4 minutes

## How the Three Walls Work Together

```
Developer pushes code
        ↓
    WALL 1 (Pre-commit hook)
    - Basic validation
    - Blocks commit if fails
        ↓
    Commit succeeds
        ↓
    WALL 2 (Pre-push hook - validate_before_commit.py)
    - Comprehensive validation
    - Blocks push if fails
        ↓
    Push succeeds
        ↓
    WALL 3A (Deployment Gate - GitHub Actions)
    - Emergency backup validation
    - Blocks deployment if fails
    - Creates GitHub Issue
        ↓
    Deploy succeeds
        ↓
    WALL 3B (Weekly Health Check)
    - Sunday midnight UTC
    - Catches drift and regressions
    - Reports via GitHub Issue
```

## Manual Workflow Testing

### Test Deployment Gate

1. Make a small change to any HTML file
2. Commit and push to main branch:
   ```bash
   git add .
   git commit -m "Test deployment gate"
   git push
   ```
3. Check GitHub Actions tab for workflow run
4. Verify it completes (success or creates issue if problems found)

### Test Weekly Health Check

Run manually via GitHub UI:

1. Go to repository → Actions tab
2. Click "Weekly Health Check" workflow
3. Click "Run workflow" dropdown
4. Click green "Run workflow" button
5. Wait for completion
6. Check if GitHub Issue was created (if issues found)

Or via GitHub CLI:

```bash
gh workflow run weekly-health-check.yml
gh run watch
```

## Current Test Results

All validation checks tested successfully on current codebase:

- ✅ JSON-LD validation: 8 blocks checked, all valid
- ✅ Sitemap validation: Valid XML with 68 URLs
- ✅ File size check: No files exceed 500KB
- ⚠️ Asset references: Found 4 missing CSS files (known issues in legacy pages)
- ✅ SEO completeness: 70% on sample (some legacy pages missing meta/canonical)

## Maintenance

### Adding New Checks

To add validation checks to either workflow:

1. Edit the appropriate `.yml` file in `.github/workflows/`
2. Add a new step with a descriptive name
3. Use Python inline scripts or call existing validation scripts
4. Store results in output files for reporting
5. Update the reporting step to include new check results

### Modifying Issue Creation

GitHub Issue creation is handled by `actions/github-script@v7`. To modify:

1. Find the "Create GitHub Issue" step
2. Edit the JavaScript in the `script:` block
3. Adjust title, body, or labels as needed

### Adjusting Schedule

To change the weekly health check schedule:

1. Edit `.github/workflows/weekly-health-check.yml`
2. Modify the `cron:` value under `schedule:`
3. Use [crontab.guru](https://crontab.guru) to validate syntax

Examples:
- Daily at midnight: `'0 0 * * *'`
- Every 6 hours: `'0 */6 * * *'`
- Monday/Friday at 9am: `'0 9 * * 1,5'`

## Troubleshooting

### Workflow fails immediately

Check YAML syntax:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/FILE.yml'))"
```

### Python dependencies missing

Workflows install dependencies via pip. If new packages are needed, add to the "Install Python dependencies" step.

### Validation script not found

Ensure `scripts/full-validation-sweep.py` exists and is executable. Workflow runs from repository root.

### GitHub Issue not created

- Check repository has "Issues" enabled
- Verify GitHub Actions has write permissions
- Check workflow logs for error messages in "Create GitHub Issue" step

## Best Practices

1. **Don't bypass Wall 3** - If it blocks deployment, there's a reason
2. **Review issues promptly** - Automated issues indicate real problems
3. **Keep validation scripts in sync** - Wall 2 and Wall 3A should use same checks
4. **Monitor weekly reports** - Catch drift before it becomes a problem
5. **Update checks as site evolves** - Add validation for new features

# Archive Restoration Guide

**Date Archived:** January 2, 2026
**Reason:** Root directory cleanup - preserved files that don't affect live site
**Location:** `_archive/` folder in project root

---

## What Was Archived

This archive contains files that were removed from the project root because they:
- Are not linked to or affecting the live website
- Are not referenced in active code or CI/CD workflows
- Are not needed for the Calculator2 test build
- Are historical documentation or ad-hoc scripts from development

### Folder Structure

```
_archive/
├── test-scripts/           (19 files) - Ad-hoc test scripts
├── deployment-scripts/     (30 files) - Manual deployment/database tools
├── reports/                (29 files) - Historical reports and summaries
├── sql/                    (4 files)  - Ad-hoc SQL scripts
├── data/                   (1 file)   - Optimization results
└── RESTORATION_GUIDE.md    (this file)
```

---

## Files Archived by Category

### Test Scripts (`_archive/test-scripts/`)
**Size:** ~135 KB
**Status:** Not in package.json or CI/CD workflows

```
test-complete-form-report.mjs
test-full-paid-report.mjs
test-full-report-retrieval.mjs
test-free-flow-complete.mjs
test-paid-flow-complete.mjs
test-payment-success-report.mjs
test-quick.mjs
test-view-full-report.mjs
test-new-flow.mjs
test-supabase-bucket-query.js
test-supabase-connection.js
test-supabase-rpc.js
test-supabase-signup.js
(and others)
```

**Recovery:** These are manual testing scripts. If you need to restore one:
```bash
cp _archive/test-scripts/test-*.mjs .
```

---

### Deployment & Database Scripts (`_archive/deployment-scripts/`)
**Size:** ~150 KB
**Status:** Not used in actual deployment workflow (real deployment via `run_weekly_update.sh`)

```
deploy-final.js
deploy-leo.js
deploy-migration-v2.js
deploy-migration.js
deploy-migration.sh
execute_migration_step1.js
execute_production_activation.js
execute_migration.js
fix-category-constraint.js
check-schema.js
check-tables-api.js
check-tables-api-v2.js
diagnostic.js
test_db_connection.js
screenshot-homepage.js
(and others)
```

**⚠️ WARNING:** Some of these files contain hardcoded credentials. Do NOT use in production without reviewing and sanitizing.

**Recovery:** Only restore if you're specifically debugging database issues:
```bash
cp _archive/deployment-scripts/deploy-migration.js .
```

---

### Reports & Summaries (`_archive/reports/`)
**Size:** ~280 KB
**Status:** Historical documentation from Dec 26-Jan 2 development period

**Text Reports:**
```
ACTIVATION_SUMMARY.txt
ACTIVATION_EXECUTION_SUMMARY.txt
DIAGNOSTIC_SUMMARY.txt
DIAGNOSTIC_FINDINGS.txt
FINAL_TEST_REPORT.txt
DETAILED_TEST_REPORT.txt
MIGRATION_012_EXECUTION_MANIFEST.txt
MIGRATION_012_VALIDATION_RESULTS.txt
MIGRATION_012_DATABASE_CHANGES.txt
MIGRATION_012_PERFORMANCE_ANALYSIS.txt
PHASE2_FILE_MANIFEST.txt
PRODUCTION_ACTIVATION_INDEX.txt
QUICK_REFERENCE.txt
TEST_SCENARIOS_VALIDATION.txt
DELIVERABLES_SUMMARY.txt
BENTO_GRID_DELIVERY_MANIFEST.txt
CALCULATOR_E2E_TEST_SUMMARY.txt
```

**HTML Reports:**
```
ACTIVATION_REPORT.html
DEPLOYMENT_REPORT.html
MIGRATION_REPORT.html
PHASE2_SUMMARY.html
(and others)
```

**Recovery:** These are reference/documentation files. Reference them from archive if needed:
```bash
cat _archive/reports/MIGRATION_012_EXECUTION_MANIFEST.txt
```

---

### SQL Scripts (`_archive/sql/`)
**Size:** ~26 KB
**Status:** Ad-hoc database fixes (should use migrations/ folder instead)

```
fix-category-constraint.sql
SIMPLE_MIGRATION.sql
MIGRATION_READY.sql
verify_migration_012.sql
```

**⚠️ NOTE:** Do NOT run these against production without reviewing. These are manual fixes. Proper migrations should go in `/migrations/` folder.

**Recovery:** Only if debugging specific database schema issues:
```bash
# Review first, then consider running via Supabase UI
cat _archive/sql/fix-category-constraint.sql
```

---

### Data Files (`_archive/data/`)
**Size:** ~195 KB

```
token_optimization_results.json  - Results from one-time token optimization
```

**Recovery:** Reference only if needed for optimization research:
```bash
cat _archive/data/token_optimization_results.json
```

---

## What Was NOT Archived

### ✅ Kept in Root (Still Active)
- `README.md` - Project documentation
- `CHANGELOG.md` - Version history
- `CLAUDE.md` - AI system context
- `package.json` - Node dependencies
- `package-lock.json` - Dependency lock file
- `requirements.txt` - Python dependencies
- `.env` / `.env.example` - Environment variables
- `jest.config.js`, `playwright.config.js`, etc. - Test configurations
- `index.html`, `archive.html`, `channels.html`, `about.html` - Served pages
- `favicon.ico` - Website favicon
- `robots.txt`, `sitemap.xml`, `CNAME` - Web config
- Configuration files (`.flake8`, `.gitignore`, etc.)

### ✅ Moved to docs/
All documentation files were reorganized into `docs/` subfolders:
- `docs/getting-started/`
- `docs/guides/`
- `docs/architecture/`
- `docs/agents/`
- `docs/design-system/`
- `docs/qa/`
- `docs/reports/` ← Proper place for reports
- `docs/systems/`

### ✅ Kept in images/
Screenshot images moved (NOT deleted):
- `images/carnivore_weekly_desktop.png`
- `images/carnivore_weekly_mobile.png`
- `images/current-desktop.png`
- `images/current-mobile.png`

---

## How to Restore Files

### Restore Everything
```bash
# Restore all archived files to project root
cp -r _archive/* .
# Then remove _archive/ if desired
rm -rf _archive/
```

### Restore Specific Category
```bash
# Restore only test scripts
cp _archive/test-scripts/* .

# Restore only deployment scripts
cp _archive/deployment-scripts/* .

# Restore only reports
cp _archive/reports/* .

# Restore only SQL files
cp _archive/sql/* .
```

### Restore Single File
```bash
# Example: restore one test script
cp _archive/test-scripts/test-quick.mjs .
```

---

## If Something Breaks

**Before using archived files, consider:**

1. **Test Scripts:** These are not part of the CI/CD. They were manual testing only. If a test is failing, write a proper test in `tests/` directory instead.

2. **Deployment Scripts:** The actual deployment uses `run_weekly_update.sh` which calls Python scripts in `/scripts/`. Only use archived deployment scripts for debugging, not production.

3. **SQL Scripts:** These are not migrations. If database schema changes are needed, use proper Supabase migrations in `/migrations/` folder.

4. **Reports:** These are historical reference only. Proper documentation lives in `docs/` folder.

---

## Calculator2 Status

**Calculator2 is SAFE and UNAFFECTED:**
- Calculator2 test build in `calculator2-demo/` is unchanged
- E2E tests in `tests/e2e-calculator-paths.spec.js` are unchanged
- Live calculator in `public/calculator.html` is unchanged
- Documentation in `docs/guides/CALCULATOR2_DEPLOYMENT.md` is in docs/
- Only `CALCULATOR_E2E_TEST_SUMMARY.txt` (a report) was archived

**No Calculator2 functionality was removed or affected.**

---

## Archive Maintenance

**Monthly:** Review `_archive/` to see if any files can be permanently deleted:
```bash
ls -lah _archive/
# Remove truly obsolete files
rm _archive/reports/ACTIVATION_SUMMARY.txt
```

**When:** Before deleting, make sure it's not needed for historical reference or debugging.

---

**Created:** January 2, 2026
**Last Updated:** January 2, 2026
**Maintained by:** Quinn (Operations Manager)

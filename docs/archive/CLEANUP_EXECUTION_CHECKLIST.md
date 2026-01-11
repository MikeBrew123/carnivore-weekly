# Documentation Cleanup - Execution Checklist

**Status:** Ready to Execute
**Created:** 2026-01-05
**Estimated Time:** 2-3 hours total (can be done incrementally)

---

## PHASE 1: REVIEW & PLANNING (30 minutes)

Goal: Ensure team alignment before making any changes

- [ ] Review DOCUMENTATION_CLEANUP_PLAN.md (detailed file mappings)
- [ ] Review CLEANUP_SUMMARY.md (high-level overview)
- [ ] Review CLEANUP_BEFORE_AFTER.md (visual comparison)
- [ ] Confirm directory structure is acceptable
- [ ] Identify any files that should be DELETED (vs archived)
- [ ] Identify "living documents" that are actively maintained
- [ ] Create git branch: `cleanup/documentation-organization`

**Questions to answer:**
- Should any files be deleted entirely? (vs archived)
- Are there any special naming conventions to maintain?
- Should old script files be kept or archived?
- Do we need to update CI/CD if scripts are moved?

---

## PHASE 2: CREATE DIRECTORY STRUCTURE (15 minutes)

Goal: Set up all new directories before moving files

Run these commands:

```bash
cd /Users/mbrew/Developer/carnivore-weekly

# Main docs subdirectories
mkdir -p docs/guides/{setup,development,deployment}
mkdir -p docs/specs/{database-schema,features,architecture}
mkdir -p docs/reports/{validations,investigations,migrations}
mkdir -p docs/decisions/{architecture,feature-design,infrastructure}
mkdir -p docs/tools/{validate,deploy,test,utility}

# Archive structure
mkdir -p docs/archive/2026-01

# Verify structure
find docs -type d -maxdepth 2 | sort
```

**Checklist:**
- [ ] docs/guides/ created with subdirectories
- [ ] docs/specs/ created with subdirectories
- [ ] docs/reports/ created with subdirectories
- [ ] docs/decisions/ created with subdirectories
- [ ] docs/tools/ created with subdirectories
- [ ] docs/archive/ created with date subdirectories

---

## PHASE 3: CREATE NAVIGATION FILES (20 minutes)

Goal: Add README.md to each new directory

**docs/guides/README.md:**
```markdown
# Development Guides

## Categories

- **setup/** - Configuration and setup guides for various services
- **development/** - Debugging, testing, and development procedures
- **deployment/** - Migration execution and deployment procedures

Use these guides as step-by-step procedures when working on development tasks.
```

**docs/specs/README.md:**
```markdown
# Technical Specifications

## Categories

- **database-schema/** - Database table definitions, migrations, RLS rules
- **features/** - Feature specifications and design documents
- **architecture/** - System architecture and design decisions

Use these specs to understand what systems should do and why they were designed that way.
```

**docs/reports/README.md:**
```markdown
# Reports and Findings

## Categories

- **migrations/** - Migration deployment reports and summaries
- **investigations/** - Bug analysis, debugging reports, and investigation findings
- **validations/** - Validation results, testing reports, and quality assurance

Use these reports to understand what was learned and findings from testing/deployments.
```

**docs/decisions/README.md:**
```markdown
# Strategic Decisions

## Categories

- **architecture/** - Architectural decisions and rationale
- **feature-design/** - Feature design decisions
- **infrastructure/** - Infrastructure and deployment decisions

Use these to understand WHY we chose particular approaches.

Note: project-log/decisions.md is the source of truth for recent decisions.
This directory archives historical decisions.
```

**docs/tools/README.md:**
```markdown
# Development Tools & Scripts

## Categories

- **validate/** - Validation scripts (calculator, forms, accessibility)
- **deploy/** - Deployment and migration scripts
- **test/** - Test and debug scripts
- **utility/** - Utility scripts (servers, screenshots, etc)

These scripts are used during development and deployment.
```

**docs/archive/README.md:**
```markdown
# Archived Documentation

## Organization

Files are organized by date and topic for historical reference.

## Categories

- **2026-01/** - January 2026 work items

Use this when you need historical context or reference previous implementations.
```

**Checklist:**
- [ ] docs/guides/README.md created
- [ ] docs/specs/README.md created
- [ ] docs/reports/README.md created
- [ ] docs/decisions/README.md created
- [ ] docs/tools/README.md created
- [ ] docs/archive/README.md created

---

## PHASE 4A: MOVE MIGRATION FILES (10 minutes)

**Destination:** `docs/reports/migrations/` and `docs/guides/deployment/`

Files to move to `docs/reports/migrations/`:
```bash
cd /Users/mbrew/Developer/carnivore-weekly

mv MIGRATION_DEPLOYMENT_007.md docs/reports/migrations/2026-01-05-migration-deployment-007.md
mv MIGRATION_EXECUTION_STATUS.md docs/reports/migrations/2026-01-05-migration-execution-status.md
mv MIGRATION_007_CHECKLIST.md docs/reports/migrations/2026-01-05-migration-007-checklist.md
mv MIGRATION_007_INDEX.md docs/reports/migrations/2026-01-05-migration-007-index.md
mv MIGRATION_SUMMARY_2026-01-05.md docs/reports/migrations/2026-01-05-migration-summary.md
mv DEPLOYMENT_SUMMARY_007.md docs/reports/migrations/2026-01-05-deployment-summary.md
mv ASSESSMENT_MIGRATION_DEPLOYMENT.md docs/reports/migrations/2026-01-04-assessment-migration-deployment.md
mv ASSESSMENT_MIGRATION_STATUS.md docs/reports/migrations/2026-01-04-assessment-migration-status.md
mv ASSESSMENT_DEPLOYMENT_CHECKLIST.md docs/reports/migrations/2026-01-04-assessment-deployment-checklist.md
mv ASSESSMENT_DEPLOYMENT_INDEX.md docs/reports/migrations/2026-01-04-assessment-deployment-index.md
mv ASSESSMENT_MIGRATION_EXECUTION_REPORT.txt docs/reports/migrations/2026-01-04-assessment-migration-execution-report.txt
mv SUPABASE_MIGRATION_STATUS.md docs/reports/migrations/supabase-migration-status.md
mv MIGRATION_STATUS.md docs/reports/migrations/migration-status.md
mv MIGRATION_EXECUTION_GUIDE.md docs/guides/deployment/migration-execution-guide.md
mv ASSESSMENT_MIGRATION_README.md docs/guides/deployment/assessment-migration-guide.md
mv ASSESSMENT_QUICK_START.md docs/guides/deployment/assessment-quick-start.md
mv SUPABASE_MIGRATION_INSTRUCTIONS.md docs/guides/setup/supabase-migration.md
mv QUICK_MIGRATION_REFERENCE.md docs/guides/deployment/quick-migration-reference.md
mv QUICK_MIGRATION_REFERENCE.txt docs/guides/deployment/quick-migration-reference.txt
mv DEPLOYMENT_BACKUP_SUMMARY.md docs/reports/migrations/deployment-backup-summary.md
```

**Checklist:**
- [ ] All 20 migration files moved
- [ ] Files renamed with date prefix where appropriate
- [ ] No files left in root from this category

---

## PHASE 4B: MOVE DATABASE/SCHEMA FILES (10 minutes)

**Destination:** `docs/specs/database-schema/` and `docs/guides/development/`

```bash
cd /Users/mbrew/Developer/carnivore-weekly

# Move to database-schema/
mv SARA_MEMORY_STORAGE_ANALYSIS.md docs/specs/database-schema/
mv SARA_MEMORY_QUICK_REFERENCE.sql docs/specs/database-schema/
mv WRITERS_SCHEMA_FIX.md docs/specs/database-schema/
mv WRITERS_SCHEMA_FIX_README.md docs/specs/database-schema/
mv WRITERS_SCHEMA_COMPARISON.md docs/specs/database-schema/
mv WRITERS_SCHEMA_DIAGRAM.md docs/specs/database-schema/
mv WRITERS_SCHEMA_FIX_INDEX.md docs/specs/database-schema/
mv WRITERS_QUICK_REFERENCE.sql docs/specs/database-schema/
mv DATABASE_BLUEPRINT_FILES.txt docs/specs/database-schema/
mv CALCULATOR2_SESSION_DIAGNOSIS.md docs/specs/features/

# Move to development guides
mv LEO_FORM_DATA_DEBUG_GUIDE.md docs/guides/development/form-data-debugging.md
mv DATABASE_UNBLOCK_STEPS.md docs/guides/development/
mv FORM_DATA_PERSISTENCE_ANALYSIS.md docs/specs/features/
```

**Checklist:**
- [ ] All 13 database/schema files moved
- [ ] No files left in root from this category

---

## PHASE 4C: MOVE BUG FIX & INVESTIGATION FILES (15 minutes)

**Destination:** `docs/reports/investigations/` and `docs/guides/development/`

```bash
cd /Users/mbrew/Developer/carnivore-weekly

# Key ones first
mv LEO_DIAGNOSIS_SUMMARY.md docs/reports/investigations/2026-01-04-leo-diagnosis-summary.md
mv LEO_INVESTIGATION_INDEX.md docs/reports/investigations/
mv LEO_CODE_SNIPPETS.js docs/reports/investigations/
mv LEO_QUICK_REFERENCE.md docs/reports/investigations/
mv LEO_DIAGNOSTICS.sql docs/reports/investigations/
mv LEO_STEP2_FORM_PERSISTENCE_DIAGNOSIS.md docs/reports/investigations/
mv LEO_STEP2_CODE_ANALYSIS.md docs/reports/investigations/
mv LEO_STEP2_DEBUG_CHECKLIST.md docs/reports/investigations/
mv LEO_IMPLEMENTATION_SUMMARY.md docs/reports/investigations/
mv LEO_STATE_FIX_DELIVERY.md docs/reports/investigations/
mv LEO_CALCULATOR_API_PATCH.md docs/reports/investigations/
mv LEO_MIGRATION_REPORT.txt docs/reports/investigations/
mv LEO_README.md docs/reports/investigations/

# API and bug fixes
mv API_CRITICAL_BUG_REPORT.md docs/reports/investigations/
mv API_PATCH_STEP4_FIX.js docs/reports/investigations/
mv BUG_FIX_DOCUMENTATION_INDEX.md docs/reports/investigations/

# Guides for development
mv DEBUG_QUICK_REFERENCE.md docs/guides/development/
mv FIX_SUMMARY.txt docs/reports/investigations/
mv FIX_SUMMARY_2026-01-03.md docs/reports/investigations/2026-01-03-fix-summary.md
mv QUICK_FIX_GUIDE.md docs/guides/development/
mv QUICK_FIX_REFERENCE.md docs/guides/development/
mv FIXES_INDEX.md docs/reports/investigations/
```

**Checklist:**
- [ ] All 22 investigation/bug files moved
- [ ] No files left in root from this category

---

## PHASE 4D: MOVE VALIDATION FILES (15 minutes)

**Destination:** `docs/reports/validations/` and `docs/guides/development/`

```bash
cd /Users/mbrew/Developer/carnivore-weekly

# Validation reports
mv ACCESSIBILITY_VALIDATION_REPORT.md docs/reports/validations/
mv ACCESSIBILITY_REPORT_INDEX.md docs/reports/validations/
mv ACCESSIBILITY_FIXES.md docs/reports/validations/
mv ACCESSIBILITY_TEST_RESULTS.txt docs/reports/validations/
mv A11Y_FIX_CHECKLIST.md docs/reports/validations/
mv A11Y_QUICK_SUMMARY.md docs/reports/validations/
mv COMPREHENSIVE_VALIDATION_RESULTS.md docs/reports/validations/
mv VALIDATION_REPORT_INDEX.md docs/reports/validations/
mv VALIDATION_REPORT.md docs/reports/validations/
mv VALIDATION_COMPLETE.txt docs/reports/validations/
mv VALIDATION_SUMMARY_DASHBOARD.txt docs/reports/validations/
mv VALIDATION_ARTIFACTS_INDEX.txt docs/reports/validations/
mv VALIDATION-FINDINGS.md docs/reports/validations/
mv VALIDATION_DECISION.txt docs/reports/validations/

# Casey validations
mv CASEY_VALIDATION_SUMMARY.md docs/reports/validations/
mv CASEY_VALIDATION_FINDINGS.md docs/reports/validations/
mv CASEY_VALIDATION_REPORT.txt docs/reports/validations/
mv CASEY_FINDINGS_SUMMARY.md docs/reports/validations/

# Banner validations
mv BANNER_VALIDATION_REPORT.html docs/reports/validations/
mv BANNER_CONSISTENCY_REPORT.md docs/reports/validations/
mv BANNER_ELEMENT_CHECKLIST.md docs/reports/validations/
mv BANNER_QUICK_VALIDATION.md docs/reports/validations/
mv BANNER_SIDE_BY_SIDE_COMPARISON.txt docs/reports/validations/
mv BANNER_VALIDATION_INDEX.md docs/reports/validations/
mv BANNER_VALIDATION_MANIFEST.txt docs/reports/validations/

# Other validations
mv JORDAN_VALIDATION_SUMMARY.md docs/reports/validations/
mv RESPONSIVE-VALIDATION-SUMMARY.txt docs/reports/validations/
mv visual-validation-responsive.md docs/reports/validations/

# Guide
mv VALIDATION_QUICKSTART.md docs/guides/development/
```

**Checklist:**
- [ ] All 30 validation files moved
- [ ] No files left in root from this category

---

## PHASE 4E: MOVE CALCULATOR FILES (15 minutes)

**Destination:** `docs/specs/features/`, `docs/guides/development/`, `docs/reports/investigations/`

```bash
cd /Users/mbrew/Developer/carnivore-weekly

# Guides
mv CALCULATOR_FIXES_QUICK_START.md docs/guides/development/
mv CALCULATOR2_SESSION_FIX_README.md docs/guides/development/calculator-session-fix.md
mv CALCULATOR_QUICK_FIX_GUIDE.md docs/guides/development/
mv CALCULATOR2_QUICKFIX.md docs/guides/development/
mv ALEX-HEIGHT-FIELD-QUICK-REFERENCE.md docs/guides/development/

# Specs
mv CALCULATOR_BRAND_VALIDATION_REQUIREMENTS.md docs/specs/features/calculator-brand-validation.md
mv CALCULATOR_BRAND_COLOR_SPEC.md docs/specs/features/
mv CALCULATOR2_INDEX.md docs/specs/features/
mv HEIGHT_FIELD_IMPLEMENTATION.md docs/specs/features/
mv STEP4-HEALTH-FIELDS-FOR-CASEY.md docs/specs/features/
mv STEP4-HEALTH-FIELDS-IMPLEMENTATION.md docs/specs/features/
mv STEP4-HEALTH-FIELDS-INDEX.md docs/specs/features/
mv STORY_3_2_IMPLEMENTATION.md docs/specs/features/
mv CALCULATOR2_RLS_UPDATE.sql docs/specs/database-schema/
mv CALCULATOR_API_DELIVERY.txt docs/specs/features/
mv PAYMENT_FLOW_STATUS.md docs/specs/features/

# Reports/Investigations
mv CALCULATOR_FIXES_SUMMARY.md docs/reports/investigations/
mv HEIGHT_FIELD_CODE_SUMMARY.md docs/reports/investigations/
mv HEIGHT-FIELD-VALIDATION-INDEX.md docs/reports/validations/height-field-validation.md
mv STEP4_HEIGHT_FIELD_COMPLETE.md docs/reports/investigations/
mv STEP4-HEALTH-CODE-SNIPPETS.md docs/reports/investigations/
mv STEP4-HEALTH-QUICK-REFERENCE.md docs/guides/development/
mv STEP4-IMPLEMENTATION-FINAL-REPORT.md docs/reports/investigations/
mv STEP4-MANIFEST.txt docs/reports/investigations/
```

**Checklist:**
- [ ] All 22 calculator files moved
- [ ] No files left in root from this category

---

## PHASE 4F: MOVE IMPLEMENTATION/SPEC FILES (10 minutes)

**Destination:** `docs/guides/`, `docs/specs/`, `docs/reports/`

```bash
cd /Users/mbrew/Developer/carnivore-weekly

# To guides
mv IMPLEMENTATION_CHECKLIST.md docs/guides/development/
mv IMPLEMENTATION_GUIDE_STATE_FIX.md docs/guides/development/
mv EXECUTION_CHECKLIST.md docs/guides/deployment/

# To specs
mv IMPLEMENTATION_REQUIREMENTS_STEP_6C.md docs/specs/features/
mv STATE_MANAGEMENT_ARCHITECTURE_FIX.md docs/specs/architecture/
mv STORY_3_2_VERIFICATION.md docs/reports/validations/

# To reports
mv STATE_FIX_DOCUMENTATION_INDEX.md docs/reports/investigations/
mv STATE_FIX_SUMMARY.txt docs/reports/investigations/
mv STEP_6A_DELIVERABLE.md docs/reports/investigations/
mv STEP_6C_DELIVERABLES.txt docs/reports/investigations/
mv STEP_6C_EXECUTIVE_SUMMARY.md docs/reports/investigations/
mv STEP_6C_VISUAL_VALIDATION_REPORT.md docs/reports/validations/
mv STEP6B_COMPLETION_SUMMARY.md docs/reports/investigations/
mv STEP6B_VERIFICATION.txt docs/reports/investigations/
mv TRACK3-COMPLETION-SUMMARY.md docs/reports/investigations/

# To guides - deployment
mv SECURITY_MIGRATION_CHECKLIST.md docs/guides/deployment/
```

**Checklist:**
- [ ] All 17 implementation files moved
- [ ] No files left in root from this category

---

## PHASE 4G: MOVE CONFIGURATION/SETUP FILES (10 minutes)

**Destination:** `docs/guides/setup/`

```bash
cd /Users/mbrew/Developer/carnivore-weekly

mv SUPABASE_SECRETS_ACCESS_GUIDE.md docs/guides/setup/
mv WRANGLER_SECRETS_QUICK_REF.md docs/guides/setup/
mv STRIPE_TESTING_SETUP.md docs/guides/setup/
mv ANALYTICS_DEPLOYMENT_INDEX.md docs/guides/setup/
mv ANALYTICS_DEPLOYMENT_CHECKLIST.md docs/guides/setup/
mv ANALYTICS_DEPLOYMENT_SUMMARY.txt docs/guides/setup/
mv ANALYTICS_INFRASTRUCTURE.md docs/guides/setup/
mv ANALYTICS_DEPLOYMENT_REPORT.md docs/reports/investigations/
mv README_SECRETS_MIGRATION.md docs/guides/setup/secrets-migration.md
mv README_STEP_6C_VALIDATION.md docs/guides/deployment/step-6c-validation.md
mv README-STEP4-HEALTH-FIELDS.txt docs/guides/development/
```

**Checklist:**
- [ ] All 11 config/setup files moved
- [ ] No files left in root from this category

---

## PHASE 4H: MOVE STATUS/SUMMARY REPORTS (10 minutes)

**Destination:** `docs/reports/` and `docs/guides/`

```bash
cd /Users/mbrew/Developer/carnivore-weekly

# Reports (historical)
mv FINAL_REPORT.md docs/reports/2026-01-03-final-report.md
mv EXECUTIVE_SUMMARY.md docs/reports/2026-01-02-executive-summary.md
mv DEPLOYMENT_STATUS.md docs/reports/
mv UNBLOCK_SUMMARY.txt docs/reports/
mv CREDENTIAL_MIGRATION_TRACKER.txt docs/reports/
mv SECRETS_MIGRATION_COMPLETE.txt docs/reports/
mv MIGRATIONS_INDEX.txt docs/reports/
mv FILES_TO_USE.txt docs/archive/reference-files.txt

# Writers related
mv WRITERS_EXECUTION_SUMMARY.md docs/reports/investigations/
mv WRITERS_FIX_CHECKLIST.txt docs/reports/investigations/
mv WRITERS_FIX_DELIVERABLES.md docs/reports/investigations/
mv WRITERS_MIGRATION_QUICK_START.md docs/guides/deployment/
mv WRITERS_SCHEMA_COMPARISON.md docs/specs/database-schema/
mv WRITERS_SCHEMA_DIAGRAM.md docs/specs/database-schema/
```

**Checklist:**
- [ ] All status/summary files moved
- [ ] No files left in root from this category

---

## PHASE 4I: MOVE SCRIPTS & TOOLS (20 minutes)

**Destination:** `docs/tools/`

This is the largest group. Move in subgroups:

```bash
cd /Users/mbrew/Developer/carnivore-weekly

# Test/Validation scripts
mv test-*.js docs/tools/test/ 2>/dev/null || true
mv test-*.mjs docs/tools/test/ 2>/dev/null || true
mv validate-*.js docs/tools/validate/ 2>/dev/null || true
mv validate-*.mjs docs/tools/validate/ 2>/dev/null || true

# Deploy scripts
mv deploy-*.js docs/tools/deploy/ 2>/dev/null || true
mv apply-*.js docs/tools/deploy/ 2>/dev/null || true
mv apply-*.sh docs/tools/deploy/ 2>/dev/null || true
mv verify-*.js docs/tools/deploy/ 2>/dev/null || true
mv APPLY_MIGRATIONS_LOCAL.sh docs/tools/deploy/
mv VERIFY_WRANGLER_SETUP.sh docs/tools/deploy/

# Debug/Utility scripts
mv debug-*.js docs/tools/test/ 2>/dev/null || true
mv debug-*.mjs docs/tools/test/ 2>/dev/null || true
mv run-*.js docs/tools/test/ 2>/dev/null || true
mv simple-*.js docs/tools/utility/ 2>/dev/null || true
mv simple-*.mjs docs/tools/utility/ 2>/dev/null || true
mv screenshot-*.js docs/tools/utility/ 2>/dev/null || true
mv screenshot-*.mjs docs/tools/utility/ 2>/dev/null || true
mv full-*.mjs docs/tools/utility/ 2>/dev/null || true

# Utility scripts
mv execute_*.js docs/tools/deploy/ 2>/dev/null || true
mv execute_*.sh docs/tools/deploy/ 2>/dev/null || true

# Special shell scripts
mv TEST_CALCULATOR_API.sh docs/tools/test/
mv ROLLBACK.sh docs/tools/deploy/
```

**Checklist:**
- [ ] Test scripts moved to docs/tools/test/
- [ ] Validate scripts moved to docs/tools/validate/
- [ ] Deploy/migration scripts moved to docs/tools/deploy/
- [ ] Utility scripts moved to docs/tools/utility/
- [ ] No executable scripts left in root

---

## PHASE 4J: VERIFY & CLEAN (10 minutes)

**Check what's left at root:**

```bash
cd /Users/mbrew/Developer/carnivore-weekly

# Count markdown files still at root
ls -1 *.md 2>/dev/null | wc -l
# Should be: 4-6 (CLAUDE.md, README.md, CHANGELOG.md, START_HERE.md, plus cleanup files)

# Count .txt files still at root
ls -1 *.txt 2>/dev/null | wc -l
# Should be: 0-2 (maybe .txt files you want to keep)

# List remaining non-code files at root
ls -1 *.{md,txt,sh} 2>/dev/null | sort

# List any orphaned files that need decisions
ls -lah / | grep -E "\.(js|mjs|sql)$" 2>/dev/null
```

**Checklist:**
- [ ] No loose test scripts in root
- [ ] No loose deploy scripts in root
- [ ] No validation scripts in root
- [ ] Only core files remain (CLAUDE.md, README.md, CHANGELOG.md, etc)
- [ ] No orphaned .js, .mjs, or .sh files at root

---

## PHASE 5: CREATE GIT COMMIT (10 minutes)

After all files are moved:

```bash
cd /Users/mbrew/Developer/carnivore-weekly

# Verify git sees all changes
git status

# Stage everything
git add -A

# Create commit with descriptive message
git commit -m "refactor: reorganize documentation and tools into logical hierarchy

- Create docs/guides/ for step-by-step procedures
- Create docs/specs/ for technical specifications
- Create docs/reports/ for findings and validations
- Create docs/decisions/ for strategic decisions archive
- Create docs/tools/ for development and deployment scripts
- Create docs/archive/ for historical reference materials
- Reduce root directory from 150+ files to ~10-15 essential files
- Maintain project-log/ as source of truth per CLAUDE.md
- Improve documentation discoverability and navigation"
```

**Checklist:**
- [ ] All changes staged
- [ ] Commit message clear and descriptive
- [ ] Commit created successfully

---

## PHASE 6: VERIFICATION (15 minutes)

**Test that everything still works:**

```bash
cd /Users/mbrew/Developer/carnivore-weekly

# 1. Verify directory structure
find docs -type d -maxdepth 2 | sort

# 2. Count files in each category
echo "Guides:" && find docs/guides -type f | wc -l
echo "Specs:" && find docs/specs -type f | wc -l
echo "Reports:" && find docs/reports -type f | wc -l
echo "Tools:" && find docs/tools -type f | wc -l
echo "Archive:" && find docs/archive -type f | wc -l

# 3. Verify project-log is untouched
ls -la docs/project-log/

# 4. Check for any broken references (manual check for now)
# Look for any files that reference other docs that may have moved

# 5. Verify root is clean
ls -1 *.md *.txt 2>/dev/null | grep -v "CLEANUP" | sort
```

**Checklist:**
- [ ] All docs/ subdirectories exist
- [ ] Files distributed to correct categories
- [ ] project-log/ untouched
- [ ] Root directory clean (only essential files)
- [ ] No broken references detected

---

## FINAL CLEANUP (5 minutes)

After verification is complete, clean up temporary documentation:

```bash
# Option 1: Keep cleanup plan files at root for reference
# (They help explain the new structure)

# Option 2: Move to docs/archive/ if you prefer them completely out of sight
# mv DOCUMENTATION_CLEANUP_PLAN.md docs/archive/
# mv CLEANUP_SUMMARY.md docs/archive/
# mv CLEANUP_BEFORE_AFTER.md docs/archive/
# mv CLEANUP_EXECUTION_CHECKLIST.md docs/archive/
```

**Recommendation:** Keep the 4 cleanup documentation files at root as a reference explaining the new structure. Delete them once everyone is familiar with it.

**Checklist:**
- [ ] Decide: Keep or archive cleanup files
- [ ] Update team on new structure (share CLEANUP_SUMMARY.md)
- [ ] Create documentation for any team-specific procedures

---

## SUCCESS CRITERIA

After completing all phases:

- [ ] Root directory contains only ~10-15 files
  - CLAUDE.md, README.md, CHANGELOG.md, START_HERE.md
  - package.json, package-lock.json, .env.example, .gitignore
  - Build configs (jest.config.js, tsconfig.json, etc)
  - Cleanup documentation (4 files explaining the restructure)

- [ ] All 150+ documentation files organized into docs/
  - docs/guides/ for how-to procedures
  - docs/specs/ for technical specifications
  - docs/reports/ for findings and validations
  - docs/decisions/ for strategic decisions
  - docs/tools/ for development scripts
  - docs/archive/ for historical materials

- [ ] Navigation and discoverability
  - Each subdirectory has README.md
  - Clear descriptions of what goes where
  - Easy to find information by category

- [ ] Integrity maintained
  - project-log/ completely untouched
  - No broken internal links
  - All historical files preserved
  - Git history intact

- [ ] Team ready
  - Team understands new structure
  - Know where to find different types of docs
  - Know where to add new docs going forward

---

## ESTIMATED TIMELINE

| Phase | Task | Time |
|-------|------|------|
| 1 | Review & Planning | 30 min |
| 2 | Create Directories | 15 min |
| 3 | Create Navigation | 20 min |
| 4A-J | Move Files (10 passes) | 100 min |
| 5 | Git Commit | 10 min |
| 6 | Verification | 15 min |
| Final | Cleanup & Communication | 5 min |
| **TOTAL** | | **~3.5 hours** |

Can be done in 1-2 hour sessions if split across multiple days.

---

## TROUBLESHOOTING

**If something goes wrong:**

1. **Lost a file?**
   - Check git history: `git log -p -- filename.md`
   - Files are staged but not yet committed - can restore

2. **Broken links?**
   - Search for old file names in docs
   - Update references to use new paths
   - Test links before final commit

3. **Need to undo?**
   - If not yet committed: `git reset --hard`
   - If already committed: `git revert HEAD` to undo
   - Or create new branch and try again

4. **Scripts not running?**
   - Check shebang line for shell scripts
   - Verify file has execute permission: `chmod +x filename.sh`
   - Update any CI/CD that referenced old locations

---

## QUESTIONS TO ANSWER FIRST

Before executing, make sure team agrees on:

1. **Delete any files?** (vs archive)
   - Example: Old test-debug files from December?
   - Recommendation: Archive everything, delete nothing

2. **"Living docs" to watch out for?**
   - Any files actively updated/referenced?
   - Recommendation: Check current-status.md and decisions.md usage

3. **Breaking changes?**
   - Any CI/CD scripts that reference root-level files?
   - Any external docs that link to these files?
   - Recommendation: Update CI/CD as part of this work

4. **Timeline?**
   - Can this be done all at once?
   - Or preferred to do incrementally?
   - Recommendation: Can be done in 1-2 hour sessions

---

## NEXT ACTIONS

- [ ] Get approval on plan from team
- [ ] Identify any special files or concerns
- [ ] Set time to execute (suggested: 2-3 hours uninterrupted)
- [ ] Create branch: `cleanup/documentation-organization`
- [ ] Execute phases in order
- [ ] Verify structure is correct
- [ ] Get team buy-in on new structure
- [ ] Commit to git
- [ ] Document lessons learned in project-log/


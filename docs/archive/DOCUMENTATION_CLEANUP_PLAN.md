# Documentation Cleanup Plan - Carnivore Weekly

**Status:** Planning Phase
**Date:** 2026-01-05
**Owner:** Quinn (Operations Manager)

---

## EXECUTIVE SUMMARY

The main project directory (`/carnivore-weekly/`) is scattered with **150+ markdown and documentation files** at the root level. These files need to be consolidated into a logical directory structure while preserving `docs/project-log/` as the source of truth for operational memory per CLAUDE.md guidelines.

**Current State:** Chaotic (files named things like `WRITERS_SCHEMA_FIX.md`, `MIGRATION_007_CHECKLIST.md`, `LEO_DIAGNOSIS_SUMMARY.md`, etc. scattered in root)

**Desired State:** Clean hierarchy with clear categories, root directory ~15 files max

---

## PART 1: CURRENT STATE ANALYSIS

### 1.1 File Count by Category

**Total Documentation Files in Root:** ~150+ markdown/text files

**Breakdown by Purpose:**

1. **Migration & Deployment Docs** (25+ files)
   - `MIGRATION_DEPLOYMENT_007.md`
   - `MIGRATION_EXECUTION_STATUS.md`
   - `MIGRATION_007_CHECKLIST.md`
   - `MIGRATION_007_INDEX.md`
   - `MIGRATION_SUMMARY_2026-01-05.md`
   - `DEPLOYMENT_SUMMARY_007.md`
   - `ASSESSMENT_MIGRATION_DEPLOYMENT.md`
   - `SUPABASE_MIGRATION_STATUS.md`
   - `WRITERS_SCHEMA_FIX.md`
   - `WRITERS_MIGRATION_QUICK_START.md`
   - And 15+ more migration-related files

2. **Database & Schema Documentation** (15+ files)
   - `SARA_MEMORY_STORAGE_ANALYSIS.md`
   - `WRITERS_SCHEMA_FIX_README.md`
   - `WRITERS_SCHEMA_COMPARISON.md`
   - `WRITERS_SCHEMA_DIAGRAM.md`
   - `LEO_FORM_DATA_DEBUG_GUIDE.md`
   - `FORM_DATA_PERSISTENCE_ANALYSIS.md`
   - And 8+ more

3. **Bug Fixes & Investigations** (20+ files)
   - `LEO_DIAGNOSIS_SUMMARY.md`
   - `LEO_INVESTIGATION_INDEX.md`
   - `LEO_CODE_SNIPPETS.js`
   - `LEO_QUICK_REFERENCE.md`
   - `API_CRITICAL_BUG_REPORT.md`
   - `BUG_FIX_DOCUMENTATION_INDEX.md`
   - And 14+ more

4. **Validation & Testing Reports** (25+ files)
   - `ACCESSIBILITY_VALIDATION_REPORT.md`
   - `VALIDATION_QUICKSTART.md`
   - `VALIDATION_REPORT_INDEX.md`
   - `COMPREHENSIVE_VALIDATION_RESULTS.md`
   - `BANNER_VALIDATION_REPORT.html`
   - `CASEY_VALIDATION_SUMMARY.md`
   - And 19+ more

5. **Implementation Guides & Checklists** (20+ files)
   - `IMPLEMENTATION_CHECKLIST.md`
   - `IMPLEMENTATION_REQUIREMENTS_STEP_6C.md`
   - `SECURITY_MIGRATION_CHECKLIST.md`
   - `A11Y_FIX_CHECKLIST.md`
   - `STEP4-IMPLEMENTATION-FINAL-REPORT.md`
   - And 15+ more

6. **Calculator-Specific Docs** (15+ files)
   - `CALCULATOR_FIXES_QUICK_START.md`
   - `CALCULATOR2_SESSION_FIX_README.md`
   - `CALCULATOR_QUICK_FIX_GUIDE.md`
   - `CALCULATOR_BRAND_VALIDATION_REQUIREMENTS.md`
   - And 11+ more

7. **Configuration & Setup Guides** (15+ files)
   - `SUPABASE_SECRETS_ACCESS_GUIDE.md`
   - `WRANGLER_SECRETS_QUICK_REF.md`
   - `STRIPE_TESTING_SETUP.md`
   - `ANALYTICS_DEPLOYMENT_INDEX.md`
   - And 11+ more

8. **Status & Summary Reports** (15+ files)
   - `FINAL_REPORT.md`
   - `EXECUTIVE_SUMMARY.md`
   - `QUICK_START.txt`
   - `DEPLOYMENT_STATUS.md`
   - `CASEY_FINDINGS_SUMMARY.md`
   - And 10+ more

9. **Entry Points/Reference Files** (5 files)
   - `START_HERE.md`
   - `CLAUDE.md` (already a key reference)
   - `README.md`
   - `CHANGELOG.md`
   - `QUICK_MIGRATION_REFERENCE.txt`

10. **Test/Debug Scripts** (20+ files)
    - `.js`, `.mjs`, `.sh` files mixed in root
    - Examples: `test-*.js`, `apply-*.js`, `debug-*.js`, `validate-*.js`

11. **One-Off Reports & Findings** (15+ files)
    - `CASEY-INSPECTION-SUMMARY.txt`
    - `BANNER_SIDE_BY_SIDE_COMPARISON.txt`
    - `HEIGHT_FIELD_CODE_SUMMARY.md`
    - `ALEX-HEIGHT-FIELD-QUICK-REFERENCE.md`
    - And 11+ more

12. **Deploy Scripts & Executables** (5 files)
    - `deploy-migration-007.js`
    - `execute_migration.sh`
    - `DEPLOY_NOW.txt`
    - `ROLLBACK.sh`
    - `apply-migration.js`

### 1.2 Current Directory Structure

```
/carnivore-weekly/
├── docs/
│   ├── project-log/               [SOURCE OF TRUTH - OPERATIONAL MEMORY]
│   │   ├── current-status.md
│   │   ├── decisions.md
│   │   ├── daily/
│   │   └── weekly/
│   └── [85 OTHER SUBDIRECTORIES]
├── agents/                         [Agent system files]
├── api/                           [API source code]
├── migrations/                    [SQL migration files]
├── [150+ markdown files at ROOT]  [PROBLEM AREA]
└── [Other functional directories]
```

### 1.3 Key Insights

- **project-log/** is correctly established as operational memory (per CLAUDE.md)
- **No organizational structure** for supporting documentation
- **File naming is inconsistent** (some UPPER_SNAKE, some kebab-case, some random)
- **Duplicate information** across multiple files (same content in different reports)
- **Scripts mixed with docs** - test/deploy scripts at root level
- **Outdated files** remain alongside current ones (unclear which to trust)
- **No archive mechanism** - just accumulation

---

## PART 2: DESIRED STATE

### 2.1 Target Directory Structure

```
/carnivore-weekly/
├── docs/
│   ├── project-log/                    [SOURCE OF TRUTH]
│   │   ├── README.md
│   │   ├── current-status.md
│   │   ├── decisions.md
│   │   ├── daily/
│   │   │   └── [Daily work logs]
│   │   └── weekly/
│   │       └── [Weekly summaries]
│   │
│   ├── guides/                         [NEW: How-to references]
│   │   ├── README.md
│   │   ├── setup/
│   │   │   ├── supabase-setup.md
│   │   │   ├── stripe-testing.md
│   │   │   ├── wrangler-secrets.md
│   │   │   └── analytics-setup.md
│   │   ├── development/
│   │   │   ├── calculator-validation.md
│   │   │   ├── form-testing.md
│   │   │   └── database-debugging.md
│   │   └── deployment/
│   │       ├── migration-execution.md
│   │       ├── production-checklist.md
│   │       └── rollback-procedures.md
│   │
│   ├── specs/                          [NEW: Technical specifications]
│   │   ├── README.md
│   │   ├── database-schema/
│   │   │   ├── writers-schema.md
│   │   │   ├── sara-memory-tables.md
│   │   │   └── schema-diagrams.md
│   │   ├── features/
│   │   │   ├── calculator-feature.md
│   │   │   ├── assessment-migration.md
│   │   │   └── form-persistence.md
│   │   └── architecture/
│   │       ├── state-management.md
│   │       ├── api-design.md
│   │       └── deployment-architecture.md
│   │
│   ├── reports/                        [NEW: Analysis and findings]
│   │   ├── README.md
│   │   ├── validations/
│   │   │   ├── accessibility-report.md
│   │   │   ├── banner-validation.md
│   │   │   ├── responsive-validation.md
│   │   │   └── [validation archives]
│   │   ├── investigations/
│   │   │   ├── leo-investigation-index.md
│   │   │   ├── api-bug-analysis.md
│   │   │   ├── form-data-persistence.md
│   │   │   └── [investigation archives]
│   │   └── migrations/
│   │       ├── migration-007-report.md
│   │       ├── assessment-migration-report.md
│   │       └── [migration archives]
│   │
│   ├── decisions/                      [NEW: Strategic decisions archive]
│   │   ├── README.md
│   │   ├── architecture/
│   │   ├── feature-design/
│   │   └── infrastructure/
│   │
│   ├── tools/                          [NEW: Scripts for development]
│   │   ├── README.md
│   │   ├── validate/
│   │   │   ├── validate-calculator.mjs
│   │   │   ├── validate-form.js
│   │   │   └── validate-accessibility.js
│   │   ├── deploy/
│   │   │   ├── deploy-migration.js
│   │   │   ├── verify-deployment.js
│   │   │   └── rollback.sh
│   │   └── test/
│   │       ├── test-calculator.js
│   │       ├── test-form.js
│   │       └── test-payment-flow.js
│   │
│   └── archive/                        [NEW: Historical reference]
│       ├── README.md
│       ├── 2026-01/
│       │   ├── step-4-height-fields/
│       │   ├── accessibility-fixes/
│       │   └── [etc]
│       └── [organized by date/topic]
│
├── [Root level ONLY essential files]
│   ├── CLAUDE.md                       [Agent system reference]
│   ├── README.md                       [Project overview]
│   ├── CHANGELOG.md                    [Release history]
│   ├── package.json                    [Node config]
│   ├── .env.example                    [Configuration template]
│   └── [Functional directories]
└── [All other source/config directories unchanged]
```

### 2.2 Principles

1. **project-log/** remains untouched - it's the operational memory
2. **Guides/** = "How do I do X?" (procedural, step-by-step)
3. **Specs/** = "What should this system do?" (requirements, design, architecture)
4. **Reports/** = "What did we learn?" (findings, investigations, validations)
5. **Decisions/** = "Why did we choose Y?" (strategic decisions, rationale)
6. **Tools/** = "Scripts for dev/deploy" (not in root, in docs for reference)
7. **Archive/** = "Historical stuff we might need" (organized by date/topic)
8. **Root level** = Only critical files (CLAUDE.md, README, CHANGELOG, configs)

---

## PART 3: SPECIFIC FILE MAPPINGS

### 3.1 Migration & Deployment Files → docs/reports/migrations/

**Action: MOVE** (not delete, preserve institutional knowledge)

```
MIGRATION_DEPLOYMENT_007.md              → docs/reports/migrations/2026-01-05-migration-007-deployment.md
MIGRATION_EXECUTION_STATUS.md            → docs/reports/migrations/2026-01-05-migration-execution-status.md
MIGRATION_007_CHECKLIST.md               → docs/reports/migrations/2026-01-05-migration-007-checklist.md
MIGRATION_007_INDEX.md                   → docs/reports/migrations/2026-01-05-migration-007-index.md
MIGRATION_SUMMARY_2026-01-05.md          → docs/reports/migrations/2026-01-05-migration-summary.md
DEPLOYMENT_SUMMARY_007.md                → docs/reports/migrations/2026-01-05-deployment-summary.md
ASSESSMENT_MIGRATION_DEPLOYMENT.md       → docs/reports/migrations/2026-01-04-assessment-migration-deployment.md
ASSESSMENT_MIGRATION_STATUS.md           → docs/reports/migrations/2026-01-04-assessment-migration-status.md
ASSESSMENT_MIGRATION_README.md           → docs/guides/deployment/assessment-migration-guide.md
ASSESSMENT_DEPLOYMENT_CHECKLIST.md       → docs/reports/migrations/2026-01-04-assessment-deployment-checklist.md
ASSESSMENT_DEPLOYMENT_INDEX.md           → docs/reports/migrations/2026-01-04-assessment-deployment-index.md
ASSESSMENT_QUICK_START.md                → docs/guides/deployment/assessment-quick-start.md
ASSESSMENT_MIGRATION_EXECUTION_REPORT.txt → docs/reports/migrations/2026-01-04-assessment-migration-execution-report.txt
SUPABASE_MIGRATION_STATUS.md             → docs/reports/migrations/supabase-migration-status.md
SUPABASE_MIGRATION_COMBINED.sql          → docs/specs/database-schema/migrations.sql (reference only)
SUPABASE_MIGRATION_INSTRUCTIONS.md       → docs/guides/setup/supabase-migration.md
MIGRATION_EXECUTION_GUIDE.md             → docs/guides/deployment/migration-execution.md
MIGRATION_STATUS.md                      → docs/reports/migrations/migration-status.md
QUICK_MIGRATION_REFERENCE.txt            → docs/guides/deployment/quick-migration-reference.txt
QUICK_MIGRATION_REFERENCE.md             → docs/guides/deployment/quick-migration-reference.md
DEPLOYMENT_BACKUP_SUMMARY.md             → docs/reports/migrations/deployment-backup-summary.md
```

**Count:** 20 files → docs/reports/migrations/ and docs/guides/deployment/

---

### 3.2 Database & Schema Files → docs/specs/database-schema/

**Action: MOVE**

```
SARA_MEMORY_STORAGE_ANALYSIS.md          → docs/specs/database-schema/sara-memory-storage-analysis.md
SARA_MEMORY_QUICK_REFERENCE.sql          → docs/specs/database-schema/sara-memory-quick-reference.sql
WRITERS_SCHEMA_FIX.md                    → docs/specs/database-schema/writers-schema-fix.md
WRITERS_SCHEMA_FIX_README.md             → docs/specs/database-schema/writers-schema-fix-readme.md
WRITERS_SCHEMA_COMPARISON.md             → docs/specs/database-schema/writers-schema-comparison.md
WRITERS_SCHEMA_DIAGRAM.md                → docs/specs/database-schema/writers-schema-diagram.md
WRITERS_SCHEMA_FIX_INDEX.md              → docs/specs/database-schema/writers-schema-fix-index.md
WRITERS_QUICK_REFERENCE.sql              → docs/specs/database-schema/writers-quick-reference.sql
FORM_DATA_PERSISTENCE_ANALYSIS.md        → docs/specs/features/form-data-persistence.md
LEO_FORM_DATA_DEBUG_GUIDE.md             → docs/guides/development/form-data-debugging.md
DATABASE_BLUEPRINT_FILES.txt             → docs/specs/database-schema/database-blueprint-files.txt
DATABASE_UNBLOCK_STEPS.md                → docs/guides/development/database-unblock-steps.md
CALCULATOR2_SESSION_DIAGNOSIS.md         → docs/specs/features/calculator-session-management.md
```

**Count:** 13 files → docs/specs/database-schema/ and docs/guides/

---

### 3.3 Bug Fix & Investigation Files → docs/reports/investigations/

**Action: MOVE**

```
LEO_DIAGNOSIS_SUMMARY.md                 → docs/reports/investigations/2026-01-04-leo-diagnosis-summary.md
LEO_INVESTIGATION_INDEX.md               → docs/reports/investigations/leo-investigation-index.md
LEO_CODE_SNIPPETS.js                     → docs/reports/investigations/leo-code-snippets.js
LEO_QUICK_REFERENCE.md                   → docs/reports/investigations/leo-quick-reference.md
LEO_DIAGNOSTICS.sql                      → docs/reports/investigations/leo-diagnostics.sql
LEO_STEP2_FORM_PERSISTENCE_DIAGNOSIS.md  → docs/reports/investigations/leo-step2-form-persistence-diagnosis.md
LEO_STEP2_CODE_ANALYSIS.md               → docs/reports/investigations/leo-step2-code-analysis.md
LEO_STEP2_DEBUG_CHECKLIST.md             → docs/reports/investigations/leo-step2-debug-checklist.md
LEO_IMPLEMENTATION_SUMMARY.md            → docs/reports/investigations/leo-implementation-summary.md
LEO_STATE_FIX_DELIVERY.md                → docs/reports/investigations/leo-state-fix-delivery.md
LEO_CALCULATOR_API_PATCH.md              → docs/reports/investigations/leo-calculator-api-patch.md
LEO_MIGRATION_REPORT.txt                 → docs/reports/investigations/leo-migration-report.txt
LEO_README.md                            → docs/reports/investigations/leo-readme.md
API_CRITICAL_BUG_REPORT.md               → docs/reports/investigations/api-critical-bug-report.md
API_PATCH_STEP4_FIX.js                   → docs/reports/investigations/api-patch-step4-fix.js
BUG_FIX_DOCUMENTATION_INDEX.md           → docs/reports/investigations/bug-fix-documentation-index.md
DEBUG_QUICK_REFERENCE.md                 → docs/guides/development/debug-quick-reference.md
FIX_SUMMARY_2026-01-03.md                → docs/reports/investigations/2026-01-03-fix-summary.md
FIX_SUMMARY.txt                          → docs/reports/investigations/fix-summary.txt
QUICK_FIX_GUIDE.md                       → docs/guides/development/quick-fix-guide.md
QUICK_FIX_REFERENCE.md                   → docs/guides/development/quick-fix-reference.md
FIXES_INDEX.md                           → docs/reports/investigations/fixes-index.md
```

**Count:** 22 files → docs/reports/investigations/

---

### 3.4 Validation & Testing Files → docs/reports/validations/

**Action: MOVE**

```
ACCESSIBILITY_VALIDATION_REPORT.md       → docs/reports/validations/accessibility-validation-report.md
ACCESSIBILITY_REPORT_INDEX.md            → docs/reports/validations/accessibility-report-index.md
ACCESSIBILITY_FIXES.md                   → docs/reports/validations/accessibility-fixes.md
ACCESSIBILITY_TEST_RESULTS.txt           → docs/reports/validations/accessibility-test-results.txt
A11Y_FIX_CHECKLIST.md                    → docs/reports/validations/a11y-fix-checklist.md
A11Y_QUICK_SUMMARY.md                    → docs/reports/validations/a11y-quick-summary.md
COMPREHENSIVE_VALIDATION_RESULTS.md      → docs/reports/validations/comprehensive-validation-results.md
VALIDATION_QUICKSTART.md                 → docs/guides/development/validation-quickstart.md
VALIDATION_REPORT_INDEX.md               → docs/reports/validations/validation-report-index.md
VALIDATION_REPORT.md                     → docs/reports/validations/validation-report.md
VALIDATION_COMPLETE.txt                  → docs/reports/validations/validation-complete.txt
VALIDATION_SUMMARY_DASHBOARD.txt         → docs/reports/validations/validation-summary-dashboard.txt
VALIDATION_ARTIFACTS_INDEX.txt           → docs/reports/validations/validation-artifacts-index.txt
VALIDATION-FINDINGS.md                   → docs/reports/validations/validation-findings.md
VALIDATION_DECISION.txt                  → docs/reports/validations/validation-decision.txt
CASEY_VALIDATION_SUMMARY.md              → docs/reports/validations/casey-validation-summary.md
CASEY_VALIDATION_FINDINGS.md             → docs/reports/validations/casey-validation-findings.md
CASEY_VALIDATION_REPORT.txt              → docs/reports/validations/casey-validation-report.txt
CASEY_FINDINGS_SUMMARY.md                → docs/reports/validations/casey-findings-summary.md
BANNER_VALIDATION_REPORT.html            → docs/reports/validations/banner-validation-report.html
BANNER_CONSISTENCY_REPORT.md             → docs/reports/validations/banner-consistency-report.md
BANNER_ELEMENT_CHECKLIST.md              → docs/reports/validations/banner-element-checklist.md
BANNER_QUICK_VALIDATION.md               → docs/reports/validations/banner-quick-validation.md
BANNER_SIDE_BY_SIDE_COMPARISON.txt       → docs/reports/validations/banner-side-by-side-comparison.txt
BANNER_VALIDATION_INDEX.md               → docs/reports/validations/banner-validation-index.md
BANNER_VALIDATION_MANIFEST.txt           → docs/reports/validations/banner-validation-manifest.txt
JORDAN_VALIDATION_SUMMARY.md             → docs/reports/validations/jordan-validation-summary.md
RESPONSIVE-VALIDATION-SUMMARY.txt        → docs/reports/validations/responsive-validation-summary.txt
visual-validation-responsive.md          → docs/reports/validations/visual-validation-responsive.md
COMPREHENSIVE_VALIDATION_RESULTS.md      → docs/reports/validations/comprehensive-validation-results.md
```

**Count:** 30 files → docs/reports/validations/

---

### 3.5 Calculator Documentation → docs/specs/features/ and docs/guides/development/

**Action: MOVE**

```
CALCULATOR_FIXES_QUICK_START.md          → docs/guides/development/calculator-fixes-quick-start.md
CALCULATOR2_SESSION_FIX_README.md        → docs/guides/development/calculator-session-fix.md
CALCULATOR_QUICK_FIX_GUIDE.md            → docs/guides/development/calculator-quick-fix-guide.md
CALCULATOR_BRAND_VALIDATION_REQUIREMENTS.md → docs/specs/features/calculator-brand-validation.md
CALCULATOR_BRAND_COLOR_SPEC.md           → docs/specs/features/calculator-brand-color-spec.md
CALCULATOR_FIXES_SUMMARY.md              → docs/reports/investigations/calculator-fixes-summary.md
CALCULATOR2_INDEX.md                     → docs/specs/features/calculator2-index.md
CALCULATOR2_QUICKFIX.md                  → docs/guides/development/calculator2-quickfix.md
CALCULATOR2_RLS_UPDATE.sql               → docs/specs/database-schema/calculator2-rls-update.sql
CALCULATOR_API_DELIVERY.txt              → docs/specs/features/calculator-api-delivery.txt
HEIGHT_FIELD_CODE_SUMMARY.md             → docs/reports/investigations/height-field-code-summary.md
HEIGHT_FIELD_IMPLEMENTATION.md           → docs/specs/features/height-field-implementation.md
HEIGHT-FIELD-VALIDATION-INDEX.md         → docs/reports/validations/height-field-validation.md
STEP4_HEIGHT_FIELD_COMPLETE.md           → docs/reports/investigations/step4-height-field-complete.md
ALEX-HEIGHT-FIELD-QUICK-REFERENCE.md     → docs/guides/development/height-field-quick-reference.md
STEP4-HEALTH-FIELDS-FOR-CASEY.md         → docs/specs/features/step4-health-fields.md
STEP4-HEALTH-FIELDS-IMPLEMENTATION.md    → docs/specs/features/step4-health-fields-implementation.md
STEP4-HEALTH-QUICK-REFERENCE.md          → docs/guides/development/step4-health-quick-reference.md
STEP4-HEALTH-CODE-SNIPPETS.md            → docs/reports/investigations/step4-health-code-snippets.md
STEP4-HEALTH-FIELDS-INDEX.md             → docs/specs/features/step4-health-fields-index.md
STEP4-IMPLEMENTATION-FINAL-REPORT.md     → docs/reports/investigations/step4-implementation-final-report.md
STEP4-MANIFEST.txt                       → docs/reports/investigations/step4-manifest.txt
```

**Count:** 22 files → docs/specs/features/ and docs/guides/development/

---

### 3.6 Implementation & Specification Files → docs/specs/

**Action: MOVE**

```
IMPLEMENTATION_CHECKLIST.md              → docs/guides/development/implementation-checklist.md
IMPLEMENTATION_REQUIREMENTS_STEP_6C.md   → docs/specs/features/implementation-requirements-step-6c.md
IMPLEMENTATION_GUIDE_STATE_FIX.md        → docs/guides/development/implementation-guide-state-fix.md
SECURITY_MIGRATION_CHECKLIST.md          → docs/guides/deployment/security-migration-checklist.md
STATE_MANAGEMENT_ARCHITECTURE_FIX.md     → docs/specs/architecture/state-management-fix.md
STATE_FIX_DOCUMENTATION_INDEX.md         → docs/reports/investigations/state-fix-documentation-index.md
STATE_FIX_SUMMARY.txt                    → docs/reports/investigations/state-fix-summary.txt
STEP_6A_DELIVERABLE.md                   → docs/reports/investigations/step-6a-deliverable.md
STEP_6C_DELIVERABLES.txt                 → docs/reports/investigations/step-6c-deliverables.txt
STEP_6C_EXECUTIVE_SUMMARY.md             → docs/reports/investigations/step-6c-executive-summary.md
STEP_6C_VISUAL_VALIDATION_REPORT.md      → docs/reports/validations/step-6c-visual-validation-report.md
STEP6B_COMPLETION_SUMMARY.md             → docs/reports/investigations/step6b-completion-summary.md
STEP6B_VERIFICATION.txt                  → docs/reports/investigations/step6b-verification.txt
STORY_3_2_IMPLEMENTATION.md              → docs/specs/features/story-3-2-implementation.md
STORY_3_2_VERIFICATION.md                → docs/reports/validations/story-3-2-verification.md
EXECUTION_CHECKLIST.md                   → docs/guides/deployment/execution-checklist.md
TRACK3-COMPLETION-SUMMARY.md             → docs/reports/investigations/track3-completion-summary.md
```

**Count:** 17 files → docs/specs/ and docs/guides/

---

### 3.7 Configuration & Setup Guides → docs/guides/setup/

**Action: MOVE**

```
SUPABASE_SECRETS_ACCESS_GUIDE.md         → docs/guides/setup/supabase-secrets-access.md
WRANGLER_SECRETS_QUICK_REF.md            → docs/guides/setup/wrangler-secrets.md
STRIPE_TESTING_SETUP.md                  → docs/guides/setup/stripe-testing.md
ANALYTICS_DEPLOYMENT_INDEX.md            → docs/guides/setup/analytics-deployment-index.md
ANALYTICS_DEPLOYMENT_CHECKLIST.md        → docs/guides/setup/analytics-deployment-checklist.md
ANALYTICS_DEPLOYMENT_SUMMARY.txt         → docs/guides/setup/analytics-deployment-summary.txt
ANALYTICS_INFRASTRUCTURE.md              → docs/guides/setup/analytics-infrastructure.md
ANALYTICS_DEPLOYMENT_REPORT.md           → docs/reports/investigations/analytics-deployment-report.md
REPORT_GENERATION_SETUP.md               → docs/guides/setup/report-generation.md
PAYMENT_FLOW_STATUS.md                   → docs/specs/features/payment-flow-status.md
```

**Count:** 10 files → docs/guides/setup/

---

### 3.8 Status & Summary Reports → docs/reports/ (root)

**Action: MOVE** (historical references)

```
FINAL_REPORT.md                          → docs/reports/2026-01-03-final-report.md
EXECUTIVE_SUMMARY.md                     → docs/reports/2026-01-02-executive-summary.md
DEPLOYMENT_STATUS.md                     → docs/reports/deployment-status.md
QUICK_START.txt                          → docs/guides/quick-start.txt (or keep as reference)
FILES_TO_USE.txt                         → docs/archive/reference-files.txt
MIGRATIONS_INDEX.txt                     → docs/reports/migrations-index.txt
UNBLOCK_SUMMARY.txt                      → docs/reports/unblock-summary.txt
CREDENTIAL_MIGRATION_TRACKER.txt         → docs/reports/credential-migration-tracker.txt
SECRETS_MIGRATION_COMPLETE.txt           → docs/reports/secrets-migration-complete.txt
README_SECRETS_MIGRATION.md              → docs/guides/setup/secrets-migration.md
README_STEP_6C_VALIDATION.md             → docs/guides/validation/step-6c-validation.md
README-STEP4-HEALTH-FIELDS.txt           → docs/guides/development/step4-health-fields.txt
WRITERS_EXECUTION_SUMMARY.md             → docs/reports/investigations/writers-execution-summary.md
WRITERS_FIX_CHECKLIST.txt                → docs/reports/investigations/writers-fix-checklist.txt
WRITERS_FIX_DELIVERABLES.md              → docs/reports/investigations/writers-fix-deliverables.md
```

**Count:** 15 files → docs/reports/

---

### 3.9 Entry Point Files - KEEP AT ROOT LEVEL

**Action: KEEP** (with minor updates if needed)

```
CLAUDE.md                                → /  (keep as-is, critical reference)
README.md                                → /  (keep as project overview)
CHANGELOG.md                             → /  (keep for release history)
START_HERE.md                            → /  (keep as entry point OR move to docs/guides/)
```

**Decision:** Keep CLAUDE.md, README.md, CHANGELOG.md at root. Consider moving START_HERE.md to docs/ if it's redundant with docs/guides/quick-start.md

---

### 3.10 Scripts & Executables → docs/tools/

**Action: MOVE or CONSOLIDATE**

```
Test/Validation Scripts (.js, .mjs):
test-*.js, test-*.mjs                    → docs/tools/test/  (organize by purpose)
validate-*.js                            → docs/tools/validate/
debug-*.js, debug-*.mjs                  → docs/tools/test/ (debug folder, or combine)
run-*.js                                 → docs/tools/test/

Deployment Scripts:
deploy-*.js                              → docs/tools/deploy/
apply-*.js, apply-*.sh                   → docs/tools/deploy/
execute_*.js, execute_*.sh               → docs/tools/deploy/
verify-*.js                              → docs/tools/deploy/

Server/Demo Scripts:
simple-report-server.js                  → docs/tools/utility/
screenshot-*.mjs                         → docs/tools/utility/
```

**Decision:** Keep core build tools (root-level package.json scripts) in root. Move dev/test/validation scripts to docs/tools/ for organization.

**Count:** ~20+ scripts → docs/tools/

---

### 3.11 Data/Config Files → Keep in functional directories

**Action: KEEP** (these have specific purposes)

```
.env, .env.example                       → keep at root (config)
design-tokens.json                       → keep at root or move to /api/config
.structural-validation-config.json       → keep at root (build config)
apply-migrations-local.js                → Consider moving to docs/tools/deploy/
APPLY_MIGRATIONS_LOCAL.sh                → docs/tools/deploy/
HTML/CSS/etc files at root               → identify purpose, move if truly orphaned
```

---

### 3.12 Files to ARCHIVE or REVIEW

**Action: CAREFUL REVIEW BEFORE MOVING**

These files might be outdated or superseded:

```
STATUS FILES (Check if still relevant):
- DEPLOYMENT_STATUS.md              (is this replaced by current-status.md?)
- MIGRATION_STATUS.md               (is this replaced by recent migration reports?)
- SUPABASE_MIGRATION_STATUS.md      (is this completed?)

REPORT FILES (Keep but archive):
- OLD reports from early January     → docs/archive/2026-01-XX/
- STEP 4, STEP 6 reports            → docs/archive/features/step-4-height-fields/
- Deprecated validation reports      → docs/archive/validations/

TEST FILES (might not be needed):
- test-debug-height.png             → delete if not used
- full-modal-*.mjs                  → docs/tools/test/ or delete if not used
- view-fresh-form.mjs               → docs/tools/test/ or delete

ONE-OFF SCRIPTS (might not be needed):
- casey-*.js files                  → docs/archive/ if not actively used
- simple-height-test.mjs            → docs/tools/test/ or archive
```

---

## PART 4: IMPLEMENTATION ROADMAP

### Phase 1: Preparation (No Changes Yet)
1. Review this plan with team
2. Identify any files that should be deleted vs. archived
3. Identify any files that are "living docs" (updated regularly)

### Phase 2: Directory Creation
```bash
# Create new structure
mkdir -p docs/guides/{setup,development,deployment}
mkdir -p docs/specs/{database-schema,features,architecture}
mkdir -p docs/reports/{validations,investigations,migrations}
mkdir -p docs/decisions/{architecture,feature-design,infrastructure}
mkdir -p docs/tools/{validate,deploy,test,utility}
mkdir -p docs/archive/2026-01
```

### Phase 3: File Migration (One Category at a Time)

**Suggested Order:**
1. Migration docs (most recent, most organized)
2. Database/Schema docs
3. Investigation docs
4. Validation docs
5. Calculator-specific docs
6. Configuration guides
7. Status/summary reports
8. Scripts and tools
9. One-off/historical files

### Phase 4: Create Navigation

**Create README files for each new directory:**
- `docs/guides/README.md` - Index of all guides by category
- `docs/specs/README.md` - Index of all specifications
- `docs/reports/README.md` - Index of all reports and findings
- `docs/tools/README.md` - Index of all development tools
- `docs/archive/README.md` - Index of archived materials

### Phase 5: Cleanup Root Directory

**Final root directory should only contain:**
```
/
├── CLAUDE.md                  (agent system reference)
├── README.md                  (project overview)
├── CHANGELOG.md               (release history)
├── package.json               (node config)
├── package-lock.json
├── .env.example               (config template)
├── .gitignore
├── tsconfig.json / jest.config.js / etc (build config)
├── docs/                      (all documentation)
├── api/                       (source code)
├── migrations/                (SQL migrations)
├── agents/                    (agent system)
├── public/                    (static files)
├── tests/                     (test suite)
├── node_modules/              (dependencies)
└── [other functional directories]
```

---

## PART 5: SPECIAL CONSIDERATIONS

### 5.1 Files with External References
- Check if any files have internal links (`[link](./FILENAME.md)`) that will break
- Plan to update cross-references after move
- Option: Use relative paths that still work after move

### 5.2 "Living Documents" to Keep Updated
These files might be actively used and updated:

- `CLAUDE.md` - Agent system documentation (keep at root, update as needed)
- `current-status.md` in project-log/ - (already in right place)
- `decisions.md` in project-log/ - (already in right place)

### 5.3 Memory Integration with project-log/

Per CLAUDE.md requirements:
- project-log/ is the source of truth for operational decisions
- docs/reports/ are supporting documentation
- docs/decisions/ can be an archive of past decisions (referenced in decisions.md)
- No conflicts - project-log/ stays as single source of truth

### 5.4 Agents' Perspective
- **Leo** uses database schema docs (will reference docs/specs/database-schema/)
- **Casey** uses visual/design specs (will reference docs/specs/features/)
- **Jordan** uses deployment guides (will reference docs/guides/deployment/)
- All agents still check docs/project-log/ for operational memory

---

## PART 6: SUCCESS CRITERIA

### Before Cleanup
- [ ] 150+ files scattered in root directory
- [ ] No clear organizational structure
- [ ] Difficult to find specific information
- [ ] Unclear which documents are current vs. historical

### After Cleanup
- [ ] Root directory contains only ~10-15 essential files
- [ ] Clear directory hierarchy by purpose (guides, specs, reports, etc.)
- [ ] Easy to locate information by category
- [ ] Historical files properly archived by date
- [ ] project-log/ remains untouched as source of truth
- [ ] Cross-references updated or validated
- [ ] README files created for each major directory
- [ ] Archive/ directory organized by date and topic

---

## NEXT STEPS

1. **Review this plan** - Is the proposed structure acceptable?
2. **Confirm file classifications** - Are any files misclassified?
3. **Identify "living docs"** - Which files are actively maintained?
4. **Approve archive strategy** - What should be deleted vs. archived?
5. **Execute Phase 1-2** - Create directory structure
6. **Execute Phase 3** - Begin file migration (one category at a time)
7. **Validate and test** - Ensure no broken links or missing references
8. **Create summary** - Document the new structure for team

---

## APPENDIX: Quick File Count Summary

| Category | Count | Target Directory |
|----------|-------|------------------|
| Migrations/Deployments | 20 | docs/reports/migrations/ + docs/guides/deployment/ |
| Database/Schema | 13 | docs/specs/database-schema/ |
| Bug Fixes/Investigations | 22 | docs/reports/investigations/ |
| Validations/Testing | 30 | docs/reports/validations/ |
| Calculator Docs | 22 | docs/specs/features/ + docs/guides/development/ |
| Implementations | 17 | docs/specs/ + docs/guides/ |
| Configuration/Setup | 10 | docs/guides/setup/ |
| Status/Summaries | 15 | docs/reports/ |
| Scripts/Tools | 20+ | docs/tools/ |
| Entry Points (KEEP) | 4 | root or docs/ |
| **Total Relocatable** | **~170** | **docs/** |
| **Root Level After** | **~10-15** | **root** |


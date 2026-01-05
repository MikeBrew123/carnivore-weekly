# Documentation Cleanup - Before & After Visual

---

## CURRENT STATE (BEFORE)

```
/carnivore-weekly/
├── 150+ files at ROOT LEVEL:
│
├── Migration Files (scattered):
│   ├── MIGRATION_DEPLOYMENT_007.md
│   ├── MIGRATION_EXECUTION_STATUS.md
│   ├── MIGRATION_007_CHECKLIST.md
│   ├── MIGRATION_007_INDEX.md
│   ├── MIGRATION_SUMMARY_2026-01-05.md
│   ├── DEPLOYMENT_SUMMARY_007.md
│   ├── ASSESSMENT_MIGRATION_DEPLOYMENT.md
│   ├── SUPABASE_MIGRATION_STATUS.md
│   └── ... 12 more migration files
│
├── Database Files (scattered):
│   ├── SARA_MEMORY_STORAGE_ANALYSIS.md
│   ├── WRITERS_SCHEMA_FIX.md
│   ├── WRITERS_SCHEMA_COMPARISON.md
│   ├── WRITERS_SCHEMA_DIAGRAM.md
│   ├── FORM_DATA_PERSISTENCE_ANALYSIS.md
│   ├── LEO_FORM_DATA_DEBUG_GUIDE.md
│   └── ... 7 more database files
│
├── Investigation Files (scattered):
│   ├── LEO_DIAGNOSIS_SUMMARY.md
│   ├── LEO_INVESTIGATION_INDEX.md
│   ├── API_CRITICAL_BUG_REPORT.md
│   ├── BUG_FIX_DOCUMENTATION_INDEX.md
│   ├── DEBUG_QUICK_REFERENCE.md
│   └── ... 17 more investigation files
│
├── Validation Files (scattered):
│   ├── ACCESSIBILITY_VALIDATION_REPORT.md
│   ├── ACCESSIBILITY_FIXES.md
│   ├── COMPREHENSIVE_VALIDATION_RESULTS.md
│   ├── CASEY_VALIDATION_SUMMARY.md
│   ├── BANNER_VALIDATION_REPORT.html
│   └── ... 25 more validation files
│
├── Calculator Files (scattered):
│   ├── CALCULATOR_FIXES_QUICK_START.md
│   ├── CALCULATOR_QUICK_FIX_GUIDE.md
│   ├── CALCULATOR_BRAND_VALIDATION_REQUIREMENTS.md
│   ├── HEIGHT_FIELD_CODE_SUMMARY.md
│   ├── STEP4_HEIGHT_FIELD_COMPLETE.md
│   └── ... 17 more calculator files
│
├── Config/Setup Files (scattered):
│   ├── SUPABASE_SECRETS_ACCESS_GUIDE.md
│   ├── WRANGLER_SECRETS_QUICK_REF.md
│   ├── STRIPE_TESTING_SETUP.md
│   └── ... 7 more config files
│
├── Script Files (scattered):
│   ├── test-calculator.js
│   ├── validate-calculator.mjs
│   ├── deploy-migration-007.js
│   ├── apply-migration.sh
│   ├── verify-migration-007.js
│   └── ... 15+ more script files
│
├── Status/Summary Files:
│   ├── FINAL_REPORT.md
│   ├── EXECUTIVE_SUMMARY.md
│   ├── DEPLOYMENT_STATUS.md
│   └── ... 12 more summary files
│
├── CLAUDE.md               [Key reference]
├── README.md               [Project overview]
├── CHANGELOG.md            [Release history]
├── START_HERE.md
├── package.json
├── jest.config.js
├── tsconfig.json
├── .env.example
├── .gitignore
│
├── docs/
│   └── project-log/        [Good - operational memory]
│       ├── current-status.md
│       ├── decisions.md
│       ├── daily/
│       └── weekly/
│
├── agents/
├── api/
├── migrations/
├── public/
├── tests/
├── node_modules/
└── [Other functional directories]
```

**Problem:** Finding anything requires scrolling through 150+ files

---

## TARGET STATE (AFTER)

```
/carnivore-weekly/
├── CLAUDE.md               [Agent system - KEEP]
├── README.md               [Project overview - KEEP]
├── CHANGELOG.md            [Release history - KEEP]
├── START_HERE.md           [Entry point - KEEP]
├── package.json
├── jest.config.js
├── tsconfig.json
├── .env.example
├── .gitignore
│
├── docs/
│   ├── project-log/        [SOURCE OF TRUTH - operational memory]
│   │   ├── README.md
│   │   ├── current-status.md
│   │   ├── decisions.md
│   │   ├── daily/
│   │   │   ├── TEMPLATE.md
│   │   │   ├── 2026-01-03.md
│   │   │   ├── 2026-01-04.md
│   │   │   └── 2026-01-05.md
│   │   └── weekly/
│   │       └── weekly-knowledge-report.md
│   │
│   ├── guides/             [HOW-TO: Step-by-step procedures]
│   │   ├── README.md
│   │   ├── setup/
│   │   │   ├── supabase-setup.md
│   │   │   ├── supabase-secrets-access.md
│   │   │   ├── stripe-testing.md
│   │   │   ├── wrangler-secrets.md
│   │   │   ├── analytics-deployment.md
│   │   │   ├── secrets-migration.md
│   │   │   └── report-generation.md
│   │   ├── development/
│   │   │   ├── calculator-fixes-quick-start.md
│   │   │   ├── calculator-session-fix.md
│   │   │   ├── calculator-quick-fix-guide.md
│   │   │   ├── form-data-debugging.md
│   │   │   ├── form-testing.md
│   │   │   ├── database-debugging.md
│   │   │   ├── database-unblock-steps.md
│   │   │   ├── debug-quick-reference.md
│   │   │   ├── quick-fix-guide.md
│   │   │   ├── height-field-quick-reference.md
│   │   │   ├── step4-health-fields.md
│   │   │   ├── validation-quickstart.md
│   │   │   ├── implementation-checklist.md
│   │   │   └── calculator2-quickfix.md
│   │   └── deployment/
│   │       ├── migration-execution.md
│   │       ├── assessment-migration-guide.md
│   │       ├── assessment-quick-start.md
│   │       ├── supabase-migration.md
│   │       ├── quick-migration-reference.txt
│   │       ├── production-checklist.md
│   │       ├── rollback-procedures.md
│   │       ├── security-migration-checklist.md
│   │       └── execution-checklist.md
│   │
│   ├── specs/              [WHAT: Technical specifications]
│   │   ├── README.md
│   │   ├── database-schema/
│   │   │   ├── sara-memory-storage-analysis.md
│   │   │   ├── sara-memory-quick-reference.sql
│   │   │   ├── writers-schema-fix.md
│   │   │   ├── writers-schema-comparison.md
│   │   │   ├── writers-schema-diagram.md
│   │   │   ├── writers-quick-reference.sql
│   │   │   ├── database-blueprint-files.txt
│   │   │   ├── calculator2-rls-update.sql
│   │   │   └── migrations.sql
│   │   ├── features/
│   │   │   ├── calculator-feature.md
│   │   │   ├── calculator2-index.md
│   │   │   ├── calculator-brand-color-spec.md
│   │   │   ├── calculator-brand-validation.md
│   │   │   ├── payment-flow-status.md
│   │   │   ├── calculator-api-delivery.txt
│   │   │   ├── height-field-implementation.md
│   │   │   ├── step4-health-fields.md
│   │   │   ├── step4-health-fields-implementation.md
│   │   │   ├── step4-health-fields-index.md
│   │   │   ├── form-data-persistence.md
│   │   │   ├── story-3-2-implementation.md
│   │   │   └── implementation-requirements-step-6c.md
│   │   └── architecture/
│   │       ├── state-management-fix.md
│   │       ├── api-design.md
│   │       └── deployment-architecture.md
│   │
│   ├── reports/            [WHAT WE LEARNED: Findings & analysis]
│   │   ├── README.md
│   │   ├── migrations/
│   │   │   ├── 2026-01-05-migration-007-deployment.md
│   │   │   ├── 2026-01-05-migration-007-checklist.md
│   │   │   ├── 2026-01-05-migration-007-index.md
│   │   │   ├── 2026-01-05-migration-summary.md
│   │   │   ├── 2026-01-05-deployment-summary.md
│   │   │   ├── 2026-01-04-assessment-migration-deployment.md
│   │   │   ├── supabase-migration-status.md
│   │   │   └── [more migration reports]
│   │   ├── investigations/
│   │   │   ├── 2026-01-04-leo-diagnosis-summary.md
│   │   │   ├── leo-investigation-index.md
│   │   │   ├── api-critical-bug-report.md
│   │   │   ├── bug-fix-documentation-index.md
│   │   │   ├── calculator-fixes-summary.md
│   │   │   ├── height-field-code-summary.md
│   │   │   ├── state-fix-documentation-index.md
│   │   │   ├── writers-execution-summary.md
│   │   │   ├── writers-fix-deliverables.md
│   │   │   ├── [more investigation reports]
│   │   │   └── [organized by feature/issue]
│   │   └── validations/
│   │       ├── accessibility-validation-report.md
│   │       ├── accessibility-fixes.md
│   │       ├── banner-validation-report.html
│   │       ├── casey-validation-summary.md
│   │       ├── comprehensive-validation-results.md
│   │       ├── height-field-validation.md
│   │       ├── story-3-2-verification.md
│   │       ├── step-6c-visual-validation-report.md
│   │       ├── visual-validation-responsive.md
│   │       └── [more validation reports]
│   │
│   ├── decisions/          [WHY WE CHOSE: Decision archive]
│   │   ├── README.md
│   │   ├── architecture/
│   │   ├── feature-design/
│   │   └── infrastructure/
│   │
│   ├── tools/              [DEVELOPMENT: Scripts & utilities]
│   │   ├── README.md
│   │   ├── validate/
│   │   │   ├── validate-calculator.mjs
│   │   │   ├── validate-form.js
│   │   │   ├── validate-accessibility.js
│   │   │   └── [validation scripts]
│   │   ├── deploy/
│   │   │   ├── deploy-migration.js
│   │   │   ├── deploy-migration-007.js
│   │   │   ├── verify-migration-007.js
│   │   │   ├── apply-migration.js
│   │   │   ├── apply-migration.sh
│   │   │   ├── verify-deployment.js
│   │   │   └── rollback.sh
│   │   ├── test/
│   │   │   ├── test-calculator.js
│   │   │   ├── test-calculator.mjs
│   │   │   ├── test-form.js
│   │   │   ├── test-payment-flow.js
│   │   │   ├── debug-form.mjs
│   │   │   ├── debug-questionnaire.js
│   │   │   └── [test/debug scripts]
│   │   └── utility/
│   │       ├── simple-report-server.js
│   │       ├── screenshot-homepage.js
│   │       └── [utility scripts]
│   │
│   └── archive/            [HISTORY: Old materials organized by topic/date]
│       ├── README.md
│       ├── 2026-01/
│       │   ├── step-4-height-fields/
│       │   │   ├── alex-height-field-quick-reference.md
│       │   │   ├── step4-health-code-snippets.md
│       │   │   └── [step-4 related files]
│       │   ├── accessibility-fixes/
│       │   │   ├── accessibility-test-results.txt
│       │   │   ├── a11y-fix-checklist.md
│       │   │   └── [accessibility files]
│       │   ├── validation-reports/
│       │   │   ├── banner-side-by-side-comparison.txt
│       │   │   ├── banner-element-checklist.md
│       │   │   └── [banner validation files]
│       │   └── [other topics]
│       └── [organized by date/topic as needed]
│
├── agents/                 [Agent system - unchanged]
├── api/                    [API source - unchanged]
├── migrations/             [SQL migrations - unchanged]
├── public/                 [Static files - unchanged]
├── tests/                  [Test suite - unchanged]
├── node_modules/           [Dependencies - unchanged]
└── [Other functional directories - unchanged]
```

---

## COMPARISON TABLE

| Aspect | Before | After |
|--------|--------|-------|
| **Root Level Files** | 150+ scattered | 4 kept (CLAUDE.md, README.md, CHANGELOG.md, START_HERE.md) |
| **Organization** | By date/person/random | By PURPOSE (guides, specs, reports) |
| **Finding docs** | Scroll through 150 files | Navigate by category |
| **New person onboarding** | Confusing | Clear structure, use README files |
| **Archiving old stuff** | Nowhere to put it | docs/archive/ organized by date/topic |
| **project-log/** | Exists but hidden | Clear and accessible |
| **Navigation** | None | README in each directory |

---

## SEARCH EXAMPLES

### "How do I deploy migration 007?"
**Before:** Search through 20+ migration files to find MIGRATION_EXECUTION_GUIDE.md
**After:** Open docs/guides/deployment/ → read MIGRATION_EXECUTION_GUIDE.md

### "What was the issue with form data persistence?"
**Before:** Search through 150+ files, might find LEO_FORM_DATA_DEBUG_GUIDE.md
**After:** Open docs/reports/investigations/ → read form-data-persistence.md or check FORM_DATA_PERSISTENCE_ANALYSIS.md in docs/specs/

### "Where's the calculator brand spec?"
**Before:** Scroll through calculator files, hope it's named clearly
**After:** docs/specs/features/ → CALCULATOR_BRAND_COLOR_SPEC.md

### "What tests exist for the calculator?"
**Before:** Files scattered, unclear what's current
**After:** docs/tools/test/ → browse all test scripts organized

### "What were the old step-4 decisions?"
**Before:** Multiple files about step-4, outdated ones not separated
**After:** docs/archive/2026-01/step-4-height-fields/ → all step-4 files organized

---

## IMPLEMENTATION EFFORT

- **Create directories:** 15 minutes
- **Move files one category at a time:** 30-45 minutes total
- **Create navigation (README files):** 20 minutes
- **Test and verify:** 15 minutes
- **Total:** ~2 hours (can be done incrementally)

---

## RISKS & MITIGATION

| Risk | Mitigation |
|------|-----------|
| Broken internal links | Test after each category move, use relative paths |
| Missing files | Create inventory before moving, verify count after |
| Agents can't find files | Keep project-log untouched, update docs-location mapping |
| Historical files lost | Archive in docs/archive/ with clear structure |
| Root directory still messy | Be strict: only 4-5 files at root |

---

## FINAL STATE CHECKLIST

After cleanup is complete:

- [ ] Root directory contains only ~10-15 files (mostly configs/entry points)
- [ ] All 150+ documentation files organized into docs/ hierarchy
- [ ] project-log/ remains untouched (source of truth)
- [ ] Each docs/ subdirectory has README.md explaining its purpose
- [ ] No broken internal links
- [ ] Archive/ contains all historical/one-off files
- [ ] Agents can still access what they need (unchanged access paths)
- [ ] New team members can navigate docs easily
- [ ] Documentation is maintainable and scalable


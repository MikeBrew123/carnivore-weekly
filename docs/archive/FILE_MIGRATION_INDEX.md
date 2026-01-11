# Complete File Migration Index

**Reference:** Where EVERY file goes during cleanup

---

## FILES TO KEEP AT ROOT (4-5 files)

| File | Action | Reason |
|------|--------|--------|
| `CLAUDE.md` | KEEP | Agent system reference document |
| `README.md` | KEEP | Project overview and entry point |
| `CHANGELOG.md` | KEEP | Release history and version tracking |
| `START_HERE.md` | KEEP or MOVE | Entry point (optional, can move to docs/) |

---

## MIGRATION & DEPLOYMENT FILES (20 files)

**Destination:** `docs/reports/migrations/` + `docs/guides/deployment/`

### Move to `docs/reports/migrations/`
| Current Name | New Name | Category |
|---|---|---|
| MIGRATION_DEPLOYMENT_007.md | 2026-01-05-migration-deployment-007.md | Report |
| MIGRATION_EXECUTION_STATUS.md | 2026-01-05-migration-execution-status.md | Report |
| MIGRATION_007_CHECKLIST.md | 2026-01-05-migration-007-checklist.md | Report |
| MIGRATION_007_INDEX.md | 2026-01-05-migration-007-index.md | Report |
| MIGRATION_SUMMARY_2026-01-05.md | 2026-01-05-migration-summary.md | Report |
| DEPLOYMENT_SUMMARY_007.md | 2026-01-05-deployment-summary.md | Report |
| ASSESSMENT_MIGRATION_DEPLOYMENT.md | 2026-01-04-assessment-migration-deployment.md | Report |
| ASSESSMENT_MIGRATION_STATUS.md | 2026-01-04-assessment-migration-status.md | Report |
| ASSESSMENT_DEPLOYMENT_CHECKLIST.md | 2026-01-04-assessment-deployment-checklist.md | Report |
| ASSESSMENT_DEPLOYMENT_INDEX.md | 2026-01-04-assessment-deployment-index.md | Report |
| ASSESSMENT_MIGRATION_EXECUTION_REPORT.txt | 2026-01-04-assessment-migration-execution-report.txt | Report |
| SUPABASE_MIGRATION_STATUS.md | supabase-migration-status.md | Report |
| MIGRATION_STATUS.md | migration-status.md | Report |
| DEPLOYMENT_BACKUP_SUMMARY.md | deployment-backup-summary.md | Report |

### Move to `docs/guides/deployment/`
| Current Name | New Name | Category |
|---|---|---|
| MIGRATION_EXECUTION_GUIDE.md | migration-execution-guide.md | Guide |
| ASSESSMENT_MIGRATION_README.md | assessment-migration-guide.md | Guide |
| ASSESSMENT_QUICK_START.md | assessment-quick-start.md | Guide |
| SUPABASE_MIGRATION_INSTRUCTIONS.md | supabase-migration.md | Guide |
| QUICK_MIGRATION_REFERENCE.md | quick-migration-reference.md | Guide |
| QUICK_MIGRATION_REFERENCE.txt | quick-migration-reference.txt | Guide |
| WRITERS_MIGRATION_QUICK_START.md | writers-migration-quick-start.md | Guide |

---

## DATABASE & SCHEMA FILES (13 files)

**Destination:** `docs/specs/database-schema/` + `docs/guides/development/`

### Move to `docs/specs/database-schema/`
| Current Name | New Name | Type |
|---|---|---|
| SARA_MEMORY_STORAGE_ANALYSIS.md | sara-memory-storage-analysis.md | Spec |
| SARA_MEMORY_QUICK_REFERENCE.sql | sara-memory-quick-reference.sql | SQL |
| WRITERS_SCHEMA_FIX.md | writers-schema-fix.md | Spec |
| WRITERS_SCHEMA_FIX_README.md | writers-schema-fix-readme.md | Spec |
| WRITERS_SCHEMA_COMPARISON.md | writers-schema-comparison.md | Spec |
| WRITERS_SCHEMA_DIAGRAM.md | writers-schema-diagram.md | Spec |
| WRITERS_SCHEMA_FIX_INDEX.md | writers-schema-fix-index.md | Spec |
| WRITERS_QUICK_REFERENCE.sql | writers-quick-reference.sql | SQL |
| DATABASE_BLUEPRINT_FILES.txt | database-blueprint-files.txt | Reference |
| CALCULATOR2_RLS_UPDATE.sql | calculator2-rls-update.sql | SQL |

### Move to `docs/guides/development/`
| Current Name | New Name | Type |
|---|---|---|
| LEO_FORM_DATA_DEBUG_GUIDE.md | form-data-debugging.md | Guide |
| DATABASE_UNBLOCK_STEPS.md | database-unblock-steps.md | Guide |
| FORM_DATA_PERSISTENCE_ANALYSIS.md | (move to docs/specs/features/) | Spec |
| CALCULATOR2_SESSION_DIAGNOSIS.md | (move to docs/specs/features/) | Spec |

---

## BUG FIX & INVESTIGATION FILES (22 files)

**Destination:** `docs/reports/investigations/` + `docs/guides/development/`

### Move to `docs/reports/investigations/`
| Current Name | New Name | Type |
|---|---|---|
| LEO_DIAGNOSIS_SUMMARY.md | 2026-01-04-leo-diagnosis-summary.md | Report |
| LEO_INVESTIGATION_INDEX.md | leo-investigation-index.md | Index |
| LEO_CODE_SNIPPETS.js | leo-code-snippets.js | Code |
| LEO_QUICK_REFERENCE.md | leo-quick-reference.md | Reference |
| LEO_DIAGNOSTICS.sql | leo-diagnostics.sql | SQL |
| LEO_STEP2_FORM_PERSISTENCE_DIAGNOSIS.md | leo-step2-form-persistence-diagnosis.md | Report |
| LEO_STEP2_CODE_ANALYSIS.md | leo-step2-code-analysis.md | Report |
| LEO_STEP2_DEBUG_CHECKLIST.md | leo-step2-debug-checklist.md | Checklist |
| LEO_IMPLEMENTATION_SUMMARY.md | leo-implementation-summary.md | Report |
| LEO_STATE_FIX_DELIVERY.md | leo-state-fix-delivery.md | Report |
| LEO_CALCULATOR_API_PATCH.md | leo-calculator-api-patch.md | Report |
| LEO_MIGRATION_REPORT.txt | leo-migration-report.txt | Report |
| LEO_README.md | leo-readme.md | Guide |
| API_CRITICAL_BUG_REPORT.md | api-critical-bug-report.md | Report |
| API_PATCH_STEP4_FIX.js | api-patch-step4-fix.js | Code |
| BUG_FIX_DOCUMENTATION_INDEX.md | bug-fix-documentation-index.md | Index |
| FIX_SUMMARY.txt | fix-summary.txt | Summary |
| FIX_SUMMARY_2026-01-03.md | 2026-01-03-fix-summary.md | Summary |
| FIXES_INDEX.md | fixes-index.md | Index |
| CALCULATOR_FIXES_SUMMARY.md | calculator-fixes-summary.md | Report |
| HEIGHT_FIELD_CODE_SUMMARY.md | height-field-code-summary.md | Report |
| STATE_FIX_DOCUMENTATION_INDEX.md | state-fix-documentation-index.md | Index |
| STATE_FIX_SUMMARY.txt | state-fix-summary.txt | Summary |

### Move to `docs/guides/development/`
| Current Name | New Name | Type |
|---|---|---|
| DEBUG_QUICK_REFERENCE.md | debug-quick-reference.md | Guide |
| QUICK_FIX_GUIDE.md | quick-fix-guide.md | Guide |
| QUICK_FIX_REFERENCE.md | quick-fix-reference.md | Guide |

---

## VALIDATION & TESTING FILES (30 files)

**Destination:** `docs/reports/validations/` + `docs/guides/development/`

### Move to `docs/reports/validations/`
| Current Name | New Name | Type |
|---|---|---|
| ACCESSIBILITY_VALIDATION_REPORT.md | accessibility-validation-report.md | Report |
| ACCESSIBILITY_REPORT_INDEX.md | accessibility-report-index.md | Index |
| ACCESSIBILITY_FIXES.md | accessibility-fixes.md | Report |
| ACCESSIBILITY_TEST_RESULTS.txt | accessibility-test-results.txt | Report |
| A11Y_FIX_CHECKLIST.md | a11y-fix-checklist.md | Checklist |
| A11Y_QUICK_SUMMARY.md | a11y-quick-summary.md | Summary |
| COMPREHENSIVE_VALIDATION_RESULTS.md | comprehensive-validation-results.md | Report |
| VALIDATION_REPORT_INDEX.md | validation-report-index.md | Index |
| VALIDATION_REPORT.md | validation-report.md | Report |
| VALIDATION_COMPLETE.txt | validation-complete.txt | Summary |
| VALIDATION_SUMMARY_DASHBOARD.txt | validation-summary-dashboard.txt | Dashboard |
| VALIDATION_ARTIFACTS_INDEX.txt | validation-artifacts-index.txt | Index |
| VALIDATION-FINDINGS.md | validation-findings.md | Report |
| VALIDATION_DECISION.txt | validation-decision.txt | Decision |
| CASEY_VALIDATION_SUMMARY.md | casey-validation-summary.md | Report |
| CASEY_VALIDATION_FINDINGS.md | casey-validation-findings.md | Report |
| CASEY_VALIDATION_REPORT.txt | casey-validation-report.txt | Report |
| CASEY_FINDINGS_SUMMARY.md | casey-findings-summary.md | Summary |
| BANNER_VALIDATION_REPORT.html | banner-validation-report.html | Report |
| BANNER_CONSISTENCY_REPORT.md | banner-consistency-report.md | Report |
| BANNER_ELEMENT_CHECKLIST.md | banner-element-checklist.md | Checklist |
| BANNER_QUICK_VALIDATION.md | banner-quick-validation.md | Quick Ref |
| BANNER_SIDE_BY_SIDE_COMPARISON.txt | banner-side-by-side-comparison.txt | Comparison |
| BANNER_VALIDATION_INDEX.md | banner-validation-index.md | Index |
| BANNER_VALIDATION_MANIFEST.txt | banner-validation-manifest.txt | Manifest |
| JORDAN_VALIDATION_SUMMARY.md | jordan-validation-summary.md | Report |
| RESPONSIVE-VALIDATION-SUMMARY.txt | responsive-validation-summary.txt | Report |
| visual-validation-responsive.md | visual-validation-responsive.md | Report |
| HEIGHT-FIELD-VALIDATION-INDEX.md | height-field-validation.md | Index |
| STEP_6C_VISUAL_VALIDATION_REPORT.md | step-6c-visual-validation-report.md | Report |
| STORY_3_2_VERIFICATION.md | story-3-2-verification.md | Report |

### Move to `docs/guides/development/`
| Current Name | New Name | Type |
|---|---|---|
| VALIDATION_QUICKSTART.md | validation-quickstart.md | Guide |

---

## CALCULATOR DOCUMENTATION (22 files)

**Destination:** `docs/specs/features/`, `docs/guides/development/`, `docs/reports/investigations/`, `docs/reports/validations/`

### Move to `docs/guides/development/`
| Current Name | New Name | Type |
|---|---|---|
| CALCULATOR_FIXES_QUICK_START.md | calculator-fixes-quick-start.md | Guide |
| CALCULATOR2_SESSION_FIX_README.md | calculator-session-fix.md | Guide |
| CALCULATOR_QUICK_FIX_GUIDE.md | calculator-quick-fix-guide.md | Guide |
| CALCULATOR2_QUICKFIX.md | calculator2-quickfix.md | Guide |
| ALEX-HEIGHT-FIELD-QUICK-REFERENCE.md | height-field-quick-reference.md | Guide |
| STEP4-HEALTH-QUICK-REFERENCE.md | step4-health-quick-reference.md | Guide |
| README-STEP4-HEALTH-FIELDS.txt | step4-health-fields.txt | Guide |

### Move to `docs/specs/features/`
| Current Name | New Name | Type |
|---|---|---|
| CALCULATOR_BRAND_VALIDATION_REQUIREMENTS.md | calculator-brand-validation.md | Spec |
| CALCULATOR_BRAND_COLOR_SPEC.md | calculator-brand-color-spec.md | Spec |
| CALCULATOR2_INDEX.md | calculator2-index.md | Spec |
| HEIGHT_FIELD_IMPLEMENTATION.md | height-field-implementation.md | Spec |
| STEP4-HEALTH-FIELDS-FOR-CASEY.md | step4-health-fields.md | Spec |
| STEP4-HEALTH-FIELDS-IMPLEMENTATION.md | step4-health-fields-implementation.md | Spec |
| STEP4-HEALTH-FIELDS-INDEX.md | step4-health-fields-index.md | Index |
| STORY_3_2_IMPLEMENTATION.md | story-3-2-implementation.md | Spec |
| CALCULATOR_API_DELIVERY.txt | calculator-api-delivery.txt | Spec |
| PAYMENT_FLOW_STATUS.md | payment-flow-status.md | Spec |
| FORM_DATA_PERSISTENCE_ANALYSIS.md | form-data-persistence.md | Spec |
| CALCULATOR2_SESSION_DIAGNOSIS.md | calculator-session-management.md | Spec |

### Move to `docs/reports/investigations/`
| Current Name | New Name | Type |
|---|---|---|
| CALCULATOR_FIXES_SUMMARY.md | calculator-fixes-summary.md | Report |
| HEIGHT_FIELD_CODE_SUMMARY.md | height-field-code-summary.md | Report |
| STEP4_HEIGHT_FIELD_COMPLETE.md | step4-height-field-complete.md | Report |
| STEP4-HEALTH-CODE-SNIPPETS.md | step4-health-code-snippets.md | Snippets |
| STEP4-IMPLEMENTATION-FINAL-REPORT.md | step4-implementation-final-report.md | Report |
| STEP4-MANIFEST.txt | step4-manifest.txt | Manifest |

### Move to `docs/specs/database-schema/`
| Current Name | New Name | Type |
|---|---|---|
| CALCULATOR2_RLS_UPDATE.sql | calculator2-rls-update.sql | SQL |

---

## IMPLEMENTATION & SPEC FILES (17 files)

**Destination:** `docs/guides/`, `docs/specs/`, `docs/reports/`

### Move to `docs/guides/development/`
| Current Name | New Name | Type |
|---|---|---|
| IMPLEMENTATION_CHECKLIST.md | implementation-checklist.md | Checklist |
| IMPLEMENTATION_GUIDE_STATE_FIX.md | implementation-guide-state-fix.md | Guide |

### Move to `docs/guides/deployment/`
| Current Name | New Name | Type |
|---|---|---|
| EXECUTION_CHECKLIST.md | execution-checklist.md | Checklist |
| SECURITY_MIGRATION_CHECKLIST.md | security-migration-checklist.md | Checklist |

### Move to `docs/specs/features/`
| Current Name | New Name | Type |
|---|---|---|
| IMPLEMENTATION_REQUIREMENTS_STEP_6C.md | implementation-requirements-step-6c.md | Spec |

### Move to `docs/specs/architecture/`
| Current Name | New Name | Type |
|---|---|---|
| STATE_MANAGEMENT_ARCHITECTURE_FIX.md | state-management-fix.md | Spec |

### Move to `docs/reports/investigations/`
| Current Name | New Name | Type |
|---|---|---|
| STATE_FIX_DOCUMENTATION_INDEX.md | state-fix-documentation-index.md | Index |
| STEP_6A_DELIVERABLE.md | step-6a-deliverable.md | Deliverable |
| STEP_6C_DELIVERABLES.txt | step-6c-deliverables.txt | Deliverable |
| STEP_6C_EXECUTIVE_SUMMARY.md | step-6c-executive-summary.md | Summary |
| STEP6B_COMPLETION_SUMMARY.md | step6b-completion-summary.md | Summary |
| STEP6B_VERIFICATION.txt | step6b-verification.txt | Verification |
| TRACK3-COMPLETION-SUMMARY.md | track3-completion-summary.md | Summary |

---

## CONFIGURATION & SETUP GUIDES (10 files)

**Destination:** `docs/guides/setup/`

| Current Name | New Name | Type |
|---|---|---|
| SUPABASE_SECRETS_ACCESS_GUIDE.md | supabase-secrets-access.md | Guide |
| WRANGLER_SECRETS_QUICK_REF.md | wrangler-secrets.md | Guide |
| STRIPE_TESTING_SETUP.md | stripe-testing.md | Guide |
| ANALYTICS_DEPLOYMENT_INDEX.md | analytics-deployment-index.md | Index |
| ANALYTICS_DEPLOYMENT_CHECKLIST.md | analytics-deployment-checklist.md | Checklist |
| ANALYTICS_DEPLOYMENT_SUMMARY.txt | analytics-deployment-summary.txt | Summary |
| ANALYTICS_INFRASTRUCTURE.md | analytics-infrastructure.md | Spec |
| README_SECRETS_MIGRATION.md | secrets-migration.md | Guide |
| README_STEP_6C_VALIDATION.md | step-6c-validation.md | Guide |

### Move to `docs/reports/investigations/`
| Current Name | New Name | Type |
|---|---|---|
| ANALYTICS_DEPLOYMENT_REPORT.md | analytics-deployment-report.md | Report |

---

## STATUS & SUMMARY REPORTS (15 files)

**Destination:** `docs/reports/` (root), `docs/guides/`, `docs/archive/`

### Move to `docs/reports/`
| Current Name | New Name | Type |
|---|---|---|
| FINAL_REPORT.md | 2026-01-03-final-report.md | Report |
| EXECUTIVE_SUMMARY.md | 2026-01-02-executive-summary.md | Summary |
| DEPLOYMENT_STATUS.md | deployment-status.md | Status |
| UNBLOCK_SUMMARY.txt | unblock-summary.txt | Summary |
| CREDENTIAL_MIGRATION_TRACKER.txt | credential-migration-tracker.txt | Tracker |
| SECRETS_MIGRATION_COMPLETE.txt | secrets-migration-complete.txt | Status |
| MIGRATIONS_INDEX.txt | migrations-index.txt | Index |

### Move to `docs/guides/deployment/`
| Current Name | New Name | Type |
|---|---|---|
| WRITERS_MIGRATION_QUICK_START.md | writers-migration-quick-start.md | Guide |

### Move to `docs/reports/investigations/`
| Current Name | New Name | Type |
|---|---|---|
| WRITERS_EXECUTION_SUMMARY.md | writers-execution-summary.md | Summary |
| WRITERS_FIX_CHECKLIST.txt | writers-fix-checklist.txt | Checklist |
| WRITERS_FIX_DELIVERABLES.md | writers-fix-deliverables.md | Deliverable |

### Move to `docs/archive/`
| Current Name | New Name | Type |
|---|---|---|
| FILES_TO_USE.txt | reference-files.txt | Reference |

---

## WRITER-RELATED SCHEMA FILES (5 files)

**Destination:** `docs/specs/database-schema/`

| Current Name | New Name | Type |
|---|---|---|
| WRITERS_SCHEMA_COMPARISON.md | writers-schema-comparison.md | Spec |
| WRITERS_SCHEMA_DIAGRAM.md | writers-schema-diagram.md | Diagram |
| WRITERS_SCHEMA_FIX.md | writers-schema-fix.md | Spec |
| WRITERS_SCHEMA_FIX_README.md | writers-schema-fix-readme.md | Spec |
| WRITERS_SCHEMA_FIX_INDEX.md | writers-schema-fix-index.md | Index |

---

## DEVELOPMENT & TEST SCRIPTS (~20+ files)

**Destination:** `docs/tools/`

### Move to `docs/tools/test/`
- All `test-*.js` files
- All `test-*.mjs` files
- All `debug-*.js` files
- All `debug-*.mjs` files
- All `run-*.js` files
- `TEST_CALCULATOR_API.sh`

Examples:
- `test-calculator.js` → `docs/tools/test/`
- `debug-form.mjs` → `docs/tools/test/`
- `test-payment-flow.js` → `docs/tools/test/`

### Move to `docs/tools/validate/`
- All `validate-*.js` files
- All `validate-*.mjs` files

Examples:
- `validate-calculator.mjs` → `docs/tools/validate/`
- `validate-form.js` → `docs/tools/validate/`

### Move to `docs/tools/deploy/`
- All `deploy-*.js` files
- All `apply-*.js` files
- All `apply-*.sh` files
- All `execute-*.js` files
- All `execute-*.sh` files
- All `verify-*.js` files
- `APPLY_MIGRATIONS_LOCAL.sh`
- `VERIFY_WRANGLER_SETUP.sh`
- `ROLLBACK.sh`

Examples:
- `deploy-migration-007.js` → `docs/tools/deploy/`
- `apply-migration.js` → `docs/tools/deploy/`
- `verify-migration-007.js` → `docs/tools/deploy/`

### Move to `docs/tools/utility/`
- All `simple-*.js` files
- All `simple-*.mjs` files
- All `screenshot-*.js` files
- All `screenshot-*.mjs` files
- All `full-*.mjs` files

Examples:
- `simple-report-server.js` → `docs/tools/utility/`
- `screenshot-homepage.js` → `docs/tools/utility/`

---

## SUMMARY BY DESTINATION

| Directory | File Count | Types |
|-----------|-----------|-------|
| **Root (Keep)** | 4-5 | .md entry points |
| **docs/guides/setup/** | 9 | Setup/config guides |
| **docs/guides/development/** | 14 | Development guides/checklists |
| **docs/guides/deployment/** | 10 | Deployment guides/checklists |
| **docs/specs/database-schema/** | 10 | Database specs/SQL |
| **docs/specs/features/** | 15 | Feature specs/designs |
| **docs/specs/architecture/** | 2 | Architecture specs |
| **docs/reports/migrations/** | 14 | Migration reports |
| **docs/reports/investigations/** | 35 | Investigation reports |
| **docs/reports/validations/** | 30 | Validation reports |
| **docs/reports/** (root) | 7 | Status/summary reports |
| **docs/decisions/** | 0 | (empty, ready for future use) |
| **docs/tools/test/** | 8+ | Test/debug scripts |
| **docs/tools/validate/** | 3+ | Validation scripts |
| **docs/tools/deploy/** | 8+ | Deploy scripts |
| **docs/tools/utility/** | 4+ | Utility scripts |
| **docs/archive/** | Varies | Historical files |
| **TOTAL** | ~170 | All documentation |

---

## VERIFICATION CHECKLIST

After moving all files:

- [ ] Root directory has only ~10-15 files
  - CLAUDE.md, README.md, CHANGELOG.md, START_HERE.md
  - package.json, .env.example, .gitignore
  - Build configs (jest, tsconfig, etc)
  - Cleanup docs (4 files explaining structure)

- [ ] docs/guides/ has ~33 files (setup + dev + deploy)
- [ ] docs/specs/ has ~27 files (database + features + architecture)
- [ ] docs/reports/ has ~86 files (migrations + investigations + validations)
- [ ] docs/tools/ has ~20+ files (test + validate + deploy + utility)
- [ ] docs/archive/ has any orphaned historical files
- [ ] docs/project-log/ is COMPLETELY UNTOUCHED

- [ ] No .js, .mjs, or .sh files at root level
- [ ] No stray .md files except essential entry points
- [ ] All migration complete
- [ ] Git commit ready with all changes

---

## FILE COUNT REFERENCE

**Before Cleanup:**
- Root level: 150+ files
- All mixed together
- No clear organization

**After Cleanup:**
- Root level: 4-5 files
- docs/: ~170 files organized by purpose
- Clear structure, easy navigation
- project-log/ untouched


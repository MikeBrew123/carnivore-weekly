# Documentation Cleanup - Quick Reference

**Status:** Ready to Execute
**Created:** 2026-01-05
**Scope:** ~170 files in root → organized docs/ structure

---

## THE PROBLEM

Root directory currently contains ~150+ documentation files:
- Migration docs scattered everywhere
- Database schema docs mixed with bug reports
- Test scripts at root level
- No clear organization or categories

**Result:** Hard to find anything, unclear what's current vs. historical

---

## THE SOLUTION

**Simple principle:** Files organized by PURPOSE, not by date or person

```
docs/
├── project-log/          [SOURCE OF TRUTH - operational memory]
│   ├── current-status.md
│   ├── decisions.md
│   └── daily/ + weekly/
│
├── guides/               [HOW-TOs: procedural, step-by-step]
│   ├── setup/            (supabase, stripe, analytics, etc)
│   ├── development/      (debugging, testing, forms, etc)
│   └── deployment/       (migration execution, checklists)
│
├── specs/                [WHAT: requirements, design, architecture]
│   ├── database-schema/  (tables, migrations, RLS rules)
│   ├── features/         (calculator, forms, payment flow)
│   └── architecture/     (state management, API design)
│
├── reports/              [WHAT WE LEARNED: findings, validations]
│   ├── validations/      (accessibility, responsive, visual)
│   ├── investigations/   (bug analysis, debugging reports)
│   └── migrations/       (deployment reports, summaries)
│
├── decisions/            [WHY WE CHOSE: strategic decisions]
│   ├── architecture/
│   ├── feature-design/
│   └── infrastructure/
│
├── tools/                [DEVELOPMENT: scripts, validators, deployers]
│   ├── validate/
│   ├── deploy/
│   ├── test/
│   └── utility/
│
└── archive/              [HISTORY: old stuff organized by date/topic]
    └── 2026-01/
```

---

## WHAT MOVES WHERE (Summary)

| Current File Group | Count | Destination |
|---|---|---|
| **Migrations & Deployments** | 20 | `docs/reports/migrations/` + `docs/guides/deployment/` |
| **Database & Schema** | 13 | `docs/specs/database-schema/` |
| **Bug Fixes & Investigations** | 22 | `docs/reports/investigations/` |
| **Validation Reports** | 30 | `docs/reports/validations/` |
| **Calculator Docs** | 22 | `docs/specs/features/` + `docs/guides/development/` |
| **Implementation Guides** | 17 | `docs/specs/` + `docs/guides/` |
| **Config & Setup** | 10 | `docs/guides/setup/` |
| **Status & Summaries** | 15 | `docs/reports/` |
| **Dev Scripts & Tools** | 20+ | `docs/tools/` |
| **Keep at Root** | 4 | `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `START_HERE.md` |

**TOTAL:** ~170 files organized into clean hierarchy

---

## ROOT DIRECTORY AFTER CLEANUP

Only these files at root level:

```
/carnivore-weekly/
├── CLAUDE.md                    Agent system reference (KEEP)
├── README.md                    Project overview (KEEP)
├── CHANGELOG.md                 Release history (KEEP)
├── START_HERE.md                Entry point (KEEP)
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
├── jest.config.js
├── tsconfig.json
├── eslint.config.js
└── [All other functional directories: api/, agents/, migrations/, public/, etc]
```

**That's it.** No more 150+ files scattered around.

---

## KEY PRINCIPLES

1. **project-log/ stays untouched** - It's the source of truth for operational memory per CLAUDE.md
2. **No deletion** - All files moved to archive/ if not actively used
3. **No rewriting** - Original content preserved, just reorganized
4. **Navigation matters** - Each directory gets a README listing its contents
5. **Agents unaffected** - Leo, Casey, Jordan still access data the same way

---

## IMPLEMENTATION PHASES

### Phase 1: Review & Approve
- [ ] Confirm structure makes sense
- [ ] Identify any files to delete (vs archive)
- [ ] Identify "living docs" that are actively updated

### Phase 2: Create Structure
```bash
mkdir -p docs/guides/{setup,development,deployment}
mkdir -p docs/specs/{database-schema,features,architecture}
mkdir -p docs/reports/{validations,investigations,migrations}
mkdir -p docs/decisions/{architecture,feature-design,infrastructure}
mkdir -p docs/tools/{validate,deploy,test,utility}
mkdir -p docs/archive/2026-01
```

### Phase 3: Move Files
- Start with one category (e.g., migrations)
- Verify no broken links
- Move to next category
- Repeat

### Phase 4: Create Navigation
- Write README.md for each directory
- Update any cross-references
- Document the new structure

### Phase 5: Final Cleanup
- Remove empty folders
- Verify root directory ~15 files only
- Document the structure for team

---

## WHAT ABOUT "LIVING DOCUMENTS"?

Some files are actively updated and referenced:

- **CLAUDE.md** - Agent system documentation (keep at root, update as-needed)
- **docs/project-log/current-status.md** - (already in right place)
- **docs/project-log/decisions.md** - (already in right place)

These won't be moved. Everything else gets organized.

---

## ARCHIVE STRATEGY

**Old/historical files** (not actively used):
- Move to `docs/archive/2026-01/` organized by topic
- Examples: old validation reports, step-4 work, past bug fixes
- Preserved but out of main directories
- Indexed in archive README for reference

---

## DETAILED FILE MAPPINGS

See **DOCUMENTATION_CLEANUP_PLAN.md** for complete file-by-file mappings:

- All 20+ migration files → where they go
- All 13 database files → where they go
- All 22 investigation files → where they go
- All 30 validation files → where they go
- ... and so on

---

## SUCCESS METRICS

**Before:**
- 150+ files in root directory
- No clear organization
- Hard to find specific information
- Unclear what's current vs. historical

**After:**
- ~10-15 files at root only
- Clear hierarchy by purpose
- Easy to locate documentation
- Historical files properly archived
- Each directory has navigation

---

## NEXT STEPS

1. Review this summary + the full DOCUMENTATION_CLEANUP_PLAN.md
2. Approve the directory structure
3. Identify any special files that need custom handling
4. Execute Phase 1-2 (create directories)
5. Begin Phase 3 (migrate files one category at a time)

**Questions?** Check DOCUMENTATION_CLEANUP_PLAN.md for detailed explanations of each category.


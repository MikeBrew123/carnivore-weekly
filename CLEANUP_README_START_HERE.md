# Documentation Cleanup - START HERE

**Status:** Plan complete and ready to execute
**Date:** 2026-01-05
**Scope:** Reorganize 150+ scattered files into clean docs/ structure

---

## WHAT'S THE PROBLEM?

Your main project directory has **150+ documentation files scattered at root level**:

```
/carnivore-weekly/
├── MIGRATION_DEPLOYMENT_007.md
├── WRITERS_SCHEMA_FIX.md
├── LEO_DIAGNOSIS_SUMMARY.md
├── ACCESSIBILITY_VALIDATION_REPORT.md
├── CALCULATOR_FIXES_QUICK_START.md
├── STRIPE_TESTING_SETUP.md
├── ... 140+ more files
```

**Result:** Hard to find anything, unclear what's current vs. historical

---

## WHAT'S THE SOLUTION?

Organize files by **PURPOSE** (not by date or person):

```
docs/
├── project-log/        [SOURCE OF TRUTH - operational memory]
├── guides/            [HOW-TO: step-by-step procedures]
├── specs/             [WHAT: technical specifications]
├── reports/           [WHAT WE LEARNED: findings & validations]
├── decisions/         [WHY WE CHOSE: decision archive]
├── tools/             [DEVELOPMENT: scripts & tools]
└── archive/           [HISTORY: old materials organized by topic/date]
```

**Result:** Clean root directory (~10-15 files), organized docs/, easy navigation

---

## QUICK REFERENCE: 4 DOCUMENTS TO READ

### 1. CLEANUP_SUMMARY.md (5 min read)
- High-level overview of the solution
- Simple visual of before/after
- Key principles explained
- Read this first for the big picture

### 2. CLEANUP_BEFORE_AFTER.md (10 min read)
- Visual comparison of current vs. desired state
- Shows exactly what files go where (high level)
- Tree diagrams of both structures
- Read this to visualize the change

### 3. DOCUMENTATION_CLEANUP_PLAN.md (20 min read)
- Detailed analysis of current state
- Breakdown of files by category (150+ files explained)
- Specific mappings for each file
- Complete directory structure proposal
- Read this for complete details

### 4. CLEANUP_EXECUTION_CHECKLIST.md (reference)
- Step-by-step instructions to execute the cleanup
- Bash commands for each phase
- Verification steps
- Read this when you're ready to execute

### BONUS: FILE_MIGRATION_INDEX.md (reference)
- Complete table of every single file
- Where it goes, what it becomes
- Used to double-check during execution

---

## THE NUMBERS

| Metric | Value |
|--------|-------|
| Files to organize | ~170 documentation files |
| Root files after cleanup | ~10-15 (CLAUDE.md, README.md, etc) |
| New subdirectories | 7 (guides, specs, reports, decisions, tools, archive, + subdirs) |
| Files per category | varies (10-86 files) |
| Execution time | 2-3 hours (can be split into sessions) |
| Risk level | LOW (no deletions, no code changes, reversible) |

---

## KEY PRINCIPLES

1. **project-log/ stays untouched** - It's the source of truth per CLAUDE.md
2. **No deletions** - All files moved or archived, nothing lost
3. **No rewriting** - Original content preserved, just reorganized
4. **Simple logic** - Organized by PURPOSE, not by date or person
5. **Easy to maintain** - Each directory has clear README explaining its purpose

---

## THE STRUCTURE (Simple Version)

| Directory | Purpose | Examples |
|-----------|---------|----------|
| `docs/guides/setup/` | "How do I set up...?" | Supabase, Stripe, Wrangler secrets |
| `docs/guides/development/` | "How do I debug/test...?" | Calculator fixes, form testing |
| `docs/guides/deployment/` | "How do I deploy...?" | Migration execution, checklists |
| `docs/specs/database-schema/` | "What tables exist?" | Schema diagrams, SQL files |
| `docs/specs/features/` | "What should this do?" | Calculator spec, form design |
| `docs/specs/architecture/` | "Why this design?" | State management, API design |
| `docs/reports/migrations/` | "What happened during migration?" | Migration reports & summaries |
| `docs/reports/investigations/` | "What bugs did we find/fix?" | Investigation reports, bug analysis |
| `docs/reports/validations/` | "What tests were run?" | Validation results, test reports |
| `docs/decisions/` | "Why did we choose X?" | Decision archive (future use) |
| `docs/tools/` | "What scripts exist?" | Test scripts, deploy scripts |
| `docs/archive/` | "Historical reference" | Old files organized by date/topic |

---

## NEXT STEPS

### Option A: Get Full Understanding First
1. Read CLEANUP_SUMMARY.md (quick overview)
2. Read CLEANUP_BEFORE_AFTER.md (visual comparison)
3. Read DOCUMENTATION_CLEANUP_PLAN.md (complete details)
4. Then decide if you want to proceed

### Option B: Ready to Execute?
1. Create git branch: `cleanup/documentation-organization`
2. Follow CLEANUP_EXECUTION_CHECKLIST.md phase by phase
3. Verify using FILE_MIGRATION_INDEX.md as reference
4. Commit and verify

### Option C: Need Help First?
- What files should be deleted (vs archived)?
- What's the timeline? (Can it be done all at once?)
- Are there any CI/CD or external references to update?
- Should "living docs" be treated specially?

---

## WHAT YOU GET AFTER CLEANUP

**Root Directory (CLEAN):**
```
/carnivore-weekly/
├── CLAUDE.md              Agent system reference
├── README.md              Project overview
├── CHANGELOG.md           Release history
├── START_HERE.md          Entry point
├── package.json, .env.example, .gitignore
├── jest.config.js, tsconfig.json, etc
└── docs/                  All documentation organized by purpose
    ├── project-log/       Source of truth (untouched)
    ├── guides/            How-to procedures
    ├── specs/             Technical specifications
    ├── reports/           Findings & validations
    ├── decisions/         Decision archive
    ├── tools/             Scripts & utilities
    └── archive/           Historical materials
```

**Benefits:**
- Quick to find what you need
- Easy to onboard new team members
- Clear where to add new documentation
- Scalable as project grows
- project-log/ remains the operational memory hub

---

## RISKS & MITIGATION

| Risk | Mitigation |
|------|-----------|
| Broken links | Test after each category, use relative paths |
| Missing files | Create inventory before, verify count after |
| Agents can't find data | project-log/ untouched, access paths unchanged |
| Time investment | Can be done incrementally (1-2 hour sessions) |

---

## TIMELINE

- **Phase 1-2 (Review + Directories):** 45 min
- **Phase 3 (Navigation files):** 20 min
- **Phase 4 (Move files):** 90-100 min (across 10 passes)
- **Phase 5-6 (Verify + Commit):** 25 min
- **TOTAL:** 2.5-3 hours (can split across days)

---

## DECISION CHECKLIST

Before starting, confirm:

- [ ] Team agrees on this structure
- [ ] Timeline works (can dedicate 2-3 hours)
- [ ] No CI/CD scripts reference root-level files
- [ ] No external docs link to these files
- [ ] All "living docs" identified
- [ ] Clear on what files (if any) should be deleted vs archived

---

## GET STARTED

### To understand the proposal:
1. Start with CLEANUP_SUMMARY.md
2. Check CLEANUP_BEFORE_AFTER.md for visual
3. Review DOCUMENTATION_CLEANUP_PLAN.md for details

### To execute the cleanup:
1. Approve the plan
2. Create git branch
3. Follow CLEANUP_EXECUTION_CHECKLIST.md step by step
4. Reference FILE_MIGRATION_INDEX.md as needed

### Questions?
- Most answers are in DOCUMENTATION_CLEANUP_PLAN.md
- Execution questions answered in CLEANUP_EXECUTION_CHECKLIST.md
- File-by-file mapping in FILE_MIGRATION_INDEX.md

---

## FILES CREATED FOR YOU

5 planning documents have been created at root level:

1. **CLEANUP_SUMMARY.md** - Quick overview (this one is shorter)
2. **CLEANUP_BEFORE_AFTER.md** - Visual before/after
3. **DOCUMENTATION_CLEANUP_PLAN.md** - Detailed analysis & proposals
4. **CLEANUP_EXECUTION_CHECKLIST.md** - Step-by-step instructions
5. **FILE_MIGRATION_INDEX.md** - Complete file mapping reference
6. **CLEANUP_README_START_HERE.md** - This file (your entry point)

**These 6 files can be deleted after cleanup is complete** (or archived as reference).

---

## READY?

Pick one of these:

- **"Show me the quick version"** → Read CLEANUP_SUMMARY.md (5 min)
- **"Show me visually"** → Read CLEANUP_BEFORE_AFTER.md (10 min)
- **"Give me all the details"** → Read DOCUMENTATION_CLEANUP_PLAN.md (20 min)
- **"Let's do this"** → Follow CLEANUP_EXECUTION_CHECKLIST.md
- **"Where does file X go?"** → Check FILE_MIGRATION_INDEX.md

Good luck! This cleanup will make your project much more maintainable.


# Cleanup History

## Major Cleanups

### 2026-02-16: Pipeline Lockdown (Phases 1-9)

**Phase 1-3**: 84 dead files removed, broken references fixed, documentation contradictions corrected.
**Phase 4**: Blog assessment — 6 orphan files identified, 7 target posts confirmed.
**Phase 5**: 6 broken orphan HTML files deleted, insulin-resistance file renamed with date prefix.
**Phase 6**: 7 blog posts expanded from ~600-700 words to 1,000-1,700 words using writer personas.
**Phase 7**: 28 broken internal links fixed (26 corrected date prefix, 2 removed).
**Phase 8**: 88 validation warnings resolved to 0 (titles shortened, skip-nav added, JSON-LD, image dims).
**Phase 9**: Canonical blog pipeline added to CLAUDE.md, validation guardrails added.

**Result**: 0 critical errors, 0 warnings.

### 2026-02-16: Docs Cleanup Phase 1-2

- Deleted 20 daily log files from `docs/project-log/daily/` (violated CLAUDE.md rule)
- Archived 161 stale reports from `docs/reports/` to `docs/archive/reports-archive/`
- Reports removed from git tracking (some contained embedded credentials)
- Added DOCUMENTATION STANDARDS section to CLAUDE.md

### 2026-01: Documentation Reorganization

- Moved files into logical directory structure (`docs/guides/`, `docs/reports/`, `docs/archive/`)
- Created README index files for each directory
- Consolidated scattered docs into themed directories

### 2026-01: Git History Cleanup

- 334MB source PNGs removed from Git tracking
- Secrets removed from committed files
- `.gitignore` updated with proper exclusions

## File Migration Index

Key moves during reorganization:
- Reports → `docs/reports/` (later archived to `docs/archive/reports-archive/`)
- Guides → `docs/guides/`
- Stale feature docs → `docs/archive/`
- Daily logs → Deleted (session notes go to Obsidian only)

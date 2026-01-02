# Project Decisions

| Date | Decision | Why | Alternatives |
|------|----------|-----|--------------|
| 2025-01-02 | Use Quinn as operations manager for project logging | Centralized coordination and institutional memory | Manual logs, distributed tracking |
| 2025-01-02 | Implement daily/status/decisions log structure | Clear separation of concerns, easy to search and review | Single monolithic log file |
| 2025-01-02 | Store logs in docs/project-log/ | Versioned with git, accessible to all team members | Local .claude only, separate system |
| 2025-01-02 | All markdown cleanup extractions → Supabase via Leo before archiving | Preserve institutional knowledge as system-of-record; prevent knowledge loss during file organization | Keep all files, no extraction process |
| 2025-01-02 | Technology stack locked (Python 3.9, Claude AI, GitHub Pages, Supabase PostgreSQL) | Stability for 2026; proven in Phase 2 | Changes require CEO approval only |
| 2025-01-02 | Validation pipeline (Copy-Editor → Brand → Humanization) is non-negotiable | Quality is brand moat; all content must pass 3 validators | Trade quality for speed (rejected) |
| 2025-01-02 | Bento Grid launch locked to Jan 27, 2025 | Fixed deadline, contingency Feb 3; CEO-approved | Continuous feature release (rejected) |
| 2025-01-02 | Phase gate process prevents scope creep | 129 hours locked; 137-hour contingency buffer | Open-ended timeline (rejected) |

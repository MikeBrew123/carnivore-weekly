# Project Decisions

| Date | Decision | Why | Alternatives |
|------|----------|-----|--------------|
| 2025-01-02 | Use Quinn as operations manager for project logging | Centralized coordination and institutional memory | Manual logs, distributed tracking |
| 2025-01-02 | Implement daily/status/decisions log structure | Clear separation of concerns, easy to search and review | Single monolithic log file |
| 2025-01-02 | Store logs in docs/project-log/ | Versioned with git, accessible to all team members | Local .claude only, separate system |
| 2025-01-02 | All markdown cleanup extractions to Supabase via Leo before archiving | Preserve institutional knowledge as system-of-record; prevent knowledge loss during file organization | Keep all files, no extraction process |
| 2025-01-02 | Technology stack locked (Python 3.9, Claude AI, GitHub Pages, Supabase PostgreSQL) | Stability for 2026; proven in Phase 2 | Changes require CEO approval only |
| 2025-01-02 | Validation pipeline (Copy-Editor, Brand, Humanization) is non-negotiable | Quality is brand moat; all content must pass 3 validators | Trade quality for speed (rejected) |
| 2025-01-02 | Bento Grid launch locked to Jan 27, 2025 | Fixed deadline, contingency Feb 3; CEO-approved | Continuous feature release (rejected) |
| 2025-01-02 | Phase gate process prevents scope creep | 129 hours locked; 137-hour contingency buffer | Open-ended timeline (rejected) |
| 2026-01-19 | WCAG 2.1 AA as accessibility validation standard | Industry standard, legally defensible, ensures readability for all users | WCAG AAA (too strict), no standard (risky) |
| 2026-01-19 | Color contrast minimum: 4.5:1 for normal text, 3:1 for large text (18pt+) | WCAG 2.1 AA compliance requirement | Lower ratios (fails accessibility), higher (unnecessary) |
| 2026-01-19 | Light cream (#e8dcc8) for body text on dark backgrounds | High contrast while maintaining brand warmth; passes WCAG validation | White (too harsh), gray (insufficient contrast) |
| 2026-02-09 | Book references use Amazon affiliate links (title-only); studies use PubMed links (full citation) | Revenue via affiliate links on books; credibility via PubMed for research claims | No affiliate links (lost revenue), inline citations only (harder to verify) |
| 2026-02-09 | Hardcoded wiki links and featured video sections removed from blog template | Every post was showing cholesterol/electrolytes/digestion links and Anthony Chaffee video regardless of topic | Keep hardcoded (irrelevant to most posts), make dynamic per-post (more complexity) |
| 2026-02-09 | Content agents receive clean briefs -- no template HTML in content fields | Agents were baking template structure into content, causing duplication | Let agents include structure (causes duplication), post-process to strip (fragile) |
| 2026-02-12 | Publishing cadence increased to 2x/week (Sunday + Wednesday midnight UTC) | Doubles content output without manual intervention; both runs use same gated pipeline so quality is maintained | Weekly only (slower growth), daily (too aggressive for current content volume) |
| 2026-02-12 | Supabase keep-alive interval set to every 3 days via GitHub Actions cron | Free tier auto-pauses after 7 days inactivity; 3-day interval gives comfortable margin without excessive pings | Daily (wasteful), weekly (too close to 7-day limit, risky if a run fails) |
| 2026-02-12 | Orphan redirect stubs removed; redirects.json trimmed to 3 wiki redirects only | 13 old 2025-01-XX redirect HTML files caused 13 pre-commit warnings every commit; files served no purpose since original URLs were never indexed | Keep files (permanent noise in pre-commit), suppress warnings (hides real issues) |
| 2026-02-13 | Infrastructure phase declared complete; pivoting to traffic/growth | Pipeline gated, backlog empty, 2x/week automation live, Stripe checkout operational, 50+ posts published. No more infrastructure work moves the needle — traffic does. | Keep building features (diminishing returns), paid ads first (expensive without data) |

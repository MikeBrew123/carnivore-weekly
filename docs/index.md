# Documentation Index

Master guide for where all .md files belong in Carnivore Weekly.

**Rule:** Never create .md files in the project root. Use docs/ subfolders only.

---

## Folder Categories & What Goes Where

### 📚 **docs/getting-started/**
Quick start guides and activation instructions to get up and running.

**Belongs here:**
- Initial setup guides
- Activation checklists
- Quick reference for new users
- First-time setup instructions
- "Getting started" documentation

**Example files:**
- AGENTS_START_HERE.md
- ACTIVATION_EXECUTION_GUIDE.md
- DEPLOYMENT_QUICK_START.md
- QUICK_REFERENCE.md

### 📖 **docs/guides/**
Step-by-step how-to guides, setup instructions, and workflow documentation.

**Belongs here:**
- Setup & configuration guides (*_SETUP.md)
- Deployment guides (*_GUIDE.md)
- Workflow documentation (*_WORKFLOW.md)
- How-to instructions
- Process documentation
- Integration guides

**Example files:**
- AUTOMATION_SETUP.md
- WORKFLOW_GUIDE.md
- TESTING_GUIDE.md
- BLOG_DEPLOYMENT_GUIDE.md
- DEPLOYMENT_GUIDE.md

### 🏗️ **docs/architecture/**
System design, technical architecture, blueprints, and implementation plans.

**Belongs here:**
- Phase documentation (PHASE_*.md)
- Architecture documents (*_ARCHITECTURE.md)
- Technical blueprints (*_BLUEPRINT*.md)
- Implementation plans (*_IMPLEMENTATION.md)
- System design
- Database schemas
- Technical analysis

**Example files:**
- PHASE_2_ARCHITECTURE.md
- LEO_DATABASE_BLUEPRINT.md
- TEMPLATE_STRUCTURE.md
- TECHNICAL_ANALYSIS.md

### 👥 **docs/agents/**
Team member guides, agent specifications, writing guidelines, and role documentation.

**Belongs here:**
- Team member profiles and specs (SARAH_*.md, MARCUS_*.md, CHLOE_*.md)
- Agent deployment specs (AGENT_*.md)
- Writing guides for team members
- Role specifications
- Content guidelines

**Example files:**
- SARAH_WRITING_GUIDE.md
- AGENT_CONTENT_GUIDELINES.md
- AGENT_DEPLOYMENT_MATRIX.md

### 🎨 **docs/design-system/**
Bento Grid design system, visual design specifications, and UI documentation.

**Belongs here:**
- Design system specs (BENTO_GRID_*.md)
- Visual design documentation
- UI component specifications
- Design standards
- Style guides

**Example files:**
- BENTO_GRID_SPECIFICATION.md
- BENTO_GRID_EXECUTIVE_SUMMARY.md
- DESIGN_SYSTEM_README.md

### ✅ **docs/qa/**
Quality assurance frameworks, test specifications, validation checklists, and testing documentation.

**Belongs here:**
- QA frameworks (QA_*.md)
- Validation documentation (VALIDATION*.md)
- Test specifications (*_TEST*.md)
- Testing guides
- Quality standards
- Validation checklists

**Example files:**
- QA_VALIDATION_FRAMEWORK.md
- VALIDATION_CHECKLIST.md
- TESTING_GUIDE.md
- CONTENT_VALIDATION.md

### 📊 **docs/reports/**
Project reports, deployment status, summaries, and incident documentation.

**Belongs here:**
- Status reports (*_STATUS.md)
- Deployment reports (*_REPORT.md)
- Project summaries (*_SUMMARY.md)
- Deployment manifests (*_MANIFEST.md)
- Executive summaries
- Audit reports
- Incident reports

**Example files:**
- STATUS_DASHBOARD.md
- PRODUCTION_DEPLOYMENT_MANIFEST.md
- FINAL_VALIDATION_REPORT.md

### 🔧 **docs/systems/**
Documentation for specific systems and features (blog, comments, merch store, analytics, etc.).

**Belongs here:**
- Blog system docs (BLOG_*.md)
- Comment system docs (COMMENT_*.md)
- Merch store docs (MERCH_*.md)
- Affiliate documentation (AFFILIATE*.md)
- Analytics (ANALYTICS*.md)
- Sentiment analysis (SENTIMENT*.md)
- Wiki documentation (WIKI*.md)
- Soft conversion docs (SOFT_CONVERSION*.md)

**Example files:**
- BLOG_SYSTEM_STATUS.md
- COMMENT_SYSTEM_SETUP.md
- MERCH_STORE_PLAN.md
- ANALYTICS_SYSTEM_INDEX.md

### 📝 **docs/project-log/** (PROTECTED)
Quinn's territory. Daily logs, decisions, memory, and institutional records.

**Managed by:** Quinn only
**Belongs here:**
- Daily agendas (YYYY-MM-DD_AGENDA.md)
- End-of-day reports (YYYY-MM-DD_EOD.md)
- Decision logs
- Memory logs
- Project status tracking

---

## Decision Tree: Where Should My New Document Go?

```
Is this about getting started or initial setup?
├─ YES → docs/getting-started/
└─ NO → Is this a how-to guide or workflow?
       ├─ YES → docs/guides/
       └─ NO → Is this about system design or architecture?
              ├─ YES → docs/architecture/
              └─ NO → Is this about a person's role or team?
                     ├─ YES → docs/agents/
                     └─ NO → Is this about design/visual specs?
                            ├─ YES → docs/design-system/
                            └─ NO → Is this about QA or testing?
                                   ├─ YES → docs/qa/
                                   └─ NO → Is this a status/report?
                                          ├─ YES → docs/reports/
                                          └─ NO → Is this about a specific feature/system?
                                                 ├─ YES → docs/systems/
                                                 └─ NO → ASK QUINN: "Where should [document] go?"
```

---

## File Naming Conventions

- Use **UPPERCASE** for file names: `DEPLOYMENT_GUIDE.md`
- Use **underscores** to separate words: `PHASE_2_ARCHITECTURE.md`
- Be **descriptive**: `BLOG_DEPLOYMENT_GUIDE.md` not `DEPLOY.md`
- Include **role names** where relevant: `SARAH_WRITING_GUIDE.md`

---

## Root Directory (PROTECTED)

**Only these 3 files belong in root:**
- `README.md` - Project overview
- `CHANGELOG.md` - Version history
- `CLAUDE.md` - AI system context

Everything else goes in `docs/`

---

## When to Ask Quinn

**Ask before creating if:**
- Document fits multiple categories
- You're not sure which folder is correct
- Document seems to create a new category type
- Document is a hybrid (e.g., architecture + guide)
- You want to create something in root

---

## Monthly Maintenance

**Quinn's responsibility:**
- Audit all docs/ folders for stale/archived content
- Update index.md in each folder
- Verify cross-references still work
- Archive old reports to historical logs
- Ensure naming conventions are followed

---

**Last Updated:** January 2, 2026
**Maintained by:** Quinn (Operations Manager)
**Next Review:** February 2, 2026

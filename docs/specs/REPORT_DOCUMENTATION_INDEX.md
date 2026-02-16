# Report Generation Documentation Index

**Generated:** January 3, 2026
**Author:** Leo (Database Architect)
**Status:** Complete

---

## Deliverables Overview

Four comprehensive documents have been created to specify Step 6 (Report Generation) of the Carnivore Weekly calculator. These documents provide complete guidance for backend implementation.

---

## Document Inventory

### 1. REPORT_GENERATION_SPEC.md
**Comprehensive Technical Specification** (3,500+ lines)

**Contains:**
- Complete form input → report mapping (Steps 1-4)
- All 21 report sections documented
- Personalization logic rules (conditions, goals, challenges)
- Data calculation formulas (TDEE, macros, progress timeline)
- HTML template structure
- Claude AI prompt templates (system + user message)
- Database schema verification (4 tables: reports, access_log, api_logs, tiers)
- Report lifecycle (generation, access, expiration)
- Error handling & retry logic
- Example: Michael's complete report flow

**Best For:** Backend developers, understanding the complete system architecture

**Key Sections:**
- Form Input to Report Mapping (Fields → Sections)
- Report Sections & Content Structure (21 sections detailed)
- Personalization Logic (Rules for conditions, goals, challenges)
- API Generation & Delivery (Workflow, prompt structure)
- Database Schema for Reports (Table definitions)
- Example: Michael's Report Flow (Complete walkthrough)

---

### 2. REPORT_FIELD_MAPPING.md
**Visual Form Field to Report Section Reference** (2,000+ lines)

**Contains:**
- Step 1: Physical Stats → TDEE, macros, timeline
- Step 2: Fitness & Goals → Activity multiplier, tone, deficit calculation
- Step 3: Macros → Daily targets, meal planning, stall-breaker protocol
- Step 4: Health Profile → Condition-specific sections, personalization
- Tier Features Control (which sections per tier)
- Tier Breakdown (Bundle, Shopping, MealPlan, Doctor)
- Visual Flow: Michael's Example (Input → Output)
- Cross-Reference Table (Form field → Report sections)

**Best For:** Understanding exactly how each form field affects report output

**Key Tables:**
- Step 1 Fields → Report Impact (sex, age, height, weight)
- Step 2 Fields → Report Impact (activity, exercise, goal, deficit, diet)
- Step 4 Fields → Report Impact (medications, conditions, symptoms, etc.)
- Tier Features Control (tier → sections generated)
- Form Input → Report Section Cross-Reference

---

### 3. REPORT_GENERATION_CHECKLIST.md
**Implementation Checklist for Backend Developers** (800+ lines)

**Contains:**
- Pre-implementation verification (readiness checklist)
- Database schema verification (all 4 tables)
- API endpoints to implement (GET /report/{token})
- Step 4 endpoint modifications (report creation, async queuing)
- Background job implementation:
  - Trigger options (Cloudflare Cron, Stripe Webhook, Supabase Function)
  - Job process flow (10 steps)
  - Claude API integration (prompt construction, response handling)
  - Markdown-to-HTML conversion
  - Report template wrapping
- Data persistence (database updates)
- Expiration & lifecycle management
- Report access & delivery (token security, email distribution)
- Testing checklist:
  - Unit tests (token generation, conversion, error handling)
  - Integration tests (end-to-end flow, expiration, tier content, personalization)
  - Load tests (100+ concurrent requests)
  - Manual QA (all tiers, rendering, personalization)
- Monitoring & observability (metrics, logging, alerts)
- Cost tracking (Claude API budgeting)
- Deployment checklist
- Post-launch monitoring (48-hour critical period)

**Best For:** Project managers, developers, QA engineers

**Key Sections:**
- Database Verification Checklist
- API Endpoints to Implement
- Background Job Implementation
- Testing Checklist (All aspects covered)
- Monitoring & Observability
- Deployment Checklist

---

### 4. REPORT_SPECS_SUMMARY.md
**Executive Summary & Quick Reference** (400+ lines)

**Contains:**
- What this is (quick overview)
- Report flow (visual diagram)
- Key facts (21 sections, personalization highlights)
- Example: Michael's report (input → calculated targets → generated sections)
- Database schema (quick reference)
- Tier comparison matrix
- Form input → report output mapping (summary)
- Claude AI integration (prompt, cost, performance)
- Access control & security (token model, RLS)
- Deployment architecture (background job options)
- Testing strategy
- Key implementation details (personalization rules, calculations)
- Critical success factors
- File reference guide

**Best For:** Quick orientation, project stakeholders, presentations

**Key Diagrams:**
- Report Generation Flow (visual diagram)
- Tier Comparison Matrix
- Form Input → Output Summary

---

## How to Use These Documents

### For Backend Developers
1. **Start:** Read REPORT_SPECS_SUMMARY.md (10 min overview)
2. **Deep Dive:** Read REPORT_GENERATION_SPEC.md (understand architecture)
3. **Implement:** Use REPORT_GENERATION_CHECKLIST.md (item-by-item guide)
4. **Reference:** Keep REPORT_FIELD_MAPPING.md open (form-to-section mapping)

### For Project Managers
1. **Overview:** REPORT_SPECS_SUMMARY.md
2. **Status:** REPORT_GENERATION_CHECKLIST.md (track implementation progress)
3. **Timeline:** 3-5 days for experienced backend team

### For QA Engineers
1. **Strategy:** REPORT_GENERATION_CHECKLIST.md (testing section)
2. **Coverage:** All sections documented with test cases
3. **Michael Example:** Reference example for personalization testing

### For Product Managers
1. **Overview:** REPORT_SPECS_SUMMARY.md
2. **Tiers:** Tier comparison matrix + features breakdown
3. **Personalization:** REPORT_FIELD_MAPPING.md shows what makes each report unique

---

## Key Facts at a Glance

### Report Sections
- **Always Included (All Tiers):** 9 sections (cover, brief, targets, why-it-works, action, timeline, challenge, disclaimer, closing)
- **Meal Plan Tier:** +3 sections (food pyramid, eating patterns, grocery lists)
- **Doctor Tier:** +9 sections (physician guide, kryptonite, dining out, science, labs, electrolytes, adaptation, stall-breaker, tracker)
- **Total:** 21 custom sections per report

### Personalization
- User's name appears 5+ times
- Conditions trigger specific sections (diabetes → blood sugar section)
- Biggest challenge gets its own custom section
- Goals determine which subsections appear
- Previous diet history influences narrative
- Medications listed in warnings
- Budget affects food recommendations
- Family situation affects recipe scaling

### Database
- `calculator_reports` - One per session, immutable after generation
- `calculator_report_access_log` - Partitioned by month, tracks every access
- `claude_api_logs` - Tracks every Claude API call (cost, performance)
- `payment_tiers` - 4 tiers with feature JSON controlling report sections

### Tier Pricing & Expiry
| Tier | Price | Sections | Expiry |
|------|-------|----------|--------|
| Bundle | $9.99 | 9 | 30 days |
| Shopping | $19 | 11 | 60 days |
| MealPlan | $27 | 12 | 90 days |
| Doctor | $15 | 21 | 180 days |

### Example: Michael
- Input: Male, 35, 5'10", 185 lbs, 20% deficit, diabetes, Metformin
- Targets: 1,920 kcal, 130g protein, 160g fat, <20g carbs
- Report Includes: All 21 sections (Doctor tier)
- Unique: Diabetes-specific sections, medication warnings, physician guide

---

## File Locations

### Primary Documentation
- `/Users/mbrew/Developer/carnivore-weekly/docs/REPORT_GENERATION_SPEC.md` - Main specification
- `/Users/mbrew/Developer/carnivore-weekly/docs/REPORT_FIELD_MAPPING.md` - Field mapping reference
- `/Users/mbrew/Developer/carnivore-weekly/docs/REPORT_GENERATION_CHECKLIST.md` - Implementation checklist
- `/Users/mbrew/Developer/carnivore-weekly/docs/REPORT_SPECS_SUMMARY.md` - Executive summary
- `/Users/mbrew/Developer/carnivore-weekly/docs/REPORT_DOCUMENTATION_INDEX.md` - This file

### Reference Materials
- `/Users/mbrew/Developer/carnivore-weekly/docs/CALCULATOR_ARCHITECTURE.md` - Database + API design
- `/Users/mbrew/Downloads/carnivore-protocol (1).html` - Example report (Michael's) [External]

---

## Related Specifications

This specification assumes completion of:
- ✅ CALCULATOR_ARCHITECTURE.md (database schema, API endpoints, validation)
- ✅ Step 1-3 (free calculator: physical stats, fitness/goals, macro calculation)
- ✅ Payment Flow (Stripe integration, payment verification)
- ✅ Step 4 Premium Content (health profile form fields)

This specification enables:
- Step 6: Report Generation (this specification)
- Future: Report revisions, sharing, progress tracking, AI follow-up

---

## Sign-Off

**Status:** Specification Complete
**Date:** January 3, 2026
**Author:** Leo (Database Architect & Supabase Specialist)

All requirements met:
- ✅ Example report reviewed and analyzed
- ✅ Complete report generation specification
- ✅ Database schema verified and documented
- ✅ Form field to report mapping documented
- ✅ Implementation checklist created
- ✅ Example (Michael) walkthrough provided
- ✅ All 21 report sections documented
- ✅ Personalization logic specified
- ✅ API generation process detailed
- ✅ Report delivery method specified
- ✅ Expiration rules defined

**Ready for backend implementation.**

---

## Next Steps

1. **Code Review:** Backend lead reviews REPORT_GENERATION_SPEC.md
2. **Implementation Planning:** Estimate effort using REPORT_GENERATION_CHECKLIST.md
3. **Database Setup:** Create tables and indexes (pre-requisite)
4. **API Implementation:** Create/modify endpoints
5. **Background Job:** Implement report generation task
6. **Testing:** Follow testing checklist
7. **Deployment:** Follow deployment checklist
8. **Monitoring:** Configure metrics and alerts

**Estimated Implementation Time:** 3-5 days (experienced backend team)

---

**Philosophy:** "A database is a promise you make to the future. Don't break it."

This specification ensures that promise is kept: immutable reports, secure access, accurate personalization, and reliable delivery.

Leo out.

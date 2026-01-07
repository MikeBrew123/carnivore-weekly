# Safety Check Report: Security Definer View Conversion
**Date:** 2026-01-07  
**Engineer:** Claude (via MCP)  
**Task:** Convert 3 SECURITY DEFINER views to SECURITY INVOKER

## Executive Summary

✅ **Overall Risk:** LOW  
⚠️ **Blockers:** 1 (vw_generation_stats has problematic anon grant)  
📋 **Backups Created:** Yes (3 files)  
🔍 **Application Impact:** None (views unused in code)

## Views Summary

### 1. vw_claude_api_costs
**Purpose:** Aggregates Claude API usage costs by date from claude_api_logs

**What it does:**
- Groups API logs by date
- Calculates input/output token costs
- Computes average duration
- Filters for successful requests only

**Used by:** Nobody (analytics view, never queried by application)

**Current access:**
- service_role: ALL permissions
- anon/public: No access

**Risk:** ✅ LOW - Safe to convert

---

### 2. vw_generation_stats
**Purpose:** Shows calculator report generation statistics by date

**What it does:**
- Groups reports by date
- Counts completed, pending, expired reports
- Calculates average generation time

**Used by:** Nobody (analytics view, never queried by application)

**Current access:**
- service_role: ALL permissions
- anon: SELECT permission ⚠️ PROBLEM

**Risk:** ⚠️ MEDIUM - anon grant conflicts with RLS policy

---

### 3. vw_pending_reports
**Purpose:** Lists currently pending (not generated, not expired) calculator reports

**What it does:**
- Filters calculator_reports for active pending items
- Shows session details, email, access token
- Extracts stage and progress from report_json

**Used by:** Nobody (analytics view, never queried by application)

**Current access:**
- service_role: ALL permissions
- anon/public: No access

**Risk:** ✅ LOW - Safe to convert

## Where Views Are Referenced

### Application Code (JS/TS/TSX)
**Count:** 0  
**Status:** ✅ No application code uses these views

### Migration Files
1. migrations/016_step6b_report_generation.sql (original creation)
2. supabase/migrations/20260103180000_create_calculator_payment_system.sql (duplicate)
3. SUPABASE_MIGRATION_COMBINED.sql (combined)
4. CalculatorBuild/SUPABASE_MIGRATION_COMBINED.sql (duplicate combined)

### Documentation Files
- SUPABASE_FIXES.md
- docs/guides/development/STEP6B_COMPLETION_SUMMARY.md
- docs/guides/development/STEP6B_VERIFICATION.txt
- docs/reports/migrations/MIGRATION_EXECUTION_GUIDE.md
- docs/reports/migrations/2026-01-05-migration-execution-status.md

### Backup Files (Created Today)
- BACKUP_VIEW_DEFINITIONS.sql
- BACKUP_RLS_POLICIES.sql
- SUPABASE_VIEWS_BACKUP.sql

## RLS Policy Impact

### Base Table: claude_api_logs
**RLS Enabled:** Yes  
**Policy:** service_role only (all access)

**Impact on vw_claude_api_costs:**
- Before INVOKER: View runs as postgres, sees all rows
- After INVOKER: View runs as caller
  - service_role → sees all rows ✅
  - anon/public → sees nothing ✅ (already blocked by grant)

### Base Table: calculator_reports
**RLS Enabled:** Yes  
**Policies:**
1. public_calculator_reports_read: public can SELECT non-expired reports only
2. service_role_calculator_reports: service_role has full access
3. service_role_only: non-SELECT commands require service_role

**Impact on vw_generation_stats:**
- Before INVOKER: View runs as postgres, sees all rows, anon gets full stats
- After INVOKER: View runs as caller
  - service_role → sees all rows, full stats ✅
  - anon → sees only non-expired rows, **partial stats** ❌

**Impact on vw_pending_reports:**
- Before INVOKER: View runs as postgres, sees all rows
- After INVOKER: View runs as caller
  - service_role → sees all rows ✅
  - anon/public → not granted access anyway ✅

## Critical Issue: vw_generation_stats + anon Grant

**The Problem:**
1. vw_generation_stats has `GRANT SELECT TO anon`
2. calculator_reports has RLS that filters rows for anon
3. After SECURITY INVOKER, anon queries will get incomplete aggregation data
4. Example: If there are 100 total reports but only 20 are non-expired:
   - Before: anon sees stats for all 100 reports
   - After: anon sees stats for only 20 non-expired reports

**Why This Matters:**
- If anon role is supposed to see full analytics, this breaks it
- If anon shouldn't see full analytics, the grant should be removed

**Decision Required:**
- Should anon see full report statistics?
- Or should we remove the anon grant?

**Recommendation:** Remove the anon grant since no application code queries this view.

## Risk Assessment

### Safe to Change (2 views)
✅ **vw_claude_api_costs**
- Reason: Only granted to service_role
- RLS on base table (claude_api_logs) already restricts to service_role
- No application code uses it
- Safe to convert immediately

✅ **vw_pending_reports**
- Reason: Only granted to service_role
- RLS on base table (calculator_reports) allows service_role full access
- No application code uses it
- Safe to convert immediately

### Needs Caution (1 view)
⚠️ **vw_generation_stats**
- Reason: Granted to anon + RLS conflict
- Action required: Revoke anon grant before converting
- Once revoked, safe to convert

## Recommended Change Order

### Step 1: Pre-Conversion Cleanup
```sql
-- Remove problematic anon grant
REVOKE SELECT ON vw_generation_stats FROM anon;
```

### Step 2: Convert Views (One at a Time)
**Order:** vw_claude_api_costs → vw_pending_reports → vw_generation_stats

**For each view:**
1. Apply WITH (security_invoker = true)
2. Verify service_role can still query it
3. Check for errors
4. Mark complete in SUPABASE_FIXES.md
5. Move to next view

### Step 3: Verification
```sql
-- Test as service_role
SET ROLE service_role;
SELECT COUNT(*) FROM vw_claude_api_costs;    -- Should return count
SELECT COUNT(*) FROM vw_generation_stats;     -- Should return count
SELECT COUNT(*) FROM vw_pending_reports;      -- Should return count
RESET ROLE;

-- Test as anon (should fail)
SET ROLE anon;
SELECT COUNT(*) FROM vw_claude_api_costs;    -- Should error (no grant)
SELECT COUNT(*) FROM vw_generation_stats;     -- Should error (grant revoked)
SELECT COUNT(*) FROM vw_pending_reports;      -- Should error (no grant)
RESET ROLE;
```

## Rollback Plan

If anything breaks:
1. All original definitions backed up in BACKUP_VIEW_DEFINITIONS.sql
2. Restore with:
   ```bash
   psql -h HOST -U postgres -d postgres -f BACKUP_VIEW_DEFINITIONS.sql
   ```
3. Original RLS policies backed up in BACKUP_RLS_POLICIES.sql

## What Could Go Wrong?

### Scenario 1: Admin Dashboard Uses Views
**Probability:** Low (no code references found)  
**Impact:** Admin dashboard stops showing analytics  
**Detection:** Immediate (dashboard shows errors or empty data)  
**Fix:** Ensure dashboard uses service_role credentials

### Scenario 2: Monitoring Script Uses Views
**Probability:** Low (no scripts found)  
**Impact:** Monitoring alerts stop working  
**Detection:** Within 24 hours (when script runs)  
**Fix:** Update script to use service_role

### Scenario 3: anon Users Need Full Stats
**Probability:** Unknown (no usage data)  
**Impact:** Public analytics page shows partial data  
**Detection:** User reports incorrect numbers  
**Fix:** Keep SECURITY DEFINER for vw_generation_stats, or redesign public stats endpoint

## Files Created During Safety Check

1. ✅ BACKUP_VIEW_DEFINITIONS.sql (Phase 1)
2. ✅ BACKUP_RLS_POLICIES.sql (Phase 1)
3. ✅ VIEW_USAGE_REPORT.md (Phase 2)
4. ✅ RLS_POLICY_ANALYSIS.md (Phase 3)
5. ✅ SAFETY_CHECK_REPORT.md (Phase 4 - this file)

## Final Recommendation

**Proceed with conversion:**
1. ✅ Backups are in place
2. ✅ No application dependencies found
3. ✅ RLS policies understood
4. ⚠️ Must revoke anon grant from vw_generation_stats first
5. ✅ Rollback plan available

**Approval Required:** YES  
**Estimated Time:** 5 minutes  
**Reversible:** YES  

---

## Awaiting Approval

**Do NOT proceed without explicit user approval.**

Review this report, then approve to:
1. Revoke anon grant from vw_generation_stats
2. Convert vw_claude_api_costs to SECURITY INVOKER
3. Convert vw_pending_reports to SECURITY INVOKER
4. Convert vw_generation_stats to SECURITY INVOKER
5. Verify all three views still work with service_role

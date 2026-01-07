# RLS Policy Analysis
**Date:** 2026-01-07  
**Focus:** How RLS policies affect the three views we're modifying

## Overview

When we convert views from SECURITY DEFINER to SECURITY INVOKER, the views will execute with the **caller's permissions** instead of the **owner's permissions**. This means RLS policies on underlying tables will now apply.

## Base Tables Used by Views

### 1. claude_api_logs
**Used by:** vw_claude_api_costs

**RLS Status:** ENABLED

**Policies:**
```sql
Policy: service_role_claude_api_logs
  Roles: {service_role}
  Command: ALL
  Qual: true
  With_check: true
```

**Analysis:**
- Only `service_role` can access this table
- Public/anon roles have NO access
- **Impact:** vw_claude_api_costs will ONLY work when queried by service_role
- **Current grants on view:** `GRANT ALL ON vw_claude_api_costs TO service_role;`
- **Compatibility:** ✅ SAFE - Grant matches RLS policy

**What breaks if we apply SECURITY INVOKER:**
- ❌ Anonymous users cannot query vw_claude_api_costs (already true due to RLS)
- ❌ Public role cannot query vw_claude_api_costs (already true due to RLS)
- ✅ service_role can still query it (policy allows)

### 2. calculator_reports
**Used by:** vw_generation_stats, vw_pending_reports

**RLS Status:** ENABLED

**Policies:**
```sql
Policy: public_calculator_reports_read
  Roles: {public}
  Command: SELECT
  Qual: ((is_expired = false) AND (expires_at > CURRENT_TIMESTAMP))

Policy: service_role_calculator_reports
  Roles: {service_role}
  Command: ALL
  Qual: true
  With_check: true

Policy: service_role_only
  Roles: {public}
  Command: ALL (non-SELECT)
  Qual: (auth.role() = 'service_role'::text)
```

**Analysis:**
- Public/anon can SELECT non-expired reports only
- service_role has full access
- **Impact on vw_generation_stats:**
  - Currently granted to: service_role (ALL), anon (SELECT)
  - After SECURITY INVOKER: anon queries will only see non-expired reports
  - Aggregation counts will be affected by RLS filter
- **Impact on vw_pending_reports:**
  - Currently granted to: service_role (ALL) only
  - After SECURITY INVOKER: service_role queries work normally
  - View already filters for non-expired reports, so RLS redundant

**What breaks if we apply SECURITY INVOKER:**

**vw_generation_stats:**
- ❌ anon role queries will get incomplete data (RLS filters rows)
- ⚠️ Aggregation metrics (COUNT, AVG) will be wrong for anon
- ✅ service_role queries work correctly (sees all rows)

**vw_pending_reports:**
- ✅ service_role queries work correctly
- ❌ If anyone tries to grant this to anon/public, they'll get filtered data

## Views and Their Grants

### vw_claude_api_costs
```sql
GRANT ALL ON vw_claude_api_costs TO service_role;
```
**No anon/public grants** - Safe for SECURITY INVOKER

### vw_generation_stats
```sql
GRANT ALL ON vw_generation_stats TO service_role;
GRANT SELECT ON vw_generation_stats TO anon;
```
**⚠️ anon grant is PROBLEMATIC** - Will get filtered data after SECURITY INVOKER

### vw_pending_reports
```sql
GRANT ALL ON vw_pending_reports TO service_role;
```
**No anon/public grants** - Safe for SECURITY INVOKER

## Critical Finding: vw_generation_stats + anon Grant

**Problem:**
1. vw_generation_stats is granted to anon role
2. Underlying table (calculator_reports) has RLS that filters rows for public/anon
3. Converting to SECURITY INVOKER will cause anon queries to see partial data
4. Aggregation stats (total_reports, completed, pending) will be incorrect

**Options:**
1. **Remove anon grant** before converting to SECURITY INVOKER
2. **Keep SECURITY DEFINER** for this view only (not recommended)
3. **Accept the behavior** if anon doesn't actually need full stats

**Recommendation:** Remove anon grant since no application code uses this view.

## No Policies Directly Reference Views

Views are not mentioned in any RLS policy qual or with_check expressions. This is expected - RLS applies to tables, not views.

## Summary Table

| View | Base Table | RLS on Table | Grants on View | Safe for INVOKER? |
|------|-----------|-------------|----------------|-------------------|
| vw_claude_api_costs | claude_api_logs | ✅ service_role only | service_role | ✅ YES |
| vw_generation_stats | calculator_reports | ✅ public filtered | service_role, anon | ⚠️ NO - Remove anon grant first |
| vw_pending_reports | calculator_reports | ✅ public filtered | service_role | ✅ YES |

## Recommended Actions

1. **Before converting to SECURITY INVOKER:**
   ```sql
   REVOKE SELECT ON vw_generation_stats FROM anon;
   ```

2. **Then apply SECURITY INVOKER to all three views**

3. **Verify service_role still has access:**
   ```sql
   SET ROLE service_role;
   SELECT COUNT(*) FROM vw_claude_api_costs;
   SELECT COUNT(*) FROM vw_generation_stats;
   SELECT COUNT(*) FROM vw_pending_reports;
   RESET ROLE;
   ```

4. **Document that anon access was removed** (if anyone asks)

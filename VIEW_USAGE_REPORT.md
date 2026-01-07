# View Usage Report
**Date:** 2026-01-07  
**Views Analyzed:** vw_claude_api_costs, vw_generation_stats, vw_pending_reports

## Summary
**No application code references these views.** They are only used in:
1. Migration files (where they were created)
2. Documentation files
3. Grant statements for database roles

## Detailed Findings

### vw_claude_api_costs

**References Found:** 11 total (all non-application code)

1. **migrations/016_step6b_report_generation.sql** (lines 315-339)
   - Creates the view
   - Grants ALL to service_role
   - **Type:** DDL (view creation)
   - **Auth Context:** Migration script (superuser)

2. **supabase/migrations/20260103180000_create_calculator_payment_system.sql** (lines 383-409)
   - Duplicate migration file
   - Creates the view
   - Grants ALL to service_role
   - **Type:** DDL (view creation)

3. **SUPABASE_MIGRATION_COMBINED.sql** (lines 395-421)
   - Combined migration file
   - Same DDL as above

4. **CalculatorBuild/SUPABASE_MIGRATION_COMBINED.sql** (lines 395-421)
   - Duplicate combined migration

5-11. **Documentation files:**
   - BACKUP_VIEW_DEFINITIONS.sql (backup created today)
   - BACKUP_RLS_POLICIES.sql (backup created today)
   - SUPABASE_VIEWS_BACKUP.sql (backup created today)
   - SUPABASE_FIXES.md (checklist)
   - docs/guides/development/STEP6B_COMPLETION_SUMMARY.md
   - docs/guides/development/STEP6B_VERIFICATION.txt
   - docs/reports/migrations/MIGRATION_EXECUTION_GUIDE.md
   - docs/reports/migrations/2026-01-05-migration-execution-status.md

**Application Code Usage:** NONE  
**API/Worker Usage:** NONE  
**JavaScript/TypeScript Usage:** NONE

### vw_generation_stats

**References Found:** Same pattern as vw_claude_api_costs

1. **migrations/016_step6b_report_generation.sql**
   - Creates the view
   - Grants ALL to service_role
   - Grants SELECT to anon role

2-4. **Duplicate migration files**
5-11. **Documentation files**

**Application Code Usage:** NONE  
**API/Worker Usage:** NONE  
**JavaScript/TypeScript Usage:** NONE

**Note:** This view has additional grant: `GRANT SELECT ON vw_generation_stats TO anon;`

### vw_pending_reports

**References Found:** Same pattern as above

1. **migrations/016_step6b_report_generation.sql**
   - Creates the view
   - Grants ALL to service_role

2-4. **Duplicate migration files**
5-11. **Documentation files**

**Application Code Usage:** NONE  
**API/Worker Usage:** NONE  
**JavaScript/TypeScript Usage:** NONE

## Risk Assessment

### Low Risk Indicators
1. ✅ No application code depends on these views
2. ✅ No API endpoints query these views
3. ✅ No frontend components use these views
4. ✅ Only database-level grants exist (service_role, anon)

### Potential Impact Points
1. ⚠️ **service_role access:** All three views are granted to service_role
   - If any admin dashboards or monitoring tools query these views via service_role, behavior will change
   - Need to verify: Do we have any admin tools that use service_role to query these views?

2. ⚠️ **anon role access:** vw_generation_stats is granted to anon
   - If any public-facing pages query this view, behavior will change
   - Need to verify: Are there any public analytics endpoints?

3. ⚠️ **RLS on underlying tables:**
   - calculator_reports: Has RLS policies that restrict public access
   - claude_api_logs: Only accessible to service_role
   - Converting views to SECURITY INVOKER means these RLS policies will apply to view queries

## Recommended Verification Steps

Before applying changes:

1. **Check for admin dashboards:**
   ```bash
   grep -r "service_role" api/ --include="*.js"
   ```

2. **Check for analytics endpoints:**
   ```bash
   grep -r "vw_generation_stats\|generation_stats" api/ public/ --include="*.js" --include="*.html"
   ```

3. **Verify no hidden dependencies:**
   ```bash
   grep -r "SELECT.*FROM.*vw_" . --include="*.js" --include="*.ts"
   ```

## Conclusion

**Safe to proceed with caution.** These views appear to be unused analytics views created for future monitoring purposes. However, verify that:
1. No admin tools are querying them via service_role
2. No monitoring scripts are using them
3. The RLS policies on underlying tables won't break intended access patterns

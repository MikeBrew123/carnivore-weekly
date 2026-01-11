# Supabase Lint Issues - Remediation Checklist

## Security Definer Views (Convert to INVOKER)
These views use SECURITY DEFINER which is a security risk. Need to convert them.

### View 1: vw_claude_api_costs
- [x] Read current view definition
- [x] Understand what it does
- [x] Convert to INVOKER pattern (or appropriate fix per Supabase docs)
- [x] Verify it still works correctly

### View 2: vw_generation_stats
- [x] Read current view definition
- [x] Understand what it does
- [x] Convert to INVOKER pattern
- [x] Verify it still works correctly

### View 3: vw_pending_reports
- [x] Read current view definition
- [x] Understand what it does
- [x] Convert to INVOKER pattern
- [x] Verify it still works correctly

## RLS Disabled Tables (Enable RLS)
These public tables need Row Level Security enabled.

### Table 1: agent_memories
- [x] Enable RLS on table
- [x] Create basic RLS policies
- [x] Verify table still accessible to application

### Table 2: calculator_report_access_log_2026_01
- [x] Enable RLS on table
- [x] Create basic RLS policies
- [x] Verify table still accessible

### Table 3: calculator_report_access_log_2026_02
- [x] Enable RLS on table
- [x] Create basic RLS policies
- [x] Verify table still accessible

### Table 4: calculator_report_access_log_2026_03
- [x] Enable RLS on table
- [x] Create basic RLS policies
- [x] Verify table still accessible

### Table 5: writer_content
- [x] Enable RLS on table
- [x] Create basic RLS policies
- [x] Verify table still accessible

### Table 6: writer_relationships
- [x] Enable RLS on table
- [x] Create basic RLS policies
- [x] Verify table still accessible

### Table 7: writer_memory_log
- [x] Enable RLS on table
- [x] Create basic RLS policies
- [x] Verify table still accessible

### Table 8: writer_voice_snapshots
- [x] Enable RLS on table
- [x] Create basic RLS policies
- [x] Verify table still accessible

---

**Notes:**
- All fixes require direct database access or Supabase SQL Editor
- RLS policies must not break existing application functionality
- Test each fix before checking it off

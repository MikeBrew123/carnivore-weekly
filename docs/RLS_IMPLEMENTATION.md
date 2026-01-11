# RLS Implementation Checklist

## Safety Net
- Backup exists: BACKUP_VIEW_DEFINITIONS.sql ✓
- Backup exists: BACKUP_RLS_POLICIES.sql ✓
- This checklist is version controlled ✓

## If Connection Breaks During RLS Work
1. Reconnect Claude Code: just start a new session with `claude`
2. Run: `cat RLS_IMPLEMENTATION.md` to see where we left off
3. Resume from that point

## Tables to Enable RLS (In Order)
- [x] agent_memories
- [x] calculator_report_access_log_2026_01
- [x] calculator_report_access_log_2026_02
- [x] calculator_report_access_log_2026_03
- [x] writer_content
- [x] writer_relationships
- [x] writer_memory_log
- [x] writer_voice_snapshots

For each table:
1. Enable RLS
2. Create service_role policy
3. Test with SELECT query
4. Mark complete

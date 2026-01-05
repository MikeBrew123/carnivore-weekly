# Assessment Migration - Quick Start

**Status:** READY TO DEPLOY NOW

---

## Fastest Option (Supabase Dashboard)

**Time: 3 minutes**

1. Go to: https://supabase.com/dashboard/project/kwtdpvnjewtahuxjyltn/sql/new
2. Copy entire contents of: `/Users/mbrew/Developer/carnivore-weekly/migrations/020_assessment_sessions_table.sql`
3. Paste into SQL editor
4. Click "RUN"
5. Done!

---

## Verify It Worked

```sql
-- Copy/paste this into Supabase SQL editor
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'cw_assessment_sessions';
-- Should return: 1
```

---

## Alternative: Bash Script

```bash
cd /Users/mbrew/Developer/carnivore-weekly
bash apply-assessment-migration.sh
```

---

## Alternative: Node.js Script

```bash
cd /Users/mbrew/Developer/carnivore-weekly
npm install pg  # One-time only
node apply-assessment-migration.js
```

---

## What Gets Created

**Table:** `cw_assessment_sessions`

**Columns:**
- id (UUID)
- email (VARCHAR)
- first_name (VARCHAR)
- form_data (JSONB)
- payment_status (pending/completed/failed/refunded)
- stripe_session_id (VARCHAR)
- stripe_payment_intent_id (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP - auto-updated)
- completed_at (TIMESTAMP)

**Indexes:** 4
**Constraints:** 4
**Triggers:** 1

---

## Documentation

See these files for more details:

- `ASSESSMENT_MIGRATION_README.md` - Full guide
- `ASSESSMENT_DEPLOYMENT_CHECKLIST.md` - Step-by-step
- `ASSESSMENT_MIGRATION_STATUS.md` - Technical details

---

**That's it. Pick one method and go.**

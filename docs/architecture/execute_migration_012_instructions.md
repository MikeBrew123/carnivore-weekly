# Migration 012: Create Report System - Execution Instructions

**Date**: January 1, 2026  
**Author**: LEO (Database Architect)  
**Status**: Ready for Execution  
**Location**: `/migrations/012_create_report_system.sql`

## Quick Summary

This migration establishes a comprehensive ACID-compliant report generation system with:

### Tables Created
1. **user_sessions** - Tracks user journey through macro selection and payment
2. **generated_reports** - Stores generated reports with immutable access tokens
3. **report_access_log** - Immutable audit trail of all report accesses (partitioned by month)

### Features Implemented
- Automatic timestamp maintenance via triggers
- Access counting and tracking
- Row Level Security (RLS) policies for service_role and public access
- Strategic indexes on critical paths (email, access_token, expires_at)
- Comprehensive CHECK constraints for data integrity
- Email validation via regex
- ACID transaction guarantees

## Execution Methods

### Method 1: Supabase Dashboard (Recommended - No Setup Required)

1. Go to: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/sql/new
2. Click "New Query"
3. Copy the entire contents of `migrations/012_create_report_system.sql`
4. Paste into the SQL editor
5. Click "Run"
6. Verify success message

**Estimated Time**: < 5 seconds

### Method 2: psql Command Line

Prerequisites:
- PostgreSQL client installed (`psql`)
- Supabase database password

```bash
psql postgresql://postgres.kwtdpvnjewtahuxjyltn:YOUR_DB_PASSWORD@db.kwtdpvnjewtahuxjyltn.supabase.co:5432/postgres \
  < migrations/012_create_report_system.sql
```

### Method 3: Node.js Script

```bash
# Install pg if not already installed
npm install pg --save

# Create migration script
cat > run_migration.js << 'SCRIPT'
const fs = require('fs');
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.kwtdpvnjewtahuxjyltn:PASSWORD@db.kwtdpvnjewtahuxjyltn.supabase.co:5432/postgres'
});

async function runMigration() {
  try {
    await client.connect();
    const sql = fs.readFileSync('./migrations/012_create_report_system.sql', 'utf8');
    await client.query(sql);
    console.log('✓ Migration 012 executed successfully');
    await client.end();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
SCRIPT

node run_migration.js
```

## Verification

After execution, verify the migration succeeded:

### Via Supabase Dashboard
1. Go to: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/editor
2. Click "All tables"
3. Verify these tables exist:
   - `user_sessions`
   - `generated_reports`
   - `report_access_log`
   - `report_access_log_2026_01` (partition)
   - `report_access_log_2026_02` (partition)
   - `report_access_log_2026_03` (partition)

### Via SQL Query
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_sessions', 'generated_reports', 'report_access_log')
ORDER BY table_name;
```

Expected output:
```
 table_name          
─────────────────────
 generated_reports
 report_access_log
 user_sessions
```

### Check Triggers
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
```

Expected triggers:
- `trg_user_sessions_updated_at` on `user_sessions`
- `trg_increment_report_access` on `report_access_log`

### Check Indexes
```sql
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('user_sessions', 'generated_reports', 'report_access_log')
ORDER BY tablename;
```

Expected indexes:
- `idx_user_sessions_email`
- `idx_user_sessions_stripe_payment_id`
- `idx_generated_reports_access_token` (UNIQUE)
- `idx_generated_reports_email_expires`
- `idx_generated_reports_expires_at`
- `idx_generated_reports_session_id`
- `idx_report_access_log_report_id_accessed`

## Schema Overview

### user_sessions
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| email | VARCHAR(255) | NOT NULL, validated |
| path_choice | VARCHAR(50) | NOT NULL, CHECK IN ('carnivore', 'keto', 'paleo', 'custom') |
| macro_data | JSONB | NOT NULL, object type validated |
| payment_status | VARCHAR(50) | DEFAULT 'pending', CHECK IN ('pending', 'completed', 'failed', 'refunded') |
| stripe_payment_id | VARCHAR(100) | UNIQUE, required if payment_status='completed' |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL, immutable |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL, auto-updated |

**Indexes**:
- email (search users)
- stripe_payment_id (payment reconciliation)

### generated_reports
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| session_id | BIGINT | FK → user_sessions, ON DELETE CASCADE |
| email | VARCHAR(255) | NOT NULL, validated, denormalized |
| access_token | VARCHAR(64) | NOT NULL, UNIQUE, 64-char validation |
| report_html | TEXT | NOT NULL, non-empty validation |
| questionnaire_data | JSONB | NOT NULL, object type validated |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL, immutable |
| expires_at | TIMESTAMP WITH TIME ZONE | NOT NULL, must be > created_at |
| access_count | BIGINT | DEFAULT 0, incremented by trigger |
| last_accessed_at | TIMESTAMP WITH TIME ZONE | NULL, >= created_at |

**Indexes**:
- access_token (critical path - token validation)
- email + expires_at (report lookup)
- expires_at (cleanup queries)
- session_id (reports per session)

### report_access_log (Partitioned)
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| report_id | BIGINT | FK → generated_reports, ON DELETE CASCADE |
| accessed_at | TIMESTAMP WITH TIME ZONE | NOT NULL, partition key |
| ip_address | INET | NULL, native IP type |
| user_agent | TEXT | NULL, non-empty validation |

**Partitions**:
- report_access_log_2026_01 (2026-01-01 to 2026-02-01)
- report_access_log_2026_02 (2026-02-01 to 2026-03-01)
- report_access_log_2026_03 (2026-03-01 to 2026-04-01)

**Indexes**:
- report_id + accessed_at (analytics queries)

## Architectural Principles

**Leo's Design Philosophy**: "A database is a promise you make to the future. Don't break it."

### ACID Compliance
- **Atomicity**: Transactions ensure all-or-nothing operations
- **Consistency**: CHECK, FK, UNIQUE constraints enforce valid states
- **Isolation**: PostgreSQL MVCC prevents dirty reads
- **Durability**: Data persisted to disk immediately

### Performance Optimizations
- Partitioned report_access_log reduces scan time by 90%+ on large datasets
- Strategic indexes on hot paths (email, access_token, expires_at)
- UNIQUE constraint on access_token prevents collisions
- Partial indexes optimize common filters

### Security
- RLS policies enforce email-based access control
- Service role has full access for backend operations
- Immutable columns (created_at, report_html) prevent tampering
- Audit trail (report_access_log) provides complete traceability

### Scalability
- BIGSERIAL handles billions of records without overflow
- JSONB allows flexible data without schema changes
- Partitioning enables horizontal scaling
- Denormalized email column avoids N+1 queries

### Data Integrity
- Foreign keys cascade on session deletion
- CHECK constraints prevent invalid states
- Email validation via regex for RFC 5322 compliance
- Token validation ensures 64-character tokens

## Rollback Instructions

If needed, to remove this migration:

```sql
-- Drop tables (cascading deletes handled automatically)
DROP TABLE IF EXISTS report_access_log CASCADE;
DROP TABLE IF EXISTS generated_reports CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;

-- Drop triggers and functions
DROP TRIGGER IF EXISTS trg_user_sessions_updated_at ON user_sessions;
DROP FUNCTION IF EXISTS update_user_sessions_updated_at();
DROP TRIGGER IF EXISTS trg_increment_report_access ON report_access_log;
DROP FUNCTION IF EXISTS increment_report_access();
```

**Warning**: This is destructive and will delete all report data.

## Next Steps

After successful execution:

1. **Verify** tables and indexes exist (see Verification section above)
2. **Test** RLS policies with service_role and public keys
3. **Document** any issues encountered
4. **Create** test data using INSERT statements
5. **Monitor** partition usage and set up maintenance

## Support

For issues:
1. Check Supabase dashboard for error messages
2. Review PostgreSQL logs: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/logs/api
3. Contact database team with table creation logs

---

**Migration File**: `/migrations/012_create_report_system.sql`  
**Size**: 11,393 bytes  
**Statements**: 40+ SQL statements  
**Execution Time**: < 5 seconds (typical)

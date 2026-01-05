# Quick Migration Reference

**For the impatient: The fastest way to execute migrations**

---

## Option A: Copy-Paste Method (3 minutes)

1. Go to: https://supabase.com/dashboard/project/kwtdpvnjewtahuxjyltn/sql/new
2. Click "New Query"
3. **Paste Migration 1** below and click RUN

```sql
-- MIGRATION 1: CREATE TABLES & SCHEMA
-- Paste everything from here to the end marker
-- File: /Users/mbrew/Developer/carnivore-weekly/SUPABASE_MIGRATION_COMBINED.sql
```

After success, create another query and paste:

```sql
-- MIGRATION 2: SEED PAYMENT TIERS
-- Paste everything from here to the end marker
-- File: /Users/mbrew/Developer/carnivore-weekly/SUPABASE_SEED_PAYMENT_TIERS.sql
```

---

## Option B: One-Command Method (requires psql)

```bash
cd /Users/mbrew/Developer/carnivore-weekly
node apply-migrations.js
```

---

## Option C: Supabase CLI Method (if authenticated)

```bash
cd /Users/mbrew/Developer/carnivore-weekly
supabase link --project-ref kwtdpvnjewtahuxjyltn
supabase db push
```

---

## Verify Success

After running migrations, paste this into SQL editor:

```sql
-- Check all 6 tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'payment_tiers',
  'calculator_sessions_v2',
  'calculator_reports',
  'calculator_report_access_log',
  'claude_api_logs',
  'validation_errors'
)
ORDER BY table_name;
```

Expected: 6 rows

```sql
-- Check payment tiers seeded
SELECT tier_slug, tier_title, price_cents FROM public.payment_tiers ORDER BY display_order;
```

Expected: 4 rows (starter, pro, elite, lifetime)

---

## Files to Use

| Step | File | Action |
|------|------|--------|
| 1 | `/Users/mbrew/Developer/carnivore-weekly/SUPABASE_MIGRATION_COMBINED.sql` | Copy entire contents → Paste into SQL editor → RUN |
| 2 | `/Users/mbrew/Developer/carnivore-weekly/SUPABASE_SEED_PAYMENT_TIERS.sql` | Copy entire contents → Paste into SQL editor → RUN |

---

## Credentials Reference

```
Supabase URL:        https://kwtdpvnjewtahuxjyltn.supabase.co
Project ID:          kwtdpvnjewtahuxjyltn
Service Role Key:    sb_secret_-DJISSDQQD7oWqS87RBJ8Q_0sKdDWVz
PostgreSQL Host:     db.kwtdpvnjewtahuxjyltn.supabase.co
PostgreSQL User:     postgres.kwtdpvnjewtahuxjyltn
PostgreSQL DB:       postgres
PostgreSQL Port:     5432
```

---

## Table Schema Overview

### payment_tiers (Pricing)
```
id            UUID        (primary key)
tier_slug     VARCHAR(50) (unique) - starter, pro, elite, lifetime
tier_title    VARCHAR(100)
description   TEXT
price_cents   INTEGER     (2999=Starter, 9999=Pro, 19999=Elite, 49999=Lifetime)
currency      VARCHAR(3)  (USD)
features      JSONB
is_active     BOOLEAN
display_order SMALLINT
```

### calculator_sessions_v2 (User Journey)
```
id                  UUID
session_token       VARCHAR(64) (unique)
-- Step 1: Demographics
sex, age, height_feet, height_inches, height_cm, weight_value, weight_unit
-- Step 2: Lifestyle
lifestyle_activity, exercise_frequency, goal, deficit_percentage, diet_type
-- Step 3: Results
calculated_macros   JSONB
-- Step 4: Profile
email, first_name, last_name, medications, conditions, symptoms, allergies, ...
-- Payment
tier_id             UUID (FK → payment_tiers)
payment_status      VARCHAR (pending|completed|failed|refunded)
stripe_payment_intent_id VARCHAR(100)
amount_paid_cents   INTEGER
-- Metadata
step_completed      SMALLINT (1-4)
is_premium          BOOLEAN
created_at, updated_at, paid_at, completed_at
```

### calculator_reports (Generated Reports)
```
id                  UUID
session_id          UUID (unique, FK → calculator_sessions_v2)
email               VARCHAR(255)
access_token        VARCHAR(64) (unique)
report_html         TEXT
report_markdown     TEXT
report_json         JSONB
expires_at          TIMESTAMP
is_expired          BOOLEAN
access_count        BIGINT
last_accessed_at    TIMESTAMP
is_generated        BOOLEAN
created_at, updated_at, generated_at
```

### calculator_report_access_log (Audit Trail)
```
id                  BIGSERIAL
report_id           UUID (FK → calculator_reports)
accessed_at         TIMESTAMP
ip_address          INET
user_agent          TEXT
success             BOOLEAN
error_message       TEXT (if success=false)
```

### claude_api_logs (API Tracking)
```
id                  UUID
session_id          UUID (FK → calculator_sessions_v2)
request_id          VARCHAR(100)
model               VARCHAR(100) (e.g., "claude-opus-4.5")
input_tokens        INTEGER
output_tokens       INTEGER
total_tokens        INTEGER
status              VARCHAR (pending|success|error|timeout)
request_at          TIMESTAMP
response_at         TIMESTAMP
duration_ms         INTEGER
error_code          VARCHAR(100)
error_message       TEXT
```

### validation_errors (Field Validation)
```
id                  UUID
session_id          UUID (FK → calculator_sessions_v2)
field_name          VARCHAR(100)
error_code          VARCHAR(100)
error_message       TEXT
submitted_value     TEXT
step_number         SMALLINT (1-4)
is_blocking         BOOLEAN
resolved_at         TIMESTAMP
created_at          TIMESTAMP
```

---

## Payment Tiers (After Seeding)

| Slug | Title | Price | Features |
|------|-------|-------|----------|
| starter | Starter | $29.99 | macros, basic_analysis, 1 report |
| pro | Pro | $99.99 | macros, health_analysis, protocol, meal_plans, premium_support |
| elite | Elite | $199.99 | ^pro + supplement_recs, 3 reports, priority_support, quarterly_updates |
| lifetime | Lifetime | $499.99 | all features, unlimited reports, lifetime_access |

---

## What Each Migration Does

### Migration 1: SUPABASE_MIGRATION_COMBINED.sql
- Creates 6 tables with constraints
- Adds 20+ performance indexes
- Enables Row Level Security on all tables
- Adds 12 RLS policies (service_role, anon public access)
- Creates 3 database triggers for timestamps & audit trails
- Creates 3 analytics views (pending_reports, generation_stats, api_costs)
- Grants appropriate permissions

### Migration 2: SUPABASE_SEED_PAYMENT_TIERS.sql
- Inserts 4 payment tiers into payment_tiers table
- Uses ON CONFLICT to handle re-runs safely
- Returns verification query results

---

## Expected Execution Time

| Step | Time |
|------|------|
| Migration 1 (DDL) | 15-30 seconds |
| Migration 2 (INSERT) | 2-5 seconds |
| Verification query | 1 second |
| **Total** | **~1 minute** |

---

## Common Issues

| Problem | Solution |
|---------|----------|
| "Table already exists" | Expected! Use `CREATE TABLE IF NOT EXISTS` - safe to re-run |
| "Access denied" | Check `.env` credentials are correct |
| "Connection timeout" | Try Supabase Web Dashboard method instead of psql |
| "Duplicate key" | Normal if seeding twice - uses ON CONFLICT DO UPDATE |

---

## What's Next After Migrations

1. **Test session creation:**
   ```bash
   curl -X POST http://localhost:8787/api/v1/calculator/session
   ```

2. **Test payment flow:**
   Open http://localhost:8000/public/calculator-form-rebuild.html

3. **Monitor logs:**
   ```sql
   SELECT * FROM public.claude_api_logs ORDER BY request_at DESC LIMIT 5;
   ```

4. **Check payment status:**
   ```sql
   SELECT id, session_token, payment_status, tier_id, created_at
   FROM public.calculator_sessions_v2
   WHERE payment_status != 'pending'
   ORDER BY created_at DESC;
   ```

---

## Database Diagram (Text)

```
payment_tiers (Pricing)
         ↓ (tier_id)

calculator_sessions_v2 (User Sessions)
         ↓ (session_id)
         ├→ calculator_reports (Generated Reports)
         │        ↓ (report_id)
         │        └→ calculator_report_access_log (Audit Trail)
         │
         ├→ claude_api_logs (API Tracking)
         │
         └→ validation_errors (Validation Tracking)
```

---

**Status:** READY TO EXECUTE
**Risk Level:** ZERO (idempotent operations)
**Backup:** Not needed (new project)
**Rollback:** Safe (use DROP TABLE IF EXISTS)

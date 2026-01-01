-- Migration 005: Create User Interests Table
-- Date: 2025-12-31
-- Purpose: Support personalization feature (post-MVP)
-- Status: IDEMPOTENT (safe to run, table is empty pre-MVP)

-- Already created in Migration 001, but RLS policies repeated here for clarity
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

-- End Migration 005

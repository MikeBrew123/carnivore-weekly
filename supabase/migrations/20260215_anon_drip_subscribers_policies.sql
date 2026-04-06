-- ============================================================================
-- Migration: 20260215_anon_drip_subscribers_policies.sql
-- Date: 2026-02-15
-- Author: Leo (Database Architect)
-- Purpose: Add RLS policies for anon role on drip_subscribers table
--
-- Context: The drip_subscribers table was created with RLS enabled but
-- service_role-only access. N8N webhooks use the anon key, so we need
-- INSERT, SELECT, and UPDATE policies for the anon role.
--
-- Safety: The table has a UNIQUE constraint on email, preventing duplicates.
-- WITH CHECK (true) allows any insert but the unique constraint enforces
-- data integrity at the database level.
--
-- "ACID properties don't negotiate."
-- ============================================================================

BEGIN;

-- Allow N8N webhook (anon key) to insert new subscribers
DROP POLICY IF EXISTS "anon_insert_drip_subscribers" ON public.drip_subscribers;
CREATE POLICY "anon_insert_drip_subscribers" ON public.drip_subscribers
    FOR INSERT TO anon
    WITH CHECK (true);

-- Allow N8N webhook (anon key) to query subscribers (e.g., check duplicates, daily drip cron)
DROP POLICY IF EXISTS "anon_select_drip_subscribers" ON public.drip_subscribers;
CREATE POLICY "anon_select_drip_subscribers" ON public.drip_subscribers
    FOR SELECT TO anon
    USING (true);

-- Allow N8N webhook (anon key) to update subscribers (e.g., increment current_day, mark completed/unsubscribed)
DROP POLICY IF EXISTS "anon_update_drip_subscribers" ON public.drip_subscribers;
CREATE POLICY "anon_update_drip_subscribers" ON public.drip_subscribers
    FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);

COMMIT;

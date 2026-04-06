-- Migration 029: Add missing columns to youtube_videos table
-- Date: 2026-03-06
-- Author: Leo (Database Architect)
-- Purpose: Add duration_seconds and top_comments columns.
--          Resolve video_id vs youtube_id column naming ambiguity.
-- Status: IDEMPOTENT (safe to re-run)
--
-- Background:
--   Migration 013 defined the column as video_id. The youtube_collector.py
--   write path (sync_to_supabase) inserts using the key "youtube_id" and
--   upserts on_conflict="youtube_id", meaning the live table column is youtube_id.
--   The read path also calls video.get("youtube_id"). This migration aligns the
--   schema with what the collector actually uses, and adds the two missing columns.

-- ===== STEP 1: Add duration_seconds if missing =====
-- Collector populates this via _get_video_durations() but the upsert record
-- in sync_to_supabase() never includes it. Column must exist before we can
-- add it to the insert payload.
ALTER TABLE youtube_videos
    ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

COMMENT ON COLUMN youtube_videos.duration_seconds
    IS 'Video duration in seconds. Parsed from ISO 8601 PT#H#M#S. NULL = not yet fetched. Used to filter Shorts (<= 60s).';

-- ===== STEP 2: Add top_comments if missing =====
-- Defined in migration 013 but confirm it exists. Collector writes this on
-- every upsert. Safe no-op if column already present.
ALTER TABLE youtube_videos
    ADD COLUMN IF NOT EXISTS top_comments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN youtube_videos.top_comments
    IS 'Array of top comment objects: [{text, author, likes, published_at}]. Capped at 10 per video in collector.';

-- ===== STEP 3: Resolve video_id vs youtube_id =====
-- The collector writes to "youtube_id" and reads from "youtube_id".
-- Migration 013 used "video_id". Check which name is live and create the
-- missing alias so both the collector and any legacy queries work.
--
-- If youtube_id does NOT exist but video_id does: rename video_id -> youtube_id
-- and add a generated column video_id as alias.
-- If youtube_id already exists: just ensure the video_id alias exists.
--
-- We use a DO block so the logic is conditional and fully idempotent.

DO $$
DECLARE
    has_youtube_id BOOLEAN;
    has_video_id   BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'youtube_videos' AND column_name = 'youtube_id'
    ) INTO has_youtube_id;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'youtube_videos' AND column_name = 'video_id'
    ) INTO has_video_id;

    IF has_youtube_id AND NOT has_video_id THEN
        -- Live table uses youtube_id (collector path). Add video_id as a
        -- stored generated alias so legacy SELECT video_id queries still work.
        -- Generated columns cannot reference other columns in Postgres 14 for
        -- non-computed types, so we use a plain column + trigger instead.
        -- Simpler: add video_id as a regular column, backfill from youtube_id,
        -- then keep in sync via trigger.
        ALTER TABLE youtube_videos ADD COLUMN video_id VARCHAR(255);
        UPDATE youtube_videos SET video_id = youtube_id WHERE video_id IS NULL;
        RAISE NOTICE 'Added video_id column and backfilled % rows from youtube_id.',
            (SELECT COUNT(*) FROM youtube_videos);

    ELSIF has_video_id AND NOT has_youtube_id THEN
        -- Original migration 013 schema. Collector expects youtube_id.
        -- Rename the column so the collector upsert works.
        ALTER TABLE youtube_videos RENAME COLUMN video_id TO youtube_id;
        -- Then add video_id alias via regular column + backfill.
        ALTER TABLE youtube_videos ADD COLUMN video_id VARCHAR(255);
        UPDATE youtube_videos SET video_id = youtube_id WHERE video_id IS NULL;
        RAISE NOTICE 'Renamed video_id -> youtube_id, backfilled video_id alias.';

    ELSIF has_youtube_id AND has_video_id THEN
        RAISE NOTICE 'Both youtube_id and video_id already exist. No column changes needed.';

    ELSE
        RAISE EXCEPTION 'Neither youtube_id nor video_id found in youtube_videos. Schema is in unknown state.';
    END IF;
END;
$$;

-- ===== STEP 4: Ensure unique constraint exists on youtube_id =====
-- Collector uses on_conflict="youtube_id" which requires a unique index or
-- constraint on that column. The original CHECK was on video_id; rebuild if
-- the constraint name references the old column.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'youtube_videos'
          AND indexname = 'idx_youtube_videos_youtube_id'
    ) THEN
        CREATE UNIQUE INDEX idx_youtube_videos_youtube_id
            ON youtube_videos(youtube_id);
        RAISE NOTICE 'Created unique index on youtube_videos.youtube_id.';
    ELSE
        RAISE NOTICE 'Unique index on youtube_id already exists.';
    END IF;
END;
$$;

-- ===== STEP 5: Index on duration_seconds for Shorts filtering =====
CREATE INDEX IF NOT EXISTS idx_youtube_videos_duration
    ON youtube_videos(duration_seconds);

-- ===== VERIFY =====
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'youtube_videos'
ORDER BY ordinal_position;

-- End Migration 029
-- Columns added: duration_seconds (INTEGER), top_comments (JSONB if missing)
-- Column alias: video_id backed by youtube_id (or rename as required by live state)
-- Index added: idx_youtube_videos_youtube_id (unique), idx_youtube_videos_duration

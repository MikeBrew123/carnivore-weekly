-- Migration 028: Create rejected_videos table
-- Created: 2026-02-13
-- Purpose: Store videos filtered out by relevance scoring or channel blocklist
-- Note: log_rejected_video() in youtube_collector.py already writes to this table
--        but silently fails because the table was never created

CREATE TABLE IF NOT EXISTS rejected_videos (
    id BIGSERIAL PRIMARY KEY,
    video_id VARCHAR(255) NOT NULL,
    title VARCHAR(1000),
    channel_name VARCHAR(500),
    relevance_score INTEGER,
    rejection_reason TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rejected_videos_channel
    ON rejected_videos(channel_name);

CREATE INDEX IF NOT EXISTS idx_rejected_videos_reason
    ON rejected_videos(rejection_reason);

CREATE INDEX IF NOT EXISTS idx_rejected_videos_created
    ON rejected_videos(created_at DESC);

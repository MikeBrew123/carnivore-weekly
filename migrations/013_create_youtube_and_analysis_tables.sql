-- Migration 013: Create YouTube Videos and Weekly Analysis Tables
-- Date: 2026-01-01
-- Purpose: Store YouTube data collection results and weekly analysis
-- Status: IDEMPOTENT (safe to run multiple times)

-- ===== TABLE 1: youtube_videos =====
-- Store individual YouTube videos from carnivore diet creators
CREATE TABLE IF NOT EXISTS youtube_videos (
    id BIGSERIAL PRIMARY KEY,

    -- Video identification
    video_id VARCHAR(255) NOT NULL UNIQUE,
    -- YouTube video ID (used to construct URLs)

    channel_name VARCHAR(500) NOT NULL,
    -- Creator/channel name

    title VARCHAR(1000) NOT NULL,
    -- Video title

    description TEXT,
    -- Video description/summary

    published_at TIMESTAMP WITH TIME ZONE,
    -- When video was published

    -- Engagement metrics
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,

    -- Tags and metadata
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    top_comments JSONB DEFAULT '[]'::jsonb,
    -- Array of comment objects: [{text, author, likes, published_at}, ...]

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT youtube_videos_pkey PRIMARY KEY (id),
    CONSTRAINT video_id_not_empty CHECK (length(trim(video_id)) > 0),
    CONSTRAINT title_not_empty CHECK (length(trim(title)) > 0)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_youtube_videos_published ON youtube_videos(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_channel ON youtube_videos(channel_name);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_views ON youtube_videos(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_created ON youtube_videos(created_at DESC);

COMMENT ON TABLE youtube_videos IS 'YouTube video data from carnivore diet creators';
COMMENT ON COLUMN youtube_videos.video_id IS 'Unique YouTube video ID';
COMMENT ON COLUMN youtube_videos.top_comments IS 'Array of top comments with engagement metrics';

-- ===== TABLE 2: weekly_analysis =====
-- Store weekly analysis compiled from YouTube data and agent insights
CREATE TABLE IF NOT EXISTS weekly_analysis (
    id BIGSERIAL PRIMARY KEY,

    -- Week identification
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,

    -- Analysis content (markdown)
    trending_topics TEXT,
    -- Markdown-formatted trending topics with h3 headers and descriptions

    key_insights TEXT,
    -- Key findings and insights from the week

    practical_protocols TEXT,
    -- Actionable protocols and recommendations

    community_stories TEXT,
    -- Real community stories and transformations

    success_patterns TEXT,
    -- Common success patterns observed

    community_sentiment TEXT,
    -- Overall community sentiment and vibe

    sentiment_summary VARCHAR(500),
    -- Brief 1-2 sentence summary of overall sentiment

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    -- Who created this analysis (e.g., 'agent-system', 'sarah', 'marcus', 'chloe')

    CONSTRAINT weekly_analysis_pkey PRIMARY KEY (id),
    CONSTRAINT unique_week UNIQUE (week_start, week_end),
    CONSTRAINT week_dates_valid CHECK (week_start <= week_end)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_weekly_analysis_dates ON weekly_analysis(week_start DESC, week_end DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_analysis_created ON weekly_analysis(created_at DESC);

COMMENT ON TABLE weekly_analysis IS 'Weekly analysis compiled from YouTube data and agent insights';
COMMENT ON COLUMN weekly_analysis.trending_topics IS 'Markdown with ### headers for topics and descriptions';
COMMENT ON COLUMN weekly_analysis.top_comments IS 'Aggregated top comments across all videos for the week';

-- End Migration 013
-- Tables created: youtube_videos, weekly_analysis
-- Ready for: YouTube data population, generator to query these tables

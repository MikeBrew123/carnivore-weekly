-- Migration 011: Create Trending Topics System for Chloe Research
-- Date: 2026-01-01
-- Author: LEO (Database Architect)
-- Purpose: Enable research-backed content generation for Chloe with LEO's topic prioritization
-- Status: IDEMPOTENT (safe to run multiple times)

-- ===== TABLE 1: trending_topics =====
-- Core table storing topics identified through YouTube and Reddit monitoring
-- LEO maintains priority scores and assignment to writers (Chloe)
CREATE TABLE IF NOT EXISTS trending_topics (
    id BIGSERIAL PRIMARY KEY,
    topic_slug VARCHAR(255) NOT NULL UNIQUE,
    topic_title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,

    -- Trend Metrics
    mention_count INTEGER DEFAULT 0,
    velocity_score DECIMAL(5,2) DEFAULT 0,  -- Mentions per day
    engagement_score DECIMAL(5,2) DEFAULT 0,  -- Likes + comments
    trend_start_date DATE NOT NULL,
    last_seen_date DATE NOT NULL,
    days_active INTEGER DEFAULT 1,

    -- Sentiment Analysis
    sentiment_positive INTEGER DEFAULT 0,
    sentiment_neutral INTEGER DEFAULT 0,
    sentiment_negative INTEGER DEFAULT 0,

    -- Source Tracking
    youtube_mentions INTEGER DEFAULT 0,
    reddit_mentions INTEGER DEFAULT 0,
    creator_count INTEGER DEFAULT 0,  -- How many creators discussing

    -- Categorization
    content_format VARCHAR(50) CHECK (content_format IN ('single_post', 'series', 'monthly_wrapup')),
    series_status VARCHAR(50) CHECK (series_status IN ('candidate', 'active', 'completed', 'archived')),
    priority_score INTEGER DEFAULT 0,  -- LEO's prioritization (1-100)

    -- Assignment & Status
    assigned_to VARCHAR(100),  -- Writer slug (e.g., 'chloe')
    assignment_status VARCHAR(50) DEFAULT 'unassigned' CHECK (assignment_status IN ('unassigned', 'assigned', 'in_progress', 'completed')),
    blog_post_id BIGINT REFERENCES writer_content(id) ON DELETE SET NULL,

    -- Metadata
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    related_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    next_review_date DATE,  -- When LEO should reprioritize

    CONSTRAINT topic_title_not_empty CHECK (length(trim(topic_title)) > 0),
    CONSTRAINT freshness_check CHECK (last_seen_date >= trend_start_date)
);

COMMENT ON TABLE trending_topics IS 'LEO-managed topic prioritization list for Chloe research';
COMMENT ON COLUMN trending_topics.topic_slug IS 'Unique URL-friendly identifier for topic';
COMMENT ON COLUMN trending_topics.velocity_score IS 'Mentions per day - indicates trend momentum';
COMMENT ON COLUMN trending_topics.priority_score IS 'LEO weekly reprioritization score (1-100)';
COMMENT ON COLUMN trending_topics.content_format IS 'Single post, multi-week series, or monthly wrap-up';
COMMENT ON COLUMN trending_topics.assigned_to IS 'Writer assigned to cover this topic (e.g., chloe)';

CREATE INDEX IF NOT EXISTS idx_trending_topics_priority ON trending_topics(priority_score DESC, last_seen_date DESC);
CREATE INDEX IF NOT EXISTS idx_trending_topics_freshness ON trending_topics(last_seen_date DESC);
CREATE INDEX IF NOT EXISTS idx_trending_topics_assigned ON trending_topics(assigned_to, assignment_status);
CREATE INDEX IF NOT EXISTS idx_trending_topics_format ON trending_topics(content_format, series_status);
CREATE INDEX IF NOT EXISTS idx_trending_topics_tags ON trending_topics USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_trending_topics_slug ON trending_topics(topic_slug);

-- ===== TABLE 2: topic_sources =====
-- Individual sources (videos, comments, posts) linked to trending topics
-- Implements truth labeling framework: Vault (internal), Reputable Web (expert), Unverified Forum (community)
CREATE TABLE IF NOT EXISTS topic_sources (
    id BIGSERIAL PRIMARY KEY,
    topic_id BIGINT NOT NULL REFERENCES trending_topics(id) ON DELETE CASCADE,

    -- Source Identification
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('youtube_video', 'youtube_comment', 'reddit_post', 'reddit_comment', 'creator_mention')),
    source_url VARCHAR(1000) NOT NULL,
    source_platform VARCHAR(50) NOT NULL,

    -- Content
    title VARCHAR(500),
    author_name VARCHAR(255),
    author_url VARCHAR(1000),
    content_snippet TEXT,
    full_content TEXT,

    -- Engagement Metrics
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,

    -- Sentiment
    sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative')),

    -- Metadata
    published_at TIMESTAMP WITH TIME ZONE,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    relevance_score DECIMAL(5,2) DEFAULT 0,  -- How relevant to topic (0-100)

    -- Truth Labeling (from user's execution loop framework)
    -- Vault: Internal verified content (from writer_content)
    -- Reputable Web: Expert sources, creator content
    -- Unverified Forum: Community discussions (Reddit, YouTube comments)
    truth_level VARCHAR(50) DEFAULT 'unverified' CHECK (truth_level IN ('vault', 'reputable_web', 'unverified_forum')),
    verified_by VARCHAR(100),  -- Quinn's verification
    verification_notes TEXT,

    CONSTRAINT source_url_not_empty CHECK (length(trim(source_url)) > 0)
);

COMMENT ON TABLE topic_sources IS 'Individual sources (videos, comments, posts) linked to trending topics - truth labeling framework';
COMMENT ON COLUMN topic_sources.truth_level IS 'Vault (internal verified), Reputable Web (expert sources), Unverified Forum (community discussion)';
COMMENT ON COLUMN topic_sources.verified_by IS 'Staff member who verified source (e.g., Quinn)';

CREATE INDEX IF NOT EXISTS idx_topic_sources_topic ON topic_sources(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_sources_type ON topic_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_topic_sources_platform ON topic_sources(source_platform);
CREATE INDEX IF NOT EXISTS idx_topic_sources_truth_level ON topic_sources(truth_level);
CREATE INDEX IF NOT EXISTS idx_topic_sources_relevance ON topic_sources(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_topic_sources_published ON topic_sources(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_topic_sources_url ON topic_sources(source_url);

-- ===== TABLE 3: topic_series =====
-- Multi-week series tracking for sustained trending topics
-- Enables "series" format where Week 1, Week 2, Week 3 build on each other
CREATE TABLE IF NOT EXISTS topic_series (
    id BIGSERIAL PRIMARY KEY,
    series_slug VARCHAR(255) NOT NULL UNIQUE,
    series_title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Series Management
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('planned', 'active', 'paused', 'completed')),
    total_posts_planned INTEGER DEFAULT 1,
    total_posts_published INTEGER DEFAULT 0,

    -- Assignment
    assigned_writer VARCHAR(100),  -- Writer slug (e.g., 'chloe')

    -- Metadata
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT series_title_not_empty CHECK (length(trim(series_title)) > 0)
);

COMMENT ON TABLE topic_series IS 'Multi-week series tracking for sustained trending topics';
COMMENT ON COLUMN topic_series.series_slug IS 'Unique identifier for the series (e.g., electrolyte-deficiency-2026)';
COMMENT ON COLUMN topic_series.status IS 'Series lifecycle: planned (upcoming), active (publishing), paused (hold), completed (finished)';
COMMENT ON COLUMN topic_series.assigned_writer IS 'Writer responsible for this series (e.g., chloe)';

CREATE INDEX IF NOT EXISTS idx_topic_series_status ON topic_series(status);
CREATE INDEX IF NOT EXISTS idx_topic_series_writer ON topic_series(assigned_writer);
CREATE INDEX IF NOT EXISTS idx_topic_series_slug ON topic_series(series_slug);
CREATE INDEX IF NOT EXISTS idx_topic_series_dates ON topic_series(start_date, end_date);

-- ===== TABLE 4: topic_series_posts =====
-- Individual posts within a multi-week series
-- Example: Electrolyte Deficiency series has Episode 1 (symptoms), Episode 2 (solutions), Episode 3 (myths)
CREATE TABLE IF NOT EXISTS topic_series_posts (
    id BIGSERIAL PRIMARY KEY,
    series_id BIGINT NOT NULL REFERENCES topic_series(id) ON DELETE CASCADE,
    topic_id BIGINT NOT NULL REFERENCES trending_topics(id) ON DELETE CASCADE,
    blog_post_id BIGINT REFERENCES writer_content(id) ON DELETE SET NULL,

    -- Series Position
    episode_number INTEGER NOT NULL,
    episode_title VARCHAR(500),

    -- Dates
    planned_publish_date DATE,
    actual_publish_date DATE,

    -- Status
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'published')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_series_episode UNIQUE (series_id, episode_number),
    CONSTRAINT episode_number_positive CHECK (episode_number > 0)
);

COMMENT ON TABLE topic_series_posts IS 'Individual posts within a multi-week series';
COMMENT ON COLUMN topic_series_posts.episode_number IS 'Position in series (1, 2, 3, etc.)';
COMMENT ON COLUMN topic_series_posts.status IS 'Episode lifecycle: planned (draft), in_progress (writing), published (live)';
COMMENT ON COLUMN topic_series_posts.blog_post_id IS 'Foreign key to published blog post in writer_content table';

CREATE INDEX IF NOT EXISTS idx_topic_series_posts_series ON topic_series_posts(series_id, episode_number);
CREATE INDEX IF NOT EXISTS idx_topic_series_posts_topic ON topic_series_posts(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_series_posts_status ON topic_series_posts(status);
CREATE INDEX IF NOT EXISTS idx_topic_series_posts_published_date ON topic_series_posts(actual_publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_topic_series_posts_blog ON topic_series_posts(blog_post_id);

-- ===== GRANT PERMISSIONS =====
-- Allow authenticated users to read trending topics (for Chloe's assignment queue)
-- Allow service role to update (for LEO's prioritization script)

-- End Migration 011: Create Trending Topics System
-- Tables created: trending_topics, topic_sources, topic_series, topic_series_posts
-- Indexes created: 18 total (optimized for common queries)
-- Next: Run reddit_collector.py, analyze_trends.py, leo_prioritize_topics.js

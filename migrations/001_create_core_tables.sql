-- Migration 001: Create Core Tables
-- Date: 2025-12-31
-- Author: LEO (Database Architect)
-- Purpose: Initialize schema for Bento Grid system
-- Status: IDEMPOTENT (safe to run multiple times)

-- ===== TABLE 1: bento_grid_items =====
CREATE TABLE IF NOT EXISTS bento_grid_items (
    id BIGSERIAL PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('trending_topic', 'top_video', 'community_highlight', 'research_update')),
    content_id BIGINT NOT NULL,
    content_title VARCHAR(500) NOT NULL,
    grid_position SMALLINT NOT NULL CHECK (grid_position >= 1 AND grid_position <= 100),
    engagement_score DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
    view_count BIGINT NOT NULL DEFAULT 0,
    share_count BIGINT NOT NULL DEFAULT 0,
    bookmark_count BIGINT NOT NULL DEFAULT 0,
    positive_sentiment_percent DECIMAL(5,2) NOT NULL DEFAULT 50,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT unique_content_per_grid UNIQUE(content_type, content_id)
);

-- ===== TABLE 2: content_engagement =====
CREATE TABLE IF NOT EXISTS content_engagement (
    id BIGSERIAL PRIMARY KEY,
    content_id BIGINT NOT NULL,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('trending_topic', 'top_video', 'community_highlight', 'research_update')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_anonymous BOOLEAN DEFAULT TRUE,
    interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('view', 'click', 'share', 'bookmark', 'comment', 'reaction')),
    sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1.0 AND sentiment_score <= 1.0),
    comment_text TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT engagement_timestamp_valid CHECK (created_at <= CURRENT_TIMESTAMP)
) PARTITION BY RANGE (created_at);

-- ===== TABLE 3: trending_topics =====
CREATE TABLE IF NOT EXISTS trending_topics (
    id BIGSERIAL PRIMARY KEY,
    topic_name VARCHAR(500) NOT NULL,
    topic_slug VARCHAR(500) NOT NULL UNIQUE,
    description TEXT,
    engagement_score SMALLINT NOT NULL DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
    mention_count SMALLINT NOT NULL DEFAULT 0,
    creators_array TEXT[],
    full_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT trending_topics_pkey PRIMARY KEY (id),
    CONSTRAINT topic_name_not_empty CHECK (length(trim(topic_name)) > 0)
);

-- ===== TABLE 4: user_interests =====
CREATE TABLE IF NOT EXISTS user_interests (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    interests JSONB NOT NULL DEFAULT '[]'::jsonb,
    interest_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interests_not_empty CHECK (jsonb_array_length(interests) > 0 OR is_active = FALSE)
);

-- ===== TABLE 5: creators (Future use) =====
CREATE TABLE IF NOT EXISTS creators (
    id BIGSERIAL PRIMARY KEY,
    creator_name VARCHAR(500) NOT NULL UNIQUE,
    channel_id VARCHAR(100) NOT NULL UNIQUE,
    handle VARCHAR(100) NOT NULL UNIQUE,
    bio TEXT,
    avatar_url VARCHAR(500),
    verified BOOLEAN DEFAULT FALSE,
    subscriber_count BIGINT DEFAULT 0,
    monthly_video_count SMALLINT DEFAULT 0,
    average_views_per_video BIGINT DEFAULT 0,
    focus_areas TEXT[] NOT NULL,
    website_url VARCHAR(500),
    twitter_handle VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT creators_pkey PRIMARY KEY (id),
    CONSTRAINT creator_name_not_empty CHECK (length(trim(creator_name)) > 0)
);

-- ===== TABLE 6: audit_log =====
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id BIGINT NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_log_pkey PRIMARY KEY (id)
);

-- ===== PARTITION content_engagement BY MONTH =====
CREATE TABLE IF NOT EXISTS content_engagement_2025_12 PARTITION OF content_engagement
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE IF NOT EXISTS content_engagement_2026_01 PARTITION OF content_engagement
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- ===== MATERIALIZED VIEW =====
CREATE MATERIALIZED VIEW IF NOT EXISTS homepage_grid AS
    SELECT
        id,
        content_type,
        content_id,
        content_title,
        grid_position,
        engagement_score,
        view_count,
        share_count,
        bookmark_count,
        positive_sentiment_percent,
        data
    FROM bento_grid_items
    WHERE grid_position <= 5
    ORDER BY engagement_score DESC;

-- End Migration 001

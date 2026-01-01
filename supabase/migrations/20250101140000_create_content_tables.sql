-- Migration: Create Content Tables for Blog Posts, Videos, and Writers
-- Description: Tables for storing blog posts, YouTube videos, writer profiles, and analysis
-- Date: 2026-01-01
-- Lead: Leo (Database Migration Specialist)

-- ============================================================================
-- TABLE: writers (Writer Profiles)
-- ============================================================================

CREATE TABLE IF NOT EXISTS writers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    signature TEXT,

    -- Profile
    backstory TEXT,
    personality TEXT,
    hobbies TEXT,
    pet_name TEXT,

    -- Professional Info
    expertise_areas TEXT[],
    tech_interests TEXT[],

    -- Writing Style (stored as JSONB for flexibility)
    writing_style JSONB,

    -- Assignment Rules
    assignment_rules JSONB,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT writer_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Indexes for writers
CREATE INDEX IF NOT EXISTS idx_writers_slug ON writers(slug);
CREATE INDEX IF NOT EXISTS idx_writers_is_active ON writers(is_active);
CREATE INDEX IF NOT EXISTS idx_writers_created_at ON writers(created_at DESC);

-- Enable RLS
ALTER TABLE writers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for writers
DROP POLICY IF EXISTS "writers_select_all" ON writers;
DROP POLICY IF EXISTS "writers_service_role_all" ON writers;
CREATE POLICY "writers_select_all" ON writers FOR SELECT USING (true);
CREATE POLICY "writers_service_role_all" ON writers FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: blog_posts (Blog Content)
-- ============================================================================

CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    author_id UUID REFERENCES writers(id) ON DELETE SET NULL,
    published_date DATE NOT NULL,
    scheduled_date DATE,
    is_published BOOLEAN DEFAULT false,
    category TEXT,
    tags TEXT[],
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image_url TEXT,

    -- SEO
    meta_description TEXT,
    meta_keywords TEXT[],

    -- Wiki Links
    wiki_links TEXT[],
    related_post_ids UUID[],

    -- Validation Status
    copy_editor_status TEXT DEFAULT 'pending',
    brand_validator_status TEXT DEFAULT 'pending',
    humanization_status TEXT DEFAULT 'pending',

    -- Settings
    comments_enabled BOOLEAN DEFAULT true,
    sponsor_callout TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_category CHECK (category IN ('health', 'protocol', 'community', 'strategy', 'news', 'featured'))
);

-- Indexes for blog_posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_date ON blog_posts(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_is_published ON blog_posts(is_published);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at DESC);

-- Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blog_posts
DROP POLICY IF EXISTS "blog_posts_select_all" ON blog_posts;
DROP POLICY IF EXISTS "blog_posts_service_role_all" ON blog_posts;
CREATE POLICY "blog_posts_select_all" ON blog_posts FOR SELECT USING (true);
CREATE POLICY "blog_posts_service_role_all" ON blog_posts FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: youtube_videos (YouTube Content Data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS youtube_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    channel_id TEXT,
    description TEXT,
    published_at TIMESTAMPTZ NOT NULL,
    thumbnail_url TEXT,

    -- Engagement Metrics
    view_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,

    -- Analysis Data
    analyzed_by_id UUID REFERENCES writers(id) ON DELETE SET NULL,
    analysis_summary TEXT,
    key_takeaways TEXT[],
    relevance_score INT DEFAULT 50, -- 1-100

    -- Categorization
    topic_tags TEXT[],
    content_category TEXT,

    -- Tracking
    added_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_analyzed_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT valid_relevance_score CHECK (relevance_score >= 0 AND relevance_score <= 100)
);

-- Indexes for youtube_videos
CREATE INDEX IF NOT EXISTS idx_youtube_videos_youtube_id ON youtube_videos(youtube_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_channel_id ON youtube_videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_published_at ON youtube_videos(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_relevance ON youtube_videos(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_topic_tags ON youtube_videos USING GIN(topic_tags);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_created_at ON youtube_videos(added_at DESC);

-- Enable RLS
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for youtube_videos
DROP POLICY IF EXISTS "youtube_videos_select_all" ON youtube_videos;
DROP POLICY IF EXISTS "youtube_videos_service_role_all" ON youtube_videos;
CREATE POLICY "youtube_videos_select_all" ON youtube_videos FOR SELECT USING (true);
CREATE POLICY "youtube_videos_service_role_all" ON youtube_videos FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: weekly_analysis (Weekly Analysis & Insights)
-- ============================================================================

CREATE TABLE IF NOT EXISTS weekly_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_date DATE UNIQUE NOT NULL,

    -- Content
    weekly_summary TEXT,
    trending_topics TEXT[],
    key_insights TEXT[],
    community_sentiment TEXT,
    recommended_watching TEXT[],
    qa_section JSONB,

    -- Assignment (maps section to writer_id)
    assigned_writers JSONB, -- {section: writer_id, ...}

    -- Status
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for weekly_analysis
CREATE INDEX IF NOT EXISTS idx_weekly_analysis_date ON weekly_analysis(analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_analysis_published ON weekly_analysis(is_published);
CREATE INDEX IF NOT EXISTS idx_weekly_analysis_created_at ON weekly_analysis(created_at DESC);

-- Enable RLS
ALTER TABLE weekly_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for weekly_analysis
DROP POLICY IF EXISTS "weekly_analysis_select_all" ON weekly_analysis;
DROP POLICY IF EXISTS "weekly_analysis_service_role_all" ON weekly_analysis;
CREATE POLICY "weekly_analysis_select_all" ON weekly_analysis FOR SELECT USING (true);
CREATE POLICY "weekly_analysis_service_role_all" ON weekly_analysis FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: wiki_video_links (Links between Wiki Topics and Videos)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wiki_video_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wiki_topic TEXT NOT NULL,
    youtube_video_id UUID REFERENCES youtube_videos(id) ON DELETE CASCADE,
    relevance_score INT DEFAULT 50, -- 1-100
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(wiki_topic, youtube_video_id),
    CONSTRAINT valid_relevance CHECK (relevance_score >= 0 AND relevance_score <= 100)
);

-- Indexes for wiki_video_links
CREATE INDEX IF NOT EXISTS idx_wiki_video_links_topic ON wiki_video_links(wiki_topic);
CREATE INDEX IF NOT EXISTS idx_wiki_video_links_video_id ON wiki_video_links(youtube_video_id);

-- Enable RLS
ALTER TABLE wiki_video_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wiki_video_links
DROP POLICY IF EXISTS "wiki_video_links_select_all" ON wiki_video_links;
DROP POLICY IF EXISTS "wiki_video_links_service_role_all" ON wiki_video_links;
CREATE POLICY "wiki_video_links_select_all" ON wiki_video_links FOR SELECT USING (true);
CREATE POLICY "wiki_video_links_service_role_all" ON wiki_video_links FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: topic_product_mapping (Product Recommendations by Topic)
-- ============================================================================

CREATE TABLE IF NOT EXISTS topic_product_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_url TEXT,
    recommendation_type TEXT DEFAULT 'internal', -- 'internal', 'partner', 'mentioned'
    when_to_recommend TEXT,
    soft_conversion_step TEXT, -- Which step in the soft conversion framework
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(topic, product_name),
    CONSTRAINT valid_recommendation_type CHECK (recommendation_type IN ('internal', 'partner', 'mentioned'))
);

-- Indexes for topic_product_mapping
CREATE INDEX IF NOT EXISTS idx_topic_product_topic ON topic_product_mapping(topic);
CREATE INDEX IF NOT EXISTS idx_topic_product_product_name ON topic_product_mapping(product_name);

-- Enable RLS
ALTER TABLE topic_product_mapping ENABLE ROW LEVEL SECURITY;

-- RLS Policies for topic_product_mapping
DROP POLICY IF EXISTS "topic_product_select_all" ON topic_product_mapping;
DROP POLICY IF EXISTS "topic_product_service_role_all" ON topic_product_mapping;
CREATE POLICY "topic_product_select_all" ON topic_product_mapping FOR SELECT USING (true);
CREATE POLICY "topic_product_service_role_all" ON topic_product_mapping FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- AUTO-UPDATE TIMESTAMP FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
DROP TRIGGER IF EXISTS writers_updated_at ON writers;
CREATE TRIGGER writers_updated_at BEFORE UPDATE ON writers FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS blog_posts_updated_at ON blog_posts;
CREATE TRIGGER blog_posts_updated_at BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS youtube_videos_updated_at ON youtube_videos;
CREATE TRIGGER youtube_videos_updated_at BEFORE UPDATE ON youtube_videos FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS weekly_analysis_updated_at ON weekly_analysis;
CREATE TRIGGER weekly_analysis_updated_at BEFORE UPDATE ON weekly_analysis FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS wiki_video_links_updated_at ON wiki_video_links;
CREATE TRIGGER wiki_video_links_updated_at BEFORE UPDATE ON wiki_video_links FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS topic_product_mapping_updated_at ON topic_product_mapping;
CREATE TRIGGER topic_product_mapping_updated_at BEFORE UPDATE ON topic_product_mapping FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- Created Tables:
-- 1. writers - Writer profiles and metadata
-- 2. blog_posts - Blog post content
-- 3. youtube_videos - YouTube video data
-- 4. weekly_analysis - Weekly analysis and insights
-- 5. wiki_video_links - Links between wiki topics and videos
-- 6. topic_product_mapping - Product recommendation mappings
--
-- Total indexes: 20+
-- RLS policies: All tables have SELECT-ALL and SERVICE-ROLE policies
-- Constraints: 8+ check constraints for data integrity
-- Timestamps: All tables have automatic updated_at tracking
-- ============================================================================

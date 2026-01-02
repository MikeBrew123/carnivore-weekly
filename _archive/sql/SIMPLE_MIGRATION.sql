-- Simple Phase 4 Migration - Essential Tables Only
-- Run this if the full migration doesn't work

-- 1. Writers Table
CREATE TABLE IF NOT EXISTS writers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    signature TEXT,
    backstory TEXT,
    personality TEXT,
    hobbies TEXT,
    pet_name TEXT,
    expertise_areas TEXT[],
    tech_interests TEXT[],
    writing_style JSONB,
    assignment_rules JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_writers_slug ON writers(slug);
CREATE INDEX idx_writers_is_active ON writers(is_active);

ALTER TABLE writers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "writers_select_all" ON writers FOR SELECT USING (true);

-- 2. Blog Posts Table
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
    meta_description TEXT,
    meta_keywords TEXT[],
    wiki_links TEXT[],
    related_post_ids UUID[],
    copy_editor_status TEXT DEFAULT 'pending',
    brand_validator_status TEXT DEFAULT 'pending',
    humanization_status TEXT DEFAULT 'pending',
    comments_enabled BOOLEAN DEFAULT true,
    sponsor_callout TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_posts_author_id ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_published_date ON blog_posts(published_date DESC);
CREATE INDEX idx_blog_posts_is_published ON blog_posts(is_published);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_posts_select_all" ON blog_posts FOR SELECT USING (true);

-- 3. YouTube Videos Table
CREATE TABLE IF NOT EXISTS youtube_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    channel_id TEXT,
    description TEXT,
    published_at TIMESTAMPTZ NOT NULL,
    thumbnail_url TEXT,
    view_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    analyzed_by_id UUID REFERENCES writers(id) ON DELETE SET NULL,
    analysis_summary TEXT,
    key_takeaways TEXT[],
    relevance_score INT DEFAULT 50,
    topic_tags TEXT[],
    content_category TEXT,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_analyzed_at TIMESTAMPTZ
);

CREATE INDEX idx_youtube_videos_youtube_id ON youtube_videos(youtube_id);
CREATE INDEX idx_youtube_videos_published_at ON youtube_videos(published_at DESC);
CREATE INDEX idx_youtube_videos_relevance ON youtube_videos(relevance_score DESC);

ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "youtube_videos_select_all" ON youtube_videos FOR SELECT USING (true);

-- 4. Weekly Analysis Table
CREATE TABLE IF NOT EXISTS weekly_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_date DATE UNIQUE NOT NULL,
    weekly_summary TEXT,
    trending_topics TEXT[],
    key_insights TEXT[],
    community_sentiment TEXT,
    recommended_watching TEXT[],
    qa_section JSONB,
    assigned_writers JSONB,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_weekly_analysis_date ON weekly_analysis(analysis_date DESC);
CREATE INDEX idx_weekly_analysis_published ON weekly_analysis(is_published);

ALTER TABLE weekly_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weekly_analysis_select_all" ON weekly_analysis FOR SELECT USING (true);

-- 5. Wiki Video Links Table
CREATE TABLE IF NOT EXISTS wiki_video_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wiki_topic TEXT NOT NULL,
    youtube_video_id UUID REFERENCES youtube_videos(id) ON DELETE CASCADE,
    relevance_score INT DEFAULT 50,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wiki_topic, youtube_video_id)
);

CREATE INDEX idx_wiki_video_links_topic ON wiki_video_links(wiki_topic);
CREATE INDEX idx_wiki_video_links_video_id ON wiki_video_links(youtube_video_id);

ALTER TABLE wiki_video_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wiki_video_links_select_all" ON wiki_video_links FOR SELECT USING (true);

-- 6. Topic Product Mapping Table
CREATE TABLE IF NOT EXISTS topic_product_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_url TEXT,
    recommendation_type TEXT DEFAULT 'internal',
    when_to_recommend TEXT,
    soft_conversion_step TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(topic, product_name)
);

ALTER TABLE topic_product_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topic_product_select_all" ON topic_product_mapping FOR SELECT USING (true);

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER writers_updated_at BEFORE UPDATE ON writers FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER blog_posts_updated_at BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER youtube_videos_updated_at BEFORE UPDATE ON youtube_videos FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER weekly_analysis_updated_at BEFORE UPDATE ON weekly_analysis FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER wiki_video_links_updated_at BEFORE UPDATE ON wiki_video_links FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER topic_product_mapping_updated_at BEFORE UPDATE ON topic_product_mapping FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Verification query (run separately after migration completes)
-- SELECT tablename FROM pg_tables WHERE table_schema = 'public' ORDER BY tablename;

-- ===== UNIFIED WRITERS SCHEMA MIGRATION =====
-- Date: 2026-01-05
-- Purpose: Consolidate conflicting 007 migrations into single authoritative schema
-- Status: Idempotent and safe to run multiple times
-- Scope: Creates 5 tables needed for writer memory system and depends
--
-- TABLES:
--  1. writers - Core writer profiles with voice, expertise, and metadata
--  2. writer_content - Historical record of content created by writers
--  3. writer_relationships - Collaboration patterns and knowledge sharing
--  4. writer_memory_log - Persistent memory of lessons learned
--  5. writer_voice_snapshots - Point-in-time captures of voice evolution
--
-- CRITICAL: This migration resolves schema conflict by using comprehensive column set
-- that satisfies all dependent migrations and feature requirements.

-- ===== TABLE 1: writers (AUTHORITATIVE SCHEMA) =====
-- Drop and recreate to ensure clean state (idempotent via IF NOT EXISTS)
DROP TABLE IF EXISTS writers CASCADE;

CREATE TABLE writers (
    -- Primary key and identity
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    -- URL-safe identifier: 'sarah', 'marcus', 'chloe'
    name VARCHAR(200) NOT NULL UNIQUE,
    -- Full display name: 'Sarah', 'Marcus', 'Chloe'

    -- Professional positioning (satisfies both schemas)
    role_title VARCHAR(200) NOT NULL,
    -- Professional role: 'Health Coach', 'Sales Lead', etc.
    bio TEXT,
    -- Biographical information for public profiles
    specialty VARCHAR(500) NOT NULL,
    -- Primary expertise area (required by memory log schema)
    experience_level VARCHAR(50) DEFAULT 'expert' CHECK (
        experience_level IN ('junior', 'mid', 'senior', 'expert')
    ),
    -- Career level for context-aware guidance

    -- Tone and style characteristics
    tone_style VARCHAR(100) NOT NULL DEFAULT 'professional',
    -- Characteristic tone: professional, conversational, academic, etc.
    signature_style TEXT,
    -- Distinctive writing patterns unique to this writer
    tagline TEXT,
    -- Short value proposition (1-2 sentences) for public use

    -- Avatar and branding
    avatar_url VARCHAR(500),
    -- URL to writer's profile image

    -- Expertise mapping
    preferred_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
    -- Topics this writer prefers to cover
    content_domains JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Flexible JSON structure mapping content types to expertise levels
    voice_formula JSONB,
    -- Detailed voice formula with tone, phrases, techniques, principles
    philosophy TEXT,
    -- Core beliefs and approach (2-3 sentences)

    -- Status and audit
    is_active BOOLEAN DEFAULT TRUE,
    -- Soft delete support; never hard-delete for audit trail

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Constraints ensuring data integrity
    CONSTRAINT slug_not_empty CHECK (length(trim(slug)) > 0),
    CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT role_title_not_empty CHECK (length(trim(role_title)) > 0),
    CONSTRAINT specialty_not_empty CHECK (length(trim(specialty)) > 0)
);

-- Create comments for documentation
COMMENT ON TABLE writers IS 'Core writer profiles with voice characteristics, expertise, and metadata for agent token optimization';
COMMENT ON COLUMN writers.slug IS 'URL-safe identifier for routing and lookup';
COMMENT ON COLUMN writers.specialty IS 'Primary area of expertise or focus (required field)';
COMMENT ON COLUMN writers.tone_style IS 'Characteristic tone: professional, conversational, academic, etc.';
COMMENT ON COLUMN writers.voice_formula IS 'JSONB structure: {tone, signature_phrases, engagement_techniques, writing_principles, common_opening_patterns}';
COMMENT ON COLUMN writers.content_domains IS 'JSONB mapping content types to expertise levels or domain expertise';

-- ===== INDEXES FOR WRITERS TABLE =====
CREATE INDEX IF NOT EXISTS idx_writers_slug
    ON writers(slug)
    WHERE is_active = true;
-- Query pattern: Fetch writer by slug

CREATE INDEX IF NOT EXISTS idx_writers_active
    ON writers(is_active, created_at DESC);
-- Query pattern: List active writers in order

CREATE INDEX IF NOT EXISTS idx_writers_specialty
    ON writers(specialty);
-- Query pattern: Find writers by specialty area

CREATE INDEX IF NOT EXISTS idx_writers_created_at
    ON writers(created_at DESC);
-- Query pattern: Historical tracking and audit

-- ===== TABLE 2: writer_content =====
-- Historical record of content created by writers with metadata
DROP TABLE IF EXISTS writer_content CASCADE;

CREATE TABLE writer_content (
    id BIGSERIAL PRIMARY KEY,
    writer_id BIGINT NOT NULL REFERENCES writers(id) ON DELETE CASCADE,

    -- Content metadata
    title VARCHAR(500) NOT NULL,
    content_type VARCHAR(50) NOT NULL CHECK (
        content_type IN ('article', 'newsletter', 'social_post', 'email', 'blog', 'research', 'review')
    ),
    word_count INTEGER,
    reading_time_minutes INTEGER,

    -- Voice and engagement
    tone_applied VARCHAR(100),
    key_themes TEXT[],

    -- Performance metrics
    performance_score DECIMAL(5,2) CHECK (performance_score >= 0 AND performance_score <= 100),
    engagement_metrics JSONB,
    -- JSON structure: {views, shares, comments, sentiment, click_through_rate, bounce_rate, etc.}

    -- Publishing
    published_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT content_title_not_empty CHECK (length(trim(title)) > 0)
);

COMMENT ON TABLE writer_content IS 'Historical content created by writers with performance metrics for pattern analysis';
COMMENT ON COLUMN writer_content.content_type IS 'Category of content: article, newsletter, social, email, blog, research, or review';
COMMENT ON COLUMN writer_content.performance_score IS 'Aggregate engagement score (0-100)';
COMMENT ON COLUMN writer_content.engagement_metrics IS 'JSON containing views, shares, comments, sentiment, CTR, bounce rate';

-- ===== INDEXES FOR WRITER_CONTENT TABLE =====
CREATE INDEX IF NOT EXISTS idx_writer_content_writer_id
    ON writer_content(writer_id);

CREATE INDEX IF NOT EXISTS idx_writer_content_type
    ON writer_content(content_type);

CREATE INDEX IF NOT EXISTS idx_writer_content_published
    ON writer_content(published_at DESC);

-- ===== TABLE 3: writer_relationships =====
-- Tracks collaboration patterns and knowledge sharing between writers
DROP TABLE IF EXISTS writer_relationships CASCADE;

CREATE TABLE writer_relationships (
    id BIGSERIAL PRIMARY KEY,
    writer_a_id BIGINT NOT NULL REFERENCES writers(id) ON DELETE CASCADE,
    writer_b_id BIGINT NOT NULL REFERENCES writers(id) ON DELETE CASCADE,

    -- Relationship definition
    relationship_type VARCHAR(50) NOT NULL CHECK (
        relationship_type IN ('mentor', 'mentee', 'peer', 'collaborator', 'reviewer')
    ),

    -- Collaboration tracking
    collaboration_count INTEGER DEFAULT 0,
    knowledge_transfer_areas TEXT[],
    last_interaction TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Integrity constraints
    CONSTRAINT different_writers CHECK (writer_a_id != writer_b_id)
    -- Note: Bidirectional uniqueness requires app-level logic or trigger
);

COMMENT ON TABLE writer_relationships IS 'Network map of writer collaborations, mentorship, and knowledge transfer';
COMMENT ON COLUMN writer_relationships.relationship_type IS 'Nature of relationship: mentor, mentee, peer, collaborator, or reviewer';
COMMENT ON COLUMN writer_relationships.knowledge_transfer_areas IS 'Topics or skills being shared between the two writers';

-- ===== INDEXES FOR WRITER_RELATIONSHIPS TABLE =====
CREATE INDEX IF NOT EXISTS idx_writer_relationships_a
    ON writer_relationships(writer_a_id);

CREATE INDEX IF NOT EXISTS idx_writer_relationships_b
    ON writer_relationships(writer_b_id);

CREATE INDEX IF NOT EXISTS idx_writer_relationships_type
    ON writer_relationships(relationship_type);

-- ===== TABLE 4: writer_memory_log (CORE OPTIMIZATION TABLE) =====
-- Persistent memory of lessons learned, improvements, and contextual insights
DROP TABLE IF EXISTS writer_memory_log CASCADE;

CREATE TABLE writer_memory_log (
    id BIGSERIAL PRIMARY KEY,
    writer_id BIGINT NOT NULL REFERENCES writers(id) ON DELETE CASCADE,

    -- Memory classification
    memory_type VARCHAR(50) NOT NULL CHECK (
        memory_type IN (
            'lesson_learned',
            'pattern_identified',
            'improvement',
            'audience_insight',
            'technical_tip',
            'style_refinement',
            'audience_feedback',
            'competitive_analysis'
        )
    ),

    -- Memory content
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    -- Legacy field name (stored same as description)

    -- Context and relationships
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    related_content_id BIGINT REFERENCES writer_content(id) ON DELETE SET NULL,
    source_content_id BIGINT,
    -- Alternative FK if writer_content doesn't exist yet
    source_type VARCHAR(50),
    -- Where lesson came from: 'audience_feedback', 'performance_data', 'peer_review', 'self_reflection'

    -- Impact assessment
    relevance_score DECIMAL(3,2) CHECK (relevance_score >= 0 AND relevance_score <= 1),
    impact_category VARCHAR(100) CHECK (
        impact_category IN (
            'tone_improvement',
            'engagement_boost',
            'accuracy_increase',
            'clarity_enhancement',
            'audience_expansion',
            'efficiency_gain',
            'brand_alignment'
        )
    ),

    -- Implementation tracking
    implementation_status VARCHAR(50) NOT NULL DEFAULT 'documented' CHECK (
        implementation_status IN ('documented', 'in_progress', 'implemented', 'archived')
    ),
    source VARCHAR(100) NOT NULL DEFAULT 'system_analysis' CHECK (
        source IN ('direct_learning', 'audience_feedback', 'peer_input', 'system_analysis', 'external_research')
    ),

    -- Tags for search and filtering
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    lesson_type VARCHAR(100),
    -- Legacy field name for compatibility

    -- Status and lifecycle
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT title_not_empty CHECK (length(trim(title)) > 0),
    CONSTRAINT description_not_empty CHECK (length(trim(description)) > 0)
);

COMMENT ON TABLE writer_memory_log IS 'Persistent knowledge base tracking writer lessons, patterns, improvements, and insights for agent learning';
COMMENT ON COLUMN writer_memory_log.memory_type IS 'Category of memory: lesson, pattern, improvement, insight, feedback, or analysis';
COMMENT ON COLUMN writer_memory_log.relevance_score IS 'How applicable this memory is to current and future writing (0-1 scale)';
COMMENT ON COLUMN writer_memory_log.impact_category IS 'Expected business impact of implementing this memory';
COMMENT ON COLUMN writer_memory_log.implementation_status IS 'Progress state: documented, in_progress, implemented, or archived';
COMMENT ON COLUMN writer_memory_log.source IS 'Origin of the memory: learning, feedback, peer input, analysis, or research';

-- ===== INDEXES FOR WRITER_MEMORY_LOG TABLE =====
CREATE INDEX IF NOT EXISTS idx_writer_memory_log_writer_id
    ON writer_memory_log(writer_id, created_at DESC);
-- Query pattern: Fetch recent lessons for specific writer

CREATE INDEX IF NOT EXISTS idx_writer_memory_log_memory_type
    ON writer_memory_log(writer_id, memory_type, created_at DESC);
-- Query pattern: Filter by memory type

CREATE INDEX IF NOT EXISTS idx_writer_memory_log_lesson_type
    ON writer_memory_log(writer_id, lesson_type, created_at DESC);
-- Query pattern: Legacy lesson_type field support

CREATE INDEX IF NOT EXISTS idx_writer_memory_log_tags
    ON writer_memory_log USING GIN (tags);
-- Query pattern: Full-text search by tags

CREATE INDEX IF NOT EXISTS idx_writer_memory_log_impact
    ON writer_memory_log(impact_category);
-- Query pattern: Filter by business impact

CREATE INDEX IF NOT EXISTS idx_writer_memory_log_created
    ON writer_memory_log(created_at DESC);
-- Query pattern: Time-series queries

CREATE INDEX IF NOT EXISTS idx_writer_memory_log_relevance
    ON writer_memory_log(relevance_score DESC);
-- Query pattern: Rank by relevance

CREATE INDEX IF NOT EXISTS idx_writer_memory_log_status
    ON writer_memory_log(implementation_status);
-- Query pattern: Track implementation progress

-- ===== TABLE 5: writer_voice_snapshots =====
-- Point-in-time captures of writer voice characteristics for tracking evolution
DROP TABLE IF EXISTS writer_voice_snapshots CASCADE;

CREATE TABLE writer_voice_snapshots (
    id BIGSERIAL PRIMARY KEY,
    writer_id BIGINT NOT NULL REFERENCES writers(id) ON DELETE CASCADE,

    -- Snapshot metadata
    snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Voice characteristics (comprehensive)
    tone_characteristics JSONB NOT NULL,
    -- JSON structure: {warmth, authority, formality, humor, empathy, etc.}
    signature_phrases TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    vocabulary_profile JSONB NOT NULL,
    -- JSON structure: {common_words, technical_terms, industry_language, unique_phrases}
    sentence_structure_patterns JSONB NOT NULL,
    -- JSON structure: {avg_length, parallelism_use, starting_patterns, clause_density}
    engagement_techniques TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    audience_connection_style VARCHAR(255),
    content_organization_pattern VARCHAR(100),
    distinctive_elements TEXT[],

    -- Voice assessment
    voice_consistency_score DECIMAL(5,2) CHECK (voice_consistency_score >= 0 AND voice_consistency_score <= 100),
    performance_baseline DECIMAL(5,2),

    -- Documentation
    evolution_notes TEXT,
    period_summary TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT snapshot_date_not_future CHECK (snapshot_date <= CURRENT_TIMESTAMP)
);

COMMENT ON TABLE writer_voice_snapshots IS 'Historical snapshots of writer voice characteristics and evolution tracking';
COMMENT ON COLUMN writer_voice_snapshots.snapshot_date IS 'Date when this voice profile was captured';
COMMENT ON COLUMN writer_voice_snapshots.tone_characteristics IS 'JSON mapping tone dimensions to characteristics';
COMMENT ON COLUMN writer_voice_snapshots.signature_phrases IS 'Recurring phrases unique to this writer';
COMMENT ON COLUMN writer_voice_snapshots.vocabulary_profile IS 'JSON analysis of word choice patterns and terminology';
COMMENT ON COLUMN writer_voice_snapshots.voice_consistency_score IS 'Measure of consistency in applying voice characteristics (0-100)';

-- ===== INDEXES FOR WRITER_VOICE_SNAPSHOTS TABLE =====
CREATE INDEX IF NOT EXISTS idx_writer_voice_snapshots_writer_id
    ON writer_voice_snapshots(writer_id);

CREATE INDEX IF NOT EXISTS idx_writer_voice_snapshots_date
    ON writer_voice_snapshots(snapshot_date DESC);

-- ===== TRIGGER: Update writer.updated_at timestamp =====
CREATE OR REPLACE FUNCTION update_writer_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_writer_timestamp_trigger ON writers;
CREATE TRIGGER update_writer_timestamp_trigger
    BEFORE UPDATE ON writers
    FOR EACH ROW
    EXECUTE FUNCTION update_writer_timestamp();

-- ===== SEED DATA: Writer Profiles =====
-- Insert three core writers: Sarah (Health Coach), Marcus (Sales), Chloe (Marketing)
INSERT INTO writers (
    slug,
    name,
    role_title,
    tagline,
    specialty,
    experience_level,
    tone_style,
    bio,
    signature_style,
    preferred_topics,
    content_domains,
    voice_formula,
    philosophy,
    avatar_url,
    is_active,
    created_by
)
VALUES
(
    'sarah',
    'Sarah',
    'Health Coach & Community Leader',
    'Helping people understand carnivore nutrition with authentic insights and proven results',
    'Health coaching, weight loss, women''s health',
    'expert',
    'conversational',
    'Sarah has been coaching people through the carnivore lifestyle for over a decade. Her approach is grounded in real client experience and health science.',
    'Warm, empathetic, evidence-based',
    ARRAY['Health coaching', 'Weight loss', 'Energy and performance', 'Women''s health', 'Beginner guidance', 'Troubleshooting'],
    '{"health_coaching": "expert", "weight_loss": "expert", "womens_health": "expert", "beginner_guidance": "expert"}'::jsonb,
    '{"tone": "Warm, conversational, grounded in health science", "signature_phrases": ["Here''s what I''ve seen work", "From my experience coaching", "The truth is", "What matters most"], "engagement_techniques": ["Ask reflective questions", "Share real success stories", "Address common objections", "Validate feelings while pushing forward"], "writing_principles": ["Start with empathy and understanding", "Use specific examples from real people", "Explain the why behind recommendations", "Acknowledge challenges while offering solutions", "Never shame or judge food choices"], "common_opening_patterns": ["I''ve been coaching for X years...", "One thing I''ve noticed...", "Here''s what works..."]}'::jsonb,
    'I believe everyone deserves to feel their best. Carnivore is a tool, not a religion. My job is helping people understand what works for their unique body and lifestyle.',
    'https://via.placeholder.com/300?text=Sarah',
    true,
    NULL
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO writers (
    slug,
    name,
    role_title,
    tagline,
    specialty,
    experience_level,
    tone_style,
    bio,
    signature_style,
    preferred_topics,
    content_domains,
    voice_formula,
    philosophy,
    avatar_url,
    is_active,
    created_by
)
VALUES
(
    'marcus',
    'Marcus',
    'Sales & Partnerships Lead',
    'Building relationships and identifying opportunities within the carnivore ecosystem',
    'Partnership strategy, market trends, business opportunities',
    'expert',
    'professional',
    'Marcus brings a strategic business lens to the carnivore space. With deep partnerships experience, he identifies growth opportunities that align with our mission.',
    'Direct, data-driven, opportunity-focused',
    ARRAY['Partnership strategy', 'Market trends', 'Business opportunities', 'Growth metrics', 'Affiliate relationships', 'Sponsorship deals'],
    '{"partnership_strategy": "expert", "market_analysis": "expert", "business_development": "expert"}'::jsonb,
    '{"tone": "Professional, strategic, opportunity-focused", "signature_phrases": ["Here''s where we see opportunity", "From a business perspective", "The win-win here is", "What we''re noticing"], "engagement_techniques": ["Present data-driven insights", "Connect to business value", "Highlight mutual benefits", "Focus on ROI and growth"], "writing_principles": ["Lead with numbers and trends", "Explain strategic implications", "Identify partnership opportunities", "Think long-term relationships", "Be direct and action-oriented"]}'::jsonb,
    'Business growth happens through authentic relationships and strategic alignment. Our job is finding partners who genuinely believe in what we''re building.',
    'https://via.placeholder.com/300?text=Marcus',
    true,
    NULL
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO writers (
    slug,
    name,
    role_title,
    tagline,
    specialty,
    experience_level,
    tone_style,
    bio,
    signature_style,
    preferred_topics,
    content_domains,
    voice_formula,
    philosophy,
    avatar_url,
    is_active,
    created_by
)
VALUES
(
    'chloe',
    'Chloe',
    'Marketing & Community Manager',
    'Creating engaging content that connects our audience with the carnivore community',
    'Community engagement, trending topics, social media strategy',
    'expert',
    'conversational',
    'Chloe has her finger on the pulse of the carnivore community. She knows what resonates and how to build genuine connections at scale.',
    'Enthusiastic, trendy, inclusive',
    ARRAY['Community engagement', 'Trending topics', 'Social media strategy', 'Event promotion', 'Member spotlights', 'Cultural moments'],
    '{"community_engagement": "expert", "social_media": "expert", "trend_analysis": "expert"}'::jsonb,
    '{"tone": "Enthusiastic, trendy, community-focused", "signature_phrases": ["Community is saying", "This is resonating", "Here''s the vibe", "People are asking about"], "engagement_techniques": ["Highlight trending topics", "Share community stories", "Create FOMO around events", "Celebrate member successes"], "writing_principles": ["Start with what''s buzzing", "Make it feel personal and inclusive", "Use authentic community voices", "Balance trending with timeless", "Build excitement around community growth"]}'::jsonb,
    'Our community is our greatest asset. Great marketing is about amplifying real conversations and celebrating what''s actually happening.',
    'https://via.placeholder.com/300?text=Chloe',
    true,
    NULL
) ON CONFLICT (slug) DO NOTHING;

-- ===== SEED DATA: Writer Memory Log Examples =====
-- These demonstrate how lessons get stored and retrieved
WITH sarah_id AS (
    SELECT id FROM writers WHERE slug = 'sarah' LIMIT 1
)
INSERT INTO writer_memory_log (
    writer_id,
    memory_type,
    lesson_type,
    title,
    description,
    content,
    source_type,
    source,
    tags,
    relevance_score,
    impact_category,
    implementation_status,
    created_by
)
SELECT
    (SELECT id FROM sarah_id),
    'lesson_learned',
    'Writing Approach',
    'Specificity drives engagement',
    'People respond better when I address their specific challenges. Generic advice gets scrolled past. Use real examples from coaching conversations.',
    'People respond better when I address their specific challenges. Generic advice gets scrolled past. Use real examples from coaching conversations.',
    'self_reflection',
    'direct_learning',
    ARRAY['engagement', 'specificity', 'audience-focus'],
    0.95,
    'engagement_boost',
    'implemented',
    NULL
WHERE NOT EXISTS (
    SELECT 1 FROM writer_memory_log
    WHERE writer_id = (SELECT id FROM sarah_id)
    AND title = 'Specificity drives engagement'
);

WITH sarah_id AS (
    SELECT id FROM writers WHERE slug = 'sarah' LIMIT 1
)
INSERT INTO writer_memory_log (
    writer_id,
    memory_type,
    lesson_type,
    title,
    description,
    content,
    source_type,
    source,
    tags,
    relevance_score,
    impact_category,
    implementation_status,
    created_by
)
SELECT
    (SELECT id FROM sarah_id),
    'pattern_identified',
    'Common Objection',
    'Budget is the primary barrier for beginners',
    'When addressing "carnivore is too expensive", lead with budget-friendly options: beef organ meats, eggs, ground beef. Show real meal plans with costs.',
    'When addressing "carnivore is too expensive", lead with budget-friendly options: beef organ meats, eggs, ground beef. Show real meal plans with costs.',
    'audience_feedback',
    'audience_feedback',
    ARRAY['budget', 'objection-handling', 'affordability'],
    0.92,
    'audience_expansion',
    'implemented',
    NULL
WHERE NOT EXISTS (
    SELECT 1 FROM writer_memory_log
    WHERE writer_id = (SELECT id FROM sarah_id)
    AND title = 'Budget is the primary barrier for beginners'
);

-- ===== END UNIFIED WRITERS SCHEMA MIGRATION =====
-- Status: All 5 tables created with comprehensive schemas
-- Next: Apply Row Level Security policies and webhook triggers

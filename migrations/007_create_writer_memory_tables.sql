-- Migration 007: Create Writer Memory Tables
-- Date: 2025-12-31
-- Author: Agent Optimization Team
-- Purpose: Initialize schema for Agent Token Optimization Phase 1 - Writer Memory System
-- Status: IDEMPOTENT (safe to run multiple times)

-- ===== TABLE 1: writers =====
-- Core table storing writer profiles with biographical information and capabilities
-- Each writer represents a distinct persona with unique voice characteristics
CREATE TABLE IF NOT EXISTS writers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    bio TEXT,
    specialty VARCHAR(500) NOT NULL,
    experience_level VARCHAR(50) NOT NULL CHECK (experience_level IN ('junior', 'mid', 'senior', 'expert')),
    avatar_url VARCHAR(500),
    tone_style VARCHAR(100) NOT NULL DEFAULT 'professional',
    signature_style TEXT,
    preferred_topics TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    content_domains JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT writer_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT specialty_not_empty CHECK (length(trim(specialty)) > 0)
);

COMMENT ON TABLE writers IS 'Core writer profiles for the Agent Token Optimization system';
COMMENT ON COLUMN writers.name IS 'Unique writer identifier name (e.g., Sarah, Marcus, Chloe)';
COMMENT ON COLUMN writers.specialty IS 'Primary area of expertise or focus';
COMMENT ON COLUMN writers.tone_style IS 'Characteristic tone: professional, conversational, academic, etc.';
COMMENT ON COLUMN writers.content_domains IS 'JSON structure mapping content types to expertise levels';

-- ===== TABLE 2: writer_content =====
-- Historical record of content created by writers with metadata
-- Enables analysis of writing patterns, performance, and improvement areas
CREATE TABLE IF NOT EXISTS writer_content (
    id BIGSERIAL PRIMARY KEY,
    writer_id BIGINT NOT NULL REFERENCES writers(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('article', 'newsletter', 'social_post', 'email', 'blog', 'research', 'review')),
    word_count INTEGER,
    reading_time_minutes INTEGER,
    tone_applied VARCHAR(100),
    key_themes TEXT[],
    performance_score DECIMAL(5,2) CHECK (performance_score >= 0 AND performance_score <= 100),
    engagement_metrics JSONB,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT content_title_not_empty CHECK (length(trim(title)) > 0)
);

COMMENT ON TABLE writer_content IS 'Historical content created by writers with performance metrics';
COMMENT ON COLUMN writer_content.content_type IS 'Category of content produced by the writer';
COMMENT ON COLUMN writer_content.performance_score IS 'Aggregate score based on engagement and quality metrics';
COMMENT ON COLUMN writer_content.engagement_metrics IS 'JSON containing views, shares, comments, sentiment data';

-- ===== TABLE 3: writer_relationships =====
-- Tracks collaboration patterns and knowledge sharing between writers
-- Enables identification of mentorship, co-creation, and peer learning opportunities
CREATE TABLE IF NOT EXISTS writer_relationships (
    id BIGSERIAL PRIMARY KEY,
    writer_a_id BIGINT NOT NULL REFERENCES writers(id) ON DELETE CASCADE,
    writer_b_id BIGINT NOT NULL REFERENCES writers(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN ('mentor', 'mentee', 'peer', 'collaborator', 'reviewer')),
    collaboration_count INTEGER DEFAULT 0,
    knowledge_transfer_areas TEXT[],
    last_interaction TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT different_writers CHECK (writer_a_id != writer_b_id),
    CONSTRAINT unique_writer_pair UNIQUE (LEAST(writer_a_id, writer_b_id), GREATEST(writer_a_id, writer_b_id))
);

COMMENT ON TABLE writer_relationships IS 'Network map of writer collaborations and knowledge transfer';
COMMENT ON COLUMN writer_relationships.relationship_type IS 'Nature of relationship: mentor, mentee, peer, or collaborator';
COMMENT ON COLUMN writer_relationships.knowledge_transfer_areas IS 'Topics or skills being shared between writers';

-- ===== TABLE 4: writer_memory_log =====
-- Persistent memory of lessons learned, improvements, and contextual insights
-- Core optimization table for tracking writer development and knowledge retention
CREATE TABLE IF NOT EXISTS writer_memory_log (
    id BIGSERIAL PRIMARY KEY,
    writer_id BIGINT NOT NULL REFERENCES writers(id) ON DELETE CASCADE,
    memory_type VARCHAR(50) NOT NULL CHECK (memory_type IN ('lesson_learned', 'pattern_identified', 'improvement', 'audience_insight', 'technical_tip', 'style_refinement', 'audience_feedback', 'competitive_analysis')),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    related_content_id BIGINT REFERENCES writer_content(id) ON DELETE SET NULL,
    relevance_score DECIMAL(3,2) CHECK (relevance_score >= 0 AND relevance_score <= 1),
    impact_category VARCHAR(100) CHECK (impact_category IN ('tone_improvement', 'engagement_boost', 'accuracy_increase', 'clarity_enhancement', 'audience_expansion', 'efficiency_gain', 'brand_alignment')),
    implementation_status VARCHAR(50) NOT NULL DEFAULT 'documented' CHECK (implementation_status IN ('documented', 'in_progress', 'implemented', 'archived')),
    source VARCHAR(100) NOT NULL CHECK (source IN ('direct_learning', 'audience_feedback', 'peer_input', 'system_analysis', 'external_research')),
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT title_not_empty CHECK (length(trim(title)) > 0),
    CONSTRAINT description_not_empty CHECK (length(trim(description)) > 0)
);

COMMENT ON TABLE writer_memory_log IS 'Persistent knowledge base tracking writer lessons, patterns, and improvements';
COMMENT ON COLUMN writer_memory_log.memory_type IS 'Category of memory: lesson, pattern, improvement, insight, or feedback';
COMMENT ON COLUMN writer_memory_log.relevance_score IS 'How applicable this memory is to current and future writing (0-1)';
COMMENT ON COLUMN writer_memory_log.impact_category IS 'Expected business impact of implementing this memory';
COMMENT ON COLUMN writer_memory_log.implementation_status IS 'Progress state: documented, in progress, implemented, or archived';
COMMENT ON COLUMN writer_memory_log.source IS 'Origin of the memory: self-learning, feedback, peer input, or analysis';

-- ===== TABLE 5: writer_voice_snapshots =====
-- Point-in-time captures of writer voice characteristics for tracking evolution
-- Enables analysis of voice development and consistency over time
CREATE TABLE IF NOT EXISTS writer_voice_snapshots (
    id BIGSERIAL PRIMARY KEY,
    writer_id BIGINT NOT NULL REFERENCES writers(id) ON DELETE CASCADE,
    snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tone_characteristics JSONB NOT NULL,
    signature_phrases TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    vocabulary_profile JSONB NOT NULL,
    sentence_structure_patterns JSONB NOT NULL,
    engagement_techniques TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    audience_connection_style VARCHAR(255),
    content_organization_pattern VARCHAR(100),
    distinctive_elements TEXT[],
    voice_consistency_score DECIMAL(5,2) CHECK (voice_consistency_score >= 0 AND voice_consistency_score <= 100),
    evolution_notes TEXT,
    performance_baseline DECIMAL(5,2),
    period_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT snapshot_date_not_future CHECK (snapshot_date <= CURRENT_TIMESTAMP)
);

COMMENT ON TABLE writer_voice_snapshots IS 'Historical snapshots of writer voice characteristics and evolution';
COMMENT ON COLUMN writer_voice_snapshots.snapshot_date IS 'Date when this voice profile was captured';
COMMENT ON COLUMN writer_voice_snapshots.tone_characteristics IS 'JSON mapping tone dimensions to characteristics';
COMMENT ON COLUMN writer_voice_snapshots.signature_phrases IS 'Recurring phrases unique to this writer';
COMMENT ON COLUMN writer_voice_snapshots.vocabulary_profile IS 'JSON analysis of word choice patterns';
COMMENT ON COLUMN writer_voice_snapshots.voice_consistency_score IS 'Measure of consistency in applying voice characteristics (0-100)';

-- ===== INDEXES FOR PERFORMANCE =====
-- Optimize query performance for common access patterns

-- Index for writer lookups by slug and active status
CREATE INDEX IF NOT EXISTS idx_writers_slug ON writers(slug);
CREATE INDEX IF NOT EXISTS idx_writers_active ON writers(is_active);

-- Index for content lookup by writer
CREATE INDEX IF NOT EXISTS idx_writer_content_writer_id ON writer_content(writer_id);
CREATE INDEX IF NOT EXISTS idx_writer_content_type ON writer_content(content_type);
CREATE INDEX IF NOT EXISTS idx_writer_content_published ON writer_content(published_at DESC);

-- Index for relationship queries (both directions)
CREATE INDEX IF NOT EXISTS idx_writer_relationships_a ON writer_relationships(writer_a_id);
CREATE INDEX IF NOT EXISTS idx_writer_relationships_b ON writer_relationships(writer_b_id);
CREATE INDEX IF NOT EXISTS idx_writer_relationships_type ON writer_relationships(relationship_type);

-- Index for memory log queries (critical for performance)
CREATE INDEX IF NOT EXISTS idx_writer_memory_log_writer_id ON writer_memory_log(writer_id);
CREATE INDEX IF NOT EXISTS idx_writer_memory_log_type ON writer_memory_log(memory_type);
CREATE INDEX IF NOT EXISTS idx_writer_memory_log_impact ON writer_memory_log(impact_category);
CREATE INDEX IF NOT EXISTS idx_writer_memory_log_created ON writer_memory_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_writer_memory_log_relevance ON writer_memory_log(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_writer_memory_log_tags ON writer_memory_log USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_writer_memory_log_status ON writer_memory_log(implementation_status);

-- Index for voice snapshots
CREATE INDEX IF NOT EXISTS idx_writer_voice_snapshots_writer_id ON writer_voice_snapshots(writer_id);
CREATE INDEX IF NOT EXISTS idx_writer_voice_snapshots_date ON writer_voice_snapshots(snapshot_date DESC);

-- End Migration 007
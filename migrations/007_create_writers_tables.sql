-- Migration 007: Create Writers Management Tables
-- Date: 2025-12-31
-- Author: Claude Code (Agent Refactoring Phase 2)
-- Purpose: Support Agent Token Optimization through writer-specific context
-- Status: IDEMPOTENT (safe to run multiple times)
-- Phase: 2 (Agent Token Optimization)

-- ===== TABLE 1: writers =====
-- Purpose: Store writer profiles with voice, style, and expertise
-- Why: Centralize writer metadata for optimized prompt generation
-- Queries: Fetch by slug, list active writers, update voice formula

CREATE TABLE IF NOT EXISTS writers (
    id BIGSERIAL PRIMARY KEY,

    -- Identity
    slug VARCHAR(100) NOT NULL UNIQUE,
    -- URL-safe identifier: 'sarah', 'marcus', 'chloe'
    name VARCHAR(200) NOT NULL,
    -- Full name: 'Sarah', 'Marcus', 'Chloe'

    -- Role and positioning
    role_title VARCHAR(200) NOT NULL,
    -- Professional role: 'Health Coach', 'Sales & Partnerships Lead', etc.
    tagline TEXT NOT NULL,
    -- Short value proposition (1-2 sentences)

    -- Voice and style (JSON for flexibility)
    voice_formula JSONB,
    -- Structure:
    -- {
    --   "tone": "Warm, conversational, grounded in health science",
    --   "signature_phrases": ["Here's what I've seen work", "From my experience..."],
    --   "engagement_techniques": ["Ask reflective questions", "Share real stories"],
    --   "writing_principles": ["Start with empathy", "Use specific examples"],
    --   "common_opening_patterns": ["I've been coaching for X years..."]
    -- }

    -- Expertise
    content_domains TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    -- Array of expertise areas: ["weight loss", "women's health", "beginner guidance", ...]
    philosophy TEXT,
    -- Core beliefs and approach (2-3 sentences)

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    -- Soft delete support; never hard-delete for audit trail

    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    CONSTRAINT writers_pkey PRIMARY KEY (id),
    CONSTRAINT slug_not_empty CHECK (length(trim(slug)) > 0),
    CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT role_title_not_empty CHECK (length(trim(role_title)) > 0)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_writers_slug
    ON writers(slug)
    WHERE is_active = true;
    -- Why: Fetch writer by slug is primary query

CREATE INDEX IF NOT EXISTS idx_writers_active
    ON writers(is_active, created_at DESC);
    -- Why: List active writers in order

CREATE INDEX IF NOT EXISTS idx_writers_created_at
    ON writers(created_at DESC);
    -- Why: Audit queries and historical tracking

-- ===== TABLE 2: writer_memory_log =====
-- Purpose: Store lessons learned from writing sessions
-- Why: Allow agents to learn and improve without retraining
-- Updates: Append-only (INSERT only), never UPDATE/DELETE
-- Queries: Fetch recent entries (last 5) by writer_id, search by lesson_type

CREATE TABLE IF NOT EXISTS writer_memory_log (
    id BIGSERIAL PRIMARY KEY,

    -- Reference to writer
    writer_id BIGINT NOT NULL REFERENCES writers(id) ON DELETE CASCADE,
    -- Foreign key ensures entries are tied to valid writers

    -- Lesson metadata
    lesson_type VARCHAR(100) NOT NULL,
    -- Categories: 'Writing Approach', 'Common Objection', 'Audience Feedback',
    -- 'Content Performance', 'Structural Insight', 'Tone Adjustment', etc.

    -- The actual lesson
    content TEXT NOT NULL,
    -- What was learned (2-3 sentences) - the actual insight/memory

    -- Context
    source_content_id BIGINT,
    -- Reference to the content that generated this lesson (optional)
    source_type VARCHAR(50),
    -- Where lesson came from: 'audience_feedback', 'performance_data', 'peer_review', 'self_reflection'

    -- Classification
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    -- Searchable labels: ['engagement', 'specificity', 'tone', 'structure', 'budget', etc.]

    is_active BOOLEAN DEFAULT TRUE,
    -- Soft delete: mark old lessons as inactive without removing

    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    CONSTRAINT writer_memory_log_pkey PRIMARY KEY (id),
    CONSTRAINT content_not_empty CHECK (length(trim(content)) > 0),
    CONSTRAINT lesson_type_not_empty CHECK (length(trim(lesson_type)) > 0)
);

-- Indexes for analytics and retrieval
CREATE INDEX IF NOT EXISTS idx_memory_log_writer_id
    ON writer_memory_log(writer_id, created_at DESC);
    -- Why: Fetch recent lessons for specific writer (primary use case)

CREATE INDEX IF NOT EXISTS idx_memory_log_lesson_type
    ON writer_memory_log(writer_id, lesson_type, created_at DESC);
    -- Why: Filter by lesson type (e.g., "all Common Objection lessons")

CREATE INDEX IF NOT EXISTS idx_memory_log_tags
    ON writer_memory_log USING GIN (tags);
    -- Why: Full-text search by tags (engagement, tone, etc.)

CREATE INDEX IF NOT EXISTS idx_memory_log_created_at
    ON writer_memory_log(created_at DESC);
    -- Why: Time-series queries ("lessons from last week")

-- ===== TABLE 3: writer_performance_metrics =====
-- Purpose: Track effectiveness of writer's content over time
-- Why: Monitor if lessons learned are actually improving output
-- Updates: Append-only (INSERT weekly via analysis script)
-- Queries: Trends over time, performance by domain, ROI tracking

CREATE TABLE IF NOT EXISTS writer_performance_metrics (
    id BIGSERIAL PRIMARY KEY,

    -- Reference to writer
    writer_id BIGINT NOT NULL REFERENCES writers(id) ON DELETE CASCADE,

    -- Measurement period
    metric_week DATE NOT NULL,
    -- Week starting date (ISO week) for aggregation

    -- Performance indicators
    content_pieces_published SMALLINT NOT NULL DEFAULT 0,
    -- How much the writer published this week

    engagement_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
    -- Average engagement (0-100) of published content

    reader_feedback_positive_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
    -- Percent of feedback that was positive

    average_time_to_publish_seconds BIGINT NOT NULL DEFAULT 0,
    -- How long (in seconds) from assignment to publication

    quality_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
    -- Editor's quality assessment (0-100)

    -- Additional metrics
    metrics JSONB,
    -- Flexible storage for additional KPIs
    -- Example: {"click_through_rate": 0.042, "share_count": 127, "bounce_rate": 0.15}

    notes TEXT,
    -- Manual notes from editors or analysts

    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    CONSTRAINT writer_performance_metrics_pkey PRIMARY KEY (id),
    CONSTRAINT unique_writer_week UNIQUE (writer_id, metric_week)
    -- Prevent duplicate metrics for same writer/week
);

-- Indexes for trend analysis
CREATE INDEX IF NOT EXISTS idx_performance_writer_id
    ON writer_performance_metrics(writer_id, metric_week DESC);
    -- Why: Fetch historical performance for specific writer

CREATE INDEX IF NOT EXISTS idx_performance_metric_week
    ON writer_performance_metrics(metric_week DESC);
    -- Why: Compare all writers for given week

CREATE INDEX IF NOT EXISTS idx_performance_engagement
    ON writer_performance_metrics(writer_id, engagement_score DESC);
    -- Why: Top performing weeks for specific writer

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

-- ===== SEED DATA (Optional - comment out if already seeded) =====
-- Insert default writers if they don't exist

INSERT INTO writers (slug, name, role_title, tagline, voice_formula, content_domains, philosophy, created_by)
VALUES
    (
        'sarah',
        'Sarah',
        'Health Coach & Community Leader',
        'Helping people understand carnivore nutrition with authentic insights and proven results',
        '{"tone": "Warm, conversational, grounded in health science", "signature_phrases": ["Here'"'"'s what I'"'"'ve seen work", "From my experience coaching", "The truth is", "What matters most"], "engagement_techniques": ["Ask reflective questions", "Share real success stories", "Address common objections", "Validate feelings while pushing forward"], "writing_principles": ["Start with empathy and understanding", "Use specific examples from real people", "Explain the why behind recommendations", "Acknowledge challenges while offering solutions", "Never shame or judge food choices"]}'::JSONB,
        ARRAY['Health coaching', 'Weight loss and body composition', 'Energy and performance', 'Women'"'"'s health', 'Beginner guidance', 'Troubleshooting common issues'],
        'I believe everyone deserves to feel their best. Carnivore is a tool, not a religion. My job is helping people understand what works for their unique body and lifestyle.',
        NULL
    ) ON CONFLICT (slug) DO NOTHING;

INSERT INTO writers (slug, name, role_title, tagline, voice_formula, content_domains, philosophy, created_by)
VALUES
    (
        'marcus',
        'Marcus',
        'Sales & Partnerships Lead',
        'Building relationships and identifying opportunities within the carnivore ecosystem',
        '{"tone": "Professional, strategic, opportunity-focused", "signature_phrases": ["Here'"'"'s where we see opportunity", "From a business perspective", "The win-win here is", "What we'"'"'re noticing"], "engagement_techniques": ["Present data-driven insights", "Connect to business value", "Highlight mutual benefits", "Focus on ROI and growth"], "writing_principles": ["Lead with numbers and trends", "Explain strategic implications", "Identify partnership opportunities", "Think long-term relationships", "Be direct and action-oriented"]}'::JSONB,
        ARRAY['Partnership strategy', 'Market trends', 'Business opportunities', 'Growth metrics', 'Affiliate relationships', 'Sponsorship deals'],
        'Business growth happens through authentic relationships and strategic alignment. Our job is finding partners who genuinely believe in what we'"'"'re building.',
        NULL
    ) ON CONFLICT (slug) DO NOTHING;

INSERT INTO writers (slug, name, role_title, tagline, voice_formula, content_domains, philosophy, created_by)
VALUES
    (
        'chloe',
        'Chloe',
        'Marketing & Community Manager',
        'Creating engaging content that connects our audience with the carnivore community',
        '{"tone": "Enthusiastic, trendy, community-focused", "signature_phrases": ["Community is saying", "This is resonating", "Here'"'"'s the vibe", "People are asking about"], "engagement_techniques": ["Highlight trending topics", "Share community stories", "Create FOMO around events", "Celebrate member successes"], "writing_principles": ["Start with what'"'"'s buzzing", "Make it feel personal and inclusive", "Use authentic community voices", "Balance trending with timeless", "Build excitement around community growth"]}'::JSONB,
        ARRAY['Community engagement', 'Trending topics', 'Social media strategy', 'Event promotion', 'Member spotlights', 'Cultural moments'],
        'Our community is our greatest asset. Great marketing is about amplifying real conversations and celebrating what'"'"'s actually happening.',
        NULL
    ) ON CONFLICT (slug) DO NOTHING;

-- ===== INITIAL MEMORY LOG ENTRIES (Example for testing) =====
-- These examples show how lessons get stored

WITH sarah_id AS (
    SELECT id FROM writers WHERE slug = 'sarah' LIMIT 1
)
INSERT INTO writer_memory_log (
    writer_id,
    lesson_type,
    content,
    source_type,
    tags,
    created_by
)
SELECT
    (SELECT id FROM sarah_id),
    'Writing Approach',
    'People respond better when I address their specific challenges. Generic advice gets scrolled past. Use real examples from coaching conversations.',
    'self_reflection',
    ARRAY['engagement', 'specificity', 'audience-focus'],
    NULL
WHERE NOT EXISTS (
    SELECT 1 FROM writer_memory_log
    WHERE writer_id = (SELECT id FROM sarah_id)
    AND lesson_type = 'Writing Approach'
);

WITH sarah_id AS (
    SELECT id FROM writers WHERE slug = 'sarah' LIMIT 1
)
INSERT INTO writer_memory_log (
    writer_id,
    lesson_type,
    content,
    source_type,
    tags,
    created_by
)
SELECT
    (SELECT id FROM sarah_id),
    'Common Objection',
    'When addressing "carnivore is too expensive", lead with budget-friendly options: beef organ meats, eggs, ground beef. Show real meal plans.',
    'audience_feedback',
    ARRAY['budget', 'objection-handling', 'affordability'],
    NULL
WHERE NOT EXISTS (
    SELECT 1 FROM writer_memory_log
    WHERE writer_id = (SELECT id FROM sarah_id)
    AND lesson_type = 'Common Objection'
);

-- ===== END Migration 007 =====

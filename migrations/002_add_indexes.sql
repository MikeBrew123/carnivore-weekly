-- Migration 002: Add Performance Indexes
-- Date: 2025-12-31
-- Purpose: Optimize query plans for common access patterns
-- Status: IDEMPOTENT

-- ===== INDEXES: bento_grid_items =====
CREATE INDEX IF NOT EXISTS idx_bento_grid_position
    ON bento_grid_items(grid_position ASC);

CREATE INDEX IF NOT EXISTS idx_bento_engagement_score
    ON bento_grid_items(engagement_score DESC, grid_position ASC);

CREATE INDEX IF NOT EXISTS idx_bento_content_lookup
    ON bento_grid_items(content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_bento_created_at
    ON bento_grid_items(created_at DESC);

-- ===== INDEXES: content_engagement =====
CREATE INDEX IF NOT EXISTS idx_engagement_content_id
    ON content_engagement(content_id);

CREATE INDEX IF NOT EXISTS idx_engagement_created_at
    ON content_engagement(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_engagement_type_sentiment
    ON content_engagement(interaction_type, sentiment);

CREATE INDEX IF NOT EXISTS idx_engagement_user_id
    ON content_engagement(user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_engagement_composite
    ON content_engagement(content_id, created_at DESC, sentiment);

-- ===== INDEXES: trending_topics =====
CREATE INDEX IF NOT EXISTS idx_trending_engagement_score
    ON trending_topics(engagement_score DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trending_created_at
    ON trending_topics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trending_is_active
    ON trending_topics(is_active)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_trending_mention_count
    ON trending_topics(mention_count DESC);

CREATE INDEX IF NOT EXISTS idx_trending_creators
    ON trending_topics USING GIN (creators_array);

-- ===== INDEXES: user_interests =====
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id
    ON user_interests(user_id);

CREATE INDEX IF NOT EXISTS idx_user_interests_tags
    ON user_interests USING GIN (interest_tags);

CREATE INDEX IF NOT EXISTS idx_user_interests_active
    ON user_interests(is_active)
    WHERE is_active = TRUE;

-- ===== INDEXES: creators =====
CREATE INDEX IF NOT EXISTS idx_creators_subscriber_count
    ON creators(subscriber_count DESC);

CREATE INDEX IF NOT EXISTS idx_creators_focus_areas
    ON creators USING GIN (focus_areas);

CREATE INDEX IF NOT EXISTS idx_creators_is_active
    ON creators(is_active)
    WHERE is_active = TRUE;

-- ===== INDEXES: homepage_grid materialized view =====
CREATE INDEX IF NOT EXISTS idx_homepage_grid_position
    ON homepage_grid(grid_position);

-- ===== INDEXES: audit_log =====
CREATE INDEX IF NOT EXISTS idx_audit_table_name
    ON audit_log(table_name);

CREATE INDEX IF NOT EXISTS idx_audit_changed_at
    ON audit_log(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_changed_by
    ON audit_log(changed_by);

-- End Migration 002

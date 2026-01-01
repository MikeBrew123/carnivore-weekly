-- Migration 004: Create Triggers and Functions
-- Date: 2025-12-31
-- Purpose: Automate score recalculation and audit logging
-- Status: IDEMPOTENT

-- ===== FUNCTION: update_timestamp_column =====
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===== TRIGGERS: update_timestamp =====
CREATE TRIGGER IF NOT EXISTS update_bento_grid_items_modtime
    BEFORE UPDATE ON bento_grid_items
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER IF NOT EXISTS update_trending_topics_modtime
    BEFORE UPDATE ON trending_topics
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER IF NOT EXISTS update_user_interests_modtime
    BEFORE UPDATE ON user_interests
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER IF NOT EXISTS update_creators_modtime
    BEFORE UPDATE ON creators
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_column();

-- ===== FUNCTION: recalculate_engagement_score =====
CREATE OR REPLACE FUNCTION recalculate_engagement_score()
RETURNS TRIGGER AS $$
DECLARE
    v_score DECIMAL(5,2);
    v_positive_pct DECIMAL(5,2);
    v_total_interactions BIGINT;
    v_positive_interactions BIGINT;
BEGIN
    SELECT
        COALESCE(COUNT(*) FILTER (WHERE interaction_type = 'view'), 0) * 1 +
        COALESCE(COUNT(*) FILTER (WHERE interaction_type = 'share'), 0) * 5 +
        COALESCE(COUNT(*) FILTER (WHERE interaction_type = 'bookmark'), 0) * 3 +
        COALESCE(
            (COUNT(*) FILTER (WHERE sentiment = 'positive')::numeric /
             NULLIF(COUNT(*), 0) * 20),
            0
        )
    INTO v_score
    FROM content_engagement
    WHERE content_id = NEW.content_id
        AND content_type = NEW.content_type
        AND created_at >= NOW() - INTERVAL '24 hours';

    v_score = LEAST(GREATEST(v_score, 0), 100);

    SELECT
        COUNT(*) FILTER (WHERE sentiment = 'positive'),
        COUNT(*)
    INTO v_positive_interactions, v_total_interactions
    FROM content_engagement
    WHERE content_id = NEW.content_id
        AND content_type = NEW.content_type
        AND created_at >= NOW() - INTERVAL '7 days';

    v_positive_pct = CASE
        WHEN v_total_interactions = 0 THEN 50
        ELSE ROUND((v_positive_interactions::numeric / v_total_interactions) * 100, 2)
    END;

    INSERT INTO bento_grid_items (
        content_type,
        content_id,
        content_title,
        engagement_score,
        positive_sentiment_percent,
        view_count,
        share_count,
        bookmark_count,
        grid_position,
        created_by
    ) VALUES (
        NEW.content_type,
        NEW.content_id,
        'Auto-generated from engagement',
        v_score,
        v_positive_pct,
        (SELECT COUNT(*) FROM content_engagement WHERE content_id = NEW.content_id AND interaction_type = 'view'),
        (SELECT COUNT(*) FROM content_engagement WHERE content_id = NEW.content_id AND interaction_type = 'share'),
        (SELECT COUNT(*) FROM content_engagement WHERE content_id = NEW.content_id AND interaction_type = 'bookmark'),
        50,
        auth.uid()
    )
    ON CONFLICT (content_type, content_id) DO UPDATE SET
        engagement_score = v_score,
        positive_sentiment_percent = v_positive_pct,
        view_count = (SELECT COUNT(*) FROM content_engagement WHERE content_id = NEW.content_id AND interaction_type = 'view'),
        share_count = (SELECT COUNT(*) FROM content_engagement WHERE content_id = NEW.content_id AND interaction_type = 'share'),
        bookmark_count = (SELECT COUNT(*) FROM content_engagement WHERE content_id = NEW.content_id AND interaction_type = 'bookmark'),
        modified_at = CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS engagement_recalculate_score
    AFTER INSERT ON content_engagement
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_engagement_score();

-- ===== FUNCTION: calculate_trending_topics =====
CREATE OR REPLACE FUNCTION calculate_trending_topics()
RETURNS TABLE(topic_id BIGINT, topic_name VARCHAR, engagement_score SMALLINT, rank_position SMALLINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.topic_name,
        t.engagement_score,
        ROW_NUMBER() OVER (ORDER BY t.engagement_score DESC, t.created_at DESC)::SMALLINT as rank_position
    FROM trending_topics t
    WHERE t.is_active = TRUE
        AND t.created_at >= NOW() - INTERVAL '7 days'
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- ===== FUNCTION: audit_engagement_changes =====
CREATE OR REPLACE FUNCTION audit_engagement_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, operation, new_values, changed_by)
        VALUES ('content_engagement', NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_values, new_values, changed_by)
        VALUES ('content_engagement', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_values, changed_by)
        VALUES ('content_engagement', OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS engagement_audit
    AFTER INSERT OR UPDATE OR DELETE ON content_engagement
    FOR EACH ROW
    EXECUTE FUNCTION audit_engagement_changes();

-- End Migration 004

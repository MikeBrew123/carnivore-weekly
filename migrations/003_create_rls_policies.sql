-- Migration 003: Create Row-Level Security Policies
-- Date: 2025-12-31
-- Purpose: Enforce authorization at row level
-- Status: IDEMPOTENT

-- ===== ENABLE RLS =====
ALTER TABLE bento_grid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ===== POLICIES: bento_grid_items =====
CREATE POLICY IF NOT EXISTS bento_grid_items_public_read ON bento_grid_items
    FOR SELECT USING (TRUE);

CREATE POLICY IF NOT EXISTS bento_grid_items_admin_only_modify ON bento_grid_items
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY IF NOT EXISTS bento_grid_items_admin_only_update ON bento_grid_items
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY IF NOT EXISTS bento_grid_items_admin_only_delete ON bento_grid_items
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- ===== POLICIES: content_engagement =====
CREATE POLICY IF NOT EXISTS content_engagement_user_isolation ON content_engagement
    FOR SELECT
    USING (
        (auth.uid() = user_id)
        OR auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY IF NOT EXISTS content_engagement_user_insert ON content_engagement
    FOR INSERT
    WITH CHECK (
        (auth.uid() = user_id)
        OR user_id IS NULL
    );

CREATE POLICY IF NOT EXISTS content_engagement_no_update ON content_engagement
    FOR UPDATE USING (FALSE);

CREATE POLICY IF NOT EXISTS content_engagement_no_delete ON content_engagement
    FOR DELETE USING (FALSE);

-- ===== POLICIES: trending_topics =====
CREATE POLICY IF NOT EXISTS trending_topics_public_read ON trending_topics
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY IF NOT EXISTS trending_topics_admin_insert ON trending_topics
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY IF NOT EXISTS trending_topics_admin_update ON trending_topics
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY IF NOT EXISTS trending_topics_admin_delete ON trending_topics
    FOR DELETE USING (FALSE);

-- ===== POLICIES: user_interests =====
CREATE POLICY IF NOT EXISTS user_interests_self_read ON user_interests
    FOR SELECT
    USING (
        (auth.uid() = user_id)
        OR auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY IF NOT EXISTS user_interests_self_insert ON user_interests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS user_interests_self_update ON user_interests
    FOR UPDATE
    USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY IF NOT EXISTS user_interests_self_delete ON user_interests
    FOR DELETE USING (auth.uid() = user_id);

-- ===== POLICIES: creators =====
CREATE POLICY IF NOT EXISTS creators_public_read ON creators
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY IF NOT EXISTS creators_admin_modify ON creators
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY IF NOT EXISTS creators_admin_update ON creators
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY IF NOT EXISTS creators_admin_delete ON creators
    FOR DELETE USING (FALSE);

-- ===== POLICIES: audit_log =====
CREATE POLICY IF NOT EXISTS audit_log_admin_only_read ON audit_log
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY IF NOT EXISTS audit_log_never_update ON audit_log
    FOR UPDATE USING (FALSE);

CREATE POLICY IF NOT EXISTS audit_log_never_delete ON audit_log
    FOR DELETE USING (FALSE);

-- End Migration 003

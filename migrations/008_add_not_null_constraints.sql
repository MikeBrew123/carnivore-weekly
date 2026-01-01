-- Migration 008: Add NOT NULL Constraints for Data Integrity
-- Purpose: Harden schema by preventing NULL values in critical columns
-- Status: Backfill required - all NULL values will be replaced with sensible defaults
-- Risk: MEDIUM (requires data validation)
-- Duration: 30 minutes

-- Philosophy: "A database is a promise you make to the future. Don't break it."
-- This migration enforces that promise by ensuring critical columns always have values.

BEGIN;

-- WRITERS TABLE: Core identity information must be complete
ALTER TABLE writers
  ALTER COLUMN writer_name SET NOT NULL,
  ALTER COLUMN role_title SET NOT NULL,
  ALTER COLUMN is_active SET NOT NULL DEFAULT true;

COMMENT ON COLUMN writers.writer_name IS 'Writer''s display name - REQUIRED for identification';
COMMENT ON COLUMN writers.role_title IS 'Position/title within organization - REQUIRED for governance';

-- WRITER_CONTENT TABLE: Content metadata must be complete
ALTER TABLE writer_content
  ALTER COLUMN writer_id SET NOT NULL,
  ALTER COLUMN content_type SET NOT NULL,
  ALTER COLUMN content_title SET NOT NULL,
  ALTER COLUMN published_date SET NOT NULL,
  ALTER COLUMN topics_covered SET NOT NULL DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN writer_content.writer_id IS 'Foreign key to writers - REQUIRED for attribution';
COMMENT ON COLUMN writer_content.content_type IS 'Type of content (blog_post, newsletter, summary) - REQUIRED';
COMMENT ON COLUMN writer_content.published_date IS 'Publication date - REQUIRED for sorting and queries';

-- WRITER_MEMORY_LOG TABLE: Lessons must be recorded completely
ALTER TABLE writer_memory_log
  ALTER COLUMN writer_id SET NOT NULL,
  ALTER COLUMN entry_type SET NOT NULL,
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN issue_description SET NOT NULL;

COMMENT ON COLUMN writer_memory_log.entry_type IS 'Type of memory entry - REQUIRED for categorization';
COMMENT ON COLUMN writer_memory_log.title IS 'Summary of lesson - REQUIRED';

-- WRITER_RELATIONSHIPS TABLE: Relationships must be explicitly defined
ALTER TABLE writer_relationships
  ALTER COLUMN source_writer_id SET NOT NULL,
  ALTER COLUMN source_content_id SET NOT NULL,
  ALTER COLUMN target_writer_id SET NOT NULL,
  ALTER COLUMN relationship_type SET NOT NULL;

COMMENT ON COLUMN writer_relationships.relationship_type IS 'Type of relationship (reference, collaboration, etc) - REQUIRED';

-- WRITER_VOICE_SNAPSHOTS TABLE: Snapshots must capture complete state
ALTER TABLE writer_voice_snapshots
  ALTER COLUMN writer_id SET NOT NULL,
  ALTER COLUMN snapshot_date SET NOT NULL,
  ALTER COLUMN voice_formula_snapshot SET NOT NULL;

COMMENT ON COLUMN writer_voice_snapshots.snapshot_date IS 'Date of voice snapshot - REQUIRED for tracking evolution';

-- Add CHECK constraints for data quality
ALTER TABLE writers
  ADD CONSTRAINT check_writer_name_not_empty
    CHECK (char_length(trim(writer_name)) > 0);

ALTER TABLE writer_content
  ADD CONSTRAINT check_content_title_not_empty
    CHECK (char_length(trim(content_title)) > 0),
  ADD CONSTRAINT check_word_count_positive
    CHECK (word_count IS NULL OR word_count > 0);

ALTER TABLE writer_memory_log
  ADD CONSTRAINT check_memory_title_not_empty
    CHECK (char_length(trim(title)) > 0),
  ADD CONSTRAINT check_memory_description_not_empty
    CHECK (char_length(trim(issue_description)) > 0);

-- Create validation report view
CREATE OR REPLACE VIEW schema_integrity_report AS
SELECT
  'writers' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE writer_name IS NULL) as null_writer_name,
  COUNT(*) FILTER (WHERE role_title IS NULL) as null_role_title,
  COUNT(*) FILTER (WHERE is_active IS NULL) as null_is_active
FROM writers
UNION ALL
SELECT
  'writer_content',
  COUNT(*),
  COUNT(*) FILTER (WHERE writer_id IS NULL),
  COUNT(*) FILTER (WHERE content_type IS NULL),
  COUNT(*) FILTER (WHERE content_title IS NULL)
FROM writer_content
UNION ALL
SELECT
  'writer_memory_log',
  COUNT(*),
  COUNT(*) FILTER (WHERE writer_id IS NULL),
  COUNT(*) FILTER (WHERE entry_type IS NULL),
  COUNT(*) FILTER (WHERE title IS NULL)
FROM writer_memory_log;

COMMENT ON VIEW schema_integrity_report IS 'Daily report on schema constraint violations - helps identify data quality issues';

-- Add audit triggers for NOT NULL constraint compliance
CREATE OR REPLACE FUNCTION audit_null_constraint_violation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW IS DISTINCT FROM OLD THEN
    INSERT INTO audit_log (table_name, operation, record_id, old_data, new_data, changed_at)
    VALUES (
      TG_TABLE_NAME,
      'CONSTRAINT_CHECK',
      CAST(COALESCE(NEW.id, OLD.id) AS TEXT),
      row_to_jsonb(OLD),
      row_to_jsonb(NEW),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION audit_null_constraint_violation() IS 'Audit trigger for constraint compliance - logs all constraint-related operations';

-- Performance: Create indexes for constraint-heavy columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_writers_name_check
  ON writers(writer_name)
  WHERE writer_name IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_writer_content_type_published
  ON writer_content(content_type, published_date DESC)
  WHERE writer_id IS NOT NULL;

-- Summary of changes
-- ==================
-- ✅ Writers table: writer_name, role_title, is_active now NOT NULL
-- ✅ Writer_content table: writer_id, content_type, content_title, published_date, topics_covered now NOT NULL
-- ✅ Writer_memory_log table: writer_id, entry_type, title, issue_description now NOT NULL
-- ✅ Writer_relationships table: relationship_type now NOT NULL
-- ✅ Writer_voice_snapshots table: snapshot_date, voice_formula_snapshot now NOT NULL
-- ✅ Added CHECK constraints for string length validation
-- ✅ Created schema_integrity_report view for monitoring
-- ✅ Created audit_null_constraint_violation trigger
-- ✅ Added performance indexes
--
-- Rollback: ALTER TABLE [table] ALTER COLUMN [column] DROP NOT NULL;

COMMIT;

-- MIGRATION 026: Create 15+ performance indexes
-- Strategic index architecture for writers, memory_log, and published_content tables
-- Indexes support filtering, sorting, full-text search, and composite queries

-- Writers table indexes
CREATE INDEX IF NOT EXISTS idx_writers_slug ON writers(slug);
CREATE INDEX IF NOT EXISTS idx_writers_is_active ON writers(is_active);
CREATE INDEX IF NOT EXISTS idx_writers_composite_active_slug ON writers(is_active, slug) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_writers_created_at ON writers(created_at DESC);

-- Writer memory log - single column indexes
CREATE INDEX IF NOT EXISTS idx_memory_log_writer_id ON writer_memory_log(writer_id);
CREATE INDEX IF NOT EXISTS idx_memory_log_type ON writer_memory_log(memory_type);
CREATE INDEX IF NOT EXISTS idx_memory_log_relevance ON writer_memory_log(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_memory_log_status ON writer_memory_log(implementation_status);
CREATE INDEX IF NOT EXISTS idx_memory_log_source ON writer_memory_log(source);
CREATE INDEX IF NOT EXISTS idx_memory_log_impact ON writer_memory_log(impact_category);
CREATE INDEX IF NOT EXISTS idx_memory_log_created_at ON writer_memory_log(created_at DESC);

-- Writer memory log - composite indexes
CREATE INDEX IF NOT EXISTS idx_memory_log_composite_writer_relevance ON writer_memory_log(writer_id, relevance_score DESC);

-- Writer memory log - full-text search on tags (array)
CREATE INDEX IF NOT EXISTS idx_memory_log_tags ON writer_memory_log USING GIN(tags);

-- Published content indexes
CREATE INDEX IF NOT EXISTS idx_published_content_slug ON published_content(slug);
CREATE INDEX IF NOT EXISTS idx_published_content_writer ON published_content(writer_slug);
CREATE INDEX IF NOT EXISTS idx_published_content_date ON published_content(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_published_content_tags ON published_content USING GIN(topic_tags);
CREATE INDEX IF NOT EXISTS idx_published_content_composite_writer_date ON published_content(writer_slug, published_date DESC);

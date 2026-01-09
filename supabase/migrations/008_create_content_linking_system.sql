-- Migration 008: Content Linking System
-- Purpose: Enable agents to auto-link related content across wiki, blog, and videos
-- ACID properties enforced via foreign keys and constraints

-- ============================================================
-- TOPICS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE, -- URL-safe identifier (e.g., "beef-nutrition")
  display_name TEXT NOT NULL, -- Human-readable (e.g., "Beef Nutrition")
  description TEXT, -- Optional context for agents
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT topics_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE INDEX idx_topics_slug ON public.topics(slug);
COMMENT ON TABLE public.topics IS 'Flat taxonomy of content topics - no hierarchy';
COMMENT ON COLUMN public.topics.slug IS 'Kebab-case identifier for URLs and agent queries';

-- ============================================================
-- CONTENT TOPICS (JUNCTION TABLE)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,

  -- Content identifiers (ONE must be populated)
  content_type TEXT NOT NULL CHECK (content_type IN ('wiki', 'blog', 'video')),
  content_identifier TEXT NOT NULL, -- slug for wiki/blog, youtube_id for video

  -- Metadata
  assigned_by TEXT, -- agent name (e.g., 'quinn', 'casey')
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(topic_id, content_type, content_identifier)
);

CREATE INDEX idx_content_topics_topic_id ON public.content_topics(topic_id);
CREATE INDEX idx_content_topics_content_lookup ON public.content_topics(content_type, content_identifier);
CREATE INDEX idx_content_topics_by_type ON public.content_topics(content_type);

COMMENT ON TABLE public.content_topics IS 'Junction table mapping content to topics - many-to-many';
COMMENT ON COLUMN public.content_topics.content_identifier IS 'wiki/blog = slug, video = youtube_id';

-- ============================================================
-- VIEWS FOR AGENT QUERIES
-- ============================================================

-- View: Get all content for a specific topic
CREATE OR REPLACE VIEW public.v_content_by_topic AS
SELECT
  t.slug AS topic_slug,
  t.display_name AS topic_name,
  ct.content_type,
  ct.content_identifier,
  ct.assigned_at
FROM public.content_topics ct
JOIN public.topics t ON ct.topic_id = t.id
ORDER BY ct.assigned_at DESC;

COMMENT ON VIEW public.v_content_by_topic IS 'Agent query: Get all content linked to a topic';

-- View: Get all topics for a specific content item
CREATE OR REPLACE VIEW public.v_topics_by_content AS
SELECT
  ct.content_type,
  ct.content_identifier,
  t.slug AS topic_slug,
  t.display_name AS topic_name,
  ct.assigned_at
FROM public.content_topics ct
JOIN public.topics t ON ct.topic_id = t.id
ORDER BY ct.content_type, ct.content_identifier, ct.assigned_at DESC;

COMMENT ON VIEW public.v_topics_by_content IS 'Agent query: Get all topics for a content item';

-- View: Related content finder (excluding current item)
CREATE OR REPLACE VIEW public.v_related_content AS
SELECT
  ct1.content_type AS source_type,
  ct1.content_identifier AS source_identifier,
  ct2.content_type AS related_type,
  ct2.content_identifier AS related_identifier,
  t.slug AS shared_topic_slug,
  t.display_name AS shared_topic_name
FROM public.content_topics ct1
JOIN public.content_topics ct2 ON ct1.topic_id = ct2.topic_id
JOIN public.topics t ON ct1.topic_id = t.id
WHERE (ct1.content_type != ct2.content_type OR ct1.content_identifier != ct2.content_identifier);

COMMENT ON VIEW public.v_related_content IS 'Agent query: Find related content via shared topics';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_topics ENABLE ROW LEVEL SECURITY;

-- Public read access (content linking is public data)
CREATE POLICY topics_public_read ON public.topics
  FOR SELECT USING (true);

CREATE POLICY content_topics_public_read ON public.content_topics
  FOR SELECT USING (true);

-- Write access for service role only (agents via authenticated session)
CREATE POLICY topics_service_write ON public.topics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY content_topics_service_write ON public.content_topics
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- EXAMPLE DATA (Seed Topics)
-- ============================================================
INSERT INTO public.topics (slug, display_name, description) VALUES
  ('beef-nutrition', 'Beef Nutrition', 'Nutritional profiles of beef cuts and organ meats'),
  ('carnivore-basics', 'Carnivore Basics', 'Foundational principles of carnivore diet'),
  ('electrolytes', 'Electrolytes', 'Sodium, potassium, magnesium balance'),
  ('adaptation', 'Adaptation Phase', 'First 30-90 days transitioning to carnivore'),
  ('metabolic-health', 'Metabolic Health', 'Insulin sensitivity, fat adaptation, metabolic markers'),
  ('autoimmune', 'Autoimmune Conditions', 'Carnivore diet and autoimmune disease management'),
  ('mental-health', 'Mental Health', 'Mood, anxiety, depression, cognitive function'),
  ('animal-fats', 'Animal Fats', 'Tallow, lard, butter, suet - rendering and usage'),
  ('organ-meats', 'Organ Meats', 'Liver, heart, kidney, brain nutrition and preparation'),
  ('nose-to-tail', 'Nose-to-Tail', 'Whole animal eating philosophy'),
  ('cooking-techniques', 'Cooking Techniques', 'Preparation methods for carnivore foods'),
  ('food-quality', 'Food Quality', 'Grass-fed, grass-finished, pasture-raised sourcing'),
  ('supplements', 'Supplements', 'When and what to supplement on carnivore'),
  ('exercise', 'Exercise & Performance', 'Training, recovery, athletic performance'),
  ('sleep', 'Sleep Optimization', 'Sleep quality and circadian health'),
  ('digestion', 'Digestion', 'Gut health, bile production, digestive enzymes'),
  ('inflammation', 'Inflammation', 'Chronic inflammation reduction'),
  ('weight-loss', 'Weight Loss', 'Fat loss and body recomposition'),
  ('cancer', 'Cancer Metabolism', 'Metabolic theory of cancer'),
  ('longevity', 'Longevity', 'Healthspan and lifespan optimization')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- EXAMPLE MAPPINGS
-- ============================================================

-- Example: Wiki section "The Adaptation Period" linked to topics
INSERT INTO public.content_topics (topic_id, content_type, content_identifier, assigned_by)
SELECT
  t.id,
  'wiki',
  'adaptation-period',
  'leo'
FROM public.topics t
WHERE t.slug IN ('carnivore-basics', 'adaptation', 'electrolytes', 'digestion')
ON CONFLICT DO NOTHING;

-- Example: Blog post "How to Start Carnivore" linked to topics
INSERT INTO public.content_topics (topic_id, content_type, content_identifier, assigned_by)
SELECT
  t.id,
  'blog',
  'how-to-start-carnivore',
  'quinn'
FROM public.topics t
WHERE t.slug IN ('carnivore-basics', 'adaptation', 'food-quality')
ON CONFLICT DO NOTHING;

-- Example: YouTube video linked to topics
INSERT INTO public.content_topics (topic_id, content_type, content_identifier, assigned_by)
SELECT
  t.id,
  'video',
  'dQw4w9WgXcQ',
  'casey'
FROM public.topics t
WHERE t.slug IN ('beef-nutrition', 'cooking-techniques', 'organ-meats')
ON CONFLICT DO NOTHING;

-- ============================================================
-- AGENT QUERY EXAMPLES (Use these patterns)
-- ============================================================

-- Query 1: Get all content related to "beef-nutrition"
-- SELECT * FROM v_content_by_topic WHERE topic_slug = 'beef-nutrition';

-- Query 2: Get all topics for wiki section "adaptation-period"
-- SELECT * FROM v_topics_by_content
-- WHERE content_type = 'wiki' AND content_identifier = 'adaptation-period';

-- Query 3: Find related content for blog post "how-to-start-carnivore"
-- SELECT DISTINCT related_type, related_identifier, shared_topic_name
-- FROM v_related_content
-- WHERE source_type = 'blog' AND source_identifier = 'how-to-start-carnivore'
-- ORDER BY related_type, related_identifier;

-- Query 4: Add a new topic mapping
-- INSERT INTO content_topics (topic_id, content_type, content_identifier, assigned_by)
-- SELECT id, 'wiki', 'electrolyte-guide', 'quinn'
-- FROM topics WHERE slug = 'electrolytes';

-- Query 5: Get content count by topic (analytics)
-- SELECT t.display_name, ct.content_type, COUNT(*) as count
-- FROM content_topics ct
-- JOIN topics t ON ct.topic_id = t.id
-- GROUP BY t.display_name, ct.content_type
-- ORDER BY count DESC;

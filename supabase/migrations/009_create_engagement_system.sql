-- Migration 009: Engagement Features System
-- Purpose: Capture user engagement without authentication
-- Tables: newsletter_subscribers, content_feedback, post_reactions, topic_polls
-- ACID properties enforced via constraints, indexes, and RLS

-- ============================================================
-- NEWSLETTER SUBSCRIBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribe_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmation_status TEXT NOT NULL DEFAULT 'pending' CHECK (confirmation_status IN ('pending', 'confirmed', 'bounced')),
  confirmation_token TEXT UNIQUE, -- For double opt-in verification
  confirmed_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'homepage' CHECK (source IN ('homepage', 'blog_footer', 'calculator', 'wiki', 'manual')),
  active BOOLEAN NOT NULL DEFAULT true,
  unsubscribe_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  unsubscribed_at TIMESTAMPTZ,

  -- Validation
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT confirmed_at_requires_confirmation CHECK (
    (confirmation_status = 'confirmed' AND confirmed_at IS NOT NULL) OR
    (confirmation_status != 'confirmed' AND confirmed_at IS NULL)
  )
);

CREATE INDEX idx_newsletter_email ON public.newsletter_subscribers(email);
CREATE INDEX idx_newsletter_active ON public.newsletter_subscribers(active) WHERE active = true;
CREATE INDEX idx_newsletter_confirmed ON public.newsletter_subscribers(confirmation_status) WHERE confirmation_status = 'confirmed';
CREATE INDEX idx_newsletter_confirmation_token ON public.newsletter_subscribers(confirmation_token) WHERE confirmation_token IS NOT NULL;
CREATE INDEX idx_newsletter_unsubscribe_token ON public.newsletter_subscribers(unsubscribe_token);

COMMENT ON TABLE public.newsletter_subscribers IS 'Email list for weekly newsletter - double opt-in required';
COMMENT ON COLUMN public.newsletter_subscribers.confirmation_token IS 'One-time token for email verification link';
COMMENT ON COLUMN public.newsletter_subscribers.unsubscribe_token IS 'Permanent token for unsubscribe link';

-- ============================================================
-- CONTENT FEEDBACK (Replaces Google Form)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_text TEXT NOT NULL CHECK (char_length(request_text) >= 10 AND char_length(request_text) <= 1000),
  email TEXT, -- Optional for follow-up
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'in_progress', 'completed', 'declined')),
  reviewed_by TEXT, -- Agent name
  reviewed_at TIMESTAMPTZ,
  notes TEXT, -- Internal agent notes

  -- Spam prevention
  fingerprint TEXT, -- Browser fingerprint hash
  ip_address INET,

  CONSTRAINT email_format_feedback CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_feedback_status ON public.content_feedback(status);
CREATE INDEX idx_feedback_submitted ON public.content_feedback(submitted_at DESC);
CREATE INDEX idx_feedback_fingerprint ON public.content_feedback(fingerprint, submitted_at);

COMMENT ON TABLE public.content_feedback IS 'User content requests - replaces Google Form';
COMMENT ON COLUMN public.content_feedback.fingerprint IS 'Browser fingerprint to limit spam - rate limit 5 per day';

-- ============================================================
-- POST REACTIONS (Thumbs Up/Down)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_slug TEXT NOT NULL, -- Blog post identifier
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('up', 'down')),
  fingerprint TEXT NOT NULL, -- Browser fingerprint for spam prevention
  reacted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,

  -- One reaction per fingerprint per post
  UNIQUE(post_slug, fingerprint)
);

CREATE INDEX idx_reactions_post_slug ON public.post_reactions(post_slug);
CREATE INDEX idx_reactions_fingerprint ON public.post_reactions(fingerprint);
CREATE INDEX idx_reactions_reacted_at ON public.post_reactions(reacted_at DESC);

COMMENT ON TABLE public.post_reactions IS 'Thumbs up/down reactions - one per fingerprint per post';
COMMENT ON COLUMN public.post_reactions.fingerprint IS 'Browser fingerprint hash - prevents duplicate votes';

-- ============================================================
-- AGGREGATED REACTION COUNTS VIEW
-- ============================================================
CREATE OR REPLACE VIEW public.v_post_reaction_counts AS
SELECT
  post_slug,
  COUNT(*) FILTER (WHERE reaction_type = 'up') AS thumbs_up,
  COUNT(*) FILTER (WHERE reaction_type = 'down') AS thumbs_down,
  COUNT(*) AS total_reactions,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE reaction_type = 'up') / NULLIF(COUNT(*), 0),
    1
  ) AS approval_percentage
FROM public.post_reactions
GROUP BY post_slug;

COMMENT ON VIEW public.v_post_reaction_counts IS 'Aggregated reaction counts per blog post';

-- ============================================================
-- TOPIC POLLS (Optional Weekly Voting)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.topic_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_identifier TEXT NOT NULL UNIQUE, -- Format: YYYY-WW (e.g., "2026-02")
  poll_question TEXT NOT NULL,
  poll_status TEXT NOT NULL DEFAULT 'active' CHECK (poll_status IN ('draft', 'active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closes_at TIMESTAMPTZ,
  created_by TEXT, -- Agent name

  CONSTRAINT week_format CHECK (week_identifier ~ '^\d{4}-\d{2}$')
);

CREATE INDEX idx_polls_week ON public.topic_polls(week_identifier);
CREATE INDEX idx_polls_status ON public.topic_polls(poll_status) WHERE poll_status = 'active';

COMMENT ON TABLE public.topic_polls IS 'Weekly topic polls - one active poll at a time';
COMMENT ON COLUMN public.topic_polls.week_identifier IS 'YYYY-WW format for unique week identification';

-- ============================================================
-- POLL OPTIONS (3-4 choices per poll)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.topic_polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL CHECK (char_length(option_text) >= 3 AND char_length(option_text) <= 200),
  display_order INT NOT NULL,

  UNIQUE(poll_id, option_text),
  UNIQUE(poll_id, display_order)
);

CREATE INDEX idx_poll_options_poll_id ON public.poll_options(poll_id);

COMMENT ON TABLE public.poll_options IS 'Options for each poll - typically 3-4 choices';

-- ============================================================
-- POLL VOTES (One vote per fingerprint per poll)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.topic_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,

  -- One vote per fingerprint per poll
  UNIQUE(poll_id, fingerprint)
);

CREATE INDEX idx_poll_votes_poll_id ON public.poll_votes(poll_id);
CREATE INDEX idx_poll_votes_option_id ON public.poll_votes(option_id);
CREATE INDEX idx_poll_votes_fingerprint ON public.poll_votes(fingerprint);

COMMENT ON TABLE public.poll_votes IS 'User votes - one per fingerprint per poll';

-- ============================================================
-- POLL RESULTS VIEW
-- ============================================================
CREATE OR REPLACE VIEW public.v_poll_results AS
SELECT
  p.id AS poll_id,
  p.week_identifier,
  p.poll_question,
  p.poll_status,
  po.id AS option_id,
  po.option_text,
  po.display_order,
  COUNT(pv.id) AS vote_count,
  ROUND(
    100.0 * COUNT(pv.id) / NULLIF(SUM(COUNT(pv.id)) OVER (PARTITION BY p.id), 0),
    1
  ) AS vote_percentage
FROM public.topic_polls p
JOIN public.poll_options po ON p.id = po.poll_id
LEFT JOIN public.poll_votes pv ON po.id = pv.option_id
GROUP BY p.id, p.week_identifier, p.poll_question, p.poll_status, po.id, po.option_text, po.display_order
ORDER BY p.week_identifier DESC, po.display_order;

COMMENT ON VIEW public.v_poll_results IS 'Live poll results with vote counts and percentages';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Public INSERT only (no read access to protect emails)
CREATE POLICY newsletter_public_insert ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);

-- Service role full access (for N8N email sends)
CREATE POLICY newsletter_service_all ON public.newsletter_subscribers
  FOR ALL USING (auth.role() = 'service_role');

-- Content feedback: Public insert, service read/update
CREATE POLICY feedback_public_insert ON public.content_feedback
  FOR INSERT WITH CHECK (true);

CREATE POLICY feedback_service_all ON public.content_feedback
  FOR ALL USING (auth.role() = 'service_role');

-- Post reactions: Public insert, public read (for counts)
CREATE POLICY reactions_public_insert ON public.post_reactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY reactions_public_read ON public.post_reactions
  FOR SELECT USING (true);

CREATE POLICY reactions_service_all ON public.post_reactions
  FOR ALL USING (auth.role() = 'service_role');

-- Topic polls: Public read, service write
CREATE POLICY polls_public_read ON public.topic_polls
  FOR SELECT USING (true);

CREATE POLICY polls_service_write ON public.topic_polls
  FOR ALL USING (auth.role() = 'service_role');

-- Poll options: Public read, service write
CREATE POLICY poll_options_public_read ON public.poll_options
  FOR SELECT USING (true);

CREATE POLICY poll_options_service_write ON public.poll_options
  FOR ALL USING (auth.role() = 'service_role');

-- Poll votes: Public insert, public read (for results)
CREATE POLICY poll_votes_public_insert ON public.poll_votes
  FOR INSERT WITH CHECK (true);

CREATE POLICY poll_votes_public_read ON public.poll_votes
  FOR SELECT USING (true);

CREATE POLICY poll_votes_service_all ON public.poll_votes
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- EXAMPLE DATA (Seed)
-- ============================================================

-- Example: Newsletter subscriber (pending confirmation)
INSERT INTO public.newsletter_subscribers (email, source, confirmation_token)
VALUES ('test@example.com', 'homepage', 'abc123def456')
ON CONFLICT DO NOTHING;

-- Example: Content feedback request
INSERT INTO public.content_feedback (request_text, email, fingerprint)
VALUES
  ('I want to see more content about organ meat preparation', 'user@example.com', 'fp_abc123'),
  ('Can you cover electrolyte supplementation for athletes?', NULL, 'fp_def456')
ON CONFLICT DO NOTHING;

-- Example: Weekly poll
INSERT INTO public.topic_polls (week_identifier, poll_question, poll_status, created_by)
VALUES ('2026-02', 'What topic should we cover next?', 'active', 'quinn')
ON CONFLICT DO NOTHING;

INSERT INTO public.poll_options (poll_id, option_text, display_order)
SELECT
  p.id,
  option_text,
  display_order
FROM public.topic_polls p
CROSS JOIN (VALUES
  ('Bone broth recipes and benefits', 1),
  ('Carnivore diet for athletes', 2),
  ('Troubleshooting digestive issues', 3),
  ('Budget-friendly carnivore shopping', 4)
) AS opts(option_text, display_order)
WHERE p.week_identifier = '2026-02'
ON CONFLICT DO NOTHING;

-- ============================================================
-- AGENT QUERY EXAMPLES
-- ============================================================

-- Query 1: Get active newsletter subscribers for weekly send (N8N)
-- SELECT email, confirmation_status
-- FROM newsletter_subscribers
-- WHERE active = true AND confirmation_status = 'confirmed'
-- ORDER BY subscribe_date DESC;

-- Query 2: Get new content feedback requests
-- SELECT id, request_text, email, submitted_at
-- FROM content_feedback
-- WHERE status = 'new'
-- ORDER BY submitted_at DESC;

-- Query 3: Get reaction counts for a blog post
-- SELECT * FROM v_post_reaction_counts
-- WHERE post_slug = 'beef-liver-nutrition-guide';

-- Query 4: Get current active poll with results
-- SELECT * FROM v_poll_results
-- WHERE poll_status = 'active';

-- Query 5: Record a newsletter signup
-- INSERT INTO newsletter_subscribers (email, source, confirmation_token)
-- VALUES ('user@example.com', 'blog_footer', gen_random_uuid()::TEXT)
-- ON CONFLICT (email) DO NOTHING
-- RETURNING id, confirmation_token;

-- Query 6: Confirm email subscription
-- UPDATE newsletter_subscribers
-- SET confirmation_status = 'confirmed', confirmed_at = NOW()
-- WHERE confirmation_token = 'TOKEN_FROM_EMAIL' AND confirmation_status = 'pending'
-- RETURNING email;

-- Query 7: Record a post reaction (handle duplicate)
-- INSERT INTO post_reactions (post_slug, reaction_type, fingerprint, ip_address)
-- VALUES ('beef-guide', 'up', 'fp_user123', '192.168.1.1'::INET)
-- ON CONFLICT (post_slug, fingerprint)
-- DO UPDATE SET reaction_type = EXCLUDED.reaction_type, reacted_at = NOW()
-- RETURNING id;

-- Query 8: Submit a poll vote (prevent duplicates)
-- INSERT INTO poll_votes (poll_id, option_id, fingerprint, ip_address)
-- VALUES (
--   (SELECT id FROM topic_polls WHERE week_identifier = '2026-02'),
--   'OPTION_UUID',
--   'fp_user456',
--   '192.168.1.2'::INET
-- )
-- ON CONFLICT (poll_id, fingerprint) DO NOTHING
-- RETURNING id;

-- Query 9: Rate limit check (prevent spam)
-- SELECT COUNT(*) FROM content_feedback
-- WHERE fingerprint = 'fp_user789'
-- AND submitted_at > NOW() - INTERVAL '24 hours';
-- -- Reject if count >= 5

-- Query 10: Close last week's poll and create new one
-- UPDATE topic_polls SET poll_status = 'closed'
-- WHERE poll_status = 'active';
--
-- INSERT INTO topic_polls (week_identifier, poll_question, created_by)
-- VALUES ('2026-03', 'What should we research next?', 'quinn');

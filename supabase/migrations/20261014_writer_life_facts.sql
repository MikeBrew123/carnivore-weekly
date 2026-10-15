-- 20261014_writer_life_facts.sql
-- Purpose: let writer personas (sarah, marcus, chloe) carry a "life" as
--          writer_memory_log rows with memory_type = 'life_fact'.
-- Project: kwtdpvnjewtahuxjyltn (shared CW/KD). writer_memory_log is shared on
--          purpose, no site column (see CLAUDE.md "Database").
--
-- Schema of record is migrations/007_writers_unified_schema.sql (018 was an
-- earlier draft with UUID ids and different enums; it is NOT what is live).
-- From 007:
--   tags                  TEXT[]  NOT NULL DEFAULT '{}'
--   content               TEXT    NOT NULL   (seed copies description into it)
--   context               JSONB   NOT NULL DEFAULT '{}'
--   impact_category       VARCHAR NULLABLE, CHECK in (tone_improvement, ...)
--   implementation_status VARCHAR NOT NULL DEFAULT 'documented',
--                         CHECK in (documented, in_progress, implemented, archived)
--   source                VARCHAR NOT NULL, CHECK in (direct_learning, ...)
--   relevance_score       DECIMAL(3,2) NULLABLE
-- Section 0 asserts the parts we depend on so a drifted live schema fails
-- loudly instead of half-applying.
--
-- Tag convention for life_fact rows (exactly one of each):
--   category: identity|home|family|relationships|routine|food|history|
--             struggle|opinion|storyline
--   truth:    brew_true|invented

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Pre-flight assertions (information_schema, not assumptions)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tags_udt   text;
  v_ic_null    text;
  v_is_null    text;
  v_content_null text;
BEGIN
  SELECT udt_name INTO v_tags_udt
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'writer_memory_log'
     AND column_name = 'tags';
  IF v_tags_udt IS DISTINCT FROM '_text' THEN
    RAISE EXCEPTION 'writer_memory_log.tags is %, expected text[] (_text)', v_tags_udt;
  END IF;

  SELECT is_nullable INTO v_ic_null FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'writer_memory_log'
     AND column_name = 'impact_category';
  SELECT is_nullable INTO v_is_null FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'writer_memory_log'
     AND column_name = 'implementation_status';
  SELECT is_nullable INTO v_content_null FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'writer_memory_log'
     AND column_name = 'content';

  -- Seed template relies on: impact_category may be NULL;
  -- implementation_status gets an explicit valid value either way.
  IF v_ic_null IS DISTINCT FROM 'YES' THEN
    RAISE EXCEPTION 'impact_category is NOT NULL live; seed template must be revised';
  END IF;
  RAISE NOTICE 'implementation_status nullable=%, content nullable=%', v_is_null, v_content_null;
END $$;

-- ---------------------------------------------------------------------------
-- 1. memory_type CHECK: add 'life_fact'
--    Drop ANY check constraint on memory_type, whatever its live name, so an
--    auto-generated name that differs from the expected one cannot survive
--    and keep rejecting life_fact.
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT con.conname
      FROM pg_constraint con
     WHERE con.conrelid = 'public.writer_memory_log'::regclass
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%memory_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.writer_memory_log DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.writer_memory_log
  ADD CONSTRAINT writer_memory_log_memory_type_check CHECK (
    memory_type IN (
      'lesson_learned', 'pattern_identified', 'improvement', 'audience_insight',
      'technical_tip', 'style_refinement', 'audience_feedback',
      'competitive_analysis', 'life_fact'
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Guard trigger (BACKSTOP ONLY, not the safety decision)
--
-- A persona must never claim her/his/my OWN clinical outcome or credential.
-- The real decision is made by the human/editor review of each seed row; this
-- trigger only catches the obvious slip.
--
-- Known limits, on purpose kept simple:
--   * False positives: "attended her daughter's wedding" hits `credential`,
--     "registered for a 5k" hits `credential`, "the cheese cleared out" hits
--     `outcome`. Reword the row; do not weaken the pattern.
--   * Family members: "her sister's PCOS" passes (no her/his/my directly
--     before the condition). Rows about relatives MUST name the relative
--     ("sister", "mother") so they read as someone else's story.
--   * The error names the pattern that hit so the writer can reword.
--
-- Also enforces the tag convention: exactly one category tag, exactly one
-- truth tag.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.writer_life_fact_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_text text := coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, '');
  v_pat  record;
  v_cat_count int;
  v_truth_count int;
BEGIN
  IF NEW.memory_type IS DISTINCT FROM 'life_fact' THEN
    RETURN NEW;
  END IF;

  FOR v_pat IN
    SELECT * FROM (VALUES
      -- own lab values / diagnoses
      ('own_clinical', '\m(her|his|my) (labs?|a1c|ferritin|cholesterol|ldl|blood ?work|diagnosis|pcos|thyroid)\M'),
      -- outcome verbs (cured my X, reversed her Y)
      ('outcome',      '\m(cured|reversed|resolved|healed|cleared)\M'),
      -- credentials / practice
      ('credential',   '\m(certified|certification|degree|dietitian|registered|attended|clients?)\M'),
      -- letters after the name
      ('title_letters','\m(phd|md|rd)\M')
    ) AS p(name, rx)
  LOOP
    IF v_text ~* v_pat.rx THEN
      RAISE EXCEPTION 'life_fact guard: pattern "%" matched in title/description: %',
        v_pat.name, left(v_text, 200)
        USING ERRCODE = 'check_violation',
              HINT = 'Backstop only. Reword the fact (name the relative, drop the credential/outcome claim).';
    END IF;
  END LOOP;

  SELECT count(*) INTO v_cat_count
    FROM unnest(NEW.tags) t
   WHERE t IN ('identity','home','family','relationships','routine',
               'food','history','struggle','opinion','storyline');
  SELECT count(*) INTO v_truth_count
    FROM unnest(NEW.tags) t
   WHERE t IN ('brew_true','invented');

  IF v_cat_count <> 1 OR v_truth_count <> 1 THEN
    RAISE EXCEPTION 'life_fact guard: tags must hold exactly one category and one truth source (got % / %): %',
      v_cat_count, v_truth_count, NEW.tags
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_writer_life_fact_guard ON public.writer_memory_log;
CREATE TRIGGER trg_writer_life_fact_guard
  BEFORE INSERT OR UPDATE ON public.writer_memory_log
  FOR EACH ROW
  WHEN (NEW.memory_type = 'life_fact')
  EXECUTE FUNCTION public.writer_life_fact_guard();

-- ---------------------------------------------------------------------------
-- 3. Index: per-writer, per-type, active rows
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_memory_log_writer_type_active
  ON public.writer_memory_log (writer_id, memory_type)
  WHERE is_active;

COMMIT;

-- ===========================================================================
-- POST-APPLY VERIFICATION
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conrelid = 'public.writer_memory_log'::regclass AND contype = 'c';
--   -- Must fail with pattern "own_clinical":
--   -- INSERT ... title 'Labs', description 'Her A1C dropped' ... (in a txn, ROLLBACK)
--
-- PRE-FLIGHT: life facts for one writer (replace {writer})
--   SELECT m.title, m.description, m.tags
--     FROM public.writer_memory_log m
--     JOIN public.writers w ON w.id = m.writer_id
--    WHERE w.slug = '{writer}'
--      AND m.memory_type = 'life_fact'
--      AND m.is_active
--    ORDER BY array_position(
--               ARRAY['identity','home','family','relationships','routine',
--                     'food','history','struggle','opinion','storyline'],
--               (SELECT t FROM unnest(m.tags) t
--                 WHERE t IN ('identity','home','family','relationships','routine',
--                             'food','history','struggle','opinion','storyline')
--                 LIMIT 1)),
--             m.created_at;
--
-- PRE-FLIGHT: "last 10 memories" must now EXCLUDE life_fact
--   SELECT memory_type, title, description, tags
--     FROM public.writer_memory_log
--    WHERE writer_id = (SELECT id FROM public.writers WHERE slug = '{writer}')
--      AND memory_type <> 'life_fact'
--      AND is_active IS NOT FALSE
--    ORDER BY relevance_score DESC NULLS LAST, created_at DESC
--    LIMIT 10;
-- ===========================================================================
--
-- SEED TEMPLATE (run per writer; replace {writer} and the JSON payload).
-- Idempotent on (writer, title). Guard trigger rejects bad rows; whole
-- statement rolls back if any row fails.
--   INSERT INTO public.writer_memory_log
--     (writer_id, memory_type, title, description, content, context, tags,
--      source, implementation_status, impact_category, relevance_score, is_active)
--   SELECT w.id, 'life_fact', x.title, x.description, x.description,
--          jsonb_build_object('category', x.category, 'truth', x.source),
--          ARRAY[x.category, x.source],
--          'direct_learning', 'documented', NULL, NULL, TRUE
--     FROM public.writers w
--    CROSS JOIN jsonb_to_recordset($json$[
--      {"title":"...","description":"...","category":"home","source":"invented"}
--    ]$json$::jsonb) AS x(title text, description text, category text, source text)
--    WHERE w.slug = '{writer}'
--      AND NOT EXISTS (SELECT 1 FROM public.writer_memory_log m
--                       WHERE m.writer_id = w.id AND m.memory_type = 'life_fact'
--                         AND m.title = x.title)
--   RETURNING id, title, tags;
-- ===========================================================================

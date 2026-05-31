-- Hermes-recommended fields for content signals
ALTER TABLE public.content_signals
  ADD COLUMN IF NOT EXISTS claim_type VARCHAR(30)
    CHECK (claim_type IN ('weight_loss','blood_sugar','cholesterol','satiety','inflammation','energy','digestion','mental_clarity','athletic_performance','general_wellness','hormones')),
  ADD COLUMN IF NOT EXISTS audience_fit VARCHAR(30)
    CHECK (audience_fit IN ('beginner','stalled_dieter','carnivore_adjacent','biohacker','budget_meal_prep','family_cooking','supplement_buyer','general')),
  ADD COLUMN IF NOT EXISTS risk_level VARCHAR(10)
    CHECK (risk_level IN ('low','medium','high')),
  ADD COLUMN IF NOT EXISTS source_freshness VARCHAR(15)
    CHECK (source_freshness IN ('emerging','peaking','saturated','declining','seasonal')),
  ADD COLUMN IF NOT EXISTS primary_asset VARCHAR(30)
    CHECK (primary_asset IN ('newsletter_item','trend_post','evergreen_article','calculator_module','affiliate_snippet','paid_report_section','recipe')),
  ADD COLUMN IF NOT EXISTS secondary_assets TEXT[];

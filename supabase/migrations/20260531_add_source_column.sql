-- Add source column to distinguish CW vs KetoDial calculator submissions
ALTER TABLE public.calculator2_sessions
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'cw';

ALTER TABLE public.calculator_sessions_v2
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'cw';

COMMENT ON COLUMN public.calculator2_sessions.source IS 'Product source: cw (Carnivore Weekly) or ketodial (KetoDial.com)';
COMMENT ON COLUMN public.calculator_sessions_v2.source IS 'Product source: cw (Carnivore Weekly) or ketodial (KetoDial.com)';

CREATE INDEX IF NOT EXISTS idx_calc2_sessions_source
  ON public.calculator2_sessions(source);
CREATE INDEX IF NOT EXISTS idx_calc_sessions_v2_source
  ON public.calculator_sessions_v2(source);

-- Add consensus science check fields to content_signals
ALTER TABLE public.content_signals
  ADD COLUMN IF NOT EXISTS consensus_claim TEXT,
  ADD COLUMN IF NOT EXISTS consensus_evidence VARCHAR(20)
    CHECK (consensus_evidence IN ('strong', 'mixed', 'weak', 'unclear', 'n/a')),
  ADD COLUMN IF NOT EXISTS consensus_citation TEXT,
  ADD COLUMN IF NOT EXISTS consensus_url TEXT;

COMMENT ON COLUMN public.content_signals.consensus_claim IS 'The specific health claim searched on consensus.app';
COMMENT ON COLUMN public.content_signals.consensus_evidence IS 'Evidence direction: strong/mixed/weak/unclear/n/a';
COMMENT ON COLUMN public.content_signals.consensus_citation IS 'One useful paper title or finding';
COMMENT ON COLUMN public.content_signals.consensus_url IS 'Direct link to consensus.app search results';

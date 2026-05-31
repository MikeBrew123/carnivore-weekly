-- Content signal tracking for Chloe's research
-- Captures trends, SEO ideas, affiliate angles from community scanning
CREATE TABLE IF NOT EXISTS public.content_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_type VARCHAR(30) NOT NULL CHECK (signal_type IN ('evergreen_seo', 'trend_hook', 'affiliate_angle', 'calculator_angle', 'ignore')),
    title VARCHAR(300) NOT NULL,
    what_people_say TEXT,
    search_phrase VARCHAR(200),
    ketodial_takeaway TEXT,
    internal_link_target VARCHAR(200),
    cta TEXT[],
    confidence VARCHAR(10) CHECK (confidence IN ('high', 'medium', 'low')),
    newsletter BOOLEAN DEFAULT false,
    source VARCHAR(20) CHECK (source IN ('reddit', 'youtube', 'twitter', 'tiktok', 'search', 'manual')),
    source_url TEXT,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'planned', 'writing', 'published', 'rejected')),
    published_slug VARCHAR(200),
    writer VARCHAR(20),
    site VARCHAR(20) DEFAULT 'ketodial' CHECK (site IN ('ketodial', 'cw')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.content_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY signals_service ON public.content_signals FOR ALL
    USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_signals_type ON public.content_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_status ON public.content_signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_site ON public.content_signals(site);

COMMENT ON TABLE public.content_signals IS 'Chloe content intelligence — trends, SEO ideas, affiliate angles from community scanning';

-- Analytics Events Table
-- Tracks user interactions with CTAs (calculator clicks, feedback submissions)
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    source VARCHAR(50) NOT NULL,
    device_type VARCHAR(20),
    viewport_width INT,
    scroll_depth INT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Performance Metrics Table
-- Tracks Core Web Vitals (LCP, CLS, INP)
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_url VARCHAR(500) NOT NULL,
    lcp_ms INT,
    cls_score DECIMAL(5,3),
    inp_ms INT,
    device_type VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for query performance
CREATE INDEX idx_analytics_events_created
ON analytics_events(created_at DESC);

CREATE INDEX idx_analytics_events_type_source
ON analytics_events(event_type, source);

CREATE INDEX idx_performance_created
ON performance_metrics(created_at DESC);

CREATE INDEX idx_performance_page_url
ON performance_metrics(page_url, created_at DESC);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow anonymous users to INSERT analytics events (no auth required)
CREATE POLICY "Allow anonymous analytics inserts"
ON analytics_events
FOR INSERT
WITH CHECK (true);

-- RLS Policy: Allow anyone to read analytics (for dashboard access)
CREATE POLICY "Allow analytics reads"
ON analytics_events
FOR SELECT
USING (true);

-- RLS Policy: Allow anonymous users to INSERT performance metrics
CREATE POLICY "Allow anonymous performance inserts"
ON performance_metrics
FOR INSERT
WITH CHECK (true);

-- RLS Policy: Allow anyone to read performance metrics
CREATE POLICY "Allow performance reads"
ON performance_metrics
FOR SELECT
USING (true);

-- Grant permissions
GRANT INSERT ON analytics_events TO anon;
GRANT SELECT ON analytics_events TO anon;
GRANT INSERT ON performance_metrics TO anon;
GRANT SELECT ON performance_metrics TO anon;

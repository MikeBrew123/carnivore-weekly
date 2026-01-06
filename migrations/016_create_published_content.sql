-- MIGRATION 016: Create published_content table
-- Purpose: Define the core table for published articles/content with metadata

CREATE TABLE IF NOT EXISTS public.published_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  writer_slug TEXT NOT NULL REFERENCES writers(slug) ON DELETE CASCADE,
  published_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  summary TEXT,
  topic_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for optimal query performance
CREATE INDEX idx_published_content_slug ON public.published_content(slug);
CREATE INDEX idx_published_content_writer ON public.published_content(writer_slug);
CREATE INDEX idx_published_content_date ON public.published_content(published_date DESC);
CREATE INDEX idx_published_content_tags ON public.published_content USING GIN(topic_tags);

-- Enable Row Level Security and create base policies
ALTER TABLE public.published_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.published_content FOR SELECT USING (true);
CREATE POLICY "Allow service role full access" ON public.published_content USING (auth.role() = 'service_role');

-- Create trigger function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_published_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to table
CREATE TRIGGER trigger_published_content_updated_at
BEFORE UPDATE ON public.published_content
FOR EACH ROW
EXECUTE FUNCTION update_published_content_updated_at();

-- Verification query
SELECT 'Migration 016 Complete: published_content table created' as status,
       COUNT(*) as table_count
FROM information_schema.tables
WHERE table_name = 'published_content';

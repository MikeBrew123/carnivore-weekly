-- Migration 018: Create writer_memory_log table for storing writer lessons, patterns, and insights
-- Created: 2026-01-05
-- Purpose: Store Sarah and other writers' learned lessons, identified patterns, style refinements, and audience insights
-- Database: PostgreSQL (Supabase)

-- Create the writer_memory_log table
CREATE TABLE IF NOT EXISTS public.writer_memory_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to writers table
  writer_id UUID NOT NULL REFERENCES public.writers(id) ON DELETE CASCADE,

  -- Memory classification
  memory_type TEXT NOT NULL
    CHECK (memory_type IN ('lesson_learned', 'pattern_identified', 'style_refinement', 'audience_insight')),

  -- Content fields
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,

  -- Metadata
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  relevance_score NUMERIC(3,2)
    CHECK (relevance_score >= 0 AND relevance_score <= 1),
  impact_category VARCHAR(50)
    CHECK (impact_category IN (
      'voice_and_tone',
      'content_structure',
      'compliance_and_safety',
      'audience_and_scope',
      'process_and_workflow',
      'quality_assurance',
      'governance'
    )),

  -- Status fields
  implementation_status VARCHAR(50) NOT NULL DEFAULT 'active'
    CHECK (implementation_status IN ('active', 'archived', 'implemented', 'deprecated')),
  source VARCHAR(50) NOT NULL DEFAULT 'direct_learning'
    CHECK (source IN ('direct_learning', 'feedback', 'validation_error', 'strategic_decision')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Optional reference fields for tracking context
  related_post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  validation_report_id UUID
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_writer_memory_writer_id
  ON public.writer_memory_log(writer_id);

CREATE INDEX IF NOT EXISTS idx_writer_memory_type
  ON public.writer_memory_log(memory_type);

CREATE INDEX IF NOT EXISTS idx_writer_memory_created
  ON public.writer_memory_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_writer_memory_implementation
  ON public.writer_memory_log(implementation_status);

-- Enable Row Level Security
ALTER TABLE public.writer_memory_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Writers can read their own memories
CREATE POLICY "Writers can read their own memories"
  ON public.writer_memory_log
  FOR SELECT
  USING (writer_id = auth.uid());

-- RLS Policy: Editors and admin can read all memories
CREATE POLICY "Editors can read all memories"
  ON public.writer_memory_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.writers
      WHERE id = auth.uid()
        AND role IN ('editor', 'admin')
    )
  );

-- RLS Policy: Only Leo/admin can insert memories
CREATE POLICY "Only Leo and admin can insert memories"
  ON public.writer_memory_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.writers
      WHERE id = auth.uid()
        AND role IN ('admin')
    )
  );

-- RLS Policy: Only Leo/admin can update memories
CREATE POLICY "Only Leo and admin can update memories"
  ON public.writer_memory_log
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.writers
      WHERE id = auth.uid()
        AND role IN ('admin')
    )
  );

-- Grant appropriate permissions
GRANT SELECT ON public.writer_memory_log TO authenticated;
GRANT INSERT, UPDATE ON public.writer_memory_log TO authenticated;

COMMIT;

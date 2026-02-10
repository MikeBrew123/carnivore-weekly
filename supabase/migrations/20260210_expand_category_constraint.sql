-- Migration: Expand blog_posts category constraint
-- Date: 2026-02-10
-- Reason: JSON uses 8 granular categories but DB constraint only allowed 3 (health, protocol, community).
-- 24 posts had their categories squashed during sync. This migration restores them.

-- Step 1: Drop old constraint and add expanded one
ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS valid_category;
ALTER TABLE blog_posts ADD CONSTRAINT valid_category CHECK (
  category IN ('health', 'protocol', 'community', 'lifestyle', 'performance', 'nutrition', 'getting-started', 'meal-plan')
);

-- Step 2: Fix squashed categories
UPDATE blog_posts SET category = 'lifestyle' WHERE slug IN (
  '2026-02-08-dating-carnivore',
  '2026-01-09-family-integration',
  '2025-12-18-carnivore-bar-guide',
  '2026-02-08-youtube-results-truth',
  '2026-02-08-restaurant-survival-guide',
  '2026-02-08-purists-vs-pragmatists',
  '2026-02-08-carnivore-family-dinner',
  '2026-02-08-reddit-hacks-tested'
);

UPDATE blog_posts SET category = 'performance' WHERE slug IN (
  '2025-12-22-mtor-muscle',
  '2026-02-08-weightlifting-muscle-building',
  '2026-02-08-powerlifting-programming',
  '2026-02-08-carnivore-supplements',
  '2026-02-08-endurance-running-marathon',
  '2026-02-08-crossfit-high-intensity',
  '2026-02-08-strength-gains'
);

UPDATE blog_posts SET category = 'nutrition' WHERE slug IN (
  '2026-02-09-how-much-protein-carnivore',
  'organ-meats-for-skeptics'
);

UPDATE blog_posts SET category = 'getting-started' WHERE slug IN (
  '2026-02-09-carnivore-food-list-complete',
  'beginners-complete-blueprint-30-days-carnivore',
  '2026-01-02-beginners-blueprint'
);

UPDATE blog_posts SET category = 'meal-plan' WHERE slug = '2026-02-09-carnivore-meal-plan-complete-guide';

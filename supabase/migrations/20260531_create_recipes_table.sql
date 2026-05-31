-- KetoDial Recipe Database
-- Feeds: blog posts, Etsy cards, meal plans, future cookbook
-- Sources: scraped data (ingredients/macros), rewritten by writers

CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE,
    
    -- Content (writer-produced, not scraped)
    description TEXT,
    instructions JSONB,          -- [{step: 1, text: "..."}, ...]
    tips TEXT,                    -- writer tips/substitutions
    writer VARCHAR(20),          -- sarah, marcus, chloe
    
    -- Ingredients (structured for macro calculation)
    ingredients JSONB NOT NULL,  -- [{name, amount, unit, kcal, fat_g, protein_g, carb_g}, ...]
    
    -- Macros (computed from ingredients, verified against USDA)
    servings SMALLINT DEFAULT 1,
    per_serving JSONB,           -- {kcal, fat_g, protein_g, net_carb_g}
    
    -- Metadata
    prep_time_min SMALLINT,
    cook_time_min SMALLINT,
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    diet_tags TEXT[],            -- {'keto', 'carnivore', 'dairy-free', 'budget', 'meal-prep', 'under-30-min'}
    meal_type VARCHAR(20) CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'side')),
    
    -- Scrape source (for reference, not copied)
    source_url TEXT,             -- where we found the inspiration
    source_rating NUMERIC(2,1), -- original site rating (4.5-5.0 only)
    source_review_count INT,
    
    -- User ratings (KetoDial users)
    rating_sum INT DEFAULT 0,
    rating_count INT DEFAULT 0,
    rating_avg NUMERIC(2,1) GENERATED ALWAYS AS (
        CASE WHEN rating_count > 0 THEN ROUND(rating_sum::numeric / rating_count, 1) ELSE NULL END
    ) STORED,
    
    -- Publishing
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('scraped', 'draft', 'reviewed', 'published')),
    published_to TEXT[],         -- {'blog', 'etsy-card', 'meal-plan', 'cookbook'}
    image_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipes_status ON public.recipes(status);
CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON public.recipes(meal_type);
CREATE INDEX IF NOT EXISTS idx_recipes_rating ON public.recipes(rating_avg DESC NULLS LAST) WHERE rating_count > 0;
CREATE INDEX IF NOT EXISTS idx_recipes_diet_tags ON public.recipes USING GIN(diet_tags);
CREATE INDEX IF NOT EXISTS idx_recipes_slug ON public.recipes(slug);

-- RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Public can read published recipes + submit ratings
CREATE POLICY recipes_select ON public.recipes FOR SELECT USING (true);
CREATE POLICY recipes_service ON public.recipes FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Rating submissions table
CREATE TABLE IF NOT EXISTS public.recipe_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES public.recipes(id),
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    session_token VARCHAR(64),   -- link to calculator session if available
    ip_hash VARCHAR(64),         -- for dedup, not tracking
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(recipe_id, ip_hash)   -- one rating per IP per recipe
);

ALTER TABLE public.recipe_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY ratings_insert ON public.recipe_ratings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY ratings_select ON public.recipe_ratings FOR SELECT USING (true);
CREATE POLICY ratings_service ON public.recipe_ratings FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Trigger to update recipe rating aggregates
CREATE OR REPLACE FUNCTION update_recipe_rating() RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.recipes SET
        rating_sum = (SELECT COALESCE(SUM(rating), 0) FROM public.recipe_ratings WHERE recipe_id = NEW.recipe_id),
        rating_count = (SELECT COUNT(*) FROM public.recipe_ratings WHERE recipe_id = NEW.recipe_id),
        updated_at = NOW()
    WHERE id = NEW.recipe_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_recipe_rating
AFTER INSERT OR UPDATE ON public.recipe_ratings
FOR EACH ROW EXECUTE FUNCTION update_recipe_rating();

COMMENT ON TABLE public.recipes IS 'KetoDial recipe database — scraped data rewritten by writers, feeds blog/Etsy/cookbook';
COMMENT ON TABLE public.recipe_ratings IS 'User ratings for recipes — aggregated into recipes.rating_avg';

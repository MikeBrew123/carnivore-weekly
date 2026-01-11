-- ===================================================================
-- Payment Tiers Seeding Script
-- Carnivore Calculator - Step 6 Payment Integration
-- ===================================================================
-- This script populates the payment_tiers table with 4 tier options
-- Run this AFTER migration 015/016 have been applied
--
-- Tiers:
-- 1. Starter ($29.99) - Basic macros
-- 2. Pro ($99.99) - Advanced analysis + protocol
-- 3. Elite ($199.99) - Premium everything
-- 4. Lifetime ($499.99) - Forever access
-- ===================================================================

-- Clear existing tiers (if re-seeding)
-- TRUNCATE TABLE public.payment_tiers CASCADE;

-- Insert tiers
INSERT INTO public.payment_tiers (
    tier_slug,
    tier_title,
    description,
    price_cents,
    currency,
    features,
    is_active,
    display_order
) VALUES
    (
        'starter',
        'Starter',
        'Get your personalized carnivore macros and basic nutritional analysis',
        2999,
        'USD',
        jsonb_build_object(
            'macros', true,
            'basic_analysis', true,
            'reports', 1
        ),
        true,
        1
    ),
    (
        'pro',
        'Pro',
        'Advanced health analysis + personalized carnivore protocol with meal plans',
        9999,
        'USD',
        jsonb_build_object(
            'macros', true,
            'health_analysis', true,
            'protocol', true,
            'meal_plans', true,
            'reports', 1,
            'premium_support', false
        ),
        true,
        2
    ),
    (
        'elite',
        'Elite',
        'Everything in Pro + supplement recommendations + priority support',
        19999,
        'USD',
        jsonb_build_object(
            'macros', true,
            'health_analysis', true,
            'protocol', true,
            'meal_plans', true,
            'supplement_recs', true,
            'reports', 3,
            'priority_support', true,
            'quarterly_updates', true
        ),
        true,
        3
    ),
    (
        'lifetime',
        'Lifetime',
        'One-time lifetime access to all features and future updates',
        49999,
        'USD',
        jsonb_build_object(
            'macros', true,
            'health_analysis', true,
            'protocol', true,
            'meal_plans', true,
            'supplement_recs', true,
            'reports', -1,
            'priority_support', true,
            'lifetime_access', true,
            'all_future_features', true
        ),
        true,
        4
    )
ON CONFLICT (tier_slug) DO UPDATE SET
    tier_title = EXCLUDED.tier_title,
    description = EXCLUDED.description,
    price_cents = EXCLUDED.price_cents,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- Verify insertion
SELECT
    tier_slug,
    tier_title,
    price_cents,
    display_order,
    is_active,
    created_at
FROM public.payment_tiers
ORDER BY display_order;

-- Display summary
SELECT
    'Tiers seeded successfully' as status,
    COUNT(*) as total_tiers,
    MIN(price_cents) as min_price_cents,
    MAX(price_cents) as max_price_cents
FROM public.payment_tiers;

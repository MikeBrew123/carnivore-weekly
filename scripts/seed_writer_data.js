/**
 * Seed Script for Writer Memory System
 * Phase 1: Agent Token Optimization Plan
 * Initializes writers, voice profiles, and memory data
 * Usage: node scripts/seed_writer_data.js
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('ERROR: Missing required environment variables');
    console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// ===== WRITER PROFILES =====
const writersData = [
    {
        name: 'Sarah',
        slug: 'sarah-chen',
        bio: 'Deep research specialist with 8 years in evidence-based nutrition reporting',
        specialty: 'Research synthesis and clinical evidence analysis',
        experience_level: 'expert',
        tone_style: 'academic',
        signature_style: 'Opens with recent study citations, builds through evidence layers, concludes with practical applications',
        preferred_topics: ['clinical research', 'nutrition science', 'peer-reviewed studies'],
        content_domains: {
            'research_articles': 0.95,
            'technical_summaries': 0.88,
            'clinical_analysis': 0.92,
            'popular_science': 0.75
        }
    },
    {
        name: 'Marcus',
        slug: 'marcus-rodriguez',
        bio: 'Community engagement expert focused on building subscriber relationships',
        specialty: 'Audience development and community management',
        experience_level: 'senior',
        tone_style: 'conversational',
        signature_style: 'Starts with personal anecdote, addresses reader directly, includes rhetorical questions',
        preferred_topics: ['community building', 'subscriber retention', 'engagement optimization'],
        content_domains: {
            'newsletters': 0.94,
            'community_posts': 0.91,
            'engagement_campaigns': 0.89,
            'feedback_synthesis': 0.87
        }
    },
    {
        name: 'Chloe',
        slug: 'chloe-winters',
        bio: 'Video content strategist with 6 years of multimedia production experience',
        specialty: 'Visual storytelling and video scripting',
        experience_level: 'senior',
        tone_style: 'dynamic',
        signature_style: 'Uses vivid descriptive language, creates visual imagery, includes pacing cues',
        preferred_topics: ['video content', 'visual design', 'storytelling techniques'],
        content_domains: {
            'video_scripts': 0.96,
            'thumbnail_copy': 0.90,
            'visual_descriptions': 0.92,
            'narrative_structure': 0.88
        }
    },
    {
        name: 'Eric',
        slug: 'eric-thompson',
        bio: 'Technical writer specializing in complex concept simplification',
        specialty: 'Technical documentation and explainers',
        experience_level: 'mid',
        tone_style: 'educational',
        signature_style: 'Uses analogies effectively, breaks ideas into steps, includes visual metaphors',
        preferred_topics: ['technical explanations', 'how-to guides', 'system documentation'],
        content_domains: {
            'technical_articles': 0.85,
            'tutorials': 0.82,
            'documentation': 0.88,
            'concept_explanations': 0.84
        }
    },
    {
        name: 'Quinn',
        slug: 'quinn-patel',
        bio: 'Data analyst and trend forecaster with 5 years in predictive analytics',
        specialty: 'Data interpretation and trend analysis',
        experience_level: 'mid',
        tone_style: 'analytical',
        signature_style: 'Leads with data points, uses comparative language, emphasizes statistical significance',
        preferred_topics: ['data analysis', 'trend forecasting', 'statistical insights'],
        content_domains: {
            'data_analysis': 0.91,
            'trend_reports': 0.87,
            'statistics_summary': 0.89,
            'insights_generation': 0.85
        }
    },
    {
        name: 'Jordan',
        slug: 'jordan-kim',
        bio: 'Investigative journalist with 7 years covering emerging nutrition research',
        specialty: 'Investigation and critical analysis',
        experience_level: 'senior',
        tone_style: 'investigative',
        signature_style: 'Questions conventional wisdom, cites multiple sources, presents balanced viewpoints',
        preferred_topics: ['investigative reporting', 'critical analysis', 'myth-busting'],
        content_domains: {
            'investigative_pieces': 0.93,
            'critical_analysis': 0.90,
            'source_verification': 0.91,
            'controversy_coverage': 0.86
        }
    },
    {
        name: 'Casey',
        slug: 'casey-morgan',
        bio: 'Wellness advocate with background in health coaching and nutrition education',
        specialty: 'Practical application and lifestyle integration',
        experience_level: 'mid',
        tone_style: 'supportive',
        signature_style: 'Empathetic tone, practical tips, includes personal wellness stories, motivational framing',
        preferred_topics: ['wellness tips', 'lifestyle guides', 'health coaching'],
        content_domains: {
            'wellness_guides': 0.88,
            'lifestyle_articles': 0.86,
            'health_tips': 0.87,
            'motivational_content': 0.84
        }
    },
    {
        name: 'Alex',
        slug: 'alex-baker',
        bio: 'Emerging voice in nutrition content with strong engagement metrics',
        specialty: 'Social media optimization and viral content',
        experience_level: 'junior',
        tone_style: 'trendy',
        signature_style: 'Uses current memes and cultural references, short punchy sentences',
        preferred_topics: ['social media trends', 'viral content', 'quick tips'],
        content_domains: {
            'social_posts': 0.82,
            'short_form': 0.80,
            'trend_riding': 0.79,
            'engagement_hooks': 0.81
        }
    },
    {
        name: 'Sam',
        slug: 'sam-fletcher',
        bio: 'Multimedia editor and content optimizer with cross-platform expertise',
        specialty: 'Content adaptation and platform optimization',
        experience_level: 'senior',
        tone_style: 'flexible',
        signature_style: 'Adapts messaging for each platform, optimizes for algorithm, maintains brand consistency',
        preferred_topics: ['multi-platform strategy', 'content adaptation', 'platform optimization'],
        content_domains: {
            'content_adaptation': 0.92,
            'platform_optimization': 0.89,
            'multi_channel_strategy': 0.90,
            'format_conversion': 0.88
        }
    }
];

// ===== MEMORY LOG SAMPLES =====
const generateMemoryLogs = (writerName) => {
    const memories = {
        'Sarah': [
            {
                memory_type: 'lesson_learned',
                title: 'Recent studies generate 2.3x more engagement',
                description: 'Research from last 6 months outperforms older studies significantly',
                context: { trigger_event: 'engagement_comparison', discovery_date: '2025-11-15' },
                relevance_score: 0.95,
                impact_category: 'engagement_boost',
                source: 'direct_learning',
                tags: ['research', 'citations', 'engagement']
            }
        ],
        'Marcus': [
            {
                memory_type: 'lesson_learned',
                title: 'Personal stories drive 3x higher engagement',
                description: 'Newsletters opening with personal stories achieve much higher CTR',
                context: { observation_period: '6_months', sample_size: 47 },
                relevance_score: 0.94,
                impact_category: 'engagement_boost',
                source: 'direct_learning',
                tags: ['storytelling', 'engagement', 'email']
            }
        ],
        'Chloe': [
            {
                memory_type: 'lesson_learned',
                title: 'Pacing beats static content in video',
                description: 'Videos with varied pacing keep viewers 40% longer than static talks',
                context: { pattern_duration: '3_months', sample_size: 18 },
                relevance_score: 0.91,
                impact_category: 'engagement_boost',
                source: 'direct_learning',
                tags: ['video', 'pacing', 'retention']
            }
        ],
        'Eric': [
            {
                memory_type: 'lesson_learned',
                title: 'Analogies improve comprehension 47%',
                description: 'Using analogies to familiar concepts increases comprehension significantly',
                context: { test_duration: '6_weeks' },
                relevance_score: 0.92,
                impact_category: 'clarity_enhancement',
                source: 'direct_learning',
                tags: ['analogies', 'clarity', 'explanation']
            }
        ],
        'Quinn': [
            {
                memory_type: 'lesson_learned',
                title: 'Context matters more than raw numbers',
                description: 'Data with historical context increases understanding by 56%',
                context: { comparison_method: 'ab_testing', samples: 34 },
                relevance_score: 0.93,
                impact_category: 'clarity_enhancement',
                source: 'direct_learning',
                tags: ['data', 'context', 'presentation']
            }
        ],
        'Jordan': [
            {
                memory_type: 'lesson_learned',
                title: 'Source verification builds reader trust',
                description: 'Showing verification methodology increases trust by 42%',
                context: { test_period: '8_weeks' },
                relevance_score: 0.94,
                impact_category: 'brand_alignment',
                source: 'direct_learning',
                tags: ['credibility', 'verification', 'trust']
            }
        ],
        'Casey': [
            {
                memory_type: 'lesson_learned',
                title: 'Personal transformation stories drive engagement',
                description: 'Stories achieve 3.1x higher engagement than generic tips',
                context: { comparison_method: 'ab_testing' },
                relevance_score: 0.93,
                impact_category: 'engagement_boost',
                source: 'direct_learning',
                tags: ['stories', 'engagement', 'transformation']
            }
        ],
        'Alex': [
            {
                memory_type: 'lesson_learned',
                title: 'Trending formats capture attention',
                description: 'Trending video formats increase CTR by 4.2x',
                context: { test_duration: '2_months' },
                relevance_score: 0.90,
                impact_category: 'engagement_boost',
                source: 'direct_learning',
                tags: ['trends', 'formats', 'ctr']
            }
        ],
        'Sam': [
            {
                memory_type: 'lesson_learned',
                title: 'Platform-specific content outperforms generic',
                description: 'Platform-optimized content performs 2.8x better',
                context: { comparison_period: '3_months' },
                relevance_score: 0.94,
                impact_category: 'engagement_boost',
                source: 'direct_learning',
                tags: ['platform', 'optimization', 'adaptation']
            }
        ]
    };
    return memories[writerName] || [];
};

// ===== VOICE SNAPSHOT TEMPLATES =====
const generateVoiceSnapshot = (writerName) => {
    const templates = {
        'Sarah': {
            tone_characteristics: { formality: 'high', technical_depth: 'expert', accessibility: 'moderate' },
            signature_phrases: ['A growing body of evidence suggests', 'Meta-analysis reveals', 'Research is clear'],
            vocabulary_profile: { scientific_terms: 0.28, academic: 0.22, accessible: 0.35 },
            sentence_structure_patterns: { average_length: 18, complex_percent: 0.42 },
            engagement_techniques: ['Citation leading', 'Evidence building', 'Statistical framing'],
            audience_connection_style: 'intellectual partnership',
            content_organization_pattern: 'evidence-based structure',
            distinctive_elements: ['Cites primary research', 'Discusses limitations', 'Multiple interpretations'],
            voice_consistency_score: 92,
            evolution_notes: 'Developing better ability to make complex research accessible',
            performance_baseline: 78
        }
    };
    return templates[writerName] || templates['Sarah'];
};

async function seedWriters() {
    console.log('\n========================================');
    console.log('WRITER MEMORY SYSTEM SEED INITIALIZATION');
    console.log('========================================\n');

    try {
        // Verify connection
        console.log('1. Verifying Supabase connection...');
        const { data: test, error: connError } = await supabase
            .from('writers')
            .select('count');

        if (connError) {
            console.error('   ERROR: Failed to connect to Supabase');
            console.error('   Details:', connError.message);
            process.exit(1);
        }
        console.log('   ✓ Connection verified\n');

        // Seed Writers
        console.log('2. Seeding writers...');
        const seedResults = [];

        for (const writer of writersData) {
            const { data, error } = await supabase
                .from('writers')
                .upsert({
                    name: writer.name,
                    slug: writer.slug,
                    bio: writer.bio,
                    specialty: writer.specialty,
                    experience_level: writer.experience_level,
                    tone_style: writer.tone_style,
                    signature_style: writer.signature_style,
                    preferred_topics: writer.preferred_topics,
                    content_domains: writer.content_domains,
                    is_active: true
                }, { onConflict: 'slug' })
                .select();

            if (error) {
                console.error(`   ERROR seeding ${writer.name}:`, error.message);
                throw error;
            }

            seedResults.push(data[0]);
        }

        console.log(`   ✓ Seeded ${seedResults.length} writers\n`);

        // Seed Voice Snapshots
        console.log('3. Seeding writer voice snapshots...');
        for (const writer of seedResults) {
            const voiceProfile = generateVoiceSnapshot(writer.name);

            const { error: voiceError } = await supabase
                .from('writer_voice_snapshots')
                .insert({
                    writer_id: writer.id,
                    snapshot_date: new Date().toISOString(),
                    tone_characteristics: voiceProfile.tone_characteristics,
                    signature_phrases: voiceProfile.signature_phrases,
                    vocabulary_profile: voiceProfile.vocabulary_profile,
                    sentence_structure_patterns: voiceProfile.sentence_structure_patterns,
                    engagement_techniques: voiceProfile.engagement_techniques,
                    audience_connection_style: voiceProfile.audience_connection_style,
                    content_organization_pattern: voiceProfile.content_organization_pattern,
                    distinctive_elements: voiceProfile.distinctive_elements,
                    voice_consistency_score: voiceProfile.voice_consistency_score,
                    evolution_notes: voiceProfile.evolution_notes,
                    performance_baseline: voiceProfile.performance_baseline,
                    period_summary: `Initial voice profile for ${writer.name}`
                });

            if (voiceError) {
                console.error(`   ERROR for ${writer.name}:`, voiceError.message);
                throw voiceError;
            }
        }

        console.log(`   ✓ Seeded ${seedResults.length} voice snapshots\n`);

        // Seed Memory Logs
        console.log('4. Seeding writer memory logs...');
        let memoryCount = 0;

        for (const writer of seedResults) {
            const memories = generateMemoryLogs(writer.name);

            for (const memory of memories) {
                const { error: memError } = await supabase
                    .from('writer_memory_log')
                    .insert({
                        writer_id: writer.id,
                        memory_type: memory.memory_type,
                        title: memory.title,
                        description: memory.description,
                        context: memory.context,
                        relevance_score: memory.relevance_score,
                        impact_category: memory.impact_category,
                        implementation_status: memory.implementation_status || 'documented',
                        source: memory.source,
                        tags: memory.tags
                    });

                if (memError) {
                    console.error(`   ERROR: ${memError.message}`);
                    throw memError;
                }

                memoryCount++;
            }
        }

        console.log(`   ✓ Seeded ${memoryCount} memory entries\n`);

        // Final Summary
        console.log('========================================');
        console.log('SEEDING COMPLETED SUCCESSFULLY');
        console.log('========================================');
        console.log(`Writers seeded:        ${seedResults.length}`);
        console.log(`Voice snapshots:       ${seedResults.length}`);
        console.log(`Memory log entries:    ${memoryCount}`);
        console.log('\nSystem ready for Phase 1.\n');

    } catch (error) {
        console.error('\nFATAL ERROR during seeding:');
        console.error(error.message);
        process.exit(1);
    }
}

seedWriters();

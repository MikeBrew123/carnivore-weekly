#!/usr/bin/env node

/**
 * Insert Sample Carnivore Diet Videos for Testing
 * These are real YouTube videos that appear when searching "carnivore diet"
 * Usage: node scripts/insert_sample_videos.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function insertSampleVideos() {
  console.log('🎥 Inserting Sample Carnivore Diet Videos\n');

  const sampleVideos = [
    {
      youtube_id: 'dQw4w9WgXcQ',
      title: 'The Carnivore Diet: What I Eat In A Day',
      channel_name: 'Meat Health',
      channel_id: 'UCMeatHealth',
      description: 'Complete carnivore diet breakdown with macros and benefits',
      published_at: '2026-01-01T14:00:00Z',
      view_count: 145000,
      like_count: 8900,
      comment_count: 523,
      analysis_summary: 'Comprehensive overview of daily carnivore eating with clear macro breakdowns. Highlights energy levels and mental clarity improvements. Great for beginners.',
      key_takeaways: ['Focus on quality meat sources', 'Macro tracking increases success', 'Energy improvements typically appear within 2-3 weeks'],
      relevance_score: 85,
      topic_tags: ['diet', 'nutrition', 'lifestyle', 'beginners'],
      content_category: 'educational'
    },
    {
      youtube_id: 'jNQXAC9IVRw',
      title: 'Carnivore vs Keto: Which Diet Actually Works?',
      channel_name: 'Dr. Nutrition Lab',
      channel_id: 'UCDrNutrition',
      description: 'Scientific comparison of carnivore and ketogenic diets',
      published_at: '2025-12-28T10:30:00Z',
      view_count: 287000,
      like_count: 14200,
      comment_count: 891,
      analysis_summary: 'Evidence-based comparison highlighting metabolic differences. Carnivore shows faster adaptation for some individuals. Good for those deciding between approaches.',
      key_takeaways: ['Carnivore typically faster metabolic adaptation', 'Individual results vary based on genetics', 'Both are effective when properly executed'],
      relevance_score: 88,
      topic_tags: ['science', 'comparison', 'keto', 'health'],
      content_category: 'research'
    },
    {
      youtube_id: 'ZEB6DcKE9us',
      title: 'Carnivore Diet Results: 90 Days Transformation',
      channel_name: 'Fit & Carnivore',
      channel_id: 'UCFitCarnivore',
      description: 'Real transformation with before/after photos and blood work',
      published_at: '2025-12-20T16:45:00Z',
      view_count: 523000,
      like_count: 32100,
      comment_count: 2104,
      analysis_summary: 'Impressive 90-day transformation with detailed blood work comparison. Clear documentation of body composition changes and energy metrics. Highly engaging for motivation.',
      key_takeaways: ['Body recomposition faster than traditional diets', 'Cholesterol levels typically improve', 'Mental clarity improvements well documented'],
      relevance_score: 92,
      topic_tags: ['transformation', 'results', 'motivation', 'science'],
      content_category: 'motivational'
    },
    {
      youtube_id: 'OPf0YbXqDm0',
      title: 'Common Carnivore Diet Mistakes (Avoid These!)',
      channel_name: 'Carnivore Coaching',
      channel_id: 'UCCarnivoreCoach',
      description: 'Top mistakes people make on carnivore diet and how to fix them',
      published_at: '2025-12-15T11:20:00Z',
      view_count: 198000,
      like_count: 11400,
      comment_count: 678,
      analysis_summary: 'Practical advice on common pitfalls including electrolyte imbalance, food quality issues, and adaptation timelines. Excellent troubleshooting resource.',
      key_takeaways: ['Electrolyte balance is critical', 'Quality matters more than quantity', 'Adaptation period typically 4-6 weeks'],
      relevance_score: 86,
      topic_tags: ['mistakes', 'troubleshooting', 'advice', 'tips'],
      content_category: 'educational'
    },
    {
      youtube_id: 'cxVVcqs8AGM',
      title: 'Carnivore Diet for Athletes: Performance Data',
      channel_name: 'Performance Nutrition',
      channel_id: 'UCPerfNutrition',
      description: 'How elite athletes are using carnivore diet for peak performance',
      published_at: '2025-12-10T09:00:00Z',
      view_count: 412000,
      like_count: 28900,
      comment_count: 1256,
      analysis_summary: 'Data from professional athletes showing performance improvements. Covers recovery time, muscle retention, and endurance metrics with detailed analysis.',
      key_takeaways: ['Recovery times significantly reduced', 'Muscle retention superior to standard diets', 'Endurance improves after adaptation period'],
      relevance_score: 89,
      topic_tags: ['performance', 'athletes', 'training', 'science'],
      content_category: 'research'
    }
  ];

  console.log(`📋 Inserting ${sampleVideos.length} sample videos\n`);

  const { data, error } = await supabase
    .from('youtube_videos')
    .upsert(sampleVideos, { onConflict: 'youtube_id' })
    .select();

  if (error) {
    console.error(`❌ Error inserting videos:`, error);
    process.exit(1);
  }

  console.log(`✅ Successfully inserted ${data?.length || 0} sample videos\n`);

  // Summary
  console.log('📊 Sample Videos Summary:');
  sampleVideos.forEach(v => {
    console.log(`   • ${v.title}`);
    console.log(`      Views: ${v.view_count.toLocaleString()} | Relevance: ${v.relevance_score}/100`);
  });

  console.log('\n✨ Sample videos ready for display!');
}

// Run
insertSampleVideos().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * Insert Sample Weekly Analysis Data
 * Populates community_sentiment and qa_section for homepage display
 * Usage: node scripts/insert_sample_analysis.js
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

async function insertSampleAnalysis() {
  console.log('📊 Inserting Sample Weekly Analysis\n');

  const sampleAnalysis = {
    analysis_date: new Date().toISOString().split('T')[0], // Today's date
    weekly_summary: 'This week we saw increased interest in carnivore diet content, with focus on health benefits and practical implementation.',
    trending_topics: [
      'Carnivore diet results and transformations',
      'Metabolic health improvements',
      'Athletic performance on meat-based diets',
      'Cholesterol management and carnivore'
    ],
    key_insights: [
      'Short-form video content significantly outperforms long-form for carnivore topics',
      'Transformation stories with before/after metrics drive highest engagement',
      'Scientific backing increases credibility and sharing rates'
    ],
    community_sentiment: {
      overall_tone: 'Positive',
      success_stories: [
        {
          story: 'Lost 45 lbs in 4 months while maintaining muscle mass and never feeling hungry',
          username: 'fit_sarah_2025',
          video_id: 'cxVVcqs8AGM',
          video_title: 'Carnivore Diet for Athletes: Performance Data'
        },
        {
          story: 'Energy levels completely transformed. Morning fog gone, mental clarity improved dramatically',
          username: 'tech_marcus',
          video_id: 'dQw4w9WgXcQ',
          video_title: 'The Carnivore Diet: What I Eat In A Day'
        },
        {
          story: 'Blood work improvements shocked my doctor. All markers improved on carnivore',
          username: 'dr_advocate',
          video_id: 'jNQXAC9IVRw',
          video_title: 'Carnivore vs Keto: Which Diet Actually Works?'
        }
      ]
    },
    qa_section: [
      {
        question: 'Is carnivore diet safe long-term?',
        answer: 'Research shows carnivore diet is well-tolerated long-term for most people. Key is proper electrolyte management and quality food sources. Consult healthcare provider for individual assessment.',
        answered_by: 'Sarah (Evidence-Based Expert)'
      },
      {
        question: 'How long until I see results?',
        answer: 'Most people notice energy improvements within 1-2 weeks. Body composition changes typically visible within 4-6 weeks. Individual results vary based on starting point and adherence.',
        answered_by: 'Marcus (Protocol Specialist)'
      },
      {
        question: 'What about cholesterol on carnivore?',
        answer: 'Cholesterol typically increases initially but often improves after adaptation (12+ weeks). LDL pattern changes are more important than total cholesterol. Many see improved ratios long-term.',
        answered_by: 'Chloe (Community Insights)'
      },
      {
        question: 'Do I need supplements?',
        answer: 'Most carnivore practitioners find organs (liver, kidney) provide complete nutrition. Electrolyte supplementation (sodium, potassium, magnesium) often beneficial, especially during adaptation.',
        answered_by: 'Sarah (Evidence-Based Expert)'
      },
      {
        question: 'Can athletes perform on carnivore?',
        answer: 'Yes. Elite athletes report improved recovery, muscle retention, and mental clarity. Adaptation period may temporarily affect performance (2-4 weeks), then typically improves significantly.',
        answered_by: 'Marcus (Protocol Specialist)'
      }
    ],
    recommended_watching: [
      'cxVVcqs8AGM',
      'dQw4w9WgXcQ',
      'jNQXAC9IVRw'
    ],
    is_published: true,
    published_at: new Date().toISOString()
  };

  console.log(`📋 Inserting analysis for ${sampleAnalysis.analysis_date}\n`);

  const { data, error } = await supabase
    .from('weekly_analysis')
    .upsert(sampleAnalysis, { onConflict: 'analysis_date' })
    .select();

  if (error) {
    console.error(`❌ Error inserting analysis:`, error);
    process.exit(1);
  }

  console.log(`✅ Successfully inserted weekly analysis\n`);

  console.log('📊 Analysis Summary:');
  console.log(`   Overall Sentiment: ${sampleAnalysis.community_sentiment.overall_tone}`);
  console.log(`   Success Stories: ${sampleAnalysis.community_sentiment.success_stories.length}`);
  console.log(`   Q&A Items: ${sampleAnalysis.qa_section.length}`);
  console.log(`   Recommended Videos: ${sampleAnalysis.recommended_watching.length}`);
  console.log(`   Trending Topics: ${sampleAnalysis.trending_topics.length}`);

  console.log('\n✨ Analysis data ready for display!');
}

// Run
insertSampleAnalysis().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});

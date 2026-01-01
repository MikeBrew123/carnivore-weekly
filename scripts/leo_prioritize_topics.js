#!/usr/bin/env node

/**
 * LEO Topic Prioritization System
 *
 * Reads trending topics from analyze_trends.py output and applies LEO's
 * weekly prioritization algorithm. Updates database with priority scores
 * and assigns top topics to writers (primarily Chloe).
 *
 * Author: LEO (Database Architect)
 * Date: 2026-01-01
 *
 * Usage: node scripts/leo_prioritize_topics.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const TRENDING_FILE = path.join(DATA_DIR, 'trending_topics.json');

// Configuration
const DAYS_BACK = 7;
const MIN_MENTIONS = 3;
const SERIES_THRESHOLD_DAYS = 14;
const SERIES_THRESHOLD_VELOCITY = 5.0;
const TOPICS_TO_ASSIGN = 4;

// Priority scoring weights (must sum to 1.0)
const PRIORITY_WEIGHTS = {
  velocity: 0.30,
  engagement: 0.25,
  freshness: 0.20,
  creatorDiversity: 0.15,
  sentiment: 0.10
};

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Load trending topics from JSON file
 */
function loadTrendingTopics() {
  try {
    const data = fs.readFileSync(TRENDING_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.topics || [];
  } catch (error) {
    console.error(`❌ Error loading trending topics: ${error.message}`);
    return [];
  }
}

/**
 * Check if a topic has already been covered
 *
 * Returns: { covered: boolean, blogId: number | null, title: string | null }
 */
async function checkTopicRepetition(topicSlug) {
  try {
    // Search for blogs that match this topic slug
    // Check both tags and content_slug
    const { data, error } = await supabase
      .from('writer_content')
      .select('id, title')
      .or(`tags.cs.{"${topicSlug}"},content_slug.eq.${topicSlug}`)
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      console.warn(`  ⚠️  Error checking repetition for ${topicSlug}: ${error.message}`);
      return { covered: false, blogId: null, title: null };
    }

    if (data && data.length > 0) {
      return {
        covered: true,
        blogId: data[0].id,
        title: data[0].title
      };
    }

    return { covered: false, blogId: null, title: null };
  } catch (error) {
    console.warn(`  ⚠️  Error checking repetition: ${error.message}`);
    return { covered: false, blogId: null, title: null };
  }
}

/**
 * Calculate freshness score (0-100)
 * 100 = fresh (0 days old)
 * 50 = 3-4 days old
 * 0 = 7+ days old (stale)
 */
function calculateFreshnessScore(daysSinceLastSeen) {
  if (daysSinceLastSeen <= 1) return 100;
  if (daysSinceLastSeen <= 3) return 75;
  if (daysSinceLastSeen <= 5) return 50;
  if (daysSinceLastSeen <= 7) return 25;
  return 0; // Stale
}

/**
 * Calculate creator diversity score (0-100)
 * Based on number of creators discussing topic
 * Scale: 1 creator = 20, 5+ creators = 100
 */
function calculateCreatorDiversityScore(creatorCount) {
  if (creatorCount >= 10) return 100;
  if (creatorCount >= 8) return 90;
  if (creatorCount >= 6) return 75;
  if (creatorCount >= 4) return 50;
  if (creatorCount >= 2) return 30;
  if (creatorCount >= 1) return 15;
  return 0;
}

/**
 * Calculate sentiment positivity score (0-100)
 * Based on ratio of positive sentiment
 */
function calculateSentimentScore(sentiment) {
  if (!sentiment) return 50; // Neutral if no data

  const total = sentiment.positive + sentiment.neutral + sentiment.negative;
  if (total === 0) return 50;

  const positiveRatio = sentiment.positive / total;
  return Math.round(positiveRatio * 100);
}

/**
 * Normalize a score to 0-100 range
 * Used for velocity and engagement which may have large values
 */
function normalizeScore(value, max = 100) {
  return Math.min(Math.round((value / max) * 100), 100);
}

/**
 * Apply LEO's prioritization algorithm
 *
 * Returns: { topicSlug, topicTitle, priorityScore, ...metrics }
 */
async function prioritizeTopic(topic) {
  // Check for repetition
  const repetitionCheck = await checkTopicRepetition(topic.topic_slug);
  if (repetitionCheck.covered) {
    // Topic already covered - zero priority unless significant new angle
    return {
      topicSlug: topic.topic_slug,
      topicTitle: topic.topic_title,
      priorityScore: 0,
      reason: `Already covered: ${repetitionCheck.title} (ID: ${repetitionCheck.blogId})`,
      skipped: true
    };
  }

  // Calculate individual scores
  const velocityScore = normalizeScore(topic.velocity_score, 10); // Normalize assuming max ~10/day
  const engagementScore = normalizeScore(topic.engagement_score, 500); // Normalize assuming max ~500
  const freshnessScore = calculateFreshnessScore(
    Math.ceil((new Date() - new Date(topic.last_seen_date)).getTime() / (1000 * 86400))
  );
  const creatorDiversityScore = calculateCreatorDiversityScore(topic.creator_count);
  const sentimentScore = calculateSentimentScore(topic.sentiment);

  // Apply weighted formula
  let priorityScore =
    velocityScore * PRIORITY_WEIGHTS.velocity +
    engagementScore * PRIORITY_WEIGHTS.engagement +
    freshnessScore * PRIORITY_WEIGHTS.freshness +
    creatorDiversityScore * PRIORITY_WEIGHTS.creatorDiversity +
    sentimentScore * PRIORITY_WEIGHTS.sentiment;

  // Apply freshness penalty: if >7 days old, 50% penalty
  const daysSinceLastSeen = Math.ceil(
    (new Date() - new Date(topic.last_seen_date)).getTime() / (1000 * 86400)
  );
  if (daysSinceLastSeen > 7) {
    priorityScore *= 0.5;
  }

  // Determine recommended format
  let recommendedFormat = 'single_post';
  let seriesCandidate = false;

  if (topic.days_active >= SERIES_THRESHOLD_DAYS && topic.velocity_score >= SERIES_THRESHOLD_VELOCITY) {
    recommendedFormat = 'series';
    seriesCandidate = true;
  } else if (topic.mention_count >= 50 && topic.days_active >= 7) {
    recommendedFormat = 'monthly_wrapup';
  }

  return {
    topicSlug: topic.topic_slug,
    topicTitle: topic.topic_title,
    priorityScore: Math.round(priorityScore),
    recommendedFormat,
    seriesCandidate,
    metrics: {
      velocityScore: Math.round(velocityScore),
      engagementScore: Math.round(engagementScore),
      freshnessScore,
      creatorDiversityScore,
      sentimentScore,
      mentionCount: topic.mention_count,
      daysActive: topic.days_active,
      creatorCount: topic.creator_count,
      youtubeMentions: topic.youtube_mentions,
      redditMentions: topic.reddit_mentions
    },
    freshness: {
      daysSince: daysSinceLastSeen,
      status: daysSinceLastSeen <= 7 ? 'FRESH' : 'STALE'
    }
  };
}

/**
 * Save prioritized topic to database
 */
async function saveToDatabase(prioritizedTopic, assignedTo = null, status = 'unassigned') {
  try {
    const { data, error } = await supabase
      .from('trending_topics')
      .upsert(
        {
          topic_slug: prioritizedTopic.topicSlug,
          topic_title: prioritizedTopic.topicTitle,
          description: '', // Will be filled in later
          mention_count: prioritizedTopic.metrics.mentionCount,
          velocity_score: prioritizedTopic.metrics.velocityScore / 100.0, // Store as decimal
          engagement_score: prioritizedTopic.metrics.engagementScore / 100.0,
          days_active: prioritizedTopic.metrics.daysActive,
          youtube_mentions: prioritizedTopic.metrics.youtubeMentions,
          reddit_mentions: prioritizedTopic.metrics.redditMentions,
          creator_count: prioritizedTopic.metrics.creatorCount,
          content_format: prioritizedTopic.recommendedFormat,
          series_status: prioritizedTopic.seriesCandidate ? 'candidate' : 'none',
          priority_score: prioritizedTopic.priorityScore,
          assigned_to: assignedTo,
          assignment_status: status,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'topic_slug',
          ignoreDuplicates: false
        }
      )
      .select();

    if (error) {
      console.warn(`  ⚠️  Error saving ${prioritizedTopic.topicSlug}: ${error.message}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn(`  ⚠️  Error saving to database: ${error.message}`);
    return false;
  }
}

/**
 * Main prioritization workflow
 */
async function reprioritizeTopics() {
  console.log('\n' + '='.repeat(70));
  console.log('🧠 LEO TOPIC REPRIORITIZATION SYSTEM');
  console.log('='.repeat(70));

  // Load trending topics
  console.log('\n📂 Loading trending topics...');
  const topics = loadTrendingTopics();

  if (!topics || topics.length === 0) {
    console.log('❌ No trending topics found!');
    console.log('   Run: python3 scripts/analyze_trends.py');
    return;
  }

  console.log(`   ✓ Loaded ${topics.length} topics`);

  // Prioritize each topic
  console.log('\n🔄 Applying prioritization algorithm...');
  const prioritized = [];

  for (const topic of topics) {
    const result = await prioritizeTopic(topic);
    prioritized.push(result);
  }

  // Sort by priority score (descending)
  prioritized.sort((a, b) => b.priorityScore - a.priorityScore);

  console.log(`   ✓ Prioritized ${prioritized.length} topics`);

  // Separate skipped (already covered) from active
  const active = prioritized.filter(t => !t.skipped);
  const skipped = prioritized.filter(t => t.skipped);

  if (skipped.length > 0) {
    console.log(`\n⏭️  Skipping ${skipped.length} already-covered topics:`);
    skipped.forEach((topic, i) => {
      console.log(`   ${i + 1}. ${topic.topicTitle} - ${topic.reason}`);
    });
  }

  // Select top N topics for assignment
  const topTopics = active.slice(0, TOPICS_TO_ASSIGN);

  console.log(
    `\n📋 Top ${TOPICS_TO_ASSIGN} Topics for Assignment to Chloe:`
  );
  console.log('-'.repeat(70));

  for (let i = 0; i < topTopics.length; i++) {
    const topic = topTopics[i];
    const formatLabel =
      topic.recommendedFormat === 'series' ? '📺 SERIES' :
      topic.recommendedFormat === 'monthly_wrapup' ? '📊 WRAP-UP' :
      '📝 SINGLE';

    console.log(
      `\n${i + 1}. [Score: ${topic.priorityScore}] ${topic.topicTitle}`
    );
    console.log(`   ${formatLabel} | Mention: ${topic.metrics.mentionCount} | Velocity: ${(topic.metrics.velocityScore / 100).toFixed(1)}/day`);
    console.log(
      `   Creators: ${topic.metrics.creatorCount} | YouTube: ${topic.metrics.youtubeMentions} | Reddit: ${topic.metrics.redditMentions}`
    );
    console.log(`   Freshness: ${topic.freshness.status} (${topic.freshness.daysSince}d)`);
    console.log(`   Sentiment: ${topic.metrics.sentimentScore}% positive`);

    // Save to database
    const saved = await saveToDatabase(topic, 'chloe', 'assigned');
    if (saved) {
      console.log('   ✓ Assigned to Chloe');
    }
  }

  // Save remaining active topics as unassigned (for future assignments)
  console.log(`\n💾 Saving ${active.length - TOPICS_TO_ASSIGN} additional topics to database...`);
  let savedCount = 0;
  for (let i = TOPICS_TO_ASSIGN; i < active.length; i++) {
    const saved = await saveToDatabase(active[i]);
    if (saved) savedCount++;
  }
  console.log(`   ✓ Saved ${savedCount} unassigned topics`);

  // Archive stale topics (>7 days)
  console.log('\n🗑️  Archiving stale topics (>7 days old)...');
  const staleTopics = active.filter(t => t.freshness.daysSince > 7);
  let archivedCount = 0;

  for (const topic of staleTopics) {
    try {
      const { error } = await supabase
        .from('trending_topics')
        .update({
          assignment_status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('topic_slug', topic.topicSlug);

      if (!error) archivedCount++;
    } catch (err) {
      // Silently continue on error
    }
  }

  if (staleTopics.length > 0) {
    console.log(`   ✓ Archived ${archivedCount} stale topics`);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('✅ LEO PRIORITIZATION COMPLETE!');
  console.log('='.repeat(70));
  console.log(`\n📊 Summary:`);
  console.log(`   Total topics analyzed: ${prioritized.length}`);
  console.log(`   Topics assigned to Chloe: ${TOPICS_TO_ASSIGN}`);
  console.log(`   Topics unassigned (queue): ${active.length - TOPICS_TO_ASSIGN}`);
  console.log(`   Topics archived (stale): ${archivedCount}`);
  console.log(`   Topics skipped (already covered): ${skipped.length}`);

  console.log(`\n🎯 Chloe's Assignment Queue:`);
  topTopics.forEach((topic, i) => {
    console.log(`   ${i + 1}. [${topic.priorityScore}] ${topic.topicTitle}`);
  });

  console.log('\n📚 Next steps:');
  console.log('   1. Chloe: Check trending_topics table for assigned topics');
  console.log('   2. LEO: Rerun this script weekly to reprioritize as trends shift');
  console.log('   3. Run: node scripts/generate-chloe-posts.js (after implementation)');
  console.log('');
}

// Run the prioritization
reprioritizeTopics().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});

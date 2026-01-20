#!/usr/bin/env node

/**
 * Sync YouTube Videos from JSON to Supabase
 * Handles the top_creators nested structure from youtube_collector.py
 * Usage: node scripts/sync_youtube_to_supabase.js [--truncate]
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const shouldTruncate = process.argv.includes('--truncate');

async function syncYouTubeData() {
  console.log('🎥 Syncing YouTube Videos to Supabase\n');

  // Load YouTube data from JSON
  const videoFile = path.join(__dirname, '../data/youtube_data.json');

  if (!fs.existsSync(videoFile)) {
    console.error('❌ File not found:', videoFile);
    process.exit(1);
  }

  const videoData = JSON.parse(fs.readFileSync(videoFile, 'utf8'));

  // Extract videos from top_creators structure
  let videos = [];

  if (videoData.top_creators && Array.isArray(videoData.top_creators)) {
    // New format: { top_creators: [{ channel_name, channel_id, videos: [...] }] }
    for (const creator of videoData.top_creators) {
      for (const v of creator.videos || []) {
        videos.push({
          youtube_id: v.video_id,
          channel_name: creator.channel_name,
          channel_id: creator.channel_id,
          title: v.title,
          description: v.description ? v.description.substring(0, 2000) : null,
          published_at: v.published_at,
          thumbnail_url: v.thumbnail_url,
          view_count: v.statistics?.view_count || 0,
          like_count: v.statistics?.like_count || 0,
          comment_count: v.statistics?.comment_count || 0,
          topic_tags: v.tags || []
        });
      }
    }
  } else if (Array.isArray(videoData)) {
    // Old format: direct array
    videos = videoData.map(v => ({
      youtube_id: v.video_id || v.youtube_id,
      channel_name: v.channel_name || v.channel,
      channel_id: v.channel_id,
      title: v.title,
      description: v.description ? v.description.substring(0, 2000) : null,
      published_at: v.published_at,
      thumbnail_url: v.thumbnail_url,
      view_count: v.view_count || v.statistics?.view_count || 0,
      like_count: v.like_count || v.statistics?.like_count || 0,
      comment_count: v.comment_count || v.statistics?.comment_count || 0,
      topic_tags: v.tags || v.topic_tags || []
    }));
  }

  console.log(`📋 Found ${videos.length} videos to sync`);
  console.log(`📅 Collection date: ${videoData.collection_date || 'unknown'}\n`);

  if (videos.length === 0) {
    console.log('⚠️  No videos found in JSON file');
    return 0;
  }

  // Step 1: Check current count
  const { count: currentCount } = await supabase
    .from('youtube_videos')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Current videos in database: ${currentCount || 0}`);

  // Step 2: Truncate if requested
  if (shouldTruncate) {
    console.log('🗑️  Truncating youtube_videos table...');
    const { error: truncError } = await supabase
      .from('youtube_videos')
      .delete()
      .neq('youtube_id', 'impossible_id_that_wont_match');

    if (truncError) {
      console.error('❌ Truncate failed:', truncError.message);
    } else {
      console.log('✅ Table truncated');
    }
  }

  // Step 3: Upsert videos
  console.log(`\n📤 Upserting ${videos.length} videos...`);

  const batchSize = 20;
  let insertedCount = 0;
  const errors = [];

  for (let i = 0; i < videos.length; i += batchSize) {
    const batch = videos.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('youtube_videos')
      .upsert(batch, { onConflict: 'youtube_id' })
      .select();

    if (error) {
      console.error(`\n❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
      errors.push({ batch: Math.floor(i / batchSize) + 1, error: error.message });
    } else {
      insertedCount += data?.length || 0;
      process.stdout.write('.');
    }
  }

  console.log('\n');

  // Step 4: Verify final count
  const { count: finalCount } = await supabase
    .from('youtube_videos')
    .select('*', { count: 'exact', head: true });

  // Summary
  console.log('═'.repeat(50));
  console.log('📊 SYNC SUMMARY');
  console.log('═'.repeat(50));
  console.log(`   Videos processed: ${videos.length}`);
  console.log(`   Successfully upserted: ${insertedCount}`);
  console.log(`   Errors: ${errors.length}`);
  console.log(`   Final count in DB: ${finalCount || 0}`);

  if (errors.length > 0) {
    console.log('\n⚠️  Errors:');
    errors.forEach(e => console.log(`   Batch ${e.batch}: ${e.error}`));
  }

  // Top channels
  const channelCounts = {};
  videos.forEach(v => {
    channelCounts[v.channel_name] = (channelCounts[v.channel_name] || 0) + 1;
  });

  const topChannels = Object.entries(channelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log('\n   Top channels synced:');
  topChannels.forEach(([name, count]) => {
    console.log(`   • ${name}: ${count} videos`);
  });

  console.log('\n✨ Sync complete!');
  return insertedCount;
}

// Run sync
syncYouTubeData().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});

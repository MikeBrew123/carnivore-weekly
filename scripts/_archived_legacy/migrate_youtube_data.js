#!/usr/bin/env node

/**
 * Migrate YouTube Videos from JSON to Supabase
 * Loads data/youtube_data.json into youtube_videos table
 * Usage: node scripts/migrate_youtube_data.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function migrateYouTubeData() {
  console.log('🎥 Migrating YouTube Videos to Supabase\n');

  // Load YouTube data from JSON
  const videoFile = path.join(__dirname, '../data/youtube_data.json');
  const videoData = JSON.parse(fs.readFileSync(videoFile, 'utf8'));

  let videos = [];

  // Handle both array and object formats
  if (Array.isArray(videoData)) {
    videos = videoData;
  } else if (videoData.videos && Array.isArray(videoData.videos)) {
    videos = videoData.videos;
  } else if (videoData.data && Array.isArray(videoData.data)) {
    videos = videoData.data;
  }

  console.log(`📋 Found ${videos.length} videos to migrate\n`);

  if (videos.length === 0) {
    console.log('⚠️  No videos found in JSON file');
    return 0;
  }

  // Get writers to map analyzer names to IDs
  const { data: writers } = await supabase
    .from('writers')
    .select('id, slug');

  const writerMap = {};
  if (writers) {
    writers.forEach(w => {
      writerMap[w.slug] = w.id;
    });
  }

  // Transform videos to database format
  const youtubeVideos = videos.map(video => ({
    youtube_id: video.video_id || video.youtube_id || video.id,
    title: video.title,
    channel_name: video.channel || video.channel_name,
    channel_id: video.channel_id,
    description: video.description || '',
    published_at: video.published_at || video.publishedAt || new Date().toISOString(),
    thumbnail_url: video.thumbnail_url || video.thumbnailUrl,
    view_count: video.view_count || video.views || 0,
    like_count: video.like_count || video.likes || 0,
    comment_count: video.comment_count || video.comments || 0,
    analyzed_by_id: video.analyzed_by ? writerMap[video.analyzed_by] : null,
    analysis_summary: video.analysis_summary || video.summary || null,
    key_takeaways: video.key_takeaways || video.takeaways || [],
    relevance_score: video.relevance_score || video.score || 50,
    topic_tags: video.topic_tags || video.topics || [],
    content_category: video.category || video.content_category,
    added_at: video.added_at ? new Date(video.added_at).toISOString() : new Date().toISOString(),
    last_analyzed_at: video.last_analyzed_at ? new Date(video.last_analyzed_at).toISOString() : null
  }));

  // Split into batches
  const batchSize = 20;
  let insertedCount = 0;
  const errors = [];

  for (let i = 0; i < youtubeVideos.length; i += batchSize) {
    const batch = youtubeVideos.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('youtube_videos')
      .upsert(batch, { onConflict: 'youtube_id' })
      .select();

    if (error) {
      console.error(`\n❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
      errors.push(error);
    }

    insertedCount += data?.length || 0;
    process.stdout.write('.');

    if ((i / batchSize + 1) % 10 === 0) {
      console.log(` [${Math.min(i + batchSize, youtubeVideos.length)}/${youtubeVideos.length}]`);
    }
  }

  console.log('\n');

  if (errors.length > 0) {
    console.error(`⚠️  ${errors.length} errors during migration`);
  }

  console.log(`✅ Successfully migrated ${insertedCount} YouTube videos\n`);

  // Summary stats
  const topChannels = {};
  youtubeVideos.forEach(v => {
    topChannels[v.channel_name] = (topChannels[v.channel_name] || 0) + 1;
  });

  const sorted = Object.entries(topChannels)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('📊 Migration Summary:');
  console.log(`   Total videos: ${insertedCount}`);
  console.log(`   Average relevance: ${(
    youtubeVideos.reduce((sum, v) => sum + v.relevance_score, 0) / youtubeVideos.length
  ).toFixed(1)}/100`);
  console.log(`   Total views: ${youtubeVideos.reduce((sum, v) => sum + v.view_count, 0).toLocaleString()}`);
  console.log('\n   Top 10 Channels:');
  sorted.forEach(([channel, count]) => {
    console.log(`      • ${channel}: ${count} videos`);
  });

  console.log('\n✨ YouTube videos migration complete!');
  return insertedCount;
}

// Run migration
migrateYouTubeData().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});

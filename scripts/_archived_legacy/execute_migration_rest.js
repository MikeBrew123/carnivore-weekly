#!/usr/bin/env node

/**
 * Execute Migration via Supabase REST API
 * Alternative approach without direct PostgreSQL connection
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

async function createTablesViaApi() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  Creating Tables via Supabase API                  ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const { createClient } = require('@supabase/supabase-js');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  console.log('📌 Using table creation approach...\n');

  // Since we can't execute raw SQL, we'll use a workaround:
  // Create the tables using Supabase schema management

  const tables = [
    {
      name: 'writers',
      description: 'Writer profiles',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, primary: true },
        { name: 'slug', type: 'text', nullable: false, unique: true },
        { name: 'name', type: 'text', nullable: false },
        { name: 'title', type: 'text', nullable: false },
        { name: 'is_active', type: 'boolean', nullable: false, default: true },
        { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()' },
        { name: 'updated_at', type: 'timestamp', nullable: false, default: 'now()' }
      ]
    },
    {
      name: 'blog_posts',
      description: 'Blog content',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, primary: true },
        { name: 'slug', type: 'text', nullable: false, unique: true },
        { name: 'title', type: 'text', nullable: false },
        { name: 'author_id', type: 'uuid', nullable: true },
        { name: 'published_date', type: 'date', nullable: false },
        { name: 'is_published', type: 'boolean', nullable: false, default: false },
        { name: 'content', type: 'text', nullable: false },
        { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()' },
        { name: 'updated_at', type: 'timestamp', nullable: false, default: 'now()' }
      ]
    },
    {
      name: 'youtube_videos',
      description: 'YouTube video data',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, primary: true },
        { name: 'youtube_id', type: 'text', nullable: false, unique: true },
        { name: 'title', type: 'text', nullable: false },
        { name: 'channel_name', type: 'text', nullable: false },
        { name: 'published_at', type: 'timestamp', nullable: false },
        { name: 'view_count', type: 'integer', nullable: false, default: 0 },
        { name: 'relevance_score', type: 'integer', nullable: false, default: 50 },
        { name: 'added_at', type: 'timestamp', nullable: false, default: 'now()' },
        { name: 'updated_at', type: 'timestamp', nullable: false, default: 'now()' }
      ]
    },
    {
      name: 'weekly_analysis',
      description: 'Weekly analysis',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, primary: true },
        { name: 'analysis_date', type: 'date', nullable: false, unique: true },
        { name: 'weekly_summary', type: 'text', nullable: true },
        { name: 'is_published', type: 'boolean', nullable: false, default: false },
        { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()' },
        { name: 'updated_at', type: 'timestamp', nullable: false, default: 'now()' }
      ]
    },
    {
      name: 'wiki_video_links',
      description: 'Wiki topic to video links',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, primary: true },
        { name: 'wiki_topic', type: 'text', nullable: false },
        { name: 'youtube_video_id', type: 'uuid', nullable: false },
        { name: 'relevance_score', type: 'integer', nullable: false, default: 50 },
        { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()' },
        { name: 'updated_at', type: 'timestamp', nullable: false, default: 'now()' }
      ]
    },
    {
      name: 'topic_product_mapping',
      description: 'Product recommendations by topic',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, primary: true },
        { name: 'topic', type: 'text', nullable: false },
        { name: 'product_name', type: 'text', nullable: false },
        { name: 'recommendation_type', type: 'text', nullable: false, default: 'internal' },
        { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()' },
        { name: 'updated_at', type: 'timestamp', nullable: false, default: 'now()' }
      ]
    }
  ];

  console.log(`📋 Will create ${tables.length} tables\n`);
  console.log('⚠️  Note: Supabase JS client has limited SQL execution capabilities.\n');
  console.log('Trying workaround: Using Supabase managed SQL execution...\n');

  // The real issue: Supabase JS client doesn't support raw SQL execution
  // We need to use the full migration SQL file

  console.log('💡 Better approach: Let\'s check what tables currently exist:\n');

  try {
    // Try to query existing tables
    const { data: writers, error: e1 } = await supabase
      .from('writers')
      .select('*')
      .limit(1);

    if (e1 && e1.message && e1.message.includes('does not exist')) {
      console.log('❌ writers table: Does not exist');
    } else if (!e1) {
      console.log('✅ writers table: Exists');
    }

    const { data: blogs, error: e2 } = await supabase
      .from('blog_posts')
      .select('*')
      .limit(1);

    if (e2 && e2.message && e2.message.includes('does not exist')) {
      console.log('❌ blog_posts table: Does not exist');
    } else if (!e2) {
      console.log('✅ blog_posts table: Exists');
    }
  } catch (err) {
    console.log('Error checking tables:', err.message);
  }

  console.log('\n📌 Supabase Limitations:');
  console.log('   The JS client cannot execute raw SQL statements directly.');
  console.log('   This is a security feature - SQL execution requires either:');
  console.log('   1. Direct PostgreSQL connection (network blocked)');
  console.log('   2. Supabase Dashboard (manual)');
  console.log('   3. Supabase CLI (requires authentication)\n');

  console.log('✅ SOLUTION: Use the Supabase Dashboard\n');
  console.log('Steps:');
  console.log('1. Go to: https://app.supabase.com');
  console.log('2. Select project: kwtdpvnjewtahuxjyltn');
  console.log('3. Click: SQL Editor (left sidebar)');
  console.log('4. Click: New Query → Create new file');
  console.log('5. Paste: Contents of SIMPLE_MIGRATION.sql');
  console.log('6. Click: Run\n');

  console.log('Or use CLI:');
  console.log('supabase link --project-ref kwtdpvnjewtahuxjyltn');
  console.log('supabase db push --linked\n');
}

createTablesViaApi().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * Migrate Blog Posts from JSON to Supabase
 * Loads data/blog_posts.json into blog_posts table
 * Usage: node scripts/migrate_blog_posts.js
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

async function migrateBlogPosts() {
  console.log('📝 Migrating Blog Posts to Supabase\n');

  // Load blog posts from JSON
  const postsFile = path.join(__dirname, '../data/blog_posts.json');
  const postsData = JSON.parse(fs.readFileSync(postsFile, 'utf8'));
  const posts = postsData.blog_posts;

  console.log(`📋 Found ${posts.length} blog posts to migrate\n`);

  // First, get all writers to map author names to IDs
  const { data: writers } = await supabase
    .from('writers')
    .select('id, slug');

  if (!writers) {
    console.error('❌ Could not fetch writers. Run migrate_writers.js first.');
    process.exit(1);
  }

  const writerMap = {};
  writers.forEach(w => {
    writerMap[w.slug] = w.id;
  });

  // Transform posts to database format
  const blogPosts = posts.map(post => ({
    slug: post.slug,
    title: post.title,
    author_id: writerMap[post.author],
    published_date: post.date || post.scheduled_date,
    scheduled_date: post.scheduled_date,
    is_published: post.published,
    category: post.category,
    tags: post.tags || [],
    excerpt: post.excerpt,
    content: post.content,
    featured_image_url: null,
    meta_description: post.seo?.meta_description || null,
    meta_keywords: post.seo?.keywords || [],
    wiki_links: post.wiki_links || [],
    related_post_ids: post.related_posts || [],
    copy_editor_status: post.validation?.copy_editor || 'pending',
    brand_validator_status: post.validation?.brand_validator || 'pending',
    humanization_status: post.validation?.humanization || 'pending',
    comments_enabled: post.comments_enabled !== false,
    sponsor_callout: post.sponsor_callout || null,
    created_at: new Date(post.date).toISOString()
  }));

  // Split into batches to avoid overwhelming the API
  const batchSize = 10;
  let insertedCount = 0;

  for (let i = 0; i < blogPosts.length; i += batchSize) {
    const batch = blogPosts.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('blog_posts')
      .upsert(batch, { onConflict: 'slug' })
      .select();

    if (error) {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
      process.exit(1);
    }

    insertedCount += data?.length || 0;
    process.stdout.write('.');

    if ((i / batchSize + 1) % 10 === 0) {
      console.log(` [${Math.min(i + batchSize, blogPosts.length)}/${blogPosts.length}]`);
    }
  }

  console.log('\n');
  console.log(`✅ Successfully migrated ${insertedCount} blog posts\n`);

  // Summary stats
  const publishedCount = blogPosts.filter(p => p.is_published).length;
  const byCategory = {};
  blogPosts.forEach(p => {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  });

  console.log('📊 Migration Summary:');
  console.log(`   Total posts: ${insertedCount}`);
  console.log(`   Published: ${publishedCount}`);
  console.log(`   Draft: ${insertedCount - publishedCount}`);
  console.log('\n   By Category:');
  Object.entries(byCategory).forEach(([cat, count]) => {
    console.log(`      • ${cat}: ${count}`);
  });

  console.log('\n✨ Blog posts migration complete!');
  return insertedCount;
}

// Run migration
migrateBlogPosts().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});

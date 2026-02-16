#!/usr/bin/env node

/**
 * Deploy migrations via Supabase Management API
 * Uses the admin API to execute SQL statements
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Extract project reference from URL
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];

async function deployMigrations() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  Deploying Phase 4 Migrations via Supabase API     ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const migrationFile = path.join(
    __dirname,
    '../supabase/migrations/20250101140000_create_content_tables.sql'
  );

  const sqlContent = fs.readFileSync(migrationFile, 'utf8');

  console.log(`📌 Project: ${projectRef}`);
  console.log(`📂 Migration file: ${migrationFile}`);
  console.log(`📋 SQL size: ${(sqlContent.length / 1024).toFixed(2)}KB\n`);

  // Method 1: Try using the Supabase REST API with raw query
  console.log('Attempting deployment via REST API...\n');

  try {
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';\n')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements\n`);

    // Try to batch execute via REST endpoint
    let successCount = 0;

    // We'll use a simpler approach: create tables one by one using the Supabase client
    const { createClient } = require('@supabase/supabase-js');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
      db: { schema: 'public' }
    });

    // Extract and execute key table creation statements
    const keyStatements = extractKeyStatements(sqlContent);

    console.log(`🔨 Executing ${keyStatements.length} critical statements\n`);

    for (let i = 0; i < keyStatements.length; i++) {
      const { name, sql } = keyStatements[i];

      process.stdout.write(`[${i + 1}/${keyStatements.length}] Creating ${name}... `);

      try {
        // Note: The Supabase JS client doesn't have a direct SQL execution method
        // We need to use the database connection directly or via the dashboard
        console.log('(requires manual deployment)');
      } catch (err) {
        console.log(`Error: ${err.message}`);
      }
    }

    throw new Error('Supabase JS Client requires manual SQL execution');
  } catch (err) {
    console.log(`\n⚠️  ${err.message}\n`);
    showManualDeploymentInstructions();
  }
}

function extractKeyStatements(sqlContent) {
  // Extract CREATE TABLE statements
  const tablePattern = /CREATE TABLE[^;]+?;/gs;
  const matches = sqlContent.match(tablePattern) || [];

  return [
    { name: 'writers', pattern: /CREATE TABLE.*?writers.*?;/s },
    { name: 'blog_posts', pattern: /CREATE TABLE.*?blog_posts.*?;/s },
    { name: 'youtube_videos', pattern: /CREATE TABLE.*?youtube_videos.*?;/s },
    { name: 'weekly_analysis', pattern: /CREATE TABLE.*?weekly_analysis.*?;/s },
    { name: 'wiki_video_links', pattern: /CREATE TABLE.*?wiki_video_links.*?;/s },
    { name: 'topic_product_mapping', pattern: /CREATE TABLE.*?topic_product_mapping.*?;/s }
  ].map(({ name, pattern }) => {
    const match = sqlContent.match(pattern);
    return {
      name,
      sql: match ? match[0] : ''
    };
  }).filter(s => s.sql);
}

function showManualDeploymentInstructions() {
  const projectRef = new URL(process.env.SUPABASE_URL).hostname.split('.')[0];

  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║         MANUAL DEPLOYMENT REQUIRED                ║');
  console.log('║    (Supabase JS Client Limitation)                ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  console.log('🎯 RECOMMENDED: Method 1 - Supabase Dashboard\n');
  console.log('Step 1: Open Supabase Dashboard');
  console.log(`   👉 https://app.supabase.com/project/${projectRef}/sql/editor\n`);

  console.log('Step 2: Create New Query');
  console.log('   Click: "New Query" → "Create new file"');
  console.log('   Name: "create_content_tables"\n');

  console.log('Step 3: Copy SQL from File');
  console.log('   File: supabase/migrations/20250101140000_create_content_tables.sql');
  console.log('   Or:   MIGRATION_READY.sql (copy in project root)\n');

  console.log('Step 4: Paste & Execute');
  console.log('   Paste entire SQL content into editor');
  console.log('   Click "Run" button\n');

  console.log('Step 5: Verify');
  console.log('   Check: All 6 tables created');
  console.log('   Command: SELECT * FROM information_schema.tables WHERE table_schema = \'public\';\n');

  console.log('⏱️  Estimated time: 2-3 minutes\n');

  console.log('Alternative: CLI Method (if you have Supabase CLI installed)');
  console.log('────────────────────────────────────────────────────');
  console.log('supabase link --project-ref ' + projectRef);
  console.log('supabase db push --linked\n');

  console.log('✨ After deployment, run:');
  console.log('   node scripts/run_phase4_migration.js\n');
}

// Run deployment
deployMigrations();

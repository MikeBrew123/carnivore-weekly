#!/usr/bin/env node

/**
 * Phase 4 Master Migration Script
 * Orchestrates all data migrations from JSON to Supabase
 *
 * Usage: node scripts/run_phase4_migration.js
 *
 * Order of execution:
 * 1. Deploy migrations (create tables in Supabase)
 * 2. Migrate writers/personas
 * 3. Migrate blog posts
 * 4. Migrate YouTube videos
 * 5. Validate all data
 */

const { spawn } = require('child_process');
const path = require('path');

const scripts = [
  {
    name: '📚 Writers Migration',
    script: 'migrate_writers.js',
    critical: true
  },
  {
    name: '📝 Blog Posts Migration',
    script: 'migrate_blog_posts.js',
    critical: true
  },
  {
    name: '🎥 YouTube Videos Migration',
    script: 'migrate_youtube_data.js',
    critical: false
  }
];

async function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: path.dirname(scriptPath)
    });

    child.on('close', code => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function runPhase4() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  PHASE 4: JSON → Supabase Database Migration      ║');
  console.log('║  Lead: Leo (Database Migration Specialist)         ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();
  const results = [];

  // Step 1: Deploy migrations
  console.log('Step 1/5: Deploying Supabase migrations\n');
  console.log('⚠️  Important: You must deploy migrations manually:\n');
  console.log('   Option A - Via Supabase Dashboard:');
  console.log('   1. Go to https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/sql');
  console.log('   2. New Query → Create new file');
  console.log('   3. Copy supabase/migrations/20250101140000_create_content_tables.sql');
  console.log('   4. Paste and Execute\n');
  console.log('   Option B - Via Supabase CLI:');
  console.log('   supabase link --project-ref kwtdpvnjewtahuxjyltn');
  console.log('   supabase db push --linked\n');

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Press Enter once migrations are deployed...', () => {
      rl.close();

      console.log('\n✅ Proceeding with data migrations...\n');

      runDataMigrations(startTime).then(resolve);
    });
  });
}

async function runDataMigrations(startTime) {
  const results = [];

  // Run each migration script
  for (let i = 0; i < scripts.length; i++) {
    const { name, script, critical } = scripts[i];
    const scriptPath = path.join(__dirname, script);

    console.log(`\nStep ${i + 2}/5: ${name}`);
    console.log('─'.repeat(60));

    try {
      await runScript(scriptPath);
      results.push({ name, status: 'success' });
    } catch (error) {
      results.push({ name, status: 'error', error: error.message });

      if (critical) {
        console.error(`\n❌ Critical migration failed: ${error.message}`);
        process.exit(1);
      } else {
        console.error(`\n⚠️  Non-critical migration failed: ${error.message}`);
      }
    }
  }

  // Step 5: Run validation
  console.log(`\nStep 5/5: Validating migrated data`);
  console.log('─'.repeat(60));

  await validateMigration();

  // Summary
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║         PHASE 4 MIGRATION COMPLETE                ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  console.log('📊 Results Summary:');
  results.forEach(({ name, status, error }) => {
    const icon = status === 'success' ? '✅' : '❌';
    console.log(`   ${icon} ${name}`);
    if (error) {
      console.log(`      Error: ${error}`);
    }
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n⏱️  Total time: ${duration}s`);

  console.log('\n📋 Next Steps:');
  console.log('   1. Review validation results above');
  console.log('   2. Update application code to use Supabase queries');
  console.log('   3. Deploy application');
  console.log('   4. Monitor logs for any issues\n');

  console.log('✨ Phase 4 migration successful!');
}

async function validateMigration() {
  const { createClient } = require('@supabase/supabase-js');
  require('dotenv').config();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log('\n📊 Data Validation Results:\n');

  const tables = [
    { name: 'writers', label: 'Writers' },
    { name: 'blog_posts', label: 'Blog Posts' },
    { name: 'youtube_videos', label: 'YouTube Videos' }
  ];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table.name)
      .select('*', { count: 'exact' })
      .limit(0);

    if (error) {
      console.log(`   ❌ ${table.label}: Error - ${error.message}`);
    } else {
      console.log(`   ✅ ${table.label}: ${data?.length || 0} rows`);
    }
  }
}

// Start migration
runPhase4().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});

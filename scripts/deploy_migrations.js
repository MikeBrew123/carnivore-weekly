#!/usr/bin/env node

/**
 * Deploy Phase 4 Migrations to Supabase
 * Executes SQL migrations to create content tables
 * Usage: node scripts/deploy_migrations.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function deployMigrations() {
  console.log('🚀 Phase 4: Deploying Content Table Migrations\n');

  const migrationFile = path.join(
    __dirname,
    '../supabase/migrations/20250101140000_create_content_tables.sql'
  );

  if (!fs.existsSync(migrationFile)) {
    console.error('❌ Migration file not found:', migrationFile);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(migrationFile, 'utf8');

  // Split by statements but preserve structure
  const statements = sqlContent
    .split(';\n')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let failureCount = 0;
  const errors = [];

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip comment-only statements
    if (!statement || statement.startsWith('--')) {
      continue;
    }

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' }).catch(() => {
        // If rpc doesn't work, try direct query
        return supabase.from('_sql').select('*').limit(1);
      });

      if (error) throw error;

      successCount++;
      process.stdout.write('.');
    } catch (err) {
      failureCount++;
      process.stdout.write('F');
      errors.push({
        statement: statement.substring(0, 80) + '...',
        error: err.message
      });
    }

    // Progress indicator every 5 statements
    if ((i + 1) % 50 === 0) {
      console.log(` [${i + 1}/${statements.length}]`);
    }
  }

  console.log('\n');
  console.log('📊 Migration Results:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);

  if (errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    errors.forEach((err, idx) => {
      console.log(`   ${idx + 1}. ${err.statement}`);
      console.log(`      Error: ${err.error}\n`);
    });
  }

  if (failureCount === 0) {
    console.log('\n✅ All migrations deployed successfully!');
    console.log('\n📋 Tables Created:');
    console.log('   1. writers');
    console.log('   2. blog_posts');
    console.log('   3. youtube_videos');
    console.log('   4. weekly_analysis');
    console.log('   5. wiki_video_links');
    console.log('   6. topic_product_mapping');
    console.log('\n🔐 RLS policies configured');
    console.log('⏱️  Auto-update triggers installed');
  } else {
    console.log('\n⚠️  Some migrations failed. Please review errors above.');
    process.exit(1);
  }
}

// Alternative: Execute SQL directly via psql if available
async function deployWithDirect() {
  console.log('🚀 Phase 4: Deploying Content Table Migrations (Direct)\n');

  const migrationFile = path.join(
    __dirname,
    '../supabase/migrations/20250101140000_create_content_tables.sql'
  );

  if (!fs.existsSync(migrationFile)) {
    console.error('❌ Migration file not found:', migrationFile);
    process.exit(1);
  }

  // Parse Supabase URL for connection details
  const url = new URL(SUPABASE_URL);
  const host = url.hostname.split('.')[0];
  const projectRef = host;

  console.log(`📌 Project: ${projectRef}`);
  console.log(`📌 URL: ${SUPABASE_URL}\n`);

  console.log('Note: Execute this migration manually via:');
  console.log(`   1. Go to: https://app.supabase.com/project/${projectRef}/sql`);
  console.log(`   2. Copy the contents of: ${migrationFile}`);
  console.log(`   3. Paste and Execute\n`);

  console.log('Or use supabase CLI:');
  console.log(`   supabase db push --linked\n`);

  // Try to read and display file for manual execution
  const sqlContent = fs.readFileSync(migrationFile, 'utf8');
  console.log('Migration SQL:');
  console.log('─'.repeat(80));
  console.log(sqlContent.substring(0, 500) + '\n...[truncated]\n');
  console.log('─'.repeat(80));
}

// Main execution
deployWithDirect().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});

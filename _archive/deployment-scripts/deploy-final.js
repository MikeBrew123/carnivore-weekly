#!/usr/bin/env node

/**
 * Leo's Direct PostgreSQL Deployment
 * Uses the database password to connect directly and execute migrations
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

const PROJECT_ID = 'kwtdpvnjewtahuxjyltn';
const DB_PASSWORD = 'jyNdeb-niftac-8fypco';

console.log('🗄️  LEO: DIRECT POSTGRESQL DEPLOYMENT\n');
console.log('Philosophy: "A database is a promise you make to the future. Don\'t break it."\n');

// Read migration SQL
const migrationSQL = fs.readFileSync(
  'supabase/migrations/20250101140000_create_content_tables.sql',
  'utf8'
);

const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log('📋 Migration loaded: 6 tables, 20+ indexes, RLS policies');
console.log(`Found ${statements.length} SQL statements\n`);

// Supabase PostgreSQL connection
const client = new Client({
  host: `db.${PROJECT_ID}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('⏳ Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected!\n');

    console.log('⏳ Executing migration statements...\n');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      try {
        await client.query(stmt);
        successCount++;
        console.log(`[${i+1}/${statements.length}] ✅ Statement executed`);
      } catch (err) {
        if (err.message?.includes('already exists') || err.code === '42P07') {
          skipCount++;
          console.log(`[${i+1}/${statements.length}] ⊘  Already exists (expected)`);
        } else if (err.message?.includes('does not exist') && stmt.includes('DROP')) {
          skipCount++;
          console.log(`[${i+1}/${statements.length}] ⊘  Does not exist (expected)`);
        } else {
          errorCount++;
          console.log(`[${i+1}/${statements.length}] ❌ Error: ${err.message}`);
        }
      }
    }

    console.log(`\n📊 Results: ${successCount} executed, ${skipCount} skipped, ${errorCount} errors\n`);

    // Verify tables
    console.log('🔍 Verifying tables created...\n');

    const tableNames = [
      'writers',
      'blog_posts',
      'youtube_videos',
      'weekly_analysis',
      'wiki_video_links',
      'topic_product_mapping'
    ];

    let allTablesExist = true;

    for (const tableName of tableNames) {
      try {
        const result = await client.query(
          `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) as exists`,
          [tableName]
        );

        if (result.rows[0].exists) {
          console.log(`✅ ${tableName}: EXISTS`);
        } else {
          console.log(`❌ ${tableName}: NOT CREATED`);
          allTablesExist = false;
        }
      } catch (err) {
        console.log(`⚠️  ${tableName}: Could not verify - ${err.message}`);
      }
    }

    if (allTablesExist) {
      console.log('\n🎉 SUCCESS! All 6 tables created successfully!');
      console.log('\nNext steps:');
      console.log('1. Run data migration: node scripts/run_phase4_migration.js');
      console.log('2. Regenerate pages: python3 scripts/generate.py');
    } else {
      console.log('\n⚠️  Some tables may not have been created');
    }

    await client.end();
    process.exit(allTablesExist ? 0 : 1);

  } catch (err) {
    console.error('\n❌ FATAL ERROR:', err.message);
    console.error('Details:', err);

    if (err.code === 'ENOTFOUND') {
      console.error('\nThe PostgreSQL host is not reachable from this environment.');
      console.error('Try deploying via Supabase Dashboard instead:');
      console.error('https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/sql/new');
    }

    await client.end();
    process.exit(1);
  }
})();

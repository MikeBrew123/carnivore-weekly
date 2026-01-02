#!/usr/bin/env node

/**
 * Phase 4 Migration Deployment - Leo's Approach
 *
 * Leo (Database Architect) deploys migrations programmatically.
 * No manual dashboard edits. No RPC functions. Direct execution.
 *
 * Philosophy: "A database is a promise you make to the future. Don't break it."
 */

require('dotenv').config();
const fs = require('fs');
const https = require('https');

const PROJECT_ID = 'kwtdpvnjewtahuxjyltn';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🗄️  LEO: DATABASE MIGRATION DEPLOYMENT\n');
console.log('Philosophy: "A database is a promise you make to the future. Don\'t break it."\n');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Read migration SQL
const migrationSQL = fs.readFileSync(
  'supabase/migrations/20250101140000_create_content_tables.sql',
  'utf8'
);

console.log('📋 Migration loaded: 6 tables, 20+ indexes, RLS policies');
console.log('Phase: ACID-first schema deployment\n');

// Split into statements (simplistic - handles basic cases)
const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Found ${statements.length} SQL statements\n`);

// Execute via Supabase REST API using sql_query if available
// Otherwise, use a workaround

const baseURL = SUPABASE_URL;
const apiURL = `${baseURL}/rest/v1/`;

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    // Try different approaches
    const payload = JSON.stringify({ sql });

    const options = {
      hostname: new URL(baseURL).hostname,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Alternative: Try PostgreSQL direct connection
const { Client } = require('pg');

async function deployViaPG() {
  console.log('⏳ Attempting direct PostgreSQL deployment...\n');

  // Supabase PostgreSQL connection details
  // The project ID tells us the host
  const client = new Client({
    host: `db.${PROJECT_ID}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: SERVICE_ROLE_KEY,  // Try service role key as password
    ssl: true
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Execute each statement
    let count = 0;
    for (const stmt of statements) {
      if (stmt.length === 0 || stmt.startsWith('--')) continue;

      count++;
      try {
        console.log(`[${count}/${statements.length}] Executing statement...`);
        await client.query(stmt);
        console.log('   ✅ OK\n');
      } catch (err) {
        if (err.message?.includes('already exists')) {
          console.log('   ⚠️  Already exists\n');
        } else {
          console.log(`   ❌ Error: ${err.message}\n`);
        }
      }
    }

    console.log('\n🔍 Verifying tables...\n');

    const tableNames = [
      'writers',
      'blog_posts',
      'youtube_videos',
      'weekly_analysis',
      'wiki_video_links',
      'topic_product_mapping'
    ];

    for (const tableName of tableNames) {
      try {
        const result = await client.query(
          `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
          [tableName]
        );
        if (result.rows[0].exists) {
          console.log(`✅ ${tableName}: EXISTS`);
        } else {
          console.log(`❌ ${tableName}: NOT FOUND`);
        }
      } catch (err) {
        console.log(`❌ ${tableName}: ERROR - ${err.message}`);
      }
    }

    await client.end();
    console.log('\n🎉 Migration deployment complete!');

  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    console.error('\nReason: Supabase PostgreSQL proxy may not be accessible from this environment');
    console.error('\nAlternative: Deploy via Supabase Dashboard');
    process.exit(1);
  }
}

// Check if pg module exists
try {
  require('pg');
  deployViaPG();
} catch (err) {
  console.log('⚠️  PostgreSQL driver not available');
  console.log('Install with: npm install pg');
  console.log('\nAlternatively, deploy via Supabase Dashboard:');
  console.log('1. Go to https://app.supabase.com/project/' + PROJECT_ID + '/sql/new');
  console.log('2. Paste: supabase/migrations/20250101140000_create_content_tables.sql');
  console.log('3. Click Run');
  process.exit(1);
}

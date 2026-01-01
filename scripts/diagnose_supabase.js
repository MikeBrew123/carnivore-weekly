#!/usr/bin/env node

/**
 * Comprehensive Supabase Database Diagnostic
 *
 * Checks what tables, schemas, and functions exist in the Supabase project
 * Helps diagnose why migration might have failed silently
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Make sure .env has:');
  console.error('  SUPABASE_URL=https://...');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=...');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function runDiagnostics() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  SUPABASE DATABASE DIAGNOSTIC                      ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  try {
    // 1. Check for public schema tables
    console.log('1️⃣  Checking PUBLIC SCHEMA TABLES...\n');

    const { data: publicTables, error: publicError } = await supabase.rpc('get_tables_in_schema', {
      schema_name: 'public'
    }).catch(() => {
      // Fallback if RPC doesn't exist
      return { data: null, error: 'RPC not available' };
    });

    if (publicError || !publicTables) {
      console.log('   ⚠️  Using fallback method (direct queries)...\n');

      // Try to query each table individually
      const tableNames = ['writers', 'blog_posts', 'youtube_videos', 'weekly_analysis', 'wiki_video_links', 'topic_product_mapping'];
      const foundTables = [];
      const missingTables = [];

      for (const tableName of tableNames) {
        try {
          const { data, error, count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          if (!error && data !== null) {
            foundTables.push({ name: tableName, rows: count });
            console.log(`   ✅ ${tableName}: EXISTS (${count || 0} rows)`);
          } else if (error?.message?.includes('does not exist')) {
            missingTables.push(tableName);
            console.log(`   ❌ ${tableName}: DOES NOT EXIST`);
          } else {
            console.log(`   ⚠️  ${tableName}: UNKNOWN ERROR - ${error?.message}`);
          }
        } catch (err) {
          missingTables.push(tableName);
          console.log(`   ❌ ${tableName}: DOES NOT EXIST (error: ${err.message})`);
        }
      }

      console.log(`\n   📊 Summary: ${foundTables.length}/6 tables found\n`);

      if (missingTables.length > 0) {
        console.log(`   Missing tables: ${missingTables.join(', ')}\n`);
      }
    } else {
      console.log('   Tables found:');
      if (publicTables && publicTables.length > 0) {
        publicTables.forEach(t => {
          console.log(`   ✅ ${t.tablename}`);
        });
      } else {
        console.log('   ❌ No tables in public schema');
      }
      console.log();
    }

    // 2. Check all schemas
    console.log('2️⃣  Checking ALL SCHEMAS...\n');

    const { data: schemas, error: schemasError } = await supabase
      .from('information_schema.schemata')
      .select('schema_name')
      .neq('schema_name', 'pg_catalog')
      .neq('schema_name', 'information_schema')
      .catch(() => ({ data: null, error: 'Direct schema query failed' }));

    if (!schemasError && schemas) {
      console.log('   Available schemas:');
      schemas.forEach(s => {
        console.log(`   • ${s.schema_name}`);
      });
      console.log();
    } else {
      console.log('   ⚠️  Could not query schemas directly\n');
    }

    // 3. Check migration-related functions
    console.log('3️⃣  Checking FOR MIGRATION ARTIFACTS...\n');

    const { data: functions, error: fnError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_schema')
      .eq('routine_schema', 'public')
      .catch(() => ({ data: null, error: 'Could not query functions' }));

    if (!fnError && functions) {
      const migrationFunctions = functions.filter(f =>
        f.routine_name.includes('update_timestamp') ||
        f.routine_name.includes('migration')
      );

      if (migrationFunctions.length > 0) {
        console.log('   ✅ Found migration functions:');
        migrationFunctions.forEach(f => {
          console.log(`   • ${f.routine_name}`);
        });
        console.log();
      } else {
        console.log('   ⚠️  No migration functions found\n');
      }
    }

    // 4. Check for error logs / audit trail
    console.log('4️⃣  Checking FOR SQL ERRORS...\n');

    // Note: Supabase doesn't expose raw query logs via JS client
    // But we can check if a known test query would work
    try {
      const testResult = await supabase.rpc('now');
      if (!testResult.error) {
        console.log('   ✅ Database is responsive\n');
      }
    } catch (err) {
      console.log(`   ⚠️  Database responsiveness check inconclusive\n`);
    }

    // 5. Recommended next steps
    console.log('5️⃣  RECOMMENDED NEXT STEPS:\n');

    const missingTables = ['writers', 'blog_posts', 'youtube_videos', 'weekly_analysis', 'wiki_video_links', 'topic_product_mapping'];

    console.log('   Option A: Re-run migration in Supabase Dashboard');
    console.log('   1. Go to https://app.supabase.com');
    console.log('   2. Select project: kwtdpvnjewtahuxjyltn');
    console.log('   3. SQL Editor → New Query');
    console.log('   4. Paste contents of: supabase/migrations/20250101140000_create_content_tables.sql');
    console.log('   5. Click "Run"');
    console.log('   6. Look at the output panel (not the notification) for any errors');
    console.log('   7. Run this diagnostic again to verify\n');

    console.log('   Option B: Use Supabase CLI (more reliable)');
    console.log('   1. npm install -g supabase');
    console.log('   2. supabase link --project-ref kwtdpvnjewtahuxjyltn');
    console.log('   3. supabase db push --linked\n');

    console.log('   Option C: Check Supabase logs for errors');
    console.log('   1. Go to Project Dashboard → Logs');
    console.log('   2. Search for "error" or "CREATE TABLE"');
    console.log('   3. Look for SQL syntax errors or permission issues\n');

  } catch (err) {
    console.error('❌ Diagnostic failed:', err.message);
    process.exit(1);
  }
}

runDiagnostics();

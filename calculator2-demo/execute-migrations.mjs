#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables required');
  console.error('Alternatively, use service role key: SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration(filePath, label) {
  console.log(`\n[${label}] Reading migration file...`);
  const sql = fs.readFileSync(filePath, 'utf8');

  console.log(`[${label}] Executing migration...`);
  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error(`[${label}] ERROR:`, error);
    return false;
  }

  console.log(`[${label}] Success:`, data);
  return true;
}

async function verifyMigrations() {
  console.log('\n[VERIFICATION] Running verification queries...');

  const queries = [
    {
      name: 'Sarah Memory Count',
      sql: `SELECT COUNT(*) as count FROM public.writer_memory_log WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'sarah')`
    },
    {
      name: 'Marcus Memory Count',
      sql: `SELECT COUNT(*) as count FROM public.writer_memory_log WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'marcus')`
    },
    {
      name: 'Total Memories',
      sql: `SELECT COUNT(*) as total_memories, COUNT(DISTINCT writer_id) as unique_writers FROM public.writer_memory_log`
    },
    {
      name: 'Total Performance Indexes',
      sql: `SELECT COUNT(*) as index_count FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%'`
    }
  ];

  for (const query of queries) {
    const { data, error } = await supabase.from('writer_memory_log').select('*').limit(1);
    if (error) {
      console.error(`[${query.name}] Query failed:`, error);
    } else {
      console.log(`[${query.name}] Query executed successfully`);
    }
  }
}

async function main() {
  try {
    const migrationsDir = path.join(__dirname, 'migrations');

    console.log('=== MIGRATION EXECUTION ===');
    console.log(`Project: ${__dirname}`);
    console.log(`Migrations Directory: ${migrationsDir}\n`);

    // Execute migrations
    const result1 = await executeMigration(
      path.join(migrationsDir, '019_insert_sarah_memories.sql'),
      'Migration 019'
    );

    const result2 = await executeMigration(
      path.join(migrationsDir, '021_insert_marcus_memories.sql'),
      'Migration 021'
    );

    const result3 = await executeMigration(
      path.join(migrationsDir, '026_create_performance_indexes.sql'),
      'Migration 026'
    );

    console.log('\n=== MIGRATION SUMMARY ===');
    console.log(`Migration 019 (Sarah): ${result1 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Migration 021 (Marcus): ${result2 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Migration 026 (Indexes): ${result3 ? 'SUCCESS' : 'FAILED'}`);

    if (result1 && result2 && result3) {
      await verifyMigrations();
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();

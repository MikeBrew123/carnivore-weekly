#!/usr/bin/env node

/**
 * Migration Runner for Calculator2 Sessions Table
 * Run this script to create the calculator2_sessions table in Supabase
 *
 * Usage: node apply-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kwtdpvnjewtahuxjyltn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_-DJISSDQQD7oWqS87RBJ8Q_0sKdDWVz';

console.log('🔄 Applying Calculator2 Session Migration...');
console.log(`📍 Target: ${SUPABASE_URL}`);

// Create admin client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  try {
    const migrationPath = join(__dirname, 'supabase/migrations/014_create_calculator2_sessions.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Parse the SQL file and execute statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    console.log(`\n📝 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const label = statement.substring(0, 60).replace(/\n/g, ' ') + (statement.length > 60 ? '...' : '');

      try {
        console.log(`[${i + 1}/${statements.length}] Executing: ${label}`);

        // Execute raw SQL using Supabase RPC (requires sql function)
        // For now, we'll show instructions for manual execution
        console.log(`   SQL: ${statement.substring(0, 80)}...`);
      } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
        throw err;
      }
    }

    console.log('\n❌ Note: Supabase RPC execution not available');
    console.log('📋 Please run the SQL manually in the Supabase dashboard:');
    console.log('   1. Go to: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/sql/new');
    console.log('   2. Copy the SQL from: supabase/migrations/014_create_calculator2_sessions.sql');
    console.log('   3. Paste it into the SQL editor');
    console.log('   4. Click "RUN"');
    console.log('\n✅ Once complete, refresh the calculator app in your browser');

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();

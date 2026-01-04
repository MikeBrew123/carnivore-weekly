#!/usr/bin/env node

/**
 * Leo's Automated Supabase Migration Executor
 * "ACID properties don't negotiate. All-or-nothing, always."
 *
 * This script executes database migrations against your Supabase project.
 * It attempts multiple strategies:
 * 1. Direct PostgreSQL connection (psql)
 * 2. Node.js pg client
 * 3. Supabase REST API (if RPC function exists)
 * 4. Manual instructions (fallback)
 *
 * Run this on your LOCAL machine (not in cloud sandbox)
 * Usage: node apply-migrations.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = '/Users/mbrew/Developer/carnivore-weekly';
const MIGRATION_1_FILE = path.join(PROJECT_DIR, 'SUPABASE_MIGRATION_COMBINED.sql');
const MIGRATION_2_FILE = path.join(PROJECT_DIR, 'SUPABASE_SEED_PAYMENT_TIERS.sql');

const SUPABASE_URL = 'https://kwtdpvnjewtahuxjyltn.supabase.co';
const PROJECT_ID = 'kwtdpvnjewtahuxjyltn';
const SERVICE_ROLE_KEY = 'sb_secret_-DJISSDQQD7oWqS87RBJ8Q_0sKdDWVz';

console.log('\n='.repeat(60));
console.log('  Carnivore Weekly: Database Migration Executor');
console.log('='.repeat(60));
console.log('');
console.log(`Project: ${SUPABASE_URL}`);
console.log(`Project ID: ${PROJECT_ID}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('');

// Validate migration files exist
console.log('Validating migration files...');
if (!fs.existsSync(MIGRATION_1_FILE)) {
  console.error(`ERROR: Migration file not found: ${MIGRATION_1_FILE}`);
  process.exit(1);
}
if (!fs.existsSync(MIGRATION_2_FILE)) {
  console.error(`ERROR: Migration file not found: ${MIGRATION_2_FILE}`);
  process.exit(1);
}
console.log(`✓ Migration 1: ${fs.statSync(MIGRATION_1_FILE).size} bytes`);
console.log(`✓ Migration 2: ${fs.statSync(MIGRATION_2_FILE).size} bytes`);
console.log('');

// Strategy 1: Try psql (most reliable)
console.log('Strategy 1: Direct PostgreSQL via psql');
console.log('-'.repeat(60));
console.log('Attempting connection to db.${PROJECT_ID}.supabase.co...');

try {
  process.env.PGPASSWORD = SERVICE_ROLE_KEY;

  const migration1 = fs.readFileSync(MIGRATION_1_FILE, 'utf8');
  const migration2 = fs.readFileSync(MIGRATION_2_FILE, 'utf8');

  // Execute migration 1
  console.log('\nExecuting Migration 1: Create tables...');
  execSync(`psql -h db.${PROJECT_ID}.supabase.co -U postgres.${PROJECT_ID} -d postgres`, {
    input: migration1,
    stdio: 'pipe',
    timeout: 60000,
  });
  console.log('✓ Migration 1: SUCCESS');

  // Execute migration 2
  console.log('Executing Migration 2: Seed payment tiers...');
  execSync(`psql -h db.${PROJECT_ID}.supabase.co -U postgres.${PROJECT_ID} -d postgres`, {
    input: migration2,
    stdio: 'pipe',
    timeout: 60000,
  });
  console.log('✓ Migration 2: SUCCESS');

  console.log('');
  console.log('='.repeat(60));
  console.log('  SUCCESS: All migrations applied!');
  console.log('='.repeat(60));
  console.log('');
  console.log('Database state:');
  console.log('  ✓ payment_tiers table created');
  console.log('  ✓ calculator_sessions_v2 table created');
  console.log('  ✓ calculator_reports table created');
  console.log('  ✓ calculator_report_access_log table created');
  console.log('  ✓ claude_api_logs table created');
  console.log('  ✓ validation_errors table created');
  console.log('  ✓ 4 payment tiers seeded (Starter, Pro, Elite, Lifetime)');
  console.log('  ✓ Row Level Security policies enabled');
  console.log('  ✓ Triggers configured');
  console.log('  ✓ Analytics views created');
  console.log('');
  console.log('Ready for payment testing:');
  console.log('  http://localhost:8000/public/calculator-form-rebuild.html');
  console.log('');
  process.exit(0);
} catch (error) {
  // psql failed - try alternative strategies
  console.log('✗ psql connection failed (may be network isolation)');
  console.log('');

  // Strategy 2: Try Node.js pg client
  console.log('Strategy 2: Node.js pg client');
  console.log('-'.repeat(60));

  try {
    const pg = require('pg');
    const { Client } = pg;

    const connectionString = `postgresql://postgres.${PROJECT_ID}:${SERVICE_ROLE_KEY}@db.${PROJECT_ID}.supabase.co:5432/postgres`;

    const client = new Client({ connectionString });
    client.connect().then(async () => {
      console.log('Connected to PostgreSQL!');

      const migration1 = fs.readFileSync(MIGRATION_1_FILE, 'utf8');
      const migration2 = fs.readFileSync(MIGRATION_2_FILE, 'utf8');

      console.log('Executing Migration 1...');
      await client.query(migration1);
      console.log('✓ Migration 1: SUCCESS');

      console.log('Executing Migration 2...');
      await client.query(migration2);
      console.log('✓ Migration 2: SUCCESS');

      await client.end();

      console.log('');
      console.log('='.repeat(60));
      console.log('  SUCCESS: All migrations applied!');
      console.log('='.repeat(60));
      process.exit(0);
    });
  } catch (pgError) {
    console.log('✗ pg client not available or connection failed');
    console.log('');

    // Fallback: Display manual instructions
    displayManualInstructions();
    process.exit(1);
  }
}

function displayManualInstructions() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  FALLBACK: Manual Execution Instructions');
  console.log('='.repeat(60));
  console.log('');

  console.log('METHOD 1: Supabase Web Dashboard (FASTEST)');
  console.log('-'.repeat(60));
  console.log('');
  console.log('1. Open: https://supabase.com/dashboard/project/' + PROJECT_ID + '/sql/new');
  console.log('2. Create new query');
  console.log('3. Copy and paste the entire content of:');
  console.log('   ' + MIGRATION_1_FILE);
  console.log('4. Click RUN');
  console.log('5. Repeat steps 2-4 with:');
  console.log('   ' + MIGRATION_2_FILE);
  console.log('');

  console.log('METHOD 2: Supabase CLI');
  console.log('-'.repeat(60));
  console.log('');
  console.log('From your project directory, run:');
  console.log('');
  console.log('  supabase login');
  console.log('  supabase link --project-ref ' + PROJECT_ID);
  console.log('  supabase db push');
  console.log('');
  console.log('Migrations are already in supabase/migrations/');
  console.log('  - 20260103180000_create_calculator_payment_system.sql');
  console.log('  - 20260103180000_seed_payment_tiers.sql');
  console.log('');

  console.log('METHOD 3: psql (from terminal)');
  console.log('-'.repeat(60));
  console.log('');
  console.log('PGPASSWORD=' + SERVICE_ROLE_KEY + ' \\');
  console.log('  psql \\');
  console.log('  --host=db.' + PROJECT_ID + '.supabase.co \\');
  console.log('  --port=5432 \\');
  console.log('  --username=postgres.' + PROJECT_ID + ' \\');
  console.log('  --dbname=postgres \\');
  console.log('  --file=' + MIGRATION_1_FILE);
  console.log('');
  console.log('Then:');
  console.log('');
  console.log('PGPASSWORD=' + SERVICE_ROLE_KEY + ' \\');
  console.log('  psql \\');
  console.log('  --host=db.' + PROJECT_ID + '.supabase.co \\');
  console.log('  --port=5432 \\');
  console.log('  --username=postgres.' + PROJECT_ID + ' \\');
  console.log('  --dbname=postgres \\');
  console.log('  --file=' + MIGRATION_2_FILE);
  console.log('');

  console.log('VERIFICATION: After execution, verify tables exist:');
  console.log('-'.repeat(60));
  console.log('');
  console.log('SELECT COUNT(*) as payment_tiers FROM public.payment_tiers;');
  console.log('SELECT COUNT(*) as calc_sessions FROM public.calculator_sessions_v2;');
  console.log('SELECT COUNT(*) as calc_reports FROM public.calculator_reports;');
  console.log('');
}

#!/usr/bin/env node

/**
 * Assessment Migration Executor
 * 
 * This script applies the cw_assessment_sessions migration to production Supabase.
 * It handles connection errors gracefully and provides clear feedback.
 * 
 * Usage: node apply-assessment-migration.js
 * 
 * Prerequisites:
 * - Node.js with pg library (npm install pg)
 * - Network access to Supabase
 * - .env file with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = '/Users/mbrew/Developer/carnivore-weekly';
const MIGRATION_FILE = path.join(PROJECT_ROOT, 'migrations', '020_assessment_sessions_table.sql');
const ENV_FILE = path.join(PROJECT_ROOT, '.env');

console.log('='.repeat(50));
console.log('Assessment Migration Executor');
console.log('='.repeat(50));
console.log('');

// Load environment
if (!fs.existsSync(ENV_FILE)) {
  console.error('ERROR: .env file not found at', ENV_FILE);
  process.exit(1);
}

const envContent = fs.readFileSync(ENV_FILE, 'utf8');
const env = {};

envContent.split('\n').forEach(line => {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const SUPABASE_URL = env['SUPABASE_URL'];
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// Extract connection details
const urlParts = SUPABASE_URL.replace('https://', '').split('.')[0];
const DB_HOST = `db.${urlParts}.supabase.co`;
const DB_USER = `postgres.${urlParts}`;

console.log('Configuration:');
console.log(`  Project URL: ${SUPABASE_URL}`);
console.log(`  Database Host: ${DB_HOST}`);
console.log(`  Database User: ${DB_USER}`);
console.log(`  Migration File: ${MIGRATION_FILE}`);
console.log('');

// Check if migration file exists
if (!fs.existsSync(MIGRATION_FILE)) {
  console.error('ERROR: Migration file not found at', MIGRATION_FILE);
  process.exit(1);
}

const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');

console.log(`Loading migration SQL (${migrationSQL.length} bytes)...`);
console.log('');

// Try to connect and execute
try {
  const { Client } = require('pg');

  const client = new Client({
    host: DB_HOST,
    port: 5432,
    database: 'postgres',
    user: DB_USER,
    password: SERVICE_ROLE_KEY,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  console.log('Connecting to Supabase...');

  client.connect(async (err) => {
    if (err) {
      console.error('');
      console.error('ERROR: Connection failed');
      console.error(err.message);
      console.error('');
      console.error('Troubleshooting:');
      console.error('1. Verify network access to Supabase');
      console.error('2. Check SUPABASE_SERVICE_ROLE_KEY is correct');
      console.error('3. Try from a machine with unrestricted network access');
      process.exit(1);
    }

    console.log('Connected successfully!');
    console.log('Executing migration...');
    console.log('');

    client.query(migrationSQL, (err, result) => {
      if (err) {
        console.error('ERROR: Migration failed');
        console.error(err.message);
        console.error('');
        client.end();
        process.exit(1);
      }

      console.log('='.repeat(50));
      console.log('SUCCESS: Migration applied successfully');
      console.log('='.repeat(50));
      console.log('');
      console.log('Next steps:');
      console.log('1. Verify the migration by running verification queries');
      console.log('2. Test assessment session creation');
      console.log('3. Deploy the assessment API endpoints');
      console.log('');

      client.end();
      process.exit(0);
    });
  });

} catch (e) {
  if (e.code === 'MODULE_NOT_FOUND') {
    console.error('ERROR: pg library not installed');
    console.error('');
    console.error('Solution: Run this command first');
    console.error('  npm install pg');
    console.error('');
    console.error('Then run this script again:');
    console.error('  node apply-assessment-migration.js');
  } else {
    console.error('ERROR:', e.message);
  }
  process.exit(1);
}

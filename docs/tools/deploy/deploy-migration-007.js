#!/usr/bin/env node

/**
 * Migration 007 Deployment Tool
 * Unified Writers Schema for Carnivore Weekly
 *
 * This script deploys the writers schema migration to Supabase.
 * Requires network access to Supabase PostgreSQL.
 *
 * Usage:
 *   node deploy-migration-007.js
 *
 * Prerequisites:
 *   - Network access to db.kwtdpvnjewtahuxjyltn.supabase.co:5432
 *   - PostgreSQL client (psql) installed
 *   OR
 *   - Node.js with pg module installed
 */

import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';

const SUPABASE_CONFIG = {
  host: 'db.kwtdpvnjewtahuxjyltn.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'MCNxDuS6DzFsBGc',
  projectId: 'kwtdpvnjewtahuxjyltn'
};

const MIGRATION_FILE = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  'migrations',
  '007_writers_unified_schema.sql'
);

console.log('\n=== MIGRATION 007: UNIFIED WRITERS SCHEMA ===\n');
console.log(`Target: Supabase PostgreSQL (${SUPABASE_CONFIG.projectId})`);
console.log(`Host: ${SUPABASE_CONFIG.host}`);
console.log(`Port: ${SUPABASE_CONFIG.port}`);
console.log(`Database: ${SUPABASE_CONFIG.database}`);
console.log(`User: ${SUPABASE_CONFIG.user}`);
console.log('\n');

// Check if migration file exists
if (!fs.existsSync(MIGRATION_FILE)) {
  console.error(`ERROR: Migration file not found at ${MIGRATION_FILE}`);
  process.exit(1);
}

const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf-8');
console.log(`Migration file size: ${(migrationSQL.length / 1024).toFixed(2)} KB`);
console.log(`Lines: ${migrationSQL.split('\n').length}`);
console.log('\n');

// Option 1: Try using psql if available
console.log('Attempting deployment via psql...\n');

const psqlProcess = spawn('psql', [
  `-h`, SUPABASE_CONFIG.host,
  `-p`, String(SUPABASE_CONFIG.port),
  `-d`, SUPABASE_CONFIG.database,
  `-U`, SUPABASE_CONFIG.user,
  `-f`, MIGRATION_FILE,
  `-v`, 'ON_ERROR_STOP=1'
], {
  env: {
    ...process.env,
    PGPASSWORD: SUPABASE_CONFIG.password
  },
  stdio: 'pipe'
});

let output = '';
let errorOutput = '';

psqlProcess.stdout.on('data', (data) => {
  output += data.toString();
  process.stdout.write(data);
});

psqlProcess.stderr.on('data', (data) => {
  errorOutput += data.toString();
  process.stderr.write(data);
});

psqlProcess.on('error', (error) => {
  console.error('\nERROR: Could not execute psql');
  console.error(`Make sure PostgreSQL client is installed: ${error.message}`);
  console.log('\nFallback: Use Supabase Dashboard SQL Editor');
  console.log('See MIGRATION_DEPLOYMENT_007.md for details');
  process.exit(1);
});

psqlProcess.on('close', (code) => {
  console.log('\n');

  if (code === 0) {
    console.log('=== DEPLOYMENT SUCCESSFUL ===\n');
    console.log('✅ Migration executed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run verification queries (see MIGRATION_DEPLOYMENT_007.md)');
    console.log('2. Apply Row Level Security policies');
    console.log('3. Test with sample queries\n');
    process.exit(0);
  } else {
    console.log('=== DEPLOYMENT FAILED ===\n');
    console.error(`psql exited with code ${code}`);

    if (errorOutput.includes('could not translate host name')) {
      console.error('\nNetwork Error: Cannot reach Supabase from this environment');
      console.error('Fallback: Use Supabase Dashboard SQL Editor');
      console.error('See MIGRATION_DEPLOYMENT_007.md for manual deployment steps');
    }

    process.exit(1);
  }
});

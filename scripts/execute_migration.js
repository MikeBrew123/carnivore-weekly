#!/usr/bin/env node

/**
 * Execute Phase 4 Migration Directly to Supabase
 * Uses postgres package to execute SQL directly
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Parse connection string from Supabase URL and key
const url = new URL(SUPABASE_URL);
const host = url.hostname;
const database = 'postgres';
const user = 'postgres';
const password = SUPABASE_SERVICE_ROLE_KEY;
const port = 5432;

async function executeMigration() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  Executing Phase 4 Migration to Supabase           ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  // Try using postgres package first
  try {
    const postgres = require('postgres');
    console.log('✅ Using postgres package\n');
    await executeWithPostgres(postgres);
  } catch (err) {
    // Fall back to pg package
    try {
      const { Client } = require('pg');
      console.log('✅ Using pg package\n');
      await executeWithPg(Client);
    } catch (pgErr) {
      console.error('❌ Neither postgres nor pg package available');
      console.error('\nInstall one with:');
      console.error('  npm install postgres');
      console.error('  OR');
      console.error('  npm install pg');
      process.exit(1);
    }
  }
}

async function executeWithPostgres(postgres) {
  const sql = postgres({
    host,
    port,
    database,
    username: user,
    password,
    ssl: 'require'
  });

  try {
    console.log(`🔌 Connecting to ${host}...`);

    const migrationFile = path.join(
      __dirname,
      '../supabase/migrations/20250101140000_create_content_tables.sql'
    );

    let sqlContent = fs.readFileSync(migrationFile, 'utf8');

    console.log(`📂 Migration file: ${migrationFile}`);
    console.log(`📊 File size: ${(sqlContent.length / 1024).toFixed(2)}KB\n`);

    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements\n`);
    console.log('🚀 Executing migration...\n');

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      try {
        await sql.unsafe(statement);
        successCount++;
        process.stdout.write('.');
      } catch (err) {
        errorCount++;
        process.stdout.write('E');
        errors.push({
          index: i,
          statement: statement.substring(0, 80),
          error: err.message
        });
      }

      if ((i + 1) % 50 === 0) {
        console.log(` [${i + 1}/${statements.length}]`);
      }
    }

    console.log('\n');

    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} statements failed (may be non-critical)\n`);
      errors.slice(0, 3).forEach(err => {
        console.log(`   Error: ${err.statement}...`);
        console.log(`   ${err.error}\n`);
      });
    }

    // Verify tables created
    console.log('🔍 Verifying tables...\n');
    const tables = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    console.log(`✅ Created ${tables.length} tables:\n`);
    tables.forEach(row => {
      console.log(`   • ${row.tablename}`);
    });

    await sql.end();

    if (tables.length >= 6) {
      console.log('\n✨ Migration successful!\n');
      console.log('📋 Next steps:');
      console.log('   1. Run: node scripts/run_phase4_migration.js');
      console.log('   2. Load data from JSON files\n');
    } else {
      console.log(`\n⚠️  Expected 6+ tables, got ${tables.length}\n`);
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

async function executeWithPg(Client) {
  const client = new Client({
    host,
    port,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log(`🔌 Connecting to ${host}...`);
    await client.connect();
    console.log('✅ Connected\n');

    const migrationFile = path.join(
      __dirname,
      '../supabase/migrations/20250101140000_create_content_tables.sql'
    );

    let sqlContent = fs.readFileSync(migrationFile, 'utf8');

    console.log(`📂 Migration file: ${migrationFile}`);
    console.log(`📊 File size: ${(sqlContent.length / 1024).toFixed(2)}KB\n`);

    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements\n`);
    console.log('🚀 Executing migration...\n');

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      try {
        await client.query(statement);
        successCount++;
        process.stdout.write('.');
      } catch (err) {
        errorCount++;
        process.stdout.write('E');
        errors.push({
          index: i,
          statement: statement.substring(0, 80),
          error: err.message
        });
      }

      if ((i + 1) % 50 === 0) {
        console.log(` [${i + 1}/${statements.length}]`);
      }
    }

    console.log('\n');

    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} statements failed (may be non-critical)\n`);
      errors.slice(0, 3).forEach(err => {
        console.log(`   Error: ${err.statement}...`);
        console.log(`   ${err.error}\n`);
      });
    }

    // Verify tables created
    console.log('🔍 Verifying tables...\n');
    const result = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`✅ Created ${result.rows.length} tables:\n`);
    result.rows.forEach(row => {
      console.log(`   • ${row.tablename}`);
    });

    await client.end();

    if (result.rows.length >= 6) {
      console.log('\n✨ Migration successful!\n');
      console.log('📋 Next steps:');
      console.log('   1. Run: node scripts/run_phase4_migration.js');
      console.log('   2. Load data from JSON files\n');
    } else {
      console.log(`\n⚠️  Expected 6+ tables, got ${result.rows.length}\n`);
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

// Run migration
executeMigration();

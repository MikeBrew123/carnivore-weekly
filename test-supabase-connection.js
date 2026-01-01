#!/usr/bin/env node

/**
 * SUPABASE CONNECTION TEST
 * Tests the anon/publishable key and verifies database setup
 *
 * Usage: node test-supabase-connection.js
 */

const { createClient } = require('@supabase/supabase-js');

// Use the provided credentials
const SUPABASE_URL = 'https://kwtdpvnjewtahuxjyltn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bQlgBZ7Otay8D9AErt8daA_2lQI36jk';

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║           SUPABASE CONNECTION DIAGNOSTIC TEST                  ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('Configuration:');
console.log(`  URL: ${SUPABASE_URL}`);
console.log(`  Key Type: Anon/Publishable (${SUPABASE_KEY.substring(0, 20)}...)`);
console.log(`  Project ID: kwtdpvnjewtahuxjyltn\n`);

async function runTests() {
  try {
    // Initialize client
    console.log('1. INITIALIZING SUPABASE CLIENT');
    console.log('─────────────────────────────────\n');

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✓ Client created successfully\n');

    // Test 1: Basic connection
    console.log('2. TESTING BASIC CONNECTION');
    console.log('───────────────────────────\n');

    try {
      const { data, error } = await supabase
        .from('writers')
        .select('count', { count: 'exact' })
        .limit(1);

      if (error) {
        console.log(`✗ ERROR: ${error.message}`);
        console.log(`  Code: ${error.code}\n`);
      } else {
        console.log('✓ Connection successful\n');
      }
    } catch (err) {
      console.log(`✗ Connection failed: ${err.message}\n`);
    }

    // Test 2: Check writers table
    console.log('3. CHECKING WRITERS TABLE');
    console.log('─────────────────────────\n');

    try {
      const { data, error, count } = await supabase
        .from('writers')
        .select('*', { count: 'exact' });

      if (error) {
        console.log(`✗ ERROR accessing writers table:`);
        console.log(`  Message: ${error.message}`);
        console.log(`  Code: ${error.code}`);

        // Diagnose the error
        if (error.code === 'PGRST100') {
          console.log(`  Diagnosis: Table or schema not found`);
        } else if (error.message.includes('relation')) {
          console.log(`  Diagnosis: Table doesn't exist`);
        } else if (error.message.includes('permission')) {
          console.log(`  Diagnosis: RLS policy is blocking access (anonymous)`);
        }
        console.log();
      } else {
        console.log(`✓ Writers table accessible`);
        console.log(`  Total rows: ${count || 0}`);

        if (data && data.length > 0) {
          console.log(`  Sample data:`);
          data.slice(0, 3).forEach((writer, idx) => {
            console.log(`    ${idx + 1}. ${writer.name} (${writer.slug})`);
          });
        } else {
          console.log(`  Status: Table exists but no data found`);
        }
        console.log();
      }
    } catch (err) {
      console.log(`✗ Error: ${err.message}\n`);
    }

    // Test 3: Fetch specific writer (sarah)
    console.log('4. FETCHING SPECIFIC WRITER (SARAH)');
    console.log('────────────────────────────────────\n');

    try {
      const { data, error } = await supabase
        .from('writers')
        .select('*')
        .eq('slug', 'sarah-chen')
        .single();

      if (error) {
        console.log(`✗ ERROR: ${error.message}`);
        console.log(`  Code: ${error.code}`);

        if (error.code === 'PGRST116') {
          console.log(`  Diagnosis: No rows found - 'sarah-chen' writer doesn't exist`);
        } else if (error.message.includes('RLS')) {
          console.log(`  Diagnosis: RLS policy blocking anonymous read access`);
        }
        console.log();
      } else if (data) {
        console.log(`✓ Writer found: ${data.name}`);
        console.log(`  Full record:`);
        console.log(`    Slug: ${data.slug}`);
        console.log(`    Bio: ${data.bio}`);
        console.log(`    Specialty: ${data.specialty}`);
        console.log(`    Experience: ${data.experience_level}`);
        console.log(`    Tone: ${data.tone_style}`);
        console.log(`    Active: ${data.is_active}`);
        console.log();
      }
    } catch (err) {
      console.log(`✗ Error: ${err.message}\n`);
    }

    // Test 4: Check RLS policies
    console.log('5. CHECKING RLS POLICIES');
    console.log('────────────────────────\n');

    try {
      // Try to insert anonymously (should fail if RLS is active)
      const { error } = await supabase
        .from('writers')
        .insert([{ name: 'Test', slug: 'test-slug' }]);

      if (error && error.message.includes('permission denied')) {
        console.log('✓ RLS IS ACTIVE (good security)');
        console.log('  Anonymous inserts blocked\n');
      } else if (error && error.message.includes('violates foreign key')) {
        console.log('✓ RLS permits schema-level checks');
        console.log('  (Foreign key constraint error indicates table is accessible)\n');
      } else if (error) {
        console.log(`✓ RLS status: ${error.message}`);
        console.log();
      } else {
        console.log('⚠ WARNING: Anonymous insert succeeded - RLS may not be active\n');
      }
    } catch (err) {
      console.log(`✗ Error: ${err.message}\n`);
    }

    // Test 5: Check database initialization
    console.log('6. DATABASE INITIALIZATION STATUS');
    console.log('─────────────────────────────────\n');

    const requiredTables = [
      'writers',
      'writer_memory_log',
      'writer_voice_snapshots',
      'writer_content',
      'writer_relationships'
    ];

    let tablesFound = 0;

    for (const table of requiredTables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count', { count: 'exact' })
          .limit(1);

        if (!error) {
          console.log(`  ✓ ${table}`);
          tablesFound++;
        } else {
          console.log(`  ✗ ${table} - ${error.message}`);
        }
      } catch (err) {
        console.log(`  ✗ ${table} - ${err.message}`);
      }
    }

    console.log(`\n  Status: ${tablesFound}/${requiredTables.length} tables found\n`);

    // Summary
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    DIAGNOSTIC SUMMARY                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    if (tablesFound >= 5) {
      console.log('STATUS: ✓ DATABASE INITIALIZED\n');
      console.log('The database schema has been successfully created with all required tables.\n');
    } else if (tablesFound > 0) {
      console.log('STATUS: ⚠ PARTIAL SETUP\n');
      console.log(`Only ${tablesFound}/5 core tables found. Database setup may be incomplete.\n`);
    } else {
      console.log('STATUS: ✗ DATABASE NOT INITIALIZED\n');
      console.log('No tables found. Database migrations have not been executed.\n');
    }

    console.log('Next Steps:');
    console.log('───────────\n');

    if (tablesFound === 0) {
      console.log('1. The database has not been initialized yet.');
      console.log('   Action: Run database migrations from Supabase SQL Editor\n');
      console.log('2. Get SUPABASE_SERVICE_ROLE_KEY from Dashboard');
      console.log('   - Go to Settings > API Keys');
      console.log('   - Copy "service_role" key (NOT the anon key)\n');
      console.log('3. Update .env file:');
      console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key\n');
      console.log('4. Run migrations:');
      console.log('   node execute_production_activation.js\n');
    } else if (tablesFound >= 5) {
      console.log('1. Database is initialized. Check data status:\n');
      console.log('   node test-supabase-connection.js\n');
      console.log('2. If writers table is empty, seed data:');
      console.log('   SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/seed_writer_data.js\n');
      console.log('3. Test writer queries:');
      console.log('   node scripts/generate_agent_prompt.js sarah\n');
    }

    console.log('API Key Information:');
    console.log('────────────────────\n');
    console.log(`Key Type Being Tested: Anon/Publishable`);
    console.log(`Appropriate for: Client-side queries, frontend apps`);
    console.log(`Has write access: No (RLS policies control this)\n`);
    console.log(`Service Role Key: Use for server-side operations, migrations`);
    console.log(`Location: Supabase Dashboard > Settings > API Keys\n`);

  } catch (error) {
    console.error('\nFATAL ERROR:');
    console.error(error.message);
    process.exit(1);
  }
}

runTests();

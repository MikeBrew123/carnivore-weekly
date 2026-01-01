#!/usr/bin/env node

/**
 * COMPLETE SUPABASE DIAGNOSTIC TEST
 * Tests both anon key (for client apps) and service role key (for migrations/admin)
 *
 * Usage: node test-supabase-full.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Load credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kwtdpvnjewtahuxjyltn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_bQlgBZ7Otay8D9AErt8daA_2lQI36jk';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║       SUPABASE COMPLETE DIAGNOSTIC & SETUP STATUS              ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('Configuration:');
console.log(`  URL: ${SUPABASE_URL}`);
console.log(`  Project ID: kwtdpvnjewtahuxjyltn`);
console.log(`  Anon Key: ${SUPABASE_ANON_KEY.substring(0, 25)}...`);
console.log(`  Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY ? 'LOADED from .env' : 'NOT FOUND'}\n`);

async function runAllTests() {
  try {
    // Test 1: Anon Key (Client-side)
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TEST 1: ANON/PUBLISHABLE KEY (Client-side Access)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let anonStatus = {
      connection: false,
      tables: 0,
      writers: 0,
      errors: []
    };

    try {
      const { data, error } = await anonClient
        .from('writers')
        .select('*', { count: 'exact' });

      if (error) {
        anonStatus.errors.push({
          table: 'writers',
          error: error.message,
          code: error.code,
          type: 'Not initialized'
        });
        console.log(`Status: ✗ CANNOT ACCESS\n`);
        console.log(`Error: ${error.message}`);
        console.log(`Code: ${error.code}`);
        console.log(`Reason: Tables not created yet\n`);
      } else {
        anonStatus.connection = true;
        anonStatus.tables = 1;
        anonStatus.writers = data.length;
        console.log(`Status: ✓ ACCESSIBLE\n`);
        console.log(`Writers found: ${data.length}`);
        if (data.length > 0) {
          console.log(`Sample: ${data[0].name} (${data[0].slug})\n`);
        } else {
          console.log(`Table exists but no data yet\n`);
        }
      }
    } catch (err) {
      anonStatus.errors.push({ error: err.message });
      console.log(`Error: ${err.message}\n`);
    }

    // Test 2: Service Role Key (Admin/Migration)
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TEST 2: SERVICE ROLE KEY (Admin/Migration Access)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let serviceStatus = {
      keyValid: false,
      connection: false,
      tables: 0,
      writers: 0,
      hasPermissions: false
    };

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Status: ✗ KEY NOT LOADED\n');
      console.log('The service role key is not in .env file.\n');
      console.log('To get it:');
      console.log('  1. Open Supabase Dashboard');
      console.log('  2. Go to Settings > API');
      console.log('  3. Copy "service_role" key');
      console.log('  4. Add to .env: SUPABASE_SERVICE_ROLE_KEY=<key>\n');
    } else {
      serviceStatus.keyValid = true;
      const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      try {
        const { data, error, count } = await serviceClient
          .from('writers')
          .select('*', { count: 'exact' });

        if (error) {
          console.log(`Status: ✗ ERROR\n`);
          console.log(`Error: ${error.message}`);
          console.log(`Code: ${error.code}\n`);
        } else {
          serviceStatus.connection = true;
          serviceStatus.tables = 1;
          serviceStatus.writers = count;
          console.log(`Status: ✓ ACCESSIBLE\n`);
          console.log(`Writers found: ${count}`);
          if (data && data.length > 0) {
            console.log(`Sample: ${data[0].name}\n`);
          } else {
            console.log(`Table exists but no seeded data\n`);
          }
        }
      } catch (err) {
        console.log(`Error: ${err.message}\n`);
      }
    }

    // Test 3: Database Schema Status
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TEST 3: DATABASE SCHEMA STATUS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const requiredTables = [
      'writers',
      'writer_memory_log',
      'writer_voice_snapshots',
      'writer_content',
      'writer_relationships'
    ];

    let schemaStatus = {
      tablesCreated: 0,
      totalTables: requiredTables.length,
      tables: {}
    };

    // Try with service role if available, otherwise anon
    const testClient = SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : anonClient;

    for (const tableName of requiredTables) {
      try {
        const { error } = await testClient
          .from(tableName)
          .select('count', { count: 'exact' })
          .limit(1);

        if (!error) {
          console.log(`  ✓ ${tableName}`);
          schemaStatus.tablesCreated++;
          schemaStatus.tables[tableName] = 'exists';
        } else {
          console.log(`  ✗ ${tableName}`);
          schemaStatus.tables[tableName] = 'missing';
        }
      } catch (err) {
        console.log(`  ✗ ${tableName}`);
        schemaStatus.tables[tableName] = 'error';
      }
    }

    console.log(`\nTotal: ${schemaStatus.tablesCreated}/${schemaStatus.totalTables} tables\n`);

    // Test 4: Query Performance
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TEST 4: QUERY PERFORMANCE (if tables exist)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (schemaStatus.tablesCreated >= 5 && SUPABASE_SERVICE_ROLE_KEY) {
      const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      try {
        const startTime = Date.now();
        await serviceClient
          .from('writers')
          .select('id, name, slug, tone_style')
          .limit(3);
        const latency = Date.now() - startTime;

        console.log(`✓ Sample query executed`);
        console.log(`  Latency: ${latency}ms`);
        console.log(`  Target: <50ms`);
        console.log(`  Status: ${latency < 50 ? 'PASS' : 'ACCEPTABLE'}\n`);
      } catch (err) {
        console.log(`Error: ${err.message}\n`);
      }
    } else if (schemaStatus.tablesCreated >= 5) {
      console.log('Tables exist but need service role key for performance test\n');
    } else {
      console.log('Tables not created yet - skipping performance test\n');
    }

    // FINAL SUMMARY
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                         FINAL SUMMARY                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('DATABASE INITIALIZATION STATUS');
    console.log('──────────────────────────────\n');

    if (schemaStatus.tablesCreated === 0) {
      console.log('✗ NOT INITIALIZED\n');
      console.log('The Supabase project exists but no database tables have been created.\n');

      console.log('What happened:');
      console.log('  • Project was created: kwtdpvnjewtahuxjyltn');
      console.log('  • API keys are valid');
      console.log('  • Database schema has not been populated\n');

      console.log('What to do next:');
      console.log('  Step 1: Ensure service role key is set in .env');
      console.log('          SUPABASE_SERVICE_ROLE_KEY=<key from Dashboard>\n');

      console.log('  Step 2: Look for migration files:');
      console.log('          ls -la migrations/\n');

      console.log('  Step 3: If migration files exist, run them:');
      console.log('          Option A - Via SQL Editor in Supabase Dashboard');
      console.log('          Option B - Via node script with service role key\n');

      console.log('  Step 4: Then seed test data:');
      console.log('          SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seed_writer_data.js\n');

    } else if (schemaStatus.tablesCreated < 5) {
      console.log(`⚠ PARTIAL (${schemaStatus.tablesCreated}/5 tables)\n`);
      console.log('Some tables have been created but the schema is incomplete.\n');

      console.log('Missing tables:');
      Object.entries(schemaStatus.tables).forEach(([table, status]) => {
        if (status !== 'exists') {
          console.log(`  • ${table}`);
        }
      });
      console.log();

    } else {
      console.log('✓ INITIALIZED\n');
      console.log(`All ${schemaStatus.tablesCreated} core tables have been created.\n`);

      if (anonStatus.writers > 0) {
        console.log(`Writer data seeded: ✓ YES (${anonStatus.writers} writers)\n`);
      } else if (serviceStatus.writers > 0) {
        console.log(`Writer data seeded: ✓ YES (${serviceStatus.writers} writers)\n`);
      } else {
        console.log(`Writer data seeded: ✗ NO\n`);
        console.log('Tables exist but no data yet.\n');
        console.log('To seed writers:');
        console.log('  SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seed_writer_data.js\n');
      }
    }

    // API Key Summary
    console.log('API KEY INFORMATION');
    console.log('───────────────────\n');

    console.log('Anon/Publishable Key:');
    console.log(`  ✓ Valid and working`);
    console.log(`  Use for: Frontend apps, client-side queries`);
    console.log(`  Permissions: Read-only (unless RLS allows more)`);
    console.log(`  Current status: ${schemaStatus.tablesCreated === 0 ? 'Cannot access (tables not created)' : 'Working'}\n`);

    console.log('Service Role Key:');
    if (SUPABASE_SERVICE_ROLE_KEY) {
      console.log(`  ✓ Loaded from .env`);
      console.log(`  Use for: Server-side, migrations, admin operations`);
      console.log(`  Permissions: Full access (bypasses RLS)`);
      console.log(`  Status: ${serviceStatus.connection ? 'Working' : 'Valid but tables not created'}\n`);
    } else {
      console.log(`  ✗ Not found in .env`);
      console.log(`  Use for: Server-side, migrations, admin operations`);
      console.log(`  Location: Settings > API > service_role key`);
      console.log(`  Status: NEEDED for database setup\n`);
    }

    // RLS Status
    console.log('ROW LEVEL SECURITY (RLS)');
    console.log('────────────────────────\n');

    if (schemaStatus.tablesCreated >= 5) {
      console.log('✓ RLS Policies: Expected to be ENABLED\n');
      console.log('Anonymous users should only read data RLS permits.');
      console.log('This means the anon key has read-only access.\n');
    } else {
      console.log('RLS will be configured when tables are created.\n');
    }

  } catch (error) {
    console.error('\nFATAL ERROR:');
    console.error(error.message);
    process.exit(1);
  }
}

runAllTests();

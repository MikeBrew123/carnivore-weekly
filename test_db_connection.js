#!/usr/bin/env node

require('dotenv').config({ path: '/Users/mbrew/Developer/carnivore-weekly/.env' });
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('Testing Supabase Connection...\n');
  console.log('URL:', SUPABASE_URL ? SUPABASE_URL.split('.')[0] + '...' : 'MISSING');
  console.log('Key:', SUPABASE_SERVICE_ROLE_KEY ? 'FOUND' : 'MISSING');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing credentials!');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  try {
    // Test 1: Can we query a simple RPC?
    console.log('\n1. Testing database responsiveness...');
    const { data, error } = await supabase.rpc('now');
    if (error) {
      console.log('   Result: Error -', error.message);
    } else {
      console.log('   Result: Success');
    }
    
    // Test 2: Try to query writers table
    console.log('\n2. Checking if "writers" table exists...');
    const { data: writers, error: writersError } = await supabase
      .from('writers')
      .select('*', { count: 'exact', head: true });
    
    if (writersError) {
      console.log('   Error:', writersError.message || JSON.stringify(writersError));
    } else {
      console.log('   Success! Table exists with', writers?.length || 0, 'rows');
    }

    // Test 3: Check information_schema
    console.log('\n3. Attempting to query information_schema...');
    try {
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(10);
      
      if (tablesError) {
        console.log('   Error accessing information_schema');
      } else {
        console.log('   Found tables:', tables?.map(t => t.table_name).join(', '));
      }
    } catch (err) {
      console.log('   Cannot access information_schema:', err.message);
    }
    
  } catch (err) {
    console.error('Connection test failed:', err.message);
  }
}

testConnection();

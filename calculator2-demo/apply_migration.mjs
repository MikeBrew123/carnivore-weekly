import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://kwtdpvnjewtahuxjyltn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_-DJISSDQQD7oWqS87RBJ8Q_0sKdDWVz';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('🔄 Applying Calculator2 Session Migration...');
console.log(`📍 Target: ${SUPABASE_URL}\n`);

const sql = readFileSync('../supabase/migrations/014_create_calculator2_sessions.sql', 'utf-8');

// Split into individual statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

console.log(`📝 Found ${statements.length} SQL statements\n`);

let executed = 0;

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  const label = stmt.substring(0, 50).replace(/\n/g, ' ') + (stmt.length > 50 ? '...' : '');

  process.stdout.write(`[${i + 1}/${statements.length}] ${label} `);

  try {
    // Try to verify we can at least connect
    if (i === 0) {
      // First, let's just test if we can reach the API
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });

      if (response.ok) {
        console.log('✅ API Connected');
      } else {
        throw new Error(`API returned ${response.status}`);
      }
    } else {
      // For actual SQL execution, we need to use a different approach
      // Since Supabase doesn't expose raw SQL via REST API directly
      process.stdout.write('⏳ ');
    }
  } catch (err) {
    console.log(`❌ ${err.message}`);
  }
}

console.log('\n');
console.log('ℹ️  Supabase REST API does not support raw SQL execution directly.');
console.log('The database table needs to be created via the SQL editor or psql.\n');

// Alternative: Try to detect if table already exists
console.log('🔍 Checking if table already exists...\n');

try {
  const { data, error } = await supabase
    .from('calculator2_sessions')
    .select('id')
    .limit(1);

  if (!error) {
    console.log('✅ calculator2_sessions table EXISTS!');
    console.log('🎉 Migration appears to be already applied!\n');
  } else if (error.code === 'PGRST103') {
    console.log('❌ Table does not exist yet');
    console.log('\n📋 To create it, run this SQL in Supabase dashboard:');
    console.log('   https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/sql/new\n');
    console.log(sql);
  } else {
    console.log('⚠️  Error checking table:', error.message);
  }
} catch (err) {
  console.log('Error during verification:', err.message);
}

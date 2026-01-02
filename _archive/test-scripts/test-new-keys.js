require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('Testing with new keys...\n');
console.log('URL:', process.env.SUPABASE_URL);
console.log('Anon key:', process.env.SUPABASE_KEY?.substring(0, 20) + '...');
console.log('Service role key:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...\n');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

(async () => {
  try {
    console.log('Attempting to query writers table...');
    const { data, error, count, status } = await supabase
      .from('writers')
      .select('*', { count: 'exact', head: true });

    console.log('Status:', status);
    console.log('Data:', data);
    console.log('Count:', count);
    console.log('Error:', error);
    
    if (error) {
      console.log('\nError details:');
      console.log('  Code:', error.code);
      console.log('  Message:', error.message);
      console.log('  Details:', error.details);
      console.log('  Hint:', error.hint);
      console.log('Full object:', JSON.stringify(error, null, 2));
    }
  } catch (e) {
    console.log('Exception:', e.message);
    console.log('Stack:', e.stack);
  }
})();

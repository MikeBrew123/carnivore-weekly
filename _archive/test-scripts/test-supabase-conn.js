require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', SUPABASE_URL);
console.log('Key starts with:', SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) + '...');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

(async () => {
  try {
    console.log('\nAttempting to query writers table...');
    const { data, error, count } = await supabase
      .from('writers')
      .select('*', { count: 'exact', head: true });

    console.log('\nResponse received:');
    console.log('Data:', data);
    console.log('Count:', count);
    if (error) {
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      console.log('Full error:', JSON.stringify(error, null, 2));
    }
  } catch (err) {
    console.log('\nCaught exception:');
    console.log('Message:', err.message);
    console.log('Stack:', err.stack);
  }
})();

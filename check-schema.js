require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

(async () => {
  try {
    console.log('Querying information_schema to check if tables exist...\n');
    
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (error) {
      console.log('Error:', error);
    } else if (data) {
      console.log(`Found ${data.length} tables:\n`);
      data.forEach(t => console.log(`  - ${t.table_name}`));
    } else {
      console.log('No data returned');
    }
  } catch (e) {
    console.log('Exception:', e.message);
  }
})();

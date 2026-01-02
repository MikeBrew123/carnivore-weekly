const https = require('https');
require('dotenv').config();

const PROJECT_ID = 'kwtdpvnjewtahuxjyltn';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Checking tables via REST API...\n');

const options = {
  hostname: `${PROJECT_ID}.supabase.co`,
  port: 443,
  path: `/rest/v1/information_schema.tables?table_schema=eq.public`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'apikey': SERVICE_ROLE_KEY,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}\n`);
    try {
      const tables = JSON.parse(data);
      if (Array.isArray(tables) && tables.length > 0) {
        console.log(`✅ Found ${tables.length} tables:\n`);
        tables.forEach(t => console.log(`   ${t.table_name}`));
      } else if (Array.isArray(tables)) {
        console.log('❌ No tables found in public schema');
      } else {
        console.log('Response:', data);
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => console.error(`Error: ${e.message}`));
req.end();

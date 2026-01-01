const https = require('https');
require('dotenv').config();

const PROJECT_ID = 'kwtdpvnjewtahuxjyltn';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;

console.log('Querying Supabase information_schema via REST API...\n');

const options = {
  hostname: `${PROJECT_ID}.supabase.co`,
  port: 443,
  path: `/rest/v1/information_schema.tables?table_schema=eq.public&select=table_name`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
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
      if (Array.isArray(tables)) {
        console.log(`Found ${tables.length} tables in public schema:\n`);
        tables.forEach(t => console.log(`✅ ${t.table_name}`));
      } else {
        console.log('Response:', data);
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.end();

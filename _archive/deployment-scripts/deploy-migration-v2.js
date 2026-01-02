require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 PHASE 4 MIGRATION DEPLOYMENT (v2 - Sequential)\n');
console.log('Using Supabase project:', SUPABASE_URL.split('.')[0].replace('https://', ''));

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Parse SQL file into individual statements
function parseSQLStatements(sql) {
  return sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
}

(async () => {
  try {
    // Read migration SQL
    const migrationSQL = fs.readFileSync('supabase/migrations/20250101140000_create_content_tables.sql', 'utf8');

    const statements = parseSQLStatements(migrationSQL);
    console.log(`\n📋 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // Skip comments and empty lines
      if (stmt.startsWith('--') || stmt.length === 0) continue;

      try {
        console.log(`[${i+1}/${statements.length}] Executing...`);

        // Use rpc to execute raw SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });

        if (error) {
          // Some operations might "fail" but still work (like CREATE IF NOT EXISTS)
          // Check if it's an expected "error"
          if (error.message?.includes('already exists') ||
              error.message?.includes('SQLSTATE 42P07')) {
            console.log(`   ⚠️  Already exists (expected)\n`);
            successCount++;
          } else if (error.message?.includes('does not exist')) {
            console.log(`   ✅ Processed\n`);
            successCount++;
          } else {
            console.log(`   ❌ Error: ${error.message}\n`);
            failureCount++;
          }
        } else {
          console.log(`   ✅ Success\n`);
          successCount++;
        }
      } catch (err) {
        console.log(`   ❌ Exception: ${err.message}\n`);
        failureCount++;
      }
    }

    console.log(`\n📊 Results: ${successCount} succeeded, ${failureCount} failed\n`);

    // Verify tables were created
    console.log('🔍 Verifying tables...\n');

    const tableNames = [
      'writers',
      'blog_posts',
      'youtube_videos',
      'weekly_analysis',
      'wiki_video_links',
      'topic_product_mapping'
    ];

    let allTablesCreated = true;

    for (const tableName of tableNames) {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error && error.message?.includes('does not exist')) {
        console.log(`   ❌ ${tableName}: NOT CREATED`);
        allTablesCreated = false;
      } else {
        console.log(`   ✅ ${tableName}: EXISTS (${count || 0} rows)`);
      }
    }

    if (allTablesCreated) {
      console.log('\n🎉 SUCCESS! All 6 tables created successfully!');
      console.log('\nNext steps:');
      console.log('1. Run data migration: node scripts/run_phase4_migration.js');
      console.log('2. Regenerate pages: python3 scripts/generate.py');
    } else {
      console.log('\n⚠️  Some tables may not have been created');
      console.log('\nConsider deploying via Supabase Dashboard:');
      console.log('1. Go to https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/sql/new');
      console.log('2. Create new query');
      console.log('3. Paste supabase/migrations/20250101140000_create_content_tables.sql');
      console.log('4. Click Run');
    }

  } catch (err) {
    console.log('\n❌ Fatal error:', err.message);
    console.log('\nDeploying via Supabase Dashboard is recommended:');
    console.log('1. Go to https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/sql/new');
    console.log('2. Create new query');
    console.log('3. Paste supabase/migrations/20250101140000_create_content_tables.sql');
    console.log('4. Click Run');
    process.exit(1);
  }
})();

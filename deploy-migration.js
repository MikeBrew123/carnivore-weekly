require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 PHASE 4 MIGRATION DEPLOYMENT\n');
console.log('Using Supabase project:', SUPABASE_URL.split('.')[0].replace('https://', ''));

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

(async () => {
  try {
    // Read migration SQL
    const migrationSQL = fs.readFileSync('supabase/migrations/20250101140000_create_content_tables.sql', 'utf8');

    console.log('\n📋 Migration SQL loaded (300+ lines)');
    console.log('This will create 6 tables with 20+ indexes and RLS policies\n');

    // Execute migration using sql parameter
    console.log('⏳ Executing migration...');
    const { data, error } = await supabase.rpc('exec', { sql: migrationSQL });

    if (error) {
      console.log('\n❌ Migration FAILED:');
      console.log('Error:', error.message);
      console.log('Code:', error.code);
      process.exit(1);
    }

    console.log('✅ Migration SQL executed successfully!\n');

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
      console.log('Run diagnostic: node scripts/diagnose_supabase.js');
    }

  } catch (err) {
    console.log('\n❌ Deployment error:', err.message);
    console.log('\nNote: exec() RPC may not be available.');
    console.log('Consider deploying via Supabase Dashboard instead:');
    console.log('1. Go to https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/sql/new');
    console.log('2. Create new query');
    console.log('3. Paste supabase/migrations/20250101140000_create_content_tables.sql');
    console.log('4. Click Run');
    process.exit(1);
  }
})();

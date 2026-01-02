require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

(async () => {
  console.log('Testing each table individually...\n');

  const tables = ['writers', 'blog_posts', 'youtube_videos', 'weekly_analysis', 'wiki_video_links', 'topic_product_mapping'];

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`${table}:`);
        console.log(`  Error Code: ${error.code}`);
        console.log(`  Error Message: "${error.message}"`);
        console.log(`  Full Error:`, JSON.stringify(error, null, 2));
      } else {
        console.log(`✅ ${table}: EXISTS (${count} rows)`);
      }
    } catch (e) {
      console.log(`❌ ${table}: Exception - ${e.message}`);
    }
    console.log();
  }
})();

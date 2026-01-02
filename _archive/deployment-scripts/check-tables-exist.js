#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

(async () => {
  console.log('Checking for tables by attempting queries...\n');

  const tables = ['writers', 'blog_posts', 'youtube_videos', 'weekly_analysis', 'wiki_video_links', 'topic_product_mapping'];

  for (const tableName of tables) {
    try {
      const result = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      const { data, error, count } = result;

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`❌ ${tableName}: DOES NOT EXIST`);
        } else {
          console.log(`⚠️  ${tableName}: Error - ${error.message} (code: ${error.code})`);
        }
      } else {
        console.log(`✅ ${tableName}: EXISTS`);
      }
    } catch (e) {
      console.log(`❌ ${tableName}: Exception - ${e.message}`);
    }
  }
})();

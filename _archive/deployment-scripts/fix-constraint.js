#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

(async () => {
  try {
    console.log('Fixing blog_posts category constraint...\n');

    // First drop the old constraint
    const { error: dropError } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE blog_posts DROP CONSTRAINT valid_category;'
    });

    if (dropError && !dropError.message?.includes('does not exist')) {
      console.log('Drop error:', dropError);
    }

    // Add new constraint
    const { error: addError } = await supabase.rpc('exec', {
      sql: "ALTER TABLE blog_posts ADD CONSTRAINT valid_category CHECK (category IN ('health', 'protocol', 'community', 'strategy', 'news', 'featured', 'performance', 'lifestyle'));"
    });

    if (addError) {
      console.log('Add error:', addError);
    } else {
      console.log('✅ Constraint fixed!');
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
})();

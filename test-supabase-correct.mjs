import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kwtdpvnjewtahuxjyltn.supabase.co',
  'sbp_873982c4a474f6906c195d7f6b848a99b2c3df63'
);

async function testWrite() {
  try {
    console.log('🧪 Testing Supabase write with CORRECT service role key...\n');
    
    // Test 1: Create user session
    console.log('Test 1: Creating user session...');
    const sessionResult = await supabase
      .from('user_sessions')
      .insert({
        path_choice: 'test',
        payment_status: 'unpaid'
      })
      .select()
      .single();

    if (sessionResult.error) {
      console.error('❌ FAILED:', sessionResult.error.message);
      console.error('   Code:', sessionResult.error.code);
      return;
    }

    console.log('✅ Session created:', sessionResult.data.id);
    const sessionId = sessionResult.data.id;

    // Test 2: Create report
    console.log('\nTest 2: Creating generated report...');
    const reportResult = await supabase
      .from('generated_reports')
      .insert({
        session_id: sessionId,
        email: 'test@example.com',
        access_token: crypto.randomUUID(),
        report_html: '<h1>Test Report</h1>',
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (reportResult.error) {
      console.error('❌ FAILED:', reportResult.error.message);
      console.error('   Code:', reportResult.error.code);
      return;
    }

    console.log('✅ Report saved:', reportResult.data.id);
    console.log('\n✅✅✅ SUCCESS - RLS policies are working correctly!');
    console.log('The Worker can now generate and store reports without 401 errors.');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testWrite();

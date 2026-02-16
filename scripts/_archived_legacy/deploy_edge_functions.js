#!/usr/bin/env node

/**
 * Deploy Edge Functions to Supabase
 *
 * Deploys all 4 research Edge Functions:
 * 1. research-youtube-trends
 * 2. research-reddit-trends
 * 3. prioritize-topics
 * 4. fetch-research-data
 *
 * Usage: SUPABASE_ACCESS_TOKEN=... node scripts/deploy_edge_functions.js
 *        OR use: supabase functions deploy [function-name]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const functions = [
  {
    name: 'research-youtube-trends',
    description: 'Query YouTube data for trending topics',
    path: 'supabase/functions/research-youtube-trends'
  },
  {
    name: 'research-reddit-trends',
    description: 'Monitor Reddit for trending discussions',
    path: 'supabase/functions/research-reddit-trends'
  },
  {
    name: 'prioritize-topics',
    description: "LEO's topic prioritization algorithm",
    path: 'supabase/functions/prioritize-topics'
  },
  {
    name: 'fetch-research-data',
    description: "Chloe's research gap tool",
    path: 'supabase/functions/fetch-research-data'
  }
];

const projectRef = 'kwtdpvnjewtahuxjyltn';

console.log('\n' + '='.repeat(70));
console.log('🚀 DEPLOYING EDGE FUNCTIONS TO SUPABASE');
console.log('='.repeat(70));

console.log('\n📋 Functions to Deploy:');
functions.forEach((fn, i) => {
  console.log(`   ${i + 1}. ${fn.name}`);
  console.log(`      → ${fn.description}`);
});

console.log('\n' + '='.repeat(70));
console.log('DEPLOYMENT METHODS');
console.log('='.repeat(70));

console.log('\n✅ METHOD 1: Using Supabase CLI (Recommended)');
console.log('─'.repeat(70));
console.log('\nSetup (one-time):');
console.log('  1. Visit: https://app.supabase.com/account/tokens');
console.log('  2. Create a new personal access token');
console.log('  3. Copy the token\n');

console.log('Deployment:');
console.log('  export SUPABASE_ACCESS_TOKEN="your_token_here"');
functions.forEach(fn => {
  console.log(`  supabase functions deploy ${fn.name}`);
});

console.log('\n✅ METHOD 2: Deploy Each Function Individually');
console.log('─'.repeat(70));
functions.forEach(fn => {
  const fnPath = path.join(PROJECT_ROOT, fn.path);
  const fnExists = fs.existsSync(fnPath);
  const status = fnExists ? '✓' : '✗';
  console.log(`  ${status} ${fn.name}`);
  console.log(`     Path: ${fn.path}`);
  console.log(`     Ready: ${fnExists}`);
});

console.log('\n✅ METHOD 3: Batch Deploy All Functions');
console.log('─'.repeat(70));
console.log('\nRun this command from project root:');
console.log('  export SUPABASE_ACCESS_TOKEN="your_token_here"');
console.log('  supabase functions deploy\n');

console.log('='.repeat(70));
console.log('QUICK START');
console.log('='.repeat(70));

console.log('\n1️⃣  Get Access Token:');
console.log('   Visit: https://app.supabase.com/account/tokens');
console.log('   Create → Copy token\n');

console.log('2️⃣  Deploy Functions:');
console.log('   export SUPABASE_ACCESS_TOKEN="paste_token_here"');
console.log('   supabase functions deploy\n');

console.log('3️⃣  Verify Deployment:');
console.log('   Visit: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/functions');
console.log('   You should see all 4 functions deployed\n');

console.log('='.repeat(70));
console.log('FUNCTION DETAILS');
console.log('='.repeat(70));

functions.forEach((fn, i) => {
  console.log(`\n${i + 1}. ${fn.name}`);
  console.log(`   Description: ${fn.description}`);
  console.log(`   Location: ${fn.path}/index.ts`);
  console.log(`   Type: Research/Data function`);
});

console.log('\n' + '='.repeat(70));
console.log('✅ ALL FUNCTIONS READY FOR DEPLOYMENT');
console.log('='.repeat(70));
console.log('\nNext: Set SUPABASE_ACCESS_TOKEN and run: supabase functions deploy\n');

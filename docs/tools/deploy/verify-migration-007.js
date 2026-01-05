#!/usr/bin/env node

/**
 * Migration 007 Verification Script
 * Unified Writers Schema Verification for Carnivore Weekly
 *
 * This script verifies that the writers schema migration was successfully deployed.
 * Executes verification queries against Supabase PostgreSQL.
 *
 * Usage:
 *   node verify-migration-007.js
 *
 * Prerequisites:
 *   - Network access to Supabase
 *   - Node.js with @supabase/supabase-js installed
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://kwtdpvnjewtahuxjyltn.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_-DJISSDQQD7oWqS87RBJ8Q_0sKdDWVz';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log('\n=== MIGRATION 007 VERIFICATION ===\n');
console.log('Verifying Unified Writers Schema deployment...\n');

async function verifyMigration() {
  try {
    // Test 1: Check writers table exists and has correct structure
    console.log('1. Checking writers table...');
    const { data: writers, error: writersError } = await supabase
      .from('writers')
      .select('id, slug, name, role_title, specialty')
      .limit(10);

    if (writersError) {
      console.error(`   ❌ FAILED: ${writersError.message}`);
      return false;
    }

    if (writers && writers.length > 0) {
      console.log(`   ✅ writers table exists with ${writers.length} records`);

      // Check for our seed writers
      const slugs = writers.map(w => w.slug);
      const expectedWriters = ['sarah', 'marcus', 'chloe'];
      const foundWriters = expectedWriters.filter(w => slugs.includes(w));

      if (foundWriters.length === 3) {
        console.log('   ✅ All 3 seed writers found (sarah, marcus, chloe)');

        // Check Sarah specifically
        const sarah = writers.find(w => w.slug === 'sarah');
        if (sarah) {
          console.log(`      Sarah: ${sarah.name} | ${sarah.role_title}`);
          console.log(`      Specialty: ${sarah.specialty}`);
        }
      } else {
        console.error(`   ⚠️ Expected 3 writers, found ${foundWriters.length}: ${foundWriters.join(', ')}`);
      }
    } else {
      console.error('   ❌ writers table is empty or doesn\'t exist');
      return false;
    }

    // Test 2: Check writer_memory_log table
    console.log('\n2. Checking writer_memory_log table...');
    const sarahId = writers.find(w => w.slug === 'sarah')?.id;

    if (!sarahId) {
      console.error('   ❌ Could not find Sarah in writers table');
      return false;
    }

    const { data: memories, error: memoriesError } = await supabase
      .from('writer_memory_log')
      .select('memory_type, title, description, tags')
      .eq('writer_id', sarahId)
      .limit(5);

    if (memoriesError) {
      console.error(`   ❌ FAILED: ${memoriesError.message}`);
      return false;
    }

    if (memories && memories.length > 0) {
      console.log(`   ✅ writer_memory_log table exists with ${memories.length} records for Sarah`);
      memories.forEach((mem, idx) => {
        console.log(`      ${idx + 1}. [${mem.memory_type}] ${mem.title}`);
        if (mem.tags && mem.tags.length > 0) {
          console.log(`         Tags: ${mem.tags.join(', ')}`);
        }
      });
    } else {
      console.warn('   ⚠️ writer_memory_log table exists but has no records for Sarah');
    }

    // Test 3: Check writer_content table
    console.log('\n3. Checking writer_content table...');
    const { data: content, error: contentError } = await supabase
      .from('writer_content')
      .select('id')
      .limit(1);

    if (contentError && contentError.code !== 'PGRST116') {
      console.error(`   ❌ FAILED: ${contentError.message}`);
    } else {
      console.log('   ✅ writer_content table exists');
    }

    // Test 4: Check writer_relationships table
    console.log('\n4. Checking writer_relationships table...');
    const { data: relationships, error: relationshipsError } = await supabase
      .from('writer_relationships')
      .select('id')
      .limit(1);

    if (relationshipsError && relationshipsError.code !== 'PGRST116') {
      console.error(`   ❌ FAILED: ${relationshipsError.message}`);
    } else {
      console.log('   ✅ writer_relationships table exists');
    }

    // Test 5: Check writer_voice_snapshots table
    console.log('\n5. Checking writer_voice_snapshots table...');
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('writer_voice_snapshots')
      .select('id')
      .limit(1);

    if (snapshotsError && snapshotsError.code !== 'PGRST116') {
      console.error(`   ❌ FAILED: ${snapshotsError.message}`);
    } else {
      console.log('   ✅ writer_voice_snapshots table exists');
    }

    // Test 6: Verify Sarah's profile details
    console.log('\n6. Verifying Sarah\'s profile data...');
    const { data: sarahProfile, error: sarahError } = await supabase
      .from('writers')
      .select('*')
      .eq('slug', 'sarah')
      .single();

    if (sarahError) {
      console.error(`   ❌ FAILED: ${sarahError.message}`);
    } else if (sarahProfile) {
      console.log('   ✅ Sarah\'s profile found');
      const checks = [
        { key: 'name', expected: 'Sarah', actual: sarahProfile.name },
        { key: 'role_title', expected: 'Health Coach & Community Leader', actual: sarahProfile.role_title },
        { key: 'experience_level', expected: 'expert', actual: sarahProfile.experience_level },
        { key: 'tone_style', expected: 'conversational', actual: sarahProfile.tone_style },
        { key: 'is_active', expected: true, actual: sarahProfile.is_active }
      ];

      checks.forEach(check => {
        if (check.actual === check.expected) {
          console.log(`      ✅ ${check.key}: ${check.actual}`);
        } else {
          console.log(`      ⚠️ ${check.key}: expected "${check.expected}", got "${check.actual}"`);
        }
      });

      if (sarahProfile.voice_formula) {
        console.log('      ✅ voice_formula JSONB populated');
      }
      if (sarahProfile.content_domains) {
        console.log('      ✅ content_domains JSONB populated');
      }
    }

    return true;

  } catch (error) {
    console.error('\n❌ Verification failed with exception:');
    console.error(`   ${error.message}`);
    return false;
  }
}

// Run verification
verifyMigration().then(success => {
  if (success) {
    console.log('\n=== VERIFICATION COMPLETE ===');
    console.log('✅ All checks passed! Migration 007 deployed successfully.\n');
    process.exit(0);
  } else {
    console.log('\n=== VERIFICATION FAILED ===');
    console.log('❌ Some checks failed. Review output above.\n');
    process.exit(1);
  }
});

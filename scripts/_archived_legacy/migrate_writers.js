#!/usr/bin/env node

/**
 * Migrate Writers/Personas from JSON to Supabase
 * Loads data/personas.json into writers table
 * Usage: node scripts/migrate_writers.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function migrateWriters() {
  console.log('📚 Migrating Writers/Personas to Supabase\n');

  // Load personas from JSON
  const personasFile = path.join(__dirname, '../data/personas.json');
  const personasData = JSON.parse(fs.readFileSync(personasFile, 'utf8'));

  const writers = [];
  const personas = personasData.personas;
  const assignmentRules = personasData.assignment_rules;

  // Transform personas to writers format
  for (const [slug, persona] of Object.entries(personas)) {
    writers.push({
      slug,
      name: persona.name,
      title: persona.title,
      subtitle: persona.subtitle,
      signature: persona.signature,
      backstory: persona.backstory,
      personality: persona.personality,
      hobbies: persona.hobbies,
      pet_name: persona.pet,
      expertise_areas: [],
      tech_interests: persona.tech_interests,
      writing_style: persona.writing_style,
      assignment_rules: extractAssignmentRulesForWriter(slug, assignmentRules),
      is_active: true
    });
  }

  console.log(`📋 Found ${writers.length} writers to migrate\n`);

  // Insert writers into Supabase
  const { data, error } = await supabase
    .from('writers')
    .upsert(writers, { onConflict: 'slug' })
    .select();

  if (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  console.log(`✅ Successfully migrated ${data.length} writers\n`);

  console.log('📊 Migrated Writers:');
  data.forEach(writer => {
    console.log(`   • ${writer.name} (@${writer.slug})`);
  });

  console.log('\n✨ Writers migration complete!');
  return data;
}

function extractAssignmentRulesForWriter(writerSlug, assignmentRules) {
  const rules = {};

  // Look through all assignment categories
  for (const [category, assignments] of Object.entries(assignmentRules)) {
    for (const [section, assignedWriter] of Object.entries(assignments)) {
      if (assignedWriter === writerSlug) {
        rules[section] = category;
      }
    }
  }

  return Object.keys(rules).length > 0 ? rules : null;
}

// Run migration
migrateWriters().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * Agent Prompt Generation System
 *
 * Generates optimized writer prompts (~300 tokens vs 10,000 before)
 * by fetching writer context from Supabase and combining with recent
 * memory log entries (last 5 lessons learned).
 *
 * This reduces token overhead by 97% while preserving writer voice
 * and learnings, enabling more efficient agent-based content generation.
 *
 * Phase 2 of Agent Token Optimization Plan
 * Author: Claude Code
 * Date: 2025-12-31
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// ============================================================================
// CONFIGURATION & VALIDATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Validate environment variables before proceeding
 */
function validateEnvironment() {
  const errors = [];

  if (!SUPABASE_URL) {
    errors.push('SUPABASE_URL environment variable not set');
  }

  if (!SUPABASE_SERVICE_KEY) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  }

  if (errors.length > 0) {
    console.error('Environment Configuration Error:');
    errors.forEach((error) => console.error(`  - ${error}`));
    console.error('\nPlease ensure your .env file includes:');
    console.error('  SUPABASE_URL=<your-supabase-url>');
    console.error('  SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>');
    process.exit(1);
  }

  console.log('✓ Environment variables validated');
}

// ============================================================================
// SUPABASE CLIENT INITIALIZATION
// ============================================================================

/**
 * Initialize Supabase client with service role credentials
 * Service role has unrestricted access for backend operations
 *
 * @returns {Object} Authenticated Supabase client
 */
function initializeSupabaseClient() {
  try {
    const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      // Disable real-time subscriptions for backend script
      realtime: {
        enabled: false,
      },
    });

    console.log('✓ Supabase client initialized with service role credentials');
    return client;
  } catch (error) {
    console.error('✗ Failed to initialize Supabase client:', error.message);
    process.exit(1);
  }
}

// ============================================================================
// WRITER CONTEXT RETRIEVAL
// ============================================================================

/**
 * Fetch writer profile from database
 *
 * Retrieves essential writer context fields:
 * - name: Writer's display name
 * - role_title: Professional role (e.g., "Health Coach")
 * - tagline: Short description of writer's value
 * - voice_formula: JSON structure defining tone and style
 * - content_domains: Array of expertise areas
 * - philosophy: Core beliefs/approach to writing
 *
 * @param {Object} supabase - Authenticated Supabase client
 * @param {string} writerSlug - URL-safe writer identifier (e.g., "sarah", "marcus", "chloe")
 * @returns {Promise<Object>} Writer profile object
 * @throws {Error} If writer not found or query fails
 */
async function fetchWriterProfile(supabase, writerSlug) {
  console.log(`\n📝 Fetching writer profile for: ${writerSlug}`);

  try {
    const { data, error } = await supabase
      .from('writers')
      .select(`
        id,
        slug,
        name,
        role_title,
        tagline,
        voice_formula,
        content_domains,
        philosophy,
        created_at,
        updated_at
      `)
      .eq('slug', writerSlug.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - writer not found
        throw new Error(
          `Writer "${writerSlug}" not found in database. ` +
          `Ensure the writer exists with is_active=true and correct slug.`
        );
      }
      throw new Error(`Database query failed: ${error.message}`);
    }

    if (!data) {
      throw new Error(
        `Writer "${writerSlug}" not found. ` +
        `Available writers must be created in the writers table first.`
      );
    }

    console.log(`  ✓ Profile found: ${data.name} (${data.role_title})`);
    return data;

  } catch (error) {
    console.error(`✗ Error fetching writer profile: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch recent writer memory log entries
 *
 * Retrieves the 5 most recent entries from writer's learning log.
 * Memory entries capture:
 * - What was learned from recent content work
 * - What to avoid doing again
 * - Patterns in successful writing
 * - Audience feedback and reactions
 *
 * This allows the agent to apply lessons without retraining.
 * Limited to 5 entries to keep prompt concise while capturing recent context.
 *
 * @param {Object} supabase - Authenticated Supabase client
 * @param {number} writerId - Writer's database ID
 * @returns {Promise<Array>} Array of memory log entries (most recent first)
 */
async function fetchWriterMemoryLog(supabase, writerId) {
  console.log(`\n💭 Fetching recent memory log entries for writer ID: ${writerId}`);

  try {
    const { data, error } = await supabase
      .from('writer_memory_log')
      .select(`
        id,
        writer_id,
        lesson_type,
        content,
        source_content_id,
        tags,
        created_at
      `)
      .eq('writer_id', writerId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      throw new Error(`Memory log query failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log(`  ℹ No memory log entries yet (this is normal for new writers)`);
      return [];
    }

    console.log(`  ✓ Retrieved ${data.length} memory log entries`);
    return data;

  } catch (error) {
    console.error(`✗ Error fetching memory log: ${error.message}`);
    // Non-fatal - continue with empty memory log
    return [];
  }
}

// ============================================================================
// PROMPT BUILDING
// ============================================================================

/**
 * Build minimal optimized prompt for writer agent
 *
 * Combines writer identity, voice formula, recent learnings, and topic
 * into a ~300 token prompt (vs 10,000 tokens before optimization).
 *
 * Structure:
 * 1. Writer identity section (name, role, tagline)
 * 2. Voice formula (how to write as this person)
 * 3. Content domains (what they write about)
 * 4. Philosophy (why they write this way)
 * 5. Lessons learned (recent memory entries)
 * 6. Task (what to write and why)
 *
 * All sections are concise to minimize token usage while preserving
 * writer's unique voice and recent contextual learnings.
 *
 * @param {Object} writerProfile - Writer profile from database
 * @param {Array} memoryLog - Recent memory log entries
 * @param {string} topic - Topic/task for content generation
 * @returns {string} Complete prompt text ready for Claude API
 */
function buildOptimizedPrompt(writerProfile, memoryLog, topic) {
  console.log('\n🔨 Building optimized prompt...');

  // Parse voice formula if it's a JSON string
  let voiceFormula = writerProfile.voice_formula;
  if (typeof voiceFormula === 'string') {
    try {
      voiceFormula = JSON.parse(voiceFormula);
    } catch {
      voiceFormula = {};
    }
  }

  // Build the prompt sections
  const sections = [];

  // SECTION 1: Writer Identity
  sections.push(
    `# ${writerProfile.name.toUpperCase()} - CONTENT CREATION BRIEF\n` +
    `**Role:** ${writerProfile.role_title}\n` +
    `**Tagline:** ${writerProfile.tagline}\n`
  );

  // SECTION 2: Voice Formula
  if (voiceFormula && Object.keys(voiceFormula).length > 0) {
    sections.push('## VOICE FORMULA');

    if (voiceFormula.tone) {
      sections.push(`**Tone:** ${voiceFormula.tone}`);
    }

    if (voiceFormula.signature_phrases && Array.isArray(voiceFormula.signature_phrases)) {
      sections.push(`**Signature Phrases:** ${voiceFormula.signature_phrases.join(', ')}`);
    }

    if (voiceFormula.engagement_techniques && Array.isArray(voiceFormula.engagement_techniques)) {
      sections.push(`**Engagement:** ${voiceFormula.engagement_techniques.join(', ')}`);
    }

    if (voiceFormula.writing_principles && Array.isArray(voiceFormula.writing_principles)) {
      sections.push(`**Principles:**`);
      voiceFormula.writing_principles.forEach((principle) => {
        sections.push(`  - ${principle}`);
      });
    }

    sections.push('');
  }

  // SECTION 3: Content Domains
  if (writerProfile.content_domains && Array.isArray(writerProfile.content_domains)) {
    sections.push('## EXPERTISE AREAS');
    writerProfile.content_domains.forEach((domain) => {
      sections.push(`  - ${domain}`);
    });
    sections.push('');
  }

  // SECTION 4: Philosophy
  if (writerProfile.philosophy) {
    sections.push('## WRITING PHILOSOPHY');
    sections.push(writerProfile.philosophy);
    sections.push('');
  }

  // SECTION 5: Recent Lessons Learned
  if (memoryLog && memoryLog.length > 0) {
    sections.push('## RECENT LEARNINGS FROM PAST CONTENT');
    sections.push('Apply these insights to similar situations:\n');

    memoryLog.forEach((entry, index) => {
      sections.push(`**Lesson ${index + 1}** (${entry.lesson_type}):`);
      sections.push(entry.content);

      if (entry.tags && Array.isArray(entry.tags) && entry.tags.length > 0) {
        sections.push(`*Tags: ${entry.tags.join(', ')}*`);
      }

      sections.push('');
    });
  }

  // SECTION 6: Task Assignment
  sections.push('## TODAY\'S TASK');
  sections.push(`Write content about: ${topic}\n`);
  sections.push('Remember to:');
  sections.push('  1. Use your authentic voice and established patterns');
  sections.push('  2. Apply lessons learned from recent content');
  sections.push('  3. Focus on expertise areas where you provide real value');
  sections.push('  4. Keep writing conversational and specific (no clichés)');

  // Combine all sections
  const prompt = sections.join('\n').trim();

  console.log(`  ✓ Prompt built (estimated ~${Math.round(prompt.split(' ').length * 1.3)} tokens)`);

  return prompt;
}

/**
 * Count approximate tokens in prompt
 *
 * Uses simple heuristic: ~1.3 tokens per word
 * This is approximate - actual tokenization may vary.
 * More precise counting requires tokenizer library.
 *
 * @param {string} text - Text to count tokens for
 * @returns {number} Approximate token count
 */
function estimateTokenCount(text) {
  const wordCount = text.split(/\s+/).length;
  // Claude typically uses ~1.3 tokens per word as average
  return Math.ceil(wordCount * 1.3);
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Generate optimized writer prompt
 *
 * Main async function that orchestrates:
 * 1. Environment validation
 * 2. Supabase client initialization
 * 3. Writer profile fetching
 * 4. Memory log retrieval
 * 5. Prompt construction
 *
 * This is the primary export for use in other scripts via require().
 *
 * @param {string} writerSlug - URL-safe writer identifier
 * @param {string} topic - Topic/task for content generation
 * @returns {Promise<Object>} Object containing:
 *   - prompt: The generated prompt text
 *   - writerProfile: Complete writer data from database
 *   - memoryLog: Recent lessons learned
 *   - tokenCount: Estimated tokens in prompt
 *
 * @example
 * const { generateWriterPrompt } = require('./generate_agent_prompt.js');
 *
 * try {
 *   const result = await generateWriterPrompt('sarah', 'weight loss challenges');
 *   console.log(`Prompt uses ~${result.tokenCount} tokens`);
 *   console.log(result.prompt);
 * } catch (error) {
 *   console.error('Failed to generate prompt:', error.message);
 * }
 */
async function generateWriterPrompt(writerSlug, topic) {
  try {
    // Validate inputs
    if (!writerSlug || typeof writerSlug !== 'string') {
      throw new Error('writerSlug must be a non-empty string');
    }

    if (!topic || typeof topic !== 'string') {
      throw new Error('topic must be a non-empty string');
    }

    // Validate environment
    validateEnvironment();

    // Initialize client
    const supabase = initializeSupabaseClient();

    // Fetch writer profile
    const writerProfile = await fetchWriterProfile(supabase, writerSlug);

    // Fetch memory log (non-fatal if fails)
    const memoryLog = await fetchWriterMemoryLog(supabase, writerProfile.id);

    // Build prompt
    const prompt = buildOptimizedPrompt(writerProfile, memoryLog, topic);

    // Calculate token count
    const tokenCount = estimateTokenCount(prompt);

    console.log(`\n✓ Prompt generation complete!`);
    console.log(`  Writer: ${writerProfile.name}`);
    console.log(`  Topic: ${topic}`);
    console.log(`  Estimated tokens: ~${tokenCount} (vs ~10,000 before optimization)`);
    console.log(`  Token savings: ${Math.round(((10000 - tokenCount) / 10000) * 100)}%`);

    return {
      prompt,
      writerProfile,
      memoryLog,
      tokenCount,
      estimatedSavings: {
        before: 10000,
        after: tokenCount,
        percentSaved: Math.round(((10000 - tokenCount) / 10000) * 100),
      },
    };

  } catch (error) {
    console.error(`\n✗ Error generating prompt: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// COMMAND LINE INTERFACE (if run directly)
// ============================================================================

/**
 * CLI support for testing/debugging
 *
 * Usage (command-line):
 *   node scripts/generate_agent_prompt.js sarah "weight loss challenges"
 *   node scripts/generate_agent_prompt.js marcus "partnership opportunities"
 *
 * Usage (stdin - secure for subprocess calls):
 *   echo '{"writer":"sarah","topic":"weight loss"}' | node scripts/generate_agent_prompt.js
 */
async function main() {
  const args = process.argv.slice(2);
  let writerSlug, topic;

  try {
    // Check if data is being piped via stdin (secure subprocess pattern)
    if (process.stdin.isTTY === false && args.length === 0) {
      // Read from stdin
      let stdinData = '';
      process.stdin.on('data', (chunk) => {
        stdinData += chunk;
      });

      process.stdin.on('end', async () => {
        try {
          const inputData = JSON.parse(stdinData);
          writerSlug = inputData.writer;
          topic = inputData.topic;

          if (!writerSlug || !topic) {
            throw new Error('stdin must contain valid JSON with "writer" and "topic" fields');
          }

          const result = await generateWriterPrompt(writerSlug, topic);
          console.log(result.prompt);
          console.log(`\nEstimated tokens: ${result.tokenCount}`);
        } catch (error) {
          console.error(`✗ Error: ${error.message}`);
          process.exit(1);
        }
      });
    } else if (args.length >= 2) {
      // Command-line arguments (backward compatible)
      [writerSlug, ...topicParts] = args;
      topic = topicParts.join(' ');

      const result = await generateWriterPrompt(writerSlug, topic);

      console.log('\n' + '='.repeat(70));
      console.log('GENERATED PROMPT');
      console.log('='.repeat(70) + '\n');
      console.log(result.prompt);
      console.log('\n' + '='.repeat(70));
    } else {
      console.log('Generate Agent Prompt - Token-Optimized Writer Brief System\n');
      console.log('Usage (command-line): node generate_agent_prompt.js <writer_slug> <topic>');
      console.log('Usage (stdin): echo \'{"writer":"sarah","topic":"..."}\'  | node generate_agent_prompt.js\n');
      console.log('Examples:');
      console.log('  node generate_agent_prompt.js sarah "weight loss plateaus"');
      console.log('  node generate_agent_prompt.js marcus "partnership strategy"');
      console.log('  node generate_agent_prompt.js chloe "community engagement"');
      console.log('\nWriter Slugs: sarah, marcus, chloe (or custom from database)');
      process.exit(0);
    }
  } catch (error) {
    console.error(`\n✗ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Export for use as module
module.exports = {
  generateWriterPrompt,
  estimateTokenCount,
};

// Run CLI if invoked directly
if (require.main === module) {
  main();
}

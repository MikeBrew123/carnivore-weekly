/**
 * Edge Function Integration Examples
 * Shows how to call Phase 1 Edge Functions from application code
 *
 * These examples replace direct function calls with Edge Function calls
 * for 90% latency reduction
 */

const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ============================================================================
// EXAMPLE 1: Call validate-content Edge Function
// ============================================================================

async function validateContentViaEdgeFunction(content, type = "blog_post") {
  console.log("\n📋 EXAMPLE 1: Validate Content via Edge Function\n");

  try {
    // Initialize Supabase client (use anon key for public functions)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Prepare request
    const request = {
      content,
      type,
    };

    console.log("📤 Request:");
    console.log(`   - Type: ${type}`);
    console.log(`   - Content length: ${content.length} chars\n`);

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke(
      "validate-content",
      {
        body: request,
      }
    );

    if (error) {
      console.error("❌ Error:", error);
      return null;
    }

    // Process response
    console.log("📥 Response:");
    console.log(`   - Valid: ${data.valid}`);
    console.log(`   - Score: ${data.score}/100`);
    console.log(`   - Issues found: ${data.issues.length}`);
    console.log(`   - Warnings: ${data.warnings.length}`);

    if (data.issues.length > 0) {
      console.log("\n   Issues detected:");
      data.issues.forEach((issue) => {
        console.log(`     • [${issue.severity.toUpperCase()}] ${issue.message}`);
      });
    }

    console.log("\n   ✅ Validation complete");
    return data;
  } catch (error) {
    console.error("❌ Error:", error.message);
    return null;
  }
}

// ============================================================================
// EXAMPLE 2: Call generate-writer-prompt Edge Function
// ============================================================================

async function generateWriterPromptViaEdgeFunction(writerSlug, topic) {
  console.log("\n📋 EXAMPLE 2: Generate Writer Prompt via Edge Function\n");

  try {
    // Initialize Supabase client (use service role for admin functions)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Prepare request
    const request = {
      writerSlug,
      topic,
      maxMemoryEntries: 5,
    };

    console.log("📤 Request:");
    console.log(`   - Writer: ${writerSlug}`);
    console.log(`   - Topic: ${topic}`);
    console.log(`   - Max memory entries: 5\n`);

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke(
      "generate-writer-prompt",
      {
        body: request,
      }
    );

    if (error) {
      console.error("❌ Error:", error);
      return null;
    }

    // Process response
    console.log("📥 Response:");
    console.log(`   - Writer: ${data.writerContext.writerName}`);
    console.log(`   - Role: ${data.writerContext.roleTitle}`);
    console.log(`   - Prompt length: ${data.prompt.length} chars`);
    console.log(`   - Token estimate: ${data.tokenEstimate} tokens`);
    console.log(`   - Token savings: ${data.tokenSavings} tokens (${data.savingsPercent}%)`);
    console.log(`   - Content domains: ${data.writerContext.contentDomains.join(", ")}`);

    if (data.writerContext.recentLessons.length > 0) {
      console.log("\n   Recent lessons:");
      data.writerContext.recentLessons.forEach((lesson) => {
        console.log(`     • ${lesson.title}`);
      });
    }

    console.log("\n   Prompt preview (first 200 chars):");
    console.log(`   "${data.prompt.substring(0, 200)}..."\n`);

    console.log("   ✅ Prompt generated");
    return data;
  } catch (error) {
    console.error("❌ Error:", error.message);
    return null;
  }
}

// ============================================================================
// EXAMPLE 3: Integration in Content Analysis Pipeline
// ============================================================================

async function contentAnalysisPipelineWithEdgeFunctions(topic) {
  console.log("\n📋 EXAMPLE 3: Full Content Analysis Pipeline\n");

  try {
    // Step 1: Generate writer prompt
    console.log("Step 1️⃣: Generate writer prompt...");
    const promptData = await generateWriterPromptViaEdgeFunction(
      "sarah",
      topic
    );

    if (!promptData) {
      console.error("Failed to generate prompt");
      return;
    }

    // Step 2: Use prompt with Claude API (simulated)
    console.log("\nStep 2️⃣: Call Claude API with optimized prompt...");
    const claudeResponse = "Claude would generate content here...";
    console.log(`   ✓ Content generated: ${claudeResponse.length} chars`);

    // Step 3: Validate generated content
    console.log("\nStep 3️⃣: Validate generated content...");
    const validationData = await validateContentViaEdgeFunction(
      claudeResponse,
      "blog_post"
    );

    if (!validationData) {
      console.error("Failed to validate content");
      return;
    }

    // Step 4: Report
    console.log("\n✅ Pipeline Complete:");
    console.log(
      `   - Tokens saved: ${promptData.tokenSavings} (${promptData.savingsPercent}%)`
    );
    console.log(`   - Content valid: ${validationData.valid}`);
    console.log(`   - Validation score: ${validationData.score}/100`);
    console.log(`   - Issues found: ${validationData.issues.length}`);

    return { promptData, claudeResponse, validationData };
  } catch (error) {
    console.error("❌ Pipeline error:", error.message);
    return null;
  }
}

// ============================================================================
// EXAMPLE 4: Batch Processing with Edge Functions
// ============================================================================

async function batchValidateMultipleContents(contentList) {
  console.log("\n📋 EXAMPLE 4: Batch Content Validation\n");

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    console.log(`Processing ${contentList.length} items in parallel...\n`);

    // Call Edge Function for each content item in parallel
    const validationPromises = contentList.map((item) =>
      supabase.functions.invoke("validate-content", {
        body: { content: item.content, type: item.type },
      })
    );

    const results = await Promise.all(validationPromises);

    // Process results
    console.log("Results:");
    results.forEach((result, index) => {
      if (result.error) {
        console.log(`   ❌ Item ${index + 1}: Error - ${result.error}`);
      } else {
        console.log(
          `   ✅ Item ${index + 1}: Valid=${result.data.valid}, Score=${result.data.score}`
        );
      }
    });

    console.log(`\n✅ Batch validation complete`);
    return results;
  } catch (error) {
    console.error("❌ Batch error:", error.message);
    return null;
  }
}

// ============================================================================
// EXAMPLE 5: Error Handling & Retry Logic
// ============================================================================

async function validateContentWithRetry(content, maxRetries = 3) {
  console.log("\n📋 EXAMPLE 5: Error Handling with Retry Logic\n");

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}...`);

      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      const { data, error } = await supabase.functions.invoke(
        "validate-content",
        {
          body: { content, type: "blog_post" },
        }
      );

      if (error) {
        if (attempt < maxRetries) {
          console.log(`  ⚠️ Error: ${error.message}`);
          console.log(`  ⏳ Retrying in 1 second...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        } else {
          throw error;
        }
      }

      console.log(`  ✅ Success on attempt ${attempt}`);
      console.log(`  Score: ${data.score}/100`);
      return data;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`❌ Failed after ${maxRetries} attempts: ${error.message}`);
        return null;
      }
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║       EDGE FUNCTION INTEGRATION EXAMPLES - PHASE 1         ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  // Example 1: Basic validation
  const testContent =
    "The carnivore diet shows robust results in recent studies. We delve into the analysis below.";
  await validateContentViaEdgeFunction(testContent, "blog_post");

  // Example 2: Generate prompt
  await generateWriterPromptViaEdgeFunction("sarah", "Weekly carnivore trends");

  // Example 3: Full pipeline
  await contentAnalysisPipelineWithEdgeFunctions(
    "Benefits of carnivore diet for mental health"
  );

  // Example 4: Batch processing
  const testContents = [
    { content: "This is a great article about the carnivore diet.", type: "blog_post" },
    {
      content:
        "The robust nature of this approach leverages recent developments.",
      type: "summary",
    },
    { content: "Quick tips for carnivore diet success.", type: "newsletter" },
  ];
  await batchValidateMultipleContents(testContents);

  // Example 5: Retry logic
  await validateContentWithRetry(
    "Sample content for retry testing with error handling."
  );

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║                EXAMPLES COMPLETE                           ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
}

// Export for use in other modules
module.exports = {
  validateContentViaEdgeFunction,
  generateWriterPromptViaEdgeFunction,
  contentAnalysisPipelineWithEdgeFunctions,
  batchValidateMultipleContents,
  validateContentWithRetry,
};

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

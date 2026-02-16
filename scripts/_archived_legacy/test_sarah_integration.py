#!/usr/bin/env python3
"""
Test Sarah's integration with Supabase Pre-Flight
This script orchestrates the full workflow:
1. Fetch Sarah's context from Supabase
2. Create a writing task
3. Generate instructions for invoking Sarah via Claude Code Task tool
4. Display the formatted prompt for Sarah
"""

import os
import json
from fetch_writer_context import fetch_writer_context, format_context_for_prompt

# Test topic for Sarah to write about
TEST_TOPIC = {
    "title": "Electrolyte Balance on Carnivore: What Actually Matters",
    "excerpt": "Everyone talks about electrolytes on carnivore, but what do you actually need to track? Here's what the science shows and what I've seen work in practice.",
    "category": "health",
    "tags": ["electrolytes", "sodium", "potassium", "magnesium", "health"],
    "target_length": "1000-1200 words",
    "tone": "conversational, evidence-based, practical"
}

def generate_writing_task(context, topic):
    """
    Generate a complete writing task prompt for Sarah
    """

    # Start with Sarah's context (persona, memories, past articles)
    prompt = format_context_for_prompt(context)

    # Add the writing task
    prompt += f"""
# YOUR WRITING TASK

Write a blog post with the following specifications:

**Title:** {topic['title']}

**Excerpt:** {topic['excerpt']}

**Category:** {topic['category']}

**Tags:** {', '.join(topic['tags'])}

**Target Length:** {topic['target_length']}

**Tone:** {topic['tone']}

## Writing Requirements

1. **Use your voice formula** - Apply your signature phrases naturally
2. **Apply your memories** - Reference lessons you've learned (budget barriers, specificity drives engagement, etc.)
3. **Avoid repeating past topics** - Check your past articles list above
4. **Be conversational** - Sound like a real person, not AI
5. **Include evidence** - Cite research when making health claims, but keep it accessible
6. **Add disclaimers** - Include appropriate medical disclaimers (Category 5 for electrolytes)
7. **No AI tells** - Avoid: delve, robust, leverage, navigate, crucial, realm, landscape, utilize
8. **No em-dashes** - Use periods or commas instead
9. **Use contractions** - Don't, can't, won't (not do not, cannot, will not)
10. **Grade 8-10 reading level** - Clear and accessible

## Content Structure

Start with your typical opening pattern (e.g., "Here's what I've seen work with clients...")

Then cover:
- Why electrolytes matter on carnivore (metabolic adaptation context)
- What to actually track (sodium, potassium, magnesium - specific amounts)
- Common mistakes you see (based on your experience)
- Practical protocol (actionable steps)
- When to worry vs when you're fine

Include your "Not a Doctor" disclaimer at the end.

## Output Format

Return ONLY the HTML content (using <h2>, <p>, <ul>, <li> tags).
Do NOT include:
- Front matter
- Meta tags
- Template variables
- The title as H1 (that's in the template)

Start directly with the opening paragraph, then use <h2> for section headers.

---

**NOW WRITE THE ARTICLE USING YOUR VOICE, MEMORIES, AND EXPERIENCE.**
"""

    return prompt

def main():
    print("=" * 100)
    print("SARAH INTEGRATION TEST - SUPABASE PRE-FLIGHT")
    print("=" * 100)
    print()

    # Step 1: Fetch Sarah's context
    print("Step 1: Fetching Sarah's context from Supabase...")
    context = fetch_writer_context("sarah")

    if "error" in context:
        print(f"❌ Error: {context['error']}")
        return

    print(f"✅ Fetched persona, {len(context['memories'])} memories, {len(context['past_articles'])} past articles")
    print()

    # Step 2: Generate writing task
    print("Step 2: Generating writing task...")
    task_prompt = generate_writing_task(context, TEST_TOPIC)

    # Save the full prompt
    output_file = "/tmp/sarah_writing_task.txt"
    with open(output_file, "w") as f:
        f.write(task_prompt)

    print(f"✅ Full writing task saved to: {output_file}")
    print()

    # Step 3: Display instructions for manual invocation
    print("=" * 100)
    print("NEXT STEPS - INVOKE SARAH VIA CLAUDE CODE")
    print("=" * 100)
    print()
    print("The full prompt has been saved to /tmp/sarah_writing_task.txt")
    print()
    print("To invoke Sarah:")
    print("1. Use Claude Code's Task tool")
    print("2. Set subagent_type='general-purpose' (has Read, Write, all tools)")
    print("3. Set name='sarah-health-coach'")
    print("4. Pass the content of sarah_writing_task.txt as the prompt")
    print()
    print("Sarah will receive:")
    print("  - Her complete persona and voice formula")
    print("  - All 10 of her memory lessons")
    print("  - Her past 10 articles (to avoid repeating)")
    print("  - Recent team articles (for cross-referencing)")
    print("  - The specific writing task with requirements")
    print()
    print("Expected output:")
    print("  - 1000-1200 word article in Sarah's voice")
    print("  - Evidence-based but conversational")
    print("  - Applying her lessons about specificity and budget")
    print("  - No AI tells, no em-dashes, contractions present")
    print()
    print("=" * 100)
    print()

    # Display prompt preview
    print("PROMPT PREVIEW (first 2000 chars):")
    print("-" * 100)
    print(task_prompt[:2000])
    print("\n... (full prompt saved to file) ...\n")
    print("-" * 100)

if __name__ == "__main__":
    main()

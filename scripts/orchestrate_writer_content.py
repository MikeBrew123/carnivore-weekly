#!/usr/bin/env python3
"""
Phase 3: Orchestration Script for Supabase-Powered Writer Agents

This script orchestrates the full workflow:
1. Read topic from blog_topics_queue.json
2. Fetch writer context from Supabase
3. Generate writing task prompt
4. Display instructions for invoking writer via Claude Code Task tool
5. After article generated, save to Supabase and generate HTML

Usage:
    python3 orchestrate_writer_content.py --writer sarah --topic "Topic Title"
    python3 orchestrate_writer_content.py --save-article /tmp/article.html --writer sarah --title "Article Title"
"""

import os
import sys
import json
import argparse
from datetime import datetime
from fetch_writer_context import fetch_writer_context, format_context_for_prompt
from supabase import create_client, Client

# Initialize Supabase client
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

WRITER_AGENT_MAP = {
    "sarah": "sarah-health-coach",
    "chloe": "chloe-community-manager",
    "marcus": "marcus-performance-coach"
}

def generate_writing_task(context, topic):
    """
    Generate a complete writing task prompt for a writer
    """
    prompt = format_context_for_prompt(context)

    prompt += f"""
# YOUR WRITING TASK

Write a blog post with the following specifications:

**Title:** {topic['title']}

**Excerpt:** {topic['excerpt']}

**Category:** {topic['category']}

**Tags:** {', '.join(topic['tags'])}

**Target Length:** {topic.get('target_length', '1000-1200 words')}

**Tone:** {topic.get('tone', 'conversational, evidence-based')}

## Writing Requirements

1. **Use your voice formula** - Apply your signature phrases naturally
2. **Apply your memories** - Reference lessons you've learned
3. **Avoid repeating past topics** - Check your past articles list above
4. **Be conversational** - Sound like a real person, not AI
5. **Include evidence** - Cite research when making health claims (if applicable)
6. **Add disclaimers** - Include appropriate medical disclaimers if needed
7. **No AI tells** - Avoid: delve, robust, leverage, navigate, crucial, realm, landscape, utilize
8. **No em-dashes** - Use periods or commas instead
9. **Use contractions** - Don't, can't, won't (not do not, cannot, will not)
10. **Grade 8-10 reading level** - Clear and accessible

## Content Structure

{topic.get('structure_notes', 'Start with your typical opening pattern, then cover the main points clearly and concisely.')}

Include your "Not a Doctor" disclaimer at the end if making health claims.

## Output Format

Return ONLY the HTML content (using <h2>, <p>, <ul>, <li> tags).
Do NOT include front matter, meta tags, or template variables.
Start directly with the opening paragraph, then use <h2> for section headers.

---

**NOW WRITE THE ARTICLE USING YOUR VOICE, MEMORIES, AND EXPERIENCE.**
"""

    return prompt

def prepare_writing_task(writer_slug, topic):
    """
    Prepare writing task for manual invocation via Claude Code Task tool
    """
    print("=" * 100)
    print(f"PREPARING WRITING TASK FOR {writer_slug.upper()}")
    print("=" * 100)
    print()

    # Fetch writer context
    print(f"Fetching {writer_slug}'s context from Supabase...")
    context = fetch_writer_context(writer_slug)

    if "error" in context:
        print(f"❌ Error: {context['error']}")
        return None

    print(f"✅ Fetched persona, {len(context['memories'])} memories, {len(context['past_articles'])} past articles")
    print()

    # Generate writing task
    print("Generating writing task...")
    task_prompt = generate_writing_task(context, topic)

    # Save to file
    output_file = f"/tmp/{writer_slug}_writing_task.txt"
    with open(output_file, "w") as f:
        f.write(task_prompt)

    print(f"✅ Full writing task saved to: {output_file}")
    print()

    # Display invocation instructions
    print("=" * 100)
    print("NEXT STEP: INVOKE WRITER VIA CLAUDE CODE TASK TOOL")
    print("=" * 100)
    print()
    print("Use Claude Code's Task tool with these parameters:")
    print(f"  - subagent_type: 'general-purpose'")
    print(f"  - name: '{WRITER_AGENT_MAP[writer_slug]}'")
    print(f"  - prompt: Read {output_file} + save article to /tmp/{writer_slug}_article.html")
    print()
    print("After article is generated, run:")
    print(f"  python3 orchestrate_writer_content.py --save-article /tmp/{writer_slug}_article.html --writer {writer_slug} --title \"{topic['title']}\"")
    print()

    return output_file

def save_article_to_supabase(article_path, writer_slug, title, tags):
    """
    Save generated article to Supabase writer_content table
    """
    print("=" * 100)
    print(f"SAVING {writer_slug.upper()}'S ARTICLE TO SUPABASE")
    print("=" * 100)
    print()

    # Read article content
    with open(article_path) as f:
        article_html = f.read()

    # Get writer_id
    writer_result = supabase.table("writers").select("id").eq("slug", writer_slug).execute()
    if not writer_result.data:
        print(f"❌ {writer_slug} not found in writers table")
        return None

    writer_id = writer_result.data[0]["id"]

    # Calculate word count
    word_count = len(article_html.split())

    # Insert article
    insert_data = {
        "writer_id": writer_id,
        "title": title,
        "content_type": "blog",
        "word_count": word_count,
        "reading_time_minutes": max(1, word_count // 200),
        "key_themes": tags if isinstance(tags, list) else tags.split(','),
        "published_at": datetime.now().isoformat()
    }

    result = supabase.table("writer_content").insert(insert_data).execute()

    if result.data:
        print(f"✅ Article saved to Supabase")
        print(f"   Writer: {writer_slug}")
        print(f"   Title: {title}")
        print(f"   Word count: {word_count}")
        print(f"   Themes: {', '.join(insert_data['key_themes'])}")
        print()
        return result.data[0]
    else:
        print(f"❌ Failed to save article")
        return None

def main():
    parser = argparse.ArgumentParser(description="Orchestrate writer content generation")
    parser.add_argument("--writer", required=True, choices=["sarah", "chloe", "marcus"])
    parser.add_argument("--topic", help="Topic title for new article")
    parser.add_argument("--save-article", help="Path to generated article HTML to save")
    parser.add_argument("--title", help="Article title (required with --save-article)")
    parser.add_argument("--tags", help="Comma-separated tags (required with --save-article)")

    args = parser.parse_args()

    if args.save_article:
        # Save mode
        if not args.title:
            print("❌ --title required when using --save-article")
            sys.exit(1)

        tags = args.tags.split(',') if args.tags else []
        save_article_to_supabase(args.save_article, args.writer, args.title, tags)

    elif args.topic:
        # Prepare mode (manual for now - would read from blog_topics_queue.json in production)
        topic = {
            "title": args.topic,
            "excerpt": "Generated excerpt",
            "category": "health",
            "tags": ["carnivore"],
            "target_length": "1000-1200 words",
            "tone": "conversational, evidence-based"
        }
        prepare_writing_task(args.writer, topic)

    else:
        print("❌ Either --topic or --save-article required")
        sys.exit(1)

if __name__ == "__main__":
    main()

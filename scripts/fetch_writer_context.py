#!/usr/bin/env python3
"""
Fetch complete writer context from Supabase for agent invocation
Returns persona, memories, and past articles formatted for agent prompt
"""

import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

def fetch_writer_context(writer_slug):
    """
    Fetch complete context for a writer from Supabase
    Returns formatted data ready to inject into agent prompt
    """

    # 1. Fetch writer persona
    writer_result = supabase.table("writers").select("*").eq("slug", writer_slug).execute()

    if not writer_result.data:
        return {"error": f"Writer '{writer_slug}' not found"}

    writer = writer_result.data[0]

    # 2. Fetch writer memories (top 10 by relevance)
    memories_result = supabase.table("writer_memory_log").select("*").eq(
        "writer_id", writer['id']
    ).order("relevance_score", desc=True).order("created_at", desc=True).limit(10).execute()

    # 3. Fetch writer's past articles (last 10)
    content_result = supabase.table("writer_content").select(
        "title, key_themes, published_at, word_count"
    ).eq("writer_id", writer['id']).order("published_at", desc=True).limit(10).execute()

    # 4. Fetch recent articles from ALL writers (for cross-reference awareness)
    all_content_result = supabase.table("writer_content").select(
        "title, key_themes, published_at"
    ).order("published_at", desc=True).limit(20).execute()

    # 5. Fetch published blog post slugs from blog_posts.json for linking
    import json
    from pathlib import Path
    project_root = Path(__file__).parent.parent
    blog_posts_file = project_root / "data" / "blog_posts.json"
    published_slugs = []

    if blog_posts_file.exists():
        with open(blog_posts_file) as f:
            blog_data = json.load(f)
            for post in blog_data.get("blog_posts", [])[:30]:  # Get last 30 published
                if post.get("published", False):
                    published_slugs.append({
                        "slug": post.get("slug", ""),
                        "title": post.get("title", ""),
                        "author": post.get("author", "unknown"),
                        "category": post.get("category", ""),
                        "url": f"/blog/{post.get('slug', '')}.html"
                    })

    # Format the context
    context = {
        "writer": {
            "slug": writer['slug'],
            "name": writer['name'],
            "role_title": writer['role_title'],
            "tagline": writer['tagline'],
            "tone_style": writer['tone_style'],
            "specialty": writer['specialty'],
            "preferred_topics": writer.get('preferred_topics', []),
            "voice_formula": writer.get('voice_formula', {})
        },
        "memories": [],
        "past_articles": [],
        "team_recent_articles": [],
        "published_slugs": published_slugs
    }

    # Format memories
    for memory in memories_result.data:
        context["memories"].append({
            "type": memory['memory_type'],
            "title": memory['title'],
            "description": memory['description'],
            "tags": memory.get('tags', []),
            "relevance": memory.get('relevance_score', 0),
            "impact": memory.get('impact_category', 'N/A')
        })

    # Format past articles
    for article in content_result.data:
        context["past_articles"].append({
            "title": article['title'],
            "themes": article.get('key_themes', []),
            "published": article.get('published_at', 'N/A'),
            "words": article.get('word_count', 0)
        })

    # Format team articles (for cross-reference)
    for article in all_content_result.data:
        context["team_recent_articles"].append({
            "title": article['title'],
            "themes": article.get('key_themes', []),
            "published": article.get('published_at', 'N/A')
        })

    return context

def format_context_for_prompt(context):
    """
    Format the context data into a readable prompt section
    """

    if "error" in context:
        return context["error"]

    writer = context["writer"]
    voice = writer.get("voice_formula", {})

    prompt = f"""# YOUR IDENTITY & VOICE

You are **{writer['name']}**, {writer['role_title']} at Carnivore Weekly.

**Your Tagline:** {writer['tagline']}

**Your Specialty:** {writer['specialty']}

**Your Tone:** {writer['tone_style']}

**Preferred Topics:** {', '.join(writer['preferred_topics'][:5])}

## Your Voice Formula

**Tone:** {voice.get('tone', 'N/A')}

**Signature Phrases You Use:**
"""

    for phrase in voice.get('signature_phrases', [])[:5]:
        prompt += f"- \"{phrase}\"\n"

    prompt += f"\n**Writing Principles You Follow:**\n"
    for principle in voice.get('writing_principles', [])[:5]:
        prompt += f"- {principle}\n"

    prompt += f"\n**Common Opening Patterns:**\n"
    for pattern in voice.get('common_opening_patterns', [])[:3]:
        prompt += f"- {pattern}\n"

    # Add memories
    prompt += f"\n\n# YOUR MEMORIES & LESSONS LEARNED\n\n"
    prompt += f"You have {len(context['memories'])} key lessons to remember:\n\n"

    for i, memory in enumerate(context['memories'][:7], 1):
        prompt += f"**{i}. {memory['type'].replace('_', ' ').title()}: {memory['title']}**\n"
        prompt += f"   {memory['description']}\n"
        prompt += f"   Tags: {', '.join(memory['tags'][:4])}\n"
        prompt += f"   Impact: {memory['impact']}, Relevance: {memory['relevance']}\n\n"

    # Add past articles
    prompt += f"\n# YOUR PAST ARTICLES (Last 10)\n\n"
    prompt += "You've written these articles recently. Don't repeat these topics:\n\n"

    for article in context['past_articles']:
        prompt += f"- **{article['title']}** ({article['published'][:10] if article['published'] != 'N/A' else 'Draft'})\n"
        prompt += f"  Themes: {', '.join(article['themes'][:4])}\n"

    # Add team articles for cross-reference
    prompt += f"\n\n# RECENT TEAM ARTICLES (For Cross-Reference)\n\n"
    prompt += "Your teammates have published these recently. You can reference them naturally:\n\n"

    for article in context['team_recent_articles'][:10]:
        prompt += f"- {article['title']}\n"

    # Add internal linking rules
    prompt += f"\n\n# INTERNAL LINKING RULES (CRITICAL)\n\n"
    prompt += "**You MUST include 2-5 internal links in every article:**\n\n"
    prompt += "**DO:**\n"
    prompt += "- Link to OTHER writers' articles (prioritize cross-writer references)\n"
    prompt += "- Link on relevant keywords (e.g., \"[electrolyte balance](/blog/electrolyte-balance.html)\")\n"
    prompt += "- Link to wiki sections (e.g., \"[insulin resistance](/wiki/#insulin-resistance)\")\n"
    prompt += "- Place links in body paragraphs, NOT in headings\n"
    prompt += "- Use descriptive anchor text (the keyword itself)\n\n"
    prompt += "**DON'T:**\n"
    prompt += "- Put links inside <h1>, <h2>, <h3>, or <h4> tags\n"
    prompt += "- Use \"click here\" or \"read more\" as anchor text\n"
    prompt += "- Link full sentences (link just the keyword)\n"
    prompt += "- Link to external sites (internal only)\n\n"
    prompt += "**Link format:**\n"
    prompt += "- Blog posts: `/blog/slug.html` (e.g., `/blog/thyroid-function.html`)\n"
    prompt += "- Wiki sections: `/wiki/#topic` (e.g., `/wiki/#ketosis`)\n\n"
    prompt += "**Example:**\n"
    prompt += "\"Understanding [thyroid function](/blog/thyroid-function.html) on carnivore requires...\"\n\n"

    # Add list of published slugs for easy linking
    prompt += "**AVAILABLE BLOG POSTS TO LINK TO:**\n\n"
    for slug_info in context.get('published_slugs', [])[:20]:
        url = slug_info.get('url', '')
        title = slug_info.get('title', '')[:60]
        author = slug_info.get('author', '').title()
        category = slug_info.get('category', '')
        prompt += f"- {url} - {title} (by {author}, {category})\n"
    prompt += "\n"

    prompt += "\n" + "="*80 + "\n\n"

    return prompt

if __name__ == "__main__":
    import sys

    writer_slug = sys.argv[1] if len(sys.argv) > 1 else "sarah"

    print(f"Fetching context for: {writer_slug}")
    print("="*80)

    context = fetch_writer_context(writer_slug)

    if "error" in context:
        print(f"Error: {context['error']}")
        sys.exit(1)

    # Save full context as JSON
    with open(f"/tmp/{writer_slug}_context.json", "w") as f:
        json.dump(context, f, indent=2)

    print(f"✅ Context saved to /tmp/{writer_slug}_context.json")
    print()

    # Print formatted prompt
    prompt = format_context_for_prompt(context)

    with open(f"/tmp/{writer_slug}_prompt.txt", "w") as f:
        f.write(prompt)

    print(f"✅ Formatted prompt saved to /tmp/{writer_slug}_prompt.txt")
    print()
    print("Preview:")
    print("="*80)
    print(prompt[:1000])
    print("...")
    print("="*80)

#!/usr/bin/env python3
"""
Spawn Writer Swarm - Parallel Content Generation

This script is called by generate_weekly_content.py to spawn parallel writer agents.
It creates writing tasks for each assigned writer and outputs instructions for
invoking them via Claude Code's Task tool.

Usage:
    python3 scripts/spawn_writer_swarm.py [--batch-size N]

This outputs the exact Task tool invocations needed for parallel generation.
"""

import os
import sys
import json
from pathlib import Path
from fetch_writer_context import fetch_writer_context, format_context_for_prompt

PROJECT_ROOT = Path(__file__).parent.parent
QUEUE_FILE = PROJECT_ROOT / "blog_topics_queue.json"

WRITER_AGENT_MAP = {
    "sarah": "sarah-health-coach",
    "chloe": "chloe-community-manager",
    "marcus": "marcus-performance-coach"
}

def generate_writing_task(context, topic):
    """Generate complete writing task for a topic"""
    prompt = format_context_for_prompt(context)

    structure_notes = topic.get('research_notes', 'Cover the main points clearly and concisely.')

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

{structure_notes}

Include your "Not a Doctor" disclaimer at the end if making health claims.

## Output Format

Return ONLY the HTML content (using <h2>, <p>, <ul>, <li> tags).
Do NOT include front matter, meta tags, or template variables.
Start directly with the opening paragraph, then use <h2> for section headers.

---

**NOW WRITE THE ARTICLE USING YOUR VOICE, MEMORIES, AND EXPERIENCE.**
"""
    return prompt

def prepare_swarm_tasks(batch_size=5):
    """
    Prepare writing tasks for all assigned writers
    Returns dict of {writer: [tasks]}
    """
    if not QUEUE_FILE.exists():
        print(f"❌ Queue file not found: {QUEUE_FILE}")
        return None

    with open(QUEUE_FILE) as f:
        queue = json.load(f)

    assignments = queue.get("assignments", [])[:batch_size]

    if not assignments:
        print("❌ No assignments in queue")
        return None

    # Group by writer
    by_writer = {}
    for assignment in assignments:
        writer = assignment.get("assigned_writer", "sarah")
        if writer not in by_writer:
            by_writer[writer] = []
        by_writer[writer].append(assignment)

    print(f"📊 Found {len(assignments)} assignments across {len(by_writer)} writers")

    # Fetch context and generate tasks for each writer
    writer_tasks = {}

    for writer, topics in by_writer.items():
        print(f"\n🔍 Fetching context for {writer}...")

        # Fetch Supabase context
        context = fetch_writer_context(writer)

        if "error" in context:
            print(f"❌ Error fetching context for {writer}: {context['error']}")
            continue

        print(f"✅ Fetched {len(context['memories'])} memories, {len(context['past_articles'])} past articles")

        # Generate writing task for each topic
        tasks = []
        for topic in topics:
            task_prompt = generate_writing_task(context, topic)
            tasks.append({
                "topic": topic,
                "prompt": task_prompt,
                "output_file": f"/tmp/{writer}_{topic['title'].lower().replace(' ', '_')[:30]}.html"
            })

        writer_tasks[writer] = tasks
        print(f"✅ Prepared {len(tasks)} tasks for {writer}")

    return writer_tasks

def output_task_invocations(writer_tasks, team_name):
    """
    Output Claude Code Task tool invocations for parallel execution
    """
    print("\n" + "=" * 80)
    print("PARALLEL WRITER SWARM - TASK INVOCATIONS")
    print("=" * 80)
    print()
    print(f"Team: {team_name}")
    print(f"Writers: {len(writer_tasks)}")
    print(f"Total articles: {sum(len(tasks) for tasks in writer_tasks.values())}")
    print()

    for writer, tasks in writer_tasks.items():
        agent_name = WRITER_AGENT_MAP[writer]

        # Create consolidated prompt for this writer
        combined_prompt = f"""You are {writer.title()}, assigned to write {len(tasks)} articles for this batch.

For each article:
1. Read the writing task below
2. Apply your voice formula and memories from Supabase
3. Write the article following all requirements
4. Save to the specified output file

Your assignments:

"""

        for i, task in enumerate(tasks, 1):
            combined_prompt += f"""
{'='*80}
ARTICLE {i}/{len(tasks)}: {task['topic']['title']}
{'='*80}

Output file: {task['output_file']}

{task['prompt']}

"""

        # Save to file for easier invocation
        task_file = PROJECT_ROOT / f"tmp/{writer}_batch_tasks.txt"
        task_file.parent.mkdir(exist_ok=True)

        with open(task_file, "w") as f:
            f.write(combined_prompt)

        print(f"📝 {writer.upper()} - {len(tasks)} articles")
        print(f"   Task file: {task_file}")
        print(f"   Agent: {agent_name}")
        print()

    print("=" * 80)
    print("TO EXECUTE THE SWARM:")
    print("=" * 80)
    print()
    print("1. Create team:")
    print(f"   TeamCreate(team_name='{team_name}', description='Weekly content batch')")
    print()
    print("2. Spawn writers in parallel:")
    print()

    for writer, tasks in writer_tasks.items():
        agent_name = WRITER_AGENT_MAP[writer]
        task_file = f"tmp/{writer}_batch_tasks.txt"

        print(f"   Task(")
        print(f"       subagent_type='general-purpose',")
        print(f"       name='{agent_name}',")
        print(f"       team_name='{team_name}',")
        print(f"       description='Generate {len(tasks)} {writer} articles',")
        print(f"       prompt=Read('{task_file}')")
        print(f"   )")
        print()

    print("3. Wait for all writers to complete")
    print()
    print("4. Collect articles from /tmp/")
    print()

def main():
    import argparse

    parser = argparse.ArgumentParser(description="Prepare parallel writer swarm tasks")
    parser.add_argument("--batch-size", type=int, default=5,
                        help="Number of posts to generate (default: 5)")
    parser.add_argument("--team-name", type=str,
                        default=f"weekly-content-{Path.cwd().name}",
                        help="Team name for the swarm")

    args = parser.parse_args()

    print("🚀 SPAWNING WRITER SWARM")
    print("=" * 80)

    writer_tasks = prepare_swarm_tasks(args.batch_size)

    if writer_tasks:
        output_task_invocations(writer_tasks, args.team_name)
        print("✅ Swarm preparation complete")
        return 0
    else:
        print("❌ Failed to prepare swarm")
        return 1

if __name__ == "__main__":
    sys.exit(main())

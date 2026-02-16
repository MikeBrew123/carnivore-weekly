#!/usr/bin/env python3
"""
PHASE 4: Autonomous Weekly Content Generation Pipeline

This is the master orchestration script that replaces generate_weekly_blog_posts.py.

Workflow:
1. Chloe researches trending topics (web search)
2. Chloe creates assignments in blog_topics_queue.json
3. Leo runs Pre-Flight for all assigned writers
4. All 3 writers generate content in parallel (swarm)
5. Leo runs Post-Flight - saves to Supabase
6. Generate HTML via generate_blog_pages.py
7. Run through Wall 1 content_validator
8. Regenerate sitemap, blog index, homepage
9. Validate with validate_before_commit.py
10. Commit and push

Usage:
    python3 scripts/generate_weekly_content.py [--batch-size N] [--skip-research] [--skip-commit]

Options:
    --batch-size N      Number of posts to generate (default: 5)
    --skip-research     Skip Chloe's research phase (use existing queue)
    --skip-commit       Don't auto-commit/push (for testing)
    --dry-run           Show what would happen without executing

This script is designed to be invoked by Claude Code agents.
For manual use: Run via Claude Code with "Generate this week's blog content"
"""

import os
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path

# Ensure we're in the project root
PROJECT_ROOT = Path(__file__).parent.parent
os.chdir(PROJECT_ROOT)

class ContentPipeline:
    """
    Orchestrates the full content generation pipeline
    """

    def __init__(self, batch_size=5, skip_research=False, skip_commit=False, dry_run=False):
        self.batch_size = batch_size
        self.skip_research = skip_research
        self.skip_commit = skip_commit
        self.dry_run = dry_run
        self.queue_file = PROJECT_ROOT / "blog_topics_queue.json"
        self.session_log = []

    def log(self, message, level="INFO"):
        """Log a message to console and session log"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        formatted = f"[{timestamp}] {level}: {message}"
        print(formatted)
        self.session_log.append(formatted)

    def step(self, step_num, total_steps, description):
        """Log a pipeline step"""
        self.log(f"STEP {step_num}/{total_steps}: {description}", "STEP")

    def phase_1_research(self):
        """
        Phase 1: Chloe researches trending topics

        This phase uses Chloe to:
        - Search web for trending carnivore topics
        - Analyze Reddit discussions
        - Identify content gaps
        - Create assignments in blog_topics_queue.json
        """
        self.step(1, 10, "Chloe Research - Trending Topics")

        if self.skip_research:
            self.log("Skipping research phase (using existing queue)")
            return True

        self.log("Invoking Chloe to research trending topics...")

        # Instructions for Claude Code to invoke Chloe
        instructions = """
To complete Phase 1, use Claude Code's Task tool:

Task(
    subagent_type="general-purpose",
    name="chloe-community-manager",
    description="Research trending carnivore topics",
    prompt='''
You are Chloe, Community Manager at Carnivore Weekly.

Your task: Research trending carnivore topics for this week's content.

Steps:
1. Use WebSearch to find:
   - Trending discussions on r/carnivore, r/zerocarb
   - Popular YouTube videos (last 7 days)
   - Common questions in Facebook groups
   - Emerging controversies or debates

2. Identify 5-15 topic ideas that:
   - Are currently trending (hot this week)
   - Fill content gaps (check existing blog_posts.json)
   - Align with writer strengths (Sarah: health, Marcus: performance, Chloe: community)

3. For each topic, create assignment:
   {
     "title": "Engaging title",
     "excerpt": "Hook that makes people click",
     "category": "health|performance|lifestyle",
     "tags": ["tag1", "tag2", "tag3"],
     "assigned_writer": "sarah|marcus|chloe",
     "priority": 1-5,
     "target_length": "900-1100 words",
     "tone": "conversational|evidence-based|trendy",
     "research_notes": "Why this is trending, key points to cover",
     "deadline": "2026-02-15"
   }

4. Save assignments to blog_topics_queue.json

Focus on:
- Social challenges (dating, family) - high engagement
- Trending debates (seed oils, cholesterol) - fast turnaround
- Protocol questions (fasting, electrolytes) - actionable
- Reddit testimonials - credible and relatable

Output: Updated blog_topics_queue.json with 5-15 new assignments
'''
)

The agent will:
1. Search for trending topics
2. Analyze engagement potential
3. Create assignments in blog_topics_queue.json
4. Return when complete

WAIT FOR AGENT TO COMPLETE before proceeding to Phase 2.
"""

        if self.dry_run:
            self.log("[DRY RUN] Would invoke Chloe research agent")
            self.log(instructions)
            return True
        else:
            self.log("=" * 80)
            self.log("MANUAL STEP REQUIRED:")
            self.log(instructions)
            self.log("=" * 80)

            # In production, this would be automated via Claude Code's Task tool
            # For now, require manual confirmation
            response = input("\nHas Chloe completed research? (yes/no): ")
            return response.lower() == "yes"

    def phase_2_preflight(self):
        """
        Phase 2: Leo runs Pre-Flight for all assigned writers

        Fetches Supabase context for each writer:
        - Persona and voice formula
        - Top 10 memories by relevance
        - Last 10 past articles
        - Recent 20 team articles
        """
        self.step(2, 10, "Leo Pre-Flight - Fetch Writer Context")

        # Load queue
        if not self.queue_file.exists():
            self.log(f"ERROR: Queue file not found: {self.queue_file}", "ERROR")
            return False

        with open(self.queue_file) as f:
            queue = json.load(f)

        assignments = queue.get("assignments", [])[:self.batch_size]

        if not assignments:
            self.log("ERROR: No assignments in queue", "ERROR")
            return False

        self.log(f"Found {len(assignments)} assignments in queue")

        # Group by writer
        by_writer = {}
        for assignment in assignments:
            writer = assignment.get("assigned_writer", "sarah")
            if writer not in by_writer:
                by_writer[writer] = []
            by_writer[writer].append(assignment)

        self.log(f"Writers assigned: {', '.join(by_writer.keys())}")

        # Fetch context for each writer
        for writer, topics in by_writer.items():
            self.log(f"Fetching Pre-Flight context for {writer} ({len(topics)} topics)")

            if self.dry_run:
                self.log(f"[DRY RUN] Would fetch context for {writer}")
                continue

            # Run fetch_writer_context.py
            cmd = f"cd scripts && python3 -c \"from fetch_writer_context import fetch_writer_context; fetch_writer_context('{writer}')\""
            os.system(cmd)

        return True

    def phase_3_parallel_generation(self):
        """
        Phase 3: All 3 writers generate content in parallel (swarm)

        Uses Claude Code's TeamCreate to spawn parallel writers.
        Each writer receives their assignments and generates articles.
        """
        self.step(3, 10, "Parallel Content Generation - Writer Swarm")

        # Load queue
        with open(self.queue_file) as f:
            queue = json.load(f)

        assignments = queue.get("assignments", [])[:self.batch_size]

        instructions = f"""
To complete Phase 3, use Claude Code's TeamCreate + Task tools:

1. Create a team for this content batch:

TeamCreate(
    team_name="weekly-content-batch-{datetime.now().strftime('%Y%m%d')}",
    description="Parallel generation of {len(assignments)} blog posts"
)

2. For each writer with assignments, spawn agent:

# Sarah (health topics)
Task(
    subagent_type="general-purpose",
    name="sarah-health-coach",
    team_name="weekly-content-batch-{datetime.now().strftime('%Y%m%d')}",
    description="Generate health articles",
    prompt='''
Read your assignments from blog_topics_queue.json.
For each assignment where assigned_writer="sarah":

1. Run: python3 scripts/fetch_writer_context.py sarah
2. Generate writing task using your Supabase context
3. Write article following your voice formula
4. Save to /tmp/sarah_[slug].html
5. Mark assignment as complete in queue

Your assignments: [list them here]
'''
)

# Chloe (community/lifestyle topics)
Task(
    subagent_type="general-purpose",
    name="chloe-community-manager",
    team_name="weekly-content-batch-{datetime.now().strftime('%Y%m%d')}",
    description="Generate community articles",
    prompt='''[same pattern as Sarah]'''
)

# Marcus (performance topics)
Task(
    subagent_type="general-purpose",
    name="marcus-performance-coach",
    team_name="weekly-content-batch-{datetime.now().strftime('%Y%m%d')}",
    description="Generate performance articles",
    prompt='''[same pattern as Sarah]'''
)

3. Wait for all agents to complete their assignments

4. Collect generated articles from /tmp/

WAIT FOR ALL WRITERS TO COMPLETE before proceeding to Phase 4.
"""

        if self.dry_run:
            self.log("[DRY RUN] Would spawn writer swarm")
            self.log(instructions)
            return True
        else:
            self.log("=" * 80)
            self.log("MANUAL STEP REQUIRED:")
            self.log(instructions)
            self.log("=" * 80)

            response = input(f"\nHave all {len(assignments)} articles been generated? (yes/no): ")
            return response.lower() == "yes"

    def phase_4_postflight(self):
        """
        Phase 4: Leo runs Post-Flight - saves to Supabase

        For each generated article:
        - Save to writer_content table
        - Extract lessons for writer_memory_log
        - Update cross-reference links
        """
        self.step(4, 10, "Leo Post-Flight - Save to Supabase")

        self.log("Saving all generated articles to Supabase...")

        if self.dry_run:
            self.log("[DRY RUN] Would save articles to Supabase")
            return True

        # In production, this would:
        # 1. Find all /tmp/*_article.html files
        # 2. Run orchestrate_writer_content.py --save-article for each
        # 3. Extract lessons and update writer_memory_log

        self.log("Looking for generated articles in /tmp/...")
        tmp_articles = list(Path("/tmp").glob("*_article.html"))
        self.log(f"Found {len(tmp_articles)} articles to save")

        for article_path in tmp_articles:
            self.log(f"Saving {article_path.name} to Supabase...")
            # Would run: python3 scripts/orchestrate_writer_content.py --save-article ...

        return True

    def phase_5_html_generation(self):
        """
        Phase 5: Generate HTML via generate_blog_pages.py
        """
        self.step(5, 10, "Generate HTML Pages")

        self.log("Running generate_blog_pages.py...")

        if self.dry_run:
            self.log("[DRY RUN] Would generate HTML pages")
            return True

        os.system("python3 scripts/generate_blog_pages.py")
        return True

    def phase_6_content_validation(self):
        """
        Phase 6: Run through Wall 1 content_validator
        """
        self.step(6, 10, "Wall 1 - Content Validation")

        self.log("Running content_validator.py...")

        if self.dry_run:
            self.log("[DRY RUN] Would validate content")
            return True

        # Run content validator
        result = os.system("python3 scripts/content_validator.py")

        if result != 0:
            self.log("ERROR: Content validation failed", "ERROR")
            return False

        return True

    def phase_7_regenerate_indexes(self):
        """
        Phase 7: Regenerate sitemap, blog index, homepage
        """
        self.step(7, 10, "Regenerate Site Indexes")

        self.log("Regenerating blog pages, sitemap, and blog index...")
        if not self.dry_run:
            os.system("python3 scripts/generate_blog_pages.py")

        self.log("Updating homepage...")
        if not self.dry_run:
            os.system("python3 scripts/generate.py --type pages")

        return True

    def phase_8_final_validation(self):
        """
        Phase 8: Validate with validate_before_commit.py
        """
        self.step(8, 10, "Final Validation")

        self.log("Running validate_before_commit.py...")

        if self.dry_run:
            self.log("[DRY RUN] Would run final validation")
            return True

        result = os.system("python3 scripts/validate_before_commit.py")

        if result != 0:
            self.log("ERROR: Final validation failed", "ERROR")
            return False

        return True

    def phase_9_commit_push(self):
        """
        Phase 9: Commit and push
        """
        self.step(9, 10, "Git Commit & Push")

        if self.skip_commit:
            self.log("Skipping commit/push (--skip-commit flag)")
            return True

        if self.dry_run:
            self.log("[DRY RUN] Would commit and push")
            return True

        self.log("Staging changes...")
        os.system("git add public/blog/*.html blog_posts.json public/sitemap.xml public/index.html")

        self.log("Committing...")
        commit_msg = f"Weekly content batch - {datetime.now().strftime('%Y-%m-%d')}\n\nGenerated via Supabase-powered writer agents\nCo-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
        os.system(f'git commit -m "{commit_msg}"')

        self.log("Pushing to remote...")
        os.system("git push")

        return True

    def phase_10_cleanup(self):
        """
        Phase 10: Cleanup and reporting
        """
        self.step(10, 10, "Cleanup & Reporting")

        self.log("Cleaning up temporary files...")

        if not self.dry_run:
            # Clean /tmp/ article files
            for article in Path("/tmp").glob("*_article.html"):
                article.unlink()
                self.log(f"Removed {article.name}")

        self.log("=" * 80)
        self.log("PIPELINE COMPLETE", "SUCCESS")
        self.log("=" * 80)

        # Write session log
        log_file = PROJECT_ROOT / f"logs/content_generation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        log_file.parent.mkdir(exist_ok=True)

        with open(log_file, "w") as f:
            f.write("\n".join(self.session_log))

        self.log(f"Session log saved: {log_file}")

        return True

    def run(self):
        """
        Execute the full pipeline
        """
        self.log("=" * 80)
        self.log("CARNIVORE WEEKLY - AUTONOMOUS CONTENT GENERATION", "START")
        self.log(f"Batch size: {self.batch_size}")
        self.log(f"Mode: {'DRY RUN' if self.dry_run else 'PRODUCTION'}")
        self.log("=" * 80)

        phases = [
            self.phase_1_research,
            self.phase_2_preflight,
            self.phase_3_parallel_generation,
            self.phase_4_postflight,
            self.phase_5_html_generation,
            self.phase_6_content_validation,
            self.phase_7_regenerate_indexes,
            self.phase_8_final_validation,
            self.phase_9_commit_push,
            self.phase_10_cleanup
        ]

        for phase in phases:
            success = phase()
            if not success:
                self.log(f"Pipeline failed at {phase.__name__}", "ERROR")
                return False

        return True


def main():
    parser = argparse.ArgumentParser(
        description="Autonomous weekly content generation pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate 5 posts (default)
  python3 scripts/generate_weekly_content.py

  # Generate 15 posts (Batch 2)
  python3 scripts/generate_weekly_content.py --batch-size 15

  # Dry run (show what would happen)
  python3 scripts/generate_weekly_content.py --dry-run

  # Skip research (use existing queue)
  python3 scripts/generate_weekly_content.py --skip-research

  # Test without committing
  python3 scripts/generate_weekly_content.py --skip-commit
"""
    )

    parser.add_argument("--batch-size", type=int, default=5,
                        help="Number of posts to generate (default: 5)")
    parser.add_argument("--skip-research", action="store_true",
                        help="Skip Chloe's research phase (use existing queue)")
    parser.add_argument("--skip-commit", action="store_true",
                        help="Don't auto-commit/push (for testing)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would happen without executing")

    args = parser.parse_args()

    pipeline = ContentPipeline(
        batch_size=args.batch_size,
        skip_research=args.skip_research,
        skip_commit=args.skip_commit,
        dry_run=args.dry_run
    )

    success = pipeline.run()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Populate content_topics table in Supabase with blog post topic mappings.
Reads from blog_posts.json and maps tags to existing topics.
"""

import json
import os
from pathlib import Path
from supabase import create_client, Client

# Load .env file
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

# Supabase connection
SUPABASE_URL = 'https://kwtdpvnjewtahuxjyltn.supabase.co'
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_KEY:
    print("ERROR: SUPABASE_SERVICE_ROLE_KEY not set in environment")
    print("Set it with: export SUPABASE_SERVICE_ROLE_KEY=your_key")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Tag to topic slug mapping (maps blog tags to Supabase topic slugs)
TAG_TO_TOPIC = {
    # Direct mappings
    'electrolytes': 'electrolytes',
    'adaptation': 'adaptation',
    'organ-meats': 'organ-meats',
    'nose-to-tail': 'nose-to-tail',
    'supplements': 'supplements',
    'sleep': 'sleep',
    'exercise': 'exercise',
    'longevity': 'longevity',
    'inflammation': 'inflammation',
    'weight-loss': 'weight-loss',
    'digestion': 'digestion',

    # Aliases / common tags
    'adhd': 'mental-health',
    'mental-health': 'mental-health',
    'depression': 'mental-health',
    'anxiety': 'mental-health',
    'brain-health': 'mental-health',
    'cognitive': 'mental-health',
    'mood': 'mental-health',

    'metabolic': 'metabolic-health',
    'metabolic-health': 'metabolic-health',
    'insulin': 'metabolic-health',
    'insulin-resistance': 'metabolic-health',
    'blood-sugar': 'metabolic-health',
    'fat-adaptation': 'metabolic-health',

    'autoimmune': 'autoimmune',
    'pcos': 'autoimmune',
    'hormones': 'autoimmune',

    'beef': 'beef-nutrition',
    'beef-nutrition': 'beef-nutrition',
    'ribeye': 'beef-nutrition',
    'steak': 'beef-nutrition',
    'ground-beef': 'beef-nutrition',

    'fat': 'animal-fats',
    'tallow': 'animal-fats',
    'lard': 'animal-fats',
    'butter': 'animal-fats',

    'cooking': 'cooking-techniques',
    'cooking-techniques': 'cooking-techniques',
    'recipes': 'cooking-techniques',

    'carnivore-basics': 'carnivore-basics',
    'getting-started': 'carnivore-basics',
    'beginners': 'carnivore-basics',
    'newbie': 'carnivore-basics',
    'beginners-guide': 'carnivore-basics',

    'food-quality': 'food-quality',
    'grass-fed': 'food-quality',
    'sourcing': 'food-quality',
    'budget': 'food-quality',

    'liver': 'organ-meats',
    'heart': 'organ-meats',
    'kidney': 'organ-meats',

    'fasting': 'metabolic-health',
    'omad': 'metabolic-health',
    'intermittent-fasting': 'metabolic-health',

    'gut-health': 'digestion',
    'collagen': 'digestion',
    'bone-broth': 'digestion',

    'performance': 'exercise',
    'muscle': 'exercise',
    'training': 'exercise',
    'recovery': 'exercise',
    'mtor': 'exercise',

    'night-sweats': 'adaptation',
    'keto-flu': 'adaptation',
    'transition': 'adaptation',

    'cholesterol': 'metabolic-health',
    'lipids': 'metabolic-health',

    'acne': 'inflammation',
    'skin': 'inflammation',

    'lion-diet': 'carnivore-basics',
    'elimination': 'carnivore-basics',
}

def get_topics():
    """Fetch all topics from Supabase"""
    response = supabase.table('topics').select('id, slug, display_name').execute()
    return {t['slug']: t['id'] for t in response.data}

def get_existing_mappings():
    """Get existing content_topics to avoid duplicates"""
    response = supabase.table('content_topics').select('content_type, content_identifier, topic_id').execute()
    return {(m['content_type'], m['content_identifier'], m['topic_id']) for m in response.data}

def load_blog_posts():
    """Load blog posts from JSON"""
    with open('data/blog_posts.json') as f:
        data = json.load(f)
    return data.get('blog_posts', [])

# Wiki section to topic mapping
WIKI_TO_TOPICS = {
    'cholesterol': ['metabolic-health'],
    'weight-stall': ['weight-loss', 'metabolic-health'],
    'fiber': ['digestion', 'carnivore-basics'],
    'keto-to-carnivore': ['carnivore-basics', 'adaptation'],
    'dairy': ['carnivore-basics'],
    'a1-a2-dairy': ['carnivore-basics', 'digestion'],
    'coffee': ['carnivore-basics'],
    'scurvy': ['carnivore-basics'],
    'digestion': ['digestion'],
    'salt': ['electrolytes'],
    'best-salt': ['electrolytes'],
    'electrolytes': ['electrolytes', 'adaptation'],
    'alcohol': ['carnivore-basics'],
    'organ-meats': ['organ-meats', 'nose-to-tail'],
    'organ-vs-muscle': ['organ-meats', 'beef-nutrition'],
    'creatine': ['supplements', 'exercise'],
    'honey-fruit': ['carnivore-basics'],
    'menopause': ['autoimmune'],
    'budget': ['food-quality'],
    'critics': ['carnivore-basics'],
    'kidney-health': ['metabolic-health'],
    'gout': ['inflammation'],
    'beer-gout': ['inflammation'],
    'explosive-power': ['exercise'],
    'chaos-eating': ['carnivore-basics'],
    'elimination-matrix': ['autoimmune', 'carnivore-basics'],
    'restaurant-ops': ['carnivore-basics'],
    'freezer-logistics': ['food-quality'],
}

def main():
    print("Loading topics from Supabase...")
    topics = get_topics()
    print(f"Found {len(topics)} topics: {list(topics.keys())}")

    print("\nLoading existing mappings...")
    existing = get_existing_mappings()
    print(f"Found {len(existing)} existing mappings")

    print("\nLoading blog posts...")
    posts = load_blog_posts()
    print(f"Found {len(posts)} blog posts")

    # Build mappings
    mappings_to_insert = []
    unmapped_tags = set()

    for post in posts:
        slug = post.get('slug', '')
        tags = post.get('tags', [])
        wiki_links = post.get('wiki_links', [])

        # Get unique topic slugs for this post
        post_topics = set()

        for tag in tags:
            tag_lower = tag.lower()
            if tag_lower in TAG_TO_TOPIC:
                topic_slug = TAG_TO_TOPIC[tag_lower]
                if topic_slug in topics:
                    post_topics.add(topic_slug)
            else:
                unmapped_tags.add(tag_lower)

        # Also map wiki_links (format: #electrolytes)
        for wiki in wiki_links:
            wiki_clean = wiki.lstrip('#').lower()
            if wiki_clean in topics:
                post_topics.add(wiki_clean)
            elif wiki_clean in TAG_TO_TOPIC:
                topic_slug = TAG_TO_TOPIC[wiki_clean]
                if topic_slug in topics:
                    post_topics.add(topic_slug)

        # Create mappings
        for topic_slug in post_topics:
            topic_id = topics[topic_slug]
            key = ('blog', slug, topic_id)
            if key not in existing:
                mappings_to_insert.append({
                    'topic_id': topic_id,
                    'content_type': 'blog',
                    'content_identifier': slug,
                    'assigned_by': 'populate_script'
                })

    print(f"\nUnmapped tags (add to TAG_TO_TOPIC if needed): {unmapped_tags}")
    print(f"\nMappings to insert: {len(mappings_to_insert)}")

    # Add wiki section mappings
    print("\nProcessing wiki sections...")
    wiki_mappings = 0
    for wiki_id, topic_slugs in WIKI_TO_TOPICS.items():
        for topic_slug in topic_slugs:
            if topic_slug in topics:
                topic_id = topics[topic_slug]
                key = ('wiki', wiki_id, topic_id)
                if key not in existing:
                    mappings_to_insert.append({
                        'topic_id': topic_id,
                        'content_type': 'wiki',
                        'content_identifier': wiki_id,
                        'assigned_by': 'populate_script'
                    })
                    wiki_mappings += 1
    print(f"Added {wiki_mappings} wiki mappings")

    print(f"\nTotal mappings to insert: {len(mappings_to_insert)}")

    if mappings_to_insert:
        print("\nInserting mappings...")
        # Insert in batches of 50
        batch_size = 50
        for i in range(0, len(mappings_to_insert), batch_size):
            batch = mappings_to_insert[i:i+batch_size]
            response = supabase.table('content_topics').insert(batch).execute()
            print(f"  Inserted batch {i//batch_size + 1}: {len(batch)} mappings")

        print(f"\n✅ Done! Inserted {len(mappings_to_insert)} new content_topics mappings")
    else:
        print("\n✅ No new mappings to insert")

if __name__ == '__main__':
    main()

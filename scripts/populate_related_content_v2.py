#!/usr/bin/env python3
"""
Populate content_topics table by scanning actual blog HTML files.
This ensures the content_identifier matches what's in data-content-id.
"""

import os
import re
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

SUPABASE_URL = 'https://kwtdpvnjewtahuxjyltn.supabase.co'
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_KEY:
    print("ERROR: SUPABASE_SERVICE_ROLE_KEY not set")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Map blog post content keywords to topics
KEYWORD_TO_TOPICS = {
    # Mental health
    'adhd': ['mental-health'],
    'depression': ['mental-health'],
    'anxiety': ['mental-health'],
    'brain': ['mental-health'],
    'cognitive': ['mental-health'],
    'mood': ['mental-health'],

    # Metabolic
    'insulin': ['metabolic-health'],
    'glucose': ['metabolic-health'],
    'metabolic': ['metabolic-health'],
    'cholesterol': ['metabolic-health'],
    'lipid': ['metabolic-health'],
    'blood-sugar': ['metabolic-health'],
    'fasting': ['metabolic-health'],

    # Weight/body comp
    'weight': ['weight-loss'],
    'fat-loss': ['weight-loss'],
    'psmf': ['weight-loss'],
    'plateau': ['weight-loss'],
    'stall': ['weight-loss'],

    # Adaptation
    'adaptation': ['adaptation'],
    'transition': ['adaptation'],
    'keto-flu': ['adaptation'],
    'night-sweat': ['adaptation'],
    'beginner': ['adaptation', 'carnivore-basics'],
    'new-year': ['carnivore-basics'],
    'getting-started': ['carnivore-basics'],
    'blueprint': ['carnivore-basics'],

    # Hormones/autoimmune
    'pcos': ['autoimmune'],
    'hormone': ['autoimmune'],
    'autoimmune': ['autoimmune'],
    'thyroid': ['autoimmune'],
    'women': ['autoimmune'],

    # Performance
    'mtor': ['exercise'],
    'muscle': ['exercise'],
    'performance': ['exercise'],
    'workout': ['exercise'],
    'training': ['exercise'],
    'recovery': ['exercise'],

    # Nutrition
    'organ-meat': ['organ-meats', 'nose-to-tail'],
    'liver': ['organ-meats'],
    'heart': ['organ-meats'],
    'nose-to-tail': ['nose-to-tail'],
    'beef': ['beef-nutrition'],
    'ground-beef': ['beef-nutrition', 'food-quality'],
    'ribeye': ['beef-nutrition'],
    'steak': ['beef-nutrition'],

    # Electrolytes
    'electrolyte': ['electrolytes', 'adaptation'],
    'sodium': ['electrolytes'],
    'potassium': ['electrolytes'],
    'magnesium': ['electrolytes'],
    'salt': ['electrolytes'],

    # Digestion
    'digestion': ['digestion'],
    'gut': ['digestion'],
    'bone-broth': ['digestion'],
    'collagen': ['digestion'],

    # Inflammation
    'inflammation': ['inflammation'],
    'acne': ['inflammation'],
    'skin': ['inflammation'],

    # Food sourcing
    'budget': ['food-quality'],
    'freezer': ['food-quality'],
    'grass-fed': ['food-quality'],
    'sourcing': ['food-quality'],
    'dollar': ['food-quality'],

    # Sleep
    'sleep': ['sleep'],

    # Supplements
    'supplement': ['supplements'],
    'creatine': ['supplements'],

    # Diet types
    'lion-diet': ['carnivore-basics'],
    'elimination': ['carnivore-basics', 'autoimmune'],
    'carnivore-bar': ['carnivore-basics'],

    # Travel/lifestyle
    'travel': ['carnivore-basics'],
    'restaurant': ['carnivore-basics'],
    'family': ['carnivore-basics'],
    'dating': ['carnivore-basics'],
    'social': ['carnivore-basics'],
}

def get_topics():
    """Fetch all topics from Supabase"""
    response = supabase.table('topics').select('id, slug, display_name').execute()
    return {t['slug']: t['id'] for t in response.data}

def get_existing_mappings():
    """Get existing content_topics to avoid duplicates"""
    response = supabase.table('content_topics').select('content_type, content_identifier, topic_id').execute()
    return {(m['content_type'], m['content_identifier'], m['topic_id']) for m in response.data}

def extract_content_id(html_content):
    """Extract data-content-id from HTML"""
    match = re.search(r'data-content-id="([^"]+)"', html_content)
    return match.group(1) if match else None

def infer_topics_from_filename(filename):
    """Infer topics from blog filename/slug"""
    topics = set()
    filename_lower = filename.lower()

    for keyword, topic_list in KEYWORD_TO_TOPICS.items():
        if keyword in filename_lower:
            topics.update(topic_list)

    return topics

def main():
    print("Loading topics from Supabase...")
    topics = get_topics()
    print(f"Found {len(topics)} topics")

    print("\nLoading existing mappings...")
    existing = get_existing_mappings()
    print(f"Found {len(existing)} existing mappings")

    # Scan blog HTML files
    blog_dir = Path(__file__).parent.parent / 'public' / 'blog'
    html_files = list(blog_dir.glob('*.html'))
    html_files = [f for f in html_files if f.name != 'index.html']

    print(f"\nScanning {len(html_files)} blog HTML files...")

    mappings_to_insert = []

    for html_file in html_files:
        with open(html_file) as f:
            content = f.read()

        content_id = extract_content_id(content)
        if not content_id:
            # Use filename as content_id
            content_id = html_file.stem

        # Infer topics from filename
        post_topics = infer_topics_from_filename(content_id)

        for topic_slug in post_topics:
            if topic_slug in topics:
                topic_id = topics[topic_slug]
                key = ('blog', content_id, topic_id)
                if key not in existing:
                    mappings_to_insert.append({
                        'topic_id': topic_id,
                        'content_type': 'blog',
                        'content_identifier': content_id,
                        'assigned_by': 'auto_scan'
                    })
                    existing.add(key)  # Prevent duplicates within this run

    print(f"\nNew mappings to insert: {len(mappings_to_insert)}")

    if mappings_to_insert:
        print("\nInserting mappings...")
        batch_size = 50
        for i in range(0, len(mappings_to_insert), batch_size):
            batch = mappings_to_insert[i:i+batch_size]
            response = supabase.table('content_topics').insert(batch).execute()
            print(f"  Batch {i//batch_size + 1}: {len(batch)} mappings")

        print(f"\n✅ Done! Inserted {len(mappings_to_insert)} mappings")
    else:
        print("\n✅ No new mappings needed")

    # Show sample of what related content would look like
    print("\n--- Sample Related Content Query ---")
    print("Testing with 2025-12-23-adhd-connection:")
    response = supabase.table('v_related_content').select('*').eq(
        'source_type', 'blog'
    ).eq(
        'source_identifier', '2025-12-23-adhd-connection'
    ).limit(10).execute()

    if response.data:
        for item in response.data:
            print(f"  {item['related_type']}: {item['related_identifier']} (via {item['shared_topic_name']})")
    else:
        print("  No related content found yet")

if __name__ == '__main__':
    main()

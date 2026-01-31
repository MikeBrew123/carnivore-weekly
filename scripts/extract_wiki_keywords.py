#!/usr/bin/env python3
"""
Extract wiki keywords and generate JSON mapping for auto-linking.

This script parses the wiki.html file to extract all available wiki topics
and their anchors, creating a JSON mapping that can be used for automatic
keyword detection and linking in content.

Usage:
    python extract_wiki_keywords.py
"""

import json
import re
from pathlib import Path
from typing import Dict, List


def extract_wiki_topics(wiki_html_path: str) -> Dict[str, str]:
    """
    Extract all wiki topics and their anchors from wiki.html.

    Args:
        wiki_html_path: Path to the wiki.html file

    Returns:
        Dictionary mapping topic names to their anchor URLs
    """
    with open(wiki_html_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find all topic divs with id attributes
    # Pattern: <div class="topic" id="anchor-name">
    pattern = r'<div\s+class="topic"\s+id="([^"]+)">'
    topic_ids = re.findall(pattern, content)

    # Find topic headings and map to IDs
    wiki_topics = {}

    for topic_id in topic_ids:
        # Find the heading that follows this topic div
        # Look for h2 or h3 tags that contain the topic title
        topic_pattern = f'<div\\s+class="topic"\\s+id="{topic_id}">[\\s\\S]*?<h2[^>]*>([^<]+)</h2>'
        match = re.search(topic_pattern, content)

        if match:
            title = match.group(1)
            # Clean up title - extract meaningful keywords
            # First remove emojis and special punctuation
            title_clean = re.sub(r"[^\w\s&()-]", "", title).strip()
            # Remove extra spaces
            title_clean = re.sub(r"\s+", " ", title_clean)

            if title_clean and len(title_clean) > 3:
                wiki_topics[title_clean.lower()] = f"/wiki/#{topic_id}"
                # Also add the anchor ID as a keyword for direct matching
                wiki_topics[topic_id.replace("-", " ")] = f"/wiki/#{topic_id}"

    return wiki_topics


def expand_keywords(wiki_topics: Dict[str, str]) -> Dict[str, str]:
    """
    Expand wiki topics to include variations and related keywords.

    Args:
        wiki_topics: Dictionary of topic names and URLs

    Returns:
        Expanded dictionary with additional keyword variations
    """
    expanded = dict(wiki_topics)

    # Define keyword expansions and aliases
    # Map from partial keywords to their URL targets
    expansions = {
        "cholesterol": {
            "url_key": "cholesterol",
            "aliases": [
                "ldl",
                "hdl",
                "triglycerides",
                "statins",
                "lean mass hyper responder",
                "ketosis",
                "ketogenic",
            ],
        },
        "weight stall": {
            "url_key": "weight-stall",
            "aliases": ["weight loss stall", "stall", "plateau", "metabolic adaptation"],
        },
        "fiber": {"url_key": "fiber", "aliases": ["dietary fiber", "fibre", "constipation"]},
        "dairy": {
            "url_key": "dairy",
            "aliases": ["milk", "cheese", "yogurt", "lactose", "casein", "butter"],
        },
        "coffee": {"url_key": "coffee", "aliases": ["caffeine", "tea", "caffeinated"]},
        "scurvy": {"url_key": "scurvy", "aliases": ["vitamin c", "vitamin-c", "ascorbic acid"]},
        "digestion": {
            "url_key": "digestion",
            "aliases": ["digestive", "gut", "microbiome", "constipation", "diarrhea"],
        },
        "salt": {"url_key": "salt", "aliases": ["sodium", "sodium chloride", "sea salt"]},
        "electrolytes": {
            "url_key": "electrolytes",
            "aliases": ["sodium", "potassium", "magnesium", "leg cramps"],
        },
        "alcohol": {
            "url_key": "alcohol",
            "aliases": ["ethanol", "beer", "wine", "liquor", "vodka", "whiskey"],
        },
        "organ meats": {
            "url_key": "organ-meats",
            "aliases": ["organs", "liver", "kidney", "heart", "nose to tail"],
        },
        "budget": {"url_key": "budget", "aliases": ["cost", "affordable", "cheap", "inexpensive"]},
        "critics": {
            "url_key": "critics",
            "aliases": ["criticism", "critique", "vegan", "plant-based"],
        },
        "gout": {"url_key": "gout", "aliases": ["uric acid", "purine", "joint pain"]},
        "beer gout": {"url_key": "beer-gout", "aliases": ["beer", "fermented", "hops"]},
    }

    # Add expansions to the dictionary
    for base_keyword, config in expansions.items():
        # Find the URL by looking for any of these patterns in wiki_topics
        url = None
        url_key = config["url_key"]

        # Try to find the URL from existing wiki topics
        for key, val in wiki_topics.items():
            if (
                url_key in key
                or key.replace(" ", "-") == url_key
                or key.replace(" ", "-") == url_key.replace("-", "")
            ):
                url = val
                break

        # If we found a URL, add all aliases
        if url:
            for alias in config["aliases"]:
                if alias.lower() not in expanded:
                    expanded[alias.lower()] = url

    return expanded


def generate_keyword_groups(keywords: Dict[str, str]) -> Dict[str, List[str]]:
    """
    Group keywords by their target URL for deduplication.

    Args:
        keywords: Dictionary mapping keywords to URLs

    Returns:
        Dictionary mapping URLs to lists of keywords
    """
    groups = {}

    for keyword, url in keywords.items():
        if url not in groups:
            groups[url] = []
        groups[url].append(keyword)

    # Sort keywords by length (longest first) to prioritize specific terms
    for url in groups:
        groups[url].sort(key=len, reverse=True)

    return groups


def create_regex_patterns(keyword_groups: Dict[str, List[str]]) -> Dict[str, str]:
    """
    Create regex patterns for efficient keyword matching.

    Patterns will:
    - Match whole words only (not substrings)
    - Be case-insensitive
    - Handle word boundaries properly

    Args:
        keyword_groups: Dictionary mapping URLs to keyword lists

    Returns:
        Dictionary mapping URLs to their regex patterns
    """
    patterns = {}

    for url, keywords in keyword_groups.items():
        # Sort by length descending to match longest phrases first
        sorted_keywords = sorted(keywords, key=len, reverse=True)

        # Escape special regex characters and create pattern
        escaped = [re.escape(kw) for kw in sorted_keywords]

        # Create pattern that matches whole words/phrases
        # Use word boundaries: \b for single words, space-based for phrases
        pattern_parts = []
        for kw in escaped:
            # If keyword contains spaces, use space as boundary
            if " " in kw:
                pattern_parts.append(f"(?:^|\\s)({kw})(?:\\s|$|[.,;:!?])")
            else:
                pattern_parts.append(f"\\b({kw})\\b")

        # Combine with OR operator
        combined = "|".join(pattern_parts)
        patterns[url] = combined

    return patterns


def main():
    """Main execution function."""
    # Setup paths
    project_root = Path(__file__).parent.parent
    wiki_html_path = project_root / "public" / "wiki" / "index.html"
    output_json_path = project_root / "data" / "wiki-keywords.json"

    # Verify input file exists
    if not wiki_html_path.exists():
        print(f"Error: Wiki HTML file not found at {wiki_html_path}")
        return False

    try:
        print("Extracting wiki topics from wiki.html...")
        wiki_topics = extract_wiki_topics(str(wiki_html_path))
        print(f"  Found {len(wiki_topics)} topics")

        print("Expanding keywords with variations...")
        expanded_keywords = expand_keywords(wiki_topics)
        print(f"  Total keywords: {len(expanded_keywords)}")

        print("Generating keyword groups by target URL...")
        keyword_groups = generate_keyword_groups(expanded_keywords)
        print(f"  Created {len(keyword_groups)} unique wiki pages")

        print("Creating regex patterns for efficient matching...")
        regex_patterns = create_regex_patterns(keyword_groups)

        # Prepare output data
        output_data = {
            "version": "1.0",
            "generated_at": __import__("datetime").datetime.now().isoformat(),
            "total_keywords": len(expanded_keywords),
            "total_pages": len(keyword_groups),
            "keyword_map": expanded_keywords,
            "keyword_groups": keyword_groups,
            "regex_patterns": regex_patterns,
            "metadata": {
                "max_links_per_1000_words": 5,
                "min_keyword_length": 3,
                "case_sensitive": False,
                "skip_existing_links": True,
            },
        }

        # Create output directory if needed
        output_json_path.parent.mkdir(parents=True, exist_ok=True)

        # Write output JSON
        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)

        print(f"\nSuccess! Wiki keywords extracted to: {output_json_path}")
        print(f"  Keywords extracted: {len(expanded_keywords)}")
        print(f"  Wiki pages indexed: {len(keyword_groups)}")

        # Print sample keywords
        print("\nSample keywords:")
        for keyword in list(expanded_keywords.keys())[:10]:
            print(f"  - {keyword}")

        return True

    except Exception as e:
        print(f"Error during extraction: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)

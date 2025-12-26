#!/usr/bin/env python3
"""
Page Generator for Carnivore Weekly

This script generates HTML pages from the analyzed YouTube data
using Jinja2 templates.

Author: Created with Claude Code
Date: 2025-12-26
"""

import json
from datetime import datetime
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / 'data'
TEMPLATES_DIR = PROJECT_ROOT / 'templates'
PUBLIC_DIR = PROJECT_ROOT / 'public'

INPUT_FILE = DATA_DIR / 'analyzed_content.json'
OUTPUT_FILE = PUBLIC_DIR / 'index.html'


# ============================================================================
# PAGE GENERATOR CLASS
# ============================================================================

class PageGenerator:
    """
    Generates HTML pages from analyzed content
    """

    def __init__(self):
        """Initialize the Jinja2 environment"""
        self.env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))
        print("✓ Template engine initialized")


    def load_analyzed_data(self, input_file: Path) -> dict:
        """Load the analyzed content from JSON file"""
        print(f"\n📂 Loading analyzed data from: {input_file}")

        if not input_file.exists():
            raise FileNotFoundError(
                f"Analyzed data file not found: {input_file}\n"
                "Please run content_analyzer.py first!"
            )

        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        print(f"✓ Loaded analysis from {data['analysis_date']}")
        return data


    def generate_homepage(self, data: dict, output_file: Path):
        """Generate the main homepage"""
        print(f"\n🎨 Generating homepage...")

        # Load the template
        template = self.env.get_template('index_template.html')

        # Create mapping of creator names to channel IDs
        creator_channels = {}
        if 'creators_data' in data:
            for creator in data['creators_data']:
                creator_channels[creator['channel_name']] = creator['channel_id']

        # Prepare template variables
        template_vars = {
            # Analysis metadata
            'analysis_date': data['analysis_date'],
            'generation_timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),

            # Source data info
            'search_query': data['source_data']['search_query'],
            'total_creators': data['source_data']['total_creators'],
            'total_videos': data['source_data']['total_videos'],

            # Analysis results
            'weekly_summary': data['analysis']['weekly_summary'],
            'trending_topics': data['analysis']['trending_topics'],
            'top_videos': data['analysis']['top_videos'],
            'key_insights': data['analysis']['key_insights'],
            'community_sentiment': data['analysis']['community_sentiment'],
            'recommended_watching': data['analysis']['recommended_watching'],

            # Q&A section with scientific citations
            'qa_section': data['analysis'].get('qa_section', []),

            # Creator mappings for links
            'creator_channels': creator_channels
        }

        # Render the template
        html_content = template.render(**template_vars)

        # Create output directory
        output_file.parent.mkdir(parents=True, exist_ok=True)

        # Write to file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)

        print(f"✓ Homepage generated: {output_file}")


    def run_generation(self):
        """Main method to run the page generation"""
        print("\n" + "="*70)
        print("🎨 CARNIVORE WEEKLY PAGE GENERATOR")
        print("="*70)

        try:
            # Load analyzed data
            data = self.load_analyzed_data(INPUT_FILE)

            # Generate homepage
            self.generate_homepage(data, OUTPUT_FILE)

            print("\n" + "="*70)
            print("✓ PAGE GENERATION COMPLETE!")
            print("="*70)
            print(f"\n🌐 Website generated: {OUTPUT_FILE}")
            print(f"\n💡 To view your site, open the file in a browser:")
            print(f"   open {OUTPUT_FILE}")
            print()

        except FileNotFoundError as e:
            print(f"\n✗ Error: {e}")
        except Exception as e:
            print(f"\n✗ Unexpected error: {e}")
            raise


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """Main function"""
    try:
        generator = PageGenerator()
        generator.run_generation()

    except KeyboardInterrupt:
        print("\n\n⚠ Generation interrupted by user")

    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        raise


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Featured Channels Generator for Carnivore Weekly

Analyzes archive data to rank channels by appearance frequency
and generates a featured channels page with channel thumbnails.

Author: Created with Claude Code
Date: 2025-12-26
"""

import json
import os
from datetime import datetime
from pathlib import Path
from collections import defaultdict
from jinja2 import Environment, FileSystemLoader
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / 'data' / 'archive'
TEMPLATES_DIR = PROJECT_ROOT / 'templates'
PUBLIC_DIR = PROJECT_ROOT / 'public'

# YouTube API setup
YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')

# ============================================================================
# FEATURED CHANNELS GENERATOR CLASS
# ============================================================================

class ChannelsGenerator:
    """
    Generates featured channels page from archive data
    """

    def __init__(self):
        """Initialize the Jinja2 environment"""
        self.env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))
        print("✓ Channels generator initialized")


    def get_channel_thumbnail(self, channel_id: str) -> str:
        """
        Fetch channel thumbnail from YouTube API
        """
        if not YOUTUBE_API_KEY:
            return "https://via.placeholder.com/200x200/8b4513/f4e4d4?text=Channel"

        try:
            url = f"https://www.googleapis.com/youtube/v3/channels"
            params = {
                'part': 'snippet',
                'id': channel_id,
                'key': YOUTUBE_API_KEY
            }

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if 'items' in data and len(data['items']) > 0:
                thumbnails = data['items'][0]['snippet']['thumbnails']
                # Try to get highest quality thumbnail
                if 'high' in thumbnails:
                    return thumbnails['high']['url']
                elif 'medium' in thumbnails:
                    return thumbnails['medium']['url']
                elif 'default' in thumbnails:
                    return thumbnails['default']['url']

        except Exception as e:
            print(f"  ⚠ Could not fetch thumbnail for {channel_id}: {e}")

        return "https://via.placeholder.com/200x200/8b4513/f4e4d4?text=Channel"


    def analyze_channel_appearances(self):
        """
        Analyze all archive files to count channel appearances
        """
        print(f"\n📊 Analyzing channel appearances...")

        channel_stats = defaultdict(lambda: {
            'name': '',
            'channel_id': '',
            'appearances': 0,
            'total_videos': 0,
            'latest_date': '',
            'thumbnail_url': '',
            'all_videos': []  # Track all videos to find top 3
        })

        # Get all archived weeks
        archive_files = sorted(DATA_DIR.glob('*.json'), reverse=True)

        if not archive_files:
            print("  ⚠ No archive files found")
            return []

        for archive_file in archive_files:
            with open(archive_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                week_date = data['analysis_date']

                # Count appearances in creators_data
                if 'creators_data' in data:
                    for creator in data['creators_data']:
                        channel_name = creator['channel_name']
                        channel_id = creator['channel_id']
                        videos = creator.get('videos', [])
                        video_count = len(videos)

                        channel_stats[channel_id]['name'] = channel_name
                        channel_stats[channel_id]['channel_id'] = channel_id
                        channel_stats[channel_id]['appearances'] += 1
                        channel_stats[channel_id]['total_videos'] += video_count

                        # Collect all videos for this channel
                        for video in videos:
                            channel_stats[channel_id]['all_videos'].append({
                                'video_id': video.get('video_id', ''),
                                'title': video.get('title', ''),
                                'view_count': int(video.get('statistics', {}).get('view_count', 0)),
                                'published_at': video.get('published_at', '')
                            })

                        # Update latest date if this week is more recent
                        if not channel_stats[channel_id]['latest_date'] or week_date > channel_stats[channel_id]['latest_date']:
                            channel_stats[channel_id]['latest_date'] = week_date

        print(f"✓ Found {len(channel_stats)} unique channels")

        # Convert to list and sort by appearances (descending)
        channels_list = list(channel_stats.values())
        channels_list.sort(key=lambda x: (x['appearances'], x['total_videos']), reverse=True)

        # Get top 3 videos for each channel
        print(f"\n🎬 Finding top videos for each channel...")
        for channel in channels_list:
            # Sort videos by view count and take top 3
            all_videos = channel['all_videos']
            all_videos.sort(key=lambda x: x['view_count'], reverse=True)
            channel['top_videos'] = all_videos[:3]
            # Remove the all_videos list as we don't need it in the template
            del channel['all_videos']

        # Fetch thumbnails
        print(f"\n🖼️  Fetching channel thumbnails...")
        for i, channel in enumerate(channels_list, 1):
            print(f"  [{i}/{len(channels_list)}] {channel['name']}")
            channel['thumbnail_url'] = self.get_channel_thumbnail(channel['channel_id'])

        return channels_list


    def generate_channels_page(self, channels: list):
        """
        Generate the featured channels page
        """
        print(f"\n📄 Generating featured channels page...")

        # Load template
        try:
            template = self.env.get_template('channels_template.html')
        except Exception as e:
            print(f"  ✗ Template not found: {e}")
            return

        # Prepare template variables
        template_vars = {
            'channels': channels,
            'total_channels': len(channels),
            'generation_timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'total_weeks': len(list(DATA_DIR.glob('*.json')))
        }

        # Render the template
        html_content = template.render(**template_vars)

        # Save the page
        channels_file = PUBLIC_DIR / 'channels.html'
        with open(channels_file, 'w', encoding='utf-8') as f:
            f.write(html_content)

        print(f"✓ Generated channels page: {channels_file}")


    def run(self):
        """
        Main method to run channel page generation
        """
        print("\n" + "="*70)
        print("📺 CARNIVORE WEEKLY FEATURED CHANNELS GENERATOR")
        print("="*70)

        try:
            # Analyze channel appearances
            channels = self.analyze_channel_appearances()

            if not channels:
                print("\n⚠ No channels found in archive")
                return

            # Generate the page
            self.generate_channels_page(channels)

            print("\n" + "="*70)
            print("✓ CHANNELS PAGE GENERATION COMPLETE!")
            print("="*70)
            print(f"\n📊 Statistics:")
            print(f"   - Total channels: {len(channels)}")
            print(f"   - Most active: {channels[0]['name']} ({channels[0]['appearances']} weeks)")
            print(f"\n📁 File created:")
            print(f"   - public/channels.html")

        except Exception as e:
            print(f"\n✗ Error generating channels page: {e}")
            raise


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """Main function"""
    try:
        generator = ChannelsGenerator()
        generator.run()

    except KeyboardInterrupt:
        print("\n\n⚠ Generation interrupted")
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        raise


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Simple test to verify YouTube API key works with videos.list method
"""

import os
from dotenv import load_dotenv
from googleapiclient.discovery import build

load_dotenv()

YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')

print(f"Testing API key: {YOUTUBE_API_KEY[:20]}...")

try:
    youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
    print("✓ API client initialized")

    # Test with videos.list method (less restricted than search)
    # Using a popular video ID as test
    print("\nTesting videos.list method...")
    request = youtube.videos().list(
        part='snippet,statistics',
        id='dQw4w9WgXcQ'  # Random popular video
    )

    response = request.execute()

    if response.get('items'):
        video = response['items'][0]
        print(f"✓ SUCCESS! API key works!")
        print(f"   Video title: {video['snippet']['title']}")
        print(f"   Views: {video['statistics']['viewCount']}")
    else:
        print("✗ No video found")

except Exception as e:
    print(f"✗ Error: {e}")

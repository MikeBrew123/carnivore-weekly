================================================================================
CARNIVORE WEEKLY - CURRENT STATUS (2026-01-01)
================================================================================

⚠️ TEMPORARY PAGE IN USE - AWAITING YOUTUBE API QUOTA APPROVAL

SITUATION:
- YouTube API quota was exhausted on 2026-01-01
- This prevents automatic collection of YouTube video data
- The full homepage requires this data to display Prime Cuts and trending topics

CURRENT FILES:
- index.html ...................... LIVE (currently temporary page)
- index-temporary.html ............ Backup of temporary page
- index-full.html ................. Full page (ready to restore)

HOW TO RESTORE:
1. Verify YouTube API quota approved at:
   https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas

2. Run YouTube data collector:
   python3 scripts/youtube_collector.py

3. Regenerate homepage:
   python3 scripts/generate.py

4. Restore full page:
   cp index-full.html index.html

DOCUMENTATION:
- See: TEMPORARY_PAGE_STATUS.md (in project root)
- Has complete timeline, file locations, and restore procedures

IMPORTANT FILES:
- TEMPORARY_PAGE_STATUS.md ........ Complete documentation
- docs/youtube-api-usage.md ....... Quota increase justification
- scripts/youtube_collector.py ... YouTube data collector
- data/youtube_data.json ......... Collected video data
- data/analyzed_content.json .... Agent analysis data

DO NOT:
❌ Delete index-full.html
❌ Manually edit data JSON files
❌ Assume the site is permanently broken

================================================================================
Next session: Start by reading TEMPORARY_PAGE_STATUS.md
================================================================================

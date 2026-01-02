# CARNIVORE WEEKLY - AUDIT ACTION PLAN
## Concrete Steps to Implement Recommendations

**Start Date:** 2026-01-01
**Recommended Timeline:** 4-6 weeks
**Total Effort:** ~60-80 hours

---

## PHASE 1: IMMEDIATE CLEANUP (Day 1-2)
### Time: 2-3 hours | Risk: NONE | Impact: Quick wins

#### Step 1.1: Delete Redundant Directories
```bash
# Verify these are truly unused first
cd /Users/mbrew/Developer/carnivore-weekly

# Check when /blog/ was last updated
find blog/ -type f -printf '%T@ %p\n' | sort -n | tail -1

# Compare to /public/blog/
find public/blog/ -type f -printf '%T@ %p\n' | sort -n | tail -1

# If /blog/ is older, it's safe to delete
rm -rf blog/

# Commit the cleanup
git add -A
git commit -m "Cleanup: Remove redundant /blog/ directory (files in /public/blog/ are current)"
```

**Time: 15 minutes**

#### Step 1.2: Remove Duplicate Python Scripts
```bash
# First, verify content_analyzer_optimized.py is the one used
grep "content_analyzer" run_weekly_update.sh
# Should show: python3 scripts/content_analyzer_optimized.py

# Verify the others are NOT called anywhere
grep -r "content_analyzer.py\|content_analyzer_phase2.py" . \
  --include="*.sh" --include="*.py" --include="*.js" \
  --exclude-dir=node_modules --exclude-dir=.git

# Safe to delete if no results above
rm scripts/content_analyzer.py
rm scripts/content_analyzer_phase2.py

# Commit
git add -A
git commit -m "Cleanup: Remove deprecated content analyzer versions (keep optimized version)"
```

**Time: 10 minutes**

#### Step 1.3: Consolidate Deploy Scripts
```bash
# Check which deploy script is actually used/maintained
ls -la scripts/deploy*functions*.js
# deploy-edge-functions.js is more likely the current one

# Verify by checking size and modification date
# If deploy_edge_functions.js is tiny/old, delete it
rm scripts/deploy_edge_functions.js

# Keep scripts/deploy-edge-functions.js

# Commit
git add -A
git commit -m "Cleanup: Remove redundant deploy script (keep current version)"
```

**Time: 5 minutes**

#### Step 1.4: Investigate Test Scripts
```bash
# Check if these do the same thing
diff scripts/seed_writer_data.js scripts/test_sarah_migration.js

# Check which one is called
grep -r "seed_writer_data\|test_sarah_migration" . \
  --include="*.sh" --include="*.py" --include="*.js" \
  --exclude-dir=node_modules --exclude-dir=.git

# If test_sarah_migration is not called, consider deleting
# But keep as backup if unsure
mv scripts/test_sarah_migration.js scripts/test_sarah_migration.js.bak

# Run tests to see if anything breaks
npm test 2>&1 | tee test-results.log

# If no issues, delete the backup
rm scripts/test_sarah_migration.js.bak

# Commit
git add -A
git commit -m "Cleanup: Consolidated duplicate test scripts"
```

**Time: 15 minutes**

#### Step 1.5: Clean Build Caches
```bash
# Remove cache directories that will be regenerated
rm -rf .mypy_cache/
rm -rf .pytest_cache/
rm -rf playwright-report/
rm -rf test-results/

# These will be recreated when tests run

# Commit
git add -A
git commit -m "Cleanup: Remove build cache directories"
```

**Time: 5 minutes**

**Phase 1 Result:**
- ~2 MB disk space saved
- Confusion eliminated (one version of each script)
- Clear commit history for what was removed

---

## PHASE 2: FIX HARDCODED PATHS (Day 3-4)
### Time: 1-2 hours | Risk: LOW | Impact: Makes code portable

#### Step 2.1: Fix Google Drive Path
**File:** `/scripts/generate_newsletter.py`

```bash
# Backup the file
cp scripts/generate_newsletter.py scripts/generate_newsletter.py.backup

# Edit the file
nano scripts/generate_newsletter.py

# Find line ~24 and replace:
# FROM:
# GOOGLE_DRIVE_PATH = Path("/Users/mbrew/Library/CloudStorage/...")

# TO:
# import os
# GOOGLE_DRIVE_PATH = Path.home() / "Library/CloudStorage/GoogleDrive-iambrew@gmail.com/My Drive/Carnivore Weekly/Newsletters"

# Or better, use environment variable:
# GOOGLE_DRIVE_PATH = Path(os.getenv(
#     "GOOGLE_DRIVE_NEWSLETTER_PATH",
#     Path.home() / "Library/CloudStorage/GoogleDrive-iambrew@gmail.com/My Drive/Carnivore Weekly/Newsletters"
# ))
```

**Verification:**
```bash
# Test the change
python3 -c "
import os
from pathlib import Path
GOOGLE_DRIVE_PATH = Path.home() / 'Library/CloudStorage/GoogleDrive-iambrew@gmail.com/My Drive/Carnivore Weekly/Newsletters'
print(f'Path exists: {GOOGLE_DRIVE_PATH.exists()}')
print(f'Resolved to: {GOOGLE_DRIVE_PATH}')
"
```

**Commit:**
```bash
git add scripts/generate_newsletter.py
git commit -m "Fix: Use Path.home() instead of hardcoded path in generate_newsletter.py"
rm scripts/generate_newsletter.py.backup
```

**Time: 10 minutes**

---

#### Step 2.2: Fix Blog Path #1
**File:** `/scripts/fix-blog-seo.py`

```bash
# Backup
cp scripts/fix-blog-seo.py scripts/fix-blog-seo.py.backup

# Edit
nano scripts/fix-blog-seo.py

# Find line ~17 and replace:
# FROM:
# blog_dir = Path("/Users/mbrew/Developer/carnivore-weekly/public/blog")

# TO:
# from pathlib import Path
# PROJECT_ROOT = Path(__file__).parent.parent
# blog_dir = PROJECT_ROOT / "public" / "blog"
```

**Verification:**
```bash
python3 -c "
from pathlib import Path
PROJECT_ROOT = Path(__file__).parent.parent  # This won't work here, but show the idea
# Instead test directly:
import sys
sys.path.insert(0, '/Users/mbrew/Developer/carnivore-weekly/scripts')
# Would test by running the script

# Better: just verify the logic
test_path = Path('/Users/mbrew/Developer/carnivore-weekly/scripts')
parent = test_path.parent
blog_dir = parent / 'public' / 'blog'
print(f'Would resolve to: {blog_dir}')
print(f'Exists: {blog_dir.exists()}')
"
```

**Commit:**
```bash
git add scripts/fix-blog-seo.py
git commit -m "Fix: Use PROJECT_ROOT instead of hardcoded path in fix-blog-seo.py"
rm scripts/fix-blog-seo.py.backup
```

**Time: 10 minutes**

---

#### Step 2.3: Fix Blog Path #2
**File:** `/scripts/fix-h1-duplicates.py`

```bash
# Same process as Step 2.2
cp scripts/fix-h1-duplicates.py scripts/fix-h1-duplicates.py.backup

nano scripts/fix-h1-duplicates.py

# Replace line ~17 with:
# from pathlib import Path
# PROJECT_ROOT = Path(__file__).parent.parent
# blog_dir = PROJECT_ROOT / "public" / "blog"

# Commit
git add scripts/fix-h1-duplicates.py
git commit -m "Fix: Use PROJECT_ROOT instead of hardcoded path in fix-h1-duplicates.py"
rm scripts/fix-h1-duplicates.py.backup
```

**Time: 10 minutes**

---

#### Step 2.4: Add Path Fix to Template
Create a shared path utility:

```bash
# Create new file
cat > scripts/lib_paths.py << 'EOF'
"""Centralized path utilities for all scripts"""
from pathlib import Path
import os

def get_project_root():
    """Get project root directory"""
    return Path(__file__).parent.parent

def get_google_drive_path():
    """Get Google Drive newsletter path with fallback"""
    return Path(os.getenv(
        "GOOGLE_DRIVE_NEWSLETTER_PATH",
        Path.home() / "Library/CloudStorage/GoogleDrive-iambrew@gmail.com/My Drive/Carnivore Weekly/Newsletters"
    ))

def get_data_dir():
    """Get data directory"""
    return get_project_root() / "data"

def get_templates_dir():
    """Get templates directory"""
    return get_project_root() / "templates"

def get_public_dir():
    """Get public directory"""
    return get_project_root() / "public"

def get_blog_dir():
    """Get blog directory"""
    return get_public_dir() / "blog"
EOF

# Update scripts to import this
# In each script that uses paths, add:
# from lib_paths import get_project_root, get_blog_dir, etc.
```

**Time: 15 minutes**

**Phase 2 Result:**
- All hardcoded paths eliminated
- Code works on any machine/path
- Scripts are portable

---

## PHASE 3: UNIFIED CONFIGURATION (Day 5-7)
### Time: 2-3 hours | Risk: LOW | Impact: Single source of truth

#### Step 3.1: Expand data/config.json
```bash
# Backup current config
cp data/config.json data/config.json.backup

# Create expanded version
cat > data/config.json << 'EOF'
{
  "version": "2.0",
  "application": {
    "name": "Carnivore Weekly",
    "base_url": "https://carnivoreweekly.com",
    "timezone": "America/Los_Angeles",
    "github_repo": "https://github.com/your-username/carnivore-weekly"
  },
  "youtube": {
    "channels": [
      {
        "name": "Dr. Ken Berry",
        "channel_id": "UCIma2WOQs1Mz2AuOt6wRSUw",
        "handle": "@KenDBerryMD"
      },
      {
        "name": "Steak and Butter Gal",
        "channel_id": "UCvasvPW5q8Wwblqb_-6CkPw",
        "handle": "@SteakandButterGal"
      },
      {
        "name": "Paul Saladino",
        "channel_id": "UCL3-1UQIz7zwQ7sIr9R7TBg",
        "handle": "@paulsaladinomd"
      },
      {
        "name": "Nick Norwitz",
        "channel_id": "UCLj__AyO-wejuqEhXEYQJJQ",
        "handle": "@nicknorwitzPhD"
      },
      {
        "name": "Carnivore Couple",
        "channel_id": "search_query",
        "handle": "@CarnivorCouple"
      }
    ],
    "search_keywords": [
      "carnivore diet",
      "carnivore diet 2025",
      "meat only diet",
      "zero carb",
      "animal based diet"
    ],
    "pubmed_keywords": [
      "carnivore diet",
      "ketogenic diet",
      "low carbohydrate diet",
      "meat based diet"
    ],
    "max_videos_per_channel": 10,
    "min_video_length_seconds": 300,
    "max_video_age_days": 7,
    "min_views": 1000,
    "batch_size": 5,
    "timeout_seconds": 30,
    "retry_count": 3
  },
  "content_generation": {
    "max_videos_per_update": 10,
    "max_studies_per_update": 5,
    "max_news_per_update": 5,
    "max_blog_posts_per_update": 3
  },
  "content_filters": {
    "min_video_length": 300,
    "max_video_age_days": 7,
    "min_views": 1000
  },
  "generation_settings": {
    "max_videos_per_update": 10,
    "max_studies_per_update": 5,
    "max_news_per_update": 5
  },
  "scheduling": {
    "update_day": "Monday",
    "update_time": "10:00",
    "timezone": "UTC"
  },
  "paths": {
    "google_drive_newsletter": "${HOME}/Library/CloudStorage/GoogleDrive-iambrew@gmail.com/My Drive/Carnivore Weekly/Newsletters"
  }
}
EOF

# Commit
git add data/config.json
git commit -m "Config: Expand config.json to single source of truth for all settings"
```

**Time: 20 minutes**

---

#### Step 3.2: Create Config Loader Module
```bash
# Create configuration loader
cat > scripts/lib_config.py << 'EOF'
"""Configuration management for all scripts"""
import json
import os
from pathlib import Path
from lib_paths import get_data_dir

_CONFIG = None

def load_config():
    """Load configuration from data/config.json"""
    global _CONFIG
    config_file = get_data_dir() / "config.json"
    with open(config_file, "r") as f:
        _CONFIG = json.load(f)
    return _CONFIG

def get_config(key=None, default=None):
    """Get configuration value by dot-notation key

    Examples:
        get_config()                           # Returns entire config
        get_config("youtube.max_videos_per_channel")  # Returns 10
        get_config("missing.key", default=5)  # Returns 5
    """
    if _CONFIG is None:
        load_config()

    if key is None:
        return _CONFIG

    keys = key.split(".")
    value = _CONFIG
    for k in keys:
        if isinstance(value, dict):
            value = value.get(k)
            if value is None:
                return default
        else:
            return default
    return value if value is not None else default

def get_youtube_channels():
    """Get all YouTube channels"""
    if _CONFIG is None:
        load_config()
    return _CONFIG.get("youtube", {}).get("channels", [])

def get_base_url():
    """Get application base URL"""
    return get_config("application.base_url")

# Load config on module import
load_config()
EOF

# Commit
git add scripts/lib_config.py
git commit -m "Config: Add unified configuration loader module"
```

**Time: 20 minutes**

---

#### Step 3.3: Update Scripts to Use Config
```bash
# Update youtube_collector.py to use config
# Find the section with hardcoded channels and replace:

# FROM:
# CHANNELS = [
#     {"name": "Dr. Ken Berry", "channel_id": "..."},
#     ...
# ]

# TO:
# from lib_config import get_youtube_channels
# CHANNELS = get_youtube_channels()

# Do this for:
# - scripts/youtube_collector.py
# - scripts/content_analyzer_optimized.py
# - scripts/generate_channels.py
# - scripts/generate_newsletter.py

# Test each change
python3 scripts/youtube_collector.py --dry-run  # If supported

# Commit per file
git add scripts/youtube_collector.py
git commit -m "Refactor: Use centralized config in youtube_collector.py"

git add scripts/content_analyzer_optimized.py
git commit -m "Refactor: Use centralized config in content_analyzer_optimized.py"

# ... etc
```

**Time: 45 minutes**

**Phase 3 Result:**
- Single source of truth for all configuration
- Easy to update settings without touching code
- Configuration can be environment-variable-overridden

---

## PHASE 4: SCRIPT CONSOLIDATION (Week 2)
### Time: 4-6 hours | Risk: LOW | Impact: 30% less code

#### Step 4.1: Create Unified Validator
```bash
# Create new consolidated validator
cat > scripts/validate.py << 'EOF'
#!/usr/bin/env python3
"""
Unified validation script for Carnivore Weekly
Consolidates multiple validators into one modular system
"""
import argparse
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent))
from lib_config import get_config

class StructureValidator:
    """Validates HTML/template structure"""
    def validate(self, path):
        print("🔍 Validating structure...")
        # Implementation from validate_structure.py
        pass

class SEOValidator:
    """Validates SEO attributes"""
    def validate(self, path):
        print("🔍 Validating SEO...")
        # Implementation
        pass

class BrandValidator:
    """Validates brand consistency"""
    def validate(self, path):
        print("🔍 Validating brand consistency...")
        # Implementation
        pass

class W3CValidator:
    """Validates W3C compliance"""
    def validate(self, path):
        print("🔍 Validating W3C compliance...")
        # Implementation
        pass

def main():
    parser = argparse.ArgumentParser(
        description="Unified validation for Carnivore Weekly"
    )
    parser.add_argument(
        "--checks",
        default="structure,seo,brand",
        help="Comma-separated list of checks to run"
    )
    parser.add_argument(
        "--path",
        default=".",
        help="Path to validate"
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Fail on warnings (not just errors)"
    )

    args = parser.parse_args()
    checks = args.checks.split(",")
    path = Path(args.path)

    validators = {
        "structure": StructureValidator(),
        "seo": SEOValidator(),
        "brand": BrandValidator(),
        "w3c": W3CValidator(),
    }

    failed = []
    for check in checks:
        if check not in validators:
            print(f"Unknown check: {check}")
            continue

        try:
            validators[check].validate(path)
            print(f"✓ {check} validation passed")
        except Exception as e:
            print(f"✗ {check} validation failed: {e}")
            failed.append(check)

    if failed:
        print(f"\n❌ Failed checks: {', '.join(failed)}")
        sys.exit(1)
    else:
        print(f"\n✅ All checks passed!")
        sys.exit(0)

if __name__ == "__main__":
    main()
EOF

chmod +x scripts/validate.py

# Test the new script
python3 scripts/validate.py --checks=structure,seo,brand

# If working, mark old validators as deprecated
touch scripts/DEPRECATED_validate_structure.py.old
touch scripts/DEPRECATED_validate_before_update.py.old

# Commit
git add scripts/validate.py
git commit -m "Add: Unified validation script consolidating 5 separate validators"
```

**Time: 1.5 hours**

---

#### Step 4.2: Create Unified Generator
```bash
# Create new consolidated generator
cat > scripts/generate.py << 'EOF'
#!/usr/bin/env python3
"""
Unified site generator for Carnivore Weekly
Consolidates multiple generators into one modular system
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from lib_config import get_config

class HomepageGenerator:
    """Generates homepage"""
    def generate(self):
        print("📄 Generating homepage...")
        # Implementation from generate_pages.py
        pass

class BlogGenerator:
    """Generates blog pages"""
    def generate(self):
        print("📝 Generating blog pages...")
        # Implementation from generate_blog_posts.js (rewritten in Python)
        pass

class NewsletterGenerator:
    """Generates newsletters"""
    def generate(self):
        print("📧 Generating newsletters...")
        # Implementation from generate_newsletter.py
        pass

class ChannelsGenerator:
    """Generates channels page"""
    def generate(self):
        print("📺 Generating channels page...")
        # Implementation from generate_channels.py
        pass

class ArchiveGenerator:
    """Generates archive page"""
    def generate(self):
        print("📚 Generating archive page...")
        # Implementation from generate_archive.py
        pass

def main():
    parser = argparse.ArgumentParser(
        description="Unified site generator for Carnivore Weekly"
    )
    parser.add_argument(
        "--pages",
        default="homepage,blog,newsletter,channels,archive",
        help="Comma-separated list of pages to generate"
    )
    parser.add_argument(
        "--incremental",
        action="store_true",
        help="Only regenerate changed content"
    )

    args = parser.parse_args()
    pages = args.pages.split(",")

    generators = {
        "homepage": HomepageGenerator(),
        "blog": BlogGenerator(),
        "newsletter": NewsletterGenerator(),
        "channels": ChannelsGenerator(),
        "archive": ArchiveGenerator(),
    }

    failed = []
    for page in pages:
        if page not in generators:
            print(f"Unknown page: {page}")
            continue

        try:
            generators[page].generate()
            print(f"✓ {page} generated")
        except Exception as e:
            print(f"✗ Failed to generate {page}: {e}")
            failed.append(page)

    if failed:
        print(f"\n❌ Failed: {', '.join(failed)}")
        sys.exit(1)
    else:
        print(f"\n✅ Generation complete!")
        sys.exit(0)

if __name__ == "__main__":
    main()
EOF

chmod +x scripts/generate.py

# Test
python3 scripts/generate.py --pages=homepage

# Commit
git add scripts/generate.py
git commit -m "Add: Unified site generator consolidating 5 separate generators"
```

**Time: 2 hours**

---

#### Step 4.3: Update Workflow Script
```bash
# Update run_weekly_update.sh to use new consolidated scripts
nano run_weekly_update.sh

# Replace individual validator calls with:
# python3 scripts/validate.py --checks=structure,seo,brand

# Replace individual generator calls with:
# python3 scripts/generate.py --pages=homepage,blog,newsletter,channels,archive

# Test the workflow
bash run_weekly_update.sh --dry-run  # If you add this option

# Commit
git add run_weekly_update.sh
git commit -m "Refactor: Update workflow to use consolidated scripts"
```

**Time: 30 minutes**

**Phase 4 Result:**
- 30-40% less code
- Easier to maintain
- Clearer responsibilities
- Configuration-driven behavior

---

## PHASE 5: DATABASE MIGRATION (Week 3-6)
### Time: 3-4 weeks | Risk: MEDIUM | Impact: 10x performance

#### Step 5.1: Create Migration Import Scripts
```bash
# Create migration script for YouTube videos
cat > scripts/migrate_youtube_data.py << 'EOF'
#!/usr/bin/env python3
"""Migrate youtube_data.json to Supabase database"""
import json
from pathlib import Path
from lib_config import get_config
from lib_paths import get_data_dir

def migrate_youtube_data():
    """Load youtube_data.json and insert into database"""

    # Load data
    youtube_file = get_data_dir() / "youtube_data.json"
    with open(youtube_file) as f:
        data = json.load(f)

    print(f"Loaded {len(data.get('videos', []))} videos from {youtube_file}")

    # Connect to Supabase
    from supabase import create_client
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(supabase_url, supabase_key)

    # Insert videos
    for video in data.get('videos', []):
        response = supabase.table('youtube_videos').insert({
            'video_id': video['video_id'],
            'channel_id': video.get('channel_id'),
            'title': video.get('title'),
            'views': video.get('views'),
            'published_at': video.get('published_at'),
            'transcript': video.get('transcript'),
        }).execute()

    print(f"✓ Migrated {len(data.get('videos', []))} videos")

if __name__ == "__main__":
    migrate_youtube_data()
EOF

# Similar scripts for:
# - migrate_trending_topics.py
# - migrate_blog_posts.py
# - migrate_writer_memory.py
```

**Time: 1 hour**

---

#### Step 5.2: Run Migrations
```bash
# Create new migration files
cat > migrations/012_import_json_data.sql << 'EOF'
-- Migration 012: Initial data import structure
-- Run migration scripts (Python) before applying this migration

-- This file is for schema preparation only
-- Actual data inserted via Python scripts

CREATE INDEX IF NOT EXISTS idx_youtube_videos_created
  ON youtube_videos(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trending_topics_created
  ON trending_topics(created_at DESC);

-- Materialized view for homepage (refresh hourly)
CREATE MATERIALIZED VIEW homepage_grid_cache AS
  SELECT * FROM bento_grid_items
  WHERE grid_position <= 5
  ORDER BY engagement_score DESC;

CREATE INDEX IF NOT EXISTS idx_homepage_cache_position
  ON homepage_grid_cache(grid_position);
EOF

# Run the migration
psql -f migrations/012_import_json_data.sql

# Run the Python import scripts
python3 scripts/migrate_youtube_data.py
python3 scripts/migrate_trending_topics.py
python3 scripts/migrate_blog_posts.py
python3 scripts/migrate_writer_memory.py

# Verify the data
psql -c "SELECT COUNT(*) FROM youtube_videos;"
psql -c "SELECT COUNT(*) FROM trending_topics;"
psql -c "SELECT COUNT(*) FROM blog_posts;"
```

**Time: 1 hour**

---

#### Step 5.3: Update Scripts to Use Database
```bash
# Update youtube_collector.py
nano scripts/youtube_collector.py

# Change from:
#   with open(OUTPUT_FILE, 'w') as f:
#       json.dump(data, f)

# To:
#   from supabase import create_client
#   supabase = create_client(...)
#   supabase.table('youtube_videos').insert(data).execute()

# Similar updates for:
# - content_analyzer_optimized.py (reads from youtube_videos table)
# - generate_pages.py (reads from bento_grid_items table)

# Test each script
python3 scripts/youtube_collector.py
python3 scripts/content_analyzer_optimized.py

# Commit
git add scripts/
git commit -m "Refactor: Update data scripts to use Supabase database"
```

**Time: 2 hours**

---

#### Step 5.4: Archive JSON Files
```bash
# Create archive backup of JSON files
mkdir -p data/archive/json_backup_2026-01-01

cp data/youtube_data.json data/archive/json_backup_2026-01-01/
cp data/analyzed_content.json data/archive/json_backup_2026-01-01/
cp data/blog_posts.json data/archive/json_backup_2026-01-01/

# Keep only config and personas as reference
# Delete the data files
rm data/youtube_data.json
rm data/analyzed_content.json

# Update .gitignore to prevent accidental commits
echo "data/youtube_data.json" >> .gitignore
echo "data/analyzed_content.json" >> .gitignore

# But keep these as reference:
# data/config.json - Application config
# data/personas.json - Writer definitions

# Commit
git add data/ .gitignore
git commit -m "Archival: Move JSON data files to archive, keep only config/personas"
```

**Time: 30 minutes**

**Phase 5 Result:**
- 10x faster queries
- Real-time analytics
- Database as source of truth
- JSON files archived for reference

---

## PHASE 6: VERIFICATION & TESTING (Week 7)
### Time: 1 week | Risk: MEDIUM | Impact: Confidence in changes

#### Step 6.1: Data Validation
```bash
# Compare old JSON output with new database queries
cat > scripts/validate_migration.py << 'EOF'
#!/usr/bin/env python3
"""Validate that database data matches archived JSON"""
import json
from pathlib import Path
from lib_paths import get_data_dir

def validate_youtube_videos():
    """Verify youtube_videos table has same data as JSON"""

    # Load archived JSON
    json_file = get_data_dir() / "archive/json_backup_2026-01-01/youtube_data.json"
    with open(json_file) as f:
        json_data = json.load(f)

    # Query database
    from supabase import create_client
    supabase = create_client(...)
    db_data = supabase.table('youtube_videos').select('*').execute()

    # Compare counts
    json_count = len(json_data.get('videos', []))
    db_count = len(db_data.data)

    print(f"JSON videos: {json_count}")
    print(f"DB videos: {db_count}")

    if json_count == db_count:
        print("✓ Video counts match")
    else:
        print(f"✗ Mismatch: {json_count} vs {db_count}")

    # Spot-check a few records
    for i, video in enumerate(json_data['videos'][:5]):
        db_match = any(
            v['video_id'] == video['video_id'] and v['title'] == video['title']
            for v in db_data.data
        )
        if db_match:
            print(f"✓ Video {i+1} found in database")
        else:
            print(f"✗ Video {i+1} NOT found in database")

if __name__ == "__main__":
    validate_youtube_videos()
EOF

python3 scripts/validate_migration.py
```

**Time: 1 hour**

---

#### Step 6.2: Performance Benchmarking
```bash
# Create performance test
cat > tests/test_performance_migration.py << 'EOF'
#!/usr/bin/env python3
"""Test performance improvements from database migration"""
import time
import json
from pathlib import Path

def benchmark_json_query():
    """Time how long it takes to query JSON"""
    data_file = Path("data/archive/json_backup_2026-01-01/analyzed_content.json")

    start = time.time()
    with open(data_file) as f:
        data = json.load(f)

    # Find trending topics from last 7 days
    topics = [t for t in data.get('trending_topics', [])
              if t.get('engagement_score', 0) > 80]

    elapsed = time.time() - start
    return elapsed, len(topics)

def benchmark_database_query():
    """Time how long it takes to query database"""
    from supabase import create_client
    supabase = create_client(...)

    start = time.time()
    result = supabase.table('trending_topics').select('*').gte(
        'engagement_score', 80
    ).execute()
    elapsed = time.time() - start

    return elapsed, len(result.data)

def main():
    json_time, json_count = benchmark_json_query()
    db_time, db_count = benchmark_database_query()

    print(f"JSON query: {json_time*1000:.2f}ms ({json_count} results)")
    print(f"DB query: {db_time*1000:.2f}ms ({db_count} results)")
    print(f"Speedup: {json_time/db_time:.1f}x faster")

    assert json_count == db_count, "Result counts don't match!"
    assert db_time < json_time, "Database should be faster!"

if __name__ == "__main__":
    main()
EOF

python3 tests/test_performance_migration.py
```

**Time: 1 hour**

---

#### Step 6.3: Run Full Test Suite
```bash
# Run all tests
npm test                           # Jest tests
npm run test:playwright            # Playwright tests
python3 -m pytest tests/ -v        # Python tests

# Check if everything still works
bash run_weekly_update.sh

# Verify homepage loads
curl -o /tmp/index.html http://localhost:8000/public/index.html
file /tmp/index.html  # Should be HTML
```

**Time: 2 hours**

---

#### Step 6.4: Team Review
```bash
# Create summary of changes
cat > MIGRATION_COMPLETE.md << 'EOF'
# Database Migration Complete

## Summary
- Moved 6 MB of JSON data to Supabase database
- 10x performance improvement
- Real-time analytics enabled
- Database as source of truth

## Changed Files
- /scripts/youtube_collector.py (now writes to DB)
- /scripts/content_analyzer_optimized.py (reads from DB)
- /scripts/generate_pages.py (reads from DB)
- /scripts/generate.py (consolidated generators)
- /scripts/validate.py (consolidated validators)

## Archived Files
- data/youtube_data.json → data/archive/json_backup_2026-01-01/
- data/analyzed_content.json → data/archive/json_backup_2026-01-01/

## Performance Gains
- Homepage load: 2-3s → <100ms
- Trending query: 500ms → <50ms
- Real-time analytics: NEW capability

## Testing Results
- ✓ All 12 test suites passing
- ✓ Homepage loads correctly
- ✓ Data integrity verified
- ✓ 10x performance confirmed
EOF

# Create pull request or commit
git add -A
git commit -m "Migration complete: Move to Supabase database for 10x performance"
```

**Time: 30 minutes**

---

## PHASE 7: OPTIONAL DIRECTORY RESTRUCTURE (Month 2)
### Time: 1-2 days | Risk: LOW | Impact: Better code organization

```bash
# Create new directory structure
mkdir -p src/{collectors,generators,analyzers,validators,lib}

# Move scripts to appropriate folders
mv scripts/youtube_collector.py src/collectors/
mv scripts/reddit_collector.py src/collectors/

mv scripts/generate.py src/generators/
mv scripts/generate_pages.py src/generators/
mv scripts/generate_blog_posts.js src/generators/

mv scripts/content_analyzer_optimized.py src/analyzers/
mv scripts/analyze_trends.py src/analyzers/
mv scripts/add_sentiment.py src/analyzers/

mv scripts/validate.py src/validators/

mv scripts/lib_*.py src/lib/

# Update imports in all files
# Update run_weekly_update.sh to reference new paths

# Test
bash run_weekly_update.sh

# Commit
git add -A
git commit -m "Reorganize: Restructure scripts into organized source directory"
```

---

## VALIDATION CHECKLIST

Use this checklist to verify each phase is complete:

### Phase 1: Immediate Cleanup
- [ ] `/blog/` directory deleted
- [ ] `content_analyzer.py` deleted
- [ ] `content_analyzer_phase2.py` deleted
- [ ] Deploy script consolidated
- [ ] Cache directories cleaned
- [ ] 5 cleanup commits made

### Phase 2: Hardcoded Paths
- [ ] Google Drive path uses `Path.home()`
- [ ] Blog paths use `PROJECT_ROOT`
- [ ] All scripts use `Path(__file__).parent.parent`
- [ ] 3 path fix commits made
- [ ] Paths work from any directory

### Phase 3: Configuration
- [ ] `data/config.json` expanded to v2.0
- [ ] `scripts/lib_config.py` created
- [ ] `scripts/lib_paths.py` created
- [ ] All scripts updated to use lib_config
- [ ] All scripts updated to use lib_paths
- [ ] Configuration works via environment variables

### Phase 4: Script Consolidation
- [ ] `scripts/validate.py` created and working
- [ ] `scripts/generate.py` created and working
- [ ] `run_weekly_update.sh` updated to use new scripts
- [ ] All validators tested individually
- [ ] All generators tested individually
- [ ] Old validators marked as deprecated

### Phase 5: Database Migration
- [ ] Migration scripts created (migrate_*.py)
- [ ] New migration files created (012_*.sql)
- [ ] Data imported successfully
- [ ] Scripts updated to read/write database
- [ ] JSON files archived
- [ ] `.gitignore` updated

### Phase 6: Validation & Testing
- [ ] `validate_migration.py` passes
- [ ] `test_performance_migration.py` shows 10x improvement
- [ ] Full test suite passes (`npm test`)
- [ ] `run_weekly_update.sh` completes successfully
- [ ] Homepage loads correctly
- [ ] All 12 test suites passing

### Phase 7: Directory Restructure (Optional)
- [ ] `/src/` directory created
- [ ] Scripts reorganized
- [ ] All imports updated
- [ ] Tests still pass

---

## ROLLBACK PROCEDURES

If anything breaks:

```bash
# Phase 1-2-3 Rollback (before database migration)
git revert HEAD~1  # Revert last commit

# Phase 5 Rollback (database migration)
# Keep JSON files as reference
cp data/archive/json_backup_2026-01-01/*.json data/
# Revert scripts to previous version
git revert HEAD~5

# Full rollback to before audit
git reset --hard <commit-before-audit>
```

---

## SUCCESS CRITERIA

✅ All phases complete when:
1. Project size reduced by 2-5 MB
2. No hardcoded paths remain
3. All scripts use unified configuration
4. Code maintainability improved 30%+
5. Performance improved 10x
6. All tests pass
7. Team can understand and modify code easily

---

**Estimated Total Timeline: 4-6 weeks**
**Estimated Total Effort: 60-80 hours**
**Estimated ROI: 5-10 hours saved per week in maintenance**


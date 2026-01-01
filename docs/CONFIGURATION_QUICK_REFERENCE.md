# Configuration Quick Reference

**Phase 3 - Advanced Configuration System**

---

## Quick Start

### Load Configuration in Python

```python
from scripts.config import ConfigLoader

config = ConfigLoader()
```

### Get Values

```python
# Simple value
timeout = config.get("services.youtube.timeout", default=30)

# Section (returns dict)
youtube_config = config.get_section("services.youtube")

# API key from environment
api_key = config.get_api_key("anthropic")

# Check feature
if config.is_feature_enabled("sentiment_analysis"):
    print("Feature is enabled")
```

---

## Configuration Paths (Dot Notation)

### Services

```
services.youtube.endpoint              → YouTube API endpoint URL
services.youtube.timeout               → YouTube API timeout (seconds)
services.youtube.max_retries           → YouTube API retry count
services.youtube.enabled               → Is YouTube service enabled

services.anthropic.model_default       → Default Claude model
services.anthropic.model_opus          → Opus model name
services.anthropic.model_haiku         → Haiku model name
services.anthropic.timeout             → API timeout (seconds)
services.anthropic.max_retries         → Retry count
services.anthropic.rate_limit_rpm      → Rate limit per minute

services.supabase.timeout              → Supabase timeout (seconds)
services.supabase.max_retries          → Retry count
```

### Content Collection

```
content_collection.youtube.search_query        → "carnivore diet"
content_collection.youtube.days_back           → 7 (days)
content_collection.youtube.top_creators_count  → 10
content_collection.youtube.videos_per_creator  → 5
content_collection.youtube.comments_per_video  → 20
content_collection.youtube.min_views           → 100

content_collection.reddit.search_query         → "carnivore diet"
content_collection.reddit.days_back            → 7
content_collection.reddit.limit                → 100
```

### Content Analysis

```
content_analysis.token_optimization            → true/false
content_analysis.token_target                  → 400
content_analysis.cache_prompts                 → true/false
content_analysis.batch_size                    → 5
content_analysis.timeout                       → 120 (seconds)
```

### Newsletter

```
newsletter.email_settings.from_email           → "newsletter@carnivoreweekly.com"
newsletter.email_settings.from_name            → "Carnivore Weekly"
newsletter.email_settings.reply_to             → "support@carnivoreweekly.com"
newsletter.sending.provider                    → "resend"
newsletter.sending.batch_size                  → 100
```

### Features

```
features.auto_linking.enabled                  → true/false
features.auto_linking.max_links_per_page       → 10

features.sentiment_analysis.enabled            → true/false
features.sentiment_analysis.cache_results      → true/false

features.qa_generation.enabled                 → true/false
features.qa_generation.model                   → "haiku"
features.qa_generation.cache_questions         → true/false

features.token_optimization.enabled            → true/false
features.token_optimization.reduction_target   → 0.98
```

### Monitoring

```
monitoring.enabled                             → true/false
monitoring.log_level                           → "INFO", "DEBUG", "WARNING"
monitoring.log_format                          → "json" or "text"
monitoring.log_file                            → "logs/carnivore-weekly.log"
monitoring.alerts.email_on_error               → true/false
monitoring.alerts.alert_email                  → "ops@carnivoreweekly.com"
```

### Environments

```
environments.development.debug                 → true
environments.development.log_level             → "DEBUG"
environments.development.cache_ttl             → 300

environments.staging.debug                     → false
environments.staging.log_level                 → "INFO"
environments.staging.cache_ttl                 → 3600

environments.production.debug                  → false
environments.production.log_level              → "WARNING"
environments.production.cache_ttl              → 86400
```

---

## Environment Variables

### Set Environment

```bash
export ENVIRONMENT=development    # or staging, production
```

### Set API Keys

```bash
export YOUTUBE_API_KEY=your_key
export ANTHROPIC_API_KEY=your_key
export SUPABASE_URL=your_url
export SUPABASE_KEY=your_key
export RESEND_API_KEY=your_key
```

### Override Settings (APP_ Prefix)

```bash
export APP_SERVICES_YOUTUBE_TIMEOUT=60
export APP_SERVICES_ANTHROPIC_MAX_RETRIES=5
export APP_FEATURES_SENTIMENT_ANALYSIS_ENABLED=false
export APP_CONTENT_COLLECTION_YOUTUBE_DAYS_BACK=14
export APP_MONITORING_LOG_LEVEL=DEBUG
```

### .env File

```bash
cp .env.example .env
# Edit .env with your values
# Automatically loaded by ConfigLoader
```

---

## Common Patterns

### Get API Key and Create Client

```python
config = ConfigLoader()

# Get API key
api_key = config.get_api_key("anthropic")

# Create client with config
from anthropic import Anthropic
client = Anthropic(api_key=api_key)

# Get timeout from config
timeout = config.get_service_timeout("anthropic")
```

### YouTube Collection with Config

```python
config = ConfigLoader()

# Get YouTube settings
youtube_config = config.get_service_config("youtube")
collection_config = config.get("content_collection.youtube")

# Use values
search_query = collection_config.get("search_query")
days_back = collection_config.get("days_back")
top_creators = collection_config.get("top_creators_count")

# Get API key
api_key = config.get_api_key("youtube")
```

### Conditional Features

```python
config = ConfigLoader()

if config.is_feature_enabled("sentiment_analysis"):
    # Run sentiment analysis
    run_sentiment_analysis()

if config.is_feature_enabled("token_optimization"):
    # Use optimized tokens
    use_token_optimization()
```

### Environment-Specific Logic

```python
config = ConfigLoader()

if config.is_production():
    # Production-only logic
    enable_monitoring()
    set_log_level("WARNING")
elif config.is_development():
    # Development-only logic
    enable_debug()
    set_log_level("DEBUG")
```

### With Defaults

```python
config = ConfigLoader()

# Provide default if key missing
timeout = config.get("services.custom.timeout", default=30)

# Access nested with default
batch_size = config.get(
    "content_analysis.batch_size",
    default=10
)
```

---

## Development Workflow

### 1. Setup Development

```bash
# Copy template
cp .env.example .env

# Edit with your keys
nano .env

# Test configuration
python3 scripts/config.py
```

### 2. Test Script with Dev Config

```bash
# Uses development config automatically
python3 scripts/youtube_collector.py
```

### 3. Test Script with Override

```bash
# Override specific setting
export APP_CONTENT_COLLECTION_YOUTUBE_DAYS_BACK=1
python3 scripts/youtube_collector.py
```

### 4. Test Production Config

```bash
# Test with production settings
export ENVIRONMENT=production
export YOUTUBE_API_KEY=your_key
python3 scripts/config.py  # Verify it loads
```

---

## Deployment Workflow

### 1. Staging Deployment

```bash
# On staging server
export ENVIRONMENT=staging
export YOUTUBE_API_KEY=staging_key
export ANTHROPIC_API_KEY=staging_key
export SUPABASE_URL=staging_url
export SUPABASE_KEY=staging_key

# Test
python3 scripts/config.py

# Run workflow
python3 scripts/youtube_collector.py
python3 scripts/content_analyzer_optimized.py
```

### 2. Production Deployment

```bash
# On production server
export ENVIRONMENT=production
export YOUTUBE_API_KEY=prod_key
export ANTHROPIC_API_KEY=prod_key
export SUPABASE_URL=prod_url
export SUPABASE_KEY=prod_key

# Strict validation (fails if vars missing)
python3 scripts/config.py

# Run workflow
./run_weekly_update.sh
```

---

## Troubleshooting

### Config not loading

```bash
# Test configuration
python3 scripts/config.py

# Check file exists
ls -la config/project.json

# Check .env exists (optional)
ls -la .env
```

### Missing API key

```bash
# Check environment variable
echo $ANTHROPIC_API_KEY

# Set it
export ANTHROPIC_API_KEY=your_key

# Or add to .env
echo "ANTHROPIC_API_KEY=your_key" >> .env
```

### Feature not working

```bash
# Check if enabled
python3 -c "from scripts.config import ConfigLoader; c = ConfigLoader(); print(c.is_feature_enabled('sentiment_analysis'))"

# Enable via environment
export APP_FEATURES_SENTIMENT_ANALYSIS_ENABLED=true
```

### Wrong environment

```bash
# Check current environment
python3 -c "from scripts.config import ConfigLoader; c = ConfigLoader(); print(c.get_environment())"

# Set correct environment
export ENVIRONMENT=production
```

---

## API Reference (Short)

```python
# Load config
config = ConfigLoader()

# Get values
config.get(key_path, default=None)              # Get by dot notation
config.get_section(section_path)                # Get entire section
config.get_service_config(service_name)         # Get service config
config.get_api_key(service_name)                # Get API key from env
config.get_service_timeout(service, default)    # Get timeout
config.get_model(service, model_type)           # Get model name

# Check features and environment
config.is_feature_enabled(feature_path)         # Check feature flag
config.is_production()                          # Is production env
config.is_development()                         # Is development env
config.get_environment()                        # Get current environment

# Get config as data
config.to_dict()                                # As dict (secrets masked)
config.to_json(indent=2)                        # As JSON string (masked)
```

---

## File Locations

```
config/
├── project.json                    # Base configuration
└── environments/
    ├── development.json           # Dev overrides
    ├── staging.json              # Staging overrides
    └── production.json           # Production overrides

scripts/
└── config.py                      # Configuration loader

.env                              # Local environment variables
.env.example                      # Template (in git)

docs/
├── CONFIGURATION.md              # Full documentation
├── CONFIGURATION_AUDIT.md        # Audit report
└── CONFIGURATION_QUICK_REFERENCE.md  # This file
```

---

## Key Points

1. **Priority Order**: APP_* env vars → .env → env config → base config → defaults
2. **Secrets are masked** in logs automatically
3. **No API keys in code** - use environment variables
4. **Environment selection**: ENVIRONMENT=development|staging|production
5. **Override any setting** without changing code
6. **Validation** ensures required variables are set
7. **Logging** shows what configuration was loaded

---

## Examples by Use Case

### Change API Timeout

```python
config = ConfigLoader()
timeout = config.get_service_timeout("youtube")  # From config
```

### Switch Models

```python
config = ConfigLoader()
model = config.get_model("anthropic", "default")  # Opus
model = config.get_model("anthropic", "haiku")   # Haiku
```

### Disable Feature

```bash
export APP_FEATURES_SENTIMENT_ANALYSIS_ENABLED=false
```

### Add Alert Email

```bash
export APP_MONITORING_ALERTS_ALERT_EMAIL=custom@example.com
```

---

**For complete information, see `docs/CONFIGURATION.md`**

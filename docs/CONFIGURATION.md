# Advanced Configuration System - Phase 3

**Led by: Quinn (Operations Manager)**

This document explains the advanced configuration system for Carnivore Weekly, designed for multi-environment deployment, security, and operational excellence.

## Table of Contents

1. [Overview](#overview)
2. [Configuration Structure](#configuration-structure)
3. [Configuration Priority](#configuration-priority)
4. [Using the Config System](#using-the-config-system)
5. [Environment Setup](#environment-setup)
6. [API Configuration](#api-configuration)
7. [Feature Flags](#feature-flags)
8. [Deployment Guide](#deployment-guide)
9. [Security Best Practices](#security-best-practices)
10. [Troubleshooting](#troubleshooting)

## Overview

The advanced configuration system provides:

- **Centralized configuration** via `config/project.json`
- **Environment-specific overrides** (development, staging, production)
- **Environment variable support** with .env file integration
- **Sensitive data masking** in logs
- **Configuration validation** on load
- **Easy API key rotation** without code changes
- **Feature flags** for gradual rollout

### Key Files

```
config/
├── project.json                 # Base configuration (all environments)
└── environments/
    ├── development.json        # Development overrides
    ├── staging.json           # Staging overrides
    └── production.json        # Production overrides

scripts/
└── config.py                   # Configuration loader (Python)

.env.example                    # Template for .env file
```

## Configuration Structure

### Base Configuration (config/project.json)

Contains:
- **version**: Configuration format version
- **project**: Project metadata
- **environments**: Environment-specific base settings
- **paths**: Directory paths
- **validation**: Validation rules
- **generation**: Content generation settings
- **services**: API configurations (YouTube, Anthropic, Supabase, etc.)
- **content_collection**: Collection parameters
- **content_analysis**: Analysis parameters
- **newsletter**: Email settings
- **external_services**: Third-party integrations
- **personas**: Writer persona settings
- **monitoring**: Logging and alerts
- **backup_recovery**: Backup configuration
- **features**: Feature flags
- **security**: Security settings

### Environment-Specific Configs

Each environment (development, staging, production) has a JSON file in `config/environments/` that overrides base settings:

**Development (`config/environments/development.json`):**
```json
{
  "debug": true,
  "log_level": "DEBUG",
  "cache_ttl": 300,
  "content_collection": {
    "youtube": {
      "days_back": 1,
      "top_creators_count": 3
    }
  }
}
```

**Staging (`config/environments/staging.json`):**
```json
{
  "debug": false,
  "log_level": "INFO",
  "cache_ttl": 3600,
  "monitoring": {
    "alerts": {
      "alert_email": "staging-ops@carnivoreweekly.com"
    }
  }
}
```

**Production (`config/environments/production.json`):**
```json
{
  "debug": false,
  "log_level": "WARNING",
  "cache_ttl": 86400,
  "monitoring": {
    "alerts": {
      "alert_email": "ops@carnivoreweekly.com"
    }
  }
}
```

## Configuration Priority

Settings are loaded in this priority order (highest to lowest):

1. **Environment variables** (prefixed with `APP_`)
2. **.env file variables** (loaded from .env)
3. **Environment-specific config** (config/environments/{ENV}.json)
4. **Base config** (config/project.json)
5. **Default values** (hardcoded in code)

### Example: API Timeout

```bash
# Override via environment variable (highest priority)
export APP_SERVICES_YOUTUBE_TIMEOUT=60

# Or via .env file
echo "APP_SERVICES_YOUTUBE_TIMEOUT=60" >> .env

# Or in config/environments/production.json
{
  "services": {
    "youtube": {
      "timeout": 60
    }
  }
}

# Or in config/project.json (lowest priority)
{
  "services": {
    "youtube": {
      "timeout": 30
    }
  }
}
```

## Using the Config System

### In Python Scripts

```python
from scripts.config import ConfigLoader

# Load configuration
config = ConfigLoader()

# Get simple values
timeout = config.get("services.youtube.timeout", default=30)

# Get sections
youtube_config = config.get_section("services.youtube")

# Get API keys
api_key = config.get_api_key("anthropic")

# Check features
if config.is_feature_enabled("sentiment_analysis"):
    # do something

# Get environment info
env = config.get_environment()
is_prod = config.is_production()
```

### Accessing Nested Values

Use dot notation for nested configuration:

```python
# Get nested value
endpoint = config.get("services.anthropic.endpoint")

# Get service configuration
service = config.get_section("services.youtube")

# With defaults
timeout = config.get("services.unknown.timeout", default=30)
```

## Environment Setup

### Development Environment

1. **Copy .env template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit .env with your keys:**
   ```bash
   YOUTUBE_API_KEY=your_key_here
   ANTHROPIC_API_KEY=your_key_here
   SUPABASE_URL=your_url_here
   SUPABASE_KEY=your_key_here
   ```

3. **Load configuration:**
   ```python
   config = ConfigLoader(environment="development")
   ```

### Staging Environment

1. **Set environment variable on server:**
   ```bash
   export ENVIRONMENT=staging
   ```

2. **Set API keys as environment variables:**
   ```bash
   export YOUTUBE_API_KEY=your_staging_key
   export ANTHROPIC_API_KEY=your_staging_key
   ```

3. **Override specific settings:**
   ```bash
   export APP_SERVICES_ANTHROPIC_TIMEOUT=60
   ```

### Production Environment

1. **Set environment variable on server:**
   ```bash
   export ENVIRONMENT=production
   ```

2. **Set all required API keys as environment variables:**
   ```bash
   export YOUTUBE_API_KEY=your_production_key
   export ANTHROPIC_API_KEY=your_production_key
   export SUPABASE_URL=your_production_url
   export SUPABASE_KEY=your_production_key
   ```

3. **Enable strict validation:**
   - Production requires all `required_env_vars` to be set
   - Missing variables will raise a `ConfigError`

## API Configuration

### Available Services

All services are configured in `config/project.json` under `services`:

#### YouTube API
```json
{
  "youtube": {
    "key_env": "YOUTUBE_API_KEY",
    "endpoint": "https://www.googleapis.com/youtube/v3",
    "timeout": 30,
    "max_retries": 3,
    "retry_delay": 1,
    "enabled": true
  }
}
```

#### Anthropic Claude
```json
{
  "anthropic": {
    "key_env": "ANTHROPIC_API_KEY",
    "model_opus": "claude-opus-4-5-20251101",
    "model_haiku": "claude-3-5-haiku-20241022",
    "model_default": "claude-opus-4-5-20251101",
    "timeout": 60,
    "max_retries": 2,
    "retry_delay": 2,
    "rate_limit_rpm": 100000,
    "enabled": true
  }
}
```

#### Supabase
```json
{
  "supabase": {
    "url_env": "SUPABASE_URL",
    "key_env": "SUPABASE_KEY",
    "timeout": 30,
    "max_retries": 3,
    "retry_delay": 1,
    "enabled": true
  }
}
```

### Getting API Configuration

```python
# Get API key from environment variables
api_key = config.get_api_key("anthropic")

# Get service configuration
service_config = config.get_service_config("youtube")

# Get timeout for a service
timeout = config.get_service_timeout("supabase", default=30)

# Get model name
model = config.get_model("anthropic", "default")
```

## Feature Flags

Feature flags allow enabling/disabling features without code changes:

### Available Features

- `auto_linking`: Wiki auto-linking in content
- `sentiment_analysis`: Sentiment analysis of content
- `qa_generation`: Q&A section generation
- `wiki_updates`: Wiki synchronization
- `token_optimization`: Token optimization for API calls

### Using Feature Flags

```python
# Check if feature is enabled
if config.is_feature_enabled("sentiment_analysis"):
    # Perform sentiment analysis
    pass

# Get feature configuration
feature_config = config.get_section("features.auto_linking")
max_links = feature_config.get("max_links_per_page")
```

### Enabling/Disabling Features

**Via .env file:**
```bash
# Disable sentiment analysis
APP_FEATURES_SENTIMENT_ANALYSIS_ENABLED=false

# Enable token optimization
APP_FEATURES_TOKEN_OPTIMIZATION_ENABLED=true
```

**Via environment variable:**
```bash
export APP_FEATURES_SENTIMENT_ANALYSIS_ENABLED=false
```

**Via config file:**
```json
{
  "features": {
    "sentiment_analysis": {
      "enabled": false
    }
  }
}
```

## Deployment Guide

### Deploying to a New Server

1. **Install dependencies:**
   ```bash
   pip install python-dotenv
   ```

2. **Set environment variables:**
   ```bash
   export ENVIRONMENT=production
   export YOUTUBE_API_KEY=your_production_key
   export ANTHROPIC_API_KEY=your_production_key
   export SUPABASE_URL=your_production_url
   export SUPABASE_KEY=your_production_key
   ```

3. **Validate configuration:**
   ```bash
   python3 scripts/config.py
   ```

4. **Run your scripts:**
   ```bash
   python3 scripts/youtube_collector.py
   python3 scripts/content_analyzer_optimized.py
   ```

### Environment Variables Required

**Minimum required for production:**

```
YOUTUBE_API_KEY          # YouTube Data API key
ANTHROPIC_API_KEY        # Claude API key
SUPABASE_URL            # Supabase project URL
SUPABASE_KEY            # Supabase API key
ENVIRONMENT             # Set to "production"
```

**Optional but recommended:**

```
RESEND_API_KEY          # Email sending
GITHUB_TOKEN            # Repository access
CONVERTKIT_API_KEY      # Newsletter (if enabled)
LOG_LEVEL               # Logging level (default: INFO)
```

## Security Best Practices

### API Key Management

1. **Never hardcode API keys** in code or config files
2. **Use .env file** for local development only
3. **Use environment variables** on servers
4. **Rotate keys** periodically
5. **Use separate keys** for each environment
6. **Restrict key permissions** to minimum needed

### .env File Security

```bash
# .env should be in .gitignore
echo ".env" >> .gitignore

# Keep .env.example in git with dummy values
# Copy to .env and fill with real values

# Ensure correct permissions
chmod 600 .env
```

### Configuration File Security

```bash
# config/project.json is safe to commit (no secrets)
# config/environments/*.json are safe to commit (no secrets)

# Sensitive data comes from:
# - Environment variables (APP_* prefixed)
# - .env file (never committed)
# - OS environment variables on servers
```

### Secrets Masking

The ConfigLoader automatically masks sensitive values in logs:

```
[carnivore_config] INFO: Configuration loaded for environment: production
[carnivore_config] DEBUG: Full config: {
  "services": {
    "anthropic": {
      "key_env": "***MASKED***",
      "api_key": "***MASKED***"
    }
  }
}
```

## Troubleshooting

### Missing Configuration File

**Error:**
```
ConfigError: base configuration file not found: config/project.json
```

**Solution:**
```bash
# Ensure config/project.json exists
ls -la config/project.json

# Run from project root directory
cd /path/to/carnivore-weekly
python3 scripts/config.py
```

### Missing API Key

**Error:**
```
ConfigError: Missing required environment variables: ANTHROPIC_API_KEY
```

**Solution:**
```bash
# Set the missing environment variable
export ANTHROPIC_API_KEY=your_key_here

# Or add to .env file
echo "ANTHROPIC_API_KEY=your_key_here" >> .env
```

### Environment Not Loading

**Error:**
```
Configuration loaded for environment: development
```

**To override:**
```bash
# Set environment variable
export ENVIRONMENT=staging

# Or create environment-specific .env
echo "ENVIRONMENT=staging" >> .env.staging
source .env.staging
```

### Configuration Changes Not Applied

**Debug steps:**
```bash
# Check which config files are being loaded
python3 scripts/config.py

# Verify environment variable is set
echo $ENVIRONMENT
echo $APP_SERVICES_YOUTUBE_TIMEOUT

# Check .env file is in correct location
ls -la .env

# Verify .env file is being loaded
grep "API_KEY" .env
```

### Permission Errors

**Error:**
```
PermissionError: [Errno 13] Permission denied: '.env'
```

**Solution:**
```bash
# Fix file permissions
chmod 644 .env
chmod 644 config/project.json
chmod 755 config/environments/
```

## Configuration Examples

### Minimal Configuration (Development)

```python
# Load with defaults
config = ConfigLoader()

# Uses:
# 1. .env file (if present)
# 2. config/environments/development.json
# 3. config/project.json
```

### Override Specific Service

```bash
# Override YouTube timeout only
export APP_SERVICES_YOUTUBE_TIMEOUT=60

# Other settings come from config files
```

### Staging Environment with Custom Settings

```bash
# Set environment
export ENVIRONMENT=staging

# Override specific service
export APP_SERVICES_ANTHROPIC_MAX_RETRIES=5

# Set API keys
export ANTHROPIC_API_KEY=staging_key_here
export YOUTUBE_API_KEY=staging_key_here
```

### Production with Full Override

```bash
# Complete production setup
export ENVIRONMENT=production
export YOUTUBE_API_KEY=prod_key_1
export ANTHROPIC_API_KEY=prod_key_2
export SUPABASE_URL=https://prod.supabase.co
export SUPABASE_KEY=prod_key_3
export LOG_LEVEL=WARNING
export APP_SERVICES_ANTHROPIC_TIMEOUT=120
```

## Summary

The advanced configuration system provides:

- **Flexibility**: Override any setting without code changes
- **Security**: Separate sensitive data from version control
- **Multi-environment support**: Easy switch between dev/staging/prod
- **Validation**: Ensure required settings are present
- **Logging**: Track which config values are loaded
- **Masking**: Secrets not leaked in logs

For more information, see:
- `config/project.json` - Full configuration structure
- `scripts/config.py` - Configuration loader implementation
- `.env.example` - Environment variable reference

---

**Phase 3 Status**: Configuration system complete and production-ready.

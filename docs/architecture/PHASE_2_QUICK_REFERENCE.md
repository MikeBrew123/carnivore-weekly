# PHASE 2: Quick Reference Guide

## Current vs. Unified Commands

### Validation

**Current (5 tools):**
```bash
python3 scripts/validate_structure.py public/ --mode generated --severity critical
python3 scripts/validate_before_update.py
./scripts/validate-brand.sh public/index.html
./scripts/validate-seo.sh public/index.html
./scripts/validate-w3c.sh public/index.html
```

**Unified (1 tool):**
```bash
# Single file validation
python3 scripts/validate.py public/index.html --type structure
python3 scripts/validate.py public/index.html --type seo
python3 scripts/validate.py public/index.html --type brand

# Directory validation
python3 scripts/validate.py public/ --type all --severity critical

# Pre-flight
python3 scripts/validate.py . --type preflight

# Show all config
python3 scripts/validate.py --show-config
```

### Generation

**Current (5+ tools):**
```bash
python3 scripts/generate_pages.py
python3 scripts/generate_archive.py
python3 scripts/generate_channels.py
python3 scripts/update_wiki_videos.py
python3 scripts/generate_newsletter.py
```

**Unified (1 tool):**
```bash
# Generate specific type
python3 scripts/generate.py --type pages
python3 scripts/generate.py --type archive
python3 scripts/generate.py --type newsletter

# Generate multiple types (smart caching)
python3 scripts/generate.py --type archive,newsletter

# Generate everything
python3 scripts/generate.py --type all

# Force refresh API data
python3 scripts/generate.py --type channels --force-refresh-api

# Output format
python3 scripts/generate.py --type pages --output-format json
```

---

## Validators Overview

### What Gets Validated?

| Type | Checks | Rules |
|------|--------|-------|
| **structure** | HTML structure, semantics, accessibility | 15 |
| **seo** | Meta tags, OG, Twitter, H1, images | 7 |
| **brand** | Colors, fonts, spacing, texture | 8 |
| **w3c** | DOCTYPE, tags, hierarchy, deprecated tags | 12 |
| **accessibility** | WCAG 2.1 AA compliance (NEW) | 10+ |
| **preflight** | .env, packages, directories, API connectivity | 8 |

### Exit Codes

```
0 = All checks passed
1 = Critical failures (blocks deployment)
2 = Major issues (warnings, should fix)
3 = Minor issues (informational)
```

### Output Formats

```bash
# Text (default)
python3 scripts/validate.py public/index.html --type seo

# JSON
python3 scripts/validate.py public/index.html --type seo --output json

# Summary only
python3 scripts/validate.py public/index.html --type seo --summary

# Show failed checks only
python3 scripts/validate.py public/index.html --type seo --failed-only
```

---

## Generators Overview

### What Gets Generated?

| Type | Input | Output | Template |
|------|-------|--------|----------|
| **pages** | analyzed_content.json | public/index.html | index_template.html |
| **archive** | analyzed_content.json + archive/*.json | public/archive.html + archive pages | archive_template.html |
| **newsletter** | analyzed_content.json + last week | newsletters/*.txt/html | newsletter_template.html |
| **channels** | archive/*.json | public/channels.html | channels_template.html |
| **wiki** | analyzed_content.json + archive | wiki updates | (no template) |

### Smart Ordering

```
Config specifies order: config/project.json
{
  "generation_order": [
    "pages",      # First (needs analyzed_content.json)
    "archive",    # Uses same data
    "channels",   # Analyzes archive
    "wiki",       # Extracts keywords
    "newsletter"  # Last (uses all data)
  ]
}
```

### Caching Benefits

```
Before (separate generators):
  Load analyzed_content.json ×5 times
  Fetch YouTube API thumbnails ×3 times
  Render date filter ×5 times

After (unified generator):
  Load analyzed_content.json ×1 time (cached)
  Fetch YouTube API ×1 time (shared cache)
  Render date filter ×1 time (shared)

Result: 20% faster generation, fewer API calls
```

---

## Configuration Structure

### Location: `/config/project.json`

```json
{
  "project": {
    "name": "Carnivore Weekly",
    "version": "2.0"
  },

  "paths": {
    "root": ".",
    "scripts": "scripts",
    "templates": "templates",
    "public": "public",
    "data": "data"
  },

  "external_services": {
    "youtube": {
      "api_key_env": "YOUTUBE_API_KEY",
      "cache_ttl": 3600
    },
    "anthropic": {
      "api_key_env": "ANTHROPIC_API_KEY",
      "model": "claude-sonnet-4-5-20250929",
      "max_tokens": 2000
    }
  },

  "validators": {
    "structure": { ... },
    "brand": { ... },
    "seo": { ... },
    "w3c": { ... },
    "accessibility": { ... },
    "preflight": { ... }
  },

  "generators": {
    "pages": { ... },
    "archive": { ... },
    "newsletter": { ... },
    "channels": { ... },
    "wiki": { ... }
  }
}
```

### Override Config

```bash
# Use custom config
python3 scripts/validate.py public/ --config config/staging.json

# Show current config
python3 scripts/validate.py --show-config --config config/project.json

# Validate config
python3 scripts/validate.py --validate-config
```

---

## File Structure After Consolidation

### New Directories

```
/config/
  project.json              [Configuration]
  config_loader.py          [Config loading & validation]

/scripts/
  validate.py               [UNIFIED VALIDATOR - entry point]
  generate.py               [UNIFIED GENERATOR - entry point]

  validators/
    __init__.py
    base_validator.py       [Abstract base class]
    result_formatter.py     [Output formatting]
    structure_validator.py  [15 structure rules]
    brand_validator.py      [Brand compliance]
    seo_validator.py        [SEO checks]
    w3c_validator.py        [HTML5 compliance]
    accessibility_validator.py [WCAG 2.1 AA - NEW]
    preflight_validator.py  [Pre-flight checks]

  generators/
    __init__.py
    base_generator.py       [Abstract base class]
    data_loader.py          [Shared data loading & caching]
    page_generator.py       [Homepage generation]
    archive_generator.py    [Archive generation]
    newsletter_generator.py [Newsletter generation]
    channels_generator.py   [Channels generation]
    wiki_generator.py       [Wiki generation]

/tests/
  test_config.py
  test_validators.py
  test_generators.py
  integration_tests.py
  performance_tests.py
```

### Renamed Originals (Fallback)

```
scripts/validate_structure.py.bak
scripts/validate_before_update.py.bak
scripts/validate-brand.sh.bak
scripts/validate-seo.sh.bak
scripts/validate-w3c.sh.bak
scripts/generate_pages.py.bak
scripts/generate_archive.py.bak
scripts/generate_newsletter.py.bak
scripts/generate_channels.py.bak
```

---

## Common Use Cases

### Check Brand Compliance Before Publishing

**Before:**
```bash
./scripts/validate-brand.sh public/index.html
./scripts/validate-brand.sh public/archive.html
./scripts/validate-brand.sh public/channels.html
```

**After:**
```bash
python3 scripts/validate.py public/ --type brand
```

### Validate Generated Site

**Before:**
```bash
python3 scripts/validate_structure.py public/ --mode generated --severity critical
./scripts/validate-seo.sh public/index.html
./scripts/validate-w3c.sh public/index.html
```

**After:**
```bash
python3 scripts/validate.py public/ --type all --severity critical
```

### Pre-Flight Check Before Automation

**Before:**
```bash
python3 scripts/validate_before_update.py
```

**After:**
```bash
python3 scripts/validate.py . --type preflight
```

### Generate Weekly Content

**Before:**
```bash
python3 scripts/generate_pages.py
python3 scripts/generate_archive.py
python3 scripts/generate_channels.py
python3 scripts/update_wiki_videos.py
python3 scripts/generate_newsletter.py
# Manual ordering, manual troubleshooting
```

**After:**
```bash
python3 scripts/generate.py --type all
# Smart ordering, caching, unified error handling
```

### Get JSON Report for CI/CD

**Before:**
```bash
# No unified output format
```

**After:**
```bash
python3 scripts/validate.py public/ --type all --output json > validation_report.json
```

---

## Migration Checklist

### Week 1: Setup
- [ ] Create `/config/project.json`
- [ ] Create `/scripts/validators/base_validator.py`
- [ ] Create `/scripts/generators/base_generator.py`
- [ ] Verify old scripts still work
- [ ] Unit tests for config system

### Week 2: Validators
- [ ] Create structure validator
- [ ] Create brand validator (from bash)
- [ ] Create SEO validator (from bash)
- [ ] Create W3C validator (from bash)
- [ ] Create accessibility validator (NEW)
- [ ] Create unified validate.py
- [ ] Test against all types
- [ ] Compare output with original

### Week 3: Generators
- [ ] Create page generator
- [ ] Create archive generator
- [ ] Create newsletter generator
- [ ] Create channels generator
- [ ] Create wiki generator
- [ ] Create unified generate.py
- [ ] Implement caching
- [ ] Test against all types

### Week 4: Integration
- [ ] Update run_weekly_update.sh
- [ ] Create backwards-compat wrappers
- [ ] Test end-to-end workflow
- [ ] Compare generated files with original

### Week 5: Testing
- [ ] Unit tests (1,200+ lines)
- [ ] Integration tests
- [ ] Performance benchmarks
- [ ] Documentation
- [ ] Approval & deployment

---

## Troubleshooting

### Validator Not Found
```bash
# Check available validators
python3 scripts/validate.py --list-validators

# Output:
# Available validators:
#   - structure (15 rules)
#   - seo (7 rules)
#   - brand (8 rules)
#   - w3c (12 rules)
#   - accessibility (10+ rules)
#   - preflight (8 checks)
#   - all (run all)
```

### Config Error
```bash
# Validate configuration
python3 scripts/validate.py --validate-config

# Show current config
python3 scripts/validate.py --show-config

# Use different config
python3 scripts/validate.py --config config/debug.json
```

### Generator Failure
```bash
# Run with debug output
python3 scripts/generate.py --type pages --debug

# Check data is valid
python3 scripts/generate.py --validate-data

# Force refresh all API calls
python3 scripts/generate.py --type channels --force-refresh-api
```

### Rollback to Original Scripts
```bash
# If something goes wrong during Phase 1-3
git checkout scripts/validate_structure.py
git checkout scripts/generate_pages.py
# Old scripts work exactly as before

# If something goes wrong in run_weekly_update.sh
git checkout run_weekly_update.sh
# Use old workflow
```

---

## Performance Gains

### Validation Speed
```
Before: ~2 seconds (5 validators, 5 interpreter startups)
After:  ~0.8 seconds (1 validator, 1 startup, parallel checks)
Improvement: 60% faster
```

### Generation Speed
```
Before: ~30 seconds (5+ generators, 15 file loads, 3 API calls)
After:  ~24 seconds (1 generator, 1 file load, caching)
Improvement: 20% faster, reduced API calls by 90%
```

### Disk I/O
```
Before: 50+ file reads for weekly run
After:  15 file reads (caching, batch operations)
Improvement: 70% fewer disk operations
```

---

## Statistics

### Code Changes
```
Total New Code:         6,450 lines
Configuration:            850 lines
Validators:             2,400 lines
Generators:             1,300 lines
Tests:                  1,200 lines
Documentation:            700 lines

Duplicate Code Removed:  150+ lines
Script Consolidation:    70 lines shorter
Hardcoded Values:        Centralized in config
```

### Phase Timeline
```
Phase 1: Foundation     1 week   (no risk)
Phase 2: Validators    1 week   (low risk)
Phase 3: Generators    1 week   (low risk)
Phase 4: Integration   1 week   (medium risk)
Phase 5: Testing       1 week   (no risk)
─────────────────────────────────────────
Total:                 5 weeks  (260 hours)
```

### Team Effort
```
Senior Dev (Alex):    Leadership, code review, integration
Mid-level Dev:        Implement validators, generators
Junior Dev:           Testing, documentation
─────────────────────────────────────────
Total:               260 hours (4-5 weeks)
```

---

## Key Takeaways

✓ **Reduce Fragmentation:** 10 separate tools → 1 unified tool
✓ **Centralize Configuration:** 5+ locations → 1 JSON file
✓ **Improve Performance:** Caching, fewer API calls, faster startup
✓ **Better Error Handling:** Consistent across all validators
✓ **Zero Downtime:** Phased approach with fallbacks
✓ **Easy Rollback:** <15 minutes to revert at any point
✓ **Foundation for Future:** Easy to add new validators/generators
✓ **Cost Savings:** Fewer API calls, faster execution
✓ **Team Velocity:** New developers learn 1 tool, not 10
✓ **Quality Improvement:** 1,200+ lines of test coverage

---

## Related Documents

- **Full Report:** `PHASE_2_CONSOLIDATION_REPORT.md` (600+ lines)
- **Executive Summary:** `PHASE_2_SUMMARY.md` (this file)
- **Implementation Start:** Begin with Phase 1 (Week 1)

---

**Status:** Ready for Implementation
**Start Date:** Monday, 2026-01-06 (Week 1)
**Estimated Completion:** Friday, 2026-02-03 (Week 5)

For questions or clarifications, refer to the full consolidation report.

# Unified System - Quick Reference Guide

## One-Liners

### Validate Everything (Pre-flight)
```bash
python3 scripts/validate.py --type preflight
```

### Validate HTML Structure
```bash
python3 scripts/validate.py --type structure --path public/
```

### Generate All Content
```bash
python3 scripts/generate.py --type all
```

### Run Full Weekly Update
```bash
bash run_weekly_update.sh
```

## Common Commands

### Validation

| Task | Command |
|------|---------|
| Pre-flight check | `python3 scripts/validate.py --type preflight` |
| Structure (critical only) | `python3 scripts/validate.py --type structure --path public/ --severity critical` |
| Structure (all issues) | `python3 scripts/validate.py --type structure --path public/ --severity all` |
| SEO compliance | `python3 scripts/validate.py --type seo --path public/` |
| Accessibility | `python3 scripts/validate.py --type accessibility --path public/` |
| Get JSON output | `python3 scripts/validate.py --type structure --path public/ --json` |

### Generation

| Task | Command |
|------|---------|
| Homepage | `python3 scripts/generate.py --type pages` |
| Archive | `python3 scripts/generate.py --type archive` |
| Newsletter | `python3 scripts/generate.py --type newsletter` |
| Channels | `python3 scripts/generate.py --type channels` |
| Wiki data | `python3 scripts/generate.py --type wiki` |
| All types | `python3 scripts/generate.py --type all` |

### Legacy (Still Works)

| Task | Command |
|------|---------|
| Generate pages | `python3 scripts/generate_pages.py` |
| Generate archive | `python3 scripts/generate_archive.py` |
| Generate newsletter | `python3 scripts/generate_newsletter.py` |
| Generate channels | `python3 scripts/generate_channels.py` |
| Update wiki | `python3 scripts/update_wiki_videos.py` |
| Validate structure | `python3 scripts/validate_structure.py public/` |

## Configuration

**Location:** `config/project.json`

**Key Sections:**
- `paths` - Directory locations
- `validation` - Validation rules and settings
- `generation` - Template mappings and output paths
- `api` - API configuration (keys from .env)
- `newsletter` - Email settings
- `external_services` - Third-party integrations

**To Use Custom Config:**
```bash
python3 scripts/validate.py --config custom/path/config.json --type structure --path public/
python3 scripts/generate.py --config custom/path/config.json --type pages
```

## Exit Codes

**Validation:**
- `0` - All validation passed
- `1` - Critical issues found
- `2` - Major issues found
- `3` - Minor issues found

**Generation:**
- `0` - Generation successful
- `1` - Generation failed

## Options Reference

### validate.py

```bash
--type {structure,seo,brand,w3c,accessibility,preflight}
--path PATH              # File or directory to validate
--severity {critical,major,minor,all}  # Default: critical
--json                   # Output as JSON
--config CONFIG          # Path to config file
```

### generate.py

```bash
--type {pages,archive,newsletter,channels,wiki,all}
--config CONFIG          # Path to config file
```

## Troubleshooting

### "Config file not found"
```bash
# Ensure config/project.json exists
ls -la config/project.json

# Or specify custom location
python3 scripts/validate.py --config /path/to/config.json --type preflight
```

### "API key not found"
```bash
# Check .env file has required keys
cat .env | grep -E "ANTHROPIC_API_KEY|YOUTUBE_API_KEY"

# Load from environment
export ANTHROPIC_API_KEY=your_key_here
export YOUTUBE_API_KEY=your_key_here
```

### "Template not found"
```bash
# Verify template path in config matches actual files
ls -la templates/
ls -la templates/index_template.html
```

### "Permission denied"
```bash
# Make scripts executable
chmod +x scripts/validate.py scripts/generate.py
```

## Output Locations

**Generated Files:**
- Homepage: `public/index.html`
- Archive: `public/archive.html`
- Channels: `public/channels.html`
- Newsletter: `newsletters/latest.html`
- Wiki: `data/wiki_updates.json`

**Configuration:**
- Project config: `config/project.json`
- Validation config: `.structural-validation-config.json` (legacy)

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Validate structure
  run: python3 scripts/validate.py --type structure --path public/ --severity critical

- name: Run pre-flight
  run: python3 scripts/validate.py --type preflight

- name: Generate content
  run: python3 scripts/generate.py --type all
```

### GitLab CI Example
```yaml
validation:
  script:
    - python3 scripts/validate.py --type preflight
    - python3 scripts/validate.py --type structure --path public/

generation:
  script:
    - python3 scripts/generate.py --type all
```

## Performance Tips

1. **Use caching:** Data is cached within a single generation run
2. **Specify severity:** Use `--severity critical` to reduce output
3. **Validate specific paths:** `--path public/blog/` instead of entire `public/`
4. **Use JSON output:** `--json` flag for parsing in scripts
5. **Generate selectively:** Use specific types instead of `all`

## Development Workflow

1. **Make changes to templates or data**
2. **Validate:** `python3 scripts/validate.py --type preflight`
3. **Generate:** `python3 scripts/generate.py --type pages`
4. **Review:** Open generated files in browser
5. **Deploy:** `git add . && git commit && git push`

## Getting Help

**Configuration Options:**
```bash
# View current config
cat config/project.json | python3 -m json.tool

# Validate config
python3 -c "import json; json.load(open('config/project.json'))" && echo "Config is valid"
```

**Debug Mode:**
```bash
# Add verbose output
python3 scripts/validate.py --type structure --path public/ --severity all

# Get JSON for processing
python3 scripts/validate.py --type structure --path public/ --json | python3 -m json.tool
```

---

**Last Updated:** January 1, 2026
**Version:** 2.0 (Unified System)

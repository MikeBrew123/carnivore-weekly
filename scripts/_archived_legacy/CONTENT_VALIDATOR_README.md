# Content Validator - Self-Healing HTML Validation System

## Overview
The Content Validator is a comprehensive HTML validation system that automatically fixes common issues BEFORE files are written to disk. This is the first and most important wall in the 3-wall validation system.

## What It Does

### Auto-Fix Capabilities (Silent Fixes)

1. **H1 Enforcement**
   - If >1 H1 tag: Keeps first, converts others to H2
   - If 0 H1 tags: Promotes first H2 to H1
   - Prevents SEO disasters from multiple H1s

2. **Duplicate ID Prevention**
   - Detects duplicate IDs across the document
   - Appends incremental suffix (-2, -3, etc.) to duplicates
   - Preserves original first occurrence

3. **Meta Tag Enforcement**
   - Auto-generates missing meta description from first paragraph
   - Adds missing canonical URL based on filename
   - Ensures proper SEO metadata

4. **Heading Hierarchy**
   - Fixes skipped heading levels (h1→h3 becomes h1→h2→h3)
   - Maintains proper document outline

5. **Image Validation**
   - Adds missing alt attributes
   - Generates descriptive alt text from filename

6. **Link Validation**
   - Adds rel="noopener noreferrer" to external links
   - Improves security and performance

### Blocking Issues (Content Not Written)

1. **Template Variable Cleanup**
   - Blocks pages with unrendered Jinja syntax: `{{ }}`, `{% %}`, `{# #}`
   - Prevents broken schema markup from reaching production

2. **JSON-LD Validation**
   - Verifies valid JSON structure
   - Checks required schema fields for Article type
   - Blocks invalid structured data

## Integration

### In generate_blog_pages.py

```python
from content_validator import ContentValidator

# Initialize validator once
validator = ContentValidator()

# Before writing each file
fixed_content, log_messages = validator.validate_and_fix(rendered, filename)

if fixed_content is None:
    # Content blocked - do not write
    print(f"❌ BLOCKED: {post['title']}")
    continue

# Write validated content
with open(post_file, "w") as f:
    f.write(fixed_content)
```

### Standalone Usage

```python
from content_validator import validate_and_fix

html_content = "<html>...</html>"
fixed, logs = validate_and_fix(html_content, "post.html")

if fixed is None:
    print("Content blocked due to critical issues")
else:
    # Write fixed content
    with open("output.html", "w") as f:
        f.write(fixed)
```

## Logging System

### Log Format
```
[YYYY-MM-DD HH:MM:SS] [CATEGORY] filename.html — Message
```

### Categories
- `[AUTO-FIX]` - Issue was automatically corrected
- `[BLOCKED]` - Critical issue, content not written
- `[SUMMARY]` - Summary of validation results

### Log Files
- Location: `logs/validation_YYYY-MM-DD.log`
- Rotation: Keeps last 30 days automatically
- Append-only: Multiple runs on same day append to same file

### Console Output
After generation completes, prints formatted summary:
```
============================================================
CONTENT VALIDATION REPORT
============================================================
✅ [AUTO-FIX] post.html — Had 3 H1 tags, corrected to 1
✅ [AUTO-FIX] post.html — Fixed duplicate ID: newsletter-form (2 occurrences)
❌ [BLOCKED] bad-post.html — Unrendered template variables: {{ publish_date }}
📊 [SUMMARY] post.html — 2 auto-fixes applied, 0 blocking issues
============================================================
```

## Testing

### Test All Validation Rules
```bash
python3 -c "
from scripts.content_validator import ContentValidator

test_html = '''
<!DOCTYPE html>
<html>
<head>
    <title>Test</title>
</head>
<body>
    <h1>First H1</h1>
    <h1>Second H1</h1>
    <div id=\"test\">Content 1</div>
    <div id=\"test\">Content 2</div>
    <h3>Skipped H2</h3>
    <img src=\"test.jpg\">
    <a href=\"https://external.com\">Link</a>
</body>
</html>
'''

validator = ContentValidator()
fixed, logs = validator.validate_and_fix(test_html, 'test.html')

for log in logs:
    print(log)
"
```

### Test Blocking Behavior
```bash
python3 -c "
from scripts.content_validator import ContentValidator

test_html = '''
<!DOCTYPE html>
<html>
<head>
    <title>Test</title>
    <meta content=\"{{ publish_date }}\">
</head>
<body>
    <h1>Test</h1>
</body>
</html>
'''

validator = ContentValidator()
fixed, logs = validator.validate_and_fix(test_html, 'blocked.html')

print(f'Content blocked: {fixed is None}')
for log in logs:
    print(log)
"
```

## Success Metrics

After implementing this validator, expect:

- **95% reduction** in HTML validation errors
- **Zero** unrendered template variables in production
- **Zero** pages with multiple H1 tags
- **Zero** duplicate IDs causing JavaScript issues
- **100%** of images with alt text
- **100%** of external links with proper rel attributes

## Next Steps

This is Wall 1 of the 3-wall validation system:

1. **Wall 1: Content Validator** (✅ Complete) - Auto-fix before disk write
2. **Wall 2: Pre-Commit Validation** - Validate before git commit
3. **Wall 3: Pre-Deploy Validation** - Final check before production

## Maintenance

### Adding New Validation Rules

1. Add validation method to `ContentValidator` class
2. Add to `validate_and_fix()` method
3. Update this README with new rule
4. Test with known bad input
5. Verify logs show the fix

### Debugging Issues

Check logs in `logs/validation_YYYY-MM-DD.log` for:
- What was fixed automatically
- What was blocked
- Patterns of recurring issues

### Performance

The validator adds ~50-100ms per blog post during generation.
For 50 blog posts, expect ~5 seconds of validation overhead.
This is acceptable given the prevention of production issues.

## File Structure

```
scripts/
  content_validator.py       # Main validator module
  generate_blog_pages.py     # Integration point
  CONTENT_VALIDATOR_README.md # This file

logs/
  .gitkeep                   # Keep directory in git
  validation_YYYY-MM-DD.log  # Daily validation logs (gitignored)
```

## Related Documentation

- `SITE_AUDIT_REPORT.md` - Problems this validator prevents
- `scripts/generate_blog_pages.py` - Main integration point
- `docs/project-log/decisions.md` - Design decisions

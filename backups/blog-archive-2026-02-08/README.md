# Blog Directory Archive - 2026-02-08

## What Was Archived
The entire `/blog/` directory tree was moved here because it contained obsolete/duplicate blog post files.

## Directory Structure
- `blog/` - 15 HTML files (older versions, Jan 3, 2026)
- `blog/blog/` - 56 HTML files (intermediate versions, Jan 31, 2026)

## Why These Were Archived
1. **Incorrect location**: Blog posts should be in `public/blog/`, not `blog/` or `blog/blog/`
2. **Obsolete versions**: Files are older/incomplete versions of posts in `public/blog/`
3. **Not linked**: No site navigation or sitemaps reference these directories
4. **Validation issues**: The nested `blog/blog/` had 212 issues reported

## Current State (Post-Cleanup)
- ✅ `public/blog/` contains 52 current, validated blog posts (Feb 8, 2026)
- ✅ No broken links to `blog/blog/` or `blog/` directories
- ✅ Site structure clean: only `public/blog/` remains

## Comparison
**blog/ files (15 files, Jan 3):**
- Smaller file sizes (13KB avg)
- Old template structure
- Inline CSS styling
- Basic metadata

**blog/blog/ files (56 files, Jan 31):**
- Larger file sizes (21KB avg)
- Empty meta descriptions
- Broken canonical URLs (ended in `/.html`)
- Missing Google Fonts
- CSS path: `../css/global.css`

**public/blog/ files (52 files, Feb 8):**
- Current validated versions
- Complete metadata
- Proper canonical URLs
- Brand-compliant styling
- CSS path: `../../css/blog-post.css`

## Recovery Instructions
If any of these files are needed, they remain in this archive directory.
DO NOT move them back to the project root - copy to `public/blog/` if needed.

## Cleanup Action
Archived by: Agent 1 (blog duplicate cleanup task)
Date: February 8, 2026

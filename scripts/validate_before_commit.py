#!/usr/bin/env python3
# NOTE: CI runs additional checks (check_baselines.py,
# validate_canonicals.py) that this script does not.
# See .github/workflows/deploy.yml for CI validation.
# TODO: Unify local and CI validation into one script.
"""
Pre-Commit Validation Script for Carnivore Weekly

Validates HTML, sitemap, structured data, Python syntax, and links before commits.
Blocks commits with CRITICAL issues, warns about minor issues.

Usage:
    python scripts/validate_before_commit.py [--staged-only] [--verbose]

Exit codes:
    0: All checks passed
    1: Critical issues found (blocks commit)
    2: Warnings only (allows commit)
"""

import sys
import re
import json
import subprocess
from pathlib import Path
from typing import List, Dict, Tuple
from dataclasses import dataclass
from xml.etree import ElementTree as ET
from datetime import datetime

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Error: BeautifulSoup4 not installed. Install with:")
    print("  pip3 install beautifulsoup4")
    sys.exit(1)

try:
    from PIL import Image as PILImage
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False


@dataclass
class Issue:
    """Validation issue"""
    severity: str  # CRITICAL or WARNING
    file_path: str
    line_number: int
    message: str
    fix_hint: str


class ValidationResults:
    """Stores validation results"""
    def __init__(self):
        self.critical_issues: List[Issue] = []
        self.warnings: List[Issue] = []
        self.stats = {
            'html_files': 0,
            'sitemap_entries': 0,
            'python_files': 0,
            'json_ld_blocks': 0
        }

    def add_critical(self, file_path: str, line: int, message: str, fix: str):
        self.critical_issues.append(Issue('CRITICAL', file_path, line, message, fix))

    def add_warning(self, file_path: str, line: int, message: str, fix: str):
        self.warnings.append(Issue('WARNING', file_path, line, message, fix))

    def has_critical_issues(self) -> bool:
        return len(self.critical_issues) > 0

    def total_issues(self) -> int:
        return len(self.critical_issues) + len(self.warnings)


def get_staged_files() -> List[Path]:
    """Get list of staged files in git"""
    try:
        result = subprocess.run(
            ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACM'],
            capture_output=True,
            text=True,
            check=True
        )
        files = [Path(f) for f in result.stdout.strip().split('\n') if f]
        return files
    except subprocess.CalledProcessError:
        return []


def get_line_number(content: str, search_text: str) -> int:
    """Find line number of text in content"""
    lines = content.split('\n')
    for i, line in enumerate(lines, 1):
        if search_text in line:
            return i
    return 1


def validate_html_file(file_path: Path, results: ValidationResults):
    """Validate single HTML file"""
    # Cache for image reads (avoid reading same file twice)
    _image_cache = {}

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            soup = BeautifulSoup(content, 'html.parser')

        results.stats['html_files'] += 1
        # Handle both absolute and relative paths
        try:
            rel_path = str(file_path.relative_to(Path.cwd()))
        except ValueError:
            rel_path = str(file_path)

        # Check 1: Multiple H1 tags (CRITICAL)
        h1_tags = soup.find_all('h1')
        if len(h1_tags) > 1:
            line = get_line_number(content, str(h1_tags[1]))
            results.add_critical(
                rel_path, line,
                f"Multiple H1 tags (found {len(h1_tags)})",
                f"Change additional <h1> tags to <h2> or lower"
            )

        # Check 2: Duplicate IDs (CRITICAL)
        ids = [tag.get('id') for tag in soup.find_all(id=True)]
        duplicates = set([i for i in ids if ids.count(i) > 1])
        if duplicates:
            for dup_id in duplicates:
                line = get_line_number(content, f'id="{dup_id}"')
                results.add_critical(
                    rel_path, line,
                    f'Duplicate ID: "{dup_id}"',
                    f'Make IDs unique or remove duplicate'
                )

        # Check 3: Unrendered template variables (CRITICAL)
        template_patterns = [
            (r'\{\{[^}]+\}\}', 'Jinja2 variable'),
            (r'\{%[^%]+%\}', 'Jinja2 tag'),
            (r'\{#[^#]+#\}', 'Jinja2 comment'),
            (r'\{variable\}', 'Template placeholder')
        ]
        for pattern, var_type in template_patterns:
            matches = re.finditer(pattern, content)
            for match in matches:
                line = content[:match.start()].count('\n') + 1
                results.add_critical(
                    rel_path, line,
                    f'Unrendered template variable: {match.group()}',
                    f'Replace {var_type} with actual content or remove'
                )

        # Check 4: Required meta tags (CRITICAL)
        required_meta = ['title', 'description']
        for meta_name in required_meta:
            if meta_name == 'title':
                if not soup.find('title'):
                    results.add_critical(
                        rel_path, 1,
                        'Missing <title> tag',
                        'Add <title> tag in <head> section'
                    )
            else:
                meta_tag = soup.find('meta', attrs={'name': meta_name})
                if not meta_tag:
                    results.add_critical(
                        rel_path, 1,
                        f'Missing meta {meta_name} tag',
                        f'Add <meta name="{meta_name}" content="..."> in <head>'
                    )
                elif meta_tag.get('content', '').strip() == '':
                    line = get_line_number(content, f'name="{meta_name}"')
                    results.add_critical(
                        rel_path, line,
                        f'Empty meta {meta_name} content',
                        f'Add content to meta {meta_name} tag'
                    )

        # Check 12: Title tag length (WARNING)
        title_tag = soup.find('title')
        if title_tag:
            title_text = title_tag.get_text().strip()
            if len(title_text) > 60:
                line = get_line_number(content, '<title>')
                results.add_warning(
                    rel_path, line,
                    f"Title tag too long ({len(title_text)} chars, max 60): '{title_text[:50]}...'",
                    "Shorten title to ≤60 chars. Consider removing ' - Carnivore Weekly Blog' suffix"
                )

        # Check 5: Canonical URL (CRITICAL if present and malformed)
        canonical = soup.find('link', attrs={'rel': 'canonical'})
        if canonical:
            href = canonical.get('href', '')
            if '/.html' in href:
                line = get_line_number(content, 'rel="canonical"')
                results.add_critical(
                    rel_path, line,
                    'Broken canonical URL (contains /.html)',
                    'Fix canonical URL format (remove .html before fragment)'
                )

        # Check 6: Heading hierarchy (WARNING)
        headings = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
        prev_level = 0
        for heading in headings:
            level = int(heading.name[1])
            if prev_level > 0 and level > prev_level + 1:
                line = get_line_number(content, str(heading)[:50])
                results.add_warning(
                    rel_path, line,
                    f'Skipped heading level (h{prev_level} to h{level})',
                    f'Use h{prev_level + 1} instead of h{level}'
                )
            prev_level = level

        # Check 7: Images without alt attributes (WARNING)
        images = soup.find_all('img')
        for img in images:
            if not img.get('alt'):
                line = get_line_number(content, str(img)[:80])
                results.add_warning(
                    rel_path, line,
                    'Image missing alt attribute',
                    'Add alt="description" to <img> tag'
                )

        # Check 11: Image width/height missing (WARNING)
        # Derive project root early for image path resolution
        _project_root = file_path
        while _project_root.parent != _project_root:
            if (_project_root / 'public').is_dir():
                break
            _project_root = _project_root.parent

        for img in images:
            width_attr = img.get('width')
            height_attr = img.get('height')
            has_attr_dims = width_attr is not None and height_attr is not None

            # Check inline style for width/height
            has_style_dims = False
            style = img.get('style', '')
            if style:
                has_style_width = bool(re.search(r'width\s*:', style))
                has_style_height = bool(re.search(r'height\s*:', style))
                has_style_dims = has_style_width and has_style_height

            if not has_attr_dims and not has_style_dims:
                line = get_line_number(content, str(img)[:80])
                results.add_warning(
                    rel_path, line,
                    'Image missing width/height attributes',
                    'Add width and height attributes to prevent layout shift (CLS)'
                )

            # Aspect ratio sub-check (only for attribute-based dimensions with local images)
            if HAS_PILLOW and has_attr_dims:
                src = img.get('src', '')
                if src.startswith('/'):
                    img_file = _project_root / 'public' / src.lstrip('/')
                    if img_file.exists():
                        try:
                            if str(img_file) not in _image_cache:
                                with PILImage.open(img_file) as pil_img:
                                    _image_cache[str(img_file)] = pil_img.size
                            actual_w, actual_h = _image_cache[str(img_file)]
                            if actual_h > 0:
                                try:
                                    expected_ratio = int(width_attr) / int(height_attr)
                                    actual_ratio = actual_w / actual_h
                                    if abs(expected_ratio - actual_ratio) / actual_ratio > 0.05:
                                        line = get_line_number(content, str(img)[:80])
                                        results.add_warning(
                                            rel_path, line,
                                            f'Image aspect ratio mismatch: HTML {width_attr}x{height_attr} vs actual {actual_w}x{actual_h}',
                                            'Update width/height attributes to match actual image aspect ratio'
                                        )
                                except (ValueError, ZeroDivisionError):
                                    pass
                        except Exception:
                            pass

        # Check 8: Empty href attributes (WARNING)
        links = soup.find_all('a', href=True)
        for link in links:
            href = link.get('href', '').strip()
            if href == '' or href == '#':
                line = get_line_number(content, str(link)[:80])
                results.add_warning(
                    rel_path, line,
                    'Link with empty or placeholder href',
                    'Add proper URL to href attribute'
                )

        # Check 13: Skip-nav missing (WARNING)
        if soup.find('html') and soup.find('body'):
            skip_nav = soup.find('a', class_='skip-nav') or soup.find('a', href=lambda h: h and '#main-content' in h)
            if not skip_nav:
                results.add_warning(
                    rel_path, 1,
                    'Missing skip navigation link',
                    "Add skip navigation: <a href='#main-content' class='skip-nav'>Skip to main content</a> after <body>"
                )

        # Check 9: JSON-LD structured data validation (WARNING)
        scripts = soup.find_all('script', attrs={'type': 'application/ld+json'})
        for script in scripts:
            results.stats['json_ld_blocks'] += 1
            try:
                json.loads(script.string or '{}')
            except json.JSONDecodeError as e:
                line = get_line_number(content, 'application/ld+json')
                results.add_warning(
                    rel_path, line,
                    f'Invalid JSON-LD: {str(e)}',
                    'Fix JSON syntax in structured data'
                )

        # Check 14: JSON-LD missing on full pages (WARNING)
        if soup.find('html'):
            if not scripts:
                results.add_warning(
                    rel_path, 1,
                    'No JSON-LD structured data found',
                    'Add JSON-LD structured data for SEO'
                )

        # Check 10: Broken internal blog cross-links (CRITICAL)
        # Derive project root by walking up from file_path to find 'public/'
        project_root = file_path
        while project_root.parent != project_root:
            if (project_root / 'public').is_dir():
                break
            project_root = project_root.parent

        for link in soup.find_all('a', href=True):
            href = link['href']
            if href.startswith('/blog/'):
                target = project_root / 'public' / href.lstrip('/')
                if not target.exists():
                    line = get_line_number(content, href)
                    results.add_critical(
                        rel_path, line,
                        f'Broken internal link: {href} — target file does not exist',
                        'Update href to point to an existing blog post, or remove the link'
                    )

        # Check 10b: Mixed content — any http:// links (WARNING)
        for tag in soup.find_all(['a', 'img', 'script', 'link', 'source']):
            for attr in ['href', 'src', 'srcset']:
                val = tag.get(attr, '')
                if not val:
                    continue
                # For srcset, check each URL in the comma-separated list
                urls = [val] if attr != 'srcset' else [u.strip().split()[0] for u in val.split(',')]
                for url in urls:
                    if url.startswith('http://'):
                        # Exclude safe protocols and SVG data URIs
                        if any(url.startswith(safe) for safe in ['http://www.w3.org/', 'http://xmlns']):
                            continue
                        line = get_line_number(content, url[:40])
                        results.add_warning(
                            rel_path, line,
                            f'Mixed content: {url[:80]} uses http://',
                            'Change to https:// or verify the site supports HTTPS'
                        )

    except Exception as e:
        results.add_warning(str(file_path), 1, f'Error reading file: {str(e)}', 'Check file encoding or format')


def validate_sitemap(sitemap_path: Path, results: ValidationResults):
    """Validate sitemap.xml"""
    if not sitemap_path.exists():
        results.add_warning(
            str(sitemap_path), 1,
            'Sitemap not found',
            'Generate sitemap.xml'
        )
        return

    try:
        tree = ET.parse(sitemap_path)
        root = tree.getroot()

        # Extract namespace
        ns = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

        # Get all URLs
        urls = []
        for url_elem in root.findall('ns:url', ns):
            loc = url_elem.find('ns:loc', ns)
            if loc is not None:
                urls.append(loc.text)
                results.stats['sitemap_entries'] += 1

        # Check for duplicates (CRITICAL)
        duplicates = set([u for u in urls if urls.count(u) > 1])
        if duplicates:
            results.add_critical(
                str(sitemap_path), 1,
                f'Duplicate URLs in sitemap: {", ".join(list(duplicates)[:3])}',
                'Remove duplicate entries from sitemap'
            )

        # Validate lastmod dates (WARNING)
        for url_elem in root.findall('ns:url', ns):
            lastmod = url_elem.find('ns:lastmod', ns)
            if lastmod is not None and lastmod.text:
                try:
                    datetime.fromisoformat(lastmod.text.replace('Z', '+00:00'))
                except ValueError:
                    results.add_warning(
                        str(sitemap_path), 1,
                        f'Invalid lastmod date: {lastmod.text}',
                        'Use ISO 8601 format (YYYY-MM-DD)'
                    )

    except ET.ParseError as e:
        results.add_critical(
            str(sitemap_path), 1,
            f'Invalid XML: {str(e)}',
            'Fix XML syntax in sitemap'
        )
    except Exception as e:
        results.add_warning(
            str(sitemap_path), 1,
            f'Error reading sitemap: {str(e)}',
            'Check sitemap file'
        )


def validate_sitemap_sync(sitemap_path: Path, public_dir: Path, results: ValidationResults):
    """Cross-reference sitemap URLs against actual files on disk"""
    if not sitemap_path.exists():
        return

    try:
        tree = ET.parse(sitemap_path)
        root = tree.getroot()
        ns = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

        sitemap_urls = set()
        for url_elem in root.findall('ns:url', ns):
            loc = url_elem.find('ns:loc', ns)
            if loc is not None and loc.text:
                sitemap_urls.add(loc.text.strip())

        # Check A: Sitemap references non-existent files (CRITICAL)
        for url in sitemap_urls:
            # Convert URL to file path
            path_part = url.replace('https://carnivoreweekly.com/', '').replace('https://www.carnivoreweekly.com/', '')
            if not path_part or path_part.endswith('/'):
                path_part += 'index.html'
            file_path = public_dir / path_part
            if not file_path.exists():
                results.add_critical(
                    str(sitemap_path), 1,
                    f'Sitemap references non-existent file: {url} (expected {file_path})',
                    'Remove from sitemap or create the missing file'
                )

        # Check B: Blog files missing from sitemap (WARNING)
        import re as _re
        for html_file in sorted(public_dir.glob('blog/[0-9][0-9][0-9][0-9]-*.html')):
            rel = str(html_file.relative_to(public_dir))
            expected_url = f'https://carnivoreweekly.com/{rel}'
            if expected_url not in sitemap_urls:
                results.add_warning(
                    str(html_file), 1,
                    f'Blog post not in sitemap: {rel}',
                    'Add to sitemap.xml for SEO coverage'
                )

    except ET.ParseError:
        pass  # Already caught by validate_sitemap()


def validate_python_file(file_path: Path, results: ValidationResults):
    """Validate Python file syntax"""
    try:
        results.stats['python_files'] += 1
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        compile(content, str(file_path), 'exec')
    except SyntaxError as e:
        results.add_critical(
            str(file_path), e.lineno or 1,
            f'Python syntax error: {e.msg}',
            'Fix Python syntax'
        )
    except Exception as e:
        results.add_warning(
            str(file_path), 1,
            f'Error checking Python file: {str(e)}',
            'Check file encoding or format'
        )


def check_flake8_formatting(results: ValidationResults):
    """Run flake8 on scripts/ directory (warn-only, non-blocking).

    Catches the exact formatting issues that broke the Phase 9 weekly
    pipeline dry run: blank lines (E302/E303), line length (E501),
    bare except (E722), and fatal errors (E9/F63/F7/F82).
    """
    scripts_dir = Path.cwd() / 'scripts'
    if not scripts_dir.exists():
        return

    try:
        result = subprocess.run(
            [
                'flake8',
                '--count',
                '--select=E9,F63,F7,F82,E302,E303,E501,E722,W291,W292,W293',
                '--max-line-length=120',
                '--exclude=_archived_legacy,__pycache__,venv',
                str(scripts_dir),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except FileNotFoundError:
        print('ℹ️  flake8 not installed, skipping format check')
        return
    except subprocess.TimeoutExpired:
        return

    if not result.stdout.strip():
        results.stats['flake8_issues'] = 0
        return

    lines = result.stdout.strip().split('\n')
    issue_count = 0
    for line in lines:
        if ':' in line and not line.strip().isdigit():
            issue_count += 1
            results.add_warning(
                line.split(':')[0] if ':' in line else 'scripts/',
                1,
                f'flake8: {line}',
                'Run: python3 -m black scripts/ to auto-fix formatting'
            )

    results.stats['flake8_issues'] = issue_count


def run_validation(staged_only: bool = False, verbose: bool = False) -> ValidationResults:
    """Run all validations"""
    results = ValidationResults()
    project_root = Path.cwd()

    # Determine which files to validate
    if staged_only:
        files_to_check = get_staged_files()
        if not files_to_check:
            print("ℹ️  No staged files to validate")
            return results
    else:
        files_to_check = []
        # Get all HTML files under public/ and Python files anywhere
        files_to_check.extend(list((project_root / 'public').glob('**/*.html')))
        files_to_check.extend(list(project_root.glob('**/*.py')))

    # Filter out unwanted directories and files
    exclude_dirs = {'.git', 'node_modules', '__pycache__', 'venv', '.venv', 'backups'}
    exclude_patterns = [
        'templates/',  # Template files with template variables
        'public/includes/',  # HTML fragments without full HTML structure
        'public/components/',  # Reusable components without full HTML structure
        'data/drip-emails/',  # Email templates with runtime placeholders (n8n)
        'docs/archive/',  # Archived files
        'archive/',  # Archived/orphaned blog dupes
        'backups/',  # Backup directories
        'demos/',  # Demo/test files
    ]

    def is_blog_fragment(path):
        """Check if file is a blog content fragment (not dated, not index)."""
        if 'public/blog/' not in str(path):
            return False
        filename = path.name
        if filename == 'index.html':
            return False
        # Dated files follow pattern: YYYY-MM-DD-slug.html
        if re.match(r'^\d{4}-\d{2}-\d{2}-', filename):
            return False
        # Everything else in blog/ is a fragment
        return True

    def is_redirect_stub(path):
        """Check if file is a meta-refresh redirect stub (under 500 bytes).
        # NOTE: Redirect stubs are excluded here. If you add new redirects to
        # data/redirects.json, they are automatically excluded by this size/content check.
        """
        try:
            if path.stat().st_size < 500:
                content = path.read_text(encoding='utf-8', errors='ignore')[:100]
                if 'meta http-equiv="refresh"' in content:
                    return True
        except (OSError, IOError):
            pass
        return False

    files_to_check = [
        f for f in files_to_check
        if not any(ex in f.parts for ex in exclude_dirs)
        and not any(str(f).replace(str(project_root) + '/', '').startswith(pattern) for pattern in exclude_patterns)
        and not is_blog_fragment(f)
        and not is_redirect_stub(f)
    ]

    if verbose:
        print(f"📋 Validating {len(files_to_check)} files...")

    # Validate files
    for file_path in files_to_check:
        if not file_path.exists():
            continue

        if file_path.suffix == '.html':
            validate_html_file(file_path, results)
        elif file_path.suffix == '.py':
            validate_python_file(file_path, results)

    # Validate sitemap (always check if exists)
    sitemap_path = project_root / 'public' / 'sitemap.xml'
    if sitemap_path.exists() or not staged_only:
        validate_sitemap(sitemap_path, results)
    validate_sitemap_sync(sitemap_path, project_root / 'public', results)

    # Python formatting check (warn-only — catches issues before weekly pipeline)
    check_flake8_formatting(results)

    # === Pipeline Lockdown Phase 7: Enforcement Gates ===
    # These gates enforce every lesson learned as automated checks.

    # Gate 1: Future date check on blog filenames
    today = datetime.now().date()
    date_pattern = re.compile(r'^(\d{4}-\d{2}-\d{2})-.+\.html$')
    blog_dir = project_root / 'public' / 'blog'
    if blog_dir.exists():
        for bf in blog_dir.glob('*.html'):
            m = date_pattern.match(bf.name)
            if m:
                try:
                    file_date = datetime.strptime(m.group(1), '%Y-%m-%d').date()
                    if file_date > today:
                        results.add_critical(
                            f'public/blog/{bf.name}', 1,
                            f'Future date in filename: {m.group(1)} is after today ({today})',
                            'Google penalizes future-dated content. Fix the date in blog_posts.json.'
                        )
                except ValueError:
                    pass

    # Gate 2: Fragment check (blog HTML missing <!DOCTYPE)
    if blog_dir.exists():
        for bf in blog_dir.glob('*.html'):
            if bf.name == 'index.html':
                continue
            # Skip redirect stubs (tiny files under 500 bytes)
            # NOTE: Redirect stubs are excluded here. If you add new redirects to
            # data/redirects.json, they are automatically excluded by this size/content check.
            if bf.stat().st_size < 500:
                continue
            first_line = bf.read_text(encoding='utf-8', errors='ignore')[:30].strip().lower()
            if not first_line.startswith(('<!doctype', '<html')):
                results.add_critical(
                    f'public/blog/{bf.name}', 1,
                    'HTML fragment — missing <!DOCTYPE html>',
                    'This is not a complete page. Regenerate through the template.'
                )

    # Gate 3-5: Baseline regression checks
    baseline_path = project_root / 'data' / 'site_baseline.json'
    if baseline_path.exists():
        baseline = json.loads(baseline_path.read_text())

        # Gate 3: Sitemap regression
        if sitemap_path.exists():
            try:
                tree = ET.parse(sitemap_path)
                ns = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
                url_count = len(tree.getroot().findall('ns:url', ns))
                min_urls = baseline.get('sitemap_urls_min', 0)
                if url_count < min_urls:
                    results.add_critical(
                        'public/sitemap.xml', 1,
                        f'Sitemap regression: {url_count} URLs < baseline {min_urls}',
                        'Content was lost. Do NOT deploy. Compare against last known-good snapshot.'
                    )
            except ET.ParseError:
                pass

        # Gate 4: RSS regression
        feed_path = project_root / 'public' / 'feed.xml'
        if feed_path.exists():
            try:
                tree = ET.parse(feed_path)
                item_count = len(tree.getroot().findall('.//item'))
                min_items = baseline.get('rss_items_min', 0)
                if item_count < min_items:
                    results.add_critical(
                        'public/feed.xml', 1,
                        f'RSS regression: {item_count} items < baseline {min_items}',
                        'Feed subscribers would lose posts. Do NOT deploy.'
                    )
            except ET.ParseError:
                pass

        # Gate 5: Main pages existence
        for page in baseline.get('main_pages', []):
            page_path = project_root / 'public' / page
            if not page_path.exists():
                results.add_critical(
                    f'public/{page}', 1,
                    f'Main page missing: {page}',
                    'A core site page has disappeared. Regenerate or restore from backup.'
                )

    # Gate 6: Empty-slug HTML files in public/blog/
    if blog_dir.exists():
        for bf in blog_dir.glob('*.html'):
            stem = bf.stem  # filename without extension
            if not stem or stem == '.':
                results.add_critical(
                    f'public/blog/{bf.name}', 1,
                    f'Empty-slug HTML file: {bf.name} (no basename before .html)',
                    'This file was generated from an empty slug. Remove it and fix the source data.'
                )

    # Gate 7: No unrendered Jinja2 in public/blog/ (Loop 9 prevention)
    # If any blog file contains {{ or {% tags, it means someone wrote
    # directly to the HTML instead of using the pipeline.
    if blog_dir.exists():
        for bf in blog_dir.glob('*.html'):
            if bf.name == 'index.html':
                continue
            try:
                blog_content = bf.read_text(encoding='utf-8', errors='ignore')
                if '{{ ' in blog_content or '{%' in blog_content:
                    results.add_critical(
                        f'public/blog/{bf.name}', 1,
                        'Unrendered Jinja2 in blog HTML — pipeline was bypassed',
                        'Blog posts must be generated via generate_blog_pages.py, not written directly.'
                    )
            except (OSError, IOError):
                pass

    # Gate 8: No blog HTML files without date prefix (orphan detection)
    if blog_dir.exists():
        for bf in blog_dir.glob('*.html'):
            if bf.name in ('index.html', 'wiki.html'):
                continue
            if not re.match(r'^\d{4}-\d{2}-\d{2}-', bf.name):
                results.add_warning(
                    f'public/blog/{bf.name}', 1,
                    f'No date prefix — possible orphan from broken pipeline',
                    'Blog filenames must start with YYYY-MM-DD-. Remove or rename this file.'
                )

    return results


def print_results(results: ValidationResults):
    """Print validation results"""
    if results.total_issues() == 0:
        print("✅ ALL CHECKS PASSED")
        print(f"- HTML files validated: {results.stats['html_files']}")
        print(f"- Sitemap entries: {results.stats['sitemap_entries']}")
        print(f"- Python files checked: {results.stats['python_files']}")
        print(f"- JSON-LD blocks validated: {results.stats['json_ld_blocks']}")
        print(f"- Issues found: 0")
        return

    print(f"\n❌ VALIDATION FAILED — {results.total_issues()} issues found\n")

    if results.critical_issues:
        print("CRITICAL (blocks commit):")
        for i, issue in enumerate(results.critical_issues, 1):
            print(f"{i}. {issue.file_path}:{issue.line_number} — {issue.message}")
            print(f"   Fix: {issue.fix_hint}\n")

    if results.warnings:
        print("WARNING (doesn't block):")
        for i, issue in enumerate(results.warnings, 1):
            print(f"{i}. {issue.file_path}:{issue.line_number} — {issue.message}")
            print(f"   Fix: {issue.fix_hint}\n")

    print(f"Summary: {len(results.critical_issues)} critical, {len(results.warnings)} warnings")

    if results.has_critical_issues():
        print("❌ COMMIT BLOCKED — fix critical issues before committing")
    else:
        print("⚠️  Warnings found — consider fixing before commit")


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Validate HTML, sitemap, and Python files')
    parser.add_argument('--staged-only', action='store_true', help='Only validate staged files')
    parser.add_argument('--verbose', action='store_true', help='Verbose output')
    args = parser.parse_args()

    results = run_validation(staged_only=args.staged_only, verbose=args.verbose)
    print_results(results)

    # Write log
    log_dir = Path.cwd() / 'logs'
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / 'commit_validation.log'

    with open(log_file, 'a') as f:
        timestamp = datetime.now().isoformat()
        f.write(f"\n--- Validation run at {timestamp} ---\n")
        f.write(f"Critical: {len(results.critical_issues)}, Warnings: {len(results.warnings)}\n")
        for issue in results.critical_issues + results.warnings:
            f.write(f"[{issue.severity}] {issue.file_path}:{issue.line_number} - {issue.message}\n")

    # Exit codes
    if results.has_critical_issues():
        sys.exit(1)
    elif results.warnings:
        sys.exit(2)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()

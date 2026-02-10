#!/usr/bin/env python3
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
            # Check 10b: Mixed content — http:// links to own domain (WARNING)
            if href.startswith('http://carnivoreweekly.com') or href.startswith('http://www.carnivoreweekly.com'):
                line = get_line_number(content, href)
                results.add_warning(
                    rel_path, line,
                    f'Mixed content: {href} uses http:// instead of https://',
                    'Change http:// to https:// to avoid mixed content warnings'
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
        # Get all HTML and Python files
        files_to_check.extend(list(project_root.glob('**/*.html')))
        files_to_check.extend(list(project_root.glob('**/*.py')))

    # Filter out unwanted directories and files
    exclude_dirs = {'.git', 'node_modules', '__pycache__', 'venv', '.venv', 'backups'}
    exclude_patterns = [
        'templates/',  # Template files with template variables
        'public/includes/',  # HTML fragments without full HTML structure
        'public/components/',  # Reusable components without full HTML structure
        'docs/archive/',  # Archived files
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

    files_to_check = [
        f for f in files_to_check
        if not any(ex in f.parts for ex in exclude_dirs)
        and not any(str(f).replace(str(project_root) + '/', '').startswith(pattern) for pattern in exclude_patterns)
        and not is_blog_fragment(f)
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

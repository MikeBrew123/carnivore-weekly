#!/usr/bin/env python3
"""
Comprehensive validation sweep across the entire Carnivore Weekly site.

Checks:
1. W3C HTML validation
2. JavaScript validation (ESLint)
3. Python validation (flake8)
4. Jordan's validators
5. 404 link/image checking
"""

import subprocess
import json
import re
from pathlib import Path
from collections import defaultdict

# Colors for terminal output
RED = '\033[91m'
YELLOW = '\033[93m'
GREEN = '\033[92m'
BLUE = '\033[94m'
RESET = '\033[0m'

def is_redirect_stub(filepath):
    """Check if a file is a meta-refresh redirect stub.
    # NOTE: Redirect stubs are excluded here. If you add new redirects to
    # data/redirects.json, they are automatically excluded by this size/content check.
    """
    try:
        p = Path(filepath)
        if p.stat().st_size < 500:
            content = p.read_text(encoding='utf-8', errors='ignore')[:100]
            if 'meta http-equiv="refresh"' in content:
                return True
    except (OSError, IOError):
        pass
    return False


class ValidationReport:
    def __init__(self):
        self.critical = []
        self.warnings = []
        self.info = []

    def add_critical(self, category, file, issue):
        self.critical.append({'category': category, 'file': file, 'issue': issue})

    def add_warning(self, category, file, issue):
        self.warnings.append({'category': category, 'file': file, 'issue': issue})

    def add_info(self, category, file, issue):
        self.info.append({'category': category, 'file': file, 'issue': issue})

    def print_report(self):
        total_issues = len(self.critical) + len(self.warnings) + len(self.info)

        print(f"\n{'='*80}")
        print(f"{BLUE}CARNIVORE WEEKLY - FULL VALIDATION REPORT{RESET}")
        print(f"{'='*80}\n")

        print(f"Total Issues Found: {total_issues}")
        print(f"  {RED}🔴 Critical: {len(self.critical)}{RESET}")
        print(f"  {YELLOW}🟡 Warnings: {len(self.warnings)}{RESET}")
        print(f"  {GREEN}🟢 Info: {len(self.info)}{RESET}\n")

        if self.critical:
            print(f"\n{RED}{'='*80}")
            print(f"🔴 CRITICAL ISSUES (breaks functionality)")
            print(f"{'='*80}{RESET}\n")
            by_category = defaultdict(list)
            for item in self.critical:
                by_category[item['category']].append(item)

            for category, items in sorted(by_category.items()):
                print(f"{RED}[{category}]{RESET}")
                for item in items:
                    print(f"  📁 {item['file']}")
                    print(f"     {item['issue']}\n")

        if self.warnings:
            print(f"\n{YELLOW}{'='*80}")
            print(f"🟡 WARNINGS (works but problematic)")
            print(f"{'='*80}{RESET}\n")
            by_category = defaultdict(list)
            for item in self.warnings:
                by_category[item['category']].append(item)

            for category, items in sorted(by_category.items()):
                print(f"{YELLOW}[{category}]{RESET}")
                for item in items:
                    print(f"  📁 {item['file']}")
                    print(f"     {item['issue']}\n")

        if self.info:
            print(f"\n{GREEN}{'='*80}")
            print(f"🟢 INFO (cosmetic/minor)")
            print(f"{'='*80}{RESET}\n")
            by_category = defaultdict(list)
            for item in self.info:
                by_category[item['category']].append(item)

            for category, items in sorted(by_category.items()):
                print(f"{GREEN}[{category}]{RESET}")
                # Only show first 5 of each category for info
                shown = 0
                for item in items[:5]:
                    print(f"  📁 {item['file']}")
                    print(f"     {item['issue']}")
                    shown += 1
                if len(items) > 5:
                    print(f"  ... and {len(items) - 5} more similar issues\n")
                else:
                    print()


def check_html_validation(report):
    """Check HTML validation using Nu HTML Checker."""
    print(f"\n{BLUE}[1/5] Running HTML Validation...{RESET}")

    pages_to_check = [
        'public/index.html',
        'public/blog.html',
        'public/channels.html',
        'public/wiki.html',
        'public/calculator.html',
        'public/blog/2025-12-23-adhd-connection.html',
        'public/blog/2026-01-10-dating-carnivore.html',
        'public/blog/2026-01-11-travel-hacks.html',
    ]

    # Check if vnu (Nu HTML Checker) is available
    try:
        result = subprocess.run(['which', 'vnu'], capture_output=True, text=True)
        if result.returncode != 0:
            report.add_warning(
                'HTML Validation',
                'System',
                'Nu HTML Checker (vnu) not installed. Install with: brew install vnu'
            )
            return
    except:
        report.add_warning(
            'HTML Validation',
            'System',
            'Cannot check for vnu - skipping HTML validation'
        )
        return

    for page in pages_to_check:
        if not Path(page).exists():
            continue

        try:
            result = subprocess.run(
                ['vnu', '--format', 'json', page],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.stderr:
                try:
                    data = json.loads(result.stderr)
                    messages = data.get('messages', [])

                    for msg in messages:
                        msg_type = msg.get('type', 'info')
                        message = msg.get('message', '')
                        line = msg.get('lastLine', 'unknown')

                        issue_text = f"Line {line}: {message}"

                        if msg_type == 'error':
                            report.add_critical('HTML Validation', page, issue_text)
                        elif 'warning' in msg_type.lower():
                            report.add_warning('HTML Validation', page, issue_text)
                        else:
                            report.add_info('HTML Validation', page, issue_text)
                except json.JSONDecodeError:
                    pass
        except subprocess.TimeoutExpired:
            report.add_warning('HTML Validation', page, 'Validation timeout')
        except Exception as e:
            report.add_warning('HTML Validation', page, f'Validation error: {str(e)}')

    print(f"  ✓ HTML validation complete")


def check_javascript_validation(report):
    """Check JavaScript files with ESLint."""
    print(f"\n{BLUE}[2/5] Running JavaScript Validation...{RESET}")

    js_dir = Path('public/js')
    if not js_dir.exists():
        report.add_warning('JavaScript', 'public/js', 'Directory not found')
        return

    js_files = list(js_dir.glob('*.js'))

    # Check if eslint is available
    try:
        result = subprocess.run(['which', 'eslint'], capture_output=True, text=True)
        if result.returncode != 0:
            # Try npx eslint
            result = subprocess.run(['npx', 'eslint', '--version'], capture_output=True, text=True)
            if result.returncode != 0:
                report.add_info(
                    'JavaScript',
                    'System',
                    'ESLint not installed - basic syntax check only'
                )
                # Do basic syntax check instead
                for js_file in js_files:
                    check_js_syntax_basic(js_file, report)
                return
    except:
        report.add_info('JavaScript', 'System', 'ESLint check skipped')
        return

    for js_file in js_files:
        try:
            result = subprocess.run(
                ['npx', 'eslint', '--format', 'json', str(js_file)],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.stdout:
                try:
                    data = json.loads(result.stdout)
                    for file_result in data:
                        messages = file_result.get('messages', [])
                        for msg in messages:
                            severity = msg.get('severity', 1)
                            message = msg.get('message', '')
                            line = msg.get('line', 'unknown')

                            issue_text = f"Line {line}: {message}"

                            if severity == 2:  # Error
                                report.add_critical('JavaScript', str(js_file), issue_text)
                            else:  # Warning
                                report.add_warning('JavaScript', str(js_file), issue_text)
                except json.JSONDecodeError:
                    pass
        except subprocess.TimeoutExpired:
            report.add_warning('JavaScript', str(js_file), 'ESLint timeout')
        except Exception as e:
            report.add_warning('JavaScript', str(js_file), f'ESLint error: {str(e)}')

    print(f"  ✓ JavaScript validation complete")


def check_js_syntax_basic(js_file, report):
    """Basic JavaScript syntax check."""
    try:
        content = js_file.read_text()

        # Check for common issues
        if 'console.log' in content:
            report.add_info('JavaScript', str(js_file), 'Contains console.log statements')

        # Check for undefined variables (very basic)
        if re.search(r'\bundefined\b(?!\s*[!=]=)', content):
            report.add_warning('JavaScript', str(js_file), 'Possible undefined variable usage')

    except Exception as e:
        report.add_warning('JavaScript', str(js_file), f'Read error: {str(e)}')


def check_python_validation(report):
    """Check Python scripts with flake8."""
    print(f"\n{BLUE}[3/5] Running Python Validation...{RESET}")

    scripts_dir = Path('scripts')
    if not scripts_dir.exists():
        return

    py_files = list(scripts_dir.glob('*.py'))

    # Check if flake8 is available
    try:
        result = subprocess.run(['which', 'flake8'], capture_output=True, text=True)
        if result.returncode != 0:
            report.add_info('Python', 'System', 'flake8 not installed - install with: pip install flake8')
            return
    except:
        return

    for py_file in py_files:
        try:
            result = subprocess.run(
                ['flake8', '--max-line-length=120', str(py_file)],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.stdout:
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    if ':' in line:
                        # Parse flake8 output: filename:line:col: code message
                        parts = line.split(':', 3)
                        if len(parts) >= 4:
                            line_no = parts[1]
                            code = parts[3].strip().split()[0] if parts[3].strip() else ''
                            message = parts[3].strip()

                            issue_text = f"Line {line_no}: {message}"

                            # E9xx and F are errors
                            if code.startswith('E9') or code.startswith('F'):
                                report.add_critical('Python', str(py_file), issue_text)
                            else:
                                report.add_info('Python', str(py_file), issue_text)
        except subprocess.TimeoutExpired:
            report.add_warning('Python', str(py_file), 'flake8 timeout')
        except Exception as e:
            report.add_warning('Python', str(py_file), f'flake8 error: {str(e)}')

    print(f"  ✓ Python validation complete")


def check_404s(report):
    """Check for broken links and missing resources."""
    print(f"\n{BLUE}[4/5] Checking for 404s (broken links/images)...{RESET}")

    pages_to_check = [
        'public/index.html',
        'public/blog.html',
        'public/channels.html',
        'public/wiki.html',
        'public/calculator.html',
    ]

    # Also check blog posts (skip redirect stubs)
    blog_dir = Path('public/blog')
    if blog_dir.exists():
        pages_to_check.extend([
            str(p) for p in list(blog_dir.glob('*.html'))[:5]
            if not is_redirect_stub(p)
        ])

    for page in pages_to_check:
        page_path = Path(page)
        if not page_path.exists():
            continue

        try:
            content = page_path.read_text()

            # Find all src and href attributes
            # Images
            img_srcs = re.findall(r'src=["\']([^"\']+)["\']', content)
            for src in img_srcs:
                if src.startswith('http'):
                    continue  # Skip external
                if src.startswith('/'):
                    check_path = Path('public' + src)
                else:
                    check_path = page_path.parent / src

                if not check_path.exists():
                    report.add_critical('404 Check', str(page), f'Missing image: {src}')

            # Links (href)
            links = re.findall(r'href=["\']([^"\']+)["\']', content)
            for link in links:
                if link.startswith('http') or link.startswith('mailto:') or link.startswith('#'):
                    continue  # Skip external, mailto, and anchors

                # Remove query strings and anchors
                clean_link = link.split('?')[0].split('#')[0]

                if clean_link.startswith('/'):
                    check_path = Path('public' + clean_link)
                else:
                    check_path = page_path.parent / clean_link

                if not check_path.exists():
                    report.add_warning('404 Check', str(page), f'Broken link: {link}')

            # CSS files
            css_links = re.findall(r'<link[^>]+href=["\']([^"\']+\.css)["\']', content)
            for css in css_links:
                if css.startswith('http'):
                    continue
                if css.startswith('/'):
                    check_path = Path('public' + css)
                else:
                    check_path = page_path.parent / css

                if not check_path.exists():
                    report.add_critical('404 Check', str(page), f'Missing CSS: {css}')

            # JS files
            js_srcs = re.findall(r'<script[^>]+src=["\']([^"\']+\.js)["\']', content)
            for js in js_srcs:
                if js.startswith('http'):
                    continue
                if js.startswith('/'):
                    check_path = Path('public' + js)
                else:
                    check_path = page_path.parent / js

                if not check_path.exists():
                    report.add_critical('404 Check', str(page), f'Missing JS: {js}')

        except Exception as e:
            report.add_warning('404 Check', str(page), f'Check error: {str(e)}')

    print(f"  ✓ 404 check complete")


def check_seo_basics(report):
    """Check basic SEO requirements on pages."""
    print(f"\n{BLUE}[5/5] Running SEO/Jordan Validator Checks...{RESET}")

    pages_to_check = [
        'public/index.html',
        'public/blog.html',
    ]

    # Add blog posts (skip redirect stubs)
    blog_dir = Path('public/blog')
    if blog_dir.exists():
        pages_to_check.extend([
            str(p) for p in blog_dir.glob('*.html')
            if not is_redirect_stub(p)
        ])

    for page in pages_to_check:
        page_path = Path(page)
        if not page_path.exists():
            continue

        try:
            content = page_path.read_text()

            # Check for GA
            if 'gtag' not in content and 'G-NR4JVKW2JV' not in content:
                report.add_critical('SEO/Analytics', str(page), 'Missing Google Analytics')

            # Check for meta description
            if not re.search(r'<meta name="description"', content):
                report.add_critical('SEO/Analytics', str(page), 'Missing meta description')
            elif re.search(r'<meta name="description" content=""', content):
                report.add_critical('SEO/Analytics', str(page), 'Empty meta description')

            # Check for OG tags (blog posts only)
            if '/blog/' in str(page):
                if 'og:title' not in content:
                    report.add_warning('SEO/Analytics', str(page), 'Missing og:title')
                if 'og:image' not in content:
                    report.add_warning('SEO/Analytics', str(page), 'Missing og:image')
                if 'application/ld+json' not in content:
                    report.add_warning('SEO/Analytics', str(page), 'Missing schema markup')

        except Exception as e:
            report.add_warning('SEO/Analytics', str(page), f'Check error: {str(e)}')

    print(f"  ✓ SEO/Analytics check complete")


def main():
    """Run full validation sweep."""
    project_root = Path(__file__).parent.parent

    # Change to project root
    import os
    os.chdir(project_root)

    report = ValidationReport()

    print(f"\n{BLUE}{'='*80}")
    print(f"Starting Full Validation Sweep...")
    print(f"{'='*80}{RESET}")

    check_html_validation(report)
    check_javascript_validation(report)
    check_python_validation(report)
    check_404s(report)
    check_seo_basics(report)

    report.print_report()

    # Exit code based on critical issues
    if report.critical:
        return 1
    return 0


if __name__ == '__main__':
    exit(main())

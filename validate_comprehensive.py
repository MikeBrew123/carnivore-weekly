#!/usr/bin/env python3

import os
import re
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple

# Configuration
BASE_PATH = Path("/Users/mbrew/Developer/carnivore-weekly")
BRAND_COLORS = {
    'dark_brown': '#1a120b',
    'gold': '#ffd700',
    'tan': '#d4a574'
}

AI_TELLS = [
    'delve', 'robust', 'leverage', 'innovative', 'revolutionary',
    'cutting-edge', 'synergy', 'paradigm', 'disrupting', 'holistic',
    'seamlessly', 'empower', 'game-changing', 'next-generation',
    'ai language model', 'as an ai', 'i should note', 'it is important to note',
    'furthermore', 'in addition', 'moreover', 'thus', 'therefore'
]

PAGES = [
    # Main pages
    ('public/index.html', 'index.html', 'main'),
    ('public/blog.html', 'blog.html', 'main'),
    ('public/wiki.html', 'wiki.html', 'main'),
    ('public/about.html', 'about.html', 'main'),
    ('public/archive.html', 'archive.html', 'main'),
    ('public/channels.html', 'channels.html', 'main'),
    ('public/questionnaire.html', 'questionnaire.html', 'main'),
    ('public/privacy.html', 'privacy.html', 'main'),
    ('public/the-lab.html', 'the-lab.html', 'main'),
    ('public/upgrade-plan.html', 'upgrade-plan.html', 'main'),

    # Blog posts
    ('blog/2025-12-18-carnivore-bar-guide.html', '2025-12-18-carnivore-bar-guide.html', 'blog'),
    ('blog/2025-12-19-psmf-fat-loss.html', '2025-12-19-psmf-fat-loss.html', 'blog'),
    ('blog/2025-12-20-lipid-energy-model.html', '2025-12-20-lipid-energy-model.html', 'blog'),
    ('blog/2025-12-21-night-sweats.html', '2025-12-21-night-sweats.html', 'blog'),
    ('blog/2025-12-22-mtor-muscle.html', '2025-12-22-mtor-muscle.html', 'blog'),
    ('blog/2025-12-23-adhd-connection.html', '2025-12-23-adhd-connection.html', 'blog'),
    ('blog/2025-12-24-deep-freezer-strategy.html', '2025-12-24-deep-freezer-strategy.html', 'blog'),
    ('blog/2025-12-25-new-year-same-you.html', '2025-12-25-new-year-same-you.html', 'blog'),
    ('blog/2025-12-26-seven-dollar-survival-guide.html', '2025-12-26-seven-dollar-survival-guide.html', 'blog'),
    ('blog/2025-12-27-anti-resolution-playbook.html', '2025-12-27-anti-resolution-playbook.html', 'blog'),
    ('blog/2025-12-28-physiological-insulin-resistance.html', '2025-12-28-physiological-insulin-resistance.html', 'blog'),
    ('blog/2025-12-29-lion-diet-challenge.html', '2025-12-29-lion-diet-challenge.html', 'blog'),
    ('blog/2025-12-30-pcos-hormones.html', '2025-12-30-pcos-hormones.html', 'blog'),
    ('blog/2025-12-31-acne-purge.html', '2025-12-31-acne-purge.html', 'blog'),

    # Archive pages
    ('archive/2025-12-26.html', '2025-12-26.html', 'archive'),

    # Test pages
    ('public/index-2026.html', 'index-2026.html', 'test'),
    ('public/bento-test.html', 'bento-test.html', 'test'),
    ('public/trending-explorer-test.html', 'trending-explorer-test.html', 'test'),
    ('public/wiki-link-preview.html', 'wiki-link-preview.html', 'test'),
    ('public/index-full.html', 'index-full.html', 'test'),
]


class PageValidator:
    def __init__(self):
        self.results = {}
        self.critical_issues = []
        self.warnings = []
        self.notes = []

    def validate_all(self):
        """Validate all pages"""
        total = len(PAGES)
        passed = 0

        print(f"Starting comprehensive validation of {total} pages...\n")

        for rel_path, display_name, page_type in PAGES:
            file_path = BASE_PATH / rel_path

            if not file_path.exists():
                print(f"⚠ {display_name}: FILE NOT FOUND")
                self.results[display_name] = {
                    'type': page_type,
                    'error': 'File not found'
                }
                continue

            print(f"✓ Validating {display_name}...", end=" ")

            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    html = f.read()

                result = {
                    'type': page_type,
                    'path': str(file_path),
                    'seo': self.validate_seo(html, display_name),
                    'brand': self.validate_brand(html, display_name),
                    'content': self.validate_content(html, display_name),
                    'a11y': self.validate_a11y(html, display_name),
                    'performance': self.validate_performance(html, display_name),
                    'w3c': self.validate_w3c(html, display_name),
                }

                # Calculate overall status
                statuses = [v['status'] for v in result.values() if isinstance(v, dict) and 'status' in v]
                if all(s == 'PASS' for s in statuses):
                    result['overall'] = 'PASS'
                    passed += 1
                    print("PASS")
                elif any(s == 'FAIL' for s in statuses):
                    result['overall'] = 'FAIL'
                    print("FAIL")
                else:
                    result['overall'] = 'WARN'
                    print("WARN")

                self.results[display_name] = result

            except Exception as e:
                print(f"ERROR: {str(e)}")
                self.results[display_name] = {
                    'type': page_type,
                    'error': str(e)
                }

        return passed, total

    def validate_seo(self, html: str, page_name: str) -> Dict:
        """Validate SEO elements"""
        issues = []

        # Check title
        title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
        if not title_match or not title_match.group(1).strip():
            issues.append('Missing or empty page title')
        elif len(title_match.group(1)) > 60:
            issues.append(f'Title too long: {len(title_match.group(1))} chars')

        # Check meta description
        desc_match = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', html, re.IGNORECASE)
        if not desc_match or not desc_match.group(1).strip():
            issues.append('Missing meta description')
        elif len(desc_match.group(1)) > 160:
            issues.append(f'Meta description too long: {len(desc_match.group(1))} chars')

        # Check h1 count
        h1_count = len(re.findall(r'<h1', html, re.IGNORECASE))
        if h1_count == 0:
            issues.append('Missing h1 tag')
        elif h1_count > 1:
            issues.append(f'Multiple h1 tags: {h1_count} found')

        # Check heading hierarchy
        headings = re.findall(r'<h([1-6])', html, re.IGNORECASE)
        if headings:
            headings = [int(h) for h in headings]
            for i in range(1, len(headings)):
                if headings[i] - headings[i-1] > 1:
                    issues.append(f'Heading skip: h{headings[i-1]} → h{headings[i]}')
                    break

        # Check images have alt text
        images = re.findall(r'<img[^>]*>', html, re.IGNORECASE)
        missing_alt = sum(1 for img in images if 'alt=' not in img.lower() or 'alt=""' in img)
        if missing_alt > 0:
            issues.append(f'{missing_alt} images without alt text')

        return {
            'status': 'PASS' if not issues else ('FAIL' if len(issues) > 2 else 'WARN'),
            'issues': issues if issues else None
        }

    def validate_brand(self, html: str, page_name: str) -> Dict:
        """Validate brand consistency"""
        issues = []

        # Check for dark brown color (as hex or rgb)
        has_dark_brown = bool(re.search(
            r'(#1a120b|rgb\s*\(\s*26\s*,\s*18\s*,\s*11\s*\)|1a120b)',
            html, re.IGNORECASE
        ))

        # Check for gold color
        has_gold = bool(re.search(
            r'(#ffd700|rgb\s*\(\s*255\s*,\s*215\s*,\s*0\s*\)|ffd700)',
            html, re.IGNORECASE
        ))

        # Note color presence
        if not has_dark_brown and not has_gold:
            issues.append('Brand colors not found in HTML')

        # Check for brand fonts (looking for font declarations)
        if 'font-family' not in html.lower():
            issues.append('No font-family declarations found')

        return {
            'status': 'PASS' if not issues else 'WARN',
            'issues': issues if issues else None,
            'colors': {
                'dark_brown': has_dark_brown,
                'gold': has_gold
            }
        }

    def validate_content(self, html: str, page_name: str) -> Dict:
        """Validate content quality"""
        issues = []

        # Extract body content
        body_match = re.search(r'<body[^>]*>(.*?)</body>', html, re.IGNORECASE | re.DOTALL)
        body = body_match.group(1) if body_match else html

        # Check for AI tells
        body_lower = body.lower()
        found_tells = []
        for tell in AI_TELLS:
            if tell in body_lower:
                found_tells.append(tell)

        if found_tells:
            issues.append(f'AI tells detected: {", ".join(found_tells[:3])}')

        # Check content length
        text_content = re.sub(r'<[^>]*>', '', body).strip()
        if len(text_content) < 100:
            issues.append('Minimal content (<100 chars)')

        # Check for meaningful text
        if text_content.count(' ') < 10:
            issues.append('Very low word count')

        return {
            'status': 'PASS' if not issues else ('FAIL' if any('AI tells' in i for i in issues) else 'WARN'),
            'issues': issues if issues else None,
            'word_count': len(text_content.split())
        }

    def validate_a11y(self, html: str, page_name: str) -> Dict:
        """Validate accessibility"""
        issues = []

        # Check lang attribute
        if 'lang=' not in html:
            issues.append('Missing lang attribute on html tag')

        # Check for images with alt text
        images = re.findall(r'<img[^>]*>', html, re.IGNORECASE)
        missing_alt = sum(1 for img in images if 'alt=' not in img.lower() or 'alt=""' in img)
        if missing_alt > 0:
            issues.append(f'{missing_alt} images without alt text')

        # Check heading structure
        headings = re.findall(r'<h([1-6])[^>]*>([^<]*)<\/h\1>', html, re.IGNORECASE)
        if not headings:
            issues.append('No heading structure')

        # Check for form labels
        forms = re.findall(r'<form', html, re.IGNORECASE)
        if forms:
            labels = len(re.findall(r'<label', html, re.IGNORECASE))
            if labels == 0:
                issues.append('Form found without labels')

        return {
            'status': 'PASS' if not issues else 'WARN',
            'issues': issues if issues else None
        }

    def validate_performance(self, html: str, page_name: str) -> Dict:
        """Validate performance aspects"""
        issues = []

        # Check file size
        file_size_kb = len(html) / 1024
        if file_size_kb > 500:
            issues.append(f'Large file size: {file_size_kb:.1f}KB')

        # Check for inline styles (should be minimal)
        inline_styles = len(re.findall(r'style="', html, re.IGNORECASE))
        if inline_styles > 10:
            issues.append(f'Many inline styles: {inline_styles}')

        # Check for external scripts
        scripts = len(re.findall(r'<script[^>]*src=', html, re.IGNORECASE))
        if scripts > 5:
            issues.append(f'Many external scripts: {scripts}')

        # Check for image optimization indicators
        img_tags = re.findall(r'<img[^>]*>', html, re.IGNORECASE)
        missing_dimensions = sum(1 for img in img_tags if 'width=' not in img.lower() or 'height=' not in img.lower())
        if missing_dimensions > 0 and len(img_tags) > 0:
            issues.append(f'{missing_dimensions} images missing width/height')

        return {
            'status': 'PASS' if not issues else 'WARN',
            'issues': issues if issues else None,
            'file_size_kb': round(file_size_kb, 1),
            'script_count': scripts,
            'image_count': len(img_tags)
        }

    def validate_w3c(self, html: str, page_name: str) -> Dict:
        """Check for common W3C validation issues"""
        issues = []

        # Check for doctype
        if not re.search(r'<!DOCTYPE\s+html', html, re.IGNORECASE):
            issues.append('Missing DOCTYPE')

        # Check for meta charset
        if not re.search(r'<meta\s+charset', html, re.IGNORECASE):
            issues.append('Missing charset meta tag')

        # Check for unclosed tags (simple check)
        # Count opening and closing tags for common elements
        for tag in ['div', 'p', 'span', 'a']:
            opens = len(re.findall(f'<{tag}[^>]*>', html, re.IGNORECASE))
            closes = len(re.findall(f'</{tag}>', html, re.IGNORECASE))
            if opens != closes:
                issues.append(f'Unbalanced {tag} tags: {opens} open, {closes} close')
                break

        # Check for deprecated tags
        deprecated = ['font', 'center', 'blink', 'marquee']
        for tag in deprecated:
            if re.search(f'<{tag}[^>]*>', html, re.IGNORECASE):
                issues.append(f'Deprecated tag found: <{tag}>')

        # Check for valid meta tags
        if not re.search(r'<meta\s+name="viewport"', html, re.IGNORECASE):
            issues.append('Missing viewport meta tag')

        return {
            'status': 'PASS' if not issues else 'WARN',
            'issues': issues if issues else None
        }

    def generate_report(self) -> str:
        """Generate comprehensive report"""
        report = []
        report.append("# COMPREHENSIVE VALIDATION REPORT")
        report.append(f"Generated: {datetime.now().isoformat()}")
        report.append("")

        # Summary
        total = len(self.results)
        passed = sum(1 for r in self.results.values() if r.get('overall') == 'PASS')
        failed = sum(1 for r in self.results.values() if r.get('overall') == 'FAIL')
        warned = sum(1 for r in self.results.values() if r.get('overall') == 'WARN')

        report.append("## SUMMARY")
        report.append(f"- Total pages: {total}")
        report.append(f"- Passed: {passed} ({100*passed//total}%)")
        report.append(f"- Warnings: {warned}")
        report.append(f"- Failed: {failed}")
        report.append("")

        # Critical issues
        report.append("## CRITICAL ISSUES (Block deployment)")
        critical = [
            (name, data) for name, data in self.results.items()
            if data.get('overall') == 'FAIL' and data.get('content', {}).get('status') == 'FAIL'
        ]
        if critical:
            for name, data in critical:
                report.append(f"\n### {name}")
                if data.get('content', {}).get('issues'):
                    report.append("**Content Issues:**")
                    for issue in data['content']['issues']:
                        report.append(f"- {issue}")
        else:
            report.append("None found - all pages pass content validation.")
        report.append("")

        # Warnings
        report.append("## WARNINGS (Should fix)")
        warn_pages = [
            (name, data) for name, data in self.results.items()
            if data.get('overall') in ['WARN', 'FAIL']
        ]
        if warn_pages:
            for name, data in warn_pages[:15]:  # Top 15
                report.append(f"\n### {name}")
                if data.get('seo', {}).get('issues'):
                    for issue in data['seo']['issues']:
                        report.append(f"- SEO: {issue}")
                if data.get('a11y', {}).get('issues'):
                    for issue in data['a11y']['issues']:
                        report.append(f"- A11y: {issue}")
                if data.get('w3c', {}).get('issues'):
                    for issue in data['w3c']['issues']:
                        report.append(f"- W3C: {issue}")
                if data.get('performance', {}).get('issues'):
                    for issue in data['performance']['issues']:
                        report.append(f"- Performance: {issue}")
        else:
            report.append("None found.")
        report.append("")

        # Page-by-page results
        report.append("## PAGE-BY-PAGE RESULTS")
        for name in sorted(self.results.keys()):
            data = self.results[name]
            report.append(f"\n### {name}")
            report.append(f"- **Type**: {data.get('type', 'unknown')}")
            report.append(f"- **Overall**: {data.get('overall', 'ERROR')}")

            if 'error' not in data:
                report.append(f"- **SEO**: {data.get('seo', {}).get('status', 'N/A')}")
                report.append(f"- **Brand**: {data.get('brand', {}).get('status', 'N/A')}")
                report.append(f"- **Content**: {data.get('content', {}).get('status', 'N/A')}")
                report.append(f"- **A11y**: {data.get('a11y', {}).get('status', 'N/A')}")
                report.append(f"- **W3C**: {data.get('w3c', {}).get('status', 'N/A')}")
                report.append(f"- **Performance**: {data.get('performance', {}).get('status', 'N/A')} ({data.get('performance', {}).get('file_size_kb', 'N/A')}KB)")

        return "\n".join(report)


def main():
    validator = PageValidator()
    passed, total = validator.validate_all()

    # Generate and save report
    report = validator.generate_report()
    report_path = BASE_PATH / "VALIDATION_REPORT.md"
    report_path.write_text(report)

    print(f"\n✓ Validation complete: {passed}/{total} pages passed")
    print(f"Report saved to: {report_path}")


if __name__ == "__main__":
    main()

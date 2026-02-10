#!/usr/bin/env python3
"""
Self-Healing Content Validator
Comprehensive HTML validator with auto-fix capabilities.
Prevents common issues BEFORE files are written to disk.
"""

import re
import json
from pathlib import Path
from datetime import datetime
from html.parser import HTMLParser
from typing import List, Tuple, Optional


class HTMLStructureParser(HTMLParser):
    """Parse HTML to validate structure and extract metadata."""

    def __init__(self):
        super().__init__()
        self.h1_count = 0
        self.h1_tags = []
        self.heading_levels = []
        self.ids = []
        self.images = []
        self.links = []
        self.meta_tags = {}
        self.unclosed_tags = []
        self.tag_stack = []
        self.has_post_content_wrapper = False

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)

        # Track H1 tags
        if tag == 'h1':
            self.h1_count += 1
            self.h1_tags.append(attrs_dict)

        # Track heading hierarchy
        if tag in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
            level = int(tag[1])
            self.heading_levels.append(level)

        # Track IDs
        if 'id' in attrs_dict:
            self.ids.append(attrs_dict['id'])

        # Track images
        if tag == 'img':
            self.images.append(attrs_dict)

        # Track links
        if tag == 'a':
            self.links.append(attrs_dict)

        # Track meta tags
        if tag == 'meta':
            if 'name' in attrs_dict:
                self.meta_tags[attrs_dict['name']] = attrs_dict.get('content', '')
            if 'property' in attrs_dict:
                self.meta_tags[attrs_dict['property']] = attrs_dict.get('content', '')

        # Check for post-content wrapper
        if tag == 'div' and attrs_dict.get('class') == 'post-content':
            self.has_post_content_wrapper = True

        # Track unclosed tags (simplified)
        if tag not in ['meta', 'link', 'img', 'br', 'hr', 'input']:
            self.tag_stack.append(tag)

    def handle_endtag(self, tag):
        if tag in self.tag_stack:
            self.tag_stack.remove(tag)


class ContentValidator:
    """Self-healing content validator with auto-fix capabilities."""

    def __init__(self, log_dir: Path = None):
        self.log_dir = log_dir or Path(__file__).parent.parent / "logs"
        self.log_dir.mkdir(exist_ok=True)
        self.log_messages = []

    def log(self, category: str, filename: str, message: str):
        """Add log entry."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{category}] {filename} — {message}"
        self.log_messages.append(log_entry)

    def fix_h1_tags(self, content: str, filename: str) -> str:
        """Auto-fix H1 tags: Keep first, convert rest to H2. If 0 H1s, promote first H2."""
        parser = HTMLStructureParser()
        try:
            parser.feed(content)
        except:
            pass

        if parser.h1_count == 0:
            # No H1s found - promote first H2
            if '<h2' in content:
                content = content.replace('<h2', '<h1', 1)
                content = content.replace('</h2>', '</h1>', 1)
                self.log("AUTO-FIX", filename, "Promoted first H2 to H1 (no H1s found)")
        elif parser.h1_count > 1:
            # Multiple H1s - keep first, convert rest
            h1_pattern = re.compile(r'<h1([^>]*)>(.*?)</h1>', re.DOTALL)
            matches = list(h1_pattern.finditer(content))

            if len(matches) > 1:
                # Convert all H1s after first to H2
                for i, match in enumerate(matches):
                    if i > 0:
                        old = match.group(0)
                        new = f'<h2{match.group(1)}>{match.group(2)}</h2>'
                        content = content.replace(old, new, 1)

                self.log("AUTO-FIX", filename, f"Had {parser.h1_count} H1 tags, corrected to 1")

        return content

    def fix_duplicate_ids(self, content: str, filename: str) -> str:
        """Auto-fix duplicate IDs by appending incremental suffix."""
        parser = HTMLStructureParser()
        try:
            parser.feed(content)
        except:
            pass

        # Find duplicates
        seen_ids = {}
        for id_val in parser.ids:
            seen_ids[id_val] = seen_ids.get(id_val, 0) + 1

        duplicates = {k: v for k, v in seen_ids.items() if v > 1}

        if duplicates:
            for dup_id in duplicates:
                # Find all occurrences
                pattern = re.compile(rf'id="{re.escape(dup_id)}"')
                matches = list(pattern.finditer(content))

                # Replace from end to start (preserve original first occurrence)
                for i, match in enumerate(reversed(matches)):
                    if i > 0:  # Skip first occurrence
                        suffix = len(matches) - i
                        old = match.group(0)
                        new = f'id="{dup_id}-{suffix}"'
                        # Replace this specific occurrence
                        start = match.start()
                        end = match.end()
                        content = content[:start] + new + content[end:]

                self.log("AUTO-FIX", filename, f"Fixed duplicate ID: {dup_id} ({seen_ids[dup_id]} occurrences)")

        return content

    def check_template_variables(self, content: str, filename: str) -> bool:
        """Block pages with unrendered template variables."""
        patterns = [
            r'\{\{.*?\}\}',  # Jinja {{ }}
            r'\{%.*?%\}',    # Jinja {% %}
            r'\{#.*?#\}',    # Jinja {# #}
            r'\{variable\}', # Generic {variable}
        ]

        issues = []
        for pattern in patterns:
            matches = re.findall(pattern, content)
            if matches:
                issues.extend(matches)

        if issues:
            self.log("BLOCKED", filename, f"Unrendered template variables: {', '.join(set(issues))}")
            return False

        return True

    def fix_meta_tags(self, content: str, filename: str) -> str:
        """Auto-generate missing meta tags."""
        parser = HTMLStructureParser()
        try:
            parser.feed(content)
        except:
            pass

        fixes = []

        # Extract title
        title_match = re.search(r'<title>(.*?)</title>', content)
        title = title_match.group(1) if title_match else "Carnivore Weekly"

        # Check for missing description
        if 'description' not in parser.meta_tags or not parser.meta_tags['description']:
            # Try to extract from first paragraph
            p_match = re.search(r'<p[^>]*>(.*?)</p>', content, re.DOTALL)
            if p_match:
                desc = re.sub(r'<[^>]+>', '', p_match.group(1))[:160]
                desc = desc.strip()

                # Insert or fix description
                if '<meta name="description"' in content:
                    content = re.sub(
                        r'<meta name="description" content="[^"]*"',
                        f'<meta name="description" content="{desc}"',
                        content
                    )
                else:
                    # Add after charset
                    content = content.replace(
                        '<meta charset="UTF-8">',
                        f'<meta charset="UTF-8">\n    <meta name="description" content="{desc}">'
                    )
                fixes.append("description")

        # Check meta description length (should be 150-160 chars)
        if 'description' in parser.meta_tags and parser.meta_tags['description']:
            current_desc = parser.meta_tags['description']
            desc_len = len(current_desc)

            if desc_len < 150 or desc_len > 160:
                # Try to adjust length
                if desc_len < 150:
                    # Too short - try to extract more from first paragraph
                    p_match = re.search(r'<p[^>]*>(.*?)</p>', content, re.DOTALL)
                    if p_match:
                        full_text = re.sub(r'<[^>]+>', '', p_match.group(1)).strip()
                        # Take first 155 chars for optimal length
                        new_desc = full_text[:155].strip()
                        if len(new_desc) >= 150:
                            content = re.sub(
                                r'<meta name="description" content="[^"]*"',
                                f'<meta name="description" content="{new_desc}"',
                                content
                            )
                            fixes.append(f"meta description length ({desc_len} → {len(new_desc)} chars)")
                elif desc_len > 160:
                    # Too long - truncate to 160
                    new_desc = current_desc[:160].strip()
                    content = re.sub(
                        r'<meta name="description" content="[^"]*"',
                        f'<meta name="description" content="{new_desc}"',
                        content
                    )
                    fixes.append(f"meta description length ({desc_len} → {len(new_desc)} chars)")

        # Check for missing canonical
        if 'canonical' not in content:
            # Extract slug from filename
            slug = Path(filename).stem
            canonical = f'<link rel="canonical" href="https://carnivoreweekly.com/blog/{slug}.html">'

            # Insert after last meta tag
            content = re.sub(
                r'(</head>)',
                f'    {canonical}\n\\1',
                content,
                count=1
            )
            fixes.append("canonical")

        if fixes:
            self.log("AUTO-FIX", filename, f"Added missing meta tags: {', '.join(fixes)}")

        return content

    def fix_heading_hierarchy(self, content: str, filename: str) -> str:
        """Fix skipped heading levels (h1→h3 becomes h1→h2→h3)."""
        parser = HTMLStructureParser()
        try:
            parser.feed(content)
        except:
            pass

        if not parser.heading_levels:
            return content

        # Check for skipped levels
        fixes = []
        for i in range(len(parser.heading_levels) - 1):
            current = parser.heading_levels[i]
            next_level = parser.heading_levels[i + 1]

            # If jump > 1, it's a skip
            if next_level - current > 1:
                # Downgrade the next heading
                wrong_tag = f'h{next_level}'
                correct_tag = f'h{current + 1}'

                # Find first occurrence after position i
                pattern = re.compile(f'<{wrong_tag}([^>]*)>(.*?)</{wrong_tag}>', re.DOTALL)
                match = pattern.search(content)

                if match:
                    old = match.group(0)
                    new = f'<{correct_tag}{match.group(1)}>{match.group(2)}</{correct_tag}>'
                    content = content.replace(old, new, 1)
                    fixes.append(f"{wrong_tag}→{correct_tag}")

        if fixes:
            self.log("AUTO-FIX", filename, f"Fixed heading hierarchy: {', '.join(fixes)}")

        return content

    def fix_images(self, content: str, filename: str) -> str:
        """Add missing alt attributes to images."""
        parser = HTMLStructureParser()
        try:
            parser.feed(content)
        except:
            pass

        fixes = 0
        for img in parser.images:
            if 'alt' not in img or not img['alt']:
                src = img.get('src', '')
                # Generate alt from filename
                alt = Path(src).stem.replace('-', ' ').replace('_', ' ').title()

                # Find and replace this specific img tag
                old_pattern = f'<img[^>]*src="{re.escape(src)}"[^>]*>'
                matches = re.finditer(old_pattern, content)

                for match in matches:
                    old = match.group(0)
                    if 'alt=' not in old:
                        # Add alt attribute
                        new = old.replace('<img', f'<img alt="{alt}"')
                        content = content.replace(old, new, 1)
                        fixes += 1

        if fixes:
            self.log("AUTO-FIX", filename, f"Added alt text to {fixes} images")

        return content

    def fix_external_links(self, content: str, filename: str) -> str:
        """Add rel attributes to external links."""
        parser = HTMLStructureParser()
        try:
            parser.feed(content)
        except:
            pass

        fixes = 0
        for link in parser.links:
            href = link.get('href', '')

            # Check if external
            if href.startswith('http') and 'carnivoreweekly.com' not in href:
                # Check if missing rel
                if 'rel' not in link or 'noopener' not in link.get('rel', ''):
                    # Find and fix
                    old_pattern = f'<a[^>]*href="{re.escape(href)}"[^>]*>'
                    matches = re.finditer(old_pattern, content)

                    for match in matches:
                        old = match.group(0)
                        if 'rel=' not in old:
                            new = old.replace('<a', '<a rel="noopener noreferrer"')
                            content = content.replace(old, new, 1)
                            fixes += 1

        if fixes:
            self.log("AUTO-FIX", filename, f"Added rel attributes to {fixes} external links")

        return content

    def validate_minimum_content(self, content: str, filename: str) -> bool:
        """
        Validate that blog post has minimum word count.
        Block publication if article body has less than 200 words.
        """
        # Only validate blog posts
        if 'blog/' not in filename:
            return True

        # Extract content from post-content div (exclude nav, footer, template)
        match = re.search(r'<div class="post-content">(.*?)</div>', content, re.DOTALL)

        if not match:
            # No post-content wrapper found - this is a structural issue
            # but not a word count issue, let other validators handle it
            return True

        article_content = match.group(1)

        # Strip HTML tags to count actual words
        text_only = re.sub(r'<[^>]+>', ' ', article_content)
        text_only = re.sub(r'\s+', ' ', text_only).strip()

        word_count = len(text_only.split())

        if word_count < 200:
            self.log("BLOCKED", filename,
                    f"Insufficient content ({word_count} words). Minimum 200 words required for blog posts.")
            return False

        return True

    def validate_json_ld(self, content: str, filename: str) -> bool:
        """Verify JSON-LD schema is valid."""
        json_ld_pattern = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.DOTALL)
        matches = json_ld_pattern.findall(content)

        for i, match in enumerate(matches):
            try:
                data = json.loads(match)

                # Check required fields for Article schema
                if data.get('@type') == 'Article':
                    required = ['headline', 'author', 'publisher', 'datePublished']
                    missing = [f for f in required if f not in data]

                    if missing:
                        self.log("BLOCKED", filename, f"JSON-LD missing required fields: {', '.join(missing)}")
                        return False

            except json.JSONDecodeError as e:
                self.log("BLOCKED", filename, f"Invalid JSON-LD #{i+1}: {str(e)}")
                return False

        return True

    def fix_links_in_headings(self, content: str, filename: str) -> str:
        """
        CRITICAL: Remove links from headings (h1-h4).
        Links in headings break SEO and accessibility.
        """
        import re

        heading_pattern = r'<(h[1-4])([^>]*)>(.*?)</\1>'

        def remove_link_from_heading(match):
            tag = match.group(1)
            attrs = match.group(2)
            inner_content = match.group(3)

            # Check if heading contains a link
            if '<a' in inner_content:
                # Extract just the text from the link
                link_text = re.sub(r'<a[^>]*>(.*?)</a>', r'\1', inner_content)
                if link_text != inner_content:
                    self.log("AUTO-FIX", filename, f"Removed link from <{tag}> heading, kept text")
                return f'<{tag}{attrs}>{link_text}</{tag}>'

            return match.group(0)

        content = re.sub(heading_pattern, remove_link_from_heading, content, flags=re.DOTALL)

        return content

    def fix_doubled_paths(self, content: str, filename: str) -> str:
        """
        Auto-fix doubled paths in href attributes.

        Common patterns:
        - /wiki/#/wiki/# → /wiki/#
        - /blog//blog/ → /blog/
        - /css//css/ → /css/
        """
        import re

        # Pattern 1: /wiki/#/wiki/# → /wiki/#
        wiki_pattern = r'href="(/wiki/#)/wiki/#([^"]*)"'
        wiki_matches = re.findall(wiki_pattern, content)
        if wiki_matches:
            content = re.sub(wiki_pattern, r'href="/wiki/#\2"', content)
            for match in wiki_matches:
                self.log("AUTO-FIX", filename, f"Fixed doubled wiki path: /wiki/#/wiki/#{match[1]} → /wiki/#{match[1]}")

        # Pattern 2: /blog//blog/ → /blog/
        blog_pattern = r'href="(/blog/)/blog/([^"]*)"'
        blog_matches = re.findall(blog_pattern, content)
        if blog_matches:
            content = re.sub(blog_pattern, r'href="/blog/\2"', content)
            for match in blog_matches:
                self.log("AUTO-FIX", filename, f"Fixed doubled blog path: /blog//blog/{match[1]} → /blog/{match[1]}")

        # Pattern 3: Double slashes in any path (but NOT protocol ://)
        double_slash_pattern = r'href="([^"]*?[^:])//+([^"]*)"'
        double_slash_matches = re.findall(double_slash_pattern, content)
        if double_slash_matches:
            content = re.sub(double_slash_pattern, r'href="\1/\2"', content)
            for match in double_slash_matches:
                self.log("AUTO-FIX", filename, f"Fixed double slash: {match[0]}//{match[1]} → {match[0]}/{match[1]}")

        return content

    def check_internal_links(self, content: str, filename: str) -> None:
        """
        WARNING: Check if blog post has internal links.
        Not blocking, but logs a warning if zero internal links found.
        """
        import re

        # Skip non-blog files
        if '/blog/' not in filename:
            return

        # Count internal blog links
        internal_links = re.findall(r'href="/blog/[^"]+\.html"', content)
        wiki_links = re.findall(r'href="/wiki/#[^"]+"', content)

        total_internal = len(internal_links) + len(wiki_links)

        if total_internal == 0:
            self.log("WARNING", filename, "No internal links — consider adding 2-3 links to related content")
        elif total_internal < 2:
            self.log("WARNING", filename, f"Only {total_internal} internal link — consider adding 1-2 more")

    def validate_blog_path(self, filename: str) -> str:
        """
        Validate and correct blog post output path.

        Prevents writing to wrong directories like blog/blog/ or blog/
        All blog posts should go to public/blog/

        Returns: Corrected filename with proper path
        """
        # Normalize path
        filepath = Path(filename)

        # Extract just the filename (no directory)
        just_filename = filepath.name

        # Check if path contains blog directory patterns
        path_str = str(filepath)

        # Detect wrong patterns
        if "blog/blog/" in path_str:
            self.log("WARNING", filename, f"Wrong output directory detected: {path_str}")
            self.log("WARNING", filename, f"Corrected to: public/blog/{just_filename}")
            return f"public/blog/{just_filename}"

        if path_str.startswith("blog/") and not path_str.startswith("public/blog/"):
            self.log("WARNING", filename, f"Wrong output directory detected: {path_str}")
            self.log("WARNING", filename, f"Corrected to: public/blog/{just_filename}")
            return f"public/blog/{just_filename}"

        # Path is correct - return as is
        return filename

    def validate_and_fix(self, content: str, filename: str) -> Tuple[Optional[str], List[str], str]:
        """
        Validates and auto-fixes HTML content.

        Returns:
            (fixed_content, log_messages, corrected_filename) if content is fixable
            (None, log_messages, corrected_filename) if content must be blocked

        Note: Always use the returned corrected_filename when writing the file
        """
        self.log_messages = []

        # Stage 0: Validate output path (prevent blog/blog/ bug)
        corrected_filename = self.validate_blog_path(filename)
        if corrected_filename != filename:
            filename = corrected_filename

        # Stage 1: Check blocking issues (template variables, JSON-LD, minimum content)
        if not self.check_template_variables(content, filename):
            return None, self.log_messages, corrected_filename

        if not self.validate_json_ld(content, filename):
            return None, self.log_messages, corrected_filename

        if not self.validate_minimum_content(content, filename):
            return None, self.log_messages, corrected_filename

        # Stage 2: Auto-fix issues
        content = self.fix_h1_tags(content, filename)
        content = self.fix_duplicate_ids(content, filename)
        content = self.fix_meta_tags(content, filename)
        content = self.fix_heading_hierarchy(content, filename)
        content = self.fix_images(content, filename)
        content = self.fix_external_links(content, filename)
        content = self.fix_links_in_headings(content, filename)
        content = self.fix_doubled_paths(content, filename)
        self.check_internal_links(content, filename)

        # Stage 3: Summary
        if not self.log_messages:
            self.log("SUMMARY", filename, "No issues found")
        else:
            fixes = len([m for m in self.log_messages if "[AUTO-FIX]" in m])
            blocks = len([m for m in self.log_messages if "[BLOCKED]" in m])
            self.log("SUMMARY", filename, f"{fixes} auto-fixes applied, {blocks} blocking issues")

        return content, self.log_messages, corrected_filename

    def write_log(self):
        """Write log messages to file."""
        if not self.log_messages:
            return

        # Create log file with date
        log_file = self.log_dir / f"validation_{datetime.now().strftime('%Y-%m-%d')}.log"

        with open(log_file, 'a') as f:
            for msg in self.log_messages:
                f.write(msg + '\n')

        # Rotate old logs (keep last 30 days)
        for old_log in self.log_dir.glob("validation_*.log"):
            age = datetime.now() - datetime.fromtimestamp(old_log.stat().st_mtime)
            if age.days > 30:
                old_log.unlink()

    def print_summary(self):
        """Print validation summary to console."""
        if not self.log_messages:
            return

        print("\n" + "=" * 60)
        print("CONTENT VALIDATION REPORT")
        print("=" * 60)

        for msg in self.log_messages:
            # Color-code by category
            if "[AUTO-FIX]" in msg:
                print(f"✅ {msg}")
            elif "[BLOCKED]" in msg:
                print(f"❌ {msg}")
            elif "[SUMMARY]" in msg:
                print(f"📊 {msg}")
            else:
                print(f"ℹ️  {msg}")

        print("=" * 60 + "\n")


# Convenience function for external use
def validate_and_fix(content: str, filename: str) -> Tuple[Optional[str], List[str], str]:
    """
    Validates and auto-fixes HTML content.

    Returns:
        (fixed_content, log_messages, corrected_filename)

    Returns:
        (fixed_content, log_messages) if content is fixable
        (None, log_messages) if content must be blocked
    """
    validator = ContentValidator()
    return validator.validate_and_fix(content, filename)


if __name__ == "__main__":
    # Test the validator
    print("Content Validator Module - Ready for integration")
    print("Import with: from content_validator import validate_and_fix")

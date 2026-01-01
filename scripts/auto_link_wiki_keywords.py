#!/usr/bin/env python3
"""
Automatic wiki keyword linking system.

This module provides functions to automatically detect health/science keywords
in HTML content and insert links to relevant wiki pages. Features include:
- Keyword detection with regex patterns
- XSS prevention and HTML safety
- Smart link placement (no double-linking, respects word boundaries)
- Frequency limiting (prevents over-linking)

Usage:
    from auto_link_wiki_keywords import insert_wiki_links
    html = "<p>Ketosis is great for weight stall management.</p>"
    linked_html = insert_wiki_links(html)
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from html import escape, unescape


class WikiKeywordLinker:
    """Smart wiki keyword linking engine with safety features."""

    def __init__(self, keywords_json_path: str):
        """
        Initialize the linker with keyword mappings.

        Args:
            keywords_json_path: Path to wiki-keywords.json
        """
        self.keywords_json_path = keywords_json_path
        self.keyword_map = {}
        self.regex_patterns = {}
        self.max_links_per_1000_words = 5
        self.min_keyword_length = 3

        # Load keyword data
        self._load_keywords()

    def _load_keywords(self):
        """Load keywords from JSON file."""
        with open(self.keywords_json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        self.keyword_map = data.get('keyword_map', {})
        self.regex_patterns = data.get('regex_patterns', {})
        metadata = data.get('metadata', {})
        self.max_links_per_1000_words = metadata.get('max_links_per_1000_words', 5)
        self.min_keyword_length = metadata.get('min_keyword_length', 3)

    def detect_keywords(self, text: str) -> List[Tuple[str, str, int, int]]:
        """
        Detect keywords in plain text.

        Args:
            text: Plain text to search for keywords

        Returns:
            List of tuples: (keyword, url, start_pos, end_pos)
        """
        matches = []

        # Search for keywords by length (longest first) to avoid partial matches
        for keyword in sorted(self.keyword_map.keys(), key=len, reverse=True):
            if len(keyword) < self.min_keyword_length:
                continue

            # Case-insensitive search with word boundaries
            # Handle phrases and single words differently
            if ' ' in keyword:
                # For phrases, use simpler word boundary checking
                pattern = re.escape(keyword)
                for match in re.finditer(pattern, text, re.IGNORECASE):
                    start, end = match.span()
                    matches.append((keyword, self.keyword_map[keyword], start, end))
            else:
                # For single words, use word boundaries
                pattern = r'\b' + re.escape(keyword) + r'\b'
                for match in re.finditer(pattern, text, re.IGNORECASE):
                    start, end = match.span()
                    matches.append((keyword, self.keyword_map[keyword], start, end))

        # Sort by position and remove overlapping matches
        matches.sort(key=lambda x: x[2])
        cleaned = []
        last_end = 0

        for keyword, url, start, end in matches:
            if start >= last_end:
                cleaned.append((keyword, url, start, end))
                last_end = end

        return cleaned

    def _is_in_html_tag(self, html: str, position: int) -> bool:
        """
        Check if a position is inside an HTML tag.

        Args:
            html: HTML string
            position: Character position to check

        Returns:
            True if position is inside a tag
        """
        # Count opening and closing angle brackets before position
        before = html[:position]
        open_tags = before.count('<')
        close_tags = before.count('>')

        return open_tags > close_tags

    def _is_in_existing_link(self, html: str, position: int) -> bool:
        """
        Check if a position is already inside an <a> tag.

        Args:
            html: HTML string
            position: Character position to check

        Returns:
            True if position is inside an <a> tag
        """
        # Look backwards for proper <a> tag (anchor tag, not part of other tag like <article>)
        before = html[:position]

        # Find all <a> opening tags - must be followed by space, > or newline
        last_open = -1
        for match in re.finditer(r'<a(?:\s|>|$)', before):
            last_open = match.start()

        # Find all </a> closing tags
        last_close = -1
        for match in re.finditer(r'</a\s*>', before):
            last_close = match.start()

        if last_open == -1:
            return False

        # If we found an opening <a tag after the last closing </a>, we're inside
        return last_close < last_open

    def _extract_text_content(self, html: str) -> str:
        """
        Extract text content from HTML, preserving text-only regions.

        This is used to match keywords only in visible text, not in tags.
        Returns the original HTML (not just text) so position matching works.

        Args:
            html: HTML string

        Returns:
            HTML with script/style removed (position-safe)
        """
        # Remove script, style, and HTML comments to avoid matching in code
        text = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
        text = re.sub(r'<!--.*?-->', '', text, flags=re.DOTALL)

        return text

    def insert_wiki_links(self, html: str, max_links: Optional[int] = None) -> str:
        """
        Insert wiki links into HTML content.

        Features:
        - Skips existing links
        - Prevents over-linking
        - Respects HTML structure
        - Escapes special characters

        Args:
            html: HTML content
            max_links: Maximum number of links to insert (None = use default)

        Returns:
            HTML with wiki links inserted
        """
        if not html or max_links == 0:
            return html

        # Extract text content for keyword detection
        text_content = self._extract_text_content(html)

        # Detect keywords in text content
        matches = self.detect_keywords(text_content)

        if not matches:
            return html

        # Limit number of links
        if max_links is None:
            # Calculate based on word count
            word_count = len(text_content.split())
            max_links = max(1, (word_count // 1000) * self.max_links_per_1000_words)

        # Process matches in reverse order to avoid position offset issues
        matches = matches[:max_links]
        matches.sort(key=lambda x: x[2], reverse=True)

        result = html

        for keyword, url, start, end in matches:
            # Skip if already in a tag or link
            if self._is_in_html_tag(result, start):
                continue

            if self._is_in_existing_link(result, start):
                continue

            # Get the matched text from result, find it case-insensitively
            # Look for the keyword near the expected position
            search_start = max(0, start - 50)
            search_end = min(len(result), end + 50)
            search_text = result[search_start:search_end]

            # Find keyword in search text (case-insensitive)
            pattern = re.compile(r'\b' + re.escape(keyword) + r'\b', re.IGNORECASE)
            match = pattern.search(search_text)

            if match:
                # Calculate actual position in full result
                real_start = search_start + match.start()
                real_end = search_start + match.end()
                matched_text = result[real_start:real_end]

                # Create link
                link = f'<a href="{escape(url)}" class="wiki-link" data-wiki-page="{escape(url)}">{escape(matched_text)}</a>'

                # Replace in result
                result = result[:real_start] + link + result[real_end:]

        return result

    def sanitize_links(self, html: str) -> str:
        """
        Sanitize wiki links to prevent XSS and malformed HTML.

        Args:
            html: HTML with wiki links

        Returns:
            Sanitized HTML
        """
        # Remove any dangerous attributes from wiki-link anchors
        # Allow only: href, class, data-wiki-page
        pattern = r'<a\s+([^>]*?)class="wiki-link"([^>]*?)>'

        def replace_attrs(match):
            attrs = match.group(1) + match.group(2)
            # Extract href
            href_match = re.search(r'href="([^"]*)"', attrs)
            href = href_match.group(1) if href_match else '#'

            # Verify href is safe (relative or wiki.html)
            if not (href.startswith('wiki.html') or href.startswith('/')):
                href = '#'

            return f'<a href="{escape(href)}" class="wiki-link">'

        return re.sub(pattern, replace_attrs, html)


def load_wiki_keywords(json_path: str = None) -> Dict[str, str]:
    """
    Load wiki keyword mappings from JSON.

    Args:
        json_path: Path to wiki-keywords.json (uses default if None)

    Returns:
        Dictionary mapping keywords to wiki URLs
    """
    if json_path is None:
        project_root = Path(__file__).parent.parent
        json_path = str(project_root / 'data' / 'wiki-keywords.json')

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    return data.get('keyword_map', {})


def insert_wiki_links(html: str, keywords_json_path: str = None, max_links: int = None) -> str:
    """
    Main function to insert wiki links into HTML content.

    This is the primary API for the auto-linking feature.

    Args:
        html: HTML content to process
        keywords_json_path: Path to wiki-keywords.json (uses default if None)
        max_links: Maximum number of links to insert (None = auto-calculate)

    Returns:
        HTML with wiki links inserted

    Example:
        >>> html = '<p>Ketosis helps with weight stall recovery.</p>'
        >>> linked = insert_wiki_links(html)
        >>> '<a href="wiki.html#ketosis" class="wiki-link">Ketosis</a>' in linked
        True
    """
    if keywords_json_path is None:
        project_root = Path(__file__).parent.parent
        keywords_json_path = str(project_root / 'data' / 'wiki-keywords.json')

    linker = WikiKeywordLinker(keywords_json_path)
    linked_html = linker.insert_wiki_links(html, max_links)
    sanitized_html = linker.sanitize_links(linked_html)

    return sanitized_html


def main():
    """Demo usage of the auto-linking functions."""
    project_root = Path(__file__).parent.parent
    json_path = project_root / 'data' / 'wiki-keywords.json'

    if not json_path.exists():
        print(f"Error: {json_path} not found. Run extract_wiki_keywords.py first.")
        return False

    # Sample content
    html_content = """
    <article>
        <h1>Getting Started with Carnivore</h1>
        <p>Ketosis is a metabolic state where your body burns fat for energy.
           Many people experience weight stall when starting carnivore diet.
           Electrolytes are crucial to avoid leg cramps.</p>
        <p>Some say dairy might cause problems, but salt is actually beneficial.
           Coffee and alcohol have interesting interactions with the diet.</p>
    </article>
    """

    print("Sample HTML Input:")
    print(html_content)
    print("\n" + "=" * 80 + "\n")

    # Process with auto-linking
    linked_html = insert_wiki_links(html_content, str(json_path), max_links=10)

    print("HTML Output (with wiki links):")
    print(linked_html)
    print("\n" + "=" * 80 + "\n")

    # Count inserted links
    link_count = linked_html.count('class="wiki-link"')
    print(f"Links inserted: {link_count}")

    return True


if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)

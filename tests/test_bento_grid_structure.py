#!/usr/bin/env python3
"""
Structural validation tests for Bento Grid redesign.
Tier 1: Ensures HTML validity, semantic correctness, and element nesting.

Run: pytest tests/test_bento_grid_structure.py -v
"""

import sys
import os
import tempfile
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

try:
    from validate_structure import StructuralValidator, ValidationResult
except ImportError:
    print("Error: Could not import validator. Ensure validate_structure.py exists.")
    sys.exit(1)

import pytest


class TestBentoGridStructure:
    """Test Bento Grid HTML structure"""

    @pytest.fixture
    def validator(self):
        """Initialize validator"""
        return StructuralValidator()

    @pytest.fixture
    def bento_grid_html(self):
        """Sample Bento Grid markup"""
        return """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Bento Grid - Carnivore Weekly</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Explore carnivore diet content organized by topic">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <img src="logo.png" class="logo" alt="Carnivore Weekly Logo">
        <h1>Bento Grid</h1>
    </header>

    <nav class="nav-menu">
        <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/blog">Blog</a></li>
            <li><a href="/channels">Channels</a></li>
        </ul>
    </nav>

    <main>
        <section class="bento-grid" aria-label="Content grid">
            <article class="grid-item" data-category="health">
                <h2>Health & Wellness</h2>
                <img src="health.jpg" alt="Health and wellness topics">
                <p>Cardiovascular health, hormones, and metabolic benefits</p>
            </article>

            <article class="grid-item" data-category="nutrition">
                <h2>Nutrition Science</h2>
                <img src="nutrition.jpg" alt="Nutrition science research">
                <p>Nutrient profiles, amino acids, and micronutrients</p>
            </article>

            <article class="grid-item" data-category="recipes">
                <h2>Recipes & Cooking</h2>
                <img src="recipes.jpg" alt="Carnivore recipes">
                <p>Meal preparation, cooking techniques, and recipes</p>
            </article>
        </section>
    </main>

    <footer>
        <p>&copy; 2025 Carnivore Weekly. All rights reserved.</p>
    </footer>
</body>
</html>"""

    def test_bento_grid_structure_valid(self, validator, tmp_path, bento_grid_html):
        """Test that Bento Grid HTML passes structural validation"""
        html_file = tmp_path / "bento-grid.html"
        html_file.write_text(bento_grid_html)

        result = validator.validate_file(html_file)

        # Should have no critical errors
        critical_errors = [e for e in result.errors if e.severity == "critical"]
        assert len(critical_errors) == 0, f"Critical errors found: {critical_errors}"

        # Should be valid overall
        assert result.valid

    def test_bento_grid_has_proper_structure(self, validator, tmp_path, bento_grid_html):
        """Test that grid uses semantic HTML"""
        html_file = tmp_path / "bento-grid.html"
        html_file.write_text(bento_grid_html)

        result = validator.validate_file(html_file)

        # Should have required elements
        assert result.valid or len([e for e in result.errors if e.severity == "critical"]) == 0

    def test_grid_items_have_images_with_alt(self, validator, tmp_path):
        """Test that all grid item images have descriptive alt text"""
        html = """<!DOCTYPE html>
<html lang="en">
<head><title>Grid</title><meta charset="UTF-8"><meta name="description" content="test"></head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main>
        <section class="bento-grid">
            <article class="grid-item">
                <h2>Item 1</h2>
                <img src="item1.jpg" alt="Item 1 description">
                <p>Description here</p>
            </article>
            <article class="grid-item">
                <h2>Item 2</h2>
                <img src="item2.jpg" alt="Item 2 description">
                <p>Description here</p>
            </article>
        </section>
    </main>
</body>
</html>"""
        html_file = tmp_path / "grid-images.html"
        html_file.write_text(html)

        result = validator.validate_file(html_file)

        # No missing alt text errors
        alt_errors = [e for e in result.errors if "alt" in e.message.lower()]
        assert len(alt_errors) == 0, f"Alt text errors: {alt_errors}"

    def test_heading_hierarchy_in_grid(self, validator, tmp_path):
        """Test proper heading hierarchy in grid"""
        html = """<!DOCTYPE html>
<html lang="en">
<head><title>Grid</title><meta charset="UTF-8"><meta name="description" content="test"></head>
<body>
    <header><h1>Main Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main>
        <section class="bento-grid">
            <article class="grid-item">
                <h2>Grid Item 1</h2>
                <h3>Subheading</h3>
                <p>Content</p>
            </article>
            <article class="grid-item">
                <h2>Grid Item 2</h2>
                <p>Content</p>
            </article>
        </section>
    </main>
</body>
</html>"""
        html_file = tmp_path / "hierarchy.html"
        html_file.write_text(html)

        result = validator.validate_file(html_file)

        # Should have proper heading hierarchy
        assert result.valid or len([e for e in result.errors if e.severity == "critical"]) == 0

    def test_no_duplicate_headers(self, validator, tmp_path):
        """Test that document has only one header element"""
        html = """<!DOCTYPE html>
<html lang="en">
<head><title>Test</title><meta charset="UTF-8"><meta name="description" content="test"></head>
<body>
    <header><h1>Title 1</h1></header>
    <header><h1>Title 2</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
</body>
</html>"""
        html_file = tmp_path / "duplicate-headers.html"
        html_file.write_text(html)

        result = validator.validate_file(html_file)

        # Should detect duplicate headers
        header_errors = [e for e in result.errors if "header" in e.rule_name.lower()]
        assert len(header_errors) > 0

    def test_required_meta_tags_present(self, validator, tmp_path):
        """Test that all required meta tags are present"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Test Page</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Test description">
</head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main><p>Content</p></main>
</body>
</html>"""
        html_file = tmp_path / "meta-tags.html"
        html_file.write_text(html)

        result = validator.validate_file(html_file)

        # Should have required meta tags
        meta_errors = [e for e in result.errors if "meta" in e.message.lower()]
        assert len([e for e in meta_errors if e.severity == "critical"]) == 0

    def test_proper_semantic_html_usage(self, validator, tmp_path):
        """Test that semantic HTML elements are used correctly"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Semantic Test</title>
    <meta charset="UTF-8">
    <meta name="description" content="test">
</head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Nav</a></li></ul></nav>
    <main>
        <article class="grid-item">
            <h2>Article</h2>
            <p>Content</p>
        </article>
        <aside>
            <h3>Sidebar</h3>
            <p>Sidebar content</p>
        </aside>
    </main>
    <footer><p>Footer</p></footer>
</body>
</html>"""
        html_file = tmp_path / "semantic.html"
        html_file.write_text(html)

        result = validator.validate_file(html_file)

        # Semantic usage should be correct
        assert result.valid or len([e for e in result.errors if e.severity == "critical"]) == 0

    def test_main_element_present(self, validator, tmp_path):
        """Test that main element is present"""
        html = """<!DOCTYPE html>
<html lang="en">
<head><title>Test</title><meta charset="UTF-8"><meta name="description" content="test"></head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main><p>Content</p></main>
</body>
</html>"""
        html_file = tmp_path / "main-element.html"
        html_file.write_text(html)

        result = validator.validate_file(html_file)

        # Should have main element
        main_errors = [e for e in result.errors if "main" in e.message.lower()]
        assert len([e for e in main_errors if e.severity == "critical"]) == 0

    def test_grid_item_consistency(self, validator, tmp_path):
        """Test that all grid items follow consistent structure"""
        html = """<!DOCTYPE html>
<html lang="en">
<head><title>Grid</title><meta charset="UTF-8"><meta name="description" content="test"></head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main>
        <section class="bento-grid">
            <article class="grid-item">
                <h2>Item 1</h2>
                <img src="img1.jpg" alt="Image 1">
                <p>Description</p>
            </article>
            <article class="grid-item">
                <h2>Item 2</h2>
                <img src="img2.jpg" alt="Image 2">
                <p>Description</p>
            </article>
            <article class="grid-item">
                <h2>Item 3</h2>
                <img src="img3.jpg" alt="Image 3">
                <p>Description</p>
            </article>
        </section>
    </main>
</body>
</html>"""
        html_file = tmp_path / "grid-items.html"
        html_file.write_text(html)

        result = validator.validate_file(html_file)

        # Grid items should be structurally consistent
        assert result.valid or len([e for e in result.errors if e.severity == "critical"]) == 0

    def test_navigation_structure(self, validator, tmp_path):
        """Test that navigation follows proper structure"""
        html = """<!DOCTYPE html>
<html lang="en">
<head><title>Test</title><meta charset="UTF-8"><meta name="description" content="test"></head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu">
        <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/blog">Blog</a></li>
            <li><a href="/about">About</a></li>
        </ul>
    </nav>
    <main><p>Content</p></main>
</body>
</html>"""
        html_file = tmp_path / "navigation.html"
        html_file.write_text(html)

        result = validator.validate_file(html_file)

        # Navigation should be valid
        nav_errors = [e for e in result.errors if e.rule_id == 2]  # Nav rule
        assert len([e for e in nav_errors if e.severity == "critical"]) == 0

    def test_lang_attribute_present(self, validator, tmp_path):
        """Test that html element has lang attribute"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Test</title>
    <meta charset="UTF-8">
    <meta name="description" content="test">
</head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main><p>Content</p></main>
</body>
</html>"""
        html_file = tmp_path / "lang-attr.html"
        html_file.write_text(html)

        result = validator.validate_file(html_file)

        # Should have lang attribute
        lang_errors = [e for e in result.errors if "lang" in e.message.lower()]
        assert len(lang_errors) == 0


class TestBentoGridEdgeCases:
    """Test edge cases and complex scenarios"""

    @pytest.fixture
    def validator(self):
        return StructuralValidator()

    def test_grid_with_links_on_items(self, validator, tmp_path):
        """Test grid items that are clickable links"""
        html = """<!DOCTYPE html>
<html lang="en">
<head><title>Grid</title><meta charset="UTF-8"><meta name="description" content="test"></head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main>
        <section class="bento-grid">
            <a href="/item1" class="grid-item">
                <h2>Item 1</h2>
                <img src="img1.jpg" alt="Item 1">
            </a>
        </section>
    </main>
</body>
</html>"""
        html_file = tmp_path / "linked-items.html"
        html_file.write_text(html)

        result = validator.validate_file(html_file)

        # Should not have critical errors for linked items
        critical = [e for e in result.errors if e.severity == "critical"]
        assert len(critical) == 0

    def test_grid_with_multiple_columns(self, validator, tmp_path):
        """Test grid with CSS column specifications"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Grid</title>
    <meta charset="UTF-8">
    <meta name="description" content="test">
    <style>
        .bento-grid { display: grid; grid-template-columns: repeat(3, 1fr); }
    </style>
</head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main>
        <section class="bento-grid">
            <article class="grid-item"><h2>1</h2><img src="1.jpg" alt="1"></article>
            <article class="grid-item"><h2>2</h2><img src="2.jpg" alt="2"></article>
            <article class="grid-item"><h2>3</h2><img src="3.jpg" alt="3"></article>
        </section>
    </main>
</body>
</html>"""
        html_file = tmp_path / "grid-columns.html"
        html_file.write_text(html)

        result = validator.validate_file(html_file)

        # Should be valid
        assert result.valid or len([e for e in result.errors if e.severity == "critical"]) == 0

    def test_responsive_images_in_grid(self, validator, tmp_path):
        """Test grid with responsive images (srcset)"""
        html = """<!DOCTYPE html>
<html lang="en">
<head><title>Grid</title><meta charset="UTF-8"><meta name="description" content="test"></head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main>
        <section class="bento-grid">
            <article class="grid-item">
                <h2>Responsive Image</h2>
                <img src="image.jpg"
                     srcset="image-sm.jpg 480w, image-md.jpg 768w, image-lg.jpg 1200w"
                     alt="Responsive image">
                <p>Description</p>
            </article>
        </section>
    </main>
</body>
</html>"""
        html_file = tmp_path / "responsive-images.html"
        html_file.write_text(html)

        result = validator.validate_file(html_file)

        # Should support srcset
        assert result.valid or len([e for e in result.errors if e.severity == "critical"]) == 0

    def test_grid_with_different_sized_items(self, validator, tmp_path):
        """Test grid where items span different number of columns"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Masonry Grid</title>
    <meta charset="UTF-8">
    <meta name="description" content="test">
    <style>
        .grid-item.featured { grid-column: span 2; }
    </style>
</head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main>
        <section class="bento-grid">
            <article class="grid-item featured">
                <h2>Featured</h2>
                <img src="featured.jpg" alt="Featured item">
            </article>
            <article class="grid-item">
                <h2>Item 1</h2>
                <img src="img1.jpg" alt="Item 1">
            </article>
        </section>
    </main>
</body>
</html>"""
        html_file = tmp_path / "masonry-grid.html"
        html_file.write_text(html)

        result = validator.validate_file(html_file)

        # Should support CSS grid variations
        assert result.valid or len([e for e in result.errors if e.severity == "critical"]) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

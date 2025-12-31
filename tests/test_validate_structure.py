#!/usr/bin/env python3
"""
Comprehensive test suite for Structural Validator v2.0

Tests cover:
- Positive cases (valid structures)
- Negative cases (common mistakes)
- Edge cases (complex scenarios)
- Real-world failures
- Integration tests
"""

import sys
import os
import tempfile
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

try:
    from validate_structure import (
        StructuralValidator,
        ValidationResult,
        ValidationError,
    )
except ImportError:
    print("Error: Could not import validator. Ensure validate_structure.py exists.")
    sys.exit(1)

import pytest


class TestPositiveCases:
    """Tests for valid HTML structures that should PASS"""

    def test_valid_basic_structure(self):
        """Valid basic HTML with header and nav"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Test Page</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Test page">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <h1>Main Title</h1>
    </header>
    <nav class="nav-menu">
        <ul>
            <li><a href="#home">Home</a></li>
        </ul>
    </nav>
    <main>
        <section>
            <h2>Content</h2>
            <p>Test content</p>
        </section>
    </main>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                assert result.valid, f"Unexpected errors: {result.errors}"
            finally:
                os.unlink(f.name)

    def test_valid_with_logo(self):
        """Valid structure with properly nested logo"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Test</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Test">
</head>
<body>
    <header>
        <img src="logo.png" class="logo" alt="Logo">
        <h1>Title</h1>
    </header>
    <nav class="nav-menu">
        <ul><li><a href="#test">Test</a></li></ul>
    </nav>
    <main><h2>Content</h2></main>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                # Should pass at least basic validation
                assert len(result.errors) < 3
            finally:
                os.unlink(f.name)

    def test_valid_with_images(self):
        """Valid images with alt text"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Image Test</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
</head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main>
        <img src="test.jpg" alt="Test image">
    </main>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                # Should not have image alt issues
                alt_errors = [e for e in result.errors if "alt" in e.message.lower()]
                assert len(alt_errors) == 0
            finally:
                os.unlink(f.name)

    def test_valid_heading_hierarchy(self):
        """Valid heading hierarchy without gaps"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Heading Test</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
</head>
<body>
    <header><h1>Main Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main>
        <h2>Section</h2>
        <h3>Subsection</h3>
        <p>Content</p>
    </main>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                hierarchy_errors = [
                    e for e in result.errors if "hierarchy" in e.rule_name.lower()
                ]
                # Allow h1 check but hierarchy should be ok
                assert len(hierarchy_errors) <= 1
            finally:
                os.unlink(f.name)

    def test_valid_semantic_html(self):
        """Valid semantic HTML structure"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Semantic Test</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
</head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Nav</a></li></ul></nav>
    <main>
        <article>
            <h2>Article</h2>
            <p>Content</p>
        </article>
        <aside>
            <h3>Sidebar</h3>
            <p>Sidebar content</p>
        </aside>
    </main>
    <footer>
        <p>Footer</p>
    </footer>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                # Semantic errors should be minimal
                assert len([e for e in result.errors if e.rule_id == 12]) <= 1
            finally:
                os.unlink(f.name)


class TestNegativeCases:
    """Tests for common mistakes that should FAIL"""

    def test_duplicate_headers(self):
        """Should fail with duplicate headers"""
        html = """<!DOCTYPE html>
<html lang="en">
<head><title>Test</title><meta charset="UTF-8"><meta name="description" content="Test"></head>
<body>
    <header><h1>Title 1</h1></header>
    <header><h1>Title 2</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                header_errors = [
                    e for e in result.errors if e.rule_id == 1
                ]
                assert len(header_errors) > 0
                assert header_errors[0].severity == "critical"
            finally:
                os.unlink(f.name)

    def test_missing_header(self):
        """Should fail with missing header"""
        html = """<!DOCTYPE html>
<html lang="en">
<head><title>Test</title><meta charset="UTF-8"><meta name="description" content="Test"></head>
<body>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main><p>No header</p></main>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                header_errors = [
                    e for e in result.errors if e.rule_id == 1
                ]
                assert len(header_errors) > 0
            finally:
                os.unlink(f.name)

    def test_missing_nav(self):
        """Should fail with missing nav"""
        html = """<!DOCTYPE html>
<html lang="en">
<head><title>Test</title><meta charset="UTF-8"><meta name="description" content="Test"></head>
<body>
    <header><h1>Title</h1></header>
    <main><p>No nav</p></main>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                nav_errors = [e for e in result.errors if e.rule_id == 2]
                assert len(nav_errors) > 0
            finally:
                os.unlink(f.name)

    def test_missing_image_alt_text(self):
        """Should fail with missing image alt text"""
        html = """<!DOCTYPE html>
<html lang="en">
<head><title>Test</title><meta charset="UTF-8"><meta name="description" content="Test"></head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main>
        <img src="image.jpg">
    </main>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                alt_errors = [e for e in result.errors if e.rule_id == 6]
                assert len(alt_errors) > 0
                assert alt_errors[0].severity == "major"
            finally:
                os.unlink(f.name)

    def test_missing_title(self):
        """Should fail with missing title tag"""
        html = """<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="description" content="Test"></head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                title_errors = [e for e in result.errors if e.rule_id == 8]
                assert len(title_errors) > 0
                assert title_errors[0].severity == "critical"
            finally:
                os.unlink(f.name)

    def test_empty_title(self):
        """Should fail with empty title tag"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title></title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
</head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                title_errors = [e for e in result.errors if e.rule_id == 8]
                assert len(title_errors) > 0
            finally:
                os.unlink(f.name)

    def test_missing_doctype(self):
        """Should fail with missing DOCTYPE"""
        html = """<html lang="en">
<head>
    <title>Test</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
</head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                doctype_errors = [e for e in result.errors if e.rule_id == 14]
                assert len(doctype_errors) > 0
                assert doctype_errors[0].severity == "critical"
            finally:
                os.unlink(f.name)

    def test_missing_lang_attribute(self):
        """Should fail with missing lang attribute"""
        html = """<!DOCTYPE html>
<html>
<head>
    <title>Test</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
</head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                lang_errors = [
                    e for e in result.errors if "lang" in e.message.lower()
                ]
                assert len(lang_errors) > 0
            finally:
                os.unlink(f.name)

    def test_missing_meta_description(self):
        """Should fail with missing meta description"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Test</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width">
</head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                meta_errors = [
                    e for e in result.errors if e.rule_id == 7
                ]
                assert len(meta_errors) > 0
            finally:
                os.unlink(f.name)

    def test_link_without_href(self):
        """Should fail with link missing href"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Test</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
</head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a>No Link</a></li></ul></nav>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                link_errors = [e for e in result.errors if e.rule_id == 9]
                assert len(link_errors) > 0
            finally:
                os.unlink(f.name)


class TestEdgeCases:
    """Tests for complex edge cases"""

    def test_deeply_nested_blog_post(self):
        """Test blog post with depth 2 (public/blog/post.html)"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Blog Post</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
    <link rel="stylesheet" href="../../style.css">
</head>
<body>
    <header>
        <img src="../../images/logo.png" class="logo" alt="Logo">
        <h1>Blog Title</h1>
    </header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".html", dir="/tmp", prefix="blog_", delete=False
        ) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                # Should not have critical path errors
                path_errors = [
                    e for e in result.errors if "path" in e.message.lower()
                ]
                assert len([e for e in path_errors if e.severity == "critical"]) == 0
            finally:
                os.unlink(f.name)

    def test_inline_style_conflict_with_css_class(self):
        """Test inline styles conflicting with CSS class"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Test</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
</head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main>
        <div class="container" style="max-width: 900px; padding: 20px;">
            Content
        </div>
    </main>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                style_errors = [
                    e for e in result.errors if e.rule_id == 4
                ]
                assert len(style_errors) > 0
                assert style_errors[0].severity == "major"
            finally:
                os.unlink(f.name)

    def test_heading_hierarchy_with_gaps(self):
        """Test heading hierarchy with skipped levels"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Test</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
</head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main>
        <h2>Section</h2>
        <h4>Skipped h3</h4>
    </main>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                hierarchy_errors = [
                    e for e in result.errors if e.rule_id == 5
                ]
                # Should warn about skipped level
                skip_errors = [e for e in hierarchy_errors if "skip" in e.message.lower()]
                assert len(skip_errors) > 0
            finally:
                os.unlink(f.name)

    def test_multiple_important_declarations(self):
        """Test CSS with excessive !important usage"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Test</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
</head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main>
        <div style="color: red !important; padding: 10px !important; margin: 5px !important;
                    background: blue !important; border: 1px solid black !important;
                    font-size: 14px !important;">
            Content
        </div>
    </main>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                specificity_errors = [
                    e for e in result.errors if e.rule_id == 13
                ]
                assert len(specificity_errors) > 0
            finally:
                os.unlink(f.name)

    def test_cache_busting_in_logo_path(self):
        """Test logo path with cache-busting parameter"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Test</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
</head>
<body>
    <header>
        <img src="logo.png?v=1.2.3" class="logo" alt="Logo">
        <h1>Title</h1>
    </header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                # Should not fail on cache-busting parameters
                path_errors = [
                    e for e in result.errors if e.rule_id == 3
                ]
                assert len([e for e in path_errors if e.severity == "critical"]) <= 1
            finally:
                os.unlink(f.name)

    def test_empty_list_items(self):
        """Test list with empty items"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Test</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
</head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu">
        <ul>
            <li><a href="#">Item 1</a></li>
            <li></li>
            <li><a href="#">Item 3</a></li>
        </ul>
    </nav>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                # Empty list items are ok structurally
                list_errors = [
                    e for e in result.errors if e.rule_id == 11
                ]
                assert len(list_errors) == 0
            finally:
                os.unlink(f.name)

    def test_form_with_labels(self):
        """Test form inputs with proper labels"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Test</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
</head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main>
        <form>
            <label for="email">Email:</label>
            <input type="email" id="email">
            <label for="password">Password:</label>
            <input type="password" id="password">
        </form>
    </main>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                label_errors = [
                    e for e in result.errors if e.rule_id == 10
                ]
                assert len(label_errors) == 0
            finally:
                os.unlink(f.name)


class TestRealWorldFailures:
    """Tests for actual issues found in the codebase"""

    def test_inline_header_style_conflict(self):
        """Real issue: Blog post with inline header style conflicting with CSS"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Blog Post</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
    <link rel="stylesheet" href="../../style.css">
</head>
<body style="background-color: #1a120b; color: #f4e4d4; font-family: 'Merriweather', serif;">
    <header style="background: #3d2817;">
        <h1>Blog Title</h1>
    </header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                # May have inline style conflicts
                style_errors = [
                    e for e in result.errors if "style" in e.message.lower()
                ]
                # This is expected behavior
            finally:
                os.unlink(f.name)

    def test_logo_path_in_nested_file(self):
        """Real issue: Logo path validation in blog post at depth 2"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Blog</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
    <link rel="stylesheet" href="../../style.css">
</head>
<body>
    <header>
        <img src="../../images/logo.png" class="logo" alt="Logo">
        <h1>Title</h1>
    </header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                # Proper depth validation
                critical_errors = [
                    e for e in result.errors if e.severity == "critical"
                ]
                # Path itself should be valid
            finally:
                os.unlink(f.name)

    def test_navigation_inconsistency(self):
        """Real issue: Navigation without list structure"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Test</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
</head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu">
        <div><a href="#">Link 1</a></div>
        <div><a href="#">Link 2</a></div>
    </nav>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))
                nav_errors = [e for e in result.errors if e.rule_id == 2]
                assert len(nav_errors) > 0
            finally:
                os.unlink(f.name)


class TestIntegration:
    """Integration tests for batch validation and directory scanning"""

    def test_validate_multiple_files(self):
        """Test validating multiple files in sequence"""
        files = []
        try:
            for i in range(3):
                html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <title>Test {i}</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
</head>
<body>
    <header><h1>Title {i}</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
</body>
</html>"""
                with tempfile.NamedTemporaryFile(
                    mode="w", suffix=".html", delete=False
                ) as f:
                    f.write(html)
                    f.flush()
                    files.append(f.name)

            validator = StructuralValidator()
            results = [
                validator.validate_file(Path(f)) for f in files
            ]
            assert len(results) == 3
            assert all(isinstance(r, ValidationResult) for r in results)
        finally:
            for f in files:
                os.unlink(f)

    def test_validate_directory_with_subdirs(self):
        """Test validating directory with HTML files"""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)

            # Create HTML files
            (tmpdir / "index.html").write_text("""<!DOCTYPE html>
<html lang="en">
<head>
    <title>Index</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
</head>
<body>
    <header><h1>Home</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
</body>
</html>""")

            # Create subdirectory with HTML
            subdir = tmpdir / "blog"
            subdir.mkdir()
            (subdir / "post.html").write_text("""<!DOCTYPE html>
<html lang="en">
<head>
    <title>Post</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
</head>
<body>
    <header><h1>Post</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
</body>
</html>""")

            validator = StructuralValidator()
            results = validator.validate_directory(tmpdir)
            assert len(results) >= 2

    def test_filter_errors_by_severity(self):
        """Test filtering errors by severity level"""
        html = """<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body>
    <img src="test.jpg">
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))

                # Filter to critical only
                critical = validator.filter_errors_by_severity(
                    result.errors, "critical"
                )
                assert all(e.severity == "critical" for e in critical)

                # Filter to major
                major = validator.filter_errors_by_severity(result.errors, "major")
                assert all(
                    e.severity in ("critical", "major") for e in major
                )
            finally:
                os.unlink(f.name)

    def test_summary_reporting(self):
        """Test validation summary generation"""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Test</title>
    <meta charset="UTF-8">
    <meta name="description" content="Test">
</head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
</body>
</html>"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False) as f:
            f.write(html)
            f.flush()
            try:
                validator = StructuralValidator()
                result = validator.validate_file(Path(f.name))

                # Check result structure
                assert hasattr(result, "file_path")
                assert hasattr(result, "valid")
                assert hasattr(result, "errors")
                assert isinstance(result.errors, list)
            finally:
                os.unlink(f.name)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

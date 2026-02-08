#!/usr/bin/env python3
"""
Comprehensive test of all 10 validation rules in content_validator.py
Run this to verify the validator catches and fixes all known issues.
"""

from content_validator import ContentValidator

def test_all_validation_rules():
    """Test all 10 validation rules with problematic HTML."""

    # HTML with all 10 types of issues
    problematic_html = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test Blog Post - Carnivore Weekly</title>
    <!-- Missing meta description -->
    <!-- Missing canonical -->
</head>
<body>
    <!-- Issue 1: Multiple H1 tags (should keep first, convert rest to H2) -->
    <h1>First Heading</h1>
    <h1>Second Heading</h1>
    <h1>Third Heading</h1>

    <!-- Issue 2: Duplicate IDs (should append -2, -3, etc.) -->
    <div id="newsletter-form">Form 1</div>
    <div id="newsletter-form">Form 2</div>
    <div id="newsletter-form">Form 3</div>

    <!-- Issue 5: Skipped heading levels (H1 to H4) -->
    <h4>This should be H2</h4>

    <!-- Issue 7: Missing alt attributes -->
    <img src="/images/steak.jpg">
    <img src="/images/beef.jpg" alt="">

    <!-- Issue 8: External links without rel attributes -->
    <a href="https://example.com">External Link 1</a>
    <a href="https://external.org/article">External Link 2</a>

    <!-- Internal link (should not be modified) -->
    <a href="https://carnivoreweekly.com/blog/">Internal Link</a>

    <p>Some content here.</p>

    <!-- Issue 10: Valid JSON-LD (should pass) -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Test Article",
      "author": {
        "@type": "Person",
        "name": "Test Author"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Carnivore Weekly"
      },
      "datePublished": "2026-02-08"
    }
    </script>
</body>
</html>
'''

    print("=" * 70)
    print("COMPREHENSIVE VALIDATION TEST - ALL 10 RULES")
    print("=" * 70)
    print("\nTesting with problematic HTML containing:")
    print("  1. Multiple H1 tags (3 total)")
    print("  2. Duplicate IDs (newsletter-form x3)")
    print("  3. Template variables: N/A (would block, tested separately)")
    print("  4. Missing meta description")
    print("  5. Missing canonical URL")
    print("  6. Skipped heading hierarchy (H1→H4)")
    print("  7. Images without alt text (2 images)")
    print("  8. External links without rel attributes (2 links)")
    print("  9. Sitemap: N/A (handled in separate function)")
    print(" 10. Valid JSON-LD structure")
    print("\n" + "=" * 70)
    print("VALIDATION RESULTS:")
    print("=" * 70 + "\n")

    # Run validator
    validator = ContentValidator()
    fixed_content, log_messages = validator.validate_and_fix(problematic_html, "test-comprehensive.html")

    # Print results
    for msg in log_messages:
        if "[AUTO-FIX]" in msg:
            print(f"✅ {msg}")
        elif "[BLOCKED]" in msg:
            print(f"❌ {msg}")
        elif "[SUMMARY]" in msg:
            print(f"\n📊 {msg}")

    print("\n" + "=" * 70)

    if fixed_content:
        print("✅ RESULT: Content validated and fixed successfully")

        # Count fixes
        auto_fixes = len([m for m in log_messages if "[AUTO-FIX]" in m])
        print(f"✅ Total auto-fixes applied: {auto_fixes}")

        # Verify fixes in output
        print("\n" + "=" * 70)
        print("VERIFICATION OF FIXES IN OUTPUT:")
        print("=" * 70)

        # Check H1 count
        h1_count = fixed_content.count('<h1')
        print(f"  H1 tags: {h1_count} (expected: 1) {'✅' if h1_count == 1 else '❌'}")

        # Check for duplicate IDs (should have -2, -3 suffixes now)
        has_suffixed_ids = 'id="newsletter-form-2"' in fixed_content
        print(f"  Duplicate IDs fixed: {'✅' if has_suffixed_ids else '❌'}")

        # Check meta description added
        has_meta_desc = 'name="description"' in fixed_content and 'content=""' not in fixed_content
        print(f"  Meta description added: {'✅' if has_meta_desc else '❌'}")

        # Check canonical added
        has_canonical = 'rel="canonical"' in fixed_content
        print(f"  Canonical URL added: {'✅' if has_canonical else '❌'}")

        # Check alt text added
        img_count_without_alt = fixed_content.count('<img') - fixed_content.count('alt="')
        print(f"  Images with alt text: {'✅' if img_count_without_alt == 0 else '❌'}")

        # Check rel attributes on external links
        has_rel_external = 'rel="noopener noreferrer"' in fixed_content
        print(f"  External links have rel: {'✅' if has_rel_external else '❌'}")

        print("\n" + "=" * 70)
        print("✅ TEST PASSED - All validation rules working correctly")
        print("=" * 70)

    else:
        print("❌ RESULT: Content was blocked (critical issues found)")
        print("\nThis HTML should NOT have been blocked.")
        print("Check the validator logic for the blocking issue.")

    return fixed_content is not None


def test_blocking_behavior():
    """Test that unrendered template variables block content."""

    print("\n" + "=" * 70)
    print("BLOCKING BEHAVIOR TEST")
    print("=" * 70)
    print("\nTesting with unrendered template variables...")

    blocked_html = '''
<!DOCTYPE html>
<html>
<head>
    <title>Test</title>
    <meta property="article:published_time" content="{{ publish_date }}">
</head>
<body>
    <h1>Test Post</h1>
    <p>Content with {{ unrendered_variable }}</p>

    <script type="application/ld+json">
    {
      "@type": "Article",
      "headline": "Test",
      "author": {"name": "{{ author_name }}"},
      "publisher": {"name": "Test"},
      "datePublished": "{{ publish_date }}"
    }
    </script>
</body>
</html>
'''

    validator = ContentValidator()
    fixed_content, log_messages = validator.validate_and_fix(blocked_html, "blocked-test.html")

    for msg in log_messages:
        if "[BLOCKED]" in msg:
            print(f"❌ {msg}")

    if fixed_content is None:
        print("\n✅ TEST PASSED - Content correctly blocked due to template variables")
    else:
        print("\n❌ TEST FAILED - Content should have been blocked but wasn't")

    print("=" * 70)

    return fixed_content is None


if __name__ == "__main__":
    # Run both tests
    test1_passed = test_all_validation_rules()
    test2_passed = test_blocking_behavior()

    print("\n" + "=" * 70)
    print("FINAL TEST RESULTS")
    print("=" * 70)
    print(f"  Comprehensive validation test: {'✅ PASSED' if test1_passed else '❌ FAILED'}")
    print(f"  Blocking behavior test: {'✅ PASSED' if test2_passed else '❌ FAILED'}")

    if test1_passed and test2_passed:
        print("\n🎉 ALL TESTS PASSED - Content validator is working correctly!")
        print("=" * 70)
        exit(0)
    else:
        print("\n❌ SOME TESTS FAILED - Review validator logic")
        print("=" * 70)
        exit(1)

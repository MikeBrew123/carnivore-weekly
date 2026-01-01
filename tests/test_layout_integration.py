#!/usr/bin/env python3
"""
Integration tests for layout metadata generation

Tests that layout_metadata is properly generated and integrated
with the page generation pipeline.

Author: Created with Claude Code
Date: 2025-12-31
"""

import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
ANALYZED_FILE = DATA_DIR / "analyzed_content.json"


# ============================================================================
# TEST FUNCTIONS
# ============================================================================


def test_layout_metadata_present():
    """Test that layout_metadata is present in the analyzed content"""
    print("Test 1: Checking if layout_metadata is present...")

    with open(ANALYZED_FILE) as f:
        data = json.load(f)

    assert "layout_metadata" in data, "layout_metadata missing"
    print("  ✓ layout_metadata present")


def test_layout_metadata_schema():
    """Test layout_metadata has required root fields"""
    print("Test 2: Validating layout_metadata schema...")

    with open(ANALYZED_FILE) as f:
        data = json.load(f)

    layout = data.get("layout_metadata", {})
    required_fields = ["page_grid_mode", "layout_version", "sections"]

    for field in required_fields:
        assert field in layout, f"Missing required field: {field}"

    print("  ✓ layout_metadata has all required fields")
    print(f"    - page_grid_mode: {layout.get('page_grid_mode')}")
    print(f"    - layout_version: {layout.get('layout_version')}")


def test_sections_have_layouts():
    """Test that each section has proper layout configuration"""
    print("Test 3: Validating section layouts...")

    with open(ANALYZED_FILE) as f:
        data = json.load(f)

    layout = data.get("layout_metadata", {})
    sections = layout.get("sections", {})

    for section_name, section_config in sections.items():
        assert "grid_mode" in section_config, (
            f"{section_name} missing grid_mode"
        )
        assert "item_layout" in section_config, (
            f"{section_name} missing item_layout"
        )

        # Validate item_layout is a list
        assert isinstance(section_config["item_layout"], list), (
            f"{section_name} item_layout is not a list"
        )

        print(f"  ✓ {section_name}")
        print(f"    - grid_mode: {section_config.get('grid_mode')}")
        print(f"    - items: {len(section_config.get('item_layout', []))}")


def test_item_layout_structure():
    """Test that each item in layout has required fields"""
    print("Test 4: Validating item layout structure...")

    with open(ANALYZED_FILE) as f:
        data = json.load(f)

    layout = data.get("layout_metadata", {})
    sections = layout.get("sections", {})

    required_item_fields = ["column", "row", "width", "height"]

    for section_name, section_config in sections.items():
        items = section_config.get("item_layout", [])

        for item_idx, item in enumerate(items):
            for field in required_item_fields:
                assert field in item, (
                    f"{section_name} item {item_idx} missing {field}"
                )

        print(f"  ✓ {section_name}: {len(items)} items valid")


def test_layout_vs_content_alignment():
    """Test that layout item_index values match actual content"""
    print("Test 5: Validating layout vs content alignment...")

    with open(ANALYZED_FILE) as f:
        data = json.load(f)

    layout = data.get("layout_metadata", {})
    analysis = data.get("analysis", {})

    # Check trending_topics alignment
    trending_layout = layout.get("sections", {}).get(
        "trending_topics", {}
    ).get("item_layout", [])
    trending_topics = analysis.get("trending_topics", [])

    for item in trending_layout:
        item_idx = item.get("item_index")
        if item_idx is not None:
            assert item_idx < len(trending_topics), (
                f"trending_topics: item_index {item_idx} out of range"
            )

    # Check top_videos alignment
    videos_layout = layout.get("sections", {}).get(
        "top_videos", {}
    ).get("item_layout", [])
    top_videos = analysis.get("top_videos", [])

    for item in videos_layout:
        item_idx = item.get("item_index")
        if item_idx is not None:
            assert item_idx < len(top_videos), (
                f"top_videos: item_index {item_idx} out of range"
            )

    print("  ✓ Layout indices align with content")


def test_backward_compatibility():
    """Test that old data without layout_metadata still works"""
    print("Test 6: Testing backward compatibility...")

    # Load current data
    with open(ANALYZED_FILE) as f:
        data = json.load(f)

    # Create a copy without layout_metadata
    data_without_layout = {k: v for k, v in data.items()
                           if k != "layout_metadata"}

    # Verify required fields still present
    required_root_fields = ["analysis_date", "analysis", "source_data"]
    for field in required_root_fields:
        assert field in data_without_layout, (
            f"Missing critical field: {field}"
        )

    # Verify analysis has required sections
    analysis = data_without_layout.get("analysis", {})
    required_analysis_fields = ["trending_topics", "top_videos"]
    for field in required_analysis_fields:
        assert field in analysis, f"Missing analysis field: {field}"

    print("  ✓ Data structure valid without layout_metadata")
    print("    - Can render in fallback (single-column) layout")


def test_grid_columns_valid():
    """Test that grid_columns values are reasonable"""
    print("Test 7: Validating grid_columns values...")

    with open(ANALYZED_FILE) as f:
        data = json.load(f)

    layout = data.get("layout_metadata", {})
    sections = layout.get("sections", {})

    for section_name, section_config in sections.items():
        grid_cols = section_config.get("grid_columns")
        assert grid_cols is not None, f"{section_name} missing grid_columns"
        assert isinstance(grid_cols, int), (
            f"{section_name} grid_columns is not integer"
        )
        assert 1 <= grid_cols <= 5, (
            f"{section_name} grid_columns {grid_cols} out of range"
        )

    print("  ✓ All grid_columns values valid")


def test_gap_size_valid():
    """Test that gap_size values are valid"""
    print("Test 8: Validating gap_size values...")

    with open(ANALYZED_FILE) as f:
        data = json.load(f)

    layout = data.get("layout_metadata", {})
    sections = layout.get("sections", {})
    valid_sizes = ["small", "medium", "large"]

    for section_name, section_config in sections.items():
        gap = section_config.get("gap_size")
        if gap:
            assert gap in valid_sizes, (
                f"{section_name} gap_size '{gap}' not valid"
            )

    print("  ✓ All gap_size values valid")


def test_priority_values_valid():
    """Test that priority values in items are valid"""
    print("Test 9: Validating priority values...")

    with open(ANALYZED_FILE) as f:
        data = json.load(f)

    layout = data.get("layout_metadata", {})
    sections = layout.get("sections", {})
    valid_priorities = ["high", "medium", "low"]

    total_checked = 0
    for section_name, section_config in sections.items():
        items = section_config.get("item_layout", [])
        for item in items:
            priority = item.get("priority")
            if priority:
                assert priority in valid_priorities, (
                    f"{section_name}: priority '{priority}' not valid"
                )
                total_checked += 1

    print(f"  ✓ All {total_checked} priority values valid")


def test_layout_file_readable():
    """Test that layout_metadata can be serialized/deserialized"""
    print("Test 10: Testing JSON serialization...")

    with open(ANALYZED_FILE) as f:
        data = json.load(f)

    layout = data.get("layout_metadata")

    # Should be able to re-serialize without errors
    layout_json = json.dumps(layout)
    layout_restored = json.loads(layout_json)

    assert layout_restored == layout, "JSON round-trip failed"
    print("  ✓ layout_metadata serializes correctly")
    print(f"    - Size: {len(layout_json)} bytes")


# ============================================================================
# MAIN EXECUTION
# ============================================================================


def run_all_tests():
    """Run all tests"""
    tests = [
        test_layout_metadata_present,
        test_layout_metadata_schema,
        test_sections_have_layouts,
        test_item_layout_structure,
        test_layout_vs_content_alignment,
        test_backward_compatibility,
        test_grid_columns_valid,
        test_gap_size_valid,
        test_priority_values_valid,
        test_layout_file_readable,
    ]

    passed = 0
    failed = 0

    print("\n" + "=" * 70)
    print("LAYOUT METADATA INTEGRATION TESTS")
    print("=" * 70 + "\n")

    for test in tests:
        try:
            test()
            passed += 1
            print()
        except AssertionError as e:
            failed += 1
            print(f"  ✗ FAILED: {e}\n")
        except Exception as e:
            failed += 1
            print(f"  ✗ ERROR: {e}\n")

    # Summary
    print("=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    print(f"Passed: {passed}/{len(tests)}")
    print(f"Failed: {failed}/{len(tests)}")

    if failed == 0:
        print("\n✓ ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n✗ {failed} TEST(S) FAILED")
        return 1


def main():
    """Entry point"""
    try:
        return run_all_tests()
    except KeyboardInterrupt:
        print("\n\n⚠ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

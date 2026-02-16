#!/usr/bin/env python3
"""
Image Audit Script for Carnivore Weekly

Standalone tool to analyze image sizes, formats, and usage.
NOT part of pre-commit — run manually when needed.

Usage:
    python3 scripts/audit_images.py [--fix-names]
"""

import os
import sys
from pathlib import Path
from collections import defaultdict

try:
    from PIL import Image
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False
    print("Warning: Pillow not installed. Image dimension analysis disabled.")
    print("Install with: pip3 install Pillow\n")


def get_project_root():
    """Find project root by looking for public/ directory"""
    path = Path(__file__).resolve().parent.parent
    if (path / 'public').is_dir():
        return path
    return Path.cwd()


def audit_file_sizes(images_dir):
    """Report all images over 500KB"""
    print("\n" + "="*60)
    print("📊 IMAGE SIZE AUDIT")
    print("="*60)

    total_size = 0
    large_files = []
    all_files = []

    for root, dirs, files in os.walk(images_dir):
        for f in sorted(files):
            if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg')):
                path = Path(root) / f
                size = path.stat().st_size
                total_size += size
                all_files.append((path, size))
                if size > 500 * 1024:  # 500KB
                    large_files.append((path, size))

    print(f"\nTotal images: {len(all_files)}")
    print(f"Total size: {total_size / (1024*1024):.1f}MB")

    if large_files:
        print(f"\n⚠️  Files over 500KB ({len(large_files)}):")
        for path, size in sorted(large_files, key=lambda x: -x[1]):
            rel = path.relative_to(images_dir)
            webp_exists = path.with_suffix('.webp').exists()
            status = "✅ WebP exists" if webp_exists else "❌ No WebP"
            print(f"  {size/1024:.0f}KB  {rel}  [{status}]")
    else:
        print("\n✅ No files over 500KB")

    return all_files, large_files


def audit_format_coverage(images_dir):
    """Check which images have WebP versions"""
    print("\n" + "="*60)
    print("🔄 FORMAT COVERAGE")
    print("="*60)

    originals = []  # (path, has_webp)

    for root, dirs, files in os.walk(images_dir):
        for f in sorted(files):
            if f.lower().endswith(('.png', '.jpg', '.jpeg')):
                path = Path(root) / f
                webp_path = path.with_suffix('.webp')
                originals.append((path, webp_path.exists()))

    missing_webp = [(p, has) for p, has in originals if not has]

    print(f"\nOriginal images (PNG/JPG): {len(originals)}")
    print(f"With WebP version: {len(originals) - len(missing_webp)}")
    print(f"Missing WebP: {len(missing_webp)}")

    if missing_webp:
        print(f"\n❌ Missing WebP versions:")
        for path, _ in missing_webp:
            rel = path.relative_to(images_dir)
            size = path.stat().st_size
            print(f"  {size/1024:.0f}KB  {rel}")
    else:
        print("\n✅ All originals have WebP versions")

    return originals, missing_webp


def audit_html_references(project_root, images_dir):
    """Cross-reference HTML image references against actual files"""
    print("\n" + "="*60)
    print("🔗 HTML REFERENCE AUDIT")
    print("="*60)

    public_dir = project_root / 'public'
    referenced = set()
    broken = []
    non_webp_refs = []

    import re
    img_pattern = re.compile(r'(?:src|srcset)=["\']([^"\']*?\.(?:png|jpg|jpeg|webp|gif))', re.IGNORECASE)

    for html_file in sorted(public_dir.rglob('*.html')):
        try:
            content = html_file.read_text(encoding='utf-8')
        except Exception:
            continue

        for match in img_pattern.finditer(content):
            ref = match.group(1).split()[0]  # Handle srcset "url 400w" format

            if ref.startswith('http://') or ref.startswith('https://') or ref.startswith('data:'):
                continue

            # Resolve path
            if ref.startswith('/'):
                file_path = public_dir / ref.lstrip('/')
            elif ref.startswith('../'):
                file_path = (html_file.parent / ref).resolve()
            else:
                file_path = html_file.parent / ref

            referenced.add(file_path.resolve())

            if not file_path.exists():
                broken.append((html_file.relative_to(public_dir), ref))

            if ref.lower().endswith(('.png', '.jpg', '.jpeg')):
                webp_ref = Path(ref).with_suffix('.webp')
                webp_path = public_dir / str(webp_ref).lstrip('/')
                if webp_path.exists():
                    non_webp_refs.append((html_file.relative_to(public_dir), ref))

    # Find orphaned images (on disk but never referenced)
    on_disk = set()
    for root, dirs, files in os.walk(images_dir):
        for f in files:
            if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif')):
                on_disk.add((Path(root) / f).resolve())

    orphaned = on_disk - referenced

    if broken:
        print(f"\n❌ Broken image references ({len(broken)}):")
        for html, ref in broken[:20]:
            print(f"  {html} → {ref}")
    else:
        print("\n✅ No broken image references")

    if non_webp_refs:
        print(f"\n⚠️  HTML references to PNG/JPG where WebP exists ({len(non_webp_refs)}):")
        for html, ref in non_webp_refs[:20]:
            print(f"  {html} → {ref}")
        if len(non_webp_refs) > 20:
            print(f"  ... and {len(non_webp_refs) - 20} more")
    else:
        print("\n✅ All referenced images use WebP where available")

    if orphaned:
        orphan_size = sum(p.stat().st_size for p in orphaned if p.exists())
        print(f"\n🗑️  Orphaned images — on disk but never referenced ({len(orphaned)}, {orphan_size/1024:.0f}KB):")
        for p in sorted(orphaned):
            try:
                rel = p.relative_to(images_dir)
                size = p.stat().st_size
                print(f"  {size/1024:.0f}KB  {rel}")
            except ValueError:
                print(f"  {p}")
    else:
        print("\n✅ No orphaned images")

    return broken, non_webp_refs, orphaned


def audit_dimensions(images_dir):
    """Check image dimensions and flag oversized images"""
    if not HAS_PILLOW:
        print("\n⏭️  Skipping dimension audit (Pillow not installed)")
        return

    print("\n" + "="*60)
    print("📐 DIMENSION AUDIT")
    print("="*60)

    oversized = []

    for root, dirs, files in os.walk(images_dir):
        for f in sorted(files):
            if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                path = Path(root) / f
                try:
                    with Image.open(path) as img:
                        w, h = img.size
                        if w > 2000 or h > 2000:
                            size = path.stat().st_size
                            oversized.append((path, w, h, size))
                except Exception:
                    continue

    if oversized:
        print(f"\n⚠️  Images over 2000px in either dimension ({len(oversized)}):")
        for path, w, h, size in sorted(oversized, key=lambda x: -x[3]):
            rel = path.relative_to(images_dir)
            print(f"  {w}x{h}  {size/1024:.0f}KB  {rel}")
    else:
        print("\n✅ No oversized images")


def main():
    project_root = get_project_root()
    images_dir = project_root / 'public' / 'images'

    if not images_dir.exists():
        print(f"Error: Images directory not found: {images_dir}")
        sys.exit(1)

    print(f"🔍 Auditing images in: {images_dir}")

    all_files, large_files = audit_file_sizes(images_dir)
    originals, missing_webp = audit_format_coverage(images_dir)
    broken, non_webp_refs, orphaned = audit_html_references(project_root, images_dir)
    audit_dimensions(images_dir)

    # Summary
    print("\n" + "="*60)
    print("📋 SUMMARY")
    print("="*60)
    issues = len(large_files) + len(missing_webp) + len(broken) + len(non_webp_refs)
    print(f"  Files over 500KB: {len(large_files)}")
    print(f"  Missing WebP: {len(missing_webp)}")
    print(f"  Broken references: {len(broken)}")
    print(f"  Non-WebP refs (WebP available): {len(non_webp_refs)}")
    print(f"  Orphaned images: {len(orphaned)}")

    if issues == 0:
        print("\n✅ All clear!")
    else:
        print(f"\n⚠️  {issues} issues found — review above for details")

    sys.exit(1 if broken else 0)


if __name__ == '__main__':
    main()

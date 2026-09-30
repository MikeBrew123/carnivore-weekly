---
paths:
  - "ketodial/public/blog/**"
  - "ketodial/scripts/generate_kd_blog.py"
---
# KetoDial legacy blog posts: surgical edits only
- These ~27 files are standalone HTML with the article inline. There is no data store to regenerate them from.
- NEVER bulk-regenerate. Never run `generate_kd_blog.py` without `--only-new`. ISSUE-026 wiped all 26 bodies on 2026-06-12.
- Edit with sed/python targeting specific tags (meta, images, nav). Never touch anything inside `<div class="content">`.
- After adding a post: `generate_kd_blog.py --only-new` updates `ketodial/public/sitemap.xml` and the `blog/index.html` feed-grid; verify both, then resubmit the sitemap in Google Search Console (no Indexing API for normal pages).

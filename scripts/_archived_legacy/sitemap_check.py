import re, os, glob

with open('/Users/mbrew/Developer/carnivore-weekly/public/sitemap.xml') as f:
    urls = re.findall(r'<loc>(.*?)</loc>', f.read())

blog_urls = [u for u in urls if '/blog/' in u and not u.endswith('/blog/')]
non_blog = [u for u in urls if '/blog/' not in u or u.endswith('/blog/')]

print(f"Total URLs in sitemap: {len(urls)}")
print(f"Blog post URLs in sitemap: {len(blog_urls)}")
print(f"\nNon-blog URLs in sitemap:")
for u in non_blog:
    print(f"  {u}")

# Count actual blog files (excluding index.html and wiki.html)
actual_blogs = glob.glob('/Users/mbrew/Developer/carnivore-weekly/public/blog/*.html')
actual_blogs = [b for b in actual_blogs if not b.endswith('index.html') and not b.endswith('wiki.html')]
print(f"\nActual blog HTML files on disk: {len(actual_blogs)}")
print(f"Blog posts in sitemap: {len(blog_urls)}")
print(f"MISSING from sitemap: {len(actual_blogs) - len(blog_urls)} blog posts")

# Find which blog posts are missing
sitemap_slugs = set()
for u in blog_urls:
    slug = u.split('/')[-1]
    sitemap_slugs.add(slug)

for b in sorted(actual_blogs):
    slug = os.path.basename(b)
    if slug not in sitemap_slugs:
        print(f"  NOT IN SITEMAP: {slug}")

# Check key pages missing from sitemap
key_pages = ['starter-plan.html', 'channels.html', 'archive.html', 'wiki.html', 'blog/']
print(f"\nKey page coverage:")
for kp in key_pages:
    found = any(kp in u for u in urls)
    status = "PRESENT" if found else "MISSING"
    print(f"  {kp}: {status}")

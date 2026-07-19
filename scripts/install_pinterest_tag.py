#!/usr/bin/env python3
"""Install the Pinterest base tag on all KetoDial pages (conversion tracking).

Tag ID 2612943505341 (KetoDial ad account 549770582436). Lets Pinterest attribute
pin -> ketodial.com -> calculator/signup instead of the traffic showing as 'direct'.

Surgical: inserts the base <script> immediately before </head>, only on pages that
don't already have it. Never touches page content (respects ISSUE-026 — no KD
bulk-regeneration). Idempotent: re-running skips pages that already have the tag.

Usage: python3 scripts/install_pinterest_tag.py [--dry-run]
"""
import argparse
import glob
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "ketodial/public")
TAG_ID = "2612943505341"

SNIPPET = """<!-- Pinterest Tag -->
<script>
!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
pintrk('load','%s');
pintrk('page');
</script>
<noscript><img height="1" width="1" style="display:none;" alt="" src="https://ct.pinterest.com/v3/?event=init&tid=%s&noscript=1" /></noscript>
<!-- end Pinterest Tag -->
</head>""" % (TAG_ID, TAG_ID)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    files = glob.glob(os.path.join(PUBLIC, "**", "*.html"), recursive=True)
    added = skipped = nohead = 0
    for f in files:
        with open(f, encoding="utf-8") as fh:
            html = fh.read()
        if "pintrk" in html:
            skipped += 1
            continue
        if "</head>" not in html:
            nohead += 1
            continue
        if not args.dry_run:
            html = html.replace("</head>", SNIPPET, 1)
            with open(f, "w", encoding="utf-8") as fh:
                fh.write(html)
        added += 1

    print("%s: %d added, %d already had it, %d had no </head>, %d total" %
          ("[dry-run] " if args.dry_run else "installed", added, skipped, nohead, len(files)))


if __name__ == "__main__":
    main()

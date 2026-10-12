# PescoDial post contract (binding for writers, template, validator, scheduled task)

A PD post is one object in data/blog_posts.json -> "blog_posts" array:

{
  "site": "pd",
  "slug": "is-shrimp-bad-for-cholesterol",          // lowercase-hyphen, NO date prefix (PD URLs are /guides/<slug>/); unique among pd posts; never renamed once published
  "title": "...",                                   // <= 65 chars
  "meta_description": "...",                       // 120-160 chars
  "excerpt": "...",                                 // 1-2 sentences, <= 200 chars, for the /guides/ index
  "author": "sarah" | "marcus",
  "date": "YYYY-MM-DD",                             // = publish_date
  "publish_date": "YYYY-MM-DD",                     // never in the past at write time; max 2 PD posts per 7-day window (enforced in daily_publish); never 2 on one date
  "scheduled_date": "YYYY-MM-DD",                   // MUST equal date and publish_date (pre-push gate 11)
  "status": "ready",                                // daily_publish flips to "published"
  "published": false,                               // daily_publish flips to true
  "category": "health" | "meal-plan" | "nutrition", // Supabase valid_category
  "topic_id": "P7",                                 // keyword-map id from data/pd_topic_queue.json
  "related": ["slug-a", "slug-b"],                  // optional; the template fills up to 3 static related links from published PD posts anyway
  "content": "<p>...</p><h2>...</h2>..."            // HTML body fragment, see below
}
No "image" field (PD uses its site og.png; no paid image spend).

## content rules (generate_pd_site.py --check-only enforces these; build fails closed)
* Allowed tags: aside (exactly one, class med-note), p, h2, h3, ul, ol, li, strong, em, a, table, thead, tbody, tr, th, td, blockquote. No h1 (template renders the title), no scripts, no inline styles, no images.
* A link to /calculator/ inside the first 300 words of visible text.
* Exactly one medicine box: <aside class="med-note"> ... </aside>, naming the relevant medicines in plain words (statins, blood-pressure medicine, blood thinners such as warfarin, diabetes medicine as relevant) and sending the reader to her doctor or pharmacist before changing anything. Food first. No supplement doses (no mg/IU/gram amounts of fish oil, omega-3 pills, etc.).
* A "When to talk to your doctor" h2 section.
* A sources section: <h2>Sources</h2><ul> with links to the primary sources actually used (USDA FoodData Central, FDA/EPA fish advice, AHA, NIH ODS, peer-reviewed papers with DOI/PubMed links). Every number in the post must trace to one of them.
* Internal links are root-relative (/guides/<slug>/, /calculator/). Links to carnivoreweekly.com or ketodial.com, if any, use full https:// URLs; never link to CW posts that defend high LDL / carnivore cholesterol.
* No em-dashes (—) anywhere. No invented stats, studies, quotes, testimonials or personal heart history for the writer.
* 900-1,600 words. One narrow problem per post.
* The "Not a doctor" line appears in the template, not in content.

## Removing or renaming a published guide
Same commit: add a redirect stub for the old URL AND remove or update every link to it in other PD posts. The validator fails every render while a published guide links to a slug that is no longer published, on purpose (a live page linking to a 404).

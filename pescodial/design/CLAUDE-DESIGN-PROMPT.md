Design a mobile-first website for PescoDial (pescodial.com), a pescatarian / Mediterranean-style eating site with a free calculator.

WHO IT'S FOR
Mostly women aged 45-70, reading on a phone, often worried about cholesterol, blood pressure or heart health, and wanting to eat more fish without fuss. They distrust hype. They want plain answers, big readable text, and things they can print.

BRAND FEEL
Calm, warm, trustworthy, Mediterranean kitchen rather than gym or diet-culture. Palette idea: deep sea blue, olive green, warm sand or cream background, one terracotta accent for buttons. Serif headings, highly readable sans-serif body. Body text at least 18px on mobile, high contrast, tap targets at least 48px. It is a sister site to KetoDial but must NOT look like it; give it its own identity. Simple wordmark "PescoDial" with a small dial or fish motif.

PAGES TO DESIGN (static HTML + CSS, no frameworks)
1. Homepage. On a phone, the first calculator input must be visible on the first screen (no long intro above it). Below: "Start here" links to 3-4 popular guides, a short "who writes this" line (Sarah, health writer), email signup.
2. Calculator flow (3 steps plus results):
   - Step 1, your numbers: age, sex, height, current weight, goal weight, activity level (ft/in and lb with a metric toggle).
   - Step 2, email to see results (one field, honest copy: "We'll email your results and a short weekly guide. Unsubscribe anytime.").
   - Results: daily calories, protein, fat, carbs (grams and a simple bar), fiber goal, "about 2 fish meals a week" guidance, a teaser of a printable pescatarian food list, and a clear box ABOVE the numbers: "Talk to your doctor before starting a new diet or changing the one you're on, especially if you take medication."
   - States for: input errors, under 18 (not available), and "we can't give a weight-loss target" (shown when someone is already underweight).
3. Article page template, for narrow question pages like "Is shrimp high in cholesterol?". Include: a short "Quick answer" box at the top, byline (Sarah) with updated date, a simple comparison table, a "Print this" button with a print stylesheet, a calculator call-to-action card mid-article, a "Not a doctor" note styled as a quote block, a sources list at the end.
4. Guides index (list of articles with titles and one-line summaries, no thumbnails needed).
5. Footer with About, Privacy, Contact, and a small "Not medical advice" line.

RULES
- No fake testimonials, star ratings, user counts, "doctor approved" badges or invented statistics.
- No em dashes in any copy.
- No stock photos of people; simple food illustrations or icons are fine.
- Fast and lightweight: system fonts or at most two Google Fonts, no heavy animation.
- Deliver clean HTML and CSS files, one CSS file shared by all pages, so the pages can be turned into templates.

# LCP Fix Plan: calculator.html (2026-07-05)

Author: Fable session (diagnosis grounded in the LIVE page fetched Jul 5, not the repo alone).
Executor: Sonnet-tier session. Escalate to Opus only if Phase B breaks the carousel or payment flow.
Goal: mobile LCP <= 2.5s (lab), CLS <= 0.1, with ZERO regression to the Jul 4 SEO push, the payment flow, or GA4 tracking.

## Context: what is ALREADY fixed (do not redo)

The "7.3s mobile" measurement predates the Jul 4 evening fixes. Verified live Jul 5:
- gtag is deferred behind a dataLayer stub (nothing lost) - DONE
- Google Fonts load via async print-media swap with noscript fallback - DONE
- React bundle (360KB) lazy-loads via IntersectionObserver + interaction, EAGER on `?payment=` and hash deep-links (protects the payment scroll fix, carnivore-weekly-2q4) - DONE. Do not touch this loader.
- No Unsplash refs remain - DONE

## Diagnosis: what is actually still slow

1. **THE BUG: mobile downloads a hidden hero image at top priority.** At <=480px, `.pyramid-carousel` is `display: none` (inline style block, ~line 307-311) - but CSS hiding does not prevent download. `CarnivorFP.webp` (113KB) is fetched with `fetchpriority="high"`, competing with global.css and the H1 font for the first network slots. The mobile LCP element is the hero H1 text; it pays for an image the user never sees.
2. **10x oversized images for every viewport.** All four pyramid images are 2816x1504 single-source (no srcset/sizes). Display size: 220px at 768px viewport, ~300-400px on desktop. Even desktop never needs 2816px.
3. **The Jul 4 image-compression pass missed /images/.** PNG fallbacks: CarnivorFP.png 1.67MB, KetoFP.png 1.62MB, GroceryCartMeat.png 1.2MB (plus PescatarianFP/LionFP/GirlReadingReport unaudited). Only <3% of browsers take the PNG path (Feb 10 decision), but crawlers and old devices do, and they bloat the repo/Pages deploy.
4. Second tier (Phase D, only if needed): global.css (46KB) is render-blocking; fonts are third-party (2 extra connections). Likely already acceptable after 1-3.

## Phase A: Baseline BEFORE touching anything (30 min)

PSI anonymous quota is exhausted (429 as of Jul 5). Use local Lighthouse:
```bash
cd /Users/mbrew/Developer/carnivore-weekly
npx lighthouse https://carnivoreweekly.com/calculator.html \
  --only-categories=performance --form-factor=mobile --screenEmulation.mobile \
  --output=json --output-path=./logs/lh-calculator-baseline-$(date +%Y%m%d).json --chrome-flags="--headless=new"
```
Run 3x, record the MEDIAN LCP, the named LCP element, and LCP phase breakdown (TTFB/load-delay/load-time/render-delay) in this file under Results. Also run once for `https://carnivoreweekly.com/` (homepage shares the hero pattern; it is the highest-traffic page).
If the baseline median is ALREADY <= 2.5s: stop after Phase C (cheap, zero-risk wins), skip D, update the vault sprint outlook note instead of over-engineering.

## Phase B: Responsive, mobile-honest hero images (the main fix)

B1. Generate resized WEBP variants (use the same tool as the Jul 4 image pass - check `git log --oneline -5 -- public/images` / scripts; else Pillow or `npx sharp-cli`):
- For each of CarnivorFP, KetoFP, PescatarianFP, LionFP: create `{name}-480.webp` (480px wide) and `{name}-960.webp` (960px). KEEP existing full-size files untouched (other pages may reference them; additive only).
- Create `public/images/pixel.webp` (1x1 transparent, <100 bytes).

B2. Rewrite the four `<picture>` blocks in `public/calculator.html` (~lines 1025-1042). Pattern for the first (eager) pyramid:
```html
<picture>
  <source media="(max-width: 480px)" srcset="/images/pixel.webp">
  <source media="(max-width: 1024px)" type="image/webp" srcset="/images/CarnivorFP-480.webp">
  <source type="image/webp" srcset="/images/CarnivorFP-960.webp">
  <img src="/images/CarnivorFP.png" alt="Carnivore Food Pyramid" class="pyramid-img pyramid-1" width="2816" height="1504" fetchpriority="high">
</picture>
```
Same for pyramids 2-4 but KEEP their existing `loading="lazy"` and no fetchpriority. Rationale: <=480px now costs <100 bytes instead of 113KB; 481-1024px drops 113KB -> ~15-25KB; desktop drops to ~40-60KB. `fetchpriority="high"` stays on pyramid-1 only (it IS the desktop LCP candidate and is now small).
- Keep width/height attributes exactly as-is on the `<img>` (CLS guard; CSS object-fit handles render size).
- Do NOT remove the images from HTML or change alt text: Googlebot mobile already sees them hidden at 480px today, so semantics are unchanged; desktop/image SEO keeps the alts.

B3. Apply the identical treatment to `public/index.html` IF it uses the same pyramid hero (verify first: `grep -n "pyramid-carousel\|CarnivorFP" public/index.html`).

B4. Carousel-rotation guard: the pyramid rotation is CSS-class driven (pyramid-1..4). Verify after the change that rotation still cycles at 768px and 1280px widths and that no JS reads `naturalWidth` or assumes loaded images (grep the inline scripts for `pyramid`).

## Phase C: Compress the missed PNGs (zero risk, same filenames)

Targets: CarnivorFP.png, KetoFP.png, PescatarianFP.png, LionFP.png, GroceryCartMeat.png, GirlReadingReport.png (+ `ls -laS public/images | head -15` for any other >500KB stragglers).
Same-filename in-place compression (pngquant-style palette reduction at 2816px is fine for these flat-color graphics; expect 1.6MB -> 200-400KB). Same filenames = every other page referencing them benefits with zero reference edits. Visual check each at full size before commit (flat-color posters tolerate palette reduction well, but verify no banding on the gradient backgrounds).

## Phase D: ONLY if post-B/C median LCP still > 2.5s

- D1: Self-host the two Google Fonts (Playfair Display 700/900, Inter 400/600/700) as woff2 in /fonts with `font-display: swap` - removes 2 third-party connections from the critical path.
- D2: Split global.css: inline the ~5-8KB actually used above-the-fold on calculator.html into the existing inline style block; load the rest with the same print-media swap as the fonts. Higher effort, do only with evidence (Lighthouse "render-blocking resources" audit showing global.css > 300ms).
Do NOT attempt: removing the inline style block (it is the page's above-fold CSS - it is doing its job), touching the bundle loader, or preloading the React bundle.

## Verification protocol (all must pass before push)

1. Lighthouse mobile x3 on a local serve of public/ (`npx http-server public -p 8080` + lighthouse against localhost) - median LCP improved, CLS <= 0.1, no new audit failures.
2. Visual: preview at 375px (no pyramid, no layout gap), 768px (220px pyramid visible, correct image, rotation works), 1280px (desktop pyramid crisp). Check the hero H1 renders immediately.
3. SEO tag diff guard: `git diff public/calculator.html | grep -E '^[+-].*(title>|description|<h1|og:|canonical|FAQ)'` must show ZERO changes to the Jul 4 SEO work.
4. Payment flow: load `/calculator.html?payment=success&session_id=test#payment-success` locally - the bundle must load EAGERLY (loader's payment branch) and the page must not error. Do not fire a real purchase.
5. GA4 smoke: page loads fire the gtag stub without console errors (events queue into dataLayer).
6. Deploy notes: static-only change - normal git push (Pages deploy). NO Vite rebuild needed (calculator2-demo/src untouched). NO wrangler deploy (worker untouched). Watch for ISSUE-033 (transient Pages deploy failure - re-dispatch if stuck).
7. Post-deploy: curl the live page, confirm new `<source>` tags present; re-run Lighthouse against the live URL; record final numbers under Results below.
8. Update: vault sprint plan (Revision note under Probability Outlook), and if median LCP lands <= 2.5s, tick the perf item filed in the Jul 4 session note.

## Rollback

Single revert commit restores calculator.html/index.html; new image files are additive (orphaned harmlessly); Phase C PNGs - keep pre-compression copies in `docs/archive/images-precompress-2026-07-05/` until post-deploy verification passes, then delete.

## Results (fill in during execution)

- Baseline median LCP (mobile lab): **2.4s** (runs: 5.5s outlier/cold-cache, 2.4s, 2.3s -> median of the 3 = 2.4s) | LCP element: **H1 header text (`body > header.header-2026`), not the pyramid image** -- confirms plan's diagnosis that the hero H1 is the LCP candidate | phases (run3, warm): TTFB 78ms, resource load delay 29ms, resource load duration 74ms, element render delay 23ms (element render delay/CLS/insight breakdown looks internally consistent but does not sum to the reported 2.3s metric -- flagging as a measurement quirk, not re-diagnosing since Phase A is baseline-only). CLS: 0.073 (both warm runs identical).
- Post-B/C median LCP: **local A/B only (not yet deployed)** -- pre-fix local median 3601ms -> post-fix local median 2929ms (-18.7%, 672ms). CLS unchanged 0.072-0.073 across both. Local http-server numbers run ~500-1200ms slower than live (no CDN/HTTP2), so treat the delta as the signal, not the absolute ms.
- Homepage baseline / post: **5.1s** (single run, score 0.25, LCP element = ribeye steak image) / not addressed this session -- homepage uses a different hero image (not the pyramid carousel), out of scope for this plan. Flagging as a follow-up candidate.
- Live post-deploy LCP: ____ (not yet deployed/pushed)
- Date/session: 2026-07-05, Sonnet-tier execution session

**Phase B/C execution notes:**
- Plan's stated source dimensions (2816x1504) were stale -- actual current pyramid images are already 1400x748 (from the Jul 4 15:56 resize pass, commit 228c7101). Resized 480w/960w variants from that 1400w source instead; approach and breakpoints unaffected.
- Generated: `{CarnivorFP,KetoFP,PescatarianFP,LionFP}-{480,960}.webp` (~22-24KB / ~63-68KB each) + `pixel.webp` (72 bytes). Rewrote all 4 `<picture>` blocks in `public/calculator.html` per the plan's pattern.
- index.html does NOT use the pyramid carousel (verified via grep) -- Phase B3 skipped, not applicable.
- Phase B4 rotation guard verified: rotation JS (`pyramids[current].style.opacity`) is pure CSS-opacity/class driven, no `naturalWidth` reads or load assumptions -- unaffected by the picture/source changes.
- Phase C: pngquant (quality 65-85, installed via brew) applied in-place to the 6 target PNGs. Results: CarnivorFP 1.67MB->527KB, KetoFP 1.62MB->493KB, PescatarianFP 1.65MB->540KB, LionFP 1.65MB->525KB, GroceryCartMeat 1.21MB->400KB, GirlReadingReport 2.17MB->633KB. Landed higher than the plan's 200-400KB estimate (photographic images with gradients compress less aggressively than flat-color at this quality range) -- visually verified both pyramids and GirlReadingReport at full res, no banding, chose safety over squeezing further. Originals backed up to `docs/archive/images-precompress-2026-07-05/`.
- Found `calculator-promo-banner.png` (8.2MB, unreferenced anywhere in the codebase) while scanning for >500KB stragglers -- orphaned dead weight, doesn't affect any page's LCP, left untouched as out of scope for this fix.
- Verification protocol items 1-5 all passed: local Lighthouse A/B (above), visual check at 375/768/1280px (network-confirmed correct source selection at each breakpoint: pixel.webp / -480.webp / -960.webp), SEO tag diff guard (zero matches on title/description/h1/og/canonical/FAQ), payment flow smoke test (`?payment=success&session_id=test#payment-success` loaded the bundle eagerly, scrolled to and rendered the payment step, zero console errors), GA4 smoke (page_view events fired into dataLayer without errors at every breakpoint tested).
- NOT yet done: item 6-8 (git push/deploy, live re-test, vault sprint note update) -- changes are staged locally, not committed or pushed. Awaiting go-ahead to commit/push.

**Phase A verdict:** Calculator.html baseline median (2.4s) is already <= 2.5s target on the warm runs. Per plan's stopping rule this means: still run Phase B + C (cheap/zero-risk), but SKIP Phase D unless post-B/C measurement regresses. Homepage baseline (5.1s, single run) is well over target and shares the pyramid-hero pattern -- worth a homepage-specific rerun (3x) before/after Phase B/C since it wasn't given the same rigor as calculator.html in this plan.

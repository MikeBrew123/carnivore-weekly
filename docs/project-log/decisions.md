# Project Decisions

| Date | Decision | Why | Alternatives |
|------|----------|-----|--------------|
| 2026-09-05 | The last two of the three approved email bugs shipped (`030e33e9`, `34ba7355`). (a) The two calculator placeholder addresses that have never once been delivered to are retired, marked not deleted, reason string prefixed `retired-` so a future bounce audit cannot mistake them for provider bounces. (b) One shared fixture guard (`scripts/subscriber_hygiene.py`) now covers `send_drip.py`, `send_newsletter.py` and `send_coach_launch.py`; the first two had no guard at all. (c) The backup is enforced rather than remembered: `scripts/clean_subscribers.py` runs `backup_subscribers.py` itself and refuses to change a row without a clean exit, a crontab line holds the monthly floor, and the Monday heartbeat alerts if the newest backup passes 40 days | Brew, Command Deck `5d4dac87` 2026-08-31 by voice, "approve all three" and "If we have dead email addresses, let's lose them", verify check waived ("I think it's only a couple"), with his own attached condition "Maybe we should have a backup of our email list every time we clean it, save it"; cadence ruled 2026-09-01, re-confirmed in live chat 2026-09-05 08:09 PDT "yes to both, do them today". The first of the three (a ContentRejected bounce no longer suppressing a live reader) shipped in `7783a20c` and was confirmed running in production by the `bounce_subtype` key appearing in every `drip_events` row from 2026-09-01 onward and none before. Cleaned exactly 2 addresses out of 237, which is what he predicted | Add a `retired` status (rejected: DDL on the database CW and KD share, and `drip_subscribers` has no status column, so half the clean would still have used `bounced_at`); delete the rows (rejected: his 2026-09-02 no-mass-deletes rule, and a delete cannot be undone); widen the fixture rule to `test.ca` and `iambrew.com` (rejected: both are registrable, and blocking a real domain is the failure he warned about); retire on bounces too (rejected: that is the August defect that cut a live reader off at day 6 of 30) |
| 2026-09-03 | CORRECTION to the purge entry two rows down: the first purge was reported complete and was not. A second rewrite (`b378f2c7` on main; audit `80363d72`) finished it. Final verified state: zero real subscriber addresses on any branch or tag; ONE (a paid customer) still public in `refs/pull/45/head`, which no client push can reach | Three compounding failures, all worth keeping. (1) The local `.beads/beads.db` is gitignored and regenerates the tracked `.beads/issues.jsonl`; the rewrite corrected git objects and never touched the database, so `bd sync --flush-only` put eight addresses straight back. **A history rewrite does not reach data stores that regenerate tracked files.** (2) The pre-commit PII guard ran BEFORE the beads step that stages that file, so commit `6ff9f20e` published an address the guard never saw. The guard now runs last, at every exit path. (3) The verification was a fixed-string grep for 34 known addresses, run against the rewrite mirror rather than the remote, and the post-push check timed out and never finished while the report claimed it passed. Replaced with `scripts/audit-pii-history.sh`, which scans for ANY address and subtracts an allowlist. The corrected count: 11 people were public, not 34. The first inventory was run against Brew's working copy, which carries never-pushed branches holding the dashboard subscriber-list reports, and one of the 34 was a phantom the regex invented by reading backwards across a JSON `\n` escape | Trust the first verification (rejected: the coordinator reproduced the address live on `origin/main`); rewrite `main` only again without fixing the beads DB (rejected: the next `bd` flush would re-inject it a third time); claim completion (rejected: `refs/pull/*` is server-side and only GitHub Support can clear it, so anything else would be a lie by omission) |
| 2026-09-03 | Subscriber email addresses purged from this PUBLIC repo, history and all refs included. 34 addresses replaced with numbered `redacted-subscriber-NN@example.invalid` placeholders via `git filter-repo --replace-text --replace-message`; every branch and tag force-pushed. Backup mirror of the pre-rewrite remote kept | Brew's ruling, dictated 2026-09-03 05:18 PDT, Otter `-mUS8ylu_ZckZZBxH8K6i8b5Tiw`: "A subscriber's real email address is still sitting in the public GitHub... You say you've got to delete the rewrite the repo or whatever. Just fucking fix it... Their email address should not be sitting in the public GitHub repo. I'm not gonna email them. Let's just take it away and make sure it doesn't happen again." The exposure was far wider than the deck item said: not one address in one file but 34 people across 11 file paths, the largest being two generated dashboard reports (`weekly-report.html`, `executive-report.html`) that dumped the subscriber list into a public repo and are untracked at HEAD but were never purged from history. Commit `1738696b` shows a prior session redacting two paid-customer addresses at HEAD and leaving history alone, which is how they survived | Scrub `main` only (rejected: every one of the 18 refs carries PII-bearing blobs, so a main-only rewrite would have been a purge in name only); delete the offending files (rejected: the files are load-bearing, only the values are the problem); leave it and rely on obscurity (rejected outright); scrub the YouTube creator business contacts in `data/youtube_data.json` too (rejected for now: they are self-published business contact addresses scraped from public channel pages, not data anyone entrusted to us, and outside the approval's scope. Flagged for Brew) |
| 2026-09-03 | A committed pre-commit PII guard (`scripts/check-pii.sh`) now blocks any staged email address outside an explicit internal/test/service allowlist, and the report-output paths that captured live subscriber data are gitignored | "make sure it doesn't happen again" is half of what Brew asked for, and the purge alone does not deliver it. The guard follows the existing `scripts/check-secrets.sh` convention (committed script, wired as a hard block in `.git/hooks/pre-commit`), so it is reviewable and survives a fresh clone. Verified: blocks a planted subscriber-shaped address, passes every allowlisted form, and produces zero false positives across all tracked files | A history-scanning CI job (rejected for now: catches it after the push, which is exactly the failure mode we just spent an afternoon undoing); gitignore alone (rejected: the two dashboard reports were never gitignored, and a `git add -f` still beats it, which is why the guard scans staged content rather than paths) |
| 2026-09-03 | The KD day-2 drip email potassium figure is fixed (`7256b088`), superseding the same-day decision two rows down to leave it alone | Brew lifted the hold himself by dictation 2026-09-03 05:18 PDT, Otter `-mUS8ylu_ZckZZBxH8K6i8b5Tiw`: "fix the potassium numbers... Why wouldn't you fix the two-day keto dial email?... Let's fix anywhere and everywhere the potassium numbers are wrong." The earlier hold was correct on its own terms (a live send surface, no explicit word), and this is the word. The replacement copies `keto-flu-electrolyte-fix.html` verbatim, which is the post the email links to, so the click-through no longer shows two numbers for one mineral | Rewrite the bullet in our own words (rejected: a third variant of the same figure is exactly what the sweep exists to prevent); pause the drip cron to make the edit (rejected: copy-only edits touch nothing a running send depends on, so the pause would have been the larger risk) |
| 2026-09-03 | The Low Carb Food List page moves to KetoDial (parent `289f522c`, submodule `26315cd`), leaving a meta-refresh stub at the CW URL | Brew's call, dictated 2026-09-03 05:18 PDT, same Otter recording: "the low carb food list page. Move it to keto dial. Doesn't belong on Carnivore Weekly." It shipped on CW 2026-09-01 in `e05ca414` and the topic never fit a meat-only brand. Two things were fixed in the move: the CW original carried no nav block at all, so search traffic landed on a page with no way into the site, and the KD copy carries KD's real nav; and the printable CTA now points at the CW shop absolutely with a utm tag, because that is where the product actually lives | Delete the page outright (rejected: it is good content and a week old, and the URL is in the sitemap Google has already seen); leave a copy on both sites (rejected: self-competing duplicate content across two domains we own); a server redirect (rejected: GitHub Pages serves static only, and the repo's existing convention is the stub plus a `data/redirects.json` entry) |
| 2026-09-03 | Potassium sweep finished: the retired ranges are gone from the KD submodule and from the two pages the first pass missed (parent `50e84421`, submodule `500bed0`, following `a4cd3fac`) | Brew approved the whole class by dictation 2026-09-02 05:55 PDT, Otter `IxRtJ42QZYNfJyAyJA4bLJSzY28`: "Let's update all those potassium things. Why? Why keep old information? Yeah, I agree that if there's new information, we should update those documents to reflect it." The 2019 NASEM Adequate Intakes (2,600 mg women, 3,400 mg men) replaced the single 4,700 mg adult figure, so every old floor sat above current guidance for a readership that skews female and 45-70, and pushed exactly that reader toward the supplement aisle the posts steer her away from | Fix only the three KD posts named in the brief (rejected: the sweep grep found keto-insomnia-3am and the 2026-02-09 CW meal plan carrying the same defect); mass find-and-replace across both trees (rejected under Brew's 2026-09-02 rule, "I need to know what they are before you just mass delete things") |
| 2026-09-03 | The KD day-2 drip email keeps the retired 3,500-4,700 mg figure until Brew says otherwise, even though the same approval covers its content | It is a live send surface that real subscribers receive on a running cron, and the standing rule bars unattended edits to anything a running send depends on. Approval to fix a claim is not approval to touch the machinery mid-send | Edit it with the rest of the sweep (rejected: an unattended change to a live send is the exact case the rule exists for); pause the drip to make the edit (rejected: larger blast radius than the defect) |
| 2026-09-03 | The Etsy keto bundle template stays unedited | Its live artifact is an uploaded Etsy PDF, so a repo edit changes nothing a customer sees while creating a false record that the claim was fixed | Edit the template anyway (rejected: a fix in name only); regenerate and re-upload the PDF (out of scope, and Etsy publishing needs Brew's hands) |
| 2026-08-25 | Coach sold as a one-off $49 Payment Link, not through `handleCreateCheckout` | That endpoint requires `form_data` and writes `cw_assessment_sessions`; routing coach purchases through it would create phantom assessment rows and pollute `calculator_sessions_v2`, the paid-funnel KPI, and would mean deploying to the worker handling all live revenue for a 20-person pilot | Integrated checkout (deferred to cohort two, once proven); manual account creation (dead air after payment) |
| 2026-08-25 | The coach is a role, never a named person; system prompt forbids inventing a name or backstory | The coach AI touches Sarah's writer memory nowhere, so naming it Sarah would build a link that does not exist and let coaching reshape her editorial voice; Keren takes over delivery later so the persona must survive a change of human; and a fictional coach was the one dishonest element in a product sold on honesty | Keep "Coach Remy" (reads young for a 67%-over-45 audience, and Keren would have to perform it); use Keren's name now (commits her before she has decided) |
| 2026-08-25 | Launch email sent via a dedicated script, not `send_newsletter.py` | That script suppresses everyone mid-drip so the weekly does not stack on drip emails — correct for the weekly, wrong here: 79 of 139 reachable CW addresses are mid-drip, so reusing it would drop 57% of the audience | Reuse the newsletter path (loses over half the list); suppress nobody and send from scratch (loses the tested unsubscribe handling) |
| 2026-08-25 | About states that articles are *reviewed against a written standard*, and only person-to-person replies get "read by a human, no exceptions" | Brew skims plenty of what publishes and would not defend "a person reads every article"; About is exactly where a sentence gets quoted back at you. Splitting the claim made the true half stronger | Blanket "we read everything" (overclaim Brew rejected); say nothing about process (leaves the AI use undisclosed on the page people check) |
| 2026-08-25 | `package-lock.json` un-ignored for `ketodial/coach-app` only | Repo-wide lockfile exclusion made Vercel builds non-reproducible; it installed newer transitive versions than the code was written against and every production deploy failed. A narrow negation fixes it without committing lockfiles repo-wide | Un-ignore lockfiles everywhere (large, unrelated churn); pin stripe exactly (fixes one package, leaves the class of bug) |
| 2026-07-27 | Raw Stripe "checkout sessions started" is not a funnel-health signal; the paid-funnel KPI is non-QA `calculator_payment_modal_opened` | Session counts are dominated by shop-button bot bursts and QA tests (the 17→4 "drop" was entirely noise; real organic starts ~0/wk all along) | Keep watching raw session counts (produced this false alarm); alert on completions only (misses upstream breaks) |
| 2026-07-19 | Drip urgency must be Stripe-enforced or absent: per-subscriber minted codes w/ real 48h expiry; fallback copy makes no time claim | Sarah was claiming a 48h expiry on a code that never expired; honest urgency converts without lying | Fake countdown copy (removed); no urgency at all (loses conversion) |
| 2026-07-19 | Calculator head terms belong to the BLOG POST; calculator.html owns the animal-based cluster; anchors follow | Google already chose the post (pos 5.7-7.6 vs page's 28-35); fighting the split loses both | 301 the post into the page (risks losing earned rankings) |
| 2026-07-19 | Etsy sellers frozen by receipt-verified listing-ID allowlist during optimization; additive file changes only with explicit approval | "Don't touch the ones selling" — enforcement in code, not judgment calls | Title-matching (receipts vs titles drift) |
| 2026-07-19 | Product line = N-day calorie-specified meal plans per diet; all macros computed from ingredients.json, never hand-written | Bestseller-format evidence in every diet SERP; computed macros keep title claims literally true | More reference charts (traffic proven but 0.14% conversion) |
| 2026-07-19 | Mega bundle relaunched at $39.98 anchor in the Aug-15 sale ($19.99) | Components list ~$74.86 so anchor is real; flat $19.99 read as "not a deal" in a shop where 25 listings show 50%-off | Keep flat price (visual disadvantage); higher anchor (dishonest) |
| 2026-07-19 | Drip check-in answers are anonymous-only (fingerprint dedup, never identity) | Aggregate data drives content/product decisions; symptom data + identity would be health data with real privacy obligations | Linked-journey tokens (rejected by Brew — privacy first) |
| 2026-07-19 | No fabricated seed data in check-in results, ever | Standing no-fabricated-data rule; fake social proof shown to real subscribers kills the original-data flywheel if discovered | Brew floated fake seed rows deleted at n=100 (withdrawn after pushback); real bridge stats + founder framing instead |
| 2026-07-19 | Full 30-day rollout same day, pilot gate waived | Deliverability risk of one own-domain link doesn't scale with template count; 45 mid-journey subscribers' data unrecoverable if delayed to mid-Aug | Day-1-only pilot for 3-4 wks (original plan, superseded by Brew) |
| 2026-07-19 | Check-in grid wording FROZEN across days; changes need a new question_key | Identical wording is what makes cross-day trends valid | Editing question text in place (breaks all trend data silently) |
| 2026-07-19 | Calculator embed of check-in parked (bead rh19) | Don't clutter the revenue funnel; free→paid is the constraint | Embed for faster n (rejected by Brew until data proves the loop + mock approved) |
| 2026-07-19 | journey-checkin.html: noindex + 200 + out of sitemap | Correct GSC hygiene for a utility page; sitemap inclusion would create "submitted but noindex" warnings | Indexing it (no search value, thin-content risk) |
| 2026-07-13 | Calculator Growth Team = lean (4 role agents + main-session director, reuse Sam for analytics) | Runs inside the subscription; avoids a 6-agent committee's overhead for a solo operator | Full 6-agent build per the GPT prompt (rejected — process theater) |
| 2026-07-13 | Baseline before targets: verify funnel from Supabase census + Stripe before committing to conversion goals | Caught that the brief's "email leak" was false (74% capture); real constraint is free→paid | Accept the prompt's targets as-is (rejected — would have chased a phantom) |
| 2026-07-13 | At current volume (~30 free-results/mo) make directional fixes vs census data, not A/B tests | Sample size too small for valid split tests; A/B would manufacture false confidence | Run A/B tests now (rejected — underpowered) |
| 2026-07-13 | $29 calculator report stays priced in USD, not CAD | Round $29 USD reads better to a mostly-US audience than the post-exchange CAD figure | Convert to CAD (rejected by Brew) |
| 2026-07-13 | Hold the free→paid offer rewrite (EXP-001) until the micro-survey collects ~1 week of answers | Learn what buyers actually want (offer-message fit) before guessing at sales copy (Hermes rec) | Rewrite offer copy now (rejected — guessing) |
| 2026-05-19 | CLAUDE.md = prescriptive rules only; facts go to memory files | Reduces context window waste, makes rules findable, prevents bloat | Keep everything in CLAUDE.md (rejected — 1012 lines was unmanageable) |
| 2026-05-19 | Root CLAUDE.md is global (all projects); project CLAUDE.md is CW-specific with zero overlap | Prevents contradictions, root serves 7+ projects | Single CLAUDE.md (rejected — CW rules don't apply to FireSmart/MyBudget) |
| 2026-05-19 | Casey, Jordan, Alex, Eric, Sam agents deprecated and deleted | Functionality covered by built-in skills; agents hadn't been used in months | Keep agents (rejected by Brew) |
| 2026-05-19 | CW goals need monthly review with Sarah and writer team | Goals went 3+ months without review; priorities drift | Set-and-forget (rejected — led to stale goals) |
| 2025-01-02 | Use Quinn as operations manager for project logging | Centralized coordination and institutional memory | Manual logs, distributed tracking |
| 2025-01-02 | Implement daily/status/decisions log structure | Clear separation of concerns, easy to search and review | Single monolithic log file |
| 2025-01-02 | Store logs in docs/project-log/ | Versioned with git, accessible to all team members | Local .claude only, separate system |
| 2025-01-02 | All markdown cleanup extractions to Supabase via Leo before archiving | Preserve institutional knowledge as system-of-record; prevent knowledge loss during file organization | Keep all files, no extraction process |
| 2025-01-02 | Technology stack locked (Python 3.9, Claude AI, GitHub Pages, Supabase PostgreSQL) | Stability for 2026; proven in Phase 2 | Changes require CEO approval only |
| 2025-01-02 | Validation pipeline (Copy-Editor, Brand, Humanization) is non-negotiable | Quality is brand moat; all content must pass 3 validators | Trade quality for speed (rejected) |
| 2025-01-02 | Bento Grid launch locked to Jan 27, 2025 | Fixed deadline, contingency Feb 3; CEO-approved | Continuous feature release (rejected) |
| 2025-01-02 | Phase gate process prevents scope creep | 129 hours locked; 137-hour contingency buffer | Open-ended timeline (rejected) |
| 2026-01-19 | WCAG 2.1 AA as accessibility validation standard | Industry standard, legally defensible, ensures readability for all users | WCAG AAA (too strict), no standard (risky) |
| 2026-01-19 | Color contrast minimum: 4.5:1 for normal text, 3:1 for large text (18pt+) | WCAG 2.1 AA compliance requirement | Lower ratios (fails accessibility), higher (unnecessary) |
| 2026-01-19 | Light cream (#e8dcc8) for body text on dark backgrounds | High contrast while maintaining brand warmth; passes WCAG validation | White (too harsh), gray (insufficient contrast) |
| 2026-02-09 | Book references use Amazon affiliate links (title-only); studies use PubMed links (full citation) | Revenue via affiliate links on books; credibility via PubMed for research claims | No affiliate links (lost revenue), inline citations only (harder to verify) |
| 2026-02-09 | Hardcoded wiki links and featured video sections removed from blog template | Every post was showing cholesterol/electrolytes/digestion links and Anthony Chaffee video regardless of topic | Keep hardcoded (irrelevant to most posts), make dynamic per-post (more complexity) |
| 2026-02-09 | Content agents receive clean briefs -- no template HTML in content fields | Agents were baking template structure into content, causing duplication | Let agents include structure (causes duplication), post-process to strip (fragile) |
| 2026-02-12 | Publishing cadence increased to 2x/week (Sunday + Wednesday midnight UTC) | Doubles content output without manual intervention; both runs use same gated pipeline so quality is maintained | Weekly only (slower growth), daily (too aggressive for current content volume) |
| 2026-02-12 | Supabase keep-alive interval set to every 3 days via GitHub Actions cron | Free tier auto-pauses after 7 days inactivity; 3-day interval gives comfortable margin without excessive pings | Daily (wasteful), weekly (too close to 7-day limit, risky if a run fails) |
| 2026-02-12 | Orphan redirect stubs removed; redirects.json trimmed to 3 wiki redirects only | 13 old 2025-01-XX redirect HTML files caused 13 pre-commit warnings every commit; files served no purpose since original URLs were never indexed | Keep files (permanent noise in pre-commit), suppress warnings (hides real issues) |
| 2026-02-13 | Infrastructure phase declared complete; pivoting to traffic/growth | Pipeline gated, backlog empty, 2x/week automation live, Stripe checkout operational, 50+ posts published. No more infrastructure work moves the needle — traffic does. | Keep building features (diminishing returns), paid ads first (expensive without data) |
| 2026-02-15 | N8N webhooks deregister on server restart; added deactivate/reactivate to troubleshooting playbook; weekly health check should verify all webhook workflows respond | Webhook for drip welcome email silently stopped working after N8N server restart. Form submissions returned 404. Without health checks, this would go undetected indefinitely. | Assume webhooks are stable (they aren't), manual checks only (too unreliable) |
| 2026-02-15 | Always test full user-facing flow (form to webhook to DB to email), not just individual components | Webhook was confirmed working in N8N UI but form submissions failed because webhook URL was deregistered. Component-level testing missed the integration gap. | Test components individually only (misses integration bugs), rely on user reports (too slow) |
| 2026-02-23 | Migrate all email systems from N8N/Resend to MailerLite | MailerLite provides built-in automation, group management, and deduplication. Eliminates N8N webhook fragility (deregistration on restart). Single platform for drip + newsletter. | Keep N8N+Resend (fragile webhooks), Mailchimp (more expensive), ConvertKit (overkill) |
| 2026-02-23 | Route all client-side forms through Cloudflare Worker — no Supabase keys in browser JS | Supabase anon key was rotated (breaking feedback form). Worker uses service role key server-side, eliminating client-side key exposure. Consistent pattern for all 3 forms. | Update anon key in JS (still exposes keys), use Supabase Edge Functions (extra layer) |
| 2026-02-23 | Drip-to-newsletter handoff via MailerLite "Copy to groups" after Day 7 | Automatic migration from drip to newsletter. MailerLite deduplicates natively, so users who signed up for both don't get double emails. | Manual migration (error-prone), separate webhook (unnecessary complexity) |
| 2026-02-23 | Fix generated page validation at the TEMPLATE level, not output files | archive.html lost skip-nav and JSON-LD 3 times because fixes were patched to the output file, which gets overwritten on every regeneration. Fixed the source template instead. See recurring-loops.md Loop 12. | Keep patching output (breaks on regeneration), exclude archive from validation (hides real issues) |
| 2026-02-23 | daily_publish.py blocks on critical (exit 1) only, not warnings (exit 2) | Validator exit codes: 0=clean, 1=critical, 2=warnings. Previously ANY non-zero blocked publishing. Warnings (missing skip-nav, JSON-LD) should not prevent blog posts from going live. | Block on all issues (too strict, blocks posts), ignore validation entirely (too loose) |
| 2026-02-26 | Use update-blog-post.py (remove-then-insert) pattern instead of add-blog-post.py for iterative content updates | Running add script multiple times creates duplicates in blog_posts.json. Update script removes all matching slugs first, then inserts — safe for multiple runs. | Add script only (risky on re-runs), manual JSON editing (error-prone) |
| 2026-02-26 | CTR optimization via title/meta rewrite for high-impression/zero-click posts | Adaptation timeline had 1,590 impressions at position 2-4 with 0 clicks — a pure SERP presentation problem. Fixed with keyword-matched title + concrete week-by-week meta preview. | Add more content (unnecessary — already ranking), build backlinks (wrong problem), ignore (wasted impressions) |
| 2026-02-26 | Always verify exact-match keywords appear in body text, not just title/meta/URL | SEO audit found the calculator hype post had zero target keywords in the article body. Title and meta alone aren't enough — Google needs keyword context in the content. | Trust title/meta only (insufficient), keyword stuff (penalized) |
| 2026-04-07 | Writer agents get full names, conference memories, and E-E-A-T rules | Google E-E-A-T audit scored posts ~62/100 — author identity too weak, no experience signals, content looks like generic AI output | Keep first-name-only (fails E-E-A-T), add disclaimers (doesn't help ranking) |
| 2026-04-07 | Cross-referencing limited to previous week's articles only | Writers batch-write for the week ahead; can't reference articles that aren't published yet | Allow any article (risks broken links), no cross-refs (misses internal linking) |
| 2026-04-07 | Amazon affiliate discontinued; focus on LMNT + ButcherBox only | Amazon warned insufficient traffic to maintain affiliate status | Keep Amazon (risk deactivation anyway), add more affiliates (too many for current traffic) |
| 2026-04-07 | Posts stay status="ready" for daily-publish automation; never manually flip to published | Manually publishing Sarah's Apr 8 post caused it to appear on the index before HTML existed, resulting in 404 | Manual publish (index/HTML desync risk), separate index generation (unnecessary complexity) |
| 2026-04-13 | daily-publish.yml must `git add -A` before `git diff --staged` to detect new files | `git diff --name-only` only sees tracked file modifications; new HTML files are untracked and invisible. Caused 5-day silent publish failure (Apr 8-12). | Use `git status --porcelain` (harder to parse), use `ls` on output dir (fragile) |
| 2026-04-13 | Etsy buyer messages should reference all supported diet types, not just carnivore | 4/4 Etsy sales are non-carnivore (keto, lion, pescatarian). Old message said "if you're eating carnivore" — excludes majority of buyers | Keep carnivore-only messaging (alienates buyers), remove diet references entirely (loses specificity) |

## 2026-07-01 — Calculator pricing freeze + KD quality gates
- **Hold CW calculator at $29 ($14.99 sale through Jul 4) for 90 days.** The only real sale (Jun 28, verified in Stripe) came at full $29 with no coupon. At ~100 visitors/month, price changes produce no learnable signal; traffic is the constraint.
- **Calculator's primary job is email capture; the 7-day drip is the sales vehicle.** Audience (66% 45+) doesn't impulse-buy from first visit.
- **Pinterest capped at 10 pins/day** on the new account (spam-filter threshold). Automation: scheduled task pinterest-kd-daily-pins.
- **KD date integrity:** replaced fabricated 2025-01-01 datePublished (64 recipes) with staggered ≤2/day dates; same rule for blog. Date clustering was a scaled-content signal blocking Google indexation.
- **KD recipe net-carb ceiling:** rejected a 4.9★ recipe at 13.2g net carbs/serving — nothing over ~10g net goes on a keto site's recipe library.

## 2026-07-04 (PM) — Diet-based signup routing + direct-sales direction
- **Non-carnivore calculator signups no longer enter the carnivore drip.** Routing by `diet_type` at the results-page opt-in: carnivore → CW 30-day drip; keto/low-carb → KetoDial newsletter + a KD-branded welcome email (first touch, since they likely don't know KD exists); pescatarian → held on CW newsletter (no home yet), no drip; unknown → CW drip (safe default). Rationale: completing a *carnivore* onboarding is a stronger signal than a stale calculator checkbox — don't push a graduate toward keto. Reused the worker's existing site paths (kd = newsletter-only), so it's a small branch. All paths verified live.
- **day-28 finale unified (keto variant retired).** One warm carnivore finale with a *soft* "if strict carnivore was too much, keto keeps most of the wins" KetoDial off-ramp people self-select into — not a reassignment. Removed the `diet_type` router from send_drip.py.
- **Direction, gated on KetoDial proving out:** (1) sell printables/digital products **direct via our own Stripe checkout** to owned audience (drip, newsletter, calculator finishers) instead of paying Etsy commission — Etsy kept for cold discovery only; (2) a **"Dial" brand family** (LowCarb-Dial, Pesc-Dial, rebrand CW to Carnivore-Dial) so each diet has a home and cross-promotes; (3) the "held" diet segments get a diet-specific printables newsletter. All one initiative. Filed as backlog beads carnivore-weekly-8ds (direct-sales) and carnivore-weekly-mxb (Dial family). Do not start until KD shows real traction (currently 0 search traffic, 0 backlinks, $0 Coach MRR).
- **Model tier:** used Fable for the payment-flow scroll-race fix; Brew authorized it given time/budget slack, noted it deviates from the sprint's Opus-default for money-path code.

## 2026-07-04 (Day 4) — Durability + monitoring decisions
- **Blackout policy: accept-gap for Mac-bound Claude tasks, move only the dashboard cron.** Content gen, Pinterest, GSC sweep, and the Sunday refresh task all pause harmlessly when the Mac sleeps (queues buffer ~5-7 days; watchdog alerts). Pre-absence checklist (>5 days away): one extra content-gen run + pin queue to 100+. Only the dashboard sheet cron moves to GHA (`dashboard-update.yml`, gated on secrets Brew adds; Mac cron stays until first green run). Rejected: migrating Claude scheduled tasks to CI — they need Claude auth + logged-in Chrome; cost exceeds a two-week reporting gap.
- **Staleness monitoring is two-sided by design.** GHA can't see Mac logs; the Mac can't be trusted to report its own death via a log nobody reads. So: `automation-staleness` job in weekly-health-check.yml (workflow recency, pin-queue commits, newest published post) + `scripts/heartbeat_check.py` Mon 10:45 UTC cron that EMAILS on problems via Resend (a silent log line is not an alert — receipts-flow lesson). Live test caught 3 genuinely dead LaunchAgents on day one.
- **Zombie scheduled tasks deleted, not disabled** (pipeline-health-check with dead Hermes IP, cw-pipeline-dry-run): a disabled task with wrong instructions is a re-enable landmine. Moved to Trash, replaced by the staleness monitoring above.
- **weekly-update.yml push race (ISSUE-036): rebase-retry with `-X theirs`.** Generated files should always win a rebase replay; 3 attempts. Rejected: dedicated output branch (bigger change, deploy reads main).
- **Beehiiv/MailerLite purge done in code, one live consumer left deliberately:** `generate_site_report.py` still reads the MailerLite key (called by weekly-update) — filed as a bead to port to Supabase counts rather than hand-edit a 300-line report script at sprint end.
- **Operator Handbook is the weekly entry point** (`Brew-Vault/04-Systems/Projects/Carnivore-Weekly/Operator-Handbook.md`, CLAUDE.md trigger "run the week"). Standing decision rules live there; weekly sessions don't re-litigate pricing/ads/gates.

## 2026-07-09 — Coach program shape, shop, currency, email identity
- **Carnivore Coach = 12-week cohort program, not open subscription.** Audience's #1 stated failure is consistency; the finish line is the selling point. $79 one-time. Alumni maintenance tier later. $10 = single extra check-in à la carte (NOT a monthly add-on — Brew explicit). Keren (dietitian, on carnivore) as % -paid human layer if busy. Waitlist gate pre-agreed: 5+ signups → build; 0 → drop.
- **Sell direct on-site, keep Etsy as discovery.** Site margin ~97% vs Etsy ~90%, and buyer emails land in our funnel. CW carnivore products / KD keto products, never crossed.
- **Fulfillment = email the PDF; the thank-you email carries ONE soft upsell personalized to the purchase.** Delivery tracked via existing Resend webhook; paid-but-undelivered alerts immediately.
- **All selling prices in USD** (calculator parity), stated once per page in fine print (Canadian business → ambiguity risk under Competition Act).
- **Customer replies never go to iambrew@gmail.com.** Branded addresses only (newsletter@/sarah@ etc.), now that Resend receiving is enabled. System notifications to Brew's Gmail are fine.
- **KD stays on free Resend plan** (1 domain); KD uses CW-domain addresses until KD revenue justifies $20/mo Pro.
- **Tracker spreadsheet bead closed as superseded** — July 4 roadmap kill-list forbids generic trackers; High-Protein Food List is the sanctioned next SKU.

## 2026-07-11 — Email-leak remediation closed out
- **No breach notification to affected subscribers.** ~21 real addresses (19 subscribers + paying customers) sat in the public repo's dashboard reports/docs for days-to-weeks; addresses only, no payment or health data; repo had 0 stars/forks/watchers, so realistic exposure ≈ nil. Brew decided notification is not warranted. Remediation done instead: HEAD scrubbed, full filter-repo history rewrite force-pushed same day (ISSUE-044, beads carnivore-weekly-8j4d), all clones reset.
- **Remaining open item:** Brew files GitHub Support ticket to purge server-side cached objects + old PR refs (#1, #45) — last place one customer email is still fetchable.

## 2026-07-23 — Coach waitlist gate extended, not dropped
- **Carnivore Coach waitlist stays open; gate review date moves from ~2026-07-23 to 2026-08-31.** Source: Brew's 2026-07-23 voice journal ("we're gonna hold on to the keto coach... We asked people to sign up. We'll just extend that and see if we can get more people on."). This supersedes the "0 signups after ~2 weeks = drop" half of the 2026-07-09 gate for the extended window; the 5+ signups = build threshold is unchanged. No weekly session should invoke the drop rule before 2026-08-31.
- **No code change was required, and none was made.** Verified 2026-07-23 window: the signup path has no date cutoff, no closed flag, and no config row anywhere. Both capture surfaces insert unconditionally (`handleCoachWaitlist` in api/calculator-api.js for /coach.html, and ketodial/coach-app/src/app/api/waitlist/route.ts for the KD landing form), and no scheduled task or cron closes the waitlist. The gate was only ever a human decision rule recorded here, in current-status.md, and in memory project-carnivore-coach.md. Extending it is a documentation change by design.

## 2026-07-28 — Publish guard: missing image defers the post, never blocks the pipeline
- **A ready post whose image file is absent gets deferred to the next daily run, not published without an image and not allowed to fail the deploy.** Rationale: the image/post race is cross-job (local content task vs GH Action refresh) and cannot be ordered reliably; deferral is self-healing via the existing `publish_date <= today` backlog rule and costs at most one day of delay. Implemented in `daily_publish.py` (`split_missing_images`), commit d03e207b.
- **Pipeline commits use scoped `git add` path lists only — never `git add .` / `git add -A` at repo root.** Sweeping the working tree repeatedly pulled ~200 unrelated local changes into weekly commits. Scoped list: `data/ public/ images/ templates/ newsletters/ ketodial/`. Legacy root paths stay out of `weekly-update.yml` so the removed `blog/blog/` mirror cannot return via CI.

## 2026-07-28 — Editorial rebalance: write for the audience we actually have
- **Writer mix goes 3/3/3 → Sarah 5 / Marcus 2 / Chloe 2 per 9-post CW batch.** Data basis (audience deep dive, this date): 190 calculator sessions = 64% aged 45+, 58% female, 87% weight-loss goal; the only 2 buyers ever are women 69 and 72, both referred by evergreen practical guides; GSC clicks concentrate on calculator-intent + symptom/troubleshooting content while Marcus athlete posts and Chloe debate posts get near-zero traffic. Changed: scheduled task `weekly-blog-content-generation` SKILL.md (live brief), `scripts/weekly_content_prompt.md` (manual fallback), `agents/marcus.md` + `agents/chloe.md` ownership/context, and `audience_insight` memories inserted for all three writers (writer_memory_log ids 333-335).
- **Topic assignment rule: no target search query, no assignment.** Community trends supply language only; Chloe's Topic Brief Gate scores every topic. Marcus athlete topics capped at 1 in 4; Chloe debate/creator-drama coverage dropped.
- **Guardrails:** treat as a 6–8 week repositioning measured on calculator starts from new posts, email captures, and sales — not an irreversible pivot; n=2 buyers is too thin to target "65+ women" specifically, so the aim point is the well-evidenced 45–70 weight-loss reader. Phases 2–6 (calculator CTA block, SEO rescue, $29 report copy, bento reorder, drip audit) tracked in beads carnivore-weekly-eq28/v9px/8iwy/o3v3/l4ba.

## 2026-08-10 -- KetoDial publishing cadence cut from ~7/week to 2/week (Tue+Fri)
- **KD now publishes exactly 2 posts a week, on Tuesdays and Fridays.** Approved by Brew by voice 2026-08-09 ("if you think cutting the volume down to two articles a week will help, let's do it"). Basis: the 2026-08-08 crawl diagnosis (`Brew-Vault/04-Systems/Projects/Carnivore-Weekly/reports/ketodial-crawl-diagnosis-2026-08-08.md`) ruled out every technical cause and landed on algorithmic trust suppression. ketodial.com is a dropped-and-re-registered domain (created 2026-05-30) that grew to 140+ AI-assisted pages in 9 weeks with zero earned backlinks; Googlebot last crawled anything on 2026-06-04 while still downloading the sitemap daily. Brew has since confirmed GSC shows NO manual actions, so volume is a liability that reinforces the scaled-content pattern, not an asset.
- **The control point is the generation task, not the publisher.** `daily_publish.py` is purely date-driven (`status == "ready" and publish_date <= today`) and has no per-run or per-site cap, and `daily-publish.yml` runs daily for both sites. Cadence is therefore set entirely by the publish_date spacing that the content task stamps on new posts. Changing the publisher or its cron would have hit CW too.
- **What changed, all of it in the `kd-blog-content-generation` scheduled task** (`~/.claude/scheduled-tasks/kd-blog-content-generation/SKILL.md`, outside the repo so it is not version controlled here): batch size 6 posts -> 2; publish-date assignment changed from "one per day across 6 consecutive days" to the next 2 Tuesday-or-Friday slots after both the latest existing KD date and today; queue skip threshold 7+ ready -> 2+ ready; and the schedule went from `30 4 * * 2,5` (Tue+Fri) to `30 4 * * 6` (Saturday), so a single weekly run fills the coming week's two slots. A standing "do not raise this" note with the SEO rationale was added at the top of the file so a future session does not quietly restore 6.
- **Existing queue left alone to drain, nothing deleted.** At the time of the change 2 KD posts were still `ready` (2026-08-10 and 2026-08-11); they publish on their original dates and the new cadence takes over from the 2026-08-15 generation run, whose first slots are 2026-08-18 and 2026-08-21. Note for future sessions: local `data/blog_posts.json` was a commit behind and still showed the 2026-08-09 GLP-1 post as `ready` when it had already gone live in `3dfcf8ef`. Always `git pull` before reasoning about queue state.
- **Carnivore Weekly is untouched.** CW cadence lives in the separate `weekly-blog-content-generation` task (Sun+Wed, 9 posts) and no CW post, workflow, schedule, or queue entry was modified.
- **`blog-queue-watchdog.yml` deliberately left at its 5-day staleness threshold.** Under a steady Tue/Fri cadence the largest gap seen from a Mon/Thu check day is 3 days, so 5 stays correct and still catches a real stall fast. It will raise one expected false alarm on Mon 2026-08-17, because the transition leaves a one-time 7-day hole between the last daily-cadence post (08-11) and the first new-cadence post (08-18). Close that issue rather than loosening the threshold.
- **Revisit trigger is evidence, not a date:** raise cadence only once `lastCrawlTime` for ketodial.com starts moving again. The weekly `weekly-gsc-indexing` task already reports it.

## 2026-08-10

- **Brew granted standing permission for changes to his own Etsy shop and his own websites**, in
  chat at 05:07. This scopes his 2026-08-04 "never for anything public" rule down to third
  parties. Condition: every live change is logged in `Brew-Vault/00-Core/Live-Changes-Log.md`
  with what, why and how to undo, TLDR only. Third-party contact, public posting elsewhere, and
  anything that spends money still require his explicit go each time. This unblocked four items
  that had been approved between three and five times each and had never shipped.
- **KetoDial cadence cut 7 posts a week to 2, Tue and Fri.** Approved by voice 2026-08-09. The
  control point is the `kd-blog-content-generation` scheduled task, NOT `daily_publish.py` or
  `daily-publish.yml`, which are shared with Carnivore Weekly and have no per-site cap. Never
  change one site's cadence at the publisher.
- **Saladino attribution shipped**, commit `ffd791af`. The credit links to `paulsaladinomd.com`,
  his personal site, deliberately not to `heartandsoil.co`. Heart & Soil is a planned CW
  affiliate, so crediting him through a monetized link would contradict his own "fans, not
  thieves" condition. The existing Heart & Soil link elsewhere on the page was left alone.
- **Inherited domain toxicity is off the table for KetoDial.** ketodial.com was a typo-catcher
  for a CBD shop's "Ketodiol" product line, never a real site, four archive captures with no
  content, no spam history to be punished for. External links are now the only remaining lever
  on crawl demand. Corrects the 2026-08-08 diagnosis, which called the Dec 2021 parking lander
  "a live site".

### Etsy API lesson, cost ten minutes of live damage
`updateListing` with an `image_ids` array **deletes images**. Etsy's form encoding keeps only the
last value, which wiped 7 of 8 images on listings 4464217679 and 4464217699 before recovery from
local full-resolution copies. Etsy also ignores image order unless an explicit `rank` is passed
on upload. To reorder, POST to the images endpoint with `listing_image_id` plus `rank`, and
resend `alt_text` because it gets cleared. Always download originals before touching images.

## 2026-08-31 - Pre-July archive remediation shipped (commit 9d64b169)

Executes the 2026-08-25 board approval, acting on
`Brew-Vault/04-Systems/Projects/Carnivore-Weekly/reports/content-quality-review-2026-08-24.md`.
Full write-up: `Brew-Vault/.../reports/archive-remediation-2026-08-31.md`.
Commits: `9d64b169` here, `40df6f7` in the `ketodial/public` submodule (both pushed).
32 posts changed, 28 CW and 4 KD, 100 individual claim corrections.

**PROTEIN DENOMINATOR RESOLVED. The house standard did not move.** The self-flagged VERIFY in
`docs/house-claims.md` is closed: the denominator stays GOAL body weight and the CALCULATOR is
the side out of sync. Verified in code, not assumed: `calculations.ts:147` computes
`protein = Math.round(bodyweightKg * 2.0)`, which is 0.91 g/lb of CURRENT weight, and no
`goalWeight` field exists anywhere in `calculator2-demo/src/`. One partial guard already exists
at `calculations.ts:73` (BMI 30+ bases protein on the reference weight at BMI 25). Keto and
low-carb use 25% of calories, a third formula. Reasoning is written into the house-claims
changelog so the next writer sees it there rather than only in the vault.

**The how-fast ruling and the denominator were never technically coupled, and the report says
so.** Deck `ae2f286d` governs the deficit selector at `Step2FitnessDiet.tsx:120-125`, which
feeds CALORIES only; protein never sees the deficit value. What actually blocked this task was
the decision-ledger instruction of 2026-08-28, "do not re-raise it in a new form while the
sharper question is live". Closing `ae2f286d` lifted that. The directional half is real too: a
goal date is a goal weight plus a rate, so keeping the dropdown points the calculator toward
collecting goal weight. Brew has still NOT ruled on the denominator itself and this was not
treated as if he had.

**ADDING THE GOAL-WEIGHT INPUT IS STILL NOT DONE and is deliberately not done here.** It is a
product change to the live paid funnel, outside the copy carve-out. It stays on todos.md. Until
it ships the calculator and house-claims.md disagree for any reader with weight to lose.

**Signed off by the `sarah-health-coach` agent before anything shipped**, with three conditions,
all met. She amended five of six groups. Her substantive catches: the liver copper limit binds
PER SERVING not per week (a single 4 oz serving is ~11 mg against a 10 mg adult ceiling), so the
2026-05-01 portions line had to change as well as its protocol line; the "70-80% fat keeps
testosterone high" claim is not defensible and was struck rather than reworded; and
`2026-02-09-how-much-protein-carnivore` MISATTRIBUTED its 1.2-1.6 g/lb lean mass figure to
Dr. Layman, who did not publish it, so the number was removed from his name rather than
re-anchored. Dr. Lyon was corrected to ideal body weight, which is what she actually publishes.

**What shipped, by class:** sodium 5-7 g (6-8 g athletes) brought to the house 3-5 g / 6 g cap
across 20 posts with the teaspoon conversions fixed to 1 tsp = 2.3 g; bulk KCl dosing removed
from 4 posts; the protein denominator moved off current weight and lean body mass in 16 posts;
the 70-80% fat target removed from 2; the liver cap enforced in 2 meal plans that each also
contradicted themselves; and the budget post's calorie math corrected, which is the item Brew
named by hand.

**The budget post was worse than reported.** "5 lb of 80/20 = 9,500 calories" (real: 5,750)
appeared twice, and the whole-list total was 16,800 against a real 12,200, so "2,400 per day,
more than most people need" was actually ~1,750 per day, a deficit. Sarah was explicit that
shipping corrected calories under an uncorrected conclusion would be worse than leaving the post
alone, so the conclusion went with it. Beef fat 380 g to 450 g, fat share 60% to 63%, and the
meal plan needed 28 eggs against 24 bought, so breakfast dropped to 3.

**Three safety defects found during the sweep that nobody had flagged, fixed with the batch.**
`2026-02-08-adaptation-timeline` told a reader with orthostatic dizziness that they "need more
salt immediately"; for a medicated 45-70 reader that delays the call that fixes it. Magnesium ran
400-600 mg in four posts against a house 300-400. `2026-01-07-fasting-protocols` published 4-8
week alternate-day runs (house bans that class), a 2-3 lb/week rate (house ceiling 1.5), and a
"2,000-2,500 calorie" sample OMAD meal that actually totals ~4,000.

**Nine posts, not one, shipped with a literal ```html fence** rendering on the live page. All
from the 2026-03-02 to 03-07 run. Stripped. A corpus regex now finds zero fences and zero of the
other production artifacts the review named.

**The 2026-08-24 medical-risk unpublish left seven live 404s.** Commit `f0e31058` removed the
HTML for the five flagged posts but left 7 redirect stubs and 7 `data/redirects.json` entries
pointing at them, on URLs Google had indexed. All retargeted to the live post-July replacements
(`2026-07-24-carnivore-ldl-arteries`, `2026-08-20-hypothyroid-carnivore-scale-wont-move`) and
two-hop chains collapsed. **Lesson: unpublishing a post is not done until you check what
redirects at it.**

Review item 1 (rewrite or unpublish the five medical-risk posts) was ALREADY DONE on 2026-08-24;
the sweep confirmed all five are `unpublished` with HTML removed. Remaining
`doctor-as-adversary` hits are lifestyle posts quoting that phrasing to argue against it.

**Verified, not asserted:** validate_before_commit 0 critical; validate_canonicals PASSED over
245 files; check_baselines PASSED; blog_link_guard exit 0; macro parity 1474/1474 on both the
golden and the client-vs-worker test, confirming the calculator was not touched; a 59-pattern
stale-value regex over the JSON and every CW and KD HTML file returns 0; and every new string was
confirmed present in BOTH `data/blog_posts.json` and the rendered HTML. NOT verified:
`tests/content-validation.test.js` and the other three Jest suites, which are Playwright specs
misfiled in the Jest directory and refuse to run there (pre-existing, unrelated, not fixed);
pytest is not installed on this machine.

**Editing both `data/blog_posts.json` and the rendered HTML by hand was deliberate**, rather than
regenerating with `generate_blog_pages.py`, which rewrites all 250+ CW pages and would have
buried a 40-file content change in a 250-file diff. Both sides carry the same text, so the next
regeneration is a no-op on these posts. Two gotchas for whoever does this next: match the
existing `json.dump` encoding (`indent=2, ensure_ascii=False`, and the file has no trailing
newline) or the diff explodes to hundreds of spurious lines, and the HTML has auto-inserted wiki
links and `<strong>` tags mid-sentence, so replacement strings must not span them.

**Still open after this:** the goal-weight calculator input; the LDL stance wording (item 2 of
the house-claims changelog, still needs Brew); three ADDITIONS Sarah wants to house-claims.md
(per-serving liver cap, a "missing 4,700 mg is not a deficiency, overshooting is the higher-risk
error" line under Potassium, and the clinician-set exceptions under Protein) which were not made
because changing that file's published content is a stance change; the rehash-cluster
consolidation (review item 3, the large remaining piece and an SEO win, since the site competes
with itself); the LMNT and air-fryer affiliate stance conflicts (review item 4); and the KD posts
dated after June, which carry the same sodium and protein defects but sit outside this approval.

### Addendum, same day: three follow-up commits and a process problem

Three more commits landed after `9d64b169`, all inside the same approved remediation and all
verified against the full validator set before being left to stand:

- `0ff7acaa` fixed a contradiction `9d64b169` left behind: the Tactical Takeaway in
  `2026-04-19` still said "$5 a day for a 2,400-calorie meat-only diet" after the body had been
  corrected to about 1,750. Now states $4.98/day at ~1,750 and $7.10/day at ~2,570.
- `727ef633` fixed `2026-05-26-first-month-carnivore-budget-guide`. **The liver item is the most
  dangerous claim found all day**: "swallow 4 to 5 frozen cubes daily" is roughly 64-82 g/day, or
  16-20 oz a week, against a published cap of 4-8 oz a WEEK, and about 3,500 mcg RAE of
  preformed vitamin A daily against a 3,000 mcg adult UL with no clearance window. Now 3-4 oz
  twice a week. **Lesson: the corpus sweep missed it because the regex looked for ounces and
  pounds and the dose was written in frozen cubes. A dose expressed in a household unit will not
  be caught by a unit-based scan.** Also corrected that post's sodium and its week-one macro
  claim (2,000-2,400 kcal / 150 g protein was really 1,700-1,900 / about 110 g).
- `65e81ed2` added currency and intake context to `2026-05-23-200-month-carnivore-couple`. Its
  "$3.33 per person per day" sits under the published $5-10 range with no acknowledgement; the
  reason is that the couple shop in Winnipeg and it is Canadian dollars, which the post never
  said. Also: $50/week is $217 on a 4.33-week month not $200, the list carries about 75 g protein
  per person per day, and "1.5 lbs of ground beef per day between them" contradicted a list
  buying 5 lbs a week. **NOT changed: the $200 headline, the title, and the slug.** Making the
  month arithmetic consistent would change the post's central claim and its URL, which is an
  editorial and SEO call for Brew.

**Process problem, recorded so it does not repeat.** Those three commits were made and pushed by
the `sarah-health-coach` subagent, which was asked for a written ruling, not for edits. It is
defined with Write and Bash, so it went ahead and shipped to live pages while the main session
was mid-verification. The work is correct and two of the three caught things the main sweep
missed, so it was left standing rather than reverted, but: one of its writes caught
`data/blog_posts.json` mid-save and left it unparseable for a few seconds (a scheduled publish
firing in that window would have hit invalid JSON), and it swept a staged
`docs/project-log/decisions.md` into `0ff7acaa`, which is why the main log entry above sits under
an unrelated commit message. **Recommendation: give review and sign-off agents read-only tools.**

### 2026-09-02: the $200 couple post is now the $217 couple post, slug included

The editorial and SEO call the 2026-08-31 entry left open ("NOT changed: the $200 headline, the
title, and the slug") was made by Brew by dictation on 2026-09-02 at 05:55 PDT, Otter recording
"Website Content Strategy Meeting". His words: "Talked about the $200 couple post. Fix it. I don't
even care for lifetime visitors. Delete it if you want, but fix it."

**What the $200 actually was.** $50 a week times four. A calendar month is 4.33 weeks, so the
grocery figure is about $217, and per person per day is $3.57 rather than $3.33. The
2026-08-31 pass added an in-body note explaining this but left the headline, the title, the
summary metadata, and the URL all still saying $200, which is the half a reader actually sees.

**The URL question that was holding it.** Changing $200 to $217 changes the slug, which normally
throws away accumulated ranking and inbound links. GA4 (property 517632328, all time) shows the
page has 4 pageviews from 4 users since it published on 2026-05-23, against 9,068 site-wide.
There is no ranking and there are no links to protect, so the usual reason not to rename did not
apply here. Brew was given that number and answered as quoted above.

**Done:** title, h1, `<title>`, og/twitter titles and descriptions, JSON-LD headline and
description, excerpt, meta description, every in-body dollar figure, and the slug
(`2026-05-23-200-month-carnivore-couple` to `2026-05-23-217-month-carnivore-couple`), in both
`data/blog_posts.json` and the rendered HTML, plus `public/blog/index.html`, `public/sitemap.xml`,
and `public/feed.xml`. A meta-refresh stub sits at the old path with a matching
`data/redirects.json` entry, per the existing GitHub Pages redirect convention.

**The before/after table was rebuilt on a calendar month** so it survives its own arithmetic:
meat and eggs $191, butter $26, takeout $10, total $227. The $217 headline is groceries only, and
the post now says so directly under the table. Monthly savings fell from "$450" to "more than
$420" as a result.

**The post states the correction in its own body**, at the top, with the date. It is a factual
correction rather than a stance change, but the same rule applies: we would rather say we were
wrong than quietly restate the number.

**Two gotchas for the next person doing a slug rename.** The rendered HTML carries auto-inserted
wiki links (`Dairy`, `budget`) mid-sentence, so replacement strings copied out of
`data/blog_posts.json` will silently miss in the HTML; diff the two sides rather than trusting a
replacement count. And the image asset keeps the OLD slug
(`/images/blog/2026-05-23-200-month-carnivore-couple.jpg`), deliberately, because the deploy job
verifies asset references resolve.

**Not changed:** the stale root-level `blog/` mirror, which is not deployed (GitHub Pages serves
`./public` only) and was last touched 2026-08-16. It still carries the old slug and headline.

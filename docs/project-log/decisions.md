# Project Decisions

| Date | Decision | Why | Alternatives |
|------|----------|-----|--------------|
| 2026-09-10 | CW Revenue Readiness Batch 1 shipped and FROZEN (merge `34e47842`, worker `2f647a50`). Self-service fat-loss floor female 1200 / male 1500 kcal as a product bound, not a medical minimum; capped targets state the achieved deficit; targets at or below maintenance are suppressed and drive no sample day, offer or report. Calculator is 18+ client and server, no pediatric formula. Diet-based email routing kept as is (carnivore CW drip + newsletter, keto/low-carb KetoDial, pescatarian newsletter only) and the disclosure rewritten to match; CW does not email free results. Retention copy states no window because code expires reports at 365 days. Frozen: do not reopen floors, routing, modal, retention wording or sample-day math unless a real production customer problem shows a failure | Brew, 2026-09-10 in session: resolved floors, adult gate and routing disclosure; ordered the reviewer/fix loop stopped and scope frozen to eight requirements; approved "ship it" | Invent a floor number without approval (rejected: policy decision); substitute the floor as a deficit when maintenance is below it (rejected: suppress, never substitute); change routing to CW-only (rejected: routing intentional); build a CW free-results email (rejected: fix wording to match behaviour); keep iterating on reviewer P2s (rejected: backlog) |
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

### 2026-09-07: the February carnivore food list post was upgraded in place, slug untouched

**Approval.** Brew, by dictation on 2026-09-07 at 07:42 PDT, Otter recording "Website Strategy and
Updates", responding to the suggested move in that morning's CEO brief: "Let's see your suggestion
about upgrade the February carnivore weekly food list. That's a good idea. I say go for it. If it's
already tracking on Google and it's already what we're looking for, weird that nobody's clicking on
it. So yeah, let's let's upgrade that and get it moving."

**The carnivore-vs-keto fork was checked first.** In the same dictation Brew also said that keto
content on Carnivore Weekly should move to KetoDial. The February post
(`2026-02-09-carnivore-food-list-complete`) is unambiguously carnivore: meat, fish, eggs, organ
meats, animal fats, and an explicit avoid-list covering grains, vegetables, fruit, legumes, nuts,
and all sweeteners. No net-carb framing anywhere. So it was upgraded in place rather than moved.
The separate `public/low-carb-food-list.html` page, which really was keto content, was already
moved to ketodial.com on 09-03/04 and is a meta-refresh stub; it was left alone.

**Performance data that shaped the rewrite.** Search Console, `sc-domain:carnivoreweekly.com`,
90 days to 2026-09-06: 871 impressions, 1 click, average position 71.5 across 168 queries. Last
28 days is better than the 90-day average (29 impressions, position 34.1) but still zero clicks.
The query set showed four gaps the old post did not answer:

- **The vocabulary people actually search.** "dirty carnivore food list", "strict carnivore diet
  food list", "modified carnivore diet food list", "relaxed carnivore diet food list", "carnivore
  diet types", "carnivore diet variations". The post used its own Tier 1/2/3 language and never
  said any of those words.
- **"Can I eat X" long tail.** lettuce, corn, peanut butter, cottage cheese. Roughly 15 queries
  with no on-page answer at all.
- **Grocery and printable intent**, which held the page's best positions: "carnivore diet food
  list pdf" (45), "carnivore grocery list" (48), "grocery list for carnivore diet" (53).
- **Dairy detail.** "carnivore diet cheese list" sat at position 38, the strongest position on the
  page, against a nine-line bullet list.

**What changed.** Content grew from 17.7k to 36k characters, HTML from 46KB to 68KB, 8 H2s to 15.
New sections: a 60-second answer block at the top, a types-of-carnivore table naming lion, strict,
standard, relaxed/modified, dirty, and animal-based; separate H2s for eggs and for dairy with a
nine-row cheese table including cottage cheese; a fats and oils section; an explicit "are vegetables
ever allowed" subsection; a 14-row "can I eat this" quick-answer table; a carnivore staples section;
and a visible 8-question FAQ mirrored into FAQPage schema. Internal links went from 3 to 15, all
verified to resolve on disk, pointing at the calculator plus lion diet, ground beef budget, eggs,
cheese stall, organ dosing, nose-to-tail, tallow, seasonings, coffee, electrolytes, protein, and
budget guide posts. Title changed to "Carnivore Diet Food List: What to Eat, Avoid, and Buy",
meta description rewritten to 143 chars, `date_modified` set to 2026-09-07 so Article schema
reflects the update, sitemap lastmod bumped by hand from 2026-02-09 to 2026-09-07.

**Four corrections shipped with it.**

1. Beef liver was listed as "Vitamin A (53,000 IU per lb), B12 (1,200% DV)". USDA FoodData Central
   puts raw beef liver near 16,900 IU of vitamin A per 100g, which is roughly 76,700 IU per pound,
   so the old figure understated it badly and per-pound is a unit nobody eats in. Restated per
   4 ounce serving: roughly 19,000 IU vitamin A and well over 1,000 percent DV for B12.
2. Canned tuna was capped at "2-3 cans/week" for all tuna. FDA and EPA 2021 advice puts canned
   light skipjack in Best Choices at 2 to 3 servings a week and albacore and yellowfin in Good
   Choices at 1 serving a week. Split into two rows and stated in the body. FDA advice page added
   to the references.
3. Beef heart was called the "Highest natural source of CoQ10". Softened to one of the richest.
4. A stray `</div>` in the stored content closed the post-content container early, leaving the page
   unbalanced at 33 open to 34 close and orphaning the closing beef tallow paragraph outside the
   article body. Removed. The rendered page now balances at 34/34.

**Presentation.** The site has no table CSS anywhere, in `global.css`, `blog-post.css`, or the
template, so this post's seven tables were rendering as bare browser defaults. A scoped `<style>`
block for `.food-table`, `.tier-label`, `.table-scroll`, and `.quick-answer` now ships inside this
post's content only, so no other page is touched. Verified in a browser at 375px: the tables sit in
a 311px scroll container around a 520px table, and `document.documentElement.scrollWidth` stays at
375, so the page body does not scroll sideways.

**Verification.** `npm test` runs zero tests: all 28 suites are Playwright specs failing to load
under Jest, which is pre-existing and unrelated. `validate_before_commit.py` returns 0 critical and
6 warnings, all pre-existing and on other pages. `validate_canonicals.py` passes on 252 files. All
three JSON-LD blocks parse, sitemap.xml and feed.xml parse. The rendered HTML was diffed against the
JSON rather than trusted, per the 2026-09-02 note about auto-inserted wiki links: the generator
inserted none into this post.

**Not changed, deliberately.** The slug and URL, because the page is already tracking and a rename
would force a redirect and a re-index. The Etsy printable card block, including its $4.49 price,
because pricing is out of scope. The `blog_post_template_2026.html` affiliate disclaimer, which
carries the site's only em-dash on every one of 289 pages: a one-character template fix, but it
regenerates every page and was not part of this approval. Flagged for a separate pass.

**Branch.** Work landed on `calculator-goal-weight`, which was already checked out with unpushed
work. Not merged to main.

## 2026-09-07 — CW food cluster: upgrade the ranking URL, do not split it
Brew: "If Google is already treating the existing food-list article as the answer to carnivore food list,
foods to eat, foods to avoid, grocery list and beginner food list, then don't fight Google by creating five
URLs. Make the existing URL excellent."
Brew's 7 priority food topics resolve to 3 pages. Items 2, 3, 4, 5 and 7 die as separate pages and become
sections of `2026-02-09-carnivore-food-list-complete`. Evidence: that URL already holds 632 impressions
across 102 distinct queries, 98 of them food-list-family, avg pos 76.4.
Consequence: Sarah's proposed A-Z "Can I Eat This?" index is also dropped as a new URL by the same logic.
Orphaned single-food lookup queries become rows in the cornerstone's quick-answer table. Revisit only if the
upgraded cornerstone fails to hold that intent.
Full map: docs/archive/reports-archive/2026-09-07-carnivore-food-content-map.md

## 2026-09-07 — Standing content strategy rule: upgrade before you expand
Brew formalized the CW/KD content policy. Now in CLAUDE.md ("Content Strategy: upgrade before you expand")
and mirrored into .claude/agents/{sarah,marcus,chloe}.md so the unattended blog-generation tasks inherit it.
Core: search impressions are evidence of demand, existing rankings are evidence of relevance. Never create a
new URL just because a keyword was found. Determine whether an existing page already owns or should own the
intent, then upgrade, consolidate, redirect or restructure before expanding. New pages are for genuinely
distinct problems, not variations. Added operational guard: pull page-level GSC for source and destination
before any redirect, never redirect into a weaker page.

## 2026-09-07 — Red team result: food-cluster plan halted before writing
All three writers red-teamed the merged plan and independently concluded it targets the one category CW has
never ranked. Verified by the main session against fresh page-dimension GSC pulls:
- 16 narrow pages published Aug 2026 debuted at pos 5-12. Every broad hub (food list 34.9, meal plan 49.5,
  seasonings 31.6, beginners 39.9, budget 32.0) sits at 31-50. Largest position gain on the domain in 3
  months is +3.2; zero pages have crossed 30 -> 15.
- The bare /blog/ directory index outranks the 4,711-word cornerstone on all 7 shared queries, by 12-40
  positions. Google already ran that A/B.
- Cornerstone impressions: 374/693/199/46/0 May-Sep while the site went 5,986 -> 24,347.
- The GSC query dimension, which all three maps were built from, covers only 27.2% of impressions and
  17.7% of clicks.
DECISION: no writing. Leave today's cornerstone upgrade in place as a controlled experiment, baseline
29 imp / pos 34.1, read 2026-10-05. Execute only Marcus's two zero-traffic budget redirects. Hold the three
eating-out redirects (2026-06-25 climbed 41 -> 15.2 unaided). Do not retitle seasonings (target term ranks
worse than current). Re-shape food demand as narrow problem pages, the format that debuts at pos 5-9.
Full detail: docs/archive/reports-archive/2026-09-07-carnivore-food-content-map.md

## 2026-09-07 — Direction change locked after red team (Brew)
Brew accepted the red-team verdict and changed direction. "This is a successful red-team exercise, not a
failed content plan." What we learned: Etsy proves demand exists; Google proves CW ranks problem-shaped
content; GSC shows the broad food/reference format does not work on this domain.

LOCKED:
1. Leave the food-list cornerstone alone after today's upgrade. Baseline 29 imp / pos 34.1, recheck
   2026-10-05. Do not keep touching it out of impatience.
2. No A-Z page. Lookup questions go in the cornerstone quick-answer table. Reconsider only if that table
   gains traction.
3. Hold the eating-out redirects. Old or redundant-looking is not sufficient reason to 301 a page already
   showing page-one/page-two performance.
4. Execute only the two genuinely dead budget redirects, assuming page-level evidence holds.
5. Do not retitle the seasonings page. Current data says mustard (pos 30.8) outperforms the broader head
   term (pos 40.1). "Obvious SEO logic" can be completely wrong.
6. Next opportunities are narrow problems, but each still needs the full evidence -> intent ->
   existing-owner check. No automatic articles.

AUDIENCE CONFIRMED, not just retained: the domain's winners (hot flashes, knee pain after 60, appetite
loss, heart palpitations, gallbladder, period/cycle changes) are problem-shaped searches that occur
naturally in the 45-70 majority-women demographic. Writing for Google and writing for our audience overlap
here rather than competing.

NEW HARD RULE: never rewrite a page ranking at position <=15 without a preservation plan and a
before/after measurement window. Named example: 2026-08-05-appetite-loss-carnivore, pos 8.0 / 172 imp /
6 clicks. Now in CLAUDE.md and the three writer agent files.

NEXT ACTION (explicitly NOT another content map): a short evidence table of 5-10 validated problem
opportunities. Columns: query/problem, existing CW URL, impressions, clicks, position, search intent,
demographic fit, action. Action is one of UPGRADE / CONSOLIDATE / NEW PAGE / LEAVE ALONE. No word counts,
no outlines, no keyword-only opportunities, no writing.

## 2026-09-07 — Opportunity queue funded; row 7 designated the control group
FUNDED (execute): row 1 alcohol UPGRADE, row 2 seven-day week NEW PAGE, row 3 dirty/lazy/relaxed variants
NEW PAGE, row 4 coffee UPGRADE, row 5 lion CONSOLIDATE.
Row 2 authorized specifically on the verified natural experiment: same query, same 28-day window, narrow
page pos 16.0 vs the hub pos 45.7.
ROW 6 (seasonings, 2,366 imp / 1 click / pos 33.5): DIAGNOSE ONLY, no changes. Cause unknown among wrong
intent, wrong format, bad snippet, weak authority, cannibalization, or Google not rating CW for the broad
term. Diagnose before fixing.
ROWS 7-9: LEAVE ALONE. Row 7 (2026-04-13-carnivore-2-months-weight-loss-timeline, 2,009 imp / 42 clicks /
pos 6.13, improving with no intervention) is now the CONTROL GROUP: zero changes of any kind. Brew
cancelled the single below-fold inbound link Marcus had proposed. Row 2's new page must NOT link to it.
Observation only, read Oct 5, confirm Nov 2.
EXPERIMENTAL HYGIENE: pruning is deliberately NOT mixed into this experiment. If we create, upgrade,
consolidate and delete at once and traffic moves, we cannot attribute the cause. Pruning audit is
analysis-only; nothing executes until rows 1-5 are read at their established dates.

## 2026-09-07 — $29 report: release-safety sequence, and two dangerous template sections
Brew: the salt fix is NOT the P0 resolution. This is a release-safety problem, not a typo problem.
MANDATORY SEQUENCE before the report ships or Coach launches:
1. remove dangerous tapering content (DONE 2026-09-07)
2. test safety conditions
3. correct salt unit (DONE 2026-09-07)
4. test generated report outputs
5. test paid delivery
6. then consider launch
Step 4 must be adversarial: medication=yes, condition=yes, across goals, ages, activity levels. The
conditional engine itself is suspect (`evaluateCondition` supports only `field === 'literal'`).

DONE: `SECTION 4: Medication Adjustment Protocols` removed from api/calculator-api.js and
api/generate-report.js (3,068 chars each). Contained Metformin 50% reduction with thresholds, "consider
discontinuing Metformin", BP/diuretic and thyroid dose decrements (12.5-25 mcg). Replaced with a
what-to-measure-and-ask section per docs/house-claims.md ("medication changes are the prescriber's
decision"). These blocks were inert only because the template parser cannot evaluate their conditions, so
repairing the parser would have shipped them. Section 4 removal MUST precede any evaluateCondition work.
DONE: salt unit error. Was "Salt: 3-7 grams (3-7 teaspoons)" (~18-42g). Now "Sodium: 3-7 grams (about
1.5-3 teaspoons of salt)", matching published blog guidance. Was in TWO files, not one.

NOT DONE, needs Brew: the physician guide still contains "The Nuclear Option: Find a New Doctor", "Red
Flags (Time to Find a New Doctor)", "If Your Doctor Refused to Partner", and lists "prescribes statins
without trying lifestyle first" as grounds to change doctors. This is the same stance that got 5 blog posts
unpublished on 2026-08-24 (commit f0e31058) and directly contradicts docs/house-claims.md. The policy was
applied to the blog and never to the product. Left in place; out of scope of the tapering authorization.

## 2026-09-07 — The biggest product discovery
Personalization is collected AFTER purchase, into cw_assessment_sessions, not calculator_sessions_v2.
Paid rows (n=7): biggest challenge 5/7, conditions 5/7, experience 5/7, budget 6/7, cooking skill 6/7,
medications 4/7. Unpaid rows (n=9): 0/9 on everything.
People WILL give us this once committed. Whether they give it before paying is the P1 experiment.
Current product order is "give us your money, then we'll ask what you're trying to accomplish."
Ladder: FREE "here are your numbers" -> $29 "here's what they mean for you" -> $79 "let's keep you on
track for 12 weeks." Coach check-ins should inherit the assessment, so week 6 is "how are the evening
cravings going?" rather than generic education.

NEW PERMANENT RULE (in CLAUDE.md + 3 agent files): no product redesign recommendation may be based on
database schema alone. Trace input -> persistence -> calculation -> rendering -> delivery.

## 2026-09-07 — Doctor-firing content removed from the paid report (Brew authorized)
Rationale is product-policy consistency, not a medical or philosophical judgment: docs/house-claims.md
(2026-08-24) says CW never advises distrusting doctors as a class or categorically dismissing statins. The
blog was made compliant that day; the paid report was not. Blog policy-compliant + paid product on the old
policy is a product inconsistency, not a content experiment.
REMOVED/REPLACED in api/calculator-api.js and api/generate-report.js:
- "The Nuclear Option: Find a New Doctor" -> "When to Seek a Second Opinion"
- "Red Flags (Time to Find a New Doctor)" -> "Signs the Conversation Is Not Working"
- "If Your Doctor Refused to Partner" -> "If You Did Not Get the Answers You Needed"
- the "prescribes statins without trying lifestyle first" criterion (both instances)
- "Option 3: Self-Direct Labs ... you won't have a doctor to interpret" (the go-it-alone path)
Preserved deliberately: the legitimate user need "what if my doctor and I disagree" now routes to asking
for a follow-up, requesting a referral, or seeking a second opinion, always keeping a prescribing clinician
involved. Brew: "That's actually better product content."

## 2026-09-07 — Step 2 release test is adversarial, and question redesign is ON HOLD
A. Safety: 8 combinations (med+no condition, med+condition, multiple meds, diabetes, thyroid,
   cardiovascular, BP meds, neither). Verify the report NEVER emits medication-adjustment instructions.
B. Personalization: prove answers flow question -> database -> calculation/logic -> report, not merely
   collected.
C. Calculation: the three known defects (lifestyle vs exercise both used; age behaves as intended in
   protein/calorie logic; protein responds to goal) plus the meals-per-day gap. A report showing Meal 1/2/3
   to an OMAD reader is a personalization failure even if every calorie is mathematically correct.
D. Delivery: a REAL $29 test transaction through the whole journey. Do not test functions individually and
   declare victory.
HOLD: no question redesign until the machine is safe and the data path is proven. Then the clean experiment
is "existing 10 inputs + move the existing personalization questions before payment" versus "add new
questions." Brew expects the first to teach us more. The machinery already exists; it was wired behind the
cash register.

## 2026-09-07 — Self-directed labs stays out (Brew)
"Do not bring back the self-direct labs option. That wasn't merely aggressive wording; it undermined the
safety boundary you're trying to establish." The replacement keeps the useful concept (you can advocate for
yourself and seek another opinion) without turning the report into "manage your own medicine."

Also confirmed as a standing expectation for audits: verify **source -> rendered output**, not just syntax
validation. Two defects today were invisible at source level and only appeared in rendered output (salt
dosage off by 6x; over-escaped quotes that would have printed literal backslashes to customers).

Discipline order now locked: **make it safe -> prove the data path -> move existing questions -> measure ->
only then add questions.** Not "redesign the calculator because it feels incomplete."

## 2026-09-07 — 2A FAILED. Hard P0 stop on the $29 report.
Brew: "The important discovery isn't any one bad recommendation. It's this: the report is collecting
medical context, calculating a personalized medical-context payload, and then not using it." That is also
why the first investigation ("the personalization layer collects nothing") was misleading. The data exists;
the product does not consume it.

Evidence: rendered byte-diff of a healthy persona vs a 72-year-old on warfarin/metoprolol/furosemide/
metformin/levothyroxine with CHF, AFib and CKD3 differs only in meal-portion grams and grocery pounds.
`{{conditions}}` and `{{medications}}` are computed at calculator-api.js:3891-3892 and appear in ZERO
templates. Verified independently by the main session.

LOCKED FIX ORDER (Brew moved the LLM guardrail to first):
P0-1 LLM guardrail — prohibit medication dosing/adjustment/taper/discontinuation/substitution and
     medication-specific recommendations; prohibit telling users to independently alter treatment; require
     clinician involvement. The electrolyte guardrail must not substitute for the broader one. Test runtime
     output after.
P0-2 Electrolytes — not merely gating 3-7g on conditions. The question is whether this report should issue
     quantitative electrolyte targets AT ALL to CKD / heart failure / diuretic personas. Lite Salt is
     potassium chloride: hyperkalemia risk in CKD and with ACE inhibitors.
P0-3 Glucose — target "60-85, lower is better" overlaps the report's own "<70 = hypoglycemia". The report
     contradicts itself. Remove/replace the target; do not make the conditional logic clever.
P0-4 Remove the CKD/protein "myth" rebuttal (vulnerable persona + dismissive framing + 154g target).
P0-5 Remove the statin-deferral script (2nd house-claims violation; reaches someone on atorvastatin).
P0-6 Wire medical context in, LAST. Goal is NOT "sick people get different advice" but "the report
     acknowledges relevant medical context and safely routes individualized medical decisions to clinicians."

PERMANENT REGRESSION FIXTURE required in the repo. Acceptance test: "A medically complex persona must not
receive the same medically relevant report content as the healthy baseline, while neither persona may
receive unsafe medication-management instructions." Stronger than "the report contains their conditions."

2B IS ON HOLD. Do not move questions before payment until this is fixed and regression-tested: we would be
running a conversion experiment on a product whose safety architecture is broken, and would confound the
clean test by simultaneously changing what happens to medically complex users.
SEQUENCE: 2A failures -> safety remediation -> adversarial regression -> 2B data-path trace -> question
placement experiment.
DO NOT COMMIT the working tree yet. One clean commit representing the safety remediation, not an
intermediate state with known P0 defects.
Bead structure: parent carnivore-weekly-6x88 with the six P0s as dependents, per Brew's instruction not to
treat them as six independent coding tasks.

## 2026-09-07 — Round 2 authorizations, and the release gate in final form
GOVERNING PRINCIPLE, now standing: **never substitute a "safer" number; suppress.** Where the safe answer
requires clinical judgement, the software stops and routes to a clinician. Product-routing language is
allowed; new clinical guidance is not.

AUTHORIZED:
1. CKD -> remove the individualized protein target. No 154 g, no substitute figure. Explain that CKD
   protein needs depend on kidney function, treatment status, nutritional status and clinician assessment;
   route to clinician/renal dietitian. Fixture assertion: CKD persona -> no individualized protein target
   in customer-facing report.
2. Warfarin + liver -> suppress the meal. Do not invent a "safe amount of liver." Fixture assertion:
   warfarin + liver -> ZERO liver meals. Testing that a warning appears is NOT sufficient.
3. Delete generateSimpleFallbackReport / generateFallbackReport. Brew: "dead unsafe code doesn't become
   safe because we've written a test warning us not to call it." Then sweep the repo for callers, alternate
   report entry points, old prompt strings, duplicated medical logic, direct Claude calls that can produce
   report content, and any path bypassing api/medical-context.js. The sweep is part of the architectural
   audit.

MAP ONLY, DO NOT SOLVE: the second safety domain. We have handled medical context -> suppress unsafe
advice. We have NOT handled medical context -> food and recommendation selection. Map every interaction:
medication->meal ingredient, condition->meal ingredient, medication->supplement, condition->fasting,
condition->calorie target, medication->electrolyte, condition->protein target. The warfarin/liver case
suggests more is hiding in the meal-generation layer.

RELEASE GATE (final form).
P0: LLM medication guardrail · medical-context wiring · electrolyte fail-closed · glucose contradiction
removed · statin/doctor-adversarial content removed · CKD protein number suppressed · warfarin/liver
suppressed · dead unsafe generators removed · adversarial fixture passes · MUTATION TEST proves the fixture
fails when protections are disabled.
P1: runtime Claude sections 1 and 6 · complete medical-context -> meal/recommendation inventory ·
deterministic validation around runtime-generated content.

Note on method (Brew): "445 passing assertions means very little; make the code fail, confirm it fails,
restore it, is evidence." Mutation testing is now part of the P0 gate itself, not a nicety.
2B still on hold.

## 2026-09-08 — KetoDial jumps the queue; architectural boundary named; hard launch rule
Brew: "KetoDial first. Full stop. This is no longer cleaning up a product before launch. KetoDial is
actively selling a report that sends quantitative electrolyte advice to paying customers without
suppressing it for the people most likely to need individual clinical guidance."

ORDER LOCKED:
1. KetoDial live containment + rendered regression suite
2. KetoDial mutation test
3. Delete CW's unsafe alternate generator (api/verify-and-generate.js + .ts) and sweep for references
4. Sweep BOTH products for complete report-generation entry points
5. Re-run CW's full 683-assertion gate
6. Only then continue 2B data-path trace

KD CONTAINMENT SCOPE (authorized): kidney/CKD, heart, blood-pressure conditions, or ANY medication ->
no quantitative sodium, potassium, fluid, Lite Salt/KCl or electrolyte-supplement recommendation. Add
kidney disease to intake before the gating counts as complete (KD's condition list is t2d/bp/chol only, so
a CKD customer currently cannot declare it). NO medication keyword list: free-text parsing fails open.

FREE CALCULATOR PROTEIN: do not solve CKD protein selection. But we cannot congratulate ourselves for
hiding the number in the paid report while showing it on the free calculator. Suppress for declared CKD
once that information exists at that stage. If CKD is not collected until later, the calculator literally
cannot know when to suppress: that is a finding for the intake/data-path work, NOT a reason to invent a
medical rule to patch around missing data.

ARCHITECTURAL FINDING (new parent bead): medical-context affects output upstream of rendering.
"Calculation suppression is not meal-plan suppression." Hiding 154g while the meal engine still sizes
portions from it is cosmetic safety. Remediation rule: a suppressed recommendation cannot continue to
influence downstream generated meal quantities unless separately reviewed and intentionally approved.
No meal-selection fixes authorized yet.

HARD LAUNCH RULE (now in CLAUDE.md): no paid health-related report may launch or materially change unless
every production report-generation entry point is enumerated and covered by the safety boundary or
explicitly retired. Three generations of the same generator have been found across two products in one day.

---

## 2026-09-08 — HANDOFF NOTE: safety remediation phase close (provenance and open state)
Written before the closeout commit. Records only what would otherwise be lost with the session.

### Verified personally by the main session (reproduced, not accepted)
- **Cornerstone collapse.** 374/693/199/46/0 impressions May-Sep while the site went 5,986 -> 24,347.
  Re-pulled independently after Sarah reported it.
- **GSC query dimension covers 27.2% of impressions, 17.7% of clicks** (15,648/213 vs 57,453/1,201).
  Every "zero clicks" aggregate in the lane maps was computed from that partial view.
- **`/blog/` index outranks the cornerstone on all 7 shared queries**, by 12-40 positions. Re-ran the join.
- **Narrow vs hub ranking split.** 16 Aug-published narrow pages at pos 5-12; every hub at 31-50.
- **Salt unit error** and its presence in TWO files, not one.
- **Medication tapering content** at calculator-api.js:3666 (Metformin 50%, thyroid 12.5-25 mcg).
- **`{{conditions}}`/`{{medications}}` computed at :3891-3892 and present in ZERO templates.**
- **Deletion commit `f0e31058`** unpublished 5 posts with no redirect stubs; `docs/house-claims.md` created
  by that same commit.
- **Both phantom 404 URLs appear in 0 commits on any branch.**
- **Mutation testing of the CW fixture**: forced the gate open, exit 1 with 10 named failures; restored,
  exit 0. Did not take the 445-assertion pass as evidence on its own.
- **KD Stripe metadata truncation**, reproduced against the real `collectFormData()` field set (below).
- **KD suite** exit 0; **CW suite** exit 0.

### Accepted from agents, NOT independently reproduced
- The 11 CW and 4 KD mutation runs beyond the one of each I re-ran myself.
- The nine-persona rendered byte-diff similarity figures (0.980 -> 0.891; labs 1.000 -> 0.496;
  electrolytes 1.000 -> 0.258).
- The claim that liver meals went 4 -> 0 for the warfarin persona.
- Sarah's per-page category aggregates (13 food/reference pages, 0 of 13 at pos <=15).
- Marcus's "+3.2 largest position gain on the domain in 3 months".
- Chloe's SERP characterisations.

### KetoDial: deployment vs repository distinction (do not conflate)
- `ketodial/worker/` is in THIS repo. Gate changes there are in this working tree.
- **`ketodial/public/` is a git SUBMODULE pointing at github.com/MikeBrew123/ketodial — a separate
  repository.** The kidney/heart intake chips were edited there and need their own commit and Pages
  deploy.
- **Until that deploys, a CKD customer cannot declare CKD** and is protected only if they happen to type
  something into the free-text medication box. The gate is live in the worker; the intake is not live.
- The worker gate fails closed on unrecognised condition slugs, so a chip shipping ahead of the worker
  over-suppresses rather than silently passing through. That ordering is deliberate.

### Stripe metadata truncation — reproduced, systemic, NOT fixed
`ketodial/worker/index.js:391` stores `JSON.stringify(formData).slice(0, 490)`. `handleReport` does
`safeParseJSON(...) || {}`, so a truncation becomes an empty form.
Reproduced against the real `collectFormData()` shape:
| Customer | JSON chars | Truncated | Parses |
|---|---|---|---|
| 1 medication, short free text | 401 | no | yes |
| 3 medications | 483 | no | yes, by 7 characters |
| 4 medications + 97-char free text | **545** | yes | **no -> whole form becomes {}** |
**Why it is systemic, not a bug in one field:** payload length correlates with medical complexity. The more
medications a customer lists, the more likely their conditions and medications are silently discarded. The
failure is concentrated in exactly the readers the safety gate exists to protect.
**Status: contained, not solved.** The gate now treats unreadable intake as a restriction trigger. The
truncation itself is untouched and needs the form stored somewhere other than a 500-char metadata field.

### False alarms and test mistakes worth remembering
- **The Lite Salt grep.** I reported that the complex persona still received "Lite Salt" and "3-7", which
  looked like the electrolyte gate had failed. Wrong. "3-7" was water-loss *pounds*, and "Lite Salt"
  appeared only inside a warning that salt substitutes are potassium chloride. Pattern matching without
  reading context, which is the exact failure the agents were briefed against.
- **A related lesson from the KD suite:** one positive control was satisfiable by the suppression text
  itself, because a bare `/lite salt/` matched "Do not treat any of it with salt, lite salt...". A positive
  control must target the *offer*, not a word that appears in both the offer and its prohibition.
- **Pipeline exit codes.** `node test.mjs | tail -8` reports tail's exit status, not the test's. I briefly
  read a failing mutation as passing. Capture the exit code directly.
- **A 445-assertion green suite sat on top of six P0 defects.** Green is not evidence. Mutation is.

### Unresolved architectural findings — Audit 2B, NOT this commit
- **Calculation suppression is not meal-plan suppression** (parent bead `carnivore-weekly-mz80`). A CKD
  reader's meal portions are still sized from the 154 g protein figure the report now refuses to state. The
  number is hidden; the food is not. Requires deliberate product design.
- **The selection domain is entirely unaddressed.** No condition affects any meal ingredient. OMAD guidance
  is ungated on insulin and sulfonylureas. A 20% deficit is applied identically to a healthy 51-year-old
  and a 72-year-old with heart failure.
- **Reports #1 and #6 are LLM-written at runtime and unverified in output.** Only their prompts are
  audited. Temperature was lowered 1.0 -> 0.4 and a medication prohibition added, but what a customer reads
  has never been checked.
- **The free calculator renders an ungated protein figure client-side**, so a CKD user sees a number before
  purchase. Cannot be fixed without knowing when CKD is collected: that is intake/data-path work (2B), not
  a licence to invent a medical rule around missing data.

## 2026-09-08 — REPORT-GENERATION ENTRY-POINT MAP (CW + KetoDial)
Traced from configuration and execution, not filenames. Satisfies the CLAUDE.md launch rule that every
production report-generation entry point be enumerated and covered by the safety boundary or retired.

### Carnivore Weekly — deployable unit: `api/wrangler.toml` -> `name = carnivore-report-api`, `main = calculator-api.js`
| Entry point | Data source | Safety gate | Generator | Storage / delivery |
|---|---|---|---|---|
| `POST /api/v1/calculator/report/init` | `cw_assessment_sessions.form_data` via `buildReportData()` | **`api/medical-context.js`** (`deriveMedicalContext` -> `buildMedicalSafetyRules`, `replacePlaceholders`) | `generateAllReports()` **(the only call site, line 1658)** | `calculator_reports.report_html` |
| `POST /api/v1/calculator/email-report` | reads `calculator_reports` | n/a — never regenerates | none | Resend email |
| `GET /api/v1/calculator/report/{token}/content` | reads `calculator_reports` | n/a — never regenerates | none | HTTP response |
| `POST /api/v1/calculator/step/4` | request body | n/a — collection only | none | `cw_assessment_sessions.form_data` |
**Invariant holds:** exactly one path can cause a CW report to exist, and it passes through
`medical-context.js`. Enforced by `tests/deploy-tripwire.test.mjs` ("exactly one file may be a deployed
report generator").

### KetoDial — deployable unit: `ketodial/worker/wrangler.toml` -> `name = ketodial-api`, `main = index.js`
| Entry point | Data source | Safety gate | Generator | Storage / delivery |
|---|---|---|---|---|
| `GET /report/:id` | Stripe metadata `form_data` -> `safeParseJSON(...) \|\| {}` | **`deriveKdMedicalContext`** (in `generateStarterKit` only) | `generateStarterKit` / `generateDoctorReport` / `generateMealPlan` | HTTP response |
| `POST /webhook` (Stripe) | same | same | same, via `generateAllReports(name, d, types)` | Resend email |
| `POST /email-plan` | same | same | `handleEmailPlan` | Resend email |
| `POST /checkout`, `POST/PATCH /session` | request body | n/a — collection only | none | Stripe metadata (**see truncation defect**) |
**Invariant holds today, but structurally weaker than CW.** The gate lives inside `generateStarterKit`, not
at a shared seam. `generateDoctorReport` and `generateMealPlan` were checked and emit **zero** quantitative
electrolyte content, so there is nothing to gate in them now. **P1 risk:** nothing prevents a future edit
from adding quantitative content to those two builders, where no gate would apply. CW's pattern (one
choke-point every section passes through) is the safer shape.

### Retired in this closeout
`api/verify-and-generate.js`, `api/verify-and-generate.ts`, `api/generate-report.js`. **Zero imports or
requires anywhere in the repo** (verified by regex across all non-vendor files). Remaining textual
references are the tripwire's own assertions, documentation, beads, and a URL-path string in
`docs/tools/utility/simple-report-server.js`, a local dev utility with no build, deploy or workflow
reference.
**Residue flagged, not deleted:** `api/verify-and-generate-test.sql` (14 KB) is an orphaned test suite for
a deleted endpoint. It cannot generate a report, so it was left for Brew rather than swept unilaterally.

### Handoff addendum — concurrency incident, 2026-09-08
Two Claude sessions were pointed at the same checkout. The other session (Judith incident/remediation work)
made 10 legitimate commits between 04:19 and 10:13 and, because the working tree was shared, **committed
this session's uncommitted safety work inside its own commits** — `api/medical-context.js` entered history
via `213e208b`, a commit about shopping lists. Those commits are legitimate and were deliberately NOT
reverted, squashed or reorganised.
This session then moved to an isolated worktree at `.claude/worktrees/safety-closeout` based on HEAD
`d292637b`. The main checkout was left untouched by explicit instruction.
Traps found while isolating, both now in CLAUDE.md: submodules are not checked out in a new worktree (the
KD suite failed 3 of 211 assertions for that reason alone, correctly), and a worktree's submodule follows
the parent's committed gitlink, which was **ahead of** the main checkout's.

---

## 2026-09-08 — AUDIT 2B #4: KetoDial authoritative intake (Stripe metadata is no longer a store)

### What was wrong
`ketodial/worker/index.js` carried the questionnaire to the report generators inside
`metadata[form_data] = JSON.stringify(formData).slice(0, 490)`. Stripe caps a metadata value at
500 characters; the fixed part of the KD form serialises to 307, leaving ~183 characters for every
medication, condition slug and free-text answer. Past that the JSON was cut mid-object,
`safeParseJSON(...) || {}` produced `{}`, and the generators substituted
`cal=1800 fat=140 prot=113 carb=25 wKg=75 hCm=170`.

Reproduced: 58F / 88 kg / 165 cm, 4 medications, 3 conditions, 97-char free text (534-char JSON)
received a Doctor's Report stating **BMI 26.0 instead of 32.3**, "None reported" against her
conditions, and no medications — on the one document in the product designed to be handed to a
physician. Payload length tracks medical complexity, so the loss concentrated on exactly the
readers the safety gate exists to protect.

The 2026-09-08 closeout recorded this as "contained". That was true of the ELECTROLYTE gate only.
`generateDoctorReport` and `generateMealPlan` never consulted the gate at all.

### The end state
`validated intake -> calculator_sessions_v2 (authoritative) -> Stripe metadata[session_token]
(bounded 32-char reference) -> loadAuthoritativeIntake() + validateIntake() -> deriveKdMedicalContext()
-> generators`

The durable store already existed and was already being written; nothing read it at report time.
This is a rewiring, not a new table. **Stripe metadata is a pointer, never a store.**

- New `ketodial/worker/intake.js`: `normalizeIntake` (a rename, no `|| fallback` anywhere),
  `validateIntake` (fails closed, names the missing facts), `requireFacts` (generator backstop),
  `loadAuthoritativeIntake`.
- Checkout validates the intake BEFORE creating the Stripe session. We do not take money for a
  report we already know we cannot write; the customer is told to finish the questionnaire while
  they can still do something about it.
- Transient store failures are kept distinct from unusable intake. Collapsing them turns an outage
  into a refused report, or a broken row into an infinite Stripe retry.

### Three gaps found while wiring it
1. `handleSessionUpdate` guarded every write with `if (b.medications)`. An empty answer is falsy, so
   "takes no medications" was never written and the column stayed NULL — indistinguishable from a
   lost answer. Live rows confirmed it. Now `!== undefined`. **"Answered nothing" is not "never asked."**
2. `lifestyle_activity` is printed on the Doctor's Report and was never persisted.
3. The KD meal plan is **protein-anchored**, not calorie-scaled (`minDensity = prot/cal` selects
   meals, `protScale = prot/baseP` scales portions).

### Renal protein suppression folded into the shared boundary
`ctx.renal` had been computed since the gate was written and read by NOTHING. `restrictProteinTarget`
now follows it, mirroring `api/medical-context.js` so the two products cannot drift again. All three
generators pass through `deriveKdMedicalContext` — previously only `generateStarterKit` did.

Because of (3), suppression could not be a display change:
- The **whole macro panel** is withheld, not the protein row. Energy, fat and carbohydrate are a
  closed system; blanking one term states it by subtraction.
- **No protein-anchored plan is generated at all.** A renal customer receives a clinician-routing
  document instead, which offers the meal plan refunded without their having to ask twice.

### OPEN — BREW'S DECISION, NOT TAKEN HERE
A declared-renal customer can still BUY the meal plan and will now receive a referral instead of a
plan. Blocking that sale at checkout is a pricing/product call and was deliberately not made
unilaterally. Options: block the meal-plan SKU on declared renal, warn before purchase, or leave the
refund path as the answer.

### Legacy
`calculator_sessions_v2` held 20 KetoDial sessions and **0 paid** at the time of the change, so there
was nothing to migrate. `payment_status` is only written when the webhook sees a token, so that count
cannot PROVE no purchase ever happened. A paid Stripe session with no token, no row, or a row that
fails validation therefore gets **422 and a support route, never a reconstructed report**. A complete
historical row still generates normally.

### Not done
Production was NOT deployed. Both Cloudflare workers still deploy by hand
(bead: no workflow deploys either worker), and `ketodial/public` is a separate Pages repo.

---

## 2026-09-08 — AUDIT 2B #4b: the renal gate moves BEFORE the free result (Brew)

### The rule
**Do not make it hard for people to spend money.** Safety changes what we show and sell, not whether
a customer can buy.

### Why the first version was wrong
The 2026-09-08 remediation put the renal gate at report generation. That was safe and badly placed:
the customer answered no safety question, saw a personalized protein target on the free screen, paid,
and *then* received a referral plus a refund offer. Safety arrived as an apology after the money moved.

### What changed
One question, asked once, on step 1 before the free protein result:

> **One quick safety check.** Have you been diagnosed with kidney disease, told that your kidney
> function is reduced, or are you on dialysis?  **No / Yes / I'm not sure**

Not a medical questionnaire, and deliberately not "do you suspect" — we ask what a clinician has
already told them, never for a self-diagnosis.

| Answer | Free protein result | Products offered |
|---|---|---|
| No | personalized figure, normal flow | all five |
| Yes | "Ask your doctor or renal dietitian" | Doctor's Report + Starter Kit |
| I'm not sure | identical to Yes | Doctor's Report + Starter Kit |

"I'm not sure" is treated as "Yes". The alternative is asking a customer to rule out their own renal
function, which is the judgement this software is least entitled to ask for.

### Safety changes the offer, not the ability to purchase
Only the 7-Day Meal Plan is protein-anchored (`minDensity = prot/cal` selects meals, `protScale =
prot/baseP` scales portions), so only it and the bundles containing it are withdrawn. The cards are
removed from the picker, not greyed out behind a warning. No disabled button, no second health form,
no scary banner. **Doctor's Report $5.99 + Starter Kit $3.99 = $9.98 against $10.99 for the Full
Protocol they could not have received in full — nobody pays more for less**, so no new Stripe price
is needed for a partial bundle.

### One source of truth
`calculator_sessions_v2.kidney_status` (`no|yes|unsure`, CHECK-constrained). A dedicated column, NOT
the `conditions` array: writing the slug `kidney` would make the Doctor's Report assert a diagnosis
for someone who answered "I'm not sure". **Suppression must not become diagnosis.** The answer is sent
with the first `POST /session` and re-sent on change; it is required by `validateIntake`, so NULL
(every pre-2026-09-08 session) fails closed rather than defaulting to No.

The architecture is unchanged: validated data -> authoritative intake -> medical context -> allowed
products -> Stripe reference -> report generation.

### A hole the suite caught mid-change
The early answer first fed `restrictProteinTarget` only. A customer answering Yes without also ticking
the `kidney` condition chip had their protein withheld and was then handed the full sodium/potassium
protocol. `cardioRenal` now includes `renal`. **A new signal has to reach every gate it is relevant to,
not just the one it was added for**, and there is a mutation pinning it.

### Honest limitation
KetoDial's free protein figure is a flat 25% of calories, not a body-composition calculation. The page
still shows calories, so the number remains recoverable by arithmetic by anyone who knows the 70/25/5
split the page itself states. Closing that would mean withholding calories, which contradicts the
normal-flow rule. The **paid** report has no such leak: the whole macro panel is withheld there.

### Not done
Production NOT deployed. The migration IS applied to Supabase (additive, nullable, no backfill).

---

## 2026-09-08 — AUDIT 2B #4c: real-interface proof, and the bug it found

### The finding that justified the whole exercise
**KetoDial's step-2 medical intake has NEVER been persisted.** Verified against the real table.

`calculator_sessions_v2` is shared with Carnivore Weekly and carries CHECK constraints written for
CW's answer vocabulary. KetoDial's step-2 `<select>` elements have **no `value` attributes**, so the
browser submits the option TEXT. Every one violates a constraint, and one also exceeds varchar(20):

| Field | KD sends | Shared table allows | Result |
|---|---|---|---|
| `dairy_tolerance` | "A little bothers me" | none / butter-only / some / full | 23514 |
| `cooking_skill` | "Basic — I can follow a recipe" | beginner / intermediate / advanced | 22001 + 23514 |
| `meal_prep_time` | "About 30 min/day" | minimal / some / lots | 23514 |
| `family_situation` | "Just me" | solo / partner / family-with-kids / large-household | 23514 |
| `budget` | "mod" / "flex" | tight / moderate / flexible | 23514 |

PostgREST rejects the **whole PATCH**, so `conditions`, `medications`, `symptoms` and
`step_completed = 2` die with it. `updateSession()` is fire-and-forget with `.catch(warn)`, so nobody
saw it. Every live KD row shows exactly that damage: `step_completed=3` with the medical columns NULL.

Survivable while nothing read the row. **Fatal the moment the row became authoritative:**
`validateIntake` would have refused every customer and the checkout guard would have declined 100% of
KetoDial purchases. Stubbed tests could not have found this — they stub the thing that was broken.

### The fix: a vocabulary bridge, not a relaxation
`toStoredVocabulary()` translates KD's option text into the shared table's vocabulary on write;
`fromStoredVocabulary()` translates back on read. **CW's constraints are untouched.**

The read half matters as much as the write half: `reports.js` decides dairy handling by substring
("free", "strict", "little", "bother"), so storing the bare enum and handing it to the generator would
silently change which meals a dairy-sensitive customer receives. Each enum maps back to a phrase that
reproduces today's behaviour exactly, and the suite asserts the behaviour, not the strings.

An unmappable preference is **omitted**, never allowed to fail the write. Losing a preference costs
personalization; losing the write costs the customer's medications.

Also: a rejected session update now logs `Session update REJECTED`. Silence is what let this run for months.

### Which Supabase environment — stated plainly
The 2026-09-08 `kidney_status` migration was applied to **`kwtdpvnjewtahuxjyltn` ("CarnivoreWeekly"),
which is the PRODUCTION database.** It is the only Supabase project on the account; there is no
staging. Saying "production was not deployed" in the same report was true of the workers and Pages and
**misleading about the database**. The schema change is additive and nullable with no backfill, so it
is not being reverted, but the audit history should record it accurately.

A preview branch costs $0.01344/hour. That is spend, and spend is Brew's call, so the integration run
used production with rows tagged `source='kd-audit2b-test'`, emails at the reserved `@audit2b.invalid`
TLD, and cleanup that fails the run if anything survives. Verified afterwards: 0 tagged rows, 0 test
emails, 0 probe rows, 20 real KD rows untouched.

### Stripe
**No Stripe object was created.** The only test key in the vault (`stripe.secret_key_test`, last
rotated 2026-01-06) is EXPIRED — `/v1/balance` returns "Expired API Key provided" — and the Stripe MCP
server is not authorized in this session. Using the LIVE key was rejected: a live-mode Checkout Session
is a production artifact. The Stripe leg is proven at the HTTP boundary instead, asserting the exact
bytes `handleCheckout` serializes. **Rotating the test key upgrades this to a true end-to-end with no
code change.** `PRICE_MAP` is now env-overridable (`PRICE_MAP_JSON`) so test-mode prices can be used;
production behaviour is unchanged when it is unset.

---

## 2026-09-08 — AUDIT 2B #4d: the intake form's values are an API contract (Brew)

Brew, on the vocabulary bridge: *"relying on visible copy like 'Basic - I can follow a recipe' as an
API contract is brittle as hell. A copywriter should not be able to break your database."* Correct,
and the bridge only contained the damage rather than removing the cause.

Every step-2 `<option>` and chip in `ketodial/public/index.html` now carries an explicit `value=`, and
those values are the shared table's own vocabulary. Verified in a real browser: the form submits
`dairy=some, cooking=advanced, prep=lots, family=partner, budget=flexible`. No label text reaches the
database at all any more.

Two options collapse onto one value in each of dairy tolerance ("I love dairy" / "I tolerate it fine"
→ `full`) and cooking skill ("Microwave only" / "Basic" → `beginner`), and prep time collapses "I
batch on weekends" / "I love cooking" → `lots`. The shared constraint has fewer levels than KetoDial's
copy. No behaviour is lost — nothing downstream distinguished those pairs — and widening a CW
constraint to hold KetoDial's copy would be the wrong direction.

**GROUP K in `tests/kd-intake-authority.test.mjs` is the actual fix.** It reads the shipped HTML and
fails the build if any option lacks a `value=`, or carries one the CHECK constraints do not accept.
Mutation-proved, and the polarity is the point:

| Mutation | Result |
|---|---|
| a copywriter rewrites a LABEL | **stays green** — copy is free to change |
| a `value=` attribute is stripped | **red** — "every option declares an explicit value=" |
| an invented value (`weekend-batch`) | **red** — "every value is one the shared table accepts" |
| budget chip reverted to `mod` | **red** — same |

**The bridge stays**, now demoted to what it should be: a compatibility layer for sessions created
before this deploy and for cached pages still submitting label text. That case has its own proof
against the real constraints (integration GROUP 1b), because it is the only remaining reason to keep
the code.

---

## 2026-09-08 — AUDIT 2B #4e: second review, three blockers closed

### 1. Purchase eligibility is not report eligibility
`handleCheckout` reused the full report validator, which requires `step_completed >= 2`, conditions
and medications. But `ketodial.js` moves the priced picker ABOVE the profile deliberately — its own
comment says *"so prices are visible without completing the 12-field profile. The survey stays below
as optional personalization"* — and the profile heading says *"Most are optional"*.

So a customer who finished the calculator, answered the kidney question and wanted the Starter Kit was
told to finish a questionnaire the product calls optional. **Safety changing the offer had become
safety blocking the sale**, which is the opposite of the rule.

Two boundaries now, as separate exported functions so a caller cannot pick the weaker one by accident:

| | `validatePurchaseIntake` | `validateIntake` (report) |
|---|---|---|
| session is real, body + macros sane | ✓ | ✓ |
| `kidney_status` explicit `no\|yes\|unsure` | ✓ | ✓ |
| product allowed for that kidney state | ✓ (`allowedProducts`) | n/a |
| `step_completed >= 2`, conditions, medications | **not required** | ✓ |

A purchase outrunning the profile is fine — the customer finishes it and the report generates. A
REPORT built from data nobody supplied is not, and that bar did not move. GROUP L asserts both halves,
and pins that the report validator stays strictly stronger.

**Related fabrication found while splitting them:** with `conditions`/`meds` absent the generators
printed **"None reported"** — a claim about the customer, on a document for their physician, that
nobody made. `d.conditions || []` is the `|| 75` of the medical section. New `requireDeclaredAnswers()`
refuses undefined/null while still accepting `[]` and `''`, which are real answers.

A buyer who has not finished the profile now gets *"One short step and your reports are ready"* with a
link back, not *"your answers were lost"* — those are different situations and must read differently.

**Save race removed.** `updateSession` returns a promise chain; checkout awaits it via `writesSettled()`
and surfaces failure. Verified in a browser with a deliberately slow 600ms write and an immediate
checkout click: checkout ran only after every dependent write landed. With a rejected write, checkout
was blocked, the customer was told, and the button re-enabled.

### 2. "I'm not sure" must never become a diagnosis in prose
`kdProteinSuppressionNote()` and the meal-plan referral both said **"You told us about kidney
disease"** to an `unsure` customer. False, and it puts a diagnosis in their mouth on a clinician-facing
document — the exact failure the dedicated `kidney_status` column exists to prevent, surviving in the
copy. `ctx.kidneyConditionDeclared` / `ctx.kidneyUnsureOnly` now split the wording while the
suppression stays identical. The referral's summary table states the kidney check honestly
("Answered 'I am not sure' — not a reported diagnosis"). Every other "kidney disease" string was
already gated on a real declaration; all were re-checked.

### 3. CI now runs on the live intake UI
`ketodial/public` (the submodule gitlink) added to **both** `push.paths` and `pull_request.paths`.
`submodules: true` kept. GROUP N reads the workflow and fails if either trigger loses the path.

### Mutation results — all six detected
| Mutation | Detected by |
|---|---|
| checkout back to the report validator | L: "checkout uses the purchase boundary" |
| purchase stops requiring the kidney answer | L: "purchase is refused when the kidney answer is missing" |
| report validator loosened to the purchase bar | C: "medical screen never submitted" |
| `unsure` told it declared kidney disease | M: "is NOT described as having told us about kidney disease" |
| generators may print "None reported" unasked | L: "the Doctor's Report refuses rather than printing 'None reported'" |
| `ketodial/public` dropped from `pull_request` | N: "pull_request watches the ketodial/public submodule gitlink" |

The kidney-answer mutation initially went **undetected**: the assertion used
`err.missing.some(/kidney/i)`, which the plausibility check satisfied by reporting `kidneyStatus`, so
deleting the requirement outright left it green. The assertion passed through a different mechanism
than the one it was written to pin. Now asserts the exact code and the exact missing string.

---

## 2026-09-08 — AUDIT 2B #4f: paid fulfilment made resumable (third review)

Splitting purchase from report eligibility was right for conversion and **opened a paid-fulfilment
P0 that I did not close.** A customer could pay after step 1; the webhook then ran the full report
validator, found the profile incomplete, logged `NO REPORT SENT`, returned 200 to Stripe and **sent
nothing at all**. The customer paid and heard silence.

The recovery my own error page suggested did not work either. Stripe redirects to a freshly loaded
page where `sessionToken` starts null and **nothing persists or restores it** — the Stripe
`session_id` was used only for report links and analytics. So "go back and finish the profile" could
not attach anything to the paid order.

### The flow now
```
pay → profile complete   → deliver immediately (webhook, unchanged)
pay → profile incomplete → "One short step to finish your reports" email, linked to THAT paid session
                         → customer completes the profile against the original row
                         → POST /fulfill delivers, and records that it did
```
Everything hangs off a mapping the server already had: **Stripe `session_id` → `metadata.session_token`
→ `calculator_sessions_v2`**. The browser never carries the raw token across the redirect, and the
token is deliberately **not** handed back to it — holding the Stripe session id already grants report
access and does not need to grant more.

- `PATCH /session` accepts `stripe_session_id` as an alternative key. It resolves **only for a PAID
  session**, so an unpaid or unknown id cannot write to anyone's row.
- `GET /purchase/:id` — what was actually bought, and whether delivery is possible yet.
- `POST /fulfill` — delivers after late completion, **idempotent** via `reports_delivered_at`.
- The webhook sends the finish-profile email instead of going silent.

### New column
`calculator_sessions_v2.reports_delivered_at` (additive, nullable, no backfill), applied to the
**production** database — the only Supabase project on the account. It makes late delivery idempotent
and makes a state the product never had before queryable:

```sql
SELECT session_token, email, paid_at FROM calculator_sessions_v2
WHERE payment_status = 'completed' AND reports_delivered_at IS NULL;
```

### The two smaller bugs
**The race fix had a hole.** Every successful PATCH did `lastWriteError=null`, and checkout itself
queues `step_completed:3` — so a failed profile save could be erased by that later success before
`writesSettled()` ever looked. Failures are now a sticky counter, cleared only by the profile submit,
which is the retry of the thing that failed.

**The success screen hardcoded all three reports.** A renal customer correctly prevented from *buying*
the meal plan was still shown "Open 7-Day Meal Plan", which 403s. Telling someone they own something
we deliberately did not sell them is worse than the 403 it leads to. The screen now renders from
`GET /purchase/:id`, and shows PENDING rather than a dead link while the profile is unfinished.

One `collectProfile()` now serves both the pre- and post-payment submits, so they cannot drift apart.

### Mutation results — six, all detected
webhook silence · `stripe_session_id` no longer resolving · unpaid id able to write · fulfilment
losing idempotency · success screen hardcoding reports · write failure cleared by a later success.

The unpaid-id mutation initially went **undetected**: the assertion scanned the whole file for
`payment_status !== 'paid'` and matched `handleReport`'s identical guard in a different function. Same
masking as the earlier kidney-answer case — an assertion passing through a mechanism it did not name.
Both are now scoped to the function they are about. **That is twice; treat an unscoped source regex as
a smell.**

---

## 2026-09-08 — AUDIT 2B #4g: delivery truthfulness, idempotency, DB vocabulary, schema in git

### 1. A failed email was recorded as a delivery
`sendReportEmail()` logged a non-2xx Resend response and returned normally, so both callers went on to
write `reports_delivered_at` — permanently recording a delivery that never happened, on the one column
that answers *who paid and got nothing*. `markDelivered()` swallowed a rejected PostgREST PATCH too, so
a failed marker was indistinguishable from a written one.

Sends now throw. Nothing is marked until Resend accepts. `/fulfill` returns **502 retryable**; the
webhook returns **500** so Stripe retries. If the send succeeds but the marker fails, the customer keeps
their reports and the log names the recovery — retrying is safe.

### 2. Idempotency was only sequential
`read → send → mark` lets two concurrent `/fulfill` calls both see NULL and both send. Resend
`Idempotency-Key` now carries a **deterministic** key derived from the Stripe session —
`kd-report/<id>` and `kd-finish/<id>` — so a retry is the same message. `reports_delivered_at` remains
the durable application state. A random-per-attempt key would defeat the whole mechanism, so the keys
are built in one place rather than at each call site.

### 3. The webhook wrote Stripe's vocabulary into the database
Stripe Checkout says `payment_status='paid'`; `calculator_sessions_v2` allows
`pending|completed|failed|refunded`. **PostgREST rejected the entire writeback**, and the amount, the
payment intent and both timestamps went with it — the same class as the step-2 defect, and invisible
because the failure was logged and swallowed. Mapped to `completed`; the constraint was **not** widened
to accommodate Stripe.

`is_premium: true` was also dropped, and not by oversight: `premium_requires_payment` requires
`is_premium=false OR (payment_status='completed' AND tier_id IS NOT NULL)`. `tier_id` is a Carnivore
Weekly tier; KetoDial has no value for it, so `is_premium=true` is unsatisfiable and rejected the whole
patch on its own. Leaving the column alone is honest; inventing a tier id to satisfy a constraint is not.

Proven against the real table: `completed`, `amount_paid_cents`, `paid_at`, `payment_verified_at`,
`stripe_payment_intent_id` and `step_completed=4` all land; `'paid'` and `is_premium=true` are both
rejected.

**The operational query was wrong too.** Unscoped it returned **6 Carnivore Weekly rows** from
2026-07-05 onward — CW's worker never writes this column, so it is NULL for every historical CW
purchase. Six customers nobody owes anything, presented as stuck fulfilments. Now scoped to
`source = 'ketodial'`, with the partial index predicate rebuilt to match. KetoDial stuck fulfilments: **0**.

### 4. A failed kidney write survived the profile checkpoint
`stored=No → customer changes to Yes → that PATCH fails → profile submit clears the failure counter →
profile PATCH succeeds WITHOUT the kidney answer → the server still believes No.` The customer would see
suppression on screen while the row that decides what we sell said the opposite.

`collectProfile()` now carries `kidney_status`, and failures are cleared **only after** the checkpoint
has landed. Proven in a browser for the exact sequence, and against the real database for both `yes` and
`unsure`: the row corrects, and product routing and report context both see the corrected answer.

### 5. Schema is in the repository
`supabase/migrations/20260908_kd_audit2b_kidney_status_and_delivery_marker.sql` — idempotent, verified
as a genuine no-op by re-applying it to the already-migrated production database. No backfill: a default
kidney answer would be a safety answer nobody gave.

### Mutations — seven, all detected
log-and-continue on Resend · marker swallowing a rejected PATCH · random idempotency key ·
Stripe's vocabulary · `is_premium=true` · kidney answer dropped from the checkpoint · migration
backfilling a health answer.

The kidney one initially went undetected: the assertion sliced from `collectProfile` to end-of-file and
matched the same expression in two later call sites. **Third occurrence of an unscoped source match
passing through a mechanism it did not name.** All three are now scoped to the function they are about,
and that is now a standing smell to check for.

---

## 2026-09-08 — AUDIT 2B #4h: fifth review — submodule merge, migration CI trigger, idempotency window

### My "zero file overlap" claim was wrong
I compared parent-level filenames and never looked inside the moved gitlink. `origin/main @ 206920bd`
advances `ketodial/public` to `5c1cab7`, and the submodule histories had diverged from `fa8d27c`: the
audit branch **6 ahead, 1 behind**. Advancing the parent pointer alone would have silently dropped five
migrated blog posts and their images.

A real submodule merge was required, and the reviewer was right to insist on the order. One factual
correction: `5c1cab7` touches `blog/index.html` (the blog listing) and blog assets, not the calculator
`index.html`, so the merge was clean with **no file edited on both sides** — but it was still necessary.

Done in the prescribed order: merge in the submodule repo (`07a2337`), verify both halves, push the
submodule, update the parent gitlink, merge the parent, re-run everything. After the merge the five
posts and their sitemap entries serve, and the calculator still carries the kidney question, suppresses
the protein figure, withholds the meal plan and its bundles, keeps explicit option `value=` attributes,
and sends `kidney_status` on session create.

### The migration was not watched by CI — third instance of this hole
`supabase/migrations/20260908_kd_audit2b_kidney_status_and_delivery_marker.sql` is safety-critical and
GROUP P mutation-tests it, but `calculator-guard.yml` did not watch the path. A migration-only edit
adding a backfill — giving every legacy customer a kidney answer nobody gave — could have landed with
none of those tests running.

Added to **both** triggers and pinned in GROUP N, mutation-verified by dropping it from each trigger in
turn. That is the third time this exact hole has appeared: `pull_request` missing the KD paths, the
`ketodial/public` gitlink, and now the migration. **A file that a test asserts against must be on the
trigger list for the workflow that runs that test** — worth making a standing check rather than finding
it a fourth time.

### Idempotency claims corrected
Resend retains an idempotency key for **24 hours**, not forever. The code said a resend was simply safe.
Now stated accurately: the deterministic key is the short-window protection, `reports_delivered_at` is
the durable one, and outside the window the database marker is what prevents a second send. The
customer-facing retry message no longer promises "you will not receive duplicates".

### Confirmed by the reviewer, recorded here
The worker deliberately ignores an invalid or blank resumed `kidney_status` rather than clearing the
stored value, so the post-payment Step 2 flow preserves the pre-payment answer. Checked and correct.

---

## 2026-09-08 — AUDIT 2B #4i: the free plan email was outside the gate

### The miss
The calculator auto-calls `/email-plan` seconds after the first free result. The page suppressed the
protein figure for a reader who answered Yes or "I'm not sure" — and the email then carried it in the
**subject line**, in a **Protein row**, in **"hit the protein number first"**, in copy explaining why we
set their protein high, and in an **upsell to the meal plan checkout had just refused to sell them**.

Same defect class as the meal plan sized from a withheld figure: suppressed on one surface, still
emitted on another. I had flagged this email once as an unresolved risk, then mischaracterised it as
Carnivore Weekly finding #3's class and let it drop. It is a KetoDial gate leak and it was in scope.

### The fix
`/email-plan` now loads the **authoritative session** and reads `kidney_status` from it. Anything that
is not an explicit `no` suppresses, absence included — the same fail-closed shape as
`deriveKdMedicalContext`.

| | No | Yes / I'm not sure |
|---|---|---|
| email sent | yes | **yes** — we do not stop the customer |
| subject | `… kcal · 118g protein · 22g net carbs` | `… kcal · 22g net carbs` |
| protein row | `118 g` | `Ask your doctor or renal dietitian` |
| fat / carbs / calories | shown | **still shown** — only protein is withheld |
| "hit the protein number first" | present | replaced with fat/carb guidance + referral |
| "we set your protein high" copy | present | absent |
| offer | Full Protocol, $10.99 | Doctor + Starter, **$9.98** |

Safety changes the offer, not the ability to buy.

**Macros now come from the stored session, not the client.** The browser used to supply both the numbers
and no context, which is why the email could not know about the gate. Reading the row fixes both at once.
An integration test sends deliberately wrong client macros and asserts the stored ones are used.

**Also fixed while in this function:** `reply_to` was `iambrew@gmail.com`. CLAUDE.md is explicit that
KetoDial replies go to `ketodial@carnivoreweekly.com`. Now pinned by an assertion.

### Mutations — six, all detected
email ignoring the stored answer · protein row printed regardless · subject keeping the figure ·
meal-plan bundle advertised to a suppressed reader · macros back to client-supplied · replies back to a
personal inbox.

GROUP Q **renders both variants of `buildPlanEmail` and asserts on the output**, rather than guessing at
distances between strings in the source. The first version of the group did the latter and produced a
false failure on a correct implementation.

Two more masked assertions found and fixed: the macro-source check tested the *read* rather than the
*assignment* and stayed green when the assignment was deleted; and the integration flattener collapsed
the Fat row's "128 g" into the next row's "Protein" label and read it as a protein figure. That is the
fifth and sixth. **An assertion must name the mechanism it depends on, and be scoped to it.**

---

## 2026-09-08 — AUDIT 2B: Stripe TEST end-to-end BLOCKED on a credential

The final pre-production gate could not run. `stripe.secret_key_test` (last rotated 2026-01-06) returns
`api_key_expired`, and the Stripe MCP server is not authorized in this session. **Rotating an API key is
a Stripe Dashboard action behind Brew's login — I cannot do it.** The live key works and was deliberately
not used: a live-mode Checkout Session is a production artifact.

Everything that does not need the key is built and verified.

### Three hardcoded production surfaces, not two
The review named the live publishable key, the production API base and the hardcoded return URL. There
is a **third** that would have been worse: `reportLinksFor()` and the webhook both built report links
against `https://ketodial-api.iambrew.workers.dev`. A test purchase would have emailed links pointing at
the **live worker**, and the run would have looked like it passed the parts that mattered.

`RETURN_URL_BASE` and `REPORT_BASE_URL` are now configurable and **default to exactly the strings they
replaced**. GROUP R asserts those defaults behaviourally — calling the functions with no env at all —
and a mutation making the default a test URL fails the build. This is the only change made solely to
enable the test, and it changes nothing when unset.

### The harness
`tests/harness/stripe-e2e.mjs` drives the worker's own handler with real Requests, real Supabase and
real Stripe test objects. Rails: refuses anything but `sk_test_`, re-checks `livemode:false` against the
account, tags every row `kd-audit2b-test` at `@audit2b.invalid` with cleanup that fails the run on a
survivor, intercepts Resend unless `--live-email` (which then only permits `@audit2b.invalid`), and uses
only Stripe's documented test tokens. Runs A(no) / B(yes) / C(unsure) / D(pay-first) plus the failure
matrix. With the expired key it exits 2 with the exact rotation steps.

### One honest limitation, stated not papered over
Stripe **embedded** checkout is an iframe on `js.stripe.com` and cannot be driven from our page. The
harness confirms the documented test card through Stripe's own API instead. The Checkout Session, the
PaymentIntent and `payment_status` are all genuine test-mode objects — only the card *entry* is
API-driven rather than typed into their iframe. A literal iframe pass is a manual step; the harness
prints the URL.

### Status
**BLOCKED, not failed.** No code defect is known. Nothing has been merged or deployed, no live Stripe
object exists, and no production customer row was touched.

---

## 2026-09-08 — AUDIT 2B: two webhook production defects, and an honest harness

The sixth review rejected the harness and, in doing so, surfaced two **production**
defects that no amount of harness work would have found.

### 1. The webhook signature could be skipped entirely (security)
```js
if (env.STRIPE_WEBHOOK_SECRET && sig) { ...verify... }
```
A request that simply **omitted** the `stripe-signature` header skipped verification. Anyone able to
POST to `/webhook` could forge a `checkout.session.completed` carrying any `session_token` and
(a) write `payment_status` onto that customer's row and (b) trigger a report email to an address of
their choosing. An unauthenticated write-and-send.

Now fails closed on all three: missing secret → 500 and no processing; missing header → 400; invalid
signature → 400. Verification is also wrapped so a malformed header or secret **rejects rather than
throwing** — an exception escaping an unauthenticated endpoint is its own problem, and it was how the
missing-secret mutation was "detected" (by crashing) before the fix.

### 2. `checkout.session.completed` was treated as paid
Stripe's delayed and asynchronous payment methods complete a Session **before the money arrives**, and
report settlement later via `checkout.session.async_payment_succeeded`. The webhook wrote
`payment_status='completed'` to Supabase and emailed paid reports on `completed` alone.

One shared paid-session path now, entered only when `session.payment_status === 'paid'`:
- `completed` + paid → process
- `completed`, not paid → acknowledge, **no writeback, no delivery**
- `async_payment_succeeded` → same path
- `async_payment_failed` → acknowledged and logged; nothing to undo, because nothing was delivered

### The harness was overclaiming
`payTestSession()` retrieved the Session's PaymentIntent and confirmed it directly. **Stripe's Checkout
API states a PaymentIntent belonging to a Checkout Session cannot be confirmed that way.** Removed, and
not replaced with another shortcut: anything that merely makes `payment_status` look paid proves nothing
about the path a customer takes.

The matrix also went `checkout → fake payment → /fulfill`, stepping over the most important
post-payment code. It now completes Checkout for real, then drives a **signed** event into `/webhook`,
and asserts the payment writeback (`completed`, amount, `paid_at`, `payment_verified_at`, payment
intent), delivery, and the marker. `/fulfill` is still tested, but only where it belongs — after a late
profile completion.

And the README promised a browser harness the script did not implement: no server, no patched
calculator, `pk_test` printed but never used, `RETURN_URL_BASE` pointing at a port nothing listened on.
It is real now — a server on 8797 serving the shipped calculator with `API_BASE` and `STRIPE_PK`
rewritten **in memory**, `/api/*` proxied to this process's worker. `ketodial/public/` is never touched,
and GROUP R pins that both constants remain rewritable **and** that the shipped file still carries the
production values.

**One manual card entry per run** is the only human step, stated plainly rather than faked.

### Mutations — all four webhook ones detected on named assertions
signature optional · missing secret trusted · completed treated as paid · `async_payment_succeeded` no
longer fulfilling. The last two initially escaped: one asserted only a status code, satisfied by the
event being silently ignored, and one was caught by a crash rather than an assertion. Both now observe
the side effect (a database write) instead of the response shape. That is the seventh and eighth
masked assertion in this branch.

---

## 2026-09-08 — AUDIT 2B: webhook replay window, secret rotation, and an honest pay page

### Replay protection (production defect)
`verifyWebhookSignature()` validated the HMAC and never looked at `t`. A valid payload plus signature
captured once stayed valid **indefinitely** — the replay attack Stripe names explicitly. Stripe's own
libraries default to a 300-second tolerance, and its retries carry a fresh timestamp and signature, so a
genuine retry is never affected.

Now: timestamp parsed as a number, non-numeric rejected, anything more than 300s from now rejected in
either direction. Mutation-tested with a correctly signed 10-minute-old payload, a 6-minute one, and a
far-future one — all rejected, none writing or emailing anything; a 2-minute-old event still accepted so
real retries keep working.

### Multiple v1 signatures (latent, would have broken a rotation)
The parser did `parts[k] = v`, keeping only the **last** v1. Stripe emits one v1 per active signing
secret, so **during a webhook-secret rotation the header carries several** and the one matching the
current secret may not be last. Rotating the secret would have started rejecting genuine events. All v1
values are collected now and any match is accepted; mutation-tested with the matching signature first,
last, and absent. Comparison is constant-time-ish so a wrong signature leaks no timing.

### One mutation that legitimately cannot be detected
Removing the `/^\d+$/` timestamp shape check changes **no behaviour**: `'abc'` fails `Number.isFinite`,
and `''`, `'-1'`, `'12.5'`, `'1e9'` all land outside the tolerance bound. The guard is defence in depth,
kept because it states the intent where a reader sees it. That is recorded in the code rather than
papered over with a contrived assertion — inventing a test that *appeared* to detect a no-op would be
the masked-assertion problem in reverse.

### The manual pay page was a dead link
The harness printed `/?cs=<session>` and waited. The shipped calculator mounts embedded Checkout only
inside `startCheckout()`, after **its own** `/checkout` call returns a clientSecret, and its URL handling
reads only `session_id` and `finish`. Opening that link showed a page with nothing to pay into, and the
harness would have polled to timeout.

The harness now serves `/pay/<session>`, initialising `Stripe(pk_test)` and mounting embedded Checkout
with the clientSecret of the session it created. **No production change was needed** — the worker
already returns `clientSecret`. GROUP R pins that the calculator still does not consume `?cs`, so if that
ever changes someone re-examines whether `/pay` is still required.

### The finish-profile link was hardcoded
`https://ketodial.com/?finish=…` meant the harness could not follow the one link that proves pay-first
recovery without bouncing into the live site. It and the report error page's "back to the calculator"
link now use `appBaseUrl(env)`, which defaults to exactly `https://ketodial.com`.

### Filed, not gated
Stripe event-ID deduplication (`carnivore-weekly` bead, P2). `reports_delivered_at` plus the
deterministic Resend key already cover most of it; the uncovered case is a duplicate event arriving
outside Resend's 24-hour window and before the marker is written.

---

## 2026-09-08 — AUDIT 2B: harness ready for the Stripe run; still waiting on the key

Code review approved rotating the TEST key. **The key has not been rotated** — it is still
`api_key_expired`, `last_rotated 2026-01-06` — and rotating it is a Stripe Dashboard action behind
Brew's login. Nothing was run.

Two items from the review are in, plus one bug found while implementing them.

**`pk_test_` guard.** The harness validated the secret and not the publishable key. A stale or mistyped
`pk` cannot create a live charge — the Session is made with the test secret — but it surfaces as a
Stripe.js mode mismatch inside the iframe, minutes into a manual run, naming nothing useful. It now
fails at startup.

**Stripe CLI leg.** `--stripe-cli` routes run A's webhook through
`stripe listen --forward-to localhost:8797/api/webhook`, verified against the secret the CLI prints, so
at least one completed purchase is proven against Stripe's real event envelope and signing format
rather than only our own HMAC. B, C and D keep the synthetic signature, which is what makes the replay,
malformed and multi-signature cases deterministic. There is nothing to assert on the forwarded response
— the CLI holds it — so the evidence is the payment writeback, which only the paid path performs.

**A bug that would have made the CLI leg fail for the wrong reason.** The harness `/api/*` proxy
hardcoded `Content-Type` and dropped every other incoming header, so `stripe-signature` would have been
stripped from every forwarded event and each one rejected as unsigned. Fixed; headers are forwarded.

**Ninth masked assertion.** The header-forwarding check asserted that `fwd.set(k, …)` existed, which was
satisfied by iterating an empty object — the headers were still dropped and the test stayed green. It
now names the source (`Object.entries(req.headers)`). Nine of these in this branch; every one was an
assertion that did not name the mechanism it depended on.

## 2026-09-09 — Correcting a live paid report in place, keeping the customer's link

**Decision.** When a paid report's content is wrong, the live `calculator_reports` row is
updated in place and the previous content is preserved in `calculator_reports_archive`.
The row is never deleted and never reissued with a new token.

**Why in place, rather than a new row.** `handleReportContent` looks the report up by
`access_token`, so the token IS the customer's link. `calculator_reports` has
UNIQUE(session_id) and UNIQUE(access_token), so a second row for the same session is
impossible. And `calculator_report_access_log.report_id` is an FK to
`calculator_reports(id)` ON DELETE CASCADE, so delete-and-reinsert would silently
destroy the access audit trail. Update in place is the only option that keeps the link
and the history.

**Why staging, rather than a direct PATCH.** A report is ~55KB of HTML. A two-step
"insert the archive, then PATCH the row" leaves a window where the PATCH lands after a
failed archive, which is unrecoverable content loss, and it is a full-object PATCH: the
same class of call that wiped seven images off two Etsy listings on 2026-08-10. Instead
the bytes are uploaded once into `calculator_report_staging`, verified by length and
sha256 INSIDE the database, and promoted by ONE statement whose data-modifying CTEs all
read the same snapshot, so the archive captures the pre-update content by construction.

**Columns the promotion must not touch.** `access_count` and `last_accessed_at` are
written by a concurrent PATCH in `handleReportContent`; writing them from the promotion
would clobber a view landing mid-statement. `generation_start_at` and
`generation_completed_at` are governed by the `generation_duration` CHECK (both NULL or
both set and ordered), so setting one alone aborts the transaction. `id`, `session_id`,
`email`, `access_token`, `created_at` and `expires_at` are the customer's contract.

**What is not recoverable.** `updated_at` cannot be restored: a BEFORE UPDATE trigger
forces `NOW()` on any change, and any customer view of the report moves it too, because
the access_count PATCH is an update. In this case the original 2026-09-07 `updated_at`
was already gone before the archive existed, moved by a verification fetch. The archive
therefore records the true pre-promotion value, not the original one. Which version a
customer actually read is also not recorded; `calculator_report_access_log` is not
version-stamped. And nothing here reaches an inbox: a report already emailed is out of
the database's reach.

**Operational statements** (promotion, rollback, verification) are in this session's
transcript and are reproducible from the archive. The rollback restores `report_html`
from `calculator_reports_archive` by `(session_id, version_num)` and archives the
displaced content first, so a rollback is itself reversible.

**First application.** Session `6485172b`, report `6a8f272c`, archive version 1.
Original 47,275 chars sha256 `4a8c316a…` preserved, also dumped to
`.claude/backups/` because a copy that lives only in the database you are mutating is
not a backup. Corrected 54,477 chars sha256 `b95de071…` promoted. Her token is unchanged
and the endpoint serves the corrected report byte-identically.

## 2026-09-09 — Assert on the artifact the customer receives

**Decision.** Tests for customer-facing output assert on the FINAL rendered artifact, not on
the input that produces it. Markdown correctness is not evidence of rendered correctness.

**Why.** Raw markdown reached paying readers for an unknown period while three test layers
were green. All three asserted on markdown sections, and one of them stripped the `>` markers
in order to make its assertions, so it could never notice `>` surviving to the customer.
Nothing in the repo rendered. The artifact gate looked at the PDF but only for unreplaced
placeholders.

**Corollary.** A gate is worth exactly what it looks at. When a gate passes something a human
then finds by reading the output, the gate is the bug, and it gets a check for that defect
before anything else is done.

## 2026-09-09 — One canonical helper for anything stated more than once

**Decision.** Where the product says the same thing in several places, one helper owns it.

**Why.** Three versions of "what happens week by week" existed: model-written in Report #1, a
static block in Report #2, and the long form in Report #11. Report #11 was rewritten to be
observational and the other two kept promising outcomes, because nothing tied them together.

## 2026-09-09 — Gate model-written sections, then retry, then fail closed

**Decision.** Content rules for model-written sections are enforced by a render-time gate, not
by prompt wording alone. On violation the section is regenerated with the violation quoted,
bounded at three attempts, and generation fails closed after that.

**Why.** A prompt rule is a request. The first regeneration after the content gates went in
refused outright because the model wrote "digestion often simplifies". Failing closed is
correct, but a paid report dying on a model wobble is not an acceptable customer outcome.

## 2026-09-09 — Never merge evidence bases

**Decision.** Evidence from ketogenic or low-carbohydrate research is labelled as such, and the
report states that it cannot be assumed to transfer to a strict carnivore diet. Direct
carnivore claims require direct carnivore evidence.

**Why.** The one-page doctor handout listed "Low-carbohydrate / ketogenic / carnivore" together
and attributed 60% diabetes remission, metabolic syndrome reversal, superiority for weight loss
and reduced inflammation to all three. A clinician would have caught it, at the patient's
expense. Current direct evidence is nine human studies, mostly case reports and surveys, no
RCTs, no hard endpoints (Nutrients, 2026).

## 2026-09-10 — KetoDial diabetes medication safety policy (Blocker #1, paid report v1)

**Two policies, not one.** `kdDeriveMedicationRisk()` in `ketodial/worker/reports.js` is the single
derivation; every gate reads it.

- **Insulin or sulfonylurea declared: the carb target and meal plan STAY.** Cutting carbohydrate
  lowers blood glucose, and the thing that needs clinical judgement is the DOSE, which this product
  never touches. Low-carbohydrate eating is an accepted option provided medication is adjusted
  proactively, so withholding the number would not remove the risk, only the document whose purpose
  is to start that conversation. All three reports now name the hypoglycemia risk and route dose and
  monitoring to the prescriber, with no condition chip required.
- **SGLT2 inhibitor declared: the ketogenic targets are WITHHELD.** Here the pattern itself is the
  hazard: it is a recognised trigger for euglycemic diabetic ketoacidosis, and glucose can read
  normal throughout, so monitoring copy is not an answer. Suppress, do not substitute. The meal plan
  and both bundles are also withdrawn from sale, and the meal plan becomes a referral with a refund.

**Deliberately NOT `hasDeclaredMedication => suppress`.** Most medications have no interaction with
carbohydrate restriction. Metformin, GLP-1 and DPP-4 drugs are pinned as controls.

**Named accepted residual risk.** Class detection is a term list, and CLAUDE.md's rule is that a
keyword list must never decide whether it is safe to print a number. It does here, and the blunt
"any declared medication" signal cannot be used instead without also suppressing insulin's targets,
which the policy above deliberately keeps. So this is accepted, not solved:

- SGLT2 brands whose names lack the `-gliflozin` stem fail open. `Steglujan`, `Segluromet`,
  `Inpefa` and `Brenzavvy` were found by review and added; the next such brand will miss.
- Misspellings (`Jardience`, `Farxega`, `empagliflozen`) fail open. No fuzzy matching was added:
  it is a new mechanism with its own false-positive cost, and a false positive here fabricates a
  health declaration.
- Insulin has the same shape (`Soliqua`, `Xultophy`, `Ryzodeg`, `Afrezza` miss), but the
  consequence there is a missing warning rather than a leaked number.

**Out of scope and still open**, recorded so it is not mistaken for covered:

- The FREE calculator gives a ketogenic carb target at step 1, before medications are collected at
  step 2, and `handleEmailPlan` gates only on `kidney_status`. The "email me these updated numbers"
  resend button is reachable after step 2, so it can send the four numbers to a customer whose paid
  reports withhold them. Fixing only the resend is cosmetic: the numbers were already on screen.
  The real question is when the calculator asks about medication, which is a product change.
- `productAvailable()` in the `ketodial/public` frontend mirrors the protein gate only, so the
  picker still offers the Meal Plan to an SGLT2 customer and checkout declines it. The decline
  message is now branched so it no longer claims they declared kidney disease, but the mirror needs
  a frontend change in the submodule.

## 2026-09-10 — KetoDial paid report v1 is LIVE and frozen

Released as PR #59, merge `ddf304fa`, worker `ketodial-api` version
`99e89cb9-3c83-4ea3-8bac-94aeaea5f207` at 100%. Four launch blockers, each audited read-only,
fixed in isolation, and signed off by a fresh reviewer against the exact final SHA.

| Blocker | Closed at |
|---|---|
| Renal/adrenal classification | `b5a96493` |
| High-risk diabetes medication safety | `a0d0c3c9` |
| Executable meal portions, macros, grocery | `359bb41b` |
| Responsive paid reports | `b914ee07` |

**The method is the part worth keeping.** Freeze the definition of "good enough to launch"
before looking, cap the blocker count, and send everything else to backlog on sight. Four
blockers were found and four were fixed; copy polish, desktop gutters, free-calculator
architecture, promo-code quirks, broader medication matching, Coach and new verticals were
all left alone on purpose.

**Reviewers must review the final SHA.** Three times a reviewer passed or failed a snapshot
and the code moved afterwards. Each time the blocker was re-reviewed against the exact final
commit before closing. A review of code that no longer exists is not a review.

**Mutation-test the mutation test.** Several probes were themselves wrong and reported
success: the first `.risk` in a document sits in a wider column that never broke, and a
narrower media-query rule survived a mutation that removed only the wider one. A mutation
that quietly proves nothing is worse than no mutation.

**FROZEN. Do not reopen any of the four without a production failure that violates its DONE
condition.** Residuals are recorded above (2026-09-10 medication policy entry) and filed as
beads.

## 2026-09-10 — Revenue mode (Brew)

Banana Stand stops defaulting to "build more stuff". CW is live, KD is live, Etsy has products
and proven demand, and there is traffic, an email list and transaction history.

**Target: Banana Stand pays for Claude + ChatGPT every month.** Small enough to be real,
meaningful because at that point the business funds the tools that improve it.

The operative question is no longer "what should we build" but **"what gets us the next
sale"**. New apps, new verticals and large refactors are off the table until the target is
met consistently. Applies to Coach and to any further KD work.

## 2026-09-10 — Six Command Deck answers (Brew, tapped 05:40 to 05:44 PDT)

First deck taps since 2026-09-04. Answered six of eight pending items in four minutes, about
70 minutes after the morning journal-loop email went out. Two items deliberately left pending.

| Deck | Question | His answer |
|---|---|---|
| `0a4bcd0b` | KD says 4,000-7,000 mg sodium, CW says 3,000-5,000. Which is right? | align Keto Dial to 3,000-5,000 |
| `743206bc` | 71 live posts carry em-dashes. Sample of 5 first? | yes, do the sample of 5 |
| `bc5b446d` | Private issue tracker published in a public repo. Purge the public rows? | yes, purge it and draft me the ticket |
| `85ae6bba` | `carnivoreweekly.com/desserts.html` sells keto dessert cards on the carnivore brand | move it to KetoDial with a forward |
| `6188b0f5` | Add ketodial.com as a second sending domain? | more info needed: "yes, we are going to do this.. I just need some time to assist.. I don't think you can do it all with out me being available" |
| `920ebe5a` | Resend hit 100% of its daily cap. Alarm, or pay $20/mo? | watch it with a 429 alarm, do not pay yet |

**Still pending and NOT answered:** `2c27a5a9` (three fasting posts now publish no potassium
dose, keep or revert) and `3ff9c1aa` (broken paid-report route).

**`3ff9c1aa` IS MOOT AND MUST NOT BE RE-ASKED.** Measured live 2026-09-10 14:1x:
`carnivoreweekly.com/calculator/report.html` now returns 404, not the 200 the question was
written against. Commit `dfb7f510` ("chore: delete the orphaned report viewer page", 05:47 today)
deleted `public/calculator/report.html`, and it is an ancestor of `origin/main`. The page was an
orphan and is gone, so no customer can reach a broken page. Two dead references remain
(`docs/tools/test/test-report-generation.js:121` and an entry in the `scripts/validate.py`
exclusion list); the validator one is harmless because it only excludes a file that no longer
exists.

**Sodium, re-measured before acting:** exactly ONE wrong occurrence repo-wide,
`data/drip-emails/kd/day-2.html` line 48. KetoDial's own blog pages already say 3,000 to 5,000
(`ketodial/public/blog/keto-electrolytes-doses.html` 173/177, `keto-flu-electrolyte-fix.html` 198,
`keto-stall-checklist.html` 204). So the day-2 welcome email contradicted the electrolyte guide it
links to later in the same email. Narrower and sharper than the deck question stated.

**The beads force-push is NOT covered by this approval and was deliberately held.** Rewriting
published history would strand three live branches (`fix/revenue-readiness-batch1`,
`review/kd-report-v1-candidate`, `chore/delete-orphan-report-page`, the last also on the remote).
Purge rehearsed and the GitHub ticket drafted; the irreversible step waits for his line.

## 2026-09-12: Etsy batch shipped, two titles and the keto bundle PDF

Three listings written, 3 of 3 in the rolling 7 day window, every one read back from Etsy.

| Listing | Field | Before | After |
|---|---|---|---|
| `4464217679` Carnivore Diet Food List | title only | `Carnivore Diet Food List Printable \| Zero Carb Allowed Foods Chart \| Beginner Grocery Guide \| Meat Only Cheat Sheet PDF Fridge Poster` (133) | `Carnivore Diet Food List Printable \| Zero Carb Allowed Foods Chart (PDF)` (72) |
| `4514204763` Keto Grocery List Bundle | digital file only | `KetoFoodListBundle.pdf` file id 1499812494876, pre 09-10 build, page 11 printed the retired potassium range | rebuilt 14 page PDF, file id 1514299370882, page 11 prints 2,600 mg (women) / 3,400 mg (men) |
| `4495049647` Keto Food Cheat Sheet | title only | `Keto Food Cheat Sheet Printable \| Low Carb Allowed Foods Chart \| High Fat Diet Kitchen Poster PDF` (97) | `Keto Food Cheat Sheet \| Low Carb Allowed Foods Chart (PDF)` (58) |

Both titles are Etsy's own Search Visibility drafts from the batch 3 table of the 2026-08-22 audit,
applied verbatim. Authority: deck `57b8897c` for the 09-12 title date, standing authority `82e7694e`,
capped by `07de35c8`. Every write was preceded by a Live Changes Log row, preflighted against a
pre-write dump, and verified by a read back that also proved price, tags, description, images, files,
taxonomy and state did not move.

**The two mis-selling tags on `4464217679` were NOT changed.** `carnivore meal prep` and
`weight loss chart` are named in the 2026-09-03 diagnosis, but no dated record approves that specific
tag change: deck `57b8897c` authorised the title and said so. Tags left byte-identical. Still open.

**Held deliberately:** no price on any listing, no image (the `Seda & Sugary Drinks` hero typo on
`4495049647` is still unapproved), no description, no ETSY50 bonus insert card anywhere (deck
`fc47b609` is unanswered and the default is that it does not ship), nothing on `4495056564`.

### Code change: the cap counter stopped charging a slot for website rows

`etsy/edit-cap.mjs` counted any Live Changes Log row in the window that mentions Etsy and names no
listing id as one listing. The 2026-09-11 desserts page move said "every Etsy and Amazon link
unchanged" and therefore ate a slot for a change that wrote nothing to Etsy, leaving the counter at
headroom 2 when the true headroom was 3.

Verified three independent ways that zero Etsy listings were written between 09-06 and 09-12: the
snapshot series shows no title and no price change on any of the 42 live listings on any day from
09-07 to 09-12 (the 09-06 delta is only the 09-05 price writes landing), no Etsy write script or
report in the repo is dated inside the window, and this file records none.

The fix: a row that names no listing id counts only when its **Where** cell says the surface changed
was Etsy. A row that names a listing id is still counted whatever its Where cell says, so the change
narrows the guess and never the evidence. Self-test `etsy/edit-cap.test.mjs` now 13/13, and the hook
suite `tests/test_etsy_write_guard_hook.sh` 39/39. The 2026-09-11 log row itself was not edited; a
dated annotation was added above the table instead.

The two write scripts were single use, run from a temp file in `etsy/` and deleted. Nothing else in
the repo changed.

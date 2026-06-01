# KetoDial Branding Rename

_Started 2026-06-01 16:24 UTC_

---

## User

thinking about Rename from “KetoDial Coach” to “KetoDial Check-In” or “KetoDial Companion.”

Suggested copy shift:

Instead of:
Your accountability buddy / coach
Use:
A simple check-in tool to help you stay consistent with your low-carb plan.
Or:
Your low-carb planning companion — track your targets, spot patterns, and stay dialed in.
Avoid:
- “coach”
- “personalized health advice”
- “accountability buddy” if it feels childish
- anything that sounds like medical/nutrition authority

Best positioning:
Not a coach. Not medical advice. Just a simple way to stay dialed in.

to avoid any indication that its medical advice or need athority as a coach?

## Assistant

_[tool: read_file]_

I'll take a look at the current file first to understand what we're working with, then make the repositioning changes.

_[tool: str_replace_edit]_

This is a smart repositioning — leaning into "stay dialed in" actually plays nicely off the "Dial" in the name. Let me update the hub screen you're viewing to strip the coach/medical-authority framing.Now the cards and footer:

_[tool: str_replace_edit]_

_[tool: done]_

Done — the hub now reads as a neutral check-in tool, not a coach with authority:

- **Headline:** "A simple way to stay dialed in" (plays off the "Dial" in the name)
- **Sub-label:** Coach → **Check-In**
- **Hero:** "...not a coach, not medical advice"
- **Console card:** "Coach review console" → **"Check-in review console"**, persona softened from "Coach Remy" → just **"Remy"**
- **Disclaimer:** now "a check-in tool, not medical or nutrition advice"

One thing to flag: the three sub-screens (**Coach Landing**, **Coach Member App**, **Coach Admin**) still carry the coach/accountability framing throughout — hero copy, the "thread," the admin console labels, etc. Want me to propagate this same repositioning across all three so the whole product is consistent? (I'd keep the filenames as-is to avoid breaking links, just change the visible copy.)

## User

did we decide is the Member App... a web app?  is it able to send notifications to a device? or would that just be email reminders?

## Assistant

_[tool: read_file]_

Good question — let me check what we actually built into the Member App to see what it implies.

Good catch — we never actually nailed this down, and the current screens are quietly contradicting themselves. Here's what's in the build right now:

**What the design implies:**
- It's drawn as a **native phone app** — iOS status bar, notch, bottom tab bar, the whole device frame. Visually it reads "installed app," which sets the expectation of **push notifications**.
- But the only notification mechanism we actually committed to is in Settings: Notifications is set to "Email." No push-permission prompt, no "turn on notifications" step in onboarding.

So today it's an **email-reminder product wearing a native-app costume.** That's the gap.

**The honest options:**

1. **It's really a web app / PWA → email (+ maybe SMS) reminders.** Most pragmatic for a small operation. No app store, no native build. A weekly "time for your check-in" email and a "Remy replied" email. *If this is the truth, we should stop drawing it as a hard native frame* — or at least frame it as "add to home screen." Web push exists but is flaky (especially iOS), so email stays the backbone.

2. **It's a real native app → push notifications.** Stronger nudge ("Your check-in is due," "New reply from Remy" with a badge). But it means an actual app build + app-store presence, which is a much bigger commitment for what's essentially a weekly-cadence product.

**My recommendation:** for a once-a-week check-in loop, **push is overkill** — email is the right primary channel, optionally SMS for the weekly nudge since texts get opened. I'd treat it as a **responsive web app** and soften the hard device framing.

If you agree, I can make the screens consistent with that decision:
- Onboarding: add a lightweight "How should we remind you? ☑ Email ☐ Text" step
- Settings: expand Notifications to show Email / SMS toggles + reminder day (instead of the flat "Email")
- Optionally reframe the phone mock as "in your browser, add to home screen"

Want me to apply that — and should we offer **SMS** alongside email, or keep it email-only?

## User

I think web app is the easiest and most straightforward.. can we make an easy way for someone to bookmark it? 
Also email reminders will be the simple way to go as well. 

I think we decided that if we do this we will only open it to 50 people to start.. might help build momentum and credibility.. also add a bit of 'I better get in now'..

## Assistant

_[tool: str_replace_edit]_

Good calls — all three are sound. Web app + email + 50 founding spots is a tight, credible v1. Let me make the screens reflect those decisions. I'll work in small edits.

First, the **Member App** — reminders become email, plus an "Add to Home Screen" affordance so people can bookmark it:

_[tool: str_replace_edit]_

Now an actual visible **"Add to Home Screen" banner** on the dashboard so bookmarking isn't buried in settings:Now the styles for that banner:

_[tool: str_replace_edit]_

_[tool: read_file]_

Now the **Landing page** — let me add the "50 founding spots" scarcity angle. Let me read it first:

_[tool: str_replace_edit]_

This landing page is the right place for the 50-spot scarcity. Let me add a founding-cohort counter to the hero and a "spots left" bar in the pricing card.

First the styles:Now the hero markup — add the cohort pill, plus a web-app reassurance:

_[tool: str_replace_edit]_

Now the founding pricing card — add the spots-left bar and tie the Standard tier to "after the 50 fill up":

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Let me reinforce the scarcity in the social-proof band:

_[tool: done]_

_[tool: fork_verifier_agent]_

All three decisions are now reflected across the screens:

**Web app + bookmarking** (Member App)
- Dashboard now has a dismissible **"Add to KetoDial to your home screen"** banner — one-tap bookmark guidance, no app store.
- Settings: also listed under Profile as "Add to Home Screen."

**Email reminders** (Member App)
- New **Reminders** group in Settings: weekly check-in reminder (Email · Sun) + reply notifications (Email). No push pretense.

**50 founding spots** (Landing)
- Hero **cohort pill**: "Founding cohort · 19 of 50 spots left" (pulsing dot).
- Founding pricing card now has a **spots-left progress bar** (62% filled) and a "50 spots" tag; Standard tier reframed as the price "after the 50 fill up."
- Social-proof band reinforces the cap.
- Also swapped the hero from "coach that checks on you" → "check-in that keeps you honest" and added a "Works in your browser" trust marker.

A verifier is double-checking the visuals in the background.

One open thread: the deeper screens (onboarding waiver, thread, check-in, admin console) still lean heavily on the word **"coach"** — "Coach Remy," "Send to my coach," the medical waiver copy. Want me to finish propagating the check-in/companion repositioning through those, or keep "coach" as the human-reviewer role and only soften the medical-authority bits?

## User

Save this design as a PDF: coach/Coach Landing.html

## Assistant

I'll create a print-ready version of the landing page. Let me read the current CSS to understand the variables and any constraints.

_[tool: read_file]_

_[tool: copy_files]_

I'll create the print-ready copy in the same directory so the relative `coach.css` and asset paths keep working.

_[tool: str_replace_edit]_

Now let me verify it loads cleanly before adding the auto-print script:

_[tool: show_html]_

_[tool: show_html]_

_[tool: get_webview_logs]_

Clean. Now let me add the auto-print script that waits for fonts to load:

_[tool: str_replace_edit]_

_[tool: open_for_print]_

The print tab should open with the print dialog ready — just choose **Save as PDF**. If it didn't pop up, [open it here](https://57d29c03-9e1a-4e7d-90d8-f69df5457318.claudeusercontent.com/v1/design/projects/57d29c03-9e1a-4e7d-90d8-f69df5457318/serve/coach/Coach%20Landing-print.html?t=2c908ba9e2279349c14cf6aac482b3307e65cac070cc1b8780c6be37324060af.51890717-21f4-4aac-8d9a-37f63cd50afd.e8e5ec39-2db5-4ee5-a404-70f103da82f9.1780333164&direct=1). All sections print with backgrounds intact and the FAQ expanded.

## User

See attached first 

Then the FAQ can clarify:
“Text-based, not live chat or medical advice.”

## Acceptance criteria

- Product remains KetoDial Coach.
- Page leads with benefits, not restrictions.
- Pricing has two plans only: Weekly $49/mo and Daily $129/mo.
- Daily is framed as high-accountability.
- Response cadence is clear.
- Boundaries are in FAQ/fine print, not dominating the hero.

## Assistant

_[tool: str_replace_edit]_

Got it — this reverses course back to "coaching" language with strong value-first positioning, two text-based plans, and boundaries pushed to the FAQ. Let me rework the landing page section by section.

First, the hero:Now the nav CTA and the "How it works" section:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now the "What you get" section — converting to a benefits-only grid (boundaries move to FAQ):

_[tool: str_replace_edit]_

Now the pricing — two plans only, with Daily featured as high-accountability:

_[tool: str_replace_edit]_

Now the FAQ — new questions with boundaries living here:Now the social-proof stat, the bottom CTA band, and the footer copy:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Let me update the page title and the social-proof note to match:

_[tool: done]_

_[tool: fork_verifier_agent]_

The landing page is reworked to the new positioning. Summary of changes:

- **Hero** — "Low-carb accountability that actually checks in," value-first subhead, **Start coaching** / **See how it works** CTAs, and 4 trust bullets (weekly-or-daily, human-reviewed, no logging, cancel anytime).
- **How it works** — retitled "A simple accountability rhythm…" with the three rewritten steps (tell us where you are → check in on your rhythm → get one clear focus).
- **What you get** — collapsed the get/isn't contrast into a single benefits-only card (6 value bullets); all boundaries moved to the FAQ.
- **Pricing** — now two plans only: **Weekly $49** and **Daily $129** (featured, "Best for high accountability" badge).
- **FAQ** — leads with "Is this live chat?" and covers video calls, who the coach is, food logging, medical, cancel.
- Footer/CTA/social-proof copy aligned to "by text — weekly or daily."

Two things to flag:
1. I **kept the "Founding cohort · 19 of 50 spots left"** pill and proof-note since you were keen on the 50-spot momentum last round — it reads as urgency, not a disclaimer. Say the word if you'd rather drop it now that pricing is two-tier.
2. The **hub and member-app screens still say "Check-In"** from the earlier de-coaching pass, which now conflicts with keeping the product name **KetoDial Coach**. Want me to revert those back to "Coach" so everything's consistent?

A verifier is checking the layout in the background.

## User

Verifier agent check completed

## Assistant

Good catch — the cohort pill needs to be block-level so the eyebrow drops below it. Quick fix:

_[tool: str_replace_edit]_

_[tool: done]_

Fixed — the cohort pill is now block-level (`display:flex; width:fit-content`), so the eyebrow drops cleanly onto its own line below it. Everything else the verifier already confirmed correct.

One heads-up: the **print PDF version** (`Coach Landing-print.html`) was generated before this rewrite, so it still has the old hero and three-tier pricing. Want me to regenerate it to match the new positioning?

## User

yes

## Assistant

I'll regenerate the print version from the current landing page so it picks up all the new copy and the two-plan pricing.

_[tool: copy_files]_

Now re-apply the print styles and auto-print script to the fresh copy:

_[tool: str_replace_edit]_

_[tool: open_for_print]_

Regenerated with the new positioning, two-plan pricing, and updated FAQ — the print tab should open with the dialog ready (choose **Save as PDF**). If it didn't pop up, [open it here](https://57d29c03-9e1a-4e7d-90d8-f69df5457318.claudeusercontent.com/v1/design/projects/57d29c03-9e1a-4e7d-90d8-f69df5457318/serve/coach/Coach%20Landing-print.html?t=b8d9220efbdf483c978c82cbc8970bf7d2bfe2e918fba53e3430805412e8a56a.51890717-21f4-4aac-8d9a-37f63cd50afd.e8e5ec39-2db5-4ee5-a404-70f103da82f9.1780336464&direct=1).

## User

Looks good. Keep the founding cohort pill for now.

For the hub/member-app screens, do not fully revert everything back to “Coach.”

Use this hierarchy:

- Product/brand name: **KetoDial Coach**
- Navigation/app sections: **Check-Ins**, **Responses**, or **Progress**
- Person/entity: **Coach Remy**
- User action: **Add a note** / **Submit check-in**
- Avoid: **Message your coach** as the main action unless response cadence is clearly shown

So yes, make the branding consistent with KetoDial Coach, but keep the UI language cadence-based.

Examples:

Header:
`KetoDial Coach`

Dashboard card:
`Your next check-in`
`Latest coaching response`

Button:
`View response`
`Submit check-in`

Input:
`Add a note for your next response...`

Bottom nav:
- Home
- Check-Ins
- Responses
- Progress
- Account

Not:
- Chat
- Messages
- Open thread
- Message coach

The goal is:
**KetoDial Coach is the product. Check-ins/responses are how it works.**

Also keep the “Founding cohort · 19 of 50 spots left” pill. It’s useful urgency and doesn’t hurt the positioning.

## Assistant

_[tool: read_file]_

Clear hierarchy — brand stays "KetoDial Coach," UI language goes cadence-based. Let me read the member app's JS first so I rename things without breaking the rendering logic, and to see how feasible the 5-tab nav (adding Progress) is.

_[tool: str_replace_edit]_

This is a substantial restructure — I'll establish the hierarchy across the member app (including the new 5-tab nav with a Progress section), then the hub, keeping internal view keys but swapping all user-facing labels to cadence language.

Let me start with the dashboard — relocate Progress into its own view and rename the responses section:Now the check-in submit, thread input/banner, settings plan, and the tab bar:

_[tool: str_replace_edit]_

Now the bottom tab bar — rebuild to the 5-item cadence nav:

_[tool: str_replace_edit]_

Now the rail labels, jump buttons, and onboarding (waiver wording, cadence selector, "Meet Coach Remy"):

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now the member app logic — register the Progress view and update the appbar titles and button labels:

_[tool: read_file]_

Now the hub — restore the **KetoDial Coach** brand while keeping cadence language. Let me read its current state:

_[tool: str_replace_edit]_

_[tool: done]_

Let me verify the member app — it has the most structural change (new Progress view + JS). I'll surface it and check it works:

_[tool: fork_verifier_agent]_

The hierarchy is now consistent across all three screens. Summary:

**Brand** — "KetoDial Coach" restored everywhere (hub sub-label, hero, footers).

**Member app — cadence-based UI:**
- Bottom nav rebuilt to 5 tabs: **Home · Check-Ins · Responses · Progress · Account** (no more "Coach/Chat/Settings"). Added a real **Progress** view (weight trend + streak + stats moved out of the dashboard into its own tab).
- Dashboard: "Your coach" → **"Latest coaching response"** with an "All responses →" link; quick-reply placeholder → **"Add a note for your next response…"**.
- Status card: **"New response from Coach Remy"** + **"View response"** button.
- Check-in submit → **"Submit check-in"**, with cadence shown: "Coach Remy reviews this and sends your response within a day."
- Responses thread input → **"Add a note for your next response…"**, banner keeps cadence.
- Onboarding now asks **weekly ($49) or daily ($129)**, waiver reworded to "coaching, not medical care," CTA → "Meet Coach Remy."
- Account: plan shows "Weekly Check-In · $49/mo."

**Person** stays **Coach Remy** throughout. Verifier is confirming the Progress tab and renamed nav in the background.

One note: the admin/review console (`Coach Admin.html`) still uses its old internal labels — I left it untouched since it's the coach-facing tool, not the member UI. Say the word if you want the same cadence pass applied there.

## User

Verifier agent check completed

## Assistant

Verified clean — the 5-tab nav, the new Progress view, and all the cadence-based labels are working with no console errors. The branding hierarchy is now consistent across the hub, landing page, and member app. Let me know if you'd like the same pass applied to the admin/review console.

## User

Send this design to Canva: coach/Coach Member App.html

## Assistant

I'll start by checking whether Canva is connected.

_[tool: copy_files]_

_[tool: tool_search_tool_bm25]_

Canva is connected. I'll bundle the member app into a self-contained file. First, copy the design and its dependencies into `export/src/`:Now add the required bundler thumbnail template to the copy:

_[tool: str_replace_edit]_

_[tool: super_inline_html]_

_[tool: show_html]_

_[tool: get_webview_logs]_

Bundle is clean. Now get a public URL and import it into Canva:

_[tool: get_public_file_url]_

_[tool: canva__import-design-from-url]_

Imported successfully. Your member app is now an editable Canva design:

**[Open in Canva →](https://www.canva.com/d/1oSNhhgAUsn651O)**

One heads-up: Canva flattens an HTML import into a static, editable layout — it captures the visual design as-is, so the interactive bits (tab switching, the live Responses thread, member-state toggle) won't function inside Canva. It'll land on the default view (Alex's dashboard). If you want other screens (Check-Ins, Progress, Account, a member's thread) captured as their own pages, let me know and I can export those states too.


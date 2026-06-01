---
updated: 2026-05-31
---

# KetoDial Coach — Design Brief for Claude Design

## What We're Building

A paid membership web app where people on keto or carnivore diets get a weekly accountability coach. The coach is AI-assisted with human oversight — members don't know (or need to know) the exact split. It feels like texting a real health coach who remembers you, checks on you, and gives you one thing to focus on each week.

The core insight: most diet apps are passive — you log food, you see a chart, nobody cares. This one is active. Someone is checking on you. That feeling of "my coach is going to ask how my week went" is the entire product. Every design decision should reinforce that.

Think of it as the difference between a gym membership (passive) and a personal trainer (active). We're the trainer.

## Who It's For

People who already know keto or carnivore works for them. They've tried it, maybe fallen off, maybe stalled. They don't need to be educated on what keto is. They need someone in their corner keeping them consistent. Typical member:

- 30-55 years old
- Has done keto before (maybe multiple times)
- Knows the basics but struggles with consistency
- Has a specific goal (lose 30 lbs, fix blood sugar, get off medication)
- Willing to pay $49-59/month for accountability
- Uses their phone for everything — this must be mobile-first

## The Parent Brand

This lives under KetoDial (ketodial.com), our keto-focused calculator and content site. The same system will also serve Carnivore Weekly (carnivoreweekly.com) members with different branding. The backend is identical — only the visual skin and diet-specific language change.

### KetoDial Design Language (match this)
```
Colors:
  --bg: #f1f5f9 (light blue-gray background)
  --surface: #ffffff (white cards)
  --ink: #0f172a (near-black text)
  --ink-soft: #475569 (secondary text)
  --ink-faint: #94a3b8 (tertiary/labels)
  --line: #e2e8f0 (borders)
  --accent: #38bdf8 (sky blue — buttons, highlights)
  --accent-deep: #0ea5e9 (darker blue — links, CTAs)
  --panel: #0b1620 (dark navy — footer, dark sections)

Typography:
  --sans: "Hanken Grotesk" (UI, headings, buttons)
  --mono: "JetBrains Mono" (labels, kickers, data)
  --serif: "Newsreader" (body text in articles — may not need in app)

Logo: KetoDial dial/gauge icon with "Keto" in regular weight, "Dial" in accent blue bold
Border radius: 12-16px on cards, 10px on buttons, 999px on pills
Shadows: subtle, cool-toned (rgba(15,23,42,.04) and rgba(15,23,42,.12))
```

The overall feel is clean, modern, clinical-but-warm. Tool-first, not lifestyle-blog-first. Think "health dashboard" not "wellness influencer."

---

## The Screens

### Screen 1: Landing Page

**Purpose:** Convert a KetoDial calculator user or Carnivore Weekly reader into a paying member. This is the sales page.

**Why it matters:** Nobody will sign up for "AI coaching" — they'll sign up because they're tired of starting keto for the third time and quitting by week 4. The page needs to hit that pain point hard, then show that weekly accountability is the fix.

**What's on it:**
- Hero section with headline, subhead, and primary CTA
- "How it works" — 3 steps (sign up → check in weekly → get coached)
- What you get (weekly check-in, personalized guidance, human-reviewed, your history remembered)
- What this is NOT (not medical advice, not a food tracker, not a chatbot)
- Pricing card(s) — Founding Member $49/month, Standard $59/month, Premium $99/month
- FAQ section (how often do I check in? who is the coach? can I cancel? is this medical advice?)
- Social proof area (empty at launch, but design the space — testimonials, member count, streak stats)
- Footer with disclaimer: "KetoDial Coach provides nutrition accountability coaching, not medical advice."

**Headline options to try:**
- "Stop tracking alone."
- "The low-carb coach that checks on you."
- "Weekly accountability for people serious about keto."
- "Your keto coach is expecting your check-in."

**Tone:** Confident but not pushy. This isn't a "limited time offer" scarcity page. It's "if you're tired of doing this alone, we're here."

**Key UX note:** The CTA should say something like "Start my coaching" or "Join the founding cohort" — not "Subscribe" or "Sign up" (those sound transactional, not personal).

---

### Screen 2: Onboarding Flow

**Purpose:** Get the new member's information so the coach can personalize from day one. Also, set expectations and get the waiver signed.

**Why it matters:** The intake form IS the first coaching interaction. If it feels like a medical intake form, they'll feel like a patient. If it feels like a conversation with a new coach, they'll feel cared for. The waiver is legally necessary but shouldn't feel like reading terms of service.

**Flow (3 steps, not one giant form):**

**Step 1 — Welcome + Waiver**
- "Welcome to KetoDial Coach. Before we get started, a quick note."
- Short paragraph: "Your coach is a health coach, not a doctor. We provide nutrition accountability and guidance. For medical questions — medications, symptoms, diagnoses — we'll always point you to your healthcare provider. That's not a cop-out, it's just the right thing to do."
- Checkbox: "I understand this is coaching, not medical advice."
- CTA: "Got it, let's go"

**Step 2 — About You**
- Name, age, sex, height, current weight, goal weight
- Activity level (sedentary / lightly active / active / very active)
- Diet type (keto / carnivore / low-carb)
- How long have you been eating this way? (just starting / weeks / months / years)
- Health conditions (checkboxes: type 2 diabetes, PCOS, thyroid, high blood pressure, none of these)
- Current medications (optional free text)

**Design note:** Make the health conditions section feel casual, not clinical. Something like "Anything your coach should know about?" rather than "Pre-existing conditions." The medications field should say "Optional — helps your coach give better guidance."

**Step 3 — Your Goals**
- What's your biggest challenge right now? (free text, 2-3 sentences)
- What does success look like for you in 3 months? (free text)
- What day works best for your weekly check-in? (dropdown: Sunday through Saturday)
- How did you hear about us? (dropdown)
- CTA: "Meet your coach" → goes to dashboard with a welcome message already in the thread

**Why 3 steps:** A single giant form feels like homework. Three conversational steps feel like a coach getting to know you. Progress bar across the top so they see it's quick.

---

### Screen 3: Member Dashboard

**Purpose:** This is "home." The member opens the app, sees their dashboard, and knows exactly what to do. The primary action is always clear: submit your check-in (if due) or read your coach's latest message.

**Why it matters:** If the dashboard is just data (charts, numbers, history), it's passive and they'll stop opening it. The dashboard needs to create gentle urgency — "your coach is waiting" — without feeling naggy.

**Layout (mobile-first, single column on phone):**

**Top section — Status card**
- If check-in is due: "Your weekly check-in is ready" with prominent button. Maybe show coach avatar + "Coach Sarah is expecting your update."
- If check-in submitted, awaiting response: "Check-in received ✓ Your coach will respond within 24 hours."
- If coach has responded: "You have a new message from your coach" with preview snippet.

**Coach thread preview**
- Latest message exchange (last coach response + your last message)
- "View full conversation" link
- "Message your coach" quick-reply input

**Progress section**
- Weight trend line (last 8 weeks, simple, no daily noise)
- Current streak: "6 weeks in a row ✓" with a small streak flame/icon
- This week's focus (the one action item from last coach response, pulled and displayed prominently)

**Bottom section**
- Quick stats row: weeks active, total check-ins, weight change since start
- Settings gear icon → profile, subscription, preferences

**Key UX decisions:**
- No hamburger menu. Everything visible. This is a simple app.
- The check-in CTA should be impossible to miss when it's due.
- The streak counter creates positive pressure without guilt. "6 weeks" feels like something you don't want to break.
- "This week's focus" keeps the coaching front and center even between check-ins.
- The weight chart should show the TREND line (smoothed), not daily fluctuations. Women especially need this — their weight can swing 2-5 lbs in a week due to hormones (we wrote a whole blog post about this).

---

### Screen 4: Weekly Check-In Form

**Purpose:** The member reports how their week went. This is the raw material the coach uses to respond.

**Why it matters:** This form runs every single week. If it's tedious, people stop. If it's too short, the coach can't give useful advice. The sweet spot is 2-3 minutes — quick enough to do on the couch Sunday evening, detailed enough to be useful.

**Fields (in order):**

Section 1 — The Numbers (quick taps)
- Current weight (number input, pre-filled with last week's for easy edit)
- Average daily steps (number, or "I didn't track" option)
- Sleep quality (1-5 tap scale with labels: terrible / poor / okay / good / great)
- Energy level (1-5 tap scale: crashed / low / normal / good / fired up)
- Cravings (1-5 tap scale: none / mild / moderate / strong / intense)
- Adherence to plan (1-10 slider: "How closely did you follow your plan?")

Section 2 — The Story (free text)
- "What went well this week?" (text area, placeholder: "Any wins, even small ones")
- "What was hard?" (text area, placeholder: "Struggles, slip-ups, frustrations — be honest")
- "Anything your coach should know?" (text area, placeholder: "Symptoms, life stuff, questions — whatever's on your mind")

**Design notes:**
- The 1-5 scales should be BIG tap targets (mobile thumbs). Not dropdowns. Think emoji-style or pill buttons.
- Pre-fill weight with last entry so they just adjust the number.
- The free text fields should feel inviting, not clinical. Placeholder text matters a lot here.
- A "Save draft" option is nice in case they start on the bus and finish later.
- Submit button: "Send to my coach" (not "Submit" — reinforces the human connection)
- After submit: "Got it! Your coach will review this and respond within 24 hours. ✓"

---

### Screen 5: Coach Messaging Thread

**Purpose:** The ongoing conversation between member and coach. This is where the relationship lives.

**Why it matters:** The thread IS the product. Not the charts, not the forms — the thread. If this feels like a support ticket system, the product fails. If it feels like texting a coach who knows you, the product wins.

**Layout:** iMessage / WhatsApp style conversation thread.
- Coach messages on the left (with coach avatar + name)
- Member messages on the right
- Timestamps between messages (grouped by day)
- Check-in responses are visually distinct — maybe a card-style message with the check-in data summarized, followed by the coach's written response
- Quick-reply input at the bottom (always visible): "Message your coach..."
- Small note under input: "Your coach responds within 1 business day"

**Coach message anatomy:**
A typical weekly coach response might be:

```
Hey [Name] 👋

Great week — 7/10 adherence and you hit your steps 
target 4 out of 7 days. That's real progress.

I noticed your cravings jumped to a 4 this week. You 
mentioned evenings are the hardest. That tracks with 
what we talked about last week.

For this week, try this: move your biggest meal to 
dinner and make sure it has at least 30g of fat. That 
usually kills the evening cravings within a few days.

How's the magnesium before bed going? Still helping 
with sleep?

— Coach Sarah
```

**Design notes:**
- The coach avatar + name make it feel personal. Use the writer personas (Sarah, Marcus, Chloe) or a generic "Coach" identity.
- Coach messages should feel warm and scannable — short paragraphs, bold key points, one clear action item.
- Don't over-design the messages. WhatsApp is the gold standard because it's simple.
- Typing indicator ("Coach is reviewing your check-in...") would be a nice touch when a response is being drafted but hasn't been sent yet. Optional.

---

### Screen 6: Admin Review Queue (Brew's Screen)

**Purpose:** This is where Brew (or a future reviewer) spends 30 minutes a day reviewing AI-drafted coaching responses before they're sent to members.

**Why it matters:** This screen determines whether the business is sustainable. If reviewing 30 messages takes 2 hours, Brew burns out. If it takes 20 minutes, it scales. Every design decision should optimize for SPEED without sacrificing quality.

**Layout: Two-panel (desktop-optimized, this is a work screen)**

**Left panel — Queue list**
- List of pending items, sorted by:
  1. Red-flagged messages (medical content detected) — highlighted in red/orange
  2. New members (first 2 weeks) — highlighted with "NEW" badge
  3. Oldest first (everything else)
- Each item shows:
  - Member name
  - Message type icon (check-in response / thread reply)
  - Time waiting (e.g. "3h ago")
  - Red flag indicator if applicable
  - First line of AI draft preview
  - One-click "Approve" button right on the list item (for quick approvals without opening)

**Right panel — Message detail (when an item is selected)**
- **Member context card (top):**
  - Name, photo/avatar, weeks active, tier
  - Current weight → goal weight (with trend arrow)
  - Diet type, key health conditions (if any)
  - Streak count
  - Coach notes (editable — Brew can add "this person travels a lot" or "sensitive about weight discussions")
  - Last 3 check-in summaries (collapsed, expandable)

- **This check-in data (middle):**
  - All the numbers in a clean grid (weight, steps, sleep, energy, cravings, adherence)
  - Visual indicators: green/yellow/red based on trend vs last week
  - Free text responses displayed clearly

- **AI draft (bottom):**
  - The full AI-generated coach response
  - Editable text area — Brew can modify before sending
  - Red-flag callouts highlighted inline if medical content was detected
  - Action buttons: **Approve & Send** (primary), **Edit & Send**, **Flag for Later**

**Key UX decisions:**
- Keyboard shortcuts: Enter = Approve & Send, Tab = next item. Brew should be able to fly through routine ones.
- The one-click approve on the list view is essential. If the AI draft preview looks good and the member is established, Brew can approve without even opening the detail view.
- Red-flagged items should be visually unmissable — they require human judgment.
- The member context card prevents Brew from having to remember 50+ members. Everything needed to evaluate the response is on one screen.
- Stats at top of queue: "12 pending · 2 red-flagged · 0 overdue" so Brew knows the workload at a glance.

---

### Screen 7: Admin Member Detail View

**Purpose:** Deep-dive into a specific member's history. Used when Brew needs more context than the review queue provides — maybe a member is struggling, or has been flagged multiple times, or Brew wants to write a more personalized response.

**Why it matters:** This is the "patient chart" equivalent. It gives Brew the longitudinal view that makes coaching feel personal. Without it, every response is reactive. With it, Brew can say "you've lost 12 lbs in 8 weeks, that's faster than most people" — which is incredibly powerful.

**Layout:**

**Header:** Member name, avatar, status (active/paused/cancelled), tier, member since date

**Tab 1 — Overview**
- Weight chart (full history, with goal line)
- Check-in consistency chart (which weeks they checked in)
- Key metrics summary: starting weight, current weight, change, average adherence, streak
- Current protocol/phase notes
- Coach notes (editable free text)

**Tab 2 — Check-in History**
- Chronological list of all check-ins
- Each expandable to see full data + the coach response that was sent
- Trend indicators on key metrics

**Tab 3 — Message Thread**
- Full conversation history (same as member sees, but with AI draft vs. final sent version visible)
- Audit trail: shows if a message was auto-sent, human-approved, or human-edited

**Tab 4 — Account**
- Subscription details (tier, start date, billing status)
- Intake form responses (original answers)
- Health conditions and medications on file
- Pause/cancel controls

---

## General Design Principles

1. **Mobile-first for members.** They'll check in on their phone Sunday night. Desktop is fine for browsing, but the check-in form and messaging must be thumb-friendly.

2. **Desktop-first for admin.** Brew reviews on a laptop. The admin queue needs screen real estate — two panels, keyboard shortcuts, density.

3. **Warmth without cheese.** This should feel like a coaching relationship, not a wellness app with meditation bells and pastel gradients. Clean, professional, but human. Think "your smart friend who happens to know a lot about nutrition" not "corporate health program."

4. **The check-in CTA is king.** Wherever the member is in the app, if their check-in is due, that should be the loudest thing on screen. The entire business model depends on weekly check-ins happening.

5. **Less is more on data visualization.** One weight trend line is better than six charts. One focus item is better than a dashboard of 20 metrics. Members are here for accountability, not analytics.

6. **The coach thread should feel like a real conversation.** Not a ticketing system, not a form response, not a notification feed. A conversation.

---

## What We're NOT Designing (yet)

- Native mobile app (web app only for MVP)
- Food logging / meal tracking
- Recipe integration
- Community / forum
- Video call interface (Calendly embed later)
- Device sync UI (HealthKit / Google Fit — Phase 4)
- Carnivore Weekly branded version (same screens, different CSS variables + logo)

---

## Reference Apps

- **Noom** — onboarding flow is excellent (conversational, step-by-step, feels like a quiz not a form)
- **WhatsApp** — messaging UX gold standard (simple, fast, personal)
- **Intercom** — admin inbox/queue UX (two-panel, context sidebar, quick actions)
- **Calibrate** — clean medical-adjacent design without feeling cold
- **Headspace** — warm onboarding that sets expectations clearly

## Files

- Full product spec with database schema, AI guardrails, and build phases: `ketodial/PLAN-coach-app.md`
- KetoDial site (live): ketodial.com
- KetoDial blog post template (for brand reference): `ketodial/public/blog/keto-flu-electrolyte-fix.html`

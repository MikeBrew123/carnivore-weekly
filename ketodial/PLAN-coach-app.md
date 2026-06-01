---
updated: 2026-05-31
status: planning
---

# KetoDial Coach — Product Spec

**What it is:** A paid membership web app where keto/carnivore members get weekly accountability check-ins from an AI-assisted health coach with human oversight.

**What it isn't:** Medical advice, a food tracker, a calorie counter, or a chatbot.

**Tagline:** "The low-carb coach that checks on you."

**Sites:** KetoDial.com + CarnivoreWeekly.com (same backend, different branding)

---

## Business Model

| Tier | Price | What they get |
|------|-------|---------------|
| **Founding Member** | $49/month | Weekly check-in + coach messaging (locked while active) |
| **Standard** | $59/month | Same as above (after founding cohort fills) |
| **Premium** | $99/month | Everything + monthly 15-min video call + priority review |

**Revenue targets:**
- 5 members = $245/month (validates concept)
- 20 members = $980/month (covers time)
- 50 members = $2,450/month (hire part-time reviewer)
- 100 members = $4,900/month (real business)

---

## User Flow

### 1. Landing Page → Sign Up
- Hero: "Stop tracking alone. Get a weekly keto accountability coach."
- CTA: "Join the founding cohort — $49/month"
- Value props: weekly check-in, personalized guidance, human-reviewed, protocol-based
- NOT: "AI coach" — say "AI-assisted, human-reviewed coaching"

### 2. Onboarding (after Stripe payment)
- **Waiver/disclaimer** (required checkbox):
  "KetoDial Coach provides nutrition accountability coaching, not medical advice. Your coach is a health coach, not a doctor. For medical questions, medications, symptoms, or health conditions, always consult your healthcare provider. By continuing, you acknowledge this."
- **Intake form:**
  - Name, email, age, sex
  - Current weight, goal weight
  - Height
  - Activity level
  - Diet type (keto / carnivore / low-carb)
  - How long on this diet
  - Health conditions (checkboxes: diabetes, PCOS, thyroid, blood pressure, none)
  - Medications (free text, optional)
  - Previous diets tried
  - Biggest challenge right now (free text)
  - What does success look like for you? (free text)
  - How did you hear about us?

### 3. Dashboard (member home)
- **This week's check-in** (prominent CTA if not yet submitted)
- **Coach thread** (latest message exchange)
- **Progress chart** (weight over time, simple line)
- **Streak counter** (weeks of consecutive check-ins)
- **"Your coach is expecting your update"** nudge if check-in is due

### 4. Weekly Check-In Form
Due every Sunday (or member-chosen day). Nudge email if not submitted by end of day.

Fields:
- Current weight (number)
- Average daily steps this week (number)
- Sleep quality (1-5 scale)
- Energy level (1-5 scale)
- Hunger/cravings (1-5 scale, 1=none, 5=intense)
- Adherence to plan (1-10 scale)
- Wins this week (free text)
- Biggest struggle (free text)
- Any symptoms or concerns? (free text)
- What do you want help with this week? (free text)

### 5. Coach Response (within 24 hours)
AI drafts a response. Brew reviews and approves/edits/sends.

Response structure:
- Acknowledge their week (reference specific things they said)
- Pattern spotted (compare to previous weeks)
- Encouragement (genuine, not generic)
- One primary adjustment for next week
- One optional experiment to try
- If medical content detected: "That's a great question for your doctor. Here's what I'd suggest you discuss with them: [context]"
- Question to think about for next week

### 6. Messaging (between check-ins)
- Member can message anytime
- Response within 1 business day
- AI drafts, human reviews
- Fair-use: no hard limit, but designed as async coaching, not real-time chat

---

## Admin Review Queue (Brew's daily 30-min workflow)

This is the most important screen in the app. Design it well.

### Queue View
- Sorted by: red-flag messages first, then oldest unreviewed
- Each item shows:
  - Member name + avatar
  - Message type: check-in / message / reply
  - Red-flag indicator (medical content detected)
  - AI draft preview (first 2 lines)
  - Member context summary (current weight, weeks active, trend, last check-in highlights)
  - Time since message received

### Review Actions
- **Approve & Send** (one click — sends AI draft as-is)
- **Edit & Send** (opens editor with AI draft, modify, then send)
- **Flag for Follow-up** (mark for deeper review later)
- **Escalate** (rare — triggers "please consult your doctor" template)

### Auto-Send Rules (Phase 2, after 30+ members)
- Routine check-ins with no red flags and adherence 7+ can auto-send
- First-week members always get human review
- Any message containing medical keywords gets flagged
- Brew can toggle auto-send per member or globally

---

## AI Coach System

### System Prompt (core identity)
```
You are a keto/carnivore health coach for KetoDial Coach. Your name is
[Coach Name — TBD, or use the writer personas: Sarah for health,
Marcus for performance].

You are a health coach, NOT a doctor. You provide nutrition accountability
coaching, habit support, and protocol guidance.

NEVER:
- Diagnose conditions
- Recommend stopping or changing medications
- Interpret lab results as medical advice
- Provide eating disorder treatment
- Suggest anything that contradicts their doctor's advice

ALWAYS:
- When a member mentions medications, symptoms, diagnoses, or medical
  concerns, respond with: "That's a great question for your doctor.
  Here's what I'd suggest you discuss with them: [provide context they
  can bring to their appointment]."
- Reference their previous check-ins and history
- Be warm, direct, and specific (not generic motivational fluff)
- Give ONE primary action item per week (not a list of 10 things)
- Use their name
- Match the voice of the KetoDial/CW blog content (conversational,
  evidence-informed, no AI tells, contractions, grade 8-10 reading level)
```

### Context Window (per member)
Each AI call includes:
- Member profile (intake data)
- Last 8 check-ins (summarized)
- Last 4 coaching exchanges
- Current protocol/phase
- Red-flag history
- Coach notes (human-added context)

### Medical Keyword Detection
Flag any message containing:
- Medication names / "meds" / "prescription"
- "dizzy" / "faint" / "chest pain" / "heart" / "blood pressure"
- "pregnant" / "nursing" / "fertility"
- "eating disorder" / "binge" / "purge" / "anorexia"
- "emergency" / "hospital" / "ER"
- "stop taking" / "quit my meds"
- "suicid" / "self harm" / "depressed" (→ immediate crisis resource link)

Flagged messages always require human review, never auto-send.

---

## Database Schema (Supabase)

### Tables

```sql
-- Members (extends Supabase auth.users)
create table members (
  id uuid primary key references auth.users(id),
  site text not null check (site in ('ketodial', 'carnivoreweekly')),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text default 'active',
  tier text default 'standard' check (tier in ('founding', 'standard', 'premium')),
  display_name text not null,
  email text not null,
  age int,
  sex text,
  height_cm numeric,
  start_weight numeric,
  goal_weight numeric,
  activity_level text,
  diet_type text check (diet_type in ('keto', 'carnivore', 'lowcarb')),
  diet_duration text,
  health_conditions text[], -- array of condition strings
  medications text,
  biggest_challenge text,
  success_vision text,
  checkin_day text default 'sunday',
  coach_notes text, -- human-added context about this member
  onboarded_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Weekly Check-ins
create table checkins (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) not null,
  week_number int not null, -- weeks since onboarding
  weight numeric,
  steps_avg int,
  sleep_quality int check (sleep_quality between 1 and 5),
  energy_level int check (energy_level between 1 and 5),
  cravings_level int check (cravings_level between 1 and 5),
  adherence int check (adherence between 1 and 10),
  wins text,
  struggles text,
  symptoms text,
  help_request text,
  submitted_at timestamptz default now()
);

-- Coach Messages (the thread)
create table messages (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) not null,
  direction text not null check (direction in ('member', 'coach')),
  content text not null,
  ai_draft text, -- original AI draft (for audit trail)
  was_edited boolean default false, -- human edited before sending
  was_auto_sent boolean default false,
  red_flag boolean default false,
  red_flag_reason text,
  review_status text default 'pending' check (review_status in ('pending', 'approved', 'edited', 'flagged')),
  reviewed_by text, -- 'brew' or future reviewer name
  reviewed_at timestamptz,
  checkin_id uuid references checkins(id), -- links response to specific check-in
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- Member Metrics (for progress charts)
create table metrics (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) not null,
  recorded_date date not null,
  weight numeric,
  steps int,
  source text default 'manual' check (source in ('manual', 'healthkit', 'googlefit')),
  created_at timestamptz default now()
);
```

### Row Level Security
- Members can only read/write their own data
- Admin role (Brew) can read/write all data
- Messages: members see sent messages only (not pending drafts)
- AI draft field hidden from member-facing queries

### Key Indexes
- checkins(member_id, submitted_at)
- messages(member_id, sent_at)
- messages(review_status) -- for admin queue
- metrics(member_id, recorded_date)

---

## Tech Stack

| Component | Tool | Notes |
|-----------|------|-------|
| Frontend | Next.js (App Router) | Mobile-responsive web app |
| Auth | Supabase Auth | Email + password, magic link |
| Database | Supabase PostgreSQL | RLS for security |
| Payments | Stripe | Subscriptions, webhooks |
| AI | Claude API | Coaching responses |
| Email | Beehiiv or Resend | Check-in reminders, notifications |
| Hosting | Vercel or Cloudflare Pages | |
| Domain | coach.ketodial.com | Subdomain of existing site |

---

## Build Phases

### Phase 1: Core MVP (Weeks 1-3)
- [ ] Supabase schema + RLS policies
- [ ] Stripe subscription flow (founding tier $49)
- [ ] Onboarding: waiver + intake form
- [ ] Member dashboard with check-in form
- [ ] Coach messaging thread (member view)
- [ ] Admin review queue
- [ ] Claude API integration for draft responses
- [ ] Medical keyword detection + red-flag system
- [ ] Email: check-in reminder (Sunday AM)

### Phase 2: Polish + Launch (Weeks 4-5)
- [ ] Progress chart (weight over time)
- [ ] Streak counter
- [ ] "Coach is expecting your update" nudge
- [ ] Missed check-in follow-up email
- [ ] Member settings (change check-in day, update profile)
- [ ] Cancel/pause subscription flow
- [ ] Landing page on ketodial.com
- [ ] Soft launch to CW email list

### Phase 3: Scale (after 30+ members)
- [ ] Auto-send rules for routine check-ins
- [ ] Confidence scoring on AI drafts
- [ ] Bulk review mode for admin
- [ ] Premium tier: video call scheduling (Calendly embed)
- [ ] Carnivore Weekly branded version
- [ ] Second reviewer onboarding

### Phase 4: Device Sync (after 75+ members)
- [ ] HealthKit integration (requires lightweight iOS app)
- [ ] Google Fit API
- [ ] Auto-populate weekly steps/weight from device
- [ ] Garmin/Fitbit API (open APIs, web-only)

### Phase 5: Community (after 100+ members)
- [ ] Simple discussion forum / feed
- [ ] Member milestones (public opt-in)
- [ ] Success stories
- [ ] Peer accountability pairs (optional)

---

## Design Brief (for Claude Design)

**Product:** KetoDial Coach — weekly accountability coaching web app
**URL:** coach.ketodial.com
**Brand:** Extends KetoDial visual language (Hanken Grotesk, blues/teals, clean/clinical)
**Tone:** Warm but professional. Health coach office, not Silicon Valley app.

**Screens to design:**
1. Landing page (hero + pricing + how it works + FAQ)
2. Onboarding flow (waiver → intake form → welcome)
3. Member dashboard (check-in CTA, coach thread, progress chart, streak)
4. Weekly check-in form
5. Coach thread / messaging view
6. Admin review queue (Brew's daily workflow screen)
7. Admin member detail view (history, metrics, notes)

**Key UX principles:**
- Check-in should feel like texting a coach, not filling out a medical form
- Dashboard should create gentle urgency ("Your coach is waiting")
- Progress chart should show trend, not daily noise
- Mobile-first — most members will use this on their phone
- Admin queue should be optimized for speed (approve in 2 clicks)

**Reference apps:** Noom (onboarding flow), Calibrate (clean medical feel), WhatsApp (messaging UX), Intercom (admin queue)

---

## Open Questions
1. Coach persona: use Sarah/Marcus/Chloe personas, or create a new "Coach" identity?
2. Domain: coach.ketodial.com or app.ketodial.com?
3. Check-in day: member chooses, or everyone on Sunday?
4. Video calls for premium: Calendly, or build simple scheduling?
5. Notification channel: email only, or add SMS later?

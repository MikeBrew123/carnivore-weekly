# KetoDial Coach — Route Structure + Flows

## Routes

### Public (no auth)
```
/                       Landing page (hero, pricing, FAQ)
/login                  Email + password login
/signup?tier=weekly     Stripe checkout redirect
/auth/callback          Supabase auth callback
/api/stripe/webhook     Stripe webhook handler (service role)
```

### Member (auth required, redirect to /login if unauthenticated)
```
/app/onboarding         3-step onboarding (post-payment, pre-dashboard)
/app/dashboard          Home — status card, thread preview, focus, streak
/app/checkin            Weekly/bonus check-in form
/app/thread             Coach Remy messaging thread
/app/progress           Weight chart, streak, stats
/app/settings           Profile, subscription, reminders
```

### Admin (auth + coach_admins role required)
```
/admin                  Review queue (two-panel: queue list + detail)
/admin/member/[id]      Member profile (4 tabs: overview, history, thread, account)
```

### API Routes
```
/api/stripe/checkout    POST — create Stripe checkout session
/api/stripe/webhook     POST — handle subscription events
/api/stripe/portal      POST — create customer portal session
/api/coach/draft        POST — trigger Claude draft generation (service role, async)
/api/cron/reminders     GET  — Vercel cron, sends email reminders
```

---

## Flow 1: Signup → Payment → Onboarding

```
Landing page (/):
  Member clicks "Start weekly coaching" ($49/mo)
    ↓
/signup?tier=weekly:
  1. Create Supabase auth account (email + password)
  2. Check founding cap (SELECT COUNT(*) FROM coach_members WHERE founding_member = true FOR UPDATE)
  3. If cap not reached → create Stripe checkout session
  4. Redirect to Stripe hosted checkout
    ↓
Stripe checkout (external):
  Member enters payment
    ↓
Stripe webhook → /api/stripe/webhook:
  Event: checkout.session.completed
  1. Create coach_members row (status='onboarding', tier='weekly', founding_member=true)
  2. Insert signup bonus credit to coach_credit_ledger (amount=+1, reason='signup_bonus')
  3. Refresh cached bonus_credit_balance
    ↓
Stripe redirects to /app/onboarding:
  Step 1 — Waiver:
    3 checkboxes (health, AI disclosure, response time)
    Records waiver_consented_at, ai_disclosure_consented_at, response_time_consented_at + versions + IP
    ↓
  Step 2 — About You:
    Name, age, sex, height, weight, goal weight, activity, diet type, duration
    Health conditions (checkchip multi-select), medications
    ↓
  Step 3 — Goals:
    Biggest challenge, success vision, referral source
    On submit:
      1. Update coach_members with all intake data
      2. Run risk screening → set risk_level (green/yellow/red)
      3. Set status='active', onboarded_at=now()
      4. Insert Coach Remy welcome message (direction='coach', sent_at=now())
      5. Redirect to /app/dashboard
```

## Flow 2: Weekly Check-In → AI Draft → Review → Delivery

```
Sunday — member opens /app/dashboard:
  Status card shows "Your weekly check-in is ready"
  Member taps "Start check-in" → /app/checkin
    ↓
/app/checkin:
  Section 1 — Numbers: weight, steps, sleep (1-5), energy (1-5), cravings (1-5), adherence (1-10)
  Section 2 — Story: wins, struggles, symptoms/notes
  Member taps "Submit check-in"
    ↓
Server action:
  1. Insert coach_checkins row (checkin_type='weekly', period_start/end for this week)
  2. Insert coach_metrics row (weight, steps from check-in)
  3. Update coach_members.current_weight
  4. Run safety keyword detection on free-text fields
  5. If flagged → create coach_safety_events row
  6. Trigger /api/coach/draft async (does not block member)
  7. Show confirmation: "Got it! Coach Remy will review and respond within 24 hours."
  8. Redirect to /app/dashboard (status card → "Check-in received ✓")
    ↓
/api/coach/draft (async, service role):
  1. Build context: member profile + member_summary + last 8 check-ins + last 4 sent responses + risk level + coach notes
  2. Call Claude API with Coach Remy system prompt + context + this check-in
  3. Claude returns: structured output (JSON) + member-facing message (text)
  4. Insert coach_messages row:
     - direction='coach'
     - ai_draft = Claude's raw text
     - ai_structured_output = Claude's structured JSON
     - content = Claude's raw text (Keren may edit)
     - review_status='pending'
     - red_flag = true if safety keywords detected
     - sent_at = NULL (invisible to member)
     - checkin_id = this check-in
  5. Call Claude to update member_summary with new check-in data
  6. Update coach_members.member_summary
    ↓
Monday morning — Keren opens /admin:
  Queue shows pending responses, red flags first
  Keren selects a member → detail panel loads
  Reads: member context, check-in data, "in their words", AI draft
  Actions:
    "Approve & Send" → sets review_status='approved', reviewed_by, sent_at=now()
    "Edit & Send" → Keren modifies content, sets was_edited=true, then sends
    "Flag for Later" → sets review_status='flagged'
    "Escalate" → inserts crisis template, creates safety event
  Each action → audit log entry
    ↓
Member opens /app/dashboard or /app/thread:
  Status card: "New response from Coach Remy"
  Thread shows the sent message (content field, not ai_draft)
  Email notification: "Coach Remy replied to your check-in"
```

## Flow 3: Mid-Week Notes (no coached response for weekly tier)

```
Member opens /app/thread anytime:
  Types a note in the input → "Add a note for your next response..."
  Taps send
    ↓
Server action:
  1. Insert coach_messages (direction='member', sent_at=now())
  2. Trigger fires → zeros out admin fields, sets sent_at immediately
  3. Run safety keyword detection on content
  4. If flagged → create safety event, mark in admin queue
  5. Note appears in member's thread immediately
    ↓
NO coached response generated for weekly tier.
Notes accumulate and are included in next Sunday's context window.
```

## Flow 4: Bonus Check-In Credit

```
Member opens /app/dashboard:
  Sees "1 bonus check-in available" badge
  Taps "Use bonus check-in"
    ↓
Confirmation dialog:
  "This will use your bonus check-in credit for one extra coached response before Sunday. Continue?"
  Member confirms
    ↓
Server action:
  1. Check bonus_credit_balance > 0
  2. Insert coach_credit_ledger (amount=-1, reason='used')
  3. Refresh cached balance
  4. Redirect to /app/checkin with checkin_type='bonus'
    ↓
Same flow as Flow 2, but:
  - checkin_type='bonus' (no uniqueness constraint)
  - Claude draft generated
  - Keren reviews and sends
  - Member gets a mid-week coached response
```

## Flow 5: Admin Member Profile

```
Keren clicks "Full profile →" from review queue detail panel
  ↓
/admin/member/[id]:
  Tab 1 — Overview:
    Weight chart (full history with goal line)
    Key metrics grid (start/current/change, avg adherence, streak, check-ins)
    Check-in consistency (week badges: done/missed)
    Coach notes (editable, timestamped via coach_member_notes)
  
  Tab 2 — Check-in History:
    All check-ins chronologically
    Each expandable: full data + the sent coach response
    Trend indicators on metrics
  
  Tab 3 — Message Thread:
    Full conversation with AI draft vs sent version visible (audit trail)
    Timestamps + "human-approved ✓" / "auto-sent" / "human-edited" labels
  
  Tab 4 — Account:
    Subscription details (tier, founding, billing dates)
    Intake form responses
    Health conditions + medications
    Coaching mode controls (ai_reviewed / human_only / paused / referred_out)
    Risk level display
    Grant bonus credit button (owner/reviewer)
    Pause/cancel controls (owner only)
```

## Flow 6: Safety Red-Flag Path

```
Member submits check-in or message containing flagged content
  ↓
Keyword detection runs:
  Checks against categories: medication, symptoms, eating_disorder, crisis,
  self_harm, pregnancy, minors, emergency, doctor_override
    ↓
If flagged:
  1. Create coach_safety_events row (category, severity, status='open', detected_by='ai')
  2. Set red_flag=true + red_flag_reason on the message
  3. If crisis/self_harm → severity='critical'
    ↓
AI draft generation:
  System prompt includes safety rules → Claude automatically:
  - Routes medical questions to doctor
  - Inserts crisis hotline (988) for self_harm/crisis
  - Adds "discuss with your doctor" caveats for yellow-zone topics
  - Refuses to advise on medication changes
    ↓
Admin queue:
  Red-flagged items sort to top
  Flag banner shows: "Medical content detected — [reason]. Human review required."
  "Cannot auto-send" enforcement: approve button still works but reviewer sees the flag
  "Escalate" button available → inserts standard escalation template
    ↓
After review:
  Safety event updated: status='reviewed' or 'resolved'
  resolved_by_admin_id + notes recorded
```

## Flow 7: Cancellation / Offboarding

```
Member opens /app/settings:
  Taps "Pause or cancel membership"
    ↓
/api/stripe/portal:
  Creates Stripe customer portal session
  Member handles pause/cancel through Stripe UI
    ↓
Stripe webhook → /api/stripe/webhook:
  Event: customer.subscription.updated (status=cancelled/paused)
  1. Update coach_members: subscription_status, cancel_at_period_end
  2. If cancelled: status='cancelled', set offboarded_at
  3. Audit log entry
    ↓
Member retains read access to thread/history until period_end
After period_end: status='offboarded'
```

## Middleware / Guards

```
/app/*        → require auth + coach_members row exists
/app/onboarding → require auth + coach_members.status = 'onboarding'
/app/dashboard+ → require auth + coach_members.status = 'active'
/admin/*      → require auth + coach_admins row (active=true)
/admin/member/[id] billing tab → require role='owner'
```

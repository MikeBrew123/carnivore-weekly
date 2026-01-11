# CARNIVORE WEEKLY - FULL FEATURE AUDIT
Date: 2026-01-11

## 📊 FEATURE STATUS MATRIX

| Feature | Planned | Built | Working | DB Connected | Notes |
|---------|---------|-------|---------|--------------|-------|
| **CONTENT FEATURES** |
| Video Commentary (Editorial) | ✅ | ✅ | ❌ | N/A | content-of-the-week.json exists but not used by templates |
| Video Sentiment Display | ✅ | ✅ | ⚠️ | ❌ | Template has code, data missing (sentiment not analyzed) |
| Chloe's Weekly Roundup | ✅ | ✅ | ✅ | ❌ | Working, Chloe's voice authentic |
| Top Videos This Week | ✅ | ✅ | ✅ | ❌ | JUST FIXED (commit 802e4e4) |
| Trending Topics Tags | ✅ | ✅ | ⚠️ | ❌ | Showing but generic text |
| **ENGAGEMENT FEATURES** |
| Post Reactions (👍/👎) | ✅ | ✅ | ❓ | ✅ | JS loaded, needs live test |
| Feedback Modal | ✅ | ✅ | ✅ | ✅ | 2 submissions in DB |
| Newsletter Signup | ✅ | ✅ | ❌ | ⚠️ | Alert placeholder, not connected |
| Related Content | ✅ | ✅ | ❓ | ✅ | JS loaded, needs test |
| Topic Polls | ✅ | ✅ | ❓ | ✅ | 1 poll in DB, needs frontend |
| **YOUTUBE/VIDEO FEATURES** |
| YouTube Data Collection | ✅ | ✅ | ✅ | ❌ | Working but NO Supabase caching |
| Video Analysis (Claude) | ✅ | ✅ | ✅ | ❌ | Working, 98.3% token savings |
| Sentiment Analysis | ✅ | ✅ | ❌ | ❌ | Script exists, not running |
| Q&A Generation | ✅ | ✅ | ⚠️ | ❌ | Generates but not displayed well |
| **CALCULATOR FEATURES** |
| Free Tier (Steps 1-2) | ✅ | ✅ | ✅ | ✅ | 7 sessions in DB |
| Paid Tier ($9.99) | ✅ | ✅ | ✅ | ✅ | Payment working |
| Report Generation | ✅ | ✅ | ✅ | ✅ | Claude API integrated |
| Email Delivery | ✅ | ✅ | ❓ | ✅ | Not tested |
| **DATA RESILIENCE** |
| Supabase YouTube Cache | ✅ | ✅ | ❌ | ❌ | Missing SERVICE_ROLE_KEY |
| Supabase Weekly Content | ✅ | ✅ | ⚠️ | ✅ | 2 weeks in DB, not used |
| JSON File Fallback | ✅ | ✅ | ✅ | N/A | Working as primary |
| API Failure Handling | ⚠️ | ⚠️ | ❌ | ❌ | Will overwrite with empty data |

---

## 🔴 CRITICAL ISSUES

### 1. VIDEO COMMENTARY MISSING
**Impact:** User-facing - Videos have no editorial voice
**Status:** Data exists, templates don't use it
**Location:** `data/content-of-the-week.json` has commentary from Sarah/Marcus/Chloe
**Fix Required:** 
- Update `scripts/generate.py` to load content-of-the-week.json
- Pass to template as `featured_videos` 
- Template already has `video-commentary` div structure

### 2. SUPABASE CACHING DISABLED
**Impact:** Site will break if YouTube API fails
**Status:** Tables exist (0 rows), env var missing
**Missing:** `SUPABASE_SERVICE_ROLE_KEY` in .env
**Fix Required:**
- Get key from Supabase dashboard → Settings → API
- Add to .env
- Run `./run_weekly_update.sh` to populate

### 3. NEWSLETTER NOT CONNECTED
**Impact:** User signups show alert, not saved
**Status:** Table exists (1 subscriber), frontend has TODO
**Location:** `public/index.html` line ~460
**Fix Required:**
- Replace alert() with Supabase insert
- Add to newsletter_subscribers table
- Send confirmation email

---

## ⚠️ MAJOR ISSUES

### 4. SENTIMENT ANALYSIS NOT RUNNING
**Impact:** Video cards missing engagement data
**Status:** Script exists (`scripts/add_sentiment.py`), not in automation
**Evidence:** Template checks for `video.comment_sentiment` (always empty)
**Fix Required:**
- Confirm script in `run_weekly_update.sh` (Step 4)
- Verify it's actually running
- Check if output format matches template expectations

### 5. API FAILURE RISK
**Impact:** One YouTube API failure = blank homepage
**Status:** No retry logic, no cache preservation
**Current Behavior:**
- API fails → returns empty []
- Empty data saved to youtube_data.json (OVERWRITES old data)
- Next generation = empty videos
**Fix Required:**
- Don't overwrite JSON on API failure
- Check Supabase cache first
- Show error banner instead of blank sections

---

## 🟡 MINOR ISSUES

### 6. TRENDING TOPICS GENERIC
**Status:** Showing but with placeholder text
**Example:** "What This Data Actually Tells Us:", "Content Opportunities"
**Expected:** Real trending topics from analysis
**Fix:** Check content_analyzer prompt for trending_topics generation

### 7. POST REACTIONS UNTESTED
**Status:** Code exists, DB ready, never tested live
**Risk:** May have CORS issues with Supabase
**Fix:** Test on live blog post, verify insert works

---

## ✅ WORKING FEATURES

### Homepage
- ✅ Chloe's weekly roundup (authentic voice)
- ✅ Top videos display (6 videos from youtube_data.json)
- ✅ Hero section with responsive images
- ✅ Featured blog posts grid
- ✅ Essentials grid (6 cards)
- ✅ Calculator CTA
- ✅ 2026 redesign (header/nav/footer)

### Channels Page
- ✅ Top Videos This Week toggle (JUST FIXED)
- ✅ Featured Creators grid (10 channels)
- ✅ Toggle functionality (JavaScript working)

### Blog Posts
- ✅ Post reactions JS loaded
- ✅ Related content JS loaded
- ✅ Feedback modal JS loaded
- ✅ Mobile nav working

### Calculator
- ✅ Steps 1-2 (free tier)
- ✅ Step 3 payment ($9.99 working)
- ✅ Step 4 health profile
- ✅ Report generation (Claude API)
- ✅ Database persistence

---

## 📋 IMPLEMENTATION PRIORITY

### IMMEDIATE (Today - User Facing)
1. ✅ Fix Top Videos panel (DONE - commit 802e4e4)
2. 🔴 Restore video commentary (content-of-the-week.json → templates)
3. 🔴 Add SUPABASE_SERVICE_ROLE_KEY
4. 🔴 Connect newsletter signup to Supabase

### THIS WEEK (Resilience)
5. 🟡 Fix API failure handling (don't overwrite on error)
6. 🟡 Test Supabase caching after adding key
7. 🟡 Verify sentiment analysis runs
8. 🟡 Test post reactions live

### NEXT WEEK (Polish)
9. Fix trending topics display
10. Test related content functionality
11. Implement topic polls frontend
12. Email delivery testing

---

## 🗄️ SUPABASE STATUS

### Tables Created (Migration 20250101140000)
- ✅ `youtube_videos` - 0 rows (never populated)
- ✅ `weekly_analysis` - 2 rows (not used by site)
- ✅ `blog_posts` - 19 rows
- ✅ `newsletter_subscribers` - 1 row
- ✅ `post_reactions` - 0 rows (untested)
- ✅ `content_feedback` - 2 rows (working)
- ✅ `poll_votes` / `poll_options` / `topic_polls` - 1 poll, 0 votes
- ✅ `calculator_sessions_v2` - 7 sessions
- ✅ `calculator_reports` - 4 reports
- ✅ `writers` - 3 writers (Sarah, Marcus, Chloe)

### Missing Connection
- ❌ youtube_collector.py not writing (missing SERVICE_ROLE_KEY)
- ❌ generate.py not reading from Supabase (falls back to JSON)
- ❌ Newsletter form not inserting

---

## 📊 DATA FLOW CURRENT STATE

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                   CURRENT ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────┘

Weekly Automation (Sundays):
1. youtube_collector.py
   ├─ YouTube API → fetch videos/comments
   ├─ Save: data/youtube_data.json ✅
   └─ Save: Supabase youtube_videos ❌ (missing key)

2. content_analyzer_optimized.py
   ├─ Read: data/youtube_data.json
   ├─ Claude API → analyze with Chloe/Marcus/Sarah voices
   ├─ Save: data/analyzed_content.json ✅
   └─ Contains: weekly_summary, trending_topics, key_insights

3. add_sentiment.py
   ├─ Read: data/youtube_data.json
   ├─ Claude API → sentiment analysis
   ├─ Save: adds comment_sentiment to analyzed_content.json
   └─ Status: ❓ Not running or output format wrong?

4. answer_questions.py
   ├─ Claude API → generate Q&A
   ├─ Save: adds qa_section to analyzed_content.json
   └─ Status: ✅ Working but not displayed well

5. generate.py
   ├─ Read: data/analyzed_content.json ✅
   ├─ Read: data/youtube_data.json ✅ (fallback)
   ├─ SKIP: content-of-the-week.json ❌ (NOT USED!)
   ├─ Render: templates/*.html
   └─ Output: public/*.html

User Engagement (Real-time):
- Newsletter signup → alert() ❌ (should → Supabase)
- Post reactions → Supabase ❓ (untested)
- Feedback modal → Supabase ✅ (2 submissions)
- Related content → Supabase ❓ (untested)
\`\`\`

---

## 🎯 SUCCESS CRITERIA

### Must Fix (Blocking)
- [ ] Video commentary restored (editorial voice visible)
- [ ] Supabase caching enabled (resilience)
- [ ] Newsletter connected (user signups saved)

### Should Fix (Important)
- [ ] Sentiment analysis verified
- [ ] Post reactions tested
- [ ] API failure doesn't break site

### Nice to Have
- [ ] Trending topics show real data
- [ ] Related content tested
- [ ] Topic polls frontend

---

**Report Generated:** 2026-01-11
**Last Audit:** Never (this is first comprehensive audit)
**Next Review:** After fixing critical issues

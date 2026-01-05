# 2026 Demo - Production Deployment Guide

**Status:** 🟢 READY FOR PRODUCTION
**Date:** January 2, 2026
**Approved by:** Casey (UX), Jordan (Metrics), Alex (Technical), Leo (Database)

---

## What's Going Live

### Core Files
- `/public/index-2026.html` - Premium editorial homepage redesign
- `/public/style-2026.css` - Complete redesigned styling

### Key Features
✅ **Header:** Restored original brown (#1a120b) with new 70/30 layout
✅ **Lazy Loading:** 7 images with `loading="lazy"` for performance
✅ **Mobile UX:** Sticky bottom CTA, FAB feedback button, no horizontal scroll
✅ **Conversion:** Analytics tracking for calculator clicks + feedback submissions
✅ **Accessibility:** WCAG AA compliant, touch targets ≥44px

---

## Production Deployment Steps

### Step 1: Deploy Frontend (Primary)
```bash
# Option A: Copy files to production
cp /Users/mbrew/Developer/carnivore-weekly/public/index-2026.html /path/to/production/public/
cp /Users/mbrew/Developer/carnivore-weekly/public/style-2026.css /path/to/production/public/

# Option B: If using Git for production
git push origin main
# Then deploy new commit to production server
```

### Step 2: Deploy Analytics (Secondary - Can Wait)
**Note:** Analytics is optional for initial launch. Frontend works with silent failure if endpoint down.

```bash
# Deploy Edge Function (requires supabase login)
supabase login
supabase functions deploy analytics --project-ref kwtdpvnjewtahuxjyltn --no-verify-jwt

# Verify endpoint
curl -X POST https://kwtdpvnjewtahuxjyltn.functions.supabase.co/analytics \
  -H "Content-Type: application/json" \
  -d '{"event_type":"test","source":"test"}'
# Should return: {"success":true,"type":"event"}
```

---

## Post-Deployment Verification

### 1. Visual Verification
- [ ] Open https://carnivoreweekly.com/index-2026.html
- [ ] Verify header displays with original brown color
- [ ] Check 70/30 layout (70% main content, 30% sidebar)
- [ ] Scroll and verify sticky CTA appears
- [ ] On mobile (375px), verify FAB button visible
- [ ] Test insight cards stack vertically (no horizontal scroll)

### 2. Functional Testing
- [ ] Click Calculator CTA → Should navigate to /calculator.html
- [ ] Click Feedback FAB → Should open Google Forms
- [ ] Scroll past hero section → Sticky CTA should appear
- [ ] Images load correctly (especially videos + products)

### 3. Performance Verification
```bash
# Run Lighthouse audit on production
lighthouse https://carnivoreweekly.com/index-2026.html --output=json

# Check Core Web Vitals targets:
# - LCP: ≤2500ms
# - CLS: <0.1
# - Performance score: ≥90
```

### 4. Analytics Verification (If Deployed)
```bash
# Check Supabase dashboard
# SQL Editor > Select all from analytics_events limit 5
# Should see events from production traffic
```

---

## Rollback Plan

If critical issues occur:

```bash
# Option 1: Revert to previous version
git revert HEAD

# Option 2: Replace with backup
cp /path/to/backup/index.html /path/to/production/public/index.html
cp /path/to/backup/style.css /path/to/production/public/style.css

# Option 3: Disable analytics tracking (if causing issues)
# The frontend gracefully handles analytics endpoint failures
# No action needed - just wait for Edge Function to stabilize
```

---

## Rollback Triggers (Week 1 Monitoring)

Monitor these metrics and rollback if:

| Metric | Threshold | Action |
|--------|-----------|--------|
| **LCP** | > 3000ms for 2+ days | Rollback (remove lazy loading) |
| **Mobile Bounce Rate** | +10% increase | Rollback (remove sticky CTA) |
| **Calculator CTR** | < 10% on mobile | Rollback (revert to sidebar-only) |
| **Error Rate** | > 1% | Investigate, may not require rollback |

---

## Monitoring (First Week)

### Daily Checks
- [ ] Page loads without errors
- [ ] Analytics events appearing (if Edge Function deployed)
- [ ] No JavaScript console errors
- [ ] Mobile responsiveness intact

### Weekly Rollback Check (Jordan)
```sql
-- Run these in Supabase SQL Editor
-- Check mobile calculator CTR
SELECT DATE(created_at) as date,
  ROUND(
    (COUNT(*) FILTER (WHERE event_type = 'calculator_click' AND source = 'sticky_cta')::DECIMAL /
     NULLIF(COUNT(*) FILTER (WHERE device_type = 'mobile'), 0) * 100), 2
  ) as mobile_calculator_ctr
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Check performance metrics
SELECT DATE(created_at) as date,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lcp_ms) as p75_lcp
FROM performance_metrics
WHERE page_url = '/index-2026.html'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Git Commits Deployed

```
2952167 - feat: Analytics infrastructure deployment for 2026 demo
61558e3 - Production refinements for 2026 demo based on team feedback
2551c04 - fix: logo z-index - position behind header text
882c60c - feat: hybrid header design - restore original banner + new layout
02ddf41 - fix: correct CSS path in 2026 demo
4ed39a6 - feat: 2026 Premium Editorial Design Demo
```

---

## Post-Deployment Tasks

### Immediate (Day 1)
- [ ] Monitor for errors
- [ ] Verify all features working
- [ ] Check analytics data (if deployed)

### Week 1
- [ ] Monitor Core Web Vitals
- [ ] Check mobile bounce rate
- [ ] Review calculator CTR
- [ ] Run Lighthouse weekly

### Week 4 (Final Review)
- [ ] Make go/no-go decision
- [ ] If successful: promote to main homepage
- [ ] If issues: rollback to previous version

---

## Success Criteria

**GO (Safe to keep live):**
- ✅ No critical errors
- ✅ LCP ≤ 2500ms (mobile)
- ✅ Mobile bounce rate stable or +5% max
- ✅ Calculator CTR ≥ 10% on mobile
- ✅ User feedback positive

**NO-GO (Rollback):**
- ❌ LCP > 3000ms consistently
- ❌ Mobile bounce rate +10% or more
- ❌ Calculator CTR < 10% for 3+ days
- ❌ Critical functionality broken

---

## Support Contacts

**Deployment Issues:**
- Alex (Technical Architecture): @alex
- Leo (Database/Analytics): @leo

**Performance Questions:**
- Jordan (Data Analyst): @jordan

**User Experience Feedback:**
- Casey (Community Insider): @casey

---

## Deployment Checklist

```
PRE-DEPLOYMENT
[ ] Code reviewed and tested
[ ] All features verified working
[ ] Performance baseline established
[ ] Rollback plan confirmed
[ ] Team notified of deployment

DEPLOYMENT
[ ] Frontend files deployed to production
[ ] Homepage updated to point to /public/index-2026.html
[ ] Edge Function deployed (optional - can deploy later)
[ ] CDN cache cleared (if applicable)

POST-DEPLOYMENT
[ ] Visual verification complete
[ ] Performance audit run
[ ] Analytics tracking verified (if deployed)
[ ] Monitoring configured
[ ] Team notified of successful deployment
```

---

**Status:** ✅ APPROVED FOR PRODUCTION
**Go-Live Date:** January 2, 2026
**Approved By:** Mike Brew (CEO)

---

🚀 **Ready to transform Carnivore Weekly into a premium editorial experience!**

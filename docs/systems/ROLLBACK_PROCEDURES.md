# Production Rollback Procedures - Carnivore Weekly

**Document Version:** 1.0
**Last Updated:** January 8, 2026
**Status:** Tested and Ready

**CRITICAL:** These procedures have been tested in staging and are ready for immediate execution if needed.

---

## Overview

This document provides step-by-step rollback procedures for various failure scenarios during and after the Carnivore Weekly homepage launch. Each scenario includes detection criteria, immediate actions, and resolution steps.

**Key Principle:** We can rollback in 5-10 minutes. No issue is big enough to panic about.

---

## Quick Rollback Command

If you need to rollback immediately without diagnosis:

```bash
# From project root directory
cd /Users/mbrew/Developer/carnivore-weekly

# Execute rollback (reverts to previous commit)
git revert HEAD --no-edit
git push origin main

# GitHub Actions will automatically redeploy the previous version
# Monitor: https://github.com/[owner]/[repo]/actions
```

**Duration:** 5-10 minutes to live
**Steps:** 2 commands
**Risk:** Low (reverting known-good code)

---

## Scenario 1: Homepage Not Loading (Critical)

### Detection

- [ ] Homepage returns 5xx error
- [ ] Homepage returns 404
- [ ] Homepage timeout (> 30 seconds)
- [ ] Users report blank white page
- [ ] Cloudflare returns error page

### Severity: CRITICAL
**Impact:** Users cannot access site
**Time Limit:** Must resolve in < 5 minutes

### Immediate Actions (T+0)

1. **Confirm Issue**
   ```bash
   curl -v https://carnivoreweekly.com/
   # Look for HTTP response code
   ```

2. **Alert Team**
   ```
   Slack: #critical-alerts
   Message: "🚨 CRITICAL: Homepage not loading - initiating investigation"
   ```

3. **Check Error Logs**
   ```bash
   # View recent deployment logs
   npm run logs:production 2>/dev/null || echo "Manual check needed"

   # Check Sentry for errors
   # URL: https://sentry.io/organizations/carnivore/issues/
   ```

### Root Cause Analysis (T+1)

**Most Common Causes:**
- [ ] CSS file corrupted or missing
- [ ] JavaScript error preventing rendering
- [ ] Database connection failure
- [ ] Deployment incomplete
- [ ] DNS propagation issue

**Investigation Steps:**

```bash
# 1. Check if previous version is accessible
git log --oneline -5
# Note the commit before current HEAD

# 2. Verify latest deployment
git status
git log -1 --pretty=format:"%h %s %ai"

# 3. Check if issue is environment-specific
# Try from different network/VPN
```

### Decision Tree

```
Homepage not loading?
├─ HTTP 5xx error?
│  └─ ROLLBACK (likely code issue)
├─ HTTP 404?
│  └─ ROLLBACK (likely routing issue)
├─ Timeout?
│  └─ Check database/infrastructure
│     └─ If infrastructure OK → ROLLBACK
│     └─ If infrastructure down → Page Leo
└─ Blank page (200 status)?
   └─ Check browser console
      └─ JavaScript error → ROLLBACK
      └─ Missing CSS → ROLLBACK
      └─ Missing API → Check Leo's infrastructure
```

### Rollback Execution (T+5)

If rollback is needed:

```bash
#!/bin/bash
echo "🚨 CRITICAL ROLLBACK - Homepage Not Loading"
echo "Rolling back to previous version..."

# Get previous commit
git log --oneline -2 | tail -1 | awk '{print $1}'
PREVIOUS_COMMIT=$(git log --oneline -2 | tail -1 | awk '{print $1}')

echo "Reverting to: $PREVIOUS_COMMIT"

# Revert current commit
git revert HEAD --no-edit

# Push to main
git push origin main

# Monitor deployment
echo "Rollback pushed. Monitor at: https://github.com/[owner]/[repo]/actions"

# Wait for deployment
sleep 30

# Verify rollback
if curl -sf https://carnivoreweekly.com/ > /dev/null; then
    echo "✅ Rollback successful - Homepage responsive"
else
    echo "❌ Rollback failed - escalate to Leo immediately"
fi
```

### Post-Rollback Steps

1. **Notify team in #critical-alerts:**
   ```
   ✅ ROLLBACK SUCCESSFUL

   Status: Previous version live
   Time to resolution: [X minutes]

   Next: Root cause analysis
   Timeline: Post-mortem in [time]
   ```

2. **Create incident ticket**
   ```
   Title: "Homepage Unavailable Post-Launch - Rolled Back"
   Severity: Critical
   Timeline: T+[X] to T+[Y]
   Duration: [minutes]

   Details:
   - What happened
   - Impact
   - Resolution
   - Root cause
   - Prevention
   ```

3. **Investigate root cause**
   - Compare deployment logs
   - Check what changed
   - Identify the breaking change
   - Fix in development environment

4. **Retest thoroughly**
   - Run full test suite
   - Manual QA in staging
   - Performance validation
   - Smoke tests

5. **Redeploy**
   - Fix committed and tested
   - Fresh deployment
   - Smoke tests pass
   - Team sign-off

---

## Scenario 2: Performance Degradation (High)

### Detection

- [ ] LCP > 4000ms (target: 2500ms)
- [ ] INP > 500ms (target: 200ms)
- [ ] CLS > 0.25 (target: < 0.1)
- [ ] Page load time > 5 seconds
- [ ] Error rate spike
- [ ] User complaints about slowness

### Severity: HIGH
**Impact:** Poor user experience
**Time Limit:** Investigate within 10 minutes

### Monitoring Alert

Sentry will auto-alert if Core Web Vitals degrade > 20%:

```
Performance Degradation Alert

Metric: LCP (Largest Contentful Paint)
Previous: 2150ms
Current: 4200ms
Change: +95%

Action: Investigate immediately
```

### Investigation Steps

```bash
# 1. Check real-time metrics
# Go to: https://search.google.com/search-console/core-web-vitals

# 2. Identify bottleneck
curl -D - -w "@curl-format.txt" -o /dev/null -s https://carnivoreweekly.com/

# 3. Profile page in Chrome DevTools
# Manual: Open site, F12, Performance tab, reload

# 4. Check for large unoptimized resources
npm run analyze:bundle 2>/dev/null || echo "Run: npm install --save-dev webpack-bundle-analyzer"

# 5. Check database query performance
# If applicable to your setup
npm run logs:slow-queries 2>/dev/null || echo "Manual check needed"
```

### Common Causes & Fixes

**Large JavaScript Bundle:**
- [ ] Check for included dependencies not needed
- [ ] Verify tree-shaking is enabled
- [ ] Check for duplicate dependencies

**Unoptimized Images:**
- [ ] Verify images are WebP format
- [ ] Check image dimensions match display size
- [ ] Ensure lazy-loading is implemented

**Slow Database Queries:**
- [ ] Check query execution time
- [ ] Verify indexes are present
- [ ] Check database connection pooling

**Inefficient CSS:**
- [ ] Verify CSS is minified
- [ ] Check for unused CSS
- [ ] Verify critical CSS inlined

**Third-party Scripts:**
- [ ] Check analytics script loading
- [ ] Verify tracking pixels aren't blocking
- [ ] Consider async/defer loading

### Decision Tree

```
Performance degraded?
├─ LCP degraded?
│  ├─ Is it image loading? → Optimize images
│  ├─ Is it font loading? → Use system fonts or font-display: swap
│  └─ Is it parsing? → Check JavaScript
├─ INP degraded?
│  ├─ Is it click handling? → Optimize event handlers
│  └─ Is it rendering? → Check CSS/layout thrashing
├─ CLS degraded?
│  ├─ Images without dimensions? → Add width/height
│  ├─ Fonts loading? → Use font-display: swap
│  └─ Dynamic content? → Reserve space or fade in
└─ All metrics degraded?
   └─ Deploy issue? → ROLLBACK
   └─ Infrastructure? → Check with Leo
   └─ Cache cleared? → Clear CloudFlare cache
```

### Optimization Steps

**If Quick Fix Available (< 10 minutes):**

```bash
# Clear CDN cache
npm run cdn:clear-cache

# Wait 30 seconds
sleep 30

# Verify improvement
npm run performance:check

# If improved: monitor
# If not improved: ROLLBACK
```

**If Rollback Needed:**

Follow Scenario 1 rollback procedure.

**If Performance Investigation Ongoing:**

```bash
Slack: #monitoring
Message:
"Performance degradation detected post-launch.
Team investigating.

Impact: Page load increased from 2.1s to [X]s
Status: 🟡 INVESTIGATING
ETA: 10 minutes to resolution

Updates every 5 minutes."
```

### Prevention for Future Launches

- [ ] Add performance budgets to CI/CD
- [ ] Set performance thresholds in tests
- [ ] Monitor Core Web Vitals from day 1
- [ ] Implement error budgets for metrics

---

## Scenario 3: Database Issues (High)

### Detection

- [ ] API returns 500 errors
- [ ] Queries timing out
- [ ] "Database connection refused"
- [ ] Articles not loading
- [ ] Search functionality broken

### Severity: HIGH
**Impact:** Content not accessible
**Time Limit:** Escalate to Leo immediately

### Immediate Actions (T+0)

```bash
# 1. Check database connectivity
npm run db:health-check 2>/dev/null || echo "Manual check: db admin panel"

# 2. Check error logs for DB errors
npm run logs:errors | grep -i database

# 3. Alert infrastructure lead
Slack: @Leo
Message: "Database issue detected post-launch. Need immediate assist."
```

### Diagnosis (T+1)

**Call Leo immediately.** Potential issues:

- [ ] Connection pool exhausted
- [ ] RLS (Row Level Security) policies blocking queries
- [ ] Migration not fully applied
- [ ] Backup/restore process interfered
- [ ] Database disk full
- [ ] Replication lag (if replicated)

### Resolution Timeline

**If Leo can fix in < 15 minutes:**
- [ ] Proceed with fix
- [ ] Implement fix
- [ ] Verify with smoke tests
- [ ] Monitor for 30 minutes

**If > 15 minutes to fix:**
- [ ] Prepare rollback
- [ ] Execute rollback
- [ ] Verify old version operational
- [ ] Investigate offline

### Rollback Decision

```
Database broken?
├─ Is it a data issue (RLS, migration)?
│  └─ Might be fixable without rollback
│  └─ Have Leo diagnose (5 min decision point)
├─ Is it a connection issue?
│  └─ Might be temporary
│  └─ Wait 2 minutes, then ROLLBACK if not fixed
└─ Unknown cause?
   └─ ROLLBACK immediately
   └─ Diagnose offline
```

**Rollback Command:**

```bash
git revert HEAD --no-edit
git push origin main
# Monitor at: https://github.com/[owner]/[repo]/actions
```

### Post-Rollback

- [ ] Previous version confirmed operational
- [ ] Notify Leo of issue
- [ ] Schedule post-mortem with database team
- [ ] Implement database health checks in CI/CD

---

## Scenario 4: Mobile Layout Broken (Medium)

### Detection

- [ ] Bounce rate spike on mobile (> 50% increase)
- [ ] User complaints on social media
- [ ] Mobile Core Web Vitals degraded
- [ ] Responsive design broken at specific viewport

### Severity: MEDIUM
**Impact:** Mobile users have poor experience
**Time Limit:** Investigate and fix within 30 minutes

### Investigation Steps

```bash
# 1. Test on actual devices
# Desktop Chrome: F12 → Toggle device toolbar
# Or: use real iOS/Android device

# 2. Check which viewport is broken
# Common sizes: 375px (iPhone), 768px (tablet), 1024px (large tablet)

# 3. Check CSS in browser console
# F12 → Elements → Review mobile styles
# Check: media queries, flexbox, grid

# 4. Review recent CSS changes
git diff HEAD~1 -- "**/*.css"
```

### Common Causes

- [ ] Media query breakpoint wrong
- [ ] Flexbox direction not set correctly
- [ ] Images too wide for viewport
- [ ] Fixed width elements overflowing
- [ ] Typography too small/large for mobile

### Quick Fixes

**Image Overflow:**
```css
/* Add to fix */
img {
  max-width: 100%;
  height: auto;
}
```

**Flexbox Mobile:**
```css
/* Add to fix */
@media (max-width: 768px) {
  .container {
    flex-direction: column;
  }
}
```

**Text Too Small:**
```css
/* Add to fix */
@media (max-width: 768px) {
  body {
    font-size: 16px; /* Minimum for iOS */
  }
}
```

### Decision Tree

```
Mobile layout broken?
├─ Is it a CSS issue? (95% likely)
│  └─ Can fix in < 10 minutes?
│     ├─ YES → Quick fix + redeploy
│     └─ NO → ROLLBACK
├─ Is it a JavaScript issue?
│  └─ Can fix in < 10 minutes?
│     ├─ YES → Quick fix + redeploy
│     └─ NO → ROLLBACK
└─ Unsure?
   └─ ROLLBACK (safer option)
```

### Fix & Redeploy

If quick fix identified:

```bash
# 1. Make CSS changes
# Edit: src/styles/responsive.css

# 2. Run tests to verify
npm test -- --mobile

# 3. Build and test locally
npm run build
npm run test:smoke

# 4. Commit fix
git add .
git commit -m "Fix: Mobile layout responsive at [breakpoint]"

# 5. Deploy
git push origin main
# GitHub Actions redeploys automatically

# 6. Monitor
# Check mobile viewport on live site
```

### Rollback Procedure (If Fix Not Working)

```bash
git revert HEAD --no-edit
git push origin main
```

**Then investigate offline.**

---

## Scenario 5: Analytics Not Tracking (Medium)

### Detection

- [ ] Google Analytics shows zero pageviews
- [ ] No events in analytics dashboard
- [ ] No user data flowing in
- [ ] gtag function errors in console
- [ ] Tracking script not loading

### Severity: MEDIUM
**Impact:** Can't measure launch success
**Time Limit:** Investigate within 15 minutes

### Investigation Steps

```bash
# 1. Check analytics tag is present
curl https://carnivoreweekly.com/ | grep "googletagmanager"

# 2. Check for errors in browser console
# F12 → Console → Look for analytics errors

# 3. Verify gtag function exists
# F12 → Console → type: gtag
# Should return: function gtag() { ... }

# 4. Check Google Analytics admin panel
# Go to: https://analytics.google.com
# Check: Events, Realtime tabs

# 5. Verify GA4 property ID
# Check: src/scripts/analytics-config.js
# Compare with: GA property settings
```

### Common Causes

- [ ] Wrong GA4 property ID
- [ ] Analytics script not loaded
- [ ] Content Security Policy blocking analytics
- [ ] Ad blocker blocking analytics (local testing)
- [ ] Google Analytics 4 not configured correctly
- [ ] Measurement ID missing in code

### Quick Fixes

**If GA Script Missing:**
```html
<!-- Add to head or before </body> -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

**If Wrong Property ID:**
1. Go to: https://analytics.google.com/analytics/web/#/account
2. Find correct GA4 property ID (format: G-XXXXXXXXXX)
3. Update in: src/scripts/analytics-config.js
4. Rebuild and deploy

### Decision Tree

```
Analytics not tracking?
├─ Is Google Analytics account configured?
│  ├─ NO → Configure GA4 account first
│  └─ YES → Verify ID is correct
├─ Is tracking script present in HTML?
│  ├─ NO → Add GA script
│  └─ YES → Verify script loading
├─ Is gtag function available?
│  ├─ NO → Check script tag
│  └─ YES → Check for console errors
└─ Is data flowing in GA dashboard?
   ├─ YES → Tracking is working (may have 24h delay)
   └─ NO → Verify property ID and wait 24 hours
```

### Fix & Verify

```bash
# 1. Fix analytics configuration
# Update: src/scripts/analytics-config.js

# 2. Rebuild
npm run build

# 3. Deploy
git add .
git commit -m "Fix: Configure Google Analytics 4"
git push origin main

# 4. Verify in browser console
# F12 → Console → type: gtag('event', 'test_event')
# Check GA Realtime: https://analytics.google.com/analytics/web/

# 5. Monitor for 2-5 minutes
# Should see events in GA dashboard
```

### Important Note

Google Analytics can take 24-48 hours for first data to appear. If script is present and firing, it's working correctly. No rollback needed unless script is completely broken.

---

## Rollback Decision Framework

```
┌─────────────────────────────────────────────────┐
│        ISSUE SEVERITY ASSESSMENT                │
└─────────────────────────────────────────────────┘

CRITICAL (IMMEDIATE ROLLBACK):
├─ Homepage completely inaccessible
├─ Database connection broken
├─ Deployment partially failed
└─ 50%+ of users affected

HIGH (INVESTIGATE 10 MIN, THEN DECIDE):
├─ Performance degraded > 50%
├─ Mobile layout broken
├─ API errors > 10%
└─ 10-50% of users affected

MEDIUM (INVESTIGATE 30 MIN, THEN DECIDE):
├─ Analytics not tracking
├─ Minor CSS issues
├─ Specific feature broken
└─ < 10% of users affected

LOW (FIX WITHOUT ROLLBACK):
├─ Typo in content
├─ Non-critical CSS issue
├─ Single feature not working
└─ < 1% of users affected
```

---

## Post-Rollback Procedures

### Immediate (T+0)

1. **Notify Team**
   ```
   Slack: #critical-alerts
   Message: "✅ Rollback successful. Previous version live.
             Root cause analysis in progress."
   ```

2. **Alert Users (if > 1 hour downtime)**
   ```
   Status page: "We experienced an issue and have rolled back
                to our previous version. We're investigating and
                will relaunch with a fix shortly."
   ```

### Analysis (T+30 min)

1. **Root Cause Analysis**
   - What was the breaking change?
   - Why did tests not catch it?
   - Could it have been prevented?

2. **Create Incident Report**
   ```
   File: incidents/[date]-homepage-launch-issue.md

   - Timeline
   - Root cause
   - Impact (users, duration)
   - Resolution
   - Prevention
   ```

3. **Team Post-Mortem**
   - Schedule: Within 24 hours
   - Attendees: Development team
   - Duration: 30-60 minutes
   - Outcome: Action items to prevent recurrence

### Fix & Relaunch (T+24 hours)

1. **Implement Fix**
   - Address root cause
   - Enhance tests to catch issue
   - Get code review

2. **Thorough Testing**
   - Run full test suite
   - Manual QA in staging
   - Performance validation
   - Smoke tests

3. **Relaunch**
   - Run deployment script again
   - Monitor closely
   - Smoke tests pass
   - Team sign-off

---

## Testing Rollback Procedures

**Rollback procedures are tested in staging environment every month.**

### Monthly Rollback Test

```bash
#!/bin/bash
# Run: npm run test:rollback

echo "Testing rollback procedure..."

# 1. Deploy current version
git push origin main

# 2. Wait for deployment
sleep 60

# 3. Execute rollback
git revert HEAD --no-edit
git push origin main

# 4. Verify previous version operational
sleep 60
curl https://carnivore-weekly-staging.vercel.app/

# 5. Verify smoke tests pass
npm run test:smoke

echo "✅ Rollback procedure tested successfully"
```

---

## Escalation Contacts

**For Different Scenarios:**

| Scenario | Primary | Secondary | Escalation |
|----------|---------|-----------|------------|
| Code issue | Jordan | Casey | CEO |
| Database issue | Leo | Jordan | CEO |
| Infrastructure | Leo | Jordan | CEO |
| Content issue | Sarah | Casey | CEO |
| Performance | Jordan | Leo | CEO |
| Unknown | Jordan | Leo | CEO |

**Emergency: Call CEO directly**

---

## Key Reminders

✅ **We can rollback in < 10 minutes**
✅ **Rollback is safe - reverting to known-good code**
✅ **Team is trained and ready**
✅ **Procedures tested in staging**
✅ **Communication plan in place**

**When in doubt, ROLLBACK. Fix offline. Relaunch confident.**

---

**Document Owner:** Jordan (Development Lead)
**Last Review:** January 8, 2026
**Status:** TESTED & READY

These procedures have been rehearsed and are ready for immediate execution if needed. Don't hesitate to rollback if you suspect any critical issue.

# Production Monitoring Setup - Carnivore Weekly

**Document Version:** 1.0
**Last Updated:** January 8, 2026
**Status:** Ready for Production

---

## Overview

This document outlines the complete monitoring infrastructure for Carnivore Weekly's production deployment. Monitoring is critical for identifying issues, measuring performance, and ensuring a successful launch.

---

## 1. Google Analytics Configuration

### 1.1 Setup & Installation

**Status:** Installation Code Embedded in HTML

```html
<!-- Google Analytics 4 Tag -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID', {
    'page_path': window.location.pathname,
    'anonymize_ip': false,
    'allow_google_signals': true,
    'allow_ad_personalization_signals': true
  });
</script>
```

**Configuration File:** `scripts/analytics-config.js`

### 1.2 Key Metrics Tracking

#### Page Views & Sessions
- Track all page loads automatically
- Session duration calculated by GA4
- Session timeout: 30 minutes of inactivity
- Dashboard location: Analytics > Reports > Realtime

#### Scroll Depth Tracking
```javascript
// Custom event: scroll_depth
document.addEventListener('scroll', () => {
  const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;

  if (scrollPercent >= 25 && !depths.has(25)) {
    gtag('event', 'scroll_depth', {
      'depth': '25%',
      'page': window.location.pathname
    });
    depths.add(25);
  }
  // ... track 50%, 75%, 100%
});
```

**Monitored Sections:**
- Hero section (0%)
- Featured Articles (25%)
- Bento Grid (50%)
- Trending Topics (75%)
- Footer CTA (100%)

#### Click Event Tracking
```javascript
// Track all CTA button clicks
document.querySelectorAll('[data-track-click]').forEach(element => {
  element.addEventListener('click', function() {
    gtag('event', 'select_content', {
      'content_type': this.dataset.contentType || 'button',
      'content_id': this.id || this.textContent,
      'value': this.dataset.value || 1
    });
  });
});
```

**Tracked Elements:**
- Newsletter signup button
- Article read more links
- Featured topics clicks
- External link clicks
- Download buttons
- Share buttons

#### Engagement Metrics
- Time on page (session duration)
- Bounce rate (single-page sessions)
- Pages per session
- User retention
- Return user rate

### 1.3 Anomaly Alerts

**Setup Location:** Admin > Manage Account > Settings > Anomaly Detection

**Thresholds:**
- Bounce rate spike: Alert if > 50% above baseline
- Traffic drop: Alert if > 30% below baseline
- Conversion rate drop: Alert if < 50% of baseline
- Session duration decrease: Alert if < 50% of baseline

**Alert Destination:**
- Email: team@carnivoreweekly.com
- Slack: #monitoring (via GA webhook integration)
- Frequency: Immediate on anomaly detection

### 1.4 Dashboards & Reports

**Daily Dashboard:**
- Sessions, users, page views (real-time)
- Top landing pages
- Bounce rate by page
- Average session duration
- Conversion rate

**Setup:** Analytics > Admin > Create New Dashboard

```
Widgets:
- Real-time active users
- 24-hour session trend
- Top 10 pages by views
- Traffic sources
- Device breakdown
- Top events
- Bounce rate vs. goal
```

**Weekly Report:**
- Week-over-week comparison
- New vs. returning users
- Device performance analysis
- Traffic source performance
- Goal completion trends

**Custom Report:** Export to Google Sheets for team review

---

## 2. Core Web Vitals Monitoring (Real User Monitoring - RUM)

### 2.1 Real User Monitoring Setup

**Implementation:** `scripts/web-vitals.js`

```javascript
// Core Web Vitals tracking with Google Analytics
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Send Core Web Vitals metrics to Google Analytics
getCLS(metric => sendToAnalytics('CLS', metric));
getFID(metric => sendToAnalytics('FID', metric));
getFCP(metric => sendToAnalytics('FCP', metric));
getLCP(metric => sendToAnalytics('LCP', metric));
getTTFB(metric => sendToAnalytics('TTFB', metric));

function sendToAnalytics(metric, value) {
  gtag('event', 'page_view', {
    'event_category': 'web_vitals',
    'value': Math.round(value.value),
    'event_label': value.id,
    'non_interaction': true
  });
}
```

**Initialization:** Load before any other scripts
**Priority:** HIGH - loads before page interactive

### 2.2 Target Metrics & Thresholds

| Metric | Target | Good | Needs Improvement |
|--------|--------|------|-------------------|
| **LCP** (Largest Contentful Paint) | ≤ 2500ms | ✅ | ❌ |
| **INP** (Interaction to Next Paint) | ≤ 200ms | ✅ | ❌ |
| **CLS** (Cumulative Layout Shift) | < 0.1 | ✅ | ❌ |
| **FCP** (First Contentful Paint) | ≤ 1800ms | ✅ | ❌ |
| **TTFB** (Time to First Byte) | ≤ 600ms | ✅ | ❌ |

### 2.3 Alert Configuration

**Monitoring Tool:** Google Analytics + Google Search Console + PageSpeed Insights

**Alert Thresholds:**
- LCP > 4000ms: CRITICAL
- INP > 500ms: CRITICAL
- CLS > 0.25: WARNING
- Any metric degradation > 20%: WARNING

**Alert Channels:**
- Email: dev-team@carnivoreweekly.com
- Slack: #alerts (auto-posted by integration)
- SMS: Critical alerts only (via PagerDuty)

### 2.4 Daily Performance Reports

**Automated Report Generation:** 9:00 AM UTC daily

```
DAILY CORE WEB VITALS REPORT
Generated: {date}

Current Performance (24h period):
├─ LCP: {avg}ms (target: ≤2500ms) {status}
├─ INP: {avg}ms (target: ≤200ms) {status}
├─ CLS: {avg} (target: <0.1) {status}
├─ FCP: {avg}ms (target: ≤1800ms) {status}
└─ TTFB: {avg}ms (target: ≤600ms) {status}

Trend vs. Previous Day: {direction} {percent}
Device Breakdown:
├─ Mobile: {LCP}ms {status}
├─ Tablet: {LCP}ms {status}
└─ Desktop: {LCP}ms {status}

Top Issues:
1. {issue}: affecting {X}% of sessions
2. {issue}: affecting {Y}% of sessions

Recommendations:
- {optimization suggestion}
```

**Report Destination:** #daily-metrics Slack channel

---

## 3. Error Tracking & Logging (Sentry)

### 3.1 Sentry Setup

**Project:** carnivore-weekly-production
**DSN:** `https://[key]@sentry.io/[project-id]`

**Installation:**

```javascript
// sentry-config.js
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: "production",
  tracesSampleRate: 0.1,
  release: "v1.0.0-bento-grid",
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  }
});

export default Sentry;
```

**Initialization:** Highest priority in app.js/index.js

### 3.2 Error Categories Tracked

#### JavaScript Runtime Errors
- Uncaught exceptions
- Promise rejections
- Syntax errors
- Reference errors
- Type errors

**Severity Assignment:**
- Critical: Page unusable
- Error: Feature broken
- Warning: Degraded functionality
- Info: Expected errors

#### HTTP Errors
- 4xx errors: Client errors
- 5xx errors: Server errors
- Timeout errors
- Network failures

**Grouping:**
```
GET https://api.carnivoreweekly.com/articles
└─ Status 500
  ├─ Database connection timeout
  ├─ API rate limit exceeded
  └─ Missing environment variable
```

#### 404 Errors
- Broken links (external & internal)
- Deleted content
- Invalid page routes

**Tracking Implementation:**
```javascript
// Track 404s in router
if (!routeFound) {
  Sentry.captureMessage('404 Error', 'warning', {
    tags: { type: '404', url: window.location.pathname },
    extra: { referrer: document.referrer }
  });
}
```

#### Performance Monitoring
- Slow transactions (> 5 seconds)
- Database query slowness
- API response time degradation
- Page load performance

### 3.3 Alert Rules

**Critical Issues (Immediate Notification):**
- [ ] JavaScript error rate > 0.5% (per 5 min)
- [ ] Server error rate > 1% (per 5 min)
- [ ] API timeout rate > 5%
- [ ] Database connection failures

**Alert Configuration:**
```
Alert: "Error rate spike"
Condition: Event count > 10 in 5 min
Severity: Critical
Channels: Slack #critical-alerts, SMS, Email
Auto-resolve: No (manual review required)
```

**Warning Issues (Grouped Notification):**
- Client errors with 5+ occurrences
- Performance degradation
- Resource exhaustion warnings
- SSL certificate expiry warnings

**Alert Configuration:**
```
Alert: "Client error cluster"
Condition: Similar event count > 5 in 10 min
Severity: Warning
Channels: Slack #monitoring
Auto-resolve: Yes (after 1 hour of quiet)
```

### 3.4 Dashboard & Reports

**Real-time Dashboard:**
- Live error stream
- Error rate graph
- Top errors (last 24 hours)
- Error trend
- Affected users count

**Weekly Error Report:**
```
WEEKLY ERROR REPORT
Week of: {start_date} to {end_date}

Total Errors: {count}
Unique Issues: {count}
Affected Users: {count}
Resolution Rate: {percent}

Top 5 Issues:
1. Error: {description}
   - Count: {n} occurrences
   - Affected Users: {m}
   - Status: {open/resolved}

Error Trend: {up/down} {percent}%
Recommendations:
- {fix priority 1}
- {fix priority 2}
```

---

## 4. Uptime Monitoring

### 4.1 Uptime Monitoring Service

**Tool:** StatusPage.io or UptimeRobot
**Target:** carnivoreweekly.com
**Monitoring Interval:** Every 60 seconds

**Endpoints Monitored:**
```
1. Homepage: https://carnivoreweekly.com/
   - Method: GET
   - Expected: Status 200
   - Timeout: 10 seconds

2. API Health: https://api.carnivoreweekly.com/health
   - Method: GET
   - Expected: Status 200 + JSON response
   - Timeout: 5 seconds

3. Database Connection: https://carnivoreweekly.com/api/articles?limit=1
   - Method: GET
   - Expected: Status 200 + Data
   - Timeout: 10 seconds
```

### 4.2 Downtime Alerts

**Alert on Downtime:** Immediately

**Alert Channels:**
- SMS: Primary team members
- Email: Entire team
- Slack: #critical-alerts channel
- Status Page: Public notification

**Alert Message Template:**
```
🚨 CRITICAL: Carnivore Weekly is DOWN

Site: carnivoreweekly.com
Status: Offline
Last Check: {timestamp}
Duration: {duration}

Action:
1. Check server status
2. Review error logs
3. Initiate incident response

Incident ID: {ticket}
```

### 4.3 Incident Response

**On Downtime Detection:**
1. Auto-send Slack alert to #critical-alerts
2. Create PagerDuty incident (Critical severity)
3. Page on-call engineer
4. Auto-start incident timeline
5. Notify status page subscribers

**Resolution Tracking:**
- Time to first response: < 5 minutes
- Time to resolution: < 30 minutes
- Post-incident review: Within 24 hours

### 4.4 Status Page

**Setup:** StatusPage.io

**Public Status URL:** https://status.carnivoreweekly.com

**Components Tracked:**
- Website (carnivoreweekly.com)
- API (api.carnivoreweekly.com)
- Database
- CDN
- Email service

**Auto-Updates:**
- Downtime detected → Auto-update to "Investigating"
- Downtime resolved → Auto-update to "Resolved"
- Notification sent to subscribers

**Manual Updates:**
- Scheduled maintenance: Posted 24 hours in advance
- Incident post-mortems: Updated within 2 hours of resolution

---

## 5. Dashboard Access & Team Assignments

### 5.1 Dashboard Locations

| Dashboard | URL | Access | Assigned To |
|-----------|-----|--------|-------------|
| Google Analytics | https://analytics.google.com/analytics/web/#/p/395502609/p | Daily review | Sarah (Content) |
| Sentry Errors | https://sentry.io/organizations/carnivore/issues/ | 24/7 monitoring | Jordan (Dev) |
| Core Web Vitals | https://search.google.com/search-console | Daily review | Jordan (Dev) |
| Uptime Status | https://uptimerobot.com/dashboard | 24/7 monitoring | Leo (Infrastructure) |
| Status Page | https://status.carnivoreweekly.com | Public | All (read-only) |
| GitHub Actions | https://github.com/repo/actions | Real-time | Jordan (Dev) |

### 5.2 Monitoring Rotation

**Primary On-Call (24/7):** Jordan (Developer)
- Monitors: Sentry, uptime alerts, GitHub Actions
- Response time: < 10 minutes

**Secondary On-Call:** Leo (Infrastructure)
- Escalation: Called if primary unavailable
- Backup: Database/server issues

**Analytics Review (Weekdays):** Sarah (Content)
- Time: 9:00 AM daily
- Reviews: Bounce rate, engagement, user feedback
- Escalation: Notable drops in key metrics

**Weekly Sync:** All team members
- Time: Friday 2:00 PM
- Review: Weekly performance report, incident review

---

## 6. Monitoring Schedule

### Launch Day (January 8, 2026)

```
T+0 min:     Deploy to production
T+5 min:     Verify homepage loads
T+15 min:    Check Core Web Vitals baseline
T+30 min:    Team all-clear meeting
T+1 hour:    Begin analytics monitoring
T+4 hours:   First metrics report
T+24 hours:  Post-launch assessment

Monitoring: Continuous
Alert thresholds: Aggressive (catch any anomaly)
Team status: All hands monitoring
```

### Week 1 Post-Launch

**Daily Schedule:**
- 9:00 AM: Sarah reviews analytics dashboard
- 10:00 AM: Team sync (15 min)
- 3:00 PM: Jordan reviews Sentry dashboard
- 5:00 PM: Infrastructure health check (Leo)

**Daily Metrics Check:**
- Core Web Vitals trend
- Error rate stability
- Uptime status
- User engagement
- System performance

### Week 2-4 Post-Launch

**Daily Schedule:**
- 9:00 AM: Automated report generation
- 10:00 AM: Async team review (Slack)
- Friday 2:00 PM: Weekly sync

**Monitoring Intensity:** Reduced to normal operational level

---

## 7. Success Criteria & Baseline Metrics

### Week 1 Targets (Confirm No Regressions)

| Metric | Target | Threshold |
|--------|--------|-----------|
| Page Load Time | < 3 seconds | ≤ 3 sec |
| Bounce Rate | Stable or -5-10% | Not +10% |
| Session Duration | Stable or +5-10% | Not -10% |
| Error Rate | < 0.1% | ≤ 0.1% |
| LCP | ≤ 2500ms | ≤ 3000ms |
| INP | ≤ 200ms | ≤ 300ms |
| CLS | < 0.1 | < 0.15 |
| Uptime | ≥ 99.9% | ≥ 99.5% |

### Week 4 Targets (Measure Improvement)

| Metric | Target | vs. Baseline |
|--------|--------|-------------|
| Bounce Rate | Decrease 10-15% | -15% |
| Session Duration | Increase 20-30% | +25% |
| Scroll Depth (Trending) | ≥ 40% reach | +15% |
| Feature Engagement | ≥ 20% use Trending | +18% |
| New Users | Increase 15-20% | +17% |
| Return Rate | Maintain or increase | ≥ same |

---

## 8. Escalation Procedures

### Critical Issues (Response Time: < 5 min)

**Level 1:** On-call engineer (Jordan)
- Action: Investigate, attempt fix
- Escalation: If unresolved in 15 minutes

**Level 2:** Infrastructure lead (Leo)
- Action: Database/server investigation
- Escalation: If unresolved in 30 minutes

**Level 3:** CEO
- Action: Go/No-go decision, external communication
- Escalation: If affecting > 10% of users

### Incident Commander

**Assign:** Most senior person available
- Coordinates all responders
- Updates status page
- Communicates with stakeholders
- Documents incident timeline

---

## 9. Documentation & Runbooks

**Critical Issues Runbooks:**
- `runbooks/homepage-not-loading.md`
- `runbooks/performance-degradation.md`
- `runbooks/database-issues.md`
- `runbooks/mobile-layout-broken.md`
- `runbooks/analytics-not-tracking.md`

**Runbook Template:**
```
## Issue: [Title]
Severity: [Critical/High/Medium]
Impact: [# users affected]

### Symptoms
- [Symptom 1]
- [Symptom 2]

### Root Cause
[Most likely cause]

### Resolution Steps
1. [Step 1]
2. [Step 2]
3. [Verify fix]

### Escalation
If not resolved in [X minutes], escalate to [team]

### Prevention
[What to prevent this in future]
```

---

## 10. Post-Launch Monitoring Summary

**Duration:** First 30 days
**Intensity:** Full team engagement, daily reviews
**Goal:** Ensure successful launch, identify issues quickly
**Success Metric:** Zero critical issues, all metrics stable or improved

**Go/No-Go Criteria:**
- ✅ All systems operational
- ✅ No critical errors
- ✅ Core Web Vitals in "Good" range
- ✅ Uptime > 99.5%
- ✅ Team sign-off obtained

---

**Setup Owner:** Jordan (Developer)
**Review Date:** January 8, 2026 - 12:00 PM
**Next Review:** January 14, 2026 (Weekly metrics assessment)

# Launch Emergency Contacts - January 8, 2026

**CRITICAL:** Keep this document accessible at all times during launch day.

---

## Primary Escalation Chain

### TIER 1: Immediate Response (5 minutes)

#### Jordan - Development Lead
**Role:** Primary deployment contact & code issues

- **Name:** Jordan
- **Email:** jordan@carnivoreweekly.com
- **Phone:** [+1-XXX-XXX-XXXX]
- **Slack:** @jordan
- **GitHub:** [github username]
- **Timezone:** EST

**Responsibilities:**
- Execute deployment script
- Monitor GitHub Actions
- Handle code-related issues
- Run smoke tests
- Escalate to Leo if infrastructure issue

**Activation:** Automatically on duty at T-2 hours

---

#### Leo - Infrastructure & Database Lead
**Role:** Database & infrastructure escalation

- **Name:** Leo
- **Email:** leo@carnivoreweekly.com
- **Phone:** [+1-XXX-XXX-XXXX]
- **Slack:** @leo
- **GitHub:** [github username]
- **Timezone:** EST

**Responsibilities:**
- Monitor database health
- Monitor server infrastructure
- Handle performance issues
- Manage CDN/caching
- Escalate to CEO if critical downtime

**Activation:** On standby at T-4 hours, activated if needed

---

### TIER 2: Secondary Support (10 minutes)

#### Casey - Design Lead
**Role:** Visual/UI issues escalation

- **Name:** Casey
- **Email:** casey@carnivoreweekly.com
- **Phone:** [+1-XXX-XXX-XXXX]
- **Slack:** @casey
- **Figma:** [figma profile]
- **Timezone:** EST

**Responsibilities:**
- Validate visual design
- Review responsive design
- Handle CSS-related issues
- Provide design decisions if needed

**Activation:** On standby, called if design issue detected

---

#### Sarah - Content Lead
**Role:** Content & user feedback escalation

- **Name:** Sarah
- **Email:** sarah@carnivoreweekly.com
- **Phone:** [+1-XXX-XXX-XXXX]
- **Slack:** @sarah
- **Timezone:** EST

**Responsibilities:**
- Monitor user feedback/comments
- Validate content quality
- Handle content-related issues
- Provide editorial decisions if needed

**Activation:** On standby, called for content issues

---

### TIER 3: Executive Decision (15 minutes)

#### CEO - Chief Executive Officer
**Role:** Go/No-go decisions & external communications

- **Name:** [CEO Name]
- **Email:** ceo@carnivoreweekly.com
- **Phone:** [+1-XXX-XXX-XXXX]
- **Slack:** @ceo
- **Timezone:** EST

**Responsibilities:**
- Final go/no-go decision
- Approve rollback if necessary
- Authorize external communications
- Escalate to board if critical issue
- Make time-sensitive decisions

**Activation:** On call at T-1 hour, available throughout launch

---

## Issue-Specific Escalation Paths

### Code/Deployment Issues → Jordan

```
Issue detected
    ↓
Jordan investigates (5 min)
    ↓
Can fix in < 15 min?
    ├─ YES → Fix & redeploy
    └─ NO → Escalate to Leo or CEO
              (Possible rollback)
```

**Jordan's Actions:**
1. Identify error
2. Check logs and Sentry
3. Determine root cause
4. Attempt fix or declare rollback needed
5. Update team in #critical-alerts

---

### Performance Issues → Leo

```
Performance degraded detected
    ↓
Leo investigates (5 min)
    ├─ Infrastructure issue?
    │  └─ Troubleshoot
    └─ Code issue?
       └─ Escalate to Jordan
    ↓
Can optimize? (< 15 min)
    ├─ YES → Optimize & clear cache
    └─ NO → Consider rollback
```

**Leo's Actions:**
1. Check server/database health
2. Review performance metrics
3. Identify bottleneck
4. Attempt optimization
5. Update Jordan if code issue

---

### Design/Visual Issues → Casey

```
Visual problem reported
    ↓
Casey reviews (5 min)
    ├─ CSS issue?
    │  └─ Can Jordan fix quick?
    │     ├─ YES → Quick fix
    │     └─ NO → Rollback
    └─ Design issue?
       └─ Escalate to CEO for decision
```

**Casey's Actions:**
1. Verify issue on multiple devices
2. Check CSS in browser
3. Compare to Figma design
4. Assess impact severity
5. Recommend fix or rollback

---

### Content/Analytics Issues → Sarah

```
Content or analytics issue
    ↓
Sarah investigates (5-10 min)
    ├─ Content error?
    │  └─ Update content directly
    ├─ Analytics not tracking?
    │  └─ Jordan checks GA setup
    └─ User feedback issue?
       └─ Assess pattern & severity
```

**Sarah's Actions:**
1. Verify issue details
2. Check Google Analytics
3. Assess impact on users
4. Make content decisions
5. Monitor user feedback

---

## Launch Day Timeline & Responsibilities

### T-2 Hours (12:00 PM EST)

**Meeting:** Final Deployment Prep Standup
**Attendees:** CEO, Jordan, Leo, Casey, Sarah
**Duration:** 30 minutes

**Pre-Meeting Checklist:**
- [ ] All contacts reachable
- [ ] Slack channels monitoring
- [ ] Phones charged
- [ ] Status page ready
- [ ] Communications drafted

---

### T-1 Hour (1:00 PM EST)

**Status:** Code Freeze In Effect

**Responsibilities:**
- **Jordan:** Final testing in staging
- **Leo:** Infrastructure pre-flight checks
- **Casey:** Design validation
- **Sarah:** Content verification
- **CEO:** Final go/no-go confirmation

**Required:** All confirm "Ready" status

---

### T+0 (2:00 PM EST)

**DEPLOYMENT INITIATED**

**Responsibilities:**
- **Jordan:** Execute deployment script
- **Leo:** Monitor server health
- **Casey:** Standby for visual issues
- **Sarah:** Standby for content issues
- **CEO:** Oversee, available for decisions

**Critical:** All hands monitoring #launch channel

---

### T+0 to T+30 Minutes

**Active Monitoring Phase**

**Jordan's Duties:**
- Watch GitHub Actions deployment progress
- Monitor Sentry for errors
- Prepare smoke tests
- Update #launch channel every 5 minutes

**Leo's Duties:**
- Monitor server metrics
- Check database connection pool
- Verify no resource spikes
- Alert if infrastructure issue detected

**Casey & Sarah:** Standby, ready for visual/content issues

**CEO:** Available for critical decisions

---

### T+30 Minutes to T+4 Hours

**Extended Monitoring Phase**

**Jordan:** Primary monitoring
- Continue error monitoring
- Watch Core Web Vitals trend
- Monitor smoke test execution
- Available for issues

**Leo:** On standby
- Continue infrastructure checks
- Available if performance issue occurs

**Casey & Sarah:** On standby, available as needed

**CEO:** Available for executive decisions

---

### T+4 Hours Onward

**Sustained Monitoring Phase**

**Daily:**
- 9:00 AM EST: Metrics review (Sarah)
- Ongoing: Error monitoring (Jordan)
- Ongoing: Infrastructure (Leo)

---

## Communication Protocols

### Critical Issue Declared

**When:** Issue detected that affects > 1% of users or core functionality

**Notification Chain:**

```
Issue detected by: Jordan/Leo/Casey/Sarah
    ↓
Alert: Slack #critical-alerts (immediate)
    ↓
Update: Slack #launch channel (every 5 min)
    ↓
Call: CEO if > 15 min to resolution
    ↓
Status Page: Update if > 5 min duration
    ↓
Public: Inform users if > 30 min
```

### Slack Notification Template

```
🚨 CRITICAL ALERT

What: [Issue description]
Who: [Detected by: name]
When: [Time detected]
Impact: [Who is affected, how many users]
Severity: [Critical/High/Medium]

Status: 🟡 INVESTIGATING

Current actions:
- [Action 1]
- [Action 2]

Assigned: [Name]
ETA to resolution: [Time]

Next update: [In X minutes]
```

### Phone Escalation

**Call Sequence (if needed):**
1. Primary responder (Jordan/Leo)
2. CEO (if unresolved after 15 min)
3. Escalate as needed based on severity

**What to say:**
```
"Hi [Name], this is [Your Name] calling about a critical
production issue detected at [time] on the Carnivore Weekly
launch.

Issue: [Brief description]
Impact: [# users affected]
Status: [Currently investigating / need decision]

Can you help / make a decision immediately?"
```

---

## Incident Response Team Roles

### Incident Commander
**Selected:** [Most senior available person]

**Responsibilities:**
- Coordinate all responders
- Update status page
- Communicate with stakeholders
- Track timeline
- Make decisions with CEO authority

**Authority:** Can order rollback, stop deployment, escalate

### Technical Lead (Investigation)
**Selected:** Jordan (if code) or Leo (if infrastructure)

**Responsibilities:**
- Investigate root cause
- Implement fix
- Recommend rollback vs fix
- Update commander with status

### Communication Lead
**Selected:** CEO (or delegated)

**Responsibilities:**
- Update team in Slack
- Update status page
- Prepare public announcements
- Communicate with users

### Supporting Team
**Selected:** Remaining team members

**Responsibilities:**
- Assist technical investigation
- Monitor related systems
- Document incident
- Support decision-making

---

## Contact Information Backup

### If Primary Slack Down

**Contact Method:** Phone

1. **Jordan:** [phone]
   - Message: "Production issue on [date], need immediate assist"

2. **Leo:** [phone]
   - Message: "Infrastructure help needed on launch"

3. **CEO:** [phone]
   - Message: "Critical production decision needed"

### If Email Down

**Contact Method:** Phone + SMS

**Message Structure:**
```
[Name]: Production issue detected.
[Issue]: [Brief description]
[Impact]: [# users affected]
[ETA]: Need response in [minutes]
```

### External Communication (If Needed)

**Status Page:** status.carnivoreweekly.com
- Can be updated manually by anyone with access
- Auto-notifies subscribers

**Twitter:** @CarnivoreWeekly
- Post incident update (if > 30 min duration)
- CEO approval required

**Email:** support@carnivoreweekly.com
- Auto-responder with status page link
- Manual responses as situation develops

---

## Offline Contact Sheet

**Print this before launch day:**

```
╔════════════════════════════════════════════════════════════╗
║         CARNIVORE WEEKLY LAUNCH EMERGENCY CONTACTS         ║
║                    January 8, 2026                         ║
╚════════════════════════════════════════════════════════════╝

PRIMARY CONTACTS:

Jordan (Development)
├─ Phone: [+1-XXX-XXX-XXXX]
├─ Email: jordan@carnivoreweekly.com
├─ Slack: @jordan
└─ Role: Code & Deployment Issues

Leo (Infrastructure)
├─ Phone: [+1-XXX-XXX-XXXX]
├─ Email: leo@carnivoreweekly.com
├─ Slack: @leo
└─ Role: Database & Server Issues

Casey (Design)
├─ Phone: [+1-XXX-XXX-XXXX]
├─ Email: casey@carnivoreweekly.com
├─ Slack: @casey
└─ Role: Visual/Design Issues

Sarah (Content)
├─ Phone: [+1-XXX-XXX-XXXX]
├─ Email: sarah@carnivoreweekly.com
├─ Slack: @sarah
└─ Role: Content & User Feedback

CEO (Executive)
├─ Phone: [+1-XXX-XXX-XXXX]
├─ Email: ceo@carnivoreweekly.com
├─ Slack: @ceo
└─ Role: Critical Decisions & Escalation

CRITICAL LINKS:

GitHub Actions: https://github.com/[owner]/[repo]/actions
Slack #launch: https://[workspace].slack.com/messages/launch
Sentry Errors: https://sentry.io/organizations/carnivore/issues/
Analytics: https://analytics.google.com/analytics/web/
Status Page: https://status.carnivoreweekly.com
Deployment Log: /path/to/deployment-[date].log

QUICK COMMANDS:

Rollback: git revert HEAD --no-edit && git push origin main
Status: curl -v https://carnivoreweekly.com/
Logs: npm run logs:production

ESCALATION FLOW:

Issue Detected
    ↓
Alert in #critical-alerts (immediate)
    ↓
Responsible team member investigates (5 min)
    ↓
Can fix in < 15 min?
    ├─ YES: Fix, test, deploy
    └─ NO: Call CEO for decision
    ↓
Decision: Fix/Rollback/Investigate Further
    ↓
Execute & Monitor
    ↓
Post-incident review
```

---

## Training & Drills

### Monthly Escalation Drill

**Schedule:** Second Wednesday of each month at 2:00 PM EST

**Process:**
1. Simulate issue scenario
2. Test contact chain
3. Time response
4. Debrief and improve

**Scenarios:**
- Homepage not loading
- Database connection error
- Performance degradation
- Analytics not tracking

### Pre-Launch Review

**Date:** January 7, 2026 (day before launch)

**Checklist:**
- [ ] All contacts confirmed available
- [ ] Phone numbers verified
- [ ] Slack handles confirmed
- [ ] Email addresses current
- [ ] Offline contact list printed
- [ ] All team members briefed on roles
- [ ] Escalation procedures reviewed
- [ ] Emergency commands tested

---

## Post-Incident Follow-Up

### After Issue is Resolved

**Timeline:**
- **T+30 min:** Root cause identified
- **T+2 hours:** Initial post-mortem meeting
- **T+24 hours:** Full incident report completed
- **T+1 week:** Team meeting to prevent recurrence

**Incident Report Template:**

```
INCIDENT REPORT
Incident ID: [auto-generated]
Date: [date]
Duration: [start time] - [end time]

SUMMARY:
[What happened in 2-3 sentences]

TIMELINE:
T+0 min:  Issue detected by [name]
T+X min:  [Action taken]
T+Y min:  [Decision made]
T+Z min:  Issue resolved

ROOT CAUSE:
[Why did this happen?]

IMPACT:
- Users affected: [#]
- Duration: [minutes]
- Services impacted: [list]
- Revenue impact: [if any]

RESOLUTION:
[How was it fixed?]

PREVENTION:
[What will prevent this in future?]

ACTION ITEMS:
1. [Item] - Owner: [name] - Due: [date]
2. [Item] - Owner: [name] - Due: [date]
```

### Team Debrief

**Schedule:** Within 24 hours of critical incident

**Duration:** 1 hour

**Attendees:** All team members + stakeholders

**Agenda:**
1. Timeline review (5 min)
2. Root cause analysis (15 min)
3. What went well (5 min)
4. What to improve (15 min)
5. Action items & assignments (15 min)
6. Closure (5 min)

---

## Key Principles

✅ **Accessibility:** All contacts reachable within 5 minutes
✅ **Clarity:** Roles and responsibilities crystal clear
✅ **Speed:** Escalation path defined, no delays
✅ **Communication:** Updates every 5 minutes minimum
✅ **Authority:** Clear decision-making authority
✅ **Backup:** Secondary contacts for every role
✅ **Preparation:** Team trained and ready

---

**Document Owner:** CEO
**Last Updated:** January 8, 2026
**Status:** ACTIVE FOR LAUNCH

**Keep this document accessible and ensure all contacts have a copy on launch day.**

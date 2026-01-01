# Launch Day Quick Reference Guide

**Print this guide and keep it at your desk during launch.**

---

## ONE-LINER DEPLOYMENT

```bash
bash /Users/mbrew/Developer/carnivore-weekly/scripts/deploy-production.sh
```

---

## CRITICAL FILE LOCATIONS

| Document | Path | Print? |
|----------|------|--------|
| Pre-Deployment Checklist | DEPLOYMENT_CHECKLIST.md | YES |
| Emergency Contacts | docs/LAUNCH_EMERGENCY_CONTACTS.md | YES |
| Communication Plan | LAUNCH_COMMUNICATION.md | NO |
| Rollback Procedures | docs/ROLLBACK_PROCEDURES.md | YES |
| Monitoring Setup | docs/MONITORING_SETUP.md | NO |
| Success Metrics | SUCCESS_METRICS.md | NO |

---

## TEAM EMERGENCY CONTACTS

```
Jordan (Development):    [phone] - Deployment issues
Leo (Infrastructure):    [phone] - Database/server issues
Casey (Design):          [phone] - Design/CSS issues
Sarah (Content):         [phone] - Content issues
CEO (Executive):         [phone] - Critical decisions
```

---

## CRITICAL THRESHOLDS

**STOP & INVESTIGATE IF:**
- Page load time > 5 seconds
- Error rate > 0.5%
- Bounce rate up > 20%
- Core Web Vitals degraded > 30%
- More than 10 critical errors
- Uptime < 99%

**ROLLBACK IF:**
- Homepage not loading
- Database connection broken
- Issue unresolved > 15 minutes
- Team confidence < 50%

---

## QUICK ROLLBACK COMMAND

```bash
git revert HEAD --no-edit && git push origin main
```

**Duration:** 5-10 minutes
**Risk:** Low (reverting to known-good code)

---

## DEPLOYMENT TIMELINE

| Time | Status | Action |
|------|--------|--------|
| 12:00 PM | T-2h | Final prep standup |
| 1:00 PM | T-1h | Code freeze |
| 2:00 PM | T+0 | Deploy script starts |
| 2:05 PM | T+5m | Deploy complete |
| 2:15 PM | T+15m | Smoke tests passed - ANNOUNCE |
| 2:30 PM | T+30m | All-clear meeting |
| 3:00 PM | T+1h | First metrics report |
| 6:00 PM | T+4h | Daily summary |

---

## SMOKE TEST COMMAND

```bash
npm run test:smoke
```

**Expected:** 40+ tests, all passing
**Duration:** 5-10 minutes
**Must pass before declaring success**

---

## MONITORING DASHBOARDS

| System | URL | Owner |
|--------|-----|-------|
| Google Analytics | https://analytics.google.com | Sarah |
| Sentry Errors | https://sentry.io/organizations/carnivore | Jordan |
| Core Web Vitals | https://search.google.com/search-console | Jordan |
| Uptime Status | https://uptimerobot.com/dashboard | Leo |
| Status Page | https://status.carnivoreweekly.com | Public |

---

## SLACK CHANNELS

- `#launch` - Main deployment channel
- `#critical-alerts` - Emergency alerts only
- `#daily-metrics` - Metrics reports
- `#general` - Team announcements

---

## SUCCESS METRICS (WEEK 1)

**All of these must be true:**

- Page load time < 3 seconds
- LCP ≤ 2500ms, INP ≤ 200ms, CLS < 0.1
- Bounce rate: stable or -5-10%
- Session duration: stable or +5-10%
- Error rate < 0.1%
- Uptime ≥ 99.9%
- Team confidence: HIGH

---

## SUCCESS METRICS (WEEK 4)

**All of these must be true:**

- Bounce rate: -10-15% vs baseline
- Session duration: +20-30% vs baseline
- New users: +15-20% vs baseline
- Bento grid engagement: 50%+
- Trending topics CTR: 20%+
- No performance regressions

---

## DECISION TREES

### Homepage Not Loading?
1. Check error logs (Sentry)
2. Check server status (Leo)
3. If CSS/JS issue → ROLLBACK (5 min)
4. If database issue → Investigate (15 min max, then rollback)

### Performance Degraded?
1. Identify bottleneck (JS/images/CSS/DB)
2. Attempt quick fix (< 10 min)
3. If fix works → Deploy
4. If fix fails → ROLLBACK

### Mobile Layout Broken?
1. Test on actual device
2. Review CSS changes
3. Quick fix (< 10 min)?
4. If YES → Deploy
5. If NO → ROLLBACK

### Analytics Not Tracking?
1. Check if GA script present
2. Verify gtag function
3. Wait 24-48 hours for data
4. No rollback needed (non-critical)

### Database Connection Error?
1. Call Leo immediately
2. Investigate (5 min)
3. Can fix quickly?
4. If YES → Fix & deploy
5. If NO → ROLLBACK

---

## ESCALATION FLOW

```
Issue detected
    ↓
Alert #critical-alerts (immediate)
    ↓
Responsible team member investigates (5 min)
    ↓
Can fix in < 15 minutes?
    ├─ YES: Implement, test, deploy
    └─ NO: Call CEO for rollback decision
    ↓
Rollback or Fix?
    ├─ Rollback: Execute in 5 min
    └─ Fix: Test & deploy
    ↓
Announce resolution
    ↓
Post-mortem within 24 hours
```

---

## CRITICAL SLACK MESSAGES

### Issue Detected
```
🚨 CRITICAL ALERT
Issue: [description]
Severity: [critical/high/medium]
Investigating: [name]
ETA: [X minutes]
```

### Resolved
```
✅ ISSUE RESOLVED
Duration: [minutes]
Solution: [fix/rollback]
Status: [monitoring/all clear]
```

### Smoke Tests Complete
```
✅ SMOKE TESTS PASSED
All 40+ tests: PASS
Status: System operational
Ready to announce publicly
```

---

## ANNOUNCEMENT TEMPLATES

### Public Launch Announcement (Twitter)
```
New Carnivore Weekly homepage is LIVE!
Check out our fresh design with:
• Curated content hub
• Trending topics explorer
• Better mobile experience
• Faster loading

Welcome to the new era!
https://carnivoreweekly.com
```

### If Issue Occurs
```
We're experiencing a technical issue with the new
homepage. Our team is investigating.

Expected resolution: [time]
Status: https://status.carnivoreweekly.com
Thanks for your patience!
```

---

## PRE-LAUNCH CHECKLIST (DAY BEFORE)

- [ ] All documents reviewed
- [ ] Team meeting completed
- [ ] Emergency contacts verified by phone
- [ ] Deployment script tested in staging
- [ ] Smoke tests passing
- [ ] Monitoring dashboards live
- [ ] Offline copies printed
- [ ] CEO final approval obtained
- [ ] All team members confirmed available
- [ ] Slack channels set up and monitored

---

## DURING DEPLOYMENT CHECKLIST

- [ ] All team members at desks
- [ ] Slack #launch channel active
- [ ] Monitoring dashboards open
- [ ] Emergency contacts list visible
- [ ] Deployment script ready
- [ ] Cellular phones fully charged
- [ ] Coffee ready (important!)
- [ ] Do not interrupt deployment process
- [ ] Updates every 5 minutes minimum
- [ ] All team members focused

---

## EMERGENCY NUMBERS (PRINT & POST)

```
CARNIVORE WEEKLY LAUNCH EMERGENCY CONTACTS
January 8, 2026

CALL SEQUENCE:
1. Jordan (Dev):     [PHONE NUMBER]
2. Leo (Infra):      [PHONE NUMBER]
3. CEO (Executive):  [PHONE NUMBER]

SMS TO ALL IF NO ANSWER
```

---

## ONE-PAGE DECISION MATRIX

| Situation | Action | Time | Owner |
|-----------|--------|------|-------|
| Homepage down | Investigate | 5 min | Jordan |
| Performance bad | Optimize | 10 min | Leo |
| Mobile broken | Fix CSS | 10 min | Casey |
| Analytics fails | Check GA | 5 min | Sarah |
| DB connection | Investigate | 5 min | Leo |
| Unknown issue | Call CEO | NOW | Anyone |

---

## MOST IMPORTANT THINGS TO REMEMBER

1. **Don't panic.** We have procedures for everything.
2. **Communicate constantly.** Updates every 5 minutes in #launch.
3. **Ask for help.** That's what the team is for.
4. **Rollback is safe.** 5-10 minutes to revert if needed.
5. **Monitor closely.** First 4 hours are critical.
6. **Document everything.** For post-mortem analysis.
7. **Celebrate success!** We've earned it.

---

## ADDITIONAL RESOURCES

- Full monitoring setup: docs/MONITORING_SETUP.md
- Detailed rollback steps: docs/ROLLBACK_PROCEDURES.md
- Full communication plan: LAUNCH_COMMUNICATION.md
- Success metrics: SUCCESS_METRICS.md
- Emergency procedures: docs/LAUNCH_EMERGENCY_CONTACTS.md

---

**Print this page and keep it at your desk during launch day.**

**Keep it simple. Follow procedures. We've got this.** 🚀

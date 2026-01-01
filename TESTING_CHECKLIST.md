# End-to-End Testing Checklist

**Date:** January 1, 2026
**Status:** Ready to test
**Expected Duration:** 15-20 minutes

---

## Pre-Test Setup

Before testing, verify these are deployed:

- [ ] Cloudflare Worker is running
- [ ] Database tables exist (check Supabase dashboard)
- [ ] Edge function is deployed
- [ ] Cron job is scheduled
- [ ] Resend email domain verified

---

## Test 1: Free Path (Calculator Only)

**Duration:** 5 minutes

### Step 1: Open Calculator Page
```
URL: https://carnivoreweekly.com/public/calculator.html
Expected: See "Choose Your Path" screen with 2 buttons
```

**Check:**
- [ ] Page loads without errors
- [ ] "Choose Your Path" header visible
- [ ] Two cards visible (Free and Paid)
- [ ] "Start Free Calculator" button visible

### Step 2: Click Free Button
```
Click: "Start Free Calculator" button
Expected: Calculator form appears
```

**Check:**
- [ ] Choice screen hides
- [ ] Calculator form shows
- [ ] Form fields are visible and functional
- [ ] No JavaScript errors in browser console

### Step 3: Fill Calculator Form

Fill in test data:
- [ ] Weight: 180 lbs (or your weight)
- [ ] Height: 5'10" (or your height)
- [ ] Age: 35 (any age)
- [ ] Activity Level: Select an option
- [ ] Goal: Select "Fat Loss" or "Muscle Gain"

### Step 4: Submit Form
```
Click: Calculate button
Expected: Results page appears with personalized macros
```

**Check:**
- [ ] Results calculate and display
- [ ] Macro targets shown (calories, protein, fat, carbs)
- [ ] "Upgrade to Full Protocol" button visible
- [ ] Results look reasonable (calories > 1000)

### Step 5: Verify Results Store
```
Open: Browser DevTools (F12)
Go to: Console
Run: localStorage.getItem('session_id')
Expected: See a UUID (long string like: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
```

**Check:**
- [ ] Session ID is stored
- [ ] Session ID looks like a valid UUID

---

## Test 2: Paid Path (Full Protocol)

**Duration:** 10 minutes

### Step 1: Open Calculator Again
```
URL: https://carnivoreweekly.com/public/calculator.html
Expected: Fresh choice screen (session cleared)
```

**Check:**
- [ ] Choice screen shows
- [ ] No cached data from previous test

### Step 2: Click Paid Button
```
Click: "Get Full Protocol" ($9.99) button
Expected: Redirects to questionnaire
```

**Check:**
- [ ] Page navigates to questionnaire.html
- [ ] Questionnaire form visible
- [ ] Form fields are empty (fresh session)

### Step 3: Fill Questionnaire

Fill with test data:
- [ ] Name: "Test User"
- [ ] Email: "testuser+[timestamp]@gmail.com" (e.g., testuser+20260101@gmail.com)
- [ ] Health History: Select options
- [ ] Dietary Preferences: Select options
- [ ] Goals: Select options
- [ ] Any other form fields

**Why use timestamp in email?** Prevents Gmail deduplication, ensures you get multiple test emails.

### Step 4: Submit Form
```
Click: Submit button
Expected: Success message appears
```

**Check:**
- [ ] Success message displays
- [ ] Message says "Your report is ready" or similar
- [ ] "Check your email" message visible
- [ ] Form clears
- [ ] No JavaScript errors

### Step 5: Check Email Inbox

**Wait:** 30 seconds (Resend processes quickly)

```
Go to: Your email inbox (Gmail, etc.)
Search for: "testuser+[timestamp]@gmail.com"
Expected: Email from Carnivore Weekly with report link
```

**Check:**
- [ ] Email received from "Carnivore Weekly" or "reports@..."
- [ ] Subject mentions "Personalized Carnivore Protocol" or "Report"
- [ ] Email contains a link starting with "https://carnivoreweekly.com/report.html?token="
- [ ] Email has clear instructions to click the link

**If email not received:**
- [ ] Wait 2 more minutes
- [ ] Check spam folder
- [ ] Verify Resend domain was verified (ask user to check Resend dashboard)

### Step 6: Click Report Link in Email

**Click:** The link in the email

```
Expected: Report page loads with full protocol details
```

**Check:**
- [ ] Page loads (doesn't show error)
- [ ] Report displays (not "Report Expired" message)
- [ ] Report contains:
  - [ ] User name (or "Your Report")
  - [ ] Personalized macros
  - [ ] 30-day meal plan information
  - [ ] Health recommendations
  - [ ] Doctor consultation script

### Step 7: Verify Secure Access

**Open:** Browser DevTools (F12) → Network tab

**Check:**
- [ ] Page made HTTPS request to Supabase
- [ ] No unencrypted data in network requests
- [ ] Token parameter visible in URL (but not transmitted unencrypted)

### Step 8: Test Download/Print

**Try:**
- [ ] Right-click → "Print to PDF" → Save file
- [ ] Or use browser Print function (Ctrl+P or Cmd+P)

**Check:**
- [ ] Report can be printed/saved as PDF
- [ ] PDF contains all report content
- [ ] Formatting looks reasonable in PDF

---

## Test 3: Upgrade Path (Free → Paid)

**Duration:** 5 minutes

### Step 1: Complete Free Path Again

```
1. Go to calculator.html
2. Click "Start Free Calculator"
3. Fill form
4. Submit
5. See results
```

### Step 2: Click Upgrade Button
```
Look for: "Upgrade to Full Protocol" or "Get Full Report" button
Click it
Expected: Redirects to questionnaire with session preserved
```

**Check:**
- [ ] Questionnaire loads
- [ ] Session ID still in localStorage
- [ ] Can proceed to fill and submit questionnaire

### Step 3: Verify Session Linkage
```
Open: DevTools Console
Run: localStorage.getItem('session_id')
Expected: Same UUID as from calculator
```

**Check:**
- [ ] Session ID matches
- [ ] Data flows through system correctly

---

## Test 4: Report Expiration (Optional - Advanced)

**Duration:** Advanced test, do after going live

### Test 48-Hour Expiration (After 2 days)

```
Day 1:
1. Generate a report
2. Note the token from email link
3. Access report successfully

Day 3:
1. Try to access same link again
2. Expected: "Report Expired" message
```

**Check:**
- [ ] Report accessible on Day 1
- [ ] Report expired on Day 3 (after 48 hours)
- [ ] Error message is user-friendly

---

## Test 5: Analytics Tracking (Optional)

**Duration:** 2 minutes

### Google Analytics Events

```
Open: Google Analytics 4 Dashboard
https://analytics.google.com → Select property 517632328
```

**Check for events:**
- [ ] "path_selected" events (when users click Free/Paid)
- [ ] "report_generated" events
- [ ] "report_email_sent" events
- [ ] Conversion tracking active

---

## Test 6: Error Handling

**Duration:** 5 minutes

### Test Invalid Token

```
Go to: https://carnivoreweekly.com/public/report.html?token=invalid-token-12345
Expected: Error message appears
```

**Check:**
- [ ] "Invalid token" or similar message
- [ ] No crash or 500 error
- [ ] Helpful message to user

### Test Missing Token

```
Go to: https://carnivoreweekly.com/public/report.html
Expected: Error message
```

**Check:**
- [ ] "No token provided" message
- [ ] Instructions to use email link
- [ ] No JavaScript errors

### Test Empty Form Submission

```
Go to: Questionnaire
Click: Submit WITHOUT filling form
Expected: Validation error
```

**Check:**
- [ ] Error message for required fields
- [ ] Form doesn't submit incomplete data
- [ ] User is prompted to fill required fields

---

## Pass/Fail Criteria

### ✅ PASS - System is Production Ready

**All of these must work:**
1. [ ] Free path: Calculator → Results
2. [ ] Paid path: Questionnaire → Email → Report access
3. [ ] Email received within 30 seconds
4. [ ] Report accessible via email link for 48 hours
5. [ ] No JavaScript errors
6. [ ] No unhandled 500 errors
7. [ ] Mobile responsive (test on phone)
8. [ ] Session tracking works
9. [ ] Error handling graceful
10. [ ] Report displays full content

### ❌ FAIL - Issues Found

**If any of these occur:**
- [ ] Email doesn't arrive
- [ ] Report link doesn't work
- [ ] JavaScript errors in console
- [ ] 500 server errors
- [ ] Missing content in report
- [ ] Session not tracking
- [ ] Payment flow broken
- [ ] Form validation not working

**Action:** Debug using Cloudflare logs and Supabase logs

---

## Logs to Check if Issues Found

### Cloudflare Worker Logs
```bash
export SUPABASE_ACCESS_TOKEN="sbp_873982c4a474f6906c195d7f6b848a99b2c3df63"
wrangler tail --env production
```

### Supabase Logs
```
https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/logs
```

### Browser Console
Press F12 → Console tab → Look for red errors

---

## Success Metrics

After testing, system is successful if:

- ✅ **Conversion Rate:** At least 1/10 users click "Upgrade"
- ✅ **Email Delivery:** 100% of emails arrive within 1 minute
- ✅ **Report Access:** 90%+ of users can access their report
- ✅ **Errors:** Less than 1% error rate
- ✅ **Performance:** Page loads in < 3 seconds
- ✅ **Mobile:** Fully functional on mobile devices

---

## Test Results Template

```
Date: [Date of testing]
Tester: [Your name]

Free Path Test:
  Calculator loads: [ ] PASS [ ] FAIL
  Form submits: [ ] PASS [ ] FAIL
  Results display: [ ] PASS [ ] FAIL

Paid Path Test:
  Questionnaire loads: [ ] PASS [ ] FAIL
  Form submits: [ ] PASS [ ] FAIL
  Email received: [ ] PASS [ ] FAIL (Time: _____ seconds)
  Report accessible: [ ] PASS [ ] FAIL
  Report content complete: [ ] PASS [ ] FAIL

Issues Found:
[List any issues here]

Overall Status: [ ] READY FOR PRODUCTION [ ] NEEDS FIXES
```

---

## Next Steps

### If All Tests PASS ✅
1. Celebrate! 🎉
2. Announce to team
3. Monitor logs for first 24 hours
4. Track GA conversion metrics
5. Collect user feedback

### If Tests FAIL ❌
1. Check logs (see above)
2. Document issue
3. Fix in code
4. Redeploy Cloudflare Worker if needed
5. Retest specific scenario
6. Verify fix in logs

---

## Quick Reference

| Component | Test Method | Expected Result |
|-----------|-------------|-----------------|
| Calculator | Fill form | Results display |
| Questionnaire | Fill form | Email sent |
| Email delivery | Check inbox | Email arrives < 1 min |
| Report access | Click link | Report displays |
| Report storage | Access after 24h | Still accessible |
| Error handling | Invalid token | Graceful error |
| Mobile | View on phone | Responsive, functional |
| Analytics | Check GA4 | Events tracked |

---

## Estimated Timeline

- Test 1 (Free path): 5 min
- Test 2 (Paid path): 10 min
- Test 3 (Upgrade): 5 min
- Test 4 (Expiration): Skip for now
- Test 5 (Analytics): 2 min
- Test 6 (Errors): 5 min

**Total: ~25-30 minutes**

---

**Ready to test?** Start with Test 1 and work through each section! 🚀

Let me know if you find any issues and I can help debug!

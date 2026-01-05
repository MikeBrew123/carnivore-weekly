# Performance Audit Setup Reference

## Quick Start

```bash
# 1. Ensure server is running
cd /Users/mbrew/Developer/carnivore-weekly/public
python3 -m http.server 8000 &

# 2. Run Lighthouse audit
cd /Users/mbrew/Developer/carnivore-weekly
npx lighthouse http://localhost:8000/index.html \
  --only-categories=performance \
  --quiet \
  --output=json \
  --output-path=/tmp/lh-report.json

# 3. Check results
node scripts/check-lighthouse-thresholds.js /tmp/lh-report.json
```

---

## Target Metrics

**LCP** (Largest Contentful Paint): ≤ 2500ms
**CLS** (Cumulative Layout Shift): < 0.1
**INP** (Interaction to Next Paint): ≤ 200ms

---

## Key Files Involved

| File | Purpose |
|------|---------|
| `/Users/mbrew/Developer/carnivore-weekly/scripts/check-lighthouse-thresholds.js` | Validates audit results against thresholds |
| `/Users/mbrew/Developer/carnivore-weekly/tests/performance.test.js` | Playwright performance test suite |
| `/Users/mbrew/Developer/carnivore-weekly/package.json` | Contains test scripts and dependencies |
| `/Users/mbrew/Developer/carnivore-weekly/LIGHTHOUSE-AUDIT-REPORT.md` | This detailed audit documentation |
| `/Users/mbrew/Developer/carnivore-weekly/lighthouse-audit.js` | Node.js script to run audit programmatically |
| `/tmp/lighthouse-report.json` | Generated audit report (JSON) |

---

## Threshold Values (from check-lighthouse-thresholds.js)

```javascript
THRESHOLDS = {
  lighthouseScore: 90,
  lcp: 2500,      // ms
  cls: 0.1,       // unitless
  fid: 100,       // ms (First Input Delay - older metric)
  fcp: 1800,      // ms
  tbt: 200        // ms (Total Blocking Time)
};
```

---

## Pass/Fail Logic

**Test PASSES if:**
- LCP ≤ 2500ms
- CLS < 0.1 (strict)
- Lighthouse Score ≥ 90
- All other metrics within range

**Test FAILS if:**
- Any metric exceeds threshold
- Lighthouse Score < 90

---

## Extracting Individual Metrics

```bash
# After audit generates /tmp/lh-report.json:

# LCP (Largest Contentful Paint)
jq '.audits["largest-contentful-paint"].numericValue' /tmp/lh-report.json

# CLS (Cumulative Layout Shift)
jq '.audits["cumulative-layout-shift"].numericValue' /tmp/lh-report.json

# INP (if available)
jq '.audits["interaction-to-next-paint"].numericValue' /tmp/lh-report.json

# FCP (First Contentful Paint)
jq '.audits["first-contentful-paint"].numericValue' /tmp/lh-report.json

# TBT (Total Blocking Time)
jq '.audits["total-blocking-time"].numericValue' /tmp/lh-report.json

# Overall Performance Score
jq '.categories.performance.score * 100 | round' /tmp/lh-report.json

# All in one:
jq '{
  lighthouse_score: (.categories.performance.score * 100 | round),
  lcp: .audits."largest-contentful-paint".numericValue,
  cls: .audits."cumulative-layout-shift".numericValue,
  fcp: .audits."first-contentful-paint".numericValue,
  tbt: .audits."total-blocking-time".numericValue,
  fid: .audits."first-input-delay".numericValue
}' /tmp/lh-report.json
```

---

## Expected Output Format

When running the validation script, expect output like:

```
📊 LIGHTHOUSE VALIDATION REPORT
================================

Lighthouse Performance Score: 92/100

📈 CORE WEB VITALS
------------------
Largest Contentful Paint (LCP): 2340.25ms
Cumulative Layout Shift (CLS): 0.085
First Contentful Paint (FCP): 1650.00ms
First Input Delay (FID): 45.00ms
Total Blocking Time (TBT): 145.00ms

📋 SUMMARY
----------
✅ Passed: 5
⚠️  Warnings: 0
❌ Failed: 0

📄 Results saved to: /tmp/threshold-validation.json

✅ VALIDATION PASSED - All metrics meet thresholds
```

---

## JSON Report Structure

The generated lighthouse report contains:

```json
{
  "categories": {
    "performance": {
      "score": 0.92,  // 0-1 scale (multiply by 100 for 0-100)
      "audits": [...]
    }
  },
  "audits": {
    "largest-contentful-paint": {
      "numericValue": 2340.25,
      "displayValue": "2.3 s"
    },
    "cumulative-layout-shift": {
      "numericValue": 0.085,
      "displayValue": "0.085"
    },
    "first-contentful-paint": {
      "numericValue": 1650.00,
      "displayValue": "1.7 s"
    },
    ...
  }
}
```

---

## Integration with Existing Tests

The project has test scripts in package.json:

```json
"test:performance": "playwright test performance.test.js"
```

Run with:
```bash
npm run test:performance
```

This runs `/Users/mbrew/Developer/carnivore-weekly/tests/performance.test.js`

---

## Troubleshooting

**Issue**: "Lighthouse not found"
**Solution**: `npm install -g lighthouse` or use `npx lighthouse`

**Issue**: "Cannot reach http://localhost:8000"
**Solution**: Ensure server is running:
```bash
cd /Users/mbrew/Developer/carnivore-weekly/public
python3 -m http.server 8000
```

**Issue**: "jq command not found"
**Solution**: Install jq:
```bash
brew install jq
```

**Issue**: Permission denied running Bash
**Solution**: Use the Node.js script instead:
```bash
node /Users/mbrew/Developer/carnivore-weekly/lighthouse-audit.js
```

---

## Success Criteria

- ✅ LCP ≤ 2.5 seconds
- ✅ CLS < 0.1 (no unexpected layout shifts)
- ✅ Lighthouse Performance Score ≥ 90
- ✅ All pages pass W3C validation (separate audit)
- ✅ No broken links or images
- ✅ Mobile responsive (no horizontal scroll)

---

## Files Referenced in This Document

1. **Audit Validator**: `/Users/mbrew/Developer/carnivore-weekly/scripts/check-lighthouse-thresholds.js`
2. **Performance Tests**: `/Users/mbrew/Developer/carnivore-weekly/tests/performance.test.js`
3. **Package Config**: `/Users/mbrew/Developer/carnivore-weekly/package.json`
4. **Audit Script**: `/Users/mbrew/Developer/carnivore-weekly/lighthouse-audit.js`
5. **Detailed Report**: `/Users/mbrew/Developer/carnivore-weekly/LIGHTHOUSE-AUDIT-REPORT.md`

---

## Next Actions

1. Ensure server is running on port 8000
2. Run: `npx lighthouse http://localhost:8000/index.html --only-categories=performance --quiet --output=json --output-path=/tmp/lh-report.json`
3. Validate: `node scripts/check-lighthouse-thresholds.js /tmp/lh-report.json`
4. Review results and address any failures

---

**Status**: Ready to audit
**Date**: 2026-01-02

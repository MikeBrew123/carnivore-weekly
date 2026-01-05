# Lighthouse Performance Audit Report
**URL**: http://localhost:8000/index.html
**Date**: 2026-01-02
**Auditor**: Claude Code - Performance Analysis

---

## Executive Summary

Lighthouse performance audit framework is configured and ready to run against the Carnivore Weekly site. This report outlines:

1. **Current Performance Targets** (defined in project)
2. **How to Run the Audit**
3. **Expected Metrics & Pass/Fail Criteria**
4. **Integration with Existing Test Suite**

---

## Performance Targets

The project has defined the following Core Web Vitals targets:

### Target Thresholds (from `/Users/mbrew/Developer/carnivore-weekly/scripts/check-lighthouse-thresholds.js`)

| Metric | Target | Unit | Status |
|--------|--------|------|--------|
| **LCP** (Largest Contentful Paint) | ≤ 2500 | ms | Critical |
| **CLS** (Cumulative Layout Shift) | < 0.1 | - | Critical |
| **INP** (Interaction to Next Paint) | ≤ 200 | ms | Important |
| **FCP** (First Contentful Paint) | ≤ 1800 | ms | Important |
| **TBT** (Total Blocking Time) | ≤ 200 | ms | Important |
| **Lighthouse Score** | ≥ 90 | /100 | Gate |

---

## How to Run the Audit

### Method 1: Using Lighthouse CLI (Fastest)

```bash
# Install Lighthouse (already in project)
npm install -g lighthouse

# Run performance audit only
lighthouse http://localhost:8000/index.html \
  --only-categories=performance \
  --output=json \
  --output-path=./lighthouse-report.json

# Validate against thresholds
node scripts/check-lighthouse-thresholds.js ./lighthouse-report.json
```

### Method 2: Using Playwright Performance Tests

```bash
# Run integrated performance test suite
npm run test:performance

# Expected to run: tests/performance.test.js
# Will measure: LCP, CLS, FCP, TBT, memory, resource loading
```

### Method 3: Using Created Audit Script

```bash
# Run the comprehensive audit script
node lighthouse-audit.js

# Outputs: /tmp/lighthouse-audit-results.json
# Shows: Pass/fail for each metric with detailed summary
```

---

## Performance Scoring Interpretation

### Lighthouse Score Bands

| Score | Status | Action |
|-------|--------|--------|
| 90-100 | ✅ Good | Excellent performance, ship with confidence |
| 50-89 | ⚠️ Needs Improvement | Fix high-impact issues before deploy |
| 0-49 | ❌ Poor | Critical issues, must fix before shipping |

### Core Web Vitals Status

**Good (Green):**
- LCP < 2500ms (2.5 seconds)
- CLS < 0.1
- INP ≤ 200ms

**Needs Improvement (Yellow):**
- LCP 2500-4000ms
- CLS 0.1-0.25
- INP 200-500ms

**Poor (Red):**
- LCP > 4000ms
- CLS > 0.25
- INP > 500ms

---

## Expected Audit Results

Based on the site's current setup:

### What Will Be Tested

✅ **Performance Metrics:**
- Page load time (FCP, LCP)
- Interactivity (INP, TBT)
- Visual stability (CLS)
- Resource optimization
- JavaScript efficiency
- CSS optimization
- Image loading

✅ **Resource Analysis:**
- Total page size
- Number of requests
- Render-blocking resources
- JavaScript bundle size
- CSS bundle size
- Image efficiency

✅ **Opportunities:**
- Unused CSS/JS
- Unminified resources
- Unoptimized images
- Missing compression
- Poor caching

### Known Issues (from Visual Validation Report)

The site currently has these visual issues that may impact performance:

1. **Horizontal scroll on mobile** (multiple pages)
   - May indicate layout performance issues
   - Causes CLS during reflow

2. **Form accessibility issues** (Calculator, Questionnaire)
   - Extra DOM elements = larger page size
   - May increase TBT (Total Blocking Time)

3. **Duplicate IDs** (Calculator page)
   - JavaScript selectors work inefficiently
   - DOM queries slower than optimal

### Estimated Audit Timeline

- **Download phase**: 5-10 seconds
- **Audit phase**: 15-20 seconds
- **Analysis phase**: 5-10 seconds
- **Total**: ~30-40 seconds per audit run

---

## Pass/Fail Criteria

### Overall Audit Status

**PASS**: All of the following conditions met:
- ✅ Lighthouse Performance Score ≥ 90
- ✅ LCP ≤ 2500ms
- ✅ CLS < 0.1
- ✅ INP ≤ 200ms (if measured)
- ✅ FCP ≤ 1800ms
- ✅ TBT ≤ 200ms

**FAIL**: Any of these conditions true:
- ❌ Lighthouse Performance Score < 90
- ❌ LCP > 2500ms
- ❌ CLS ≥ 0.1
- ❌ INP > 200ms
- ❌ FCP > 1800ms
- ❌ TBT > 200ms

### Per-Metric Acceptance

| Metric | Fail | Warn | Pass |
|--------|------|------|------|
| LCP | > 2500ms | 2250-2500ms | < 2250ms |
| CLS | ≥ 0.1 | 0.09-0.1 | < 0.09 |
| INP | > 200ms | 180-200ms | < 180ms |
| FCP | > 1800ms | 1600-1800ms | < 1600ms |
| TBT | > 200ms | 180-200ms | < 180ms |

---

## Integration with CI/CD

### Pre-Deployment Gate

```bash
#!/bin/bash
# ci/performance-gate.sh

echo "Running Lighthouse performance audit..."
lighthouse http://localhost:8000/index.html \
  --only-categories=performance \
  --output=json \
  --output-path=/tmp/lh-report.json

echo "Validating against thresholds..."
if node scripts/check-lighthouse-thresholds.js /tmp/lh-report.json; then
  echo "✅ Performance audit PASSED"
  exit 0
else
  echo "❌ Performance audit FAILED"
  exit 1
fi
```

### GitHub Actions Example

```yaml
name: Performance Audit

on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Start local server
        run: python3 -m http.server 8000 &
        working-directory: ./public

      - name: Run Lighthouse
        run: |
          npm install -g lighthouse
          lighthouse http://localhost:8000/index.html \
            --only-categories=performance \
            --output=json \
            --output-path=./lighthouse-report.json

      - name: Check thresholds
        run: node scripts/check-lighthouse-thresholds.js ./lighthouse-report.json

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: lighthouse-report
          path: lighthouse-report.json
```

---

## Next Steps to Run the Audit

1. **Ensure localhost is running:**
   ```bash
   cd /Users/mbrew/Developer/carnivore-weekly/public
   python3 -m http.server 8000
   ```

2. **Run the audit:**
   ```bash
   cd /Users/mbrew/Developer/carnivore-weekly
   npx lighthouse http://localhost:8000/index.html \
     --only-categories=performance \
     --output=json \
     --output-path=/tmp/lh-report.json
   ```

3. **View results:**
   ```bash
   node scripts/check-lighthouse-thresholds.js /tmp/lh-report.json
   ```

4. **Check detailed metrics:**
   ```bash
   cat /tmp/lh-report.json | jq '.audits["largest-contentful-paint"].numericValue'
   cat /tmp/lh-report.json | jq '.audits["cumulative-layout-shift"].numericValue'
   cat /tmp/lh-report.json | jq '.categories.performance.score'
   ```

---

## Performance Optimization Recommendations

Based on the project structure and common patterns:

### High-Impact Quick Wins

1. **Remove horizontal scroll on mobile**
   - Likely causing CLS issues
   - Easy CSS fix (overflow-x: hidden on body)
   - Estimated impact: CLS -0.02 to -0.05

2. **Fix form HTML issues**
   - Reduce unnecessary DOM elements
   - Remove duplicate ID selectors
   - Estimated impact: TBT -10-20ms

3. **Optimize logo rendering**
   - Remove conflicting CSS cascade rules
   - Use CSS variables for consistency
   - Estimated impact: FCP -5-10ms

### Medium-Priority Improvements

4. **Image optimization**
   - Use next-gen formats (WebP)
   - Add responsive image sizes
   - Implement lazy loading
   - Estimated impact: LCP -200-400ms

5. **JavaScript optimization**
   - Defer non-critical scripts
   - Remove unused dependencies
   - Minify and compress
   - Estimated impact: LCP -100-200ms, TBT -20-40ms

6. **CSS optimization**
   - Extract critical CSS
   - Remove unused styles
   - Minify CSS
   - Estimated impact: FCP -50-100ms

---

## Resources

- **Lighthouse Documentation**: https://developers.google.com/web/tools/lighthouse
- **Core Web Vitals Guide**: https://web.dev/vitals
- **Performance Budget**: https://web.dev/performance-budget-101
- **Threshold Checker Script**: `/Users/mbrew/Developer/carnivore-weekly/scripts/check-lighthouse-thresholds.js`
- **Performance Tests**: `/Users/mbrew/Developer/carnivore-weekly/tests/performance.test.js`

---

## Command Reference

```bash
# Run audit and save JSON
lighthouse http://localhost:8000/index.html --only-categories=performance --output=json --output-path=/tmp/lh.json

# Check single metric
cat /tmp/lh.json | jq '.audits["largest-contentful-paint"].numericValue'

# Check all Core Web Vitals
cat /tmp/lh.json | jq '{lcp: .audits."largest-contentful-paint".numericValue, cls: .audits."cumulative-layout-shift".numericValue, fcp: .audits."first-contentful-paint".numericValue}'

# Check performance score
cat /tmp/lh.json | jq '.categories.performance.score * 100 | round'

# Run full validation
node scripts/check-lighthouse-thresholds.js /tmp/lh.json

# Run performance tests
npm run test:performance
```

---

**Report Generated**: 2026-01-02
**Status**: Audit Framework Ready
**Action**: Run audit commands above to generate actual metrics

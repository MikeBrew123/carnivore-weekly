# Comprehensive Test Suite Documentation

## Overview

This project includes 130+ production-grade tests across 6 testing layers:

1. **Structural Tests** (16 tests) - HTML validity and semantic correctness
2. **Visual Regression Tests** (25+ tests) - Layout and visual accuracy
3. **Accessibility Tests** (15+ tests) - WCAG 2.1 AA compliance
4. **Performance Tests** (20+ tests) - Core Web Vitals and optimization
5. **Brand Consistency Tests** (18+ tests) - Colors, typography, spacing
6. **Content Validation Tests** (22+ tests) - Copy quality, voice, SEO

---

## Quick Start

### Run All Tests
```bash
npm test
```

### Run Tests by Layer

**Pytest Structural Tests**
```bash
npm run test:py:structure
pytest tests/test_bento_grid_structure.py -v
```

**Playwright Visual Regression**
```bash
npm run test:visual
playwright test tests/visual-regression.spec.js
```

**Playwright Accessibility (WCAG 2.1 AA)**
```bash
npm run test:a11y
playwright test tests/accessibility.test.js
```

**Playwright Performance**
```bash
npm run test:performance
playwright test tests/performance.test.js
```

**Jest Brand Consistency**
```bash
npm run test:brand
jest tests/brand-consistency.test.js
```

**Jest Content Validation**
```bash
npm run test:content
jest tests/content-validation.test.js
```

---

## Test Files Reference

### 1. Structural Tests
**File:** `tests/test_bento_grid_structure.py` (Pytest, 16 tests)

Tests HTML validity, semantic correctness, and element nesting.

**Test Coverage:**
- Grid container structure validation
- Responsive column layout (3 cols desktop, 2 cols tablet, 1 col mobile)
- Responsive gap/spacing (40px, 30px, 20px)
- Grid item span configuration
- Component color and font application
- Hover and focus animation states
- No horizontal scroll at any breakpoint

**Run:**
```bash
pytest tests/test_bento_grid_structure.py -v
```

---

### 2. Visual Regression Tests
**File:** `tests/visual-regression.spec.js` (Playwright, 25+ tests)

Compares current layout to baseline screenshots at all breakpoints.

**Test Coverage:**
- Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)
- Grid layout matching
- All grid items visibility
- Default/hover/focus states
- Grid structure accuracy
- Heading hierarchy
- Image positioning
- Spacing accuracy
- Color rendering
- Shadow effects
- Gradient backgrounds
- Animation timing

**Run:**
```bash
playwright test tests/visual-regression.spec.js
npm run test:visual
```

**Update Baselines:**
```bash
playwright test tests/visual-regression.spec.js --update-snapshots
```

---

### 3. Accessibility Tests
**File:** `tests/accessibility.test.js` (Playwright, 15+ tests)

WCAG 2.1 AA compliance validation using axe-core.

**Test Coverage:**
- Critical accessibility violations (zero tolerance)
- Heading hierarchy (no skipped levels)
- Color contrast (≥4.5:1 for normal text)
- Alt text on all images
- Form labeling
- Link text clarity (no "click here")
- Keyboard navigation (Tab, arrow keys)
- Visible focus indicators
- No focus trapping
- Skip links (if present)
- Semantic HTML structure
- ARIA attribute usage
- Motion/animation respect (prefers-reduced-motion)
- No auto-playing media
- Zoom support (up to 200%)
- Mobile viewport support
- Broken link detection
- Error message accessibility

**Run:**
```bash
playwright test tests/accessibility.test.js
npm run test:a11y
```

**Key Thresholds:**
- Color contrast: ≥4.5:1 (normal text), ≥3:1 (large text)
- Focus indicators: Visible on all interactive elements
- Alt text: Present and descriptive (not filename)
- Button size: ≥44x44px (recommended)

---

### 4. Performance Tests
**File:** `tests/performance.test.js` (Playwright, 20+ tests)

Core Web Vitals and resource optimization validation.

**Test Coverage:**
- LCP (Largest Contentful Paint) ≤2500ms
- CLS (Cumulative Layout Shift) <0.1
- FCP (First Contentful Paint) ≤1800ms
- TBT (Total Blocking Time) ≤200ms
- Image loading efficiency
- Render-blocking resources
- Asset compression (gzip/brotli)
- Main thread blocking
- JavaScript bundle size (<500KB)
- Script deferral strategy
- CSS optimization (<100KB)
- Unused CSS detection
- Memory leak detection
- Network request minimization
- Caching effectiveness
- Interaction smoothness
- Slow device simulation

**Run:**
```bash
playwright test tests/performance.test.js
npm run test:performance
```

**Key Thresholds:**
- LCP: ≤2500ms (yellow), ≤4000ms (red)
- CLS: <0.1 (good), <0.25 (needs improvement)
- FCP: ≤1800ms
- Total JS: <500KB
- CSS: <100KB per file

---

### 5. Brand Consistency Tests
**File:** `tests/brand-consistency.test.js` (Jest, 18+ tests)

Brand standards for colors, typography, and spacing.

**Test Coverage:**
- Primary colors (#3d2817, #5a3d2a)
- Accent colors (#c8a882, #e8d4c4)
- Text colors (#f4e4d4, #1a1a1a)
- Color contrast for accessibility
- Consistent text colors across components
- Font loading (Merriweather serif, Inter sans)
- Font sizes consistency
- Font weights
- Line heights
- Spacing grid (8px base unit)
- Padding consistency
- Margin consistency
- Gap measurements
- Responsive spacing
- Component styling
- Border consistency
- Box shadow effects
- Logo dimensions and placement

**Run:**
```bash
jest tests/brand-consistency.test.js
npm run test:brand
```

**Brand Standards:**
- Primary: #3d2817, #5a3d2a
- Accent: #c8a882, #e8d4c4
- Text: #f4e4d4, #1a1a1a
- Serif: Merriweather
- Sans: Inter
- Spacing unit: 8px

---

### 6. Content Validation Tests
**File:** `tests/content-validation.test.js` (Jest, 22+ tests)

Copy quality, brand voice, and SEO validation.

**Test Coverage:**
- Meaningful content on all items
- Proper grammar and no typos
- Consistent voice and tone
- No AI tell-tale patterns (avoid: "delve", "robust", "leverage")
- Reading level appropriate (Grade 8-10)
- Contractions present (it's, we're, don't)
- Specific examples (not generic)
- Evidence citations
- Sarah's voice markers detected
- Mobile-friendly text length
- No em-dashes (—) detected
- Excessive punctuation detection
- Meta description optimization
- Heading hierarchy
- Link optimization
- Image alt text quality
- Mobile viewport optimization
- SEO best practices
- Keyword presence
- Content freshness

**Run:**
```bash
jest tests/content-validation.test.js
npm run test:content
```

**Voice Guidelines:**
- Authentic, conversational tone
- Specific examples with evidence
- Natural contractions
- Avoid corporate jargon
- Grade 8-10 reading level

---

## Configuration Files

### jest.config.js
Jest test runner configuration:
- Test environment: node
- Coverage thresholds: 50% (branches, functions, lines, statements)
- Test timeout: 30 seconds
- Setup file: jest.setup.js

### jest.setup.js
Jest initialization:
- Custom matchers (toBeValidURL, toHaveGoodContrast)
- Environment setup
- Global hooks

### playwright.config.js
Playwright test runner configuration:
- Test directory: ./tests
- Match pattern: **/*.spec.js
- Browsers: Chromium, Firefox, WebKit
- Devices: Desktop Chrome, Firefox, Safari, Mobile (Pixel 5, iPhone 12)
- Screenshot on failure
- Video on failure
- HTML report generation

---

## Running Tests with Coverage

Generate coverage report:
```bash
npm run test:jest
```

This will:
1. Run all Jest tests with coverage
2. Generate coverage report in console
3. Create coverage directory with detailed HTML report

**Coverage Thresholds:**
- Branches: 50%
- Functions: 50%
- Lines: 50%
- Statements: 50%

View HTML report:
```bash
open coverage/lcov-report/index.html
```

---

## CI/CD Integration

### GitHub Actions
The test suite is configured for CI/CD:
- Run on every push and pull request
- Run on schedule (daily)
- Upload coverage reports
- Generate test reports

Example workflow (.github/workflows/test.yml):
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
```

---

## Fixing Failed Tests

### Visual Regression Tests
If screenshots don't match:
1. Review the diff in the test report
2. Verify the change is intentional
3. Update baselines:
   ```bash
   playwright test tests/visual-regression.spec.js --update-snapshots
   ```

### Accessibility Tests
If contrast fails:
1. Check background color (style.backgroundColor)
2. Check text color (style.color)
3. Adjust colors to meet WCAG AA (4.5:1 for normal text)
4. Test with WebAIM contrast checker

If heading hierarchy fails:
1. Ensure one h1 per page
2. Don't skip heading levels (h1 → h2 → h3)
3. Use proper heading structure

If alt text fails:
1. All images must have alt attribute
2. Alt text should describe image content
3. Alt should not be filename
4. Keep under 150 characters

### Performance Tests
If LCP exceeds threshold:
1. Minimize render-blocking resources
2. Defer non-critical JavaScript
3. Optimize images (compression, WebP)
4. Use lazy loading

If CLS is high:
1. Set dimensions for images/videos
2. Avoid inserting content above existing content
3. Use CSS transforms for animations (not layout changes)

### Brand Consistency Tests
If colors don't match:
1. Check computed style (not inline style)
2. Verify CSS is loaded
3. Check color format (hex vs rgb vs named)
4. Use Color Picker DevTools to verify

If fonts don't load:
1. Check @font-face declarations
2. Verify font files are in project
3. Check font-family cascade
4. Test in incognito window (no cache)

### Content Validation Tests
If typos detected:
1. Fix spelling in source content
2. Verify against approved dictionary
3. Check grammar checker output

If voice is inconsistent:
1. Review tone of all grid items
2. Ensure consistent perspective
3. Match Sarah's authentic, conversational style
4. Remove corporate jargon

---

## Test Execution Timeline

Expected execution times:
- Structural tests: 30-60 seconds
- Visual regression: 2-3 minutes
- Accessibility: 2-3 minutes
- Performance: 3-4 minutes
- Brand consistency: 1-2 minutes
- Content validation: 1-2 minutes

**Total: ~10-15 minutes for full suite**

---

## Debugging Tests

### Enable Verbose Output
```bash
playwright test --verbose
jest --verbose
```

### Debug Mode (Playwright)
```bash
playwright test --debug
```

This opens the Playwright Inspector for step-by-step debugging.

### Test Specific File
```bash
playwright test tests/accessibility.test.js
jest tests/brand-consistency.test.js
```

### Test Specific Test Case
```bash
playwright test -g "should have no critical accessibility violations"
jest -t "should use brand colors correctly"
```

### View Reports
```bash
# Playwright HTML report
npx playwright show-report

# Coverage report
open coverage/lcov-report/index.html
```

---

## Test Maintenance

### Adding New Tests
1. Add test file to `/tests` directory
2. Follow naming convention: `*.spec.js` (Playwright) or `*.test.js` (Jest)
3. Add test to appropriate layer (structure, visual, a11y, performance, brand, content)
4. Update test documentation
5. Run full test suite

### Updating Test Data
- Structural tests: Update HTML samples in pytest fixtures
- Visual tests: Update baseline screenshots when design changes
- Performance: Adjust thresholds based on performance improvements
- Brand: Update BRAND_STANDARDS object when brand changes

### Deprecating Tests
1. Mark test with `.skip()`
2. Document reason for deprecation
3. Remove after 1 month
4. Update this documentation

---

## Best Practices

1. **Test Independence:** Tests should not depend on each other
2. **Isolation:** Each test should set up its own state
3. **Readability:** Test names should describe what they test
4. **Maintainability:** Keep tests DRY, use fixtures/helpers
5. **Speed:** Mock external resources, use appropriate timeouts
6. **Reliability:** Avoid flaky tests, use proper waits
7. **Reporting:** Use clear assertions with helpful error messages

---

## Troubleshooting

### Playwright Tests Fail with "Target page closed"
- Increase timeout in playwright.config.js
- Reduce number of parallel workers
- Check for memory leaks in application

### Jest Tests Fail with "Cannot find module"
- Run `npm install` to ensure dependencies
- Check import paths are correct
- Verify jest.setup.js is in root

### Coverage Below Threshold
- Add tests for untested code paths
- Lower coverage thresholds if appropriate
- Review coverage report for gaps

### Screenshots Don't Match
- Check browser zoom level (should be 100%)
- Ensure consistent font rendering
- Account for anti-aliasing differences
- Check for time-dependent content

---

## Resources

- [Playwright Docs](https://playwright.dev/)
- [Jest Docs](https://jestjs.io/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web.dev Core Web Vitals](https://web.dev/vitals/)
- [axe DevTools](https://www.deque.com/axe/devtools/)

---

## Support

For issues or questions:
1. Check test output and error messages
2. Review test documentation above
3. Check test file comments
4. Review test configuration files
5. Enable verbose/debug mode for more details

---

**Last Updated:** December 31, 2025
**Test Suite Version:** 1.0
**Coverage Target:** >80% (current: measurement pending)

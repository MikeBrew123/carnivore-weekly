# Test Suite Index - Quick Navigation

## Overview
Comprehensive test infrastructure with 115+ tests across 6 quality layers.

---

## Quick Links

### Run Tests
```bash
npm test                    # All tests
npm run test:a11y          # Accessibility only
npm run test:visual        # Visual regression only
npm run test:performance   # Performance only
npm run test:brand         # Brand consistency only
npm run test:content       # Content validation only
npm run test:py:structure  # Structural tests only
```

---

## Documentation Files

### For Getting Started
- **TESTING_GUIDE.md** - Complete how-to guide
- **PHASE3B_EXECUTIVE_SUMMARY.md** - Overview and quick reference

### For Reference
- **TEST_INFRASTRUCTURE_SUMMARY.md** - Technical details
- **PHASE3B_VERIFICATION_CHECKLIST.md** - Delivery verification

### This Document
- **TEST_SUITE_INDEX.md** - Navigation guide (you are here)

---

## Test Files by Layer

### 1. Structural Tests
**File:** `tests/test_bento_grid_structure.py`
**Count:** 15 tests
**Framework:** Pytest
**What it tests:** HTML validity, semantic correctness, element nesting

### 2. Visual Regression Tests
**File:** `tests/visual-regression.spec.js`
**Count:** 27 tests
**Framework:** Playwright
**What it tests:** Layout accuracy at 3 breakpoints, component states

### 3. Accessibility Tests
**File:** `tests/accessibility.test.js`
**Count:** 20 tests
**Framework:** Playwright + axe-core
**What it tests:** WCAG 2.1 AA compliance, keyboard navigation, screen readers

### 4. Performance Tests
**File:** `tests/performance.test.js`
**Count:** 17 tests
**Framework:** Playwright
**What it tests:** Core Web Vitals, bundle size, optimization

### 5. Brand Consistency Tests
**File:** `tests/brand-consistency.test.js`
**Count:** 18 tests
**Framework:** Playwright
**What it tests:** Colors, typography, spacing, component styling

### 6. Content Validation Tests
**File:** `tests/content-validation.test.js`
**Count:** 18 tests
**Framework:** Playwright
**What it tests:** Copy quality, voice authenticity, SEO, grammar

---

## Configuration Files

### jest.config.js
Jest test runner configuration for Node-based tests
- Coverage thresholds: 50% minimum
- Test timeout: 30 seconds
- Setup file: jest.setup.js

### jest.setup.js
Jest initialization and custom matchers
- toBeValidURL
- toHaveGoodContrast

### playwright.config.js
Playwright test runner configuration for browser-based tests
- Browsers: Chromium, Firefox, WebKit
- Devices: Desktop, Tablet, Mobile
- Timeout: 30 seconds per test
- Screenshot on failure

---

## Test Statistics

```
Layer 1: Structural Tests      15 tests
Layer 2: Visual Tests          27 tests
Layer 3: Accessibility        20 tests
Layer 4: Performance          17 tests
Layer 5: Brand               18 tests
Layer 6: Content             18 tests
                            ─────────
TOTAL                       115 tests
```

**Browsers:** Chromium, Firefox, WebKit
**Viewports:** Desktop (1920), Tablet (768), Mobile (375)
**Execution Time:** 10-15 minutes

---

## Common Tasks

### Running Tests Locally
```bash
npm test
```

### Testing Accessibility Only
```bash
npm run test:a11y
```

### Getting Coverage Report
```bash
npm run test:jest
```

### Debugging a Test
```bash
# Run with verbose output
playwright test --verbose

# Use interactive debugger
playwright test --debug

# Run specific test
playwright test -g "test name"
```

### Updating Visual Baselines
```bash
playwright test tests/visual-regression.spec.js --update-snapshots
```

---

## Test Standards & Thresholds

### Accessibility (WCAG 2.1 AA)
- Color contrast: ≥4.5:1
- Alt text: Required on all images
- Focus: Visible on all interactive elements
- Heading: One H1, no skipped levels

### Performance (Core Web Vitals)
- LCP: ≤2500ms
- CLS: <0.1
- FCP: ≤1800ms
- Bundle: <500KB

### Brand
- Colors: #3d2817, #5a3d2a, #c8a882, #e8d4c4, #f4e4d4
- Fonts: Merriweather (serif), Inter (sans)
- Spacing: 8px base unit grid

### Content
- No AI patterns
- Grade 8-10 reading level
- Contractions present
- Specific examples with evidence

---

## Troubleshooting

### Tests Won't Run
1. Check Node version: `node --version` (need 14+)
2. Install dependencies: `npm install`
3. Check file paths in config

### Visual Test Fails
1. Review screenshot diff in output
2. Update baseline if change is intentional: `npm run update-baseline`
3. Check browser zoom (should be 100%)

### Accessibility Test Fails
1. Check WCAG contrast: Use WebAIM contrast checker
2. Review axe-core output in test log
3. Verify semantic HTML structure

### Performance Test Fails
1. Check network: May need to lower threshold for slow network
2. Clear cache: Tests use fresh page loads
3. Check system resources: CPU/memory usage

---

## Team Resources

### For Developers
- TESTING_GUIDE.md - How to run and fix tests
- Individual test files - Comments explaining each test
- jest.setup.js - Custom matcher documentation

### For QA
- PHASE3B_VERIFICATION_CHECKLIST.md - What's included
- TEST_INFRASTRUCTURE_SUMMARY.md - Complete reference
- Test execution times and reliability

### For Managers
- PHASE3B_EXECUTIVE_SUMMARY.md - Overview and impact
- Statistics and metrics
- Risk mitigation coverage

---

## Integration Points

### GitHub Actions
Tests ready for CI/CD integration:
```bash
npm test  # Runs all tests in CI
```

### Pre-commit Hooks
Recommended checks:
```bash
npm run test:py:structure
npm run test:a11y
npm run test:performance
```

### Pull Request Gates
Require passing:
- npm test (all tests)
- npm run test:jest (with coverage)

---

## File Map

```
/carnivore-weekly/
├── jest.config.js              ✓ Jest configuration
├── jest.setup.js               ✓ Jest setup
├── playwright.config.js        ✓ Playwright configuration
├── package.json               ✓ Test scripts
├── tests/
│   ├── test_bento_grid_structure.py    ✓ Structural (15)
│   ├── visual-regression.spec.js       ✓ Visual (27)
│   ├── accessibility.test.js           ✓ A11y (20)
│   ├── performance.test.js             ✓ Performance (17)
│   ├── brand-consistency.test.js       ✓ Brand (18)
│   └── content-validation.test.js      ✓ Content (18)
├── TESTING_GUIDE.md                    ✓ How-to guide
├── TEST_INFRASTRUCTURE_SUMMARY.md      ✓ Technical ref
├── PHASE3B_VERIFICATION_CHECKLIST.md   ✓ Verification
├── PHASE3B_EXECUTIVE_SUMMARY.md        ✓ Overview
└── TEST_SUITE_INDEX.md                 ✓ Navigation
```

---

## Next Steps

1. **Review** - Read PHASE3B_EXECUTIVE_SUMMARY.md
2. **Run** - Execute `npm test` to verify setup
3. **Integrate** - Add to GitHub Actions workflow
4. **Monitor** - Track test results over time
5. **Maintain** - Keep tests updated with changes

---

## Support

For detailed information, see:
- **TESTING_GUIDE.md** - Comprehensive testing reference
- Test file comments - Specific test logic
- Configuration files - Environment setup

---

**Status:** Complete and Production-Ready
**Date:** December 31, 2025
**Total Tests:** 115
**Version:** 1.0.0

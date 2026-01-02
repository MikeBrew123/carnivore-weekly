# Bento Grid QA - NPM Test Scripts

This guide documents all available npm scripts for running the 6-tier QA validation system.

## Package.json Configuration

Add these scripts to your `package.json` `"scripts"` section:

```json
{
  "scripts": {
    "serve": "python -m http.server 3000 --directory public",
    "build": "echo 'Building static assets...'",

    "test": "npm run test:all",
    "test:all": "npm run validate:all",

    "validate:all": "npm run validate:structural && npm run test:visual && npm run test:a11y && npm run test:performance && npm run test:brand && npm run test:content",

    "validate:structural": "pytest tests/test_bento_grid_structure.py -v --tb=short",
    "validate:html": "python scripts/validate_structure.py public/ --mode generated --output test-results/structure-validation.json",

    "test:visual": "playwright test tests/visual-regression.spec.js",
    "test:visual:update": "playwright test tests/visual-regression.spec.js --update-snapshots",
    "test:visual:debug": "playwright test tests/visual-regression.spec.js --debug",
    "test:visual:ui": "playwright test tests/visual-regression.spec.js --ui",

    "test:a11y": "jest tests/accessibility.test.js --coverage",
    "test:a11y:debug": "jest tests/accessibility.test.js --detectOpenHandles",

    "test:performance": "jest tests/performance.test.js --testTimeout=60000",
    "test:lighthouse": "lighthouse http://localhost:3000/bento-grid --output=json --output-path=./lighthouse-report.json && node scripts/check-lighthouse-thresholds.js lighthouse-report.json",

    "test:brand": "jest tests/brand-consistency.test.js --coverage",
    "test:content": "jest tests/content-validation.test.js --coverage",

    "baselines:capture": "node scripts/capture-baselines.js",
    "baselines:update": "playwright test tests/visual-regression.spec.js --update-snapshots",

    "report:open": "open test-results/index.html || xdg-open test-results/index.html",
    "report:clean": "rm -rf test-results playwright-report",

    "ci:validate": "npm run validate:structural && npm run test:visual && npm run test:a11y && npm run test:performance && npm run test:brand && npm run test:content",
    "ci:report": "npm run report:lighthouse && node scripts/generate-qa-report.js"
  }
}
```

## Quick Reference

### Run All Validations
```bash
# Run complete 6-tier validation
npm run validate:all

# With CI environment variables
CI=true npm run validate:all
```

### Run Individual Tiers

```bash
# Tier 1: Structural
npm run validate:structural
npm run validate:html

# Tier 2: Visual Regression
npm run test:visual
npm run test:visual:update      # Update snapshots after approved changes
npm run test:visual:debug       # Debug mode with Playwright Inspector
npm run test:visual:ui          # Interactive UI mode

# Tier 3: Accessibility
npm run test:a11y
npm run test:a11y:debug         # Debug with open handles detection

# Tier 4: Performance
npm run test:performance
npm run test:lighthouse         # Full Lighthouse audit with threshold check

# Tier 5: Brand Consistency
npm run test:brand

# Tier 6: Content Validation
npm run test:content
```

### Baseline Management

```bash
# Capture initial visual baselines for all breakpoints
npm run baselines:capture

# Update baselines after approved design changes
npm run baselines:update
```

### Reports

```bash
# Open test results in browser
npm run report:open

# Clean up test artifacts
npm run report:clean

# Generate comprehensive QA report (CI)
npm run ci:report
```

## Detailed Usage Examples

### Example 1: Local Development - Run All Tests

```bash
# Start development server
npm run serve &

# Wait for server to start
sleep 5

# Run all validations
npm run validate:all
```

### Example 2: Update Visual Baselines After Design Change

```bash
# Start server
npm run serve &

# Review and approve design changes
# Then update baselines
npm run test:visual:update

# Verify all other validations still pass
npm run validate:structural
npm run test:a11y
npm run test:performance

# Commit baseline changes
git add tests/__snapshots__
git commit -m "Update visual baselines for approved design changes"
```

### Example 3: Debug Failing Accessibility Test

```bash
# Start server
npm run serve &

# Debug accessibility test with detailed output
npm run test:a11y:debug

# Or open Playwright UI
npm run test:visual:ui
```

### Example 4: Performance Benchmarking

```bash
# Start server
npm run serve &

# Run Lighthouse audit
npm run test:lighthouse

# Results saved to lighthouse-report.json
# Threshold check runs automatically
```

### Example 5: CI/CD Pipeline Validation

```bash
# Run all validations in CI mode
CI=true npm run ci:validate

# Generate comprehensive report
npm run ci:report

# Results available in test-results/ directory
```

## Environment Variables

Control test behavior with environment variables:

```bash
# Base URL for testing (default: http://localhost:3000)
BASE_URL=https://staging.example.com npm run test:visual

# CI mode (disables some interactive features)
CI=true npm run validate:all

# Debug mode
DEBUG=* npm run test:a11y

# Playwright debug mode
PWDEBUG=1 npm run test:visual:debug

# Percy token for visual regression uploads
PERCY_TOKEN=your-token npm run test:visual
```

## Test File Organization

```
tests/
├── test_bento_grid_structure.py      # Tier 1: Structural (pytest)
├── visual-regression.spec.js         # Tier 2: Visual (Playwright)
├── accessibility.test.js             # Tier 3: A11y (Jest)
├── performance.test.js               # Tier 4: Performance (Jest)
├── brand-consistency.test.js          # Tier 5: Brand (Jest)
└── content-validation.test.js         # Tier 6: Content (Jest)

test-results/                          # Generated test reports
├── structural-report.html
├── jest-report.html
├── playwright-report/
├── lighthouse-report.json
└── qa-summary.html

__snapshots__/
└── visual-regression.spec.js.snap     # Visual baselines (Percy)
```

## Interpreting Test Results

### Structural Validation
- **PASS**: All HTML is valid and semantic
- **FAIL**: Critical HTML structure issues must be fixed before deployment

### Visual Regression
- **PASS**: Snapshots match approved baselines
- **REVIEW**: Visual differences detected - designer approval needed
- **FAIL**: Unexpected visual changes

### Accessibility
- **PASS**: WCAG AA compliant
- **FAIL**: Accessibility violations block deployment
- **WARNINGS**: Minor issues to review

### Performance
- **PASS**: All Core Web Vitals within thresholds
- **WARNING**: Close to thresholds
- **FAIL**: Performance issues block deployment

### Brand Consistency
- **PASS**: All brand standards met
- **REVIEW**: Minor deviations - designer review suggested
- **FAIL**: Major brand violations

### Content Validation
- **PASS**: Grammar, voice, SEO all verified
- **REVIEW**: Minor issues identified
- **FAIL**: Critical content issues

## Continuous Integration

For GitHub Actions, tests run automatically on:
- Pull requests to main/develop
- Push to main
- Daily scheduled runs (2 AM UTC)
- Manual workflow dispatch

View results in:
1. GitHub Actions tab
2. PR comments (automatic)
3. Artifacts section (reports)

## Troubleshooting

### Tests Won't Run
```bash
# Ensure dependencies installed
npm install

# Install Playwright browsers
npx playwright install

# Check Python dependencies
pip install pytest html5lib beautifulsoup4
```

### Server Connection Issues
```bash
# Check if server is running
curl http://localhost:3000

# Kill existing process and restart
pkill -f "http.server"
npm run serve
```

### Visual Test Snapshots Outdated
```bash
# Update snapshots after approved changes
npm run baselines:update

# Or specific tests
npx playwright test tests/visual-regression.spec.js --update-snapshots
```

### Performance Test Flakiness
```bash
# Run with retries
jest tests/performance.test.js --maxWorkers=1

# Or on slower system
jest tests/performance.test.js --testTimeout=60000
```

### Accessibility Test False Positives
```bash
# Check if it's a real issue
npm run test:a11y -- --verbose

# Review axe-core results in detail
npm run test:a11y -- --detectOpenHandles
```

## Performance Optimization

For faster test runs:

```bash
# Run tests in parallel (careful with resource usage)
jest tests/*.test.js --maxWorkers=4

# Skip less critical tests in development
npm run test:visual -- --grep "desktop"

# Run specific test file only
npm run test:brand -- tests/brand-consistency.test.js
```

## Advanced Usage

### Custom Test Filtering

```bash
# Run only desktop visual tests
npx playwright test tests/visual-regression.spec.js -g "desktop"

# Run tests for specific components
jest tests/brand-consistency.test.js -t "Color Palette"

# Run all accessibility tests except motion tests
jest tests/accessibility.test.js --testNamePattern="^(?!.*motion)"
```

### Generate Custom Reports

```bash
# HTML report with coverage
jest tests/*.test.js --coverage --collectCoverageFrom='public/**/*.html'

# JUnit XML for CI integration
jest tests/*.test.js --reporters=jest-junit

# JSON results for custom processing
jest tests/*.test.js --json --outputFile=results.json
```

### Integration with Other Tools

```bash
# Run with ESLint
npm run lint && npm run validate:all

# Run with TypeScript checking
npx tsc --noEmit && npm run validate:all

# Run with pre-commit hook
husky install
npm run validate:all  # Add to .husky/pre-commit
```

## Support & Documentation

For more information:
- Playwright docs: https://playwright.dev
- Jest docs: https://jestjs.io
- Pytest docs: https://pytest.org
- Lighthouse docs: https://developers.google.com/web/tools/lighthouse

See `QA_VALIDATION_FRAMEWORK.md` for comprehensive framework documentation.

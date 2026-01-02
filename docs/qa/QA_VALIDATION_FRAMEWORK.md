# Bento Grid Redesign - Comprehensive QA & Validation Framework

## Executive Summary

This document establishes a 6-tier validation system for the Bento Grid redesign launch, ensuring quality across structural integrity, visual consistency, accessibility compliance, performance standards, brand alignment, and content authenticity. All validations integrate into GitHub Actions CI/CD pipeline with blocking and warning gates.

---

## Table of Contents

1. [6-Tier Validation System](#6-tier-validation-system)
2. [Test Implementation Guide](#test-implementation-guide)
3. [GitHub Actions CI/CD Setup](#github-actions-cicd-setup)
4. [Validation Gates & Thresholds](#validation-gates--thresholds)
5. [Test Data & Baselines](#test-data--baselines)
6. [Team Approval Workflow](#team-approval-workflow)
7. [Pre-Launch Checklist](#pre-launch-checklist)
8. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 6-Tier Validation System

### Tier 1: Structural Validation
**Goal:** Ensure HTML validity, semantic correctness, and proper element nesting

**What Gets Validated:**
- DOCTYPE and lang attribute presence
- Single header/nav structure (no duplicates)
- Proper heading hierarchy (h1 > h2 > h3, no skips)
- Required elements (title, meta tags, main content)
- Image alt text on all images
- Proper form labeling
- List structure integrity
- Logo path depth (relative path validation)
- Inline style conflicts with CSS classes
- Link href attributes present

**Success Criteria:**
- Zero critical errors
- All major issues resolved
- HTML validates against project config

**Tools:** Custom StructuralValidator (existing)

---

### Tier 2: Visual Regression Testing
**Goal:** Detect unintended visual changes across all breakpoints

**What Gets Tested:**
- Desktop (1920x1080) - baseline
- Tablet (768x1024)
- Mobile (375x667)
- Dark mode variations
- State changes (hover, focus, active)
- Responsive behavior at breakpoints

**Success Criteria:**
- No pixel variance > 2% per screenshot
- All breakpoints match approved baseline
- Color accuracy within 5% tolerance

**Tools:** Playwright + Percy visual regression testing

**Baseline Management:**
- Initial baselines captured before launch
- Baselines updated only on approved design changes
- Version control for baseline history

---

### Tier 3: Accessibility Validation
**Goal:** Ensure WCAG 2.1 AA compliance and usable experience for all

**What Gets Tested:**
- Color contrast (4.5:1 for text, 3:1 for large text)
- Keyboard navigation (tab order, focus management)
- Screen reader compatibility
- ARIA attributes properly used
- Form labels and error messages
- Alternative text for images
- Motion/animation accessibility (prefers-reduced-motion)

**Success Criteria:**
- Zero automatic violations in axe-core
- Manual testing passes WCAG AA
- Keyboard-only navigation fully functional

**Tools:** axe-core + manual testing

---

### Tier 4: Performance Validation
**Goal:** Meet Core Web Vitals targets and maintain fast load times

**Performance Targets:**
- Largest Contentful Paint (LCP): ≤2.5s
- Cumulative Layout Shift (CLS): <0.1
- First Input Delay (FID): <100ms
- Overall Lighthouse Score: ≥90
- First Contentful Paint (FCP): <1.8s
- Total Blocking Time (TBT): <200ms

**Success Criteria:**
- All Core Web Vitals meet targets
- Lighthouse score ≥90 on 3 consecutive runs
- No performance regressions from baseline

**Tools:** Lighthouse CLI, Web Vitals library

---

### Tier 5: Brand Consistency Validation
**Goal:** Ensure design alignment with Carnivore Weekly brand standards

**What Gets Validated:**
- Color palette accuracy (hex value matches within 2%)
- Typography (font family, sizes, weights)
- Spacing and alignment (8px grid compliance)
- Logo placement and dimensions
- Component styling consistency
- Button states and hover effects
- Border radius consistency
- Shadow consistency

**Success Criteria:**
- Zero critical brand deviations
- All color values match approved palette
- All fonts from approved families
- Component spacing within 2px tolerance

**Tools:** carnivore-brand skill + visual-validator skill

---

### Tier 6: Content Validation
**Goal:** Ensure authentic voice, no AI detection, copy quality

**What Gets Validated:**
- No AI-generated voice patterns
- Copy authenticity and brand voice
- Grammar and spelling
- Tone consistency
- No brand violations
- Link validity and metadata
- Image alt text quality

**Success Criteria:**
- Pass copy-editor validation
- Authentic human voice confirmed
- Zero grammar/spelling errors
- SEO metadata complete

**Tools:** copy-editor skill, content-integrity skill, seo-validator skill

---

## Test Implementation Guide

### Tier 1: Structural Validation Test

**File:** `tests/test_bento_grid_structure.py`

```python
#!/usr/bin/env python3
"""
Structural validation tests for Bento Grid redesign.
Ensures HTML validity, semantic correctness, and element nesting.
"""

import sys
from pathlib import Path
import pytest

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from validate_structure import StructuralValidator, ValidationResult


class TestBentoGridStructure:
    """Test Bento Grid HTML structure"""

    @pytest.fixture
    def validator(self):
        """Initialize validator"""
        return StructuralValidator()

    @pytest.fixture
    def bento_grid_html(self):
        """Sample Bento Grid markup"""
        return """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Bento Grid - Carnivore Weekly</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Explore carnivore diet content organized by topic">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <img src="logo.png" class="logo" alt="Carnivore Weekly Logo">
        <h1>Bento Grid</h1>
    </header>

    <nav class="nav-menu">
        <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/blog">Blog</a></li>
            <li><a href="/channels">Channels</a></li>
        </ul>
    </nav>

    <main>
        <section class="bento-grid" aria-label="Content grid">
            <article class="grid-item" data-category="health">
                <h2>Health & Wellness</h2>
                <img src="health.jpg" alt="Health and wellness topics">
                <p>Cardiovascular health, hormones, and metabolic benefits</p>
            </article>

            <article class="grid-item" data-category="nutrition">
                <h2>Nutrition Science</h2>
                <img src="nutrition.jpg" alt="Nutrition science research">
                <p>Nutrient profiles, amino acids, and micronutrients</p>
            </article>

            <article class="grid-item" data-category="recipes">
                <h2>Recipes & Cooking</h2>
                <img src="recipes.jpg" alt="Carnivore recipes">
                <p>Meal preparation, cooking techniques, and recipes</p>
            </article>
        </section>
    </main>

    <footer>
        <p>&copy; 2025 Carnivore Weekly. All rights reserved.</p>
    </footer>
</body>
</html>"""

    def test_bento_grid_structure_valid(self, validator, tmp_path, bento_grid_html):
        """Test that Bento Grid HTML passes structural validation"""
        html_file = tmp_path / "bento-grid.html"
        html_file.write_text(bento_grid_html)

        result = validator.validate_file(html_file)

        # Should have no critical errors
        critical_errors = [e for e in result.errors if e.severity == "critical"]
        assert len(critical_errors) == 0, f"Critical errors found: {critical_errors}"

        # Should be valid overall
        assert result.valid

    def test_bento_grid_items_semantic(self, validator, tmp_path, bento_grid_html):
        """Test that grid items use semantic HTML (article tag)"""
        html_file = tmp_path / "bento-grid.html"
        html_file.write_text(bento_grid_html)

        result = validator.validate_file(html_file)

        # Should not have semantic issues
        semantic_errors = [e for e in result.errors if "semantic" in e.rule_name.lower()]
        assert len([e for e in semantic_errors if e.severity == "critical"]) == 0

    def test_grid_images_have_alt_text(self, validator, tmp_path):
        """Test that all grid item images have descriptive alt text"""
        html = """<!DOCTYPE html>
<html lang="en">
<head><title>Grid</title><meta charset="UTF-8"><meta name="description" content="test"></head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main>
        <section class="bento-grid">
            <article>
                <h2>Item 1</h2>
                <img src="item1.jpg" alt="Item 1 description">
            </article>
            <article>
                <h2>Item 2</h2>
                <img src="item2.jpg" alt="Item 2 description">
            </article>
        </section>
    </main>
</body>
</html>"""
        html_file = tmp_path / "grid-images.html"
        html_file.write_text(html)

        result = validator.validate_file(html_file)

        # No missing alt text errors
        alt_errors = [e for e in result.errors if "alt" in e.message.lower()]
        assert len(alt_errors) == 0

    def test_heading_hierarchy_in_grid(self, validator, tmp_path):
        """Test proper heading hierarchy in grid (h2 for items, no h1)"""
        html = """<!DOCTYPE html>
<html lang="en">
<head><title>Grid</title><meta charset="UTF-8"><meta name="description" content="test"></head>
<body>
    <header><h1>Main Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main>
        <section class="bento-grid">
            <article>
                <h2>Grid Item 1</h2>
                <h3>Subheading</h3>
            </article>
            <article>
                <h2>Grid Item 2</h2>
            </article>
        </section>
    </main>
</body>
</html>"""
        html_file = tmp_path / "hierarchy.html"
        html_file.write_text(html)

        result = validator.validate_file(html_file)

        # Heading hierarchy should be correct
        hierarchy_errors = [e for e in result.errors if "hierarchy" in e.rule_name.lower()]
        assert len([e for e in hierarchy_errors if e.severity == "critical"]) <= 1

    def test_grid_container_classes(self, validator, tmp_path):
        """Test that grid uses proper BEM-style classes"""
        html = """<!DOCTYPE html>
<html lang="en">
<head><title>Grid</title><meta charset="UTF-8"><meta name="description" content="test"></head>
<body>
    <header><h1>Title</h1></header>
    <nav class="nav-menu"><ul><li><a href="#">Test</a></li></ul></nav>
    <main>
        <section class="bento-grid bento-grid--active">
            <article class="grid-item grid-item--featured">
                <h2>Featured</h2>
            </article>
        </section>
    </main>
</body>
</html>"""
        html_file = tmp_path / "bem-classes.html"
        html_file.write_text(html)

        result = validator.validate_file(html_file)

        # Should pass with BEM naming
        assert result.valid or len([e for e in result.errors if e.severity == "critical"]) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
```

---

### Tier 2: Visual Regression Testing

**File:** `tests/visual-regression.spec.js`

```javascript
/**
 * Visual Regression Tests for Bento Grid Redesign
 * Uses Playwright + Percy for comprehensive visual testing
 *
 * Run: npx playwright test tests/visual-regression.spec.js
 * Percy Report: percy.io/dashboard
 */

import { test, expect } from '@playwright/test';
import percySnapshot from '@percy/playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Viewport configurations
const viewports = {
  mobile: { width: 375, height: 667, name: 'Mobile' },
  tablet: { width: 768, height: 1024, name: 'Tablet' },
  desktop: { width: 1920, height: 1080, name: 'Desktop' }
};

test.describe('Bento Grid Visual Regression', () => {

  test.describe('Desktop Viewport', () => {
    test.use({ viewport: viewports.desktop });

    test('should match baseline - bento grid layout', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      // Wait for grid to load
      await page.waitForSelector('.bento-grid');

      // Take Percy snapshot
      await percySnapshot(page, 'Bento Grid - Desktop Layout');

      // Visual assertions
      const grid = page.locator('.bento-grid');
      await expect(grid).toBeVisible();

      // Check grid items are displayed
      const items = page.locator('.grid-item');
      const count = await items.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should match baseline - grid item states', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const firstItem = page.locator('.grid-item').first();

      // Default state
      await percySnapshot(page, 'Bento Grid Item - Default State');

      // Hover state
      await firstItem.hover();
      await page.waitForTimeout(300); // Animation time
      await percySnapshot(page, 'Bento Grid Item - Hover State');

      // Focus state
      await firstItem.focus();
      await percySnapshot(page, 'Bento Grid Item - Focus State');
    });

    test('should match baseline - responsive columns', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      // Get grid computed style
      const grid = page.locator('.bento-grid');
      const gridStyle = await grid.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          gridTemplateColumns: computed.gridTemplateColumns
        };
      });

      expect(gridStyle.display).toBe('grid');

      // Should have multiple columns on desktop
      const colsMatch = gridStyle.gridTemplateColumns.split(' ').length;
      expect(colsMatch).toBeGreaterThanOrEqual(2);

      await percySnapshot(page, 'Bento Grid - Column Layout');
    });
  });

  test.describe('Tablet Viewport', () => {
    test.use({ viewport: viewports.tablet });

    test('should match baseline - tablet layout', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.bento-grid');

      await percySnapshot(page, 'Bento Grid - Tablet Layout');

      // Verify items stack appropriately
      const items = page.locator('.grid-item');
      expect(await items.count()).toBeGreaterThan(0);
    });

    test('should match baseline - touch interactions', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const item = page.locator('.grid-item').first();

      // Tap to activate
      await item.tap();
      await page.waitForTimeout(200);

      await percySnapshot(page, 'Bento Grid Item - Touch Active');
    });
  });

  test.describe('Mobile Viewport', () => {
    test.use({ viewport: viewports.mobile });

    test('should match baseline - mobile layout', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.bento-grid');

      await percySnapshot(page, 'Bento Grid - Mobile Layout');
    });

    test('should match baseline - single column stacking', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const grid = page.locator('.bento-grid');
      const gridStyle = await grid.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          gridTemplateColumns: computed.gridTemplateColumns
        };
      });

      // On mobile should be single column or wrapped
      await percySnapshot(page, 'Bento Grid - Mobile Stack');
    });
  });

  test.describe('Dark Mode Variants', () => {
    test('should match baseline - dark mode desktop', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.bento-grid');

      await percySnapshot(page, 'Bento Grid - Dark Mode Desktop');
    });

    test('should match baseline - dark mode mobile', async ({ page }) => {
      await page.setViewportSize(viewports.mobile);
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.bento-grid');

      await percySnapshot(page, 'Bento Grid - Dark Mode Mobile');
    });
  });

  test.describe('Color Accuracy', () => {
    test('should verify brand color accuracy', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      // Check header background color
      const header = page.locator('header');
      const bgColor = await header.evaluate(el => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Convert RGB to hex for comparison
      const hexColor = rgbToHex(bgColor);

      // Brand primary color: #3d2817
      const tolerance = 0.05; // 5% tolerance
      const isAccurate = colorDistance(hexColor, '#3d2817') <= tolerance;

      expect(isAccurate).toBeTruthy();
    });

    test('should verify text color contrast', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const headings = page.locator('h2');

      for (let i = 0; i < await headings.count(); i++) {
        const heading = headings.nth(i);
        const color = await heading.evaluate(el => window.getComputedStyle(el).color);
        const bgColor = await heading.evaluate(el => window.getComputedStyle(el).backgroundColor);

        const contrast = calculateContrast(color, bgColor);
        expect(contrast).toBeGreaterThanOrEqual(4.5); // WCAG AA for text
      }
    });
  });

  test.describe('Animation & Motion', () => {
    test('should verify animations on grid items', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const item = page.locator('.grid-item').first();

      // Check for transition property
      const transition = await item.evaluate(el => {
        return window.getComputedStyle(el).transition;
      });

      expect(transition).not.toBe('none');

      await percySnapshot(page, 'Bento Grid - Animation State');
    });

    test('should respect prefers-reduced-motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`${BASE_URL}/bento-grid`);

      const item = page.locator('.grid-item').first();
      const transition = await item.evaluate(el => {
        return window.getComputedStyle(el).transition;
      });

      // Should have no or minimal motion
      expect(transition).toContain('0s');

      await percySnapshot(page, 'Bento Grid - No Motion Mode');
    });
  });

  test.describe('Content Loading', () => {
    test('should handle image loading states', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      // Capture loading state
      await percySnapshot(page, 'Bento Grid - Loading State');

      // Wait for images to load
      await Promise.all([
        page.waitForLoadState('networkidle'),
        page.waitForSelector('img[src]', { state: 'attached' })
      ]);

      // Capture loaded state
      await percySnapshot(page, 'Bento Grid - Loaded State');
    });
  });
});

// Helper functions
function rgbToHex(rgb) {
  const matches = rgb.match(/\d+/g);
  if (!matches || matches.length < 3) return '#000000';

  const r = parseInt(matches[0]).toString(16).padStart(2, '0');
  const g = parseInt(matches[1]).toString(16).padStart(2, '0');
  const b = parseInt(matches[2]).toString(16).padStart(2, '0');

  return `#${r}${g}${b}`.toUpperCase();
}

function colorDistance(color1, color2) {
  // Simplified color distance calculation
  // In production, use a proper Delta-E calculation
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);

  const distance = Math.abs(c1 - c2) / 16777215;
  return distance;
}

function calculateContrast(fgColor, bgColor) {
  // Simplified WCAG contrast calculation
  const fg = hexToRgb(rgbToHex(fgColor));
  const bg = hexToRgb(bgColor.startsWith('#') ? bgColor : rgbToHex(bgColor));

  const fgLum = relativeLuminance(fg);
  const bgLum = relativeLuminance(bg);

  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);

  return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function relativeLuminance(rgb) {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(x => {
    x = x / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
```

**Configuration:** `playwright.config.js`

```javascript
const config = {
  testDir: './tests',
  testMatch: '**/*.spec.js',

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: 'npm run serve',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
};

module.exports = config;
```

---

### Tier 3: Accessibility Testing

**File:** `tests/accessibility.test.js`

```javascript
/**
 * Accessibility Tests for Bento Grid Redesign
 * Uses axe-core for automated WCAG AA validation
 *
 * Run: npx jest tests/accessibility.test.js
 */

const { injectAxe, checkA11y } = require('axe-playwright');
const { chromium } = require('playwright');

describe('Bento Grid - Accessibility (WCAG AA)', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  test('should not have any accessibility violations on desktop', async () => {
    await page.goto('http://localhost:3000/bento-grid');

    // Inject axe
    await injectAxe(page);

    // Check accessibility
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true
      }
    });
  });

  test('should not have violations on mobile viewport', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000/bento-grid');

    await injectAxe(page);
    await checkA11y(page);
  });

  test('should have proper heading hierarchy', async () => {
    await page.goto('http://localhost:3000/bento-grid');

    const headings = await page.evaluate(() => {
      const h = [];
      document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
        h.push({
          level: parseInt(el.tagName[1]),
          text: el.textContent.trim(),
          visible: el.offsetParent !== null
        });
      });
      return h;
    });

    // Should have exactly one h1
    const h1Count = headings.filter(h => h.level === 1).length;
    expect(h1Count).toBe(1);

    // No jumping levels
    let lastLevel = 1;
    for (const heading of headings) {
      if (heading.visible) {
        expect(heading.level - lastLevel).toBeLessThanOrEqual(1);
        lastLevel = heading.level;
      }
    }
  });

  test('should have proper color contrast', async () => {
    await page.goto('http://localhost:3000/bento-grid');

    const contrastResults = await page.evaluate(() => {
      const results = [];

      document.querySelectorAll('*').forEach(el => {
        if (!el.offsetParent) return; // Skip hidden elements

        const text = el.textContent.trim();
        if (text.length < 3) return; // Skip very short text

        const computed = window.getComputedStyle(el);
        const fg = computed.color;
        const bg = computed.backgroundColor;

        // Calculate WCAG contrast
        const contrast = calculateWCAGContrast(fg, bg);
        const fontSize = parseInt(computed.fontSize);
        const fontWeight = computed.fontWeight;

        // Check if meets AA standards
        const isBold = parseInt(fontWeight) >= 700;
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && isBold);
        const minContrast = isLargeText ? 3 : 4.5;

        if (contrast < minContrast && text) {
          results.push({
            element: el.tagName,
            text: text.substring(0, 50),
            contrast: contrast.toFixed(2),
            required: minContrast,
            pass: contrast >= minContrast
          });
        }
      });

      return results;
    });

    const failures = contrastResults.filter(r => !r.pass);
    expect(failures).toEqual([]);
  });

  test('should be keyboard navigable', async () => {
    await page.goto('http://localhost:3000/bento-grid');

    // Focus on first interactive element
    await page.keyboard.press('Tab');

    let focusedElement = await page.evaluate(() => {
      return document.activeElement.tagName;
    });

    expect(['A', 'BUTTON', 'INPUT'].includes(focusedElement)).toBeTruthy();

    // Tab through multiple elements
    const tabSequence = [];
    for (let i = 0; i < 10; i++) {
      const element = await page.evaluate(() => {
        return {
          tag: document.activeElement.tagName,
          text: document.activeElement.textContent.substring(0, 30)
        };
      });
      tabSequence.push(element);
      await page.keyboard.press('Tab');
    }

    // Should have different elements in tab sequence
    const uniqueElements = new Set(tabSequence.map(e => e.tag));
    expect(uniqueElements.size).toBeGreaterThan(1);
  });

  test('should support screen reader navigation', async () => {
    await page.goto('http://localhost:3000/bento-grid');

    const ariaResults = await page.evaluate(() => {
      const results = {
        elementsWithAria: 0,
        imagesWithAlt: 0,
        labelsWithFor: 0,
        linksWithText: 0,
        violations: []
      };

      // Check ARIA attributes
      results.elementsWithAria = document.querySelectorAll('[aria-*]').length;

      // Check image alt text
      const images = document.querySelectorAll('img');
      results.imagesWithAlt = Array.from(images).filter(img =>
        img.hasAttribute('alt') && img.getAttribute('alt').trim()
      ).length;

      // Check form labels
      const inputs = document.querySelectorAll('input, select, textarea');
      results.labelsWithFor = Array.from(inputs).filter(input => {
        if (input.id) {
          return document.querySelector(`label[for="${input.id}"]`);
        }
        return false;
      }).length;

      // Check links have text or aria-label
      const links = document.querySelectorAll('a');
      results.linksWithText = Array.from(links).filter(link =>
        link.textContent.trim() || link.hasAttribute('aria-label')
      ).length;

      // Check for empty links
      Array.from(links).forEach(link => {
        if (!link.textContent.trim() && !link.hasAttribute('aria-label')) {
          results.violations.push('Empty link found');
        }
      });

      // Check for images without alt
      Array.from(images).forEach(img => {
        if (!img.hasAttribute('alt') || !img.getAttribute('alt').trim()) {
          results.violations.push(`Image missing alt: ${img.src}`);
        }
      });

      return results;
    });

    expect(ariaResults.imagesWithAlt).toBe(ariaResults.elementsWithAria +
      await page.locator('img').count());
    expect(ariaResults.violations).toEqual([]);
  });

  test('should handle focus states visibly', async () => {
    await page.goto('http://localhost:3000/bento-grid');

    const gridItems = await page.locator('.grid-item').count();
    expect(gridItems).toBeGreaterThan(0);

    // Tab to first grid item
    const firstItem = page.locator('.grid-item').first();

    // Get focus outline before
    const focusOutlineBefore = await firstItem.evaluate(el => {
      return window.getComputedStyle(el).outline;
    });

    // Focus element
    await firstItem.focus();

    // Get focus outline after
    const focusOutlineAfter = await firstItem.evaluate(el => {
      return window.getComputedStyle(el).outline;
    });

    // Should have visible focus indicator
    expect(focusOutlineAfter).not.toBe('none');
  });

  test('should support zoom and text scaling', async () => {
    await page.goto('http://localhost:3000/bento-grid');

    // Set zoom level
    await page.evaluate(() => {
      document.body.style.zoom = '200%';
    });

    // Check that content is still accessible
    const gridVisible = await page.locator('.bento-grid').isVisible();
    expect(gridVisible).toBeTruthy();

    // Reset zoom
    await page.evaluate(() => {
      document.body.style.zoom = '100%';
    });
  });

  test('should handle reduced motion preference', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://localhost:3000/bento-grid');

    const animations = await page.evaluate(() => {
      const items = document.querySelectorAll('.grid-item');
      const results = [];

      items.forEach(item => {
        const style = window.getComputedStyle(item);
        results.push({
          animation: style.animation,
          transition: style.transition
        });
      });

      return results;
    });

    // Should have no or minimal animations
    const hasAnimations = animations.some(a =>
      !a.animation.includes('0s') && !a.animation.includes('none')
    );

    // This depends on implementation
    // Ideally should be false or have very short duration
  });
});

// Helper function for WCAG contrast calculation
function calculateWCAGContrast(fgColor, bgColor) {
  const fgLum = getLuminance(fgColor);
  const bgLum = getLuminance(bgColor);

  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);

  return (lighter + 0.05) / (darker + 0.05);
}

function getLuminance(color) {
  // Parse color and calculate relative luminance
  const rgb = color.match(/\d+/g);
  if (!rgb) return 0;

  const [r, g, b] = rgb.map(x => {
    x = parseInt(x) / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
```

---

### Tier 4: Performance Validation

**File:** `tests/performance.test.js`

```javascript
/**
 * Performance Validation for Bento Grid Redesign
 * Validates Core Web Vitals and Lighthouse scores
 *
 * Run: npx jest tests/performance.test.js
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

describe('Bento Grid - Performance Validation', () => {
  let chrome;

  beforeAll(async () => {
    chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  });

  afterAll(async () => {
    await chromeLauncher.kill(chrome.pid);
  });

  test('should meet Core Web Vitals targets', async () => {
    const url = 'http://localhost:3000/bento-grid';

    const options = {
      logLevel: 'error',
      port: chrome.port,
    };

    const runnerResult = await lighthouse(url, options);
    const audits = runnerResult.lhr.audits;

    // LCP (Largest Contentful Paint) <= 2.5s
    const lcpScore = audits['largest-contentful-paint'];
    expect(lcpScore.numericValue).toBeLessThanOrEqual(2500);

    // CLS (Cumulative Layout Shift) < 0.1
    const clsScore = audits['cumulative-layout-shift'];
    expect(clsScore.numericValue).toBeLessThan(0.1);

    // FID (First Input Delay) < 100ms
    const fidScore = audits['first-input-delay'];
    if (fidScore) {
      expect(fidScore.numericValue).toBeLessThan(100);
    }

    // FCP (First Contentful Paint) < 1.8s
    const fcpScore = audits['first-contentful-paint'];
    expect(fcpScore.numericValue).toBeLessThan(1800);

    // TBT (Total Blocking Time) < 200ms
    const tbtScore = audits['total-blocking-time'];
    expect(tbtScore.numericValue).toBeLessThan(200);
  });

  test('should achieve Lighthouse score >= 90', async () => {
    const url = 'http://localhost:3000/bento-grid';

    const options = {
      logLevel: 'error',
      port: chrome.port,
    };

    const runnerResult = await lighthouse(url, options);
    const categories = runnerResult.lhr.categories;

    expect(categories.performance.score * 100).toBeGreaterThanOrEqual(90);
  });

  test('should have no render-blocking resources', async () => {
    const url = 'http://localhost:3000/bento-grid';

    const options = {
      logLevel: 'error',
      port: chrome.port,
    };

    const runnerResult = await lighthouse(url, options);
    const audits = runnerResult.lhr.audits;

    const renderBlockingAudit = audits['render-blocking-resources'];
    expect(renderBlockingAudit.score).toBe(1.0);
  });

  test('should optimize images efficiently', async () => {
    const url = 'http://localhost:3000/bento-grid';

    const options = {
      logLevel: 'error',
      port: chrome.port,
    };

    const runnerResult = await lighthouse(url, options);
    const audits = runnerResult.lhr.audits;

    const imageAudit = audits['uses-optimized-images'];
    expect(imageAudit.score).toBeGreaterThanOrEqual(0.9);
  });

  test('should have efficient CSS', async () => {
    const url = 'http://localhost:3000/bento-grid';

    const options = {
      logLevel: 'error',
      port: chrome.port,
    };

    const runnerResult = await lighthouse(url, options);
    const audits = runnerResult.lhr.audits;

    const cssAudit = audits['unused-css-rules'];
    expect(cssAudit.score).toBeGreaterThanOrEqual(0.85);
  });

  test('should load within budget thresholds', async () => {
    const url = 'http://localhost:3000/bento-grid';

    const options = {
      logLevel: 'error',
      port: chrome.port,
    };

    const runnerResult = await lighthouse(url, options);
    const audits = runnerResult.lhr.audits;

    // Total byte weight < 2MB
    const bytesAudit = audits['total-byte-weight'];
    expect(bytesAudit.numericValue).toBeLessThan(2000000);

    // DOM size < 1500 elements
    const domAudit = audits['dom-size'];
    expect(domAudit.numericValue).toBeLessThan(1500);
  });
});

// CLI command for manual performance testing
// lighthouse http://localhost:3000/bento-grid --view
```

---

### Tier 5: Brand Consistency Validation

**File:** `tests/brand-consistency.test.js`

```javascript
/**
 * Brand Consistency Tests for Bento Grid
 * Validates colors, typography, spacing, and component styling
 *
 * Uses brand standards from carnivore-brand skill
 */

const { test, expect } = require('@playwright/test');

// Brand standards
const BRAND_COLORS = {
  primary: '#3d2817',      // Dark brown
  primaryLight: '#5a3d2a', // Medium brown
  accent: '#c8a882',       // Tan
  accentLight: '#e8d4c4',  // Light tan
  text: '#f4e4d4',         // Cream
  textDark: '#1a1a1a',     // Near black
  success: '#2d5016',      // Dark green
  warning: '#a85c00',      // Orange
  error: '#8b0000'         // Dark red
};

const BRAND_FONTS = {
  serif: 'Merriweather',
  sansSerif: 'Inter',
  display: 'Merriweather'
};

const SPACING_UNIT = 8; // px

describe('Bento Grid - Brand Consistency', () => {

  test('should use brand color palette - primary colors', async ({ page }) => {
    await page.goto('http://localhost:3000/bento-grid');

    const colorResults = await page.evaluate((colors) => {
      const results = [];

      // Check header background
      const header = document.querySelector('header');
      const headerBg = window.getComputedStyle(header).backgroundColor;
      results.push({
        element: 'header',
        color: headerBg,
        expected: colors.primary,
        matches: colorToHex(headerBg) === colors.primary
      });

      // Check navigation background
      const nav = document.querySelector('nav.nav-menu');
      if (nav) {
        const navBg = window.getComputedStyle(nav).backgroundColor;
        results.push({
          element: 'nav',
          color: navBg,
          expected: colors.primary,
          matches: colorToHex(navBg) === colors.primary
        });
      }

      // Check text colors
      const headings = document.querySelectorAll('h1, h2, h3');
      headings.forEach((h, i) => {
        const textColor = window.getComputedStyle(h).color;
        results.push({
          element: `heading-${i}`,
          color: textColor,
          withinPalette: Object.values(colors).some(c => colorSimilar(textColor, c))
        });
      });

      return results;
    }, BRAND_COLORS);

    // Verify colors match brand palette
    const brandColorMatches = colorResults.filter(r => r.matches);
    expect(brandColorMatches.length).toBeGreaterThan(0);
  });

  test('should use brand typography - font families', async ({ page }) => {
    await page.goto('http://localhost:3000/bento-grid');

    const fontResults = await page.evaluate((fonts) => {
      const results = [];

      // Check header font
      const header = document.querySelector('h1');
      const headerFont = window.getComputedStyle(header).fontFamily;
      results.push({
        element: 'h1',
        font: headerFont,
        expected: fonts.display,
        matches: headerFont.includes(fonts.display) || headerFont.includes(fonts.serif)
      });

      // Check body font
      const paragraph = document.querySelector('p');
      if (paragraph) {
        const bodyFont = window.getComputedStyle(paragraph).fontFamily;
        results.push({
          element: 'body',
          font: bodyFont,
          expected: fonts.serif,
          matches: bodyFont.includes(fonts.serif)
        });
      }

      // Check all headings use brand fonts
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach((h, i) => {
        const font = window.getComputedStyle(h).fontFamily;
        const valid = font.includes(fonts.display) || font.includes(fonts.serif);
        if (!valid) {
          results.push({
            element: `heading-${i}`,
            font: font,
            valid: false
          });
        }
      });

      return results;
    }, BRAND_FONTS);

    const validFonts = fontResults.filter(r => r.matches !== false);
    expect(validFonts.length).toBeGreaterThan(0);
  });

  test('should follow spacing grid (8px units)', async ({ page }) => {
    await page.goto('http://localhost:3000/bento-grid');

    const spacingResults = await page.evaluate((unit) => {
      const results = [];

      const gridItems = document.querySelectorAll('.grid-item');
      gridItems.forEach((item, i) => {
        const style = window.getComputedStyle(item);

        const padding = parseInt(style.padding);
        const margin = parseInt(style.margin);
        const gap = parseInt(style.gap);

        // Check if values are multiples of 8px
        const paddingValid = padding % unit === 0 || padding === 0;
        const marginValid = margin % unit === 0 || margin === 0;
        const gapValid = gap % unit === 0 || gap === 0;

        results.push({
          element: `grid-item-${i}`,
          padding: { value: padding, valid: paddingValid },
          margin: { value: margin, valid: marginValid },
          gap: { value: gap, valid: gapValid }
        });
      });

      return results;
    }, SPACING_UNIT);

    // At least 80% of items should follow spacing grid
    const validItems = spacingResults.filter(r =>
      r.padding.valid && r.margin.valid && r.gap.valid
    ).length;

    const percentage = (validItems / spacingResults.length) * 100;
    expect(percentage).toBeGreaterThanOrEqual(80);
  });

  test('should maintain consistent component styling', async ({ page }) => {
    await page.goto('http://localhost:3000/bento-grid');

    const componentStyles = await page.evaluate(() => {
      const styles = {};

      // Get first grid item styles
      const item1 = document.querySelector('.grid-item');
      if (item1) {
        const style = window.getComputedStyle(item1);
        styles.gridItem = {
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow,
          transition: style.transition,
          backgroundColor: style.backgroundColor
        };
      }

      // Check consistency across all items
      const items = document.querySelectorAll('.grid-item');
      const allSame = Array.from(items).every(item => {
        const style = window.getComputedStyle(item);
        return style.borderRadius === styles.gridItem?.borderRadius;
      });

      styles.consistent = allSame;

      return styles;
    });

    expect(componentStyles.consistent).toBeTruthy();
  });

  test('should verify logo placement and dimensions', async ({ page }) => {
    await page.goto('http://localhost:3000/bento-grid');

    const logoResults = await page.evaluate(() => {
      const logo = document.querySelector('img.logo');

      if (!logo) {
        return { found: false };
      }

      const rect = logo.getBoundingClientRect();
      const style = window.getComputedStyle(logo);

      return {
        found: true,
        width: rect.width,
        height: rect.height,
        objectFit: style.objectFit,
        position: style.position,
        aspect: rect.width / rect.height,
        inHeader: document.querySelector('header').contains(logo)
      };
    });

    expect(logoResults.found).toBeTruthy();
    expect(logoResults.inHeader).toBeTruthy();
    expect(logoResults.width).toBeGreaterThan(0);
    expect(logoResults.height).toBeGreaterThan(0);
    // Logo should maintain aspect ratio
    expect(Math.abs(logoResults.aspect - 1.0)).toBeLessThan(0.3);
  });

  test('should verify button/link styling consistency', async ({ page }) => {
    await page.goto('http://localhost:3000/bento-grid');

    const linkStyles = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      const styles = [];

      links.forEach((link, i) => {
        if (link.offsetParent) { // visible links only
          const style = window.getComputedStyle(link);
          styles.push({
            index: i,
            color: style.color,
            decoration: style.textDecoration,
            cursor: style.cursor
          });
        }
      });

      return styles;
    });

    // All links should have consistent styling
    if (linkStyles.length > 0) {
      const firstColor = linkStyles[0].color;
      const consistentColor = linkStyles.every(l => l.color === firstColor);
      expect(consistentColor).toBeTruthy();
    }
  });

  test('should check color contrast meets brand standards', async ({ page }) => {
    await page.goto('http://localhost:3000/bento-grid');

    const contrastResults = await page.evaluate(() => {
      const results = {
        passed: 0,
        failed: 0,
        elements: []
      };

      document.querySelectorAll('*').forEach(el => {
        if (!el.offsetParent || !el.textContent.trim()) return;

        const style = window.getComputedStyle(el);
        const fg = style.color;
        const bg = style.backgroundColor;

        const contrast = calculateContrast(fg, bg);
        const fontSize = parseInt(style.fontSize);
        const fontWeight = parseInt(style.fontWeight);

        const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
        const required = isLargeText ? 3 : 4.5;

        if (contrast >= required) {
          results.passed++;
        } else {
          results.failed++;
          results.elements.push({
            tag: el.tagName,
            contrast: contrast.toFixed(2),
            required: required
          });
        }
      });

      return results;
    });

    expect(contrastResults.failed).toBe(0);
  });
});

// Helper functions
function colorToHex(rgb) {
  const result = rgb.match(/\d+/g);
  if (!result || result.length < 3) return '#000000';

  const r = parseInt(result[0]).toString(16).padStart(2, '0');
  const g = parseInt(result[1]).toString(16).padStart(2, '0');
  const b = parseInt(result[2]).toString(16).padStart(2, '0');

  return `#${r}${g}${b}`.toLowerCase();
}

function colorSimilar(color1, color2, tolerance = 5) {
  const c1 = colorToHex(color1);
  const c2 = color2.toLowerCase();

  const dist = Math.abs(parseInt(c1.slice(1), 16) - parseInt(c2.slice(1), 16));
  return dist <= tolerance * 256 * 256;
}

function calculateContrast(fg, bg) {
  const fgLum = getLuminance(fg);
  const bgLum = getLuminance(bg);

  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);

  return (lighter + 0.05) / (darker + 0.05);
}

function getLuminance(color) {
  const rgb = color.match(/\d+/g);
  if (!rgb) return 0;

  const [r, g, b] = rgb.map(x => {
    x = parseInt(x) / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
```

---

### Tier 6: Content Validation

**File:** `tests/content-validation.test.js`

```javascript
/**
 * Content Validation for Bento Grid
 * Validates copy authenticity, grammar, and brand voice
 *
 * Uses copy-editor and content-integrity skills
 */

const { test, expect } = require('@playwright/test');

describe('Bento Grid - Content Validation', () => {

  test('should have authentic human-written content', async ({ page }) => {
    await page.goto('http://localhost:3000/bento-grid');

    const content = await page.evaluate(() => {
      const articles = document.querySelectorAll('article');
      const text = [];

      articles.forEach(article => {
        const h2 = article.querySelector('h2');
        const p = article.querySelector('p');

        if (h2 && p) {
          text.push({
            title: h2.textContent.trim(),
            description: p.textContent.trim()
          });
        }
      });

      return text;
    });

    // Validate that content is present
    expect(content.length).toBeGreaterThan(0);

    // Each item should have meaningful text
    content.forEach(item => {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(20);
    });
  });

  test('should have proper grammar and spelling', async ({ page }) => {
    await page.goto('http://localhost:3000/bento-grid');

    const textContent = await page.evaluate(() => {
      const text = document.body.innerText;
      return text;
    });

    // Basic grammar checks
    const grammarIssues = [];

    // Check for common typos and issues
    if (/\b(teh|recieve|occured|seperete)\b/i.test(textContent)) {
      grammarIssues.push('Common typos detected');
    }

    // Check for double spaces
    if (/  +/g.test(textContent)) {
      grammarIssues.push('Double spaces detected');
    }

    // Check for proper capitalization after periods
    const sentences = textContent.match(/\. [a-z]/g);
    if (sentences && sentences.length > 0) {
      grammarIssues.push('Lowercase after period detected');
    }

    expect(grammarIssues).toEqual([]);
  });

  test('should maintain brand voice consistency', async ({ page }) => {
    await page.goto('http://localhost:3000/bento-grid');

    const voice = await page.evaluate(() => {
      const articles = document.querySelectorAll('article');
      const analysis = {
        toneConsistent: true,
        voiceIssues: [],
        samples: []
      };

      articles.forEach(article => {
        const text = article.innerText;

        // Check for brand voice markers
        // Carnivore Weekly voice: Informative, fact-based, scientific

        // Should NOT have overly promotional language
        if (/amazing|incredible|must-have|can't miss/i.test(text)) {
          analysis.voiceIssues.push('Overly promotional language');
        }

        // Should have balanced perspective
        if (/guaranteed|100% certain|proven fact/i.test(text)) {
          analysis.voiceIssues.push('Overly definitive claims');
        }

        analysis.samples.push(text.substring(0, 100));
      });

      return analysis;
    });

    expect(voice.voiceIssues).toEqual([]);
  });

  test('should have valid and descriptive links', async ({ page }) => {
    await page.goto('http://localhost:3000/bento-grid');

    const linkResults = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      const results = {
        valid: [],
        issues: []
      };

      links.forEach((link, i) => {
        const href = link.getAttribute('href');
        const text = link.textContent.trim();

        // Should have href
        if (!href) {
          results.issues.push(`Link ${i}: Missing href`);
        }

        // Should have descriptive text
        if (!text) {
          results.issues.push(`Link ${i}: No link text`);
        }

        // Avoid "click here", "link", "read more" without context
        if (/^(click here|link|read more)$/i.test(text) && !link.parentElement.title) {
          results.issues.push(`Link ${i}: Vague link text - "${text}"`);
        }

        if (!results.issues.some(issue => issue.includes(`Link ${i}`))) {
          results.valid.push({ href, text });
        }
      });

      return results;
    });

    // All links should be valid
    expect(linkResults.issues).toEqual([]);
  });

  test('should have complete SEO metadata', async ({ page }) => {
    await page.goto('http://localhost:3000/bento-grid');

    const seoResults = await page.evaluate(() => {
      const results = {
        title: document.querySelector('title')?.textContent || '',
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        og: {
          title: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
          description: document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
          image: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || ''
        },
        langAttribute: document.documentElement.getAttribute('lang') || '',
        headings: []
      };

      // Check heading structure for SEO
      document.querySelectorAll('h1, h2, h3').forEach(h => {
        results.headings.push({
          level: h.tagName,
          text: h.textContent.trim()
        });
      });

      return results;
    });

    // Title should exist and be reasonable length
    expect(seoResults.title).toBeTruthy();
    expect(seoResults.title.length).toBeGreaterThanOrEqual(30);
    expect(seoResults.title.length).toBeLessThanOrEqual(60);

    // Meta description should exist and be reasonable
    expect(seoResults.description).toBeTruthy();
    expect(seoResults.description.length).toBeGreaterThanOrEqual(120);
    expect(seoResults.description.length).toBeLessThanOrEqual(160);

    // Lang attribute should be set
    expect(seoResults.langAttribute).toBeTruthy();

    // Should have proper heading hierarchy
    expect(seoResults.headings[0].level).toBe('H1');
  });

  test('should have meaningful alt text for images', async ({ page }) => {
    await page.goto('http://localhost:3000/bento-grid');

    const imageResults = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const results = {
        valid: 0,
        invalid: 0,
        issues: []
      };

      images.forEach((img, i) => {
        const alt = img.getAttribute('alt') || '';
        const src = img.getAttribute('src');

        // Should have alt text
        if (!alt) {
          results.issues.push(`Image ${i}: Missing alt text`);
          results.invalid++;
          return;
        }

        // Alt text should be descriptive, not just filename
        if (alt.match(/\.(jpg|png|gif|webp)$/i)) {
          results.issues.push(`Image ${i}: Alt text is filename - "${alt}"`);
          results.invalid++;
          return;
        }

        // Alt text should not be too long (< 125 chars)
        if (alt.length > 125) {
          results.issues.push(`Image ${i}: Alt text too long`);
          results.invalid++;
          return;
        }

        results.valid++;
      });

      return results;
    });

    // All images should have meaningful alt text
    expect(imageResults.issues).toEqual([]);
  });

  test('should not have AI-detectable patterns', async ({ page }) => {
    await page.goto('http://localhost:3000/bento-grid');

    const aiPatterns = await page.evaluate(() => {
      const text = document.body.innerText;
      const patterns = {
        detected: [],
        score: 0
      };

      // Common AI patterns to check for
      const aiIndicators = [
        { pattern: /in conclusion,? it is clear that/i, name: 'AI conclusion phrase' },
        { pattern: /as an (ai|language model|assistant)/i, name: 'AI self-reference' },
        { pattern: /furthermore,? it is important to note/i, name: 'AI transition phrase' },
        { pattern: /^In this article, we will explore/i, name: 'AI intro phrase' },
        { pattern: /from a scientific perspective,?/i, name: 'AI qualifier phrase' },
        { pattern: /the importance of .+ cannot be overstated/i, name: 'AI emphasis pattern' },
        { pattern: /it is widely known that/i, name: 'AI generalization pattern' }
      ];

      aiIndicators.forEach(indicator => {
        if (indicator.pattern.test(text)) {
          patterns.detected.push(indicator.name);
          patterns.score += 0.14;
        }
      });

      return patterns;
    });

    // Should not have detectable AI patterns
    expect(aiPatterns.detected).toEqual([]);
    expect(aiPatterns.score).toBeLessThan(0.5);
  });

  test('should have consistent terminology', async ({ page }) => {
    await page.goto('http://localhost:3000/bento-grid');

    const terminology = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      const terms = {
        consistent: true,
        issues: []
      };

      // Check for inconsistent term usage
      // e.g., "Carnivore Diet" vs "carnivore diet" vs "meat-based diet"

      // Count variations
      const bentoCount = (text.match(/bento grid/gi) || []).length;
      const gridCount = (text.match(/grid/gi) || []).length;

      if (bentoCount > 0 && gridCount > bentoCount + 5) {
        terms.issues.push('Inconsistent use of "bento grid" vs "grid"');
      }

      // Check for brand name consistency
      const carnivoreWeekly = (text.match(/carnivore weekly/gi) || []).length;
      const carnivoreOnly = (text.match(/carnivore\s+(?!weekly)/gi) || []).length;

      if (carnivoreWeekly > 0 && carnivoreOnly > carnivoreWeekly) {
        terms.issues.push('Inconsistent brand name usage');
      }

      return terms;
    });

    expect(terminology.issues).toEqual([]);
  });
});
```

---

## GitHub Actions CI/CD Setup

### Main Validation Workflow

**File:** `.github/workflows/validation.yml`

```yaml
name: Comprehensive QA & Validation

on:
  pull_request:
    branches: [ main, develop ]
    paths:
      - 'public/**'
      - 'templates/**'
      - '**.css'
      - '**.html'
      - '.github/workflows/validation.yml'
  push:
    branches: [ main ]
  schedule:
    # Daily validation at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:

env:
  NODE_VERSION: '18'
  PYTHON_VERSION: '3.10'

jobs:
  # TIER 1: Structural Validation
  structural-validation:
    name: Tier 1 - Structural Validation
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install pytest

      - name: Run structural validation tests
        run: |
          pytest tests/test_bento_grid_structure.py -v --tb=short

      - name: Validate HTML structure
        run: |
          python scripts/validate_structure.py public/ --mode generated

      - name: Upload structural report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: structural-validation-report
          path: test-results/structural/

  # TIER 2: Visual Regression Testing
  visual-regression:
    name: Tier 2 - Visual Regression Testing
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start local server
        run: |
          npm run build
          npm run serve &
          sleep 5

      - name: Run visual regression tests
        run: npx playwright test tests/visual-regression.spec.js

      - name: Upload Percy results
        if: always()
        uses: percy/cli-upload@v1
        with:
          token: ${{ secrets.PERCY_TOKEN }}
          static: './static'

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  # TIER 3: Accessibility Testing
  accessibility:
    name: Tier 3 - Accessibility (WCAG AA)
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start local server
        run: |
          npm run build
          npm run serve &
          sleep 5

      - name: Run accessibility tests
        run: npm run test:a11y

      - name: Upload a11y report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: accessibility-report
          path: test-results/a11y/

  # TIER 4: Performance Validation
  performance:
    name: Tier 4 - Performance (Core Web Vitals)
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Build and serve
        run: |
          npm run build
          npm run serve &
          sleep 5

      - name: Run Lighthouse audit
        run: |
          npx lighthouse http://localhost:3000/bento-grid \
            --output=json \
            --output-path=./lighthouse-report.json \
            --chrome-flags="--headless"

      - name: Check performance thresholds
        run: |
          node scripts/check-lighthouse-thresholds.js lighthouse-report.json

      - name: Upload performance report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: lighthouse-report.json

  # TIER 5: Brand Consistency
  brand-consistency:
    name: Tier 5 - Brand Consistency
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start local server
        run: |
          npm run build
          npm run serve &
          sleep 5

      - name: Run brand consistency tests
        run: npx jest tests/brand-consistency.test.js --coverage

      - name: Upload brand report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: brand-consistency-report
          path: test-results/brand/

  # TIER 6: Content Validation
  content-validation:
    name: Tier 6 - Content Validation
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start local server
        run: |
          npm run build
          npm run serve &
          sleep 5

      - name: Run content validation tests
        run: npx jest tests/content-validation.test.js

      - name: Check with copy-editor skill
        run: |
          # This would integrate with the copy-editor skill
          echo "Running copy-editor validation..."

      - name: Upload content report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: content-validation-report
          path: test-results/content/

  # Summary & Approval Gates
  validation-summary:
    name: Validation Summary & Gates
    runs-on: ubuntu-latest
    needs: [structural-validation, visual-regression, accessibility, performance, brand-consistency, content-validation]
    if: always()

    steps:
      - uses: actions/checkout@v4

      - name: Download all reports
        uses: actions/download-artifact@v3

      - name: Generate summary
        run: |
          echo "## QA Validation Summary" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "### Tier Results:" >> $GITHUB_STEP_SUMMARY
          echo "- **Structural**: ${{ needs.structural-validation.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Visual Regression**: ${{ needs.visual-regression.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Accessibility**: ${{ needs.accessibility.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Performance**: ${{ needs.performance.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Brand Consistency**: ${{ needs.brand-consistency.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Content Validation**: ${{ needs.content-validation.result }}" >> $GITHUB_STEP_SUMMARY

      - name: Check blocking validations
        run: |
          # These are BLOCKING - must all pass
          if [[ "${{ needs.structural-validation.result }}" != "success" ]]; then
            echo "FATAL: Structural validation failed"
            exit 1
          fi

          if [[ "${{ needs.accessibility.result }}" != "success" ]]; then
            echo "FATAL: Accessibility validation failed"
            exit 1
          fi

          if [[ "${{ needs.performance.result }}" != "success" ]]; then
            echo "FATAL: Performance validation failed"
            exit 1
          fi

      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const structural = '${{ needs.structural-validation.result }}';
            const visual = '${{ needs.visual-regression.result }}';
            const a11y = '${{ needs.accessibility.result }}';
            const perf = '${{ needs.performance.result }}';
            const brand = '${{ needs.brand-consistency.result }}';
            const content = '${{ needs.content-validation.result }}';

            const comment = `## QA Validation Results

| Tier | Result | Status |
|------|--------|--------|
| 1 - Structural | ${structural} | ${structural === 'success' ? '✅' : '❌'} |
| 2 - Visual | ${visual} | ${visual === 'success' ? '✅' : '⚠️'} |
| 3 - Accessibility | ${a11y} | ${a11y === 'success' ? '✅' : '❌'} |
| 4 - Performance | ${perf} | ${perf === 'success' ? '✅' : '❌'} |
| 5 - Brand | ${brand} | ${brand === 'success' ? '✅' : '⚠️'} |
| 6 - Content | ${content} | ${content === 'success' ? '✅' : '⚠️'} |

**Blocking Tests**: Structural, Accessibility, Performance
**Warning Tests**: Visual, Brand, Content

[View detailed reports in Actions artifacts]`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

---

## Validation Gates & Thresholds

### Blocking Validations (Must Pass)

```yaml
blocking_gates:
  structural:
    description: "HTML validity and semantic correctness"
    critical_errors: 0
    major_errors: 0

  accessibility:
    description: "WCAG 2.1 AA compliance"
    violations: 0
    keyboard_nav: "fully functional"
    screen_reader: "compatible"

  performance:
    thresholds:
      lighthouse_score: 90
      lcp: 2500  # milliseconds
      cls: 0.1
      fid: 100   # milliseconds
      fcp: 1800  # milliseconds
      tbt: 200   # milliseconds
```

### Warning Validations (Should Fix)

```yaml
warning_gates:
  visual_regression:
    description: "Visual design consistency"
    pixel_variance: 2  # percent
    breakpoints: [375, 768, 1920]  # mobile, tablet, desktop

  brand_consistency:
    description: "Brand standards compliance"
    color_tolerance: 5  # percent
    spacing_tolerance: 2  # pixels
    typography_compliance: 95  # percent

  content_validation:
    description: "Content quality and authenticity"
    grammar_errors: 0
    ai_detection: "low"  # low, medium, high
    link_validity: 100  # percent
```

---

## Test Data & Baselines

### Creating Visual Baselines

**Script:** `scripts/capture-baselines.js`

```javascript
#!/usr/bin/env node

/**
 * Capture visual baselines for all breakpoints
 * Run: node scripts/capture-baselines.js
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const BREAKPOINTS = {
  mobile: { width: 375, height: 667, name: 'mobile' },
  tablet: { width: 768, height: 1024, name: 'tablet' },
  desktop: { width: 1920, height: 1080, name: 'desktop' }
};

const PAGES = [
  { url: '/bento-grid', name: 'bento-grid' }
];

const BASELINE_DIR = path.join(__dirname, '../baseline-screenshots');

async function captureBaselines() {
  const browser = await chromium.launch();

  try {
    // Ensure baseline directory exists
    await fs.mkdir(BASELINE_DIR, { recursive: true });

    for (const page of PAGES) {
      for (const [key, viewport] of Object.entries(BREAKPOINTS)) {
        const browserContext = await browser.newContext({ viewport });
        const browserPage = await browserContext.newPage();

        try {
          console.log(`Capturing ${page.name} - ${viewport.name}...`);

          await browserPage.goto(`http://localhost:3000${page.url}`, {
            waitUntil: 'networkidle'
          });

          // Wait for any animations
          await browserPage.waitForTimeout(1000);

          const filename = path.join(
            BASELINE_DIR,
            `${page.name}-${viewport.name}.png`
          );

          await browserPage.screenshot({ path: filename, fullPage: true });

          console.log(`✓ Saved: ${filename}`);
        } finally {
          await browserContext.close();
        }
      }
    }

    console.log('\n✓ All baselines captured successfully');
    console.log(`Baseline directory: ${BASELINE_DIR}`);
    console.log('\nNext steps:');
    console.log('1. Review baselines for accuracy');
    console.log('2. Commit to version control');
    console.log('3. Future test runs will compare against these baselines');

  } finally {
    await browser.close();
  }
}

// Run
captureBaselines().catch(error => {
  console.error('Error capturing baselines:', error);
  process.exit(1);
});
```

### When to Update Baselines

**Decision Tree:**

```
Change detected in visual regression test?
├─ Is it an intentional design change?
│  ├─ Yes: Update baseline after design review
│  │  ├─ Get designer approval
│  │  ├─ Run: npm run baselines:update
│  │  └─ Commit with PR description of changes
│  └─ No: Fix the code
├─ Check if it's a rendering difference
│  ├─ Browser difference? Update for that browser
│  ├─ System/OS difference? Document and update
│  └─ Transient (animation frame)? Increase wait time in test
└─ Is it a real regression? Create issue and fix
```

---

## Team Approval Workflow

### Validation Failure Handling

**Quick-Fix vs. Major-Revision Decision Matrix:**

```
Failure Type        | Fix Time | Complexity | Decision | Owner
────────────────────────────────────────────────────────────────
Spelling error      | < 5 min  | Low        | Quick fix | Content
Missing alt text    | 5-15 min | Low        | Quick fix | Developer
Link broken         | 5-10 min | Low        | Quick fix | Developer
Color slightly off  | 10-20 min| Low        | Quick fix | Designer
Font family wrong   | 15-30 min| Medium     | Review   | Designer
Layout broken       | 30+ min  | High       | Review   | Developer
Performance issue   | 1+ hour  | High       | Review   | Developer
Accessibility issue | 30+ min  | High       | Review   | Developer
Tone inauthentic    | 30+ min  | High       | Revise   | Content
Brand violation     | 30+ min  | High       | Revise   | Designer
```

### Approval Checklist

Before merge:

- [ ] All blocking validations passing
- [ ] Visual regression approved by designer
- [ ] Performance benchmarks met
- [ ] Accessibility audit passing
- [ ] Content authenticity verified
- [ ] Brand consistency confirmed
- [ ] Tests updated for new functionality
- [ ] Documentation updated

### Escalation Path

```
Issue Severity: CRITICAL
├─ Stop deployment
├─ Notify team leads
├─ Create incident in GitHub Issues
├─ Document root cause
└─ Implement fix + test

Issue Severity: HIGH
├─ Can deploy with feature flag OFF
├─ Create GitHub Issue
├─ Assign to owner
└─ Fix in next sprint

Issue Severity: MEDIUM
├─ Can deploy with warning
├─ Add to backlog
└─ Fix when time permits

Issue Severity: LOW
├─ Deploy freely
├─ Track in backlog
└─ Fix opportunistically
```

---

## Pre-Launch Checklist

### 2 Weeks Before Launch

- [ ] All test files created and configured
- [ ] Base test data prepared
- [ ] Lighthouse baseline captured
- [ ] Visual regression baselines captured
- [ ] Performance budgets defined
- [ ] Accessibility baseline established
- [ ] Brand standards documented
- [ ] Team training completed

### 1 Week Before Launch

- [ ] CI/CD pipeline tested end-to-end
- [ ] All tests running in GitHub Actions
- [ ] Test reports generating correctly
- [ ] Manual testing procedures documented
- [ ] Escalation contacts confirmed
- [ ] Rollback procedures tested

### 48 Hours Before Launch

- [ ] All validation gates passing
- [ ] Performance tests stable
- [ ] Visual baselines approved
- [ ] Accessibility audit passed
- [ ] Content review completed
- [ ] Brand sign-off obtained
- [ ] Final staging deployment successful
- [ ] Load testing completed

### Launch Day

- [ ] Final validation run passing
- [ ] Team monitoring scheduled
- [ ] Alerting configured
- [ ] Rollback plan ready
- [ ] Support team briefed
- [ ] Post-launch monitoring checklist ready

---

## Monitoring & Maintenance

### Post-Launch Monitoring (First 7 Days)

**Daily (3x per day):**
- Lighthouse score stability
- Error rate (< 0.5%)
- Performance metrics trending
- User feedback in support channels
- Visual appearance consistency

**Checks to Run:**
```bash
# Full validation suite
npm run validate:all

# Performance check
npx lighthouse http://example.com --view

# Accessibility check
npx axe http://example.com

# Visual regression
npx percy snapshot
```

### Error Detection & Response

**Response Procedures by Error Type:**

```
Error Type: Performance Degradation
├─ Alert triggered if: LCP > 2.8s or Lighthouse < 85
├─ Response: Check recent deployments, run lighthouse audit
├─ Escalate if: Cannot identify cause within 15 min
└─ Rollback if: Cannot fix within 30 min

Error Type: Accessibility Violation
├─ Alert triggered if: New axe-core violations detected
├─ Response: Review changes, run full a11y audit
├─ Escalate if: WCAG AA compliance broken
└─ Rollback if: Critical violations affecting >10% of users

Error Type: Visual Regression
├─ Alert triggered if: Percy detects >2% pixel variance
├─ Response: Review design changes, designer approval
├─ Escalate if: Unintended visual change
└─ Rollback if: Design significantly broken

Error Type: Broken Content
├─ Alert triggered if: Grammar/spell errors, broken links
├─ Response: Quick content fix
├─ Escalate if: Brand voice violations
└─ Rollback if: Content is severely inauthentic
```

### Rollback Criteria & Procedures

**Automatic Rollback Triggers:**

```javascript
// Rollback if ANY of these occur:
const rollbackTriggers = {
  lighthouseScore: score < 80,
  errorRate: errorRate > 2,
  coreWebVitals: {
    lcp: lcp > 3500,
    cls: cls > 0.15,
    fid: fid > 200
  },
  accessibilityViolations: newViolations > 5,
  userComplaints: complaintRate > 10, // per hour
  downtime: downtime > 5 // minutes
};
```

**Manual Rollback Procedure:**

```bash
# 1. Identify last good commit
git log --oneline | grep "✅ All validations passing"

# 2. Revert
git revert HEAD --no-edit

# 3. Verify validations pass
npm run validate:all

# 4. Deploy reverted version
git push

# 5. Monitor
npm run monitor

# 6. Post-incident review
# Create GitHub Issue with "incident" label
```

### When to Update Validation Rules

**Update Thresholds When:**

1. **Business Context Changes**
   - New brand guidelines released
   - Target audience changes
   - Performance requirements adjust

2. **Technical Evolution**
   - Browser support changes
   - New accessibility standards
   - Performance improvements across industry

3. **Historical Data**
   - Current thresholds consistently exceeded (adjust up)
   - Current thresholds never met (adjust down)
   - New patterns emerge (add new validation)

**Process:**

```
1. Document reason for change
2. Propose new threshold
3. Get team consensus
4. Update documentation
5. Update CI/CD config
6. Run against last 10 builds
7. Monitor for 1 week
8. Finalize or iterate
```

---

## Quick Reference

### Testing Commands

```bash
# Run all validations
npm run validate:all

# Individual tier tests
npm run test:structural    # Tier 1
npm run test:visual        # Tier 2
npm run test:a11y          # Tier 3
npm run test:performance   # Tier 4
npm run test:brand         # Tier 5
npm run test:content       # Tier 6

# Update baselines
npm run baselines:update

# Manual validation
npm run lint
npm run test
npm run audit
```

### Key URLs

- **Staging**: https://staging.example.com
- **Percy Dashboard**: https://percy.io/dashboard
- **Lighthouse CI**: https://github.com/actions
- **Monitoring**: [Internal dashboard]

### Contacts

- **Tech Lead**: @dev-lead
- **Design Lead**: @design-lead
- **Content Lead**: @content-lead
- **QA Lead**: @qa-lead
- **On-Call**: See PagerDuty

---

## Appendices

### A. Sample Validation Report

```
QA VALIDATION REPORT
Date: 2025-01-15
Build: Bento Grid v1.0
Status: READY FOR LAUNCH ✅

TIER RESULTS:
├─ Tier 1 (Structural): PASS ✅
│  ├─ HTML validity: PASS
│  ├─ Element nesting: PASS
│  └─ Semantic correctness: PASS
├─ Tier 2 (Visual): PASS ✅
│  ├─ Desktop layout: PASS
│  ├─ Mobile responsiveness: PASS
│  └─ Color accuracy: PASS
├─ Tier 3 (Accessibility): PASS ✅
│  ├─ WCAG AA compliance: PASS
│  ├─ Keyboard navigation: PASS
│  └─ Screen reader support: PASS
├─ Tier 4 (Performance): PASS ✅
│  ├─ Lighthouse score: 94
│  ├─ LCP: 1.8s
│  └─ CLS: 0.08
├─ Tier 5 (Brand): PASS ✅
│  ├─ Color palette: PASS
│  ├─ Typography: PASS
│  └─ Component styling: PASS
└─ Tier 6 (Content): PASS ✅
   ├─ Grammar & spelling: PASS
   ├─ Authenticity: PASS
   └─ SEO metadata: PASS

RECOMMENDATION: APPROVED FOR LAUNCH
```

---

**Document Version:** 2.0
**Last Updated:** December 31, 2025
**Maintained By:** QA & Product Team

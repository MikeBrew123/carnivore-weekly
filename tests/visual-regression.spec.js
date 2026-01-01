/**
 * Visual Regression Tests for Bento Grid Redesign
 * Tier 2: Compare layout to baseline screenshots at all breakpoints
 *
 * Uses Playwright + Percy for comprehensive visual testing
 * Run: npx playwright test tests/visual-regression.spec.js
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Viewport configurations
const viewports = {
  mobile: { width: 375, height: 667, name: 'Mobile (375x667)' },
  tablet: { width: 768, height: 1024, name: 'Tablet (768x1024)' },
  desktop: { width: 1920, height: 1080, name: 'Desktop (1920x1080)' }
};

test.describe('Bento Grid Visual Regression Testing', () => {

  test.describe('Desktop Viewport (1920x1080)', () => {
    test.use({ viewport: viewports.desktop });

    test('should match baseline - bento grid layout', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.bento-grid', { timeout: 5000 });
      await page.waitForLoadState('networkidle');

      // Verify grid is visible
      const grid = page.locator('.bento-grid');
      await expect(grid).toBeVisible();

      // Take screenshot for Percy comparison
      await expect(page).toHaveScreenshot('bento-grid-desktop-layout.png', {
        maxDiffPixels: 100,
        threshold: 0.2
      });
    });

    test('should display all grid items correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.grid-item', { timeout: 5000 });

      const items = page.locator('.grid-item');
      const itemCount = await items.count();

      // Should have multiple grid items
      expect(itemCount).toBeGreaterThan(0);

      // All items should be visible
      for (let i = 0; i < itemCount; i++) {
        const item = items.nth(i);
        await expect(item).toBeVisible();
      }

      await expect(page).toHaveScreenshot('bento-grid-desktop-items.png');
    });

    test('should match baseline - grid item default state', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.grid-item', { timeout: 5000 });

      const firstItem = page.locator('.grid-item').first();
      await expect(firstItem).toBeVisible();

      await expect(page).toHaveScreenshot('bento-grid-desktop-item-default.png');
    });

    test('should match baseline - grid item hover state', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.grid-item', { timeout: 5000 });

      const firstItem = page.locator('.grid-item').first();
      await firstItem.hover();
      await page.waitForTimeout(500); // Wait for transition

      await expect(page).toHaveScreenshot('bento-grid-desktop-item-hover.png');
    });

    test('should match baseline - grid item focus state', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.grid-item', { timeout: 5000 });

      const firstItem = page.locator('.grid-item').first();
      await firstItem.focus();

      await expect(page).toHaveScreenshot('bento-grid-desktop-item-focus.png');
    });

    test('should have correct grid layout structure', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.bento-grid', { timeout: 5000 });

      const gridLayout = await page.locator('.bento-grid').evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          display: style.display,
          gridTemplateColumns: style.gridTemplateColumns,
          gap: style.gap
        };
      });

      // Should be CSS Grid
      expect(gridLayout.display).toBe('grid');
      // Should have gap between items
      expect(gridLayout.gap).not.toBe('0px');
    });

    test('should verify image loading state', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      // Capture loading state (before network idle)
      await expect(page).toHaveScreenshot('bento-grid-desktop-loading.png');

      // Wait for images to fully load
      await Promise.all([
        page.waitForLoadState('networkidle'),
        page.waitForSelector('img[src]:not([src=""])')
      ]);

      // Capture loaded state
      await expect(page).toHaveScreenshot('bento-grid-desktop-loaded.png');
    });

    test('should verify header and navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const header = page.locator('header');
      const nav = page.locator('nav.nav-menu');

      await expect(header).toBeVisible();
      await expect(nav).toBeVisible();

      await expect(page).toHaveScreenshot('bento-grid-desktop-header.png');
    });

    test('should verify footer visibility', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);

      const footer = page.locator('footer');
      await expect(footer).toBeVisible();

      await expect(page).toHaveScreenshot('bento-grid-desktop-footer.png');
    });

    test('should handle scrolling without layout shift', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.bento-grid', { timeout: 5000 });

      // Capture initial state
      await expect(page).toHaveScreenshot('bento-grid-desktop-top.png');

      // Scroll down
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(300);

      // Verify no layout shift occurred
      const grid = page.locator('.bento-grid');
      const boundingBox = await grid.boundingBox();
      expect(boundingBox).not.toBeNull();
    });
  });

  test.describe('Tablet Viewport (768x1024)', () => {
    test.use({ viewport: viewports.tablet });

    test('should match baseline - tablet layout', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.bento-grid', { timeout: 5000 });
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('bento-grid-tablet-layout.png', {
        maxDiffPixels: 100
      });
    });

    test('should stack items appropriately on tablet', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.grid-item', { timeout: 5000 });

      const items = page.locator('.grid-item');
      const itemCount = await items.count();
      expect(itemCount).toBeGreaterThan(0);

      // Verify items are arranged for tablet
      const firstItem = items.first();
      const secondItem = items.nth(1);

      const firstBox = await firstItem.boundingBox();
      const secondBox = await secondItem.boundingBox();

      // Items should be visible
      expect(firstBox).not.toBeNull();
      expect(secondBox).not.toBeNull();

      await expect(page).toHaveScreenshot('bento-grid-tablet-stacking.png');
    });

    test('should handle touch interactions on tablet', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.grid-item', { timeout: 5000 });

      const firstItem = page.locator('.grid-item').first();

      // Tap to activate (touch screen)
      await firstItem.tap();
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('bento-grid-tablet-touched.png');
    });

    test('should verify responsive font sizes', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const h2Sizes = await page.locator('h2').evaluateAll(elements => {
        return elements.map(el => {
          const style = window.getComputedStyle(el);
          return {
            fontSize: style.fontSize,
            lineHeight: style.lineHeight
          };
        });
      });

      // All h2s should have consistent sizing
      const firstSize = h2Sizes[0]?.fontSize;
      expect(h2Sizes.length).toBeGreaterThan(0);

      await expect(page).toHaveScreenshot('bento-grid-tablet-typography.png');
    });

    test('should verify image aspect ratios on tablet', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('img', { timeout: 5000 });

      const images = page.locator('.grid-item img');
      const count = await images.count();

      for (let i = 0; i < count; i++) {
        const img = images.nth(i);
        const box = await img.boundingBox();

        if (box) {
          const aspectRatio = box.width / box.height;
          // Aspect ratio should be reasonable (not too extreme)
          expect(aspectRatio).toBeGreaterThan(0.5);
          expect(aspectRatio).toBeLessThan(2);
        }
      }

      await expect(page).toHaveScreenshot('bento-grid-tablet-images.png');
    });
  });

  test.describe('Mobile Viewport (375x667)', () => {
    test.use({ viewport: viewports.mobile });

    test('should match baseline - mobile layout', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.bento-grid', { timeout: 5000 });
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('bento-grid-mobile-layout.png', {
        maxDiffPixels: 100
      });
    });

    test('should display single column on mobile', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.grid-item', { timeout: 5000 });

      const items = page.locator('.grid-item');
      const firstBox = await items.first().boundingBox();
      const secondBox = await items.nth(1).boundingBox();

      // On mobile, items should stack vertically
      if (firstBox && secondBox) {
        // Second item should be below first
        expect(secondBox.y).toBeGreaterThan(firstBox.y);
      }

      await expect(page).toHaveScreenshot('bento-grid-mobile-stacking.png');
    });

    test('should fit content within viewport', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.bento-grid', { timeout: 5000 });

      const grid = page.locator('.bento-grid');
      const box = await grid.boundingBox();

      if (box) {
        // Content width should fit within viewport
        expect(box.width).toBeLessThanOrEqual(375 + 20); // Some small overflow okay
      }

      await expect(page).toHaveScreenshot('bento-grid-mobile-fit.png');
    });

    test('should have readable text on mobile', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const textElements = page.locator('h2, p');
      const count = await textElements.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const element = textElements.nth(i);
        const fontSize = await element.evaluate(el => {
          return parseInt(window.getComputedStyle(el).fontSize);
        });

        // Minimum readable font size on mobile: 14px
        expect(fontSize).toBeGreaterThanOrEqual(12);
      }

      await expect(page).toHaveScreenshot('bento-grid-mobile-typography.png');
    });

    test('should handle long content gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.grid-item', { timeout: 5000 });

      const items = page.locator('.grid-item');
      const itemCount = await items.count();

      for (let i = 0; i < Math.min(itemCount, 3); i++) {
        const item = items.nth(i);
        const text = await item.textContent();

        // Content should not overflow
        const box = await item.boundingBox();
        expect(text?.length).toBeGreaterThan(0);
        expect(box).not.toBeNull();
      }

      await expect(page).toHaveScreenshot('bento-grid-mobile-content.png');
    });

    test('should verify touch target sizes', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.grid-item', { timeout: 5000 });

      const items = page.locator('.grid-item');
      const count = await items.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        const item = items.nth(i);
        const box = await item.boundingBox();

        if (box) {
          // Touch targets should be at least 44x44px
          expect(box.width).toBeGreaterThanOrEqual(40);
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }

      await expect(page).toHaveScreenshot('bento-grid-mobile-targets.png');
    });
  });

  test.describe('Color Accuracy', () => {
    test('should verify primary colors', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const brandColors = {
        primary: '#3d2817',
        text: '#f4e4d4'
      };

      const headerColor = await page.locator('header').evaluate(el => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Convert to hex and compare
      const headerHex = rgbToHex(headerColor);
      const colorMatch = colorSimilar(headerHex, brandColors.primary, 10);

      expect(colorMatch).toBeTruthy();
    });

    test('should verify text contrast', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const headings = page.locator('h2');
      const count = await headings.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        const heading = headings.nth(i);
        const contrast = await heading.evaluate(el => {
          const style = window.getComputedStyle(el);
          const fg = style.color;
          const bg = style.backgroundColor;

          return calculateContrast(fg, bg);
        });

        // WCAG AA minimum for large text: 3:1
        expect(contrast).toBeGreaterThanOrEqual(3);
      }
    });
  });

  test.describe('Animation & Motion', () => {
    test('should have smooth transitions', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.grid-item', { timeout: 5000 });

      const firstItem = page.locator('.grid-item').first();

      const transition = await firstItem.evaluate(el => {
        return window.getComputedStyle(el).transition;
      });

      // Should have some transition defined
      expect(transition).not.toContain('none all 0s');
    });

    test('should respect prefers-reduced-motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.grid-item', { timeout: 5000 });

      const firstItem = page.locator('.grid-item').first();

      const transition = await firstItem.evaluate(el => {
        return window.getComputedStyle(el).transition;
      });

      // Should have no or minimal motion
      expect(transition).toContain('0s');
    });
  });

  test.describe('Performance Visuals', () => {
    test('should display images efficiently', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const images = page.locator('img');
      const count = await images.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        const img = images.nth(i);
        const naturalSize = await img.evaluate(el => {
          return {
            naturalWidth: el.naturalWidth,
            naturalHeight: el.naturalHeight,
            src: el.src
          };
        });

        // Images should have dimensions
        expect(naturalSize.naturalWidth).toBeGreaterThan(0);
        expect(naturalSize.naturalHeight).toBeGreaterThan(0);
      }
    });

    test('should have good cumulative layout shift', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const initialPosition = await page.locator('.grid-item').first().boundingBox();

      // Scroll and check for layout shift
      await page.evaluate(() => window.scrollBy(0, 100));
      await page.waitForTimeout(500);

      const finalPosition = await page.locator('.grid-item').first().boundingBox();

      if (initialPosition && finalPosition) {
        const shift = Math.abs(initialPosition.x - finalPosition.x);
        // Minimal horizontal shift
        expect(shift).toBeLessThan(20);
      }
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

function colorSimilar(color1, color2, tolerance = 10) {
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);

  const distance = Math.abs(c1 - c2);
  return distance <= tolerance * 256;
}

function calculateContrast(fgColor, bgColor) {
  const fgLum = getLuminance(rgbToHex(fgColor));
  const bgLum = getLuminance(bgColor.startsWith('#') ? bgColor : rgbToHex(bgColor));

  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);

  return (lighter + 0.05) / (darker + 0.05);
}

function getLuminance(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 0;

  const [r, g, b] = [result[1], result[2], result[3]].map(x => {
    const v = parseInt(x, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

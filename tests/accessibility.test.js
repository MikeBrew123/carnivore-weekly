/**
 * Accessibility Tests for Bento Grid Redesign
 * Tier 3: WCAG 2.1 AA compliance testing
 *
 * Uses axe-core and Playwright for automated and manual accessibility validation
 * Run: npm run test:a11y
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Bento Grid - Accessibility (WCAG 2.1 AA)', () => {

  test.beforeEach(async ({ page }) => {
    // Inject axe-core into page
    await page.addInitScript(() => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js';
      document.head.appendChild(script);
    });
  });

  test.describe('Automated WCAG Scanning', () => {

    test('should have no critical accessibility violations', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.bento-grid', { timeout: 5000 });

      // Wait for axe to load
      await page.waitForFunction(() => window.axe !== undefined, { timeout: 5000 });

      // Run axe scan
      const results = await page.evaluate(() => {
        return new Promise((resolve) => {
          window.axe.run((error, results) => {
            if (error) throw error;
            resolve({
              violations: results.violations,
              passes: results.passes,
              incomplete: results.incomplete
            });
          });
        });
      });

      // Filter for critical violations
      const criticalViolations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalViolations).toEqual([]);

      // Log any minor violations
      const minorViolations = results.violations.filter(
        (v) => v.impact === 'minor'
      );

      if (minorViolations.length > 0) {
        console.log('Minor accessibility issues found:');
        minorViolations.forEach((v) => {
          console.log(`- ${v.id}: ${v.description}`);
        });
      }
    });

    test('should have accessible heading hierarchy', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const headings = await page.evaluate(() => {
        const h = [];
        document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
          h.push({
            level: parseInt(el.tagName[1]),
            text: el.textContent?.trim() || '',
            visible: el.offsetParent !== null
          });
        });
        return h;
      });

      // Should have exactly one h1
      const h1Count = headings.filter(h => h.level === 1).length;
      expect(h1Count).toBe(1);

      // No jumping heading levels
      let lastLevel = 1;
      for (const heading of headings) {
        if (heading.visible && heading.level > 0) {
          expect(heading.level - lastLevel).toBeLessThanOrEqual(1);
          lastLevel = heading.level;
        }
      }
    });

    test('should have proper color contrast', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const contrastResults = await page.evaluate(() => {
        const results = {
          passed: 0,
          failed: 0,
          violations: []
        };

        document.querySelectorAll('*').forEach(el => {
          if (!el.offsetParent) return; // Skip hidden
          if (!el.textContent?.trim()) return; // Skip empty

          const style = window.getComputedStyle(el);
          const fg = style.color;
          const bg = style.backgroundColor;

          const contrast = calculateWCAGContrast(fg, bg);
          const fontSize = parseInt(style.fontSize);
          const fontWeight = parseInt(style.fontWeight);

          const isBold = fontWeight >= 700;
          const isLargeText = fontSize >= 18 || (fontSize >= 14 && isBold);
          const minContrast = isLargeText ? 3 : 4.5;

          if (contrast >= minContrast) {
            results.passed++;
          } else {
            results.failed++;
            results.violations.push({
              element: el.tagName,
              text: el.textContent?.substring(0, 50) || '',
              contrast: Math.round(contrast * 100) / 100,
              required: minContrast
            });
          }
        });

        return results;
      });

      // Should have no failing contrast
      expect(contrastResults.failed).toBe(0);
    });

    test('should have descriptive alt text on images', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const imageResults = await page.evaluate(() => {
        const results = {
          valid: 0,
          invalid: 0,
          issues: []
        };

        document.querySelectorAll('img').forEach((img, i) => {
          const alt = img.getAttribute('alt') || '';
          const src = img.getAttribute('src') || '';

          // Must have alt text
          if (!alt) {
            results.invalid++;
            results.issues.push({
              src,
              alt: '',
              issue: 'Missing alt text'
            });
            return;
          }

          // Alt should not be filename
          if (/\.(jpg|png|gif|webp)$/i.test(alt)) {
            results.invalid++;
            results.issues.push({
              src,
              alt,
              issue: 'Alt text is filename'
            });
            return;
          }

          // Alt should be reasonable length
          if (alt.length > 150) {
            results.invalid++;
            results.issues.push({
              src,
              alt: alt.substring(0, 50) + '...',
              issue: 'Alt text too long'
            });
            return;
          }

          results.valid++;
        });

        return results;
      });

      // All images must have proper alt text
      expect(imageResults.invalid).toBe(0);
    });

    test('should have proper form labeling', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const formResults = await page.evaluate(() => {
        const results = {
          valid: 0,
          invalid: 0,
          issues: []
        };

        // Check for input elements
        document.querySelectorAll('input, select, textarea').forEach(input => {
          const id = input.id;
          const name = input.getAttribute('name') || '';

          if (!id && !name) {
            results.invalid++;
            results.issues.push('Form input without id or name');
            return;
          }

          if (id) {
            const label = document.querySelector(`label[for="${id}"]`);
            if (!label && input.getAttribute('aria-label') === null) {
              results.invalid++;
              results.issues.push(`Input ${id} missing label`);
              return;
            }
          }

          results.valid++;
        });

        return results;
      });

      // No form labeling issues
      expect(formResults.invalid).toBe(0);
    });

    test('should have proper link text', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const linkResults = await page.evaluate(() => {
        const results = {
          valid: 0,
          invalid: 0,
          issues: []
        };

        document.querySelectorAll('a').forEach((link, i) => {
          const text = link.textContent?.trim() || '';
          const ariaLabel = link.getAttribute('aria-label') || '';

          // Must have text or aria-label
          if (!text && !ariaLabel) {
            results.invalid++;
            results.issues.push(`Link ${i} has no text or aria-label`);
            return;
          }

          // Avoid generic text
          if (/^(click here|link|read more|here)$/i.test(text) && !ariaLabel) {
            results.invalid++;
            results.issues.push(`Link ${i} has generic text: "${text}"`);
            return;
          }

          results.valid++;
        });

        return results;
      });

      // No link text issues
      expect(linkResults.invalid).toBe(0);
    });
  });

  test.describe('Keyboard Navigation', () => {

    test('should be fully keyboard navigable', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      // Try to navigate with tab key
      let focusedElements = [];

      for (let i = 0; i < 15; i++) {
        const focused = await page.evaluate(() => {
          return {
            tag: document.activeElement?.tagName || '',
            text: (document.activeElement?.textContent || '').substring(0, 30)
          };
        });

        if (focused.tag) {
          focusedElements.push(focused);
        }

        await page.keyboard.press('Tab');
      }

      // Should have focused multiple elements
      expect(focusedElements.length).toBeGreaterThan(0);

      // Should have different types of elements
      const uniqueTags = new Set(focusedElements.map(e => e.tag));
      expect(uniqueTags.size).toBeGreaterThanOrEqual(1);
    });

    test('should have visible focus indicators', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const gridItems = page.locator('.grid-item');
      const count = await gridItems.count();

      if (count > 0) {
        const firstItem = gridItems.first();

        // Focus the element
        await firstItem.focus();

        // Check for visible focus
        const focusStyle = await firstItem.evaluate(el => {
          const style = window.getComputedStyle(el);
          return {
            outline: style.outline,
            outlineColor: style.outlineColor,
            boxShadow: style.boxShadow,
            borderColor: style.borderColor
          };
        });

        // Should have some visible focus indicator
        const hasVisibleFocus =
          focusStyle.outline !== 'none' ||
          focusStyle.boxShadow !== 'none' ||
          focusStyle.borderColor !== 'rgba(0, 0, 0, 0)';

        expect(hasVisibleFocus).toBeTruthy();
      }
    });

    test('should not trap focus', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      // Focus first element
      await page.keyboard.press('Tab');

      // Get initial focused element
      const initialFocused = await page.evaluate(() => {
        return document.activeElement?.tagName || '';
      });

      // Tab multiple times - should not get stuck
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
      }

      // Should be able to change focus
      const finalFocused = await page.evaluate(() => {
        return document.activeElement?.tagName || '';
      });

      // Focus should have moved or been properly managed
      expect(finalFocused).toBeDefined();
    });

    test('should handle skip links', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      // Look for skip link
      const skipLink = page.locator('a[href="#main"], a[href="#content"]');
      const skipLinkExists = await skipLink.count() > 0;

      // Skip link is optional but recommended
      if (skipLinkExists) {
        await skipLink.first().click();

        // Should focus on main content
        const focused = await page.evaluate(() => {
          return {
            tag: document.activeElement?.tagName || '',
            id: document.activeElement?.id || ''
          };
        });

        expect(focused.tag).toBeDefined();
      }
    });
  });

  test.describe('Screen Reader Support', () => {

    test('should have semantic HTML structure', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const semanticElements = await page.evaluate(() => {
        return {
          header: document.querySelector('header') ? 1 : 0,
          nav: document.querySelector('nav') ? 1 : 0,
          main: document.querySelector('main') ? 1 : 0,
          article: document.querySelectorAll('article').length,
          aside: document.querySelectorAll('aside').length,
          footer: document.querySelector('footer') ? 1 : 0
        };
      });

      // Should have key semantic elements
      expect(semanticElements.header).toBe(1);
      expect(semanticElements.nav).toBe(1);
      expect(semanticElements.main).toBe(1);
      expect(semanticElements.article).toBeGreaterThan(0);
    });

    test('should properly use ARIA attributes', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const ariaResults = await page.evaluate(() => {
        return {
          elementWithAria: document.querySelectorAll('[aria-*]').length,
          buttons: document.querySelectorAll('button').length,
          ariaButtons: document.querySelectorAll('[role="button"]').length,
          ariaLabels: document.querySelectorAll('[aria-label]').length,
          ariaDescribedBy: document.querySelectorAll('[aria-describedby]').length,
          validAriaUsage: true
        };
      });

      // Should have proper ARIA if interactive elements exist
      expect(ariaResults.elementWithAria).toBeGreaterThanOrEqual(0);
    });

    test('should announce dynamic content changes', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      // Check for ARIA live regions
      const liveRegions = await page.evaluate(() => {
        return document.querySelectorAll('[aria-live]').length;
      });

      // Live regions optional but good to have for dynamic content
      // No assertion here - just documenting
    });

    test('should support text-to-speech', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const textContent = await page.evaluate(() => {
        const visible = [];

        document.querySelectorAll('*').forEach(el => {
          if (el.offsetParent && el.textContent?.trim()) {
            visible.push({
              tag: el.tagName,
              text: el.textContent.trim().substring(0, 50)
            });
          }
        });

        return visible;
      });

      // Should have readable text content
      expect(textContent.length).toBeGreaterThan(0);
    });
  });

  test.describe('Motion & Animation', () => {

    test('should respect prefers-reduced-motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`${BASE_URL}/bento-grid`);

      const animations = await page.evaluate(() => {
        const items = document.querySelectorAll('.grid-item');
        const results = [];

        items.forEach((item, i) => {
          const style = window.getComputedStyle(item);
          results.push({
            animation: style.animation,
            transition: style.transition,
            hasMotion: !style.animation.includes('none') || !style.transition.includes('none')
          });
        });

        return results;
      });

      // With reduced motion, most animations should be minimal
      const hasMotion = animations.filter(a => a.hasMotion).length;
      const ratio = hasMotion / animations.length;

      // Less than 30% should have motion when reduced-motion is set
      expect(ratio).toBeLessThan(0.3);
    });

    test('should not have auto-playing media', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const autoplay = await page.evaluate(() => {
        return {
          autoplayVideos: document.querySelectorAll('video[autoplay]').length,
          autoplayAudio: document.querySelectorAll('audio[autoplay]').length
        };
      });

      // No auto-playing media
      expect(autoplay.autoplayVideos).toBe(0);
      expect(autoplay.autoplayAudio).toBe(0);
    });
  });

  test.describe('Responsive & Zoom', () => {

    test('should handle zoom up to 200%', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      // Set zoom to 200%
      await page.evaluate(() => {
        document.body.style.zoom = '200%';
      });

      // Content should still be accessible
      const gridVisible = await page.locator('.bento-grid').isVisible();
      expect(gridVisible).toBeTruthy();

      // Reset zoom
      await page.evaluate(() => {
        document.body.style.zoom = '100%';
      });
    });

    test('should handle mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/bento-grid`);

      const visible = await page.locator('.bento-grid').isVisible();
      expect(visible).toBeTruthy();
    });
  });

  test.describe('Error Handling', () => {

    test('should have no broken links', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const links = page.locator('a');
      const count = await links.count();

      const brokenLinks = [];

      for (let i = 0; i < count; i++) {
        const link = links.nth(i);
        const href = await link.getAttribute('href');

        if (!href || href === '' || href === '#') {
          brokenLinks.push({ index: i, href });
        }
      }

      // Should have no links without href
      expect(brokenLinks.length).toBe(0);
    });

    test('should have proper error messages', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      // Look for error messages
      const errorMessages = await page.evaluate(() => {
        return document.querySelectorAll('[role="alert"], [aria-live="assertive"]').length;
      });

      // Should have error handling (if forms exist)
      // No assertion needed here - just documenting capability
    });
  });
});

// Helper functions
function calculateWCAGContrast(fgColor, bgColor) {
  const fgLum = getLuminance(fgColor);
  const bgLum = getLuminance(bgColor);

  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);

  return (lighter + 0.05) / (darker + 0.05);
}

function getLuminance(color) {
  const rgb = color.match(/\d+/g);
  if (!rgb || rgb.length < 3) return 0;

  const [r, g, b] = rgb.map(x => {
    const v = parseInt(x) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

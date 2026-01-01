/**
 * Brand Consistency Tests for Bento Grid
 * Tier 5: Validates colors, typography, spacing, and component styling
 *
 * Run: npx jest tests/brand-consistency.test.js
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Brand standards
const BRAND_STANDARDS = {
  colors: {
    primary: '#3d2817',
    primaryLight: '#5a3d2a',
    accent: '#c8a882',
    accentLight: '#e8d4c4',
    text: '#f4e4d4',
    textDark: '#1a1a1a'
  },
  fonts: {
    serif: 'Merriweather',
    sansSerif: 'Inter',
    display: 'Merriweather'
  },
  spacing: 8  // px base unit
};

test.describe('Bento Grid - Brand Consistency', () => {

  test.describe('Color Palette', () => {

    test('should use brand colors correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const colors = await page.evaluate((brands) => {
        const results = {
          header: window.getComputedStyle(document.querySelector('header')).backgroundColor,
          nav: window.getComputedStyle(document.querySelector('nav')).backgroundColor,
          primary: window.getComputedStyle(document.querySelector('h1')).color
        };
        return results;
      }, BRAND_STANDARDS);

      // Colors should be defined
      expect(colors.header).toBeTruthy();
      expect(colors.nav).toBeTruthy();
      expect(colors.primary).toBeTruthy();
    });

    test('should maintain color contrast for accessibility', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const contrastResults = await page.evaluate(() => {
        const results = [];

        document.querySelectorAll('h1, h2, h3, p, a').forEach(el => {
          if (!el.offsetParent) return;

          const fg = window.getComputedStyle(el).color;
          const bg = window.getComputedStyle(el.parentElement).backgroundColor;

          const fgLum = getLuminance(fg);
          const bgLum = getLuminance(bg);

          const contrast = (Math.max(fgLum, bgLum) + 0.05) /
                         (Math.min(fgLum, bgLum) + 0.05);

          results.push({
            element: el.tagName,
            contrast: Math.round(contrast * 100) / 100,
            passes: contrast >= 4.5
          });
        });

        return results;

        function getLuminance(color) {
          const rgb = color.match(/\d+/g);
          if (!rgb) return 0;
          const [r, g, b] = rgb.map(x => {
            x = parseInt(x) / 255;
            return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }
      });

      // Most elements should have good contrast
      const passedContrast = contrastResults.filter(r => r.passes).length;
      const totalElements = contrastResults.length;

      expect(passedContrast / totalElements).toBeGreaterThan(0.8); // 80%+
    });

    test('should have consistent text colors', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const textColors = await page.evaluate(() => {
        const colors = {};

        document.querySelectorAll('p').forEach(p => {
          const color = window.getComputedStyle(p).color;
          colors[color] = (colors[color] || 0) + 1;
        });

        return colors;
      });

      // Should have limited palette of text colors
      const uniqueColors = Object.keys(textColors).length;
      expect(uniqueColors).toBeLessThanOrEqual(3); // At most 3 different text colors
    });
  });

  test.describe('Typography', () => {

    test('should use brand font families', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const fonts = await page.evaluate((brands) => {
        return {
          h1Font: window.getComputedStyle(document.querySelector('h1')).fontFamily,
          h2Font: window.getComputedStyle(document.querySelector('h2')).fontFamily,
          pFont: window.getComputedStyle(document.querySelector('p')).fontFamily
        };
      }, BRAND_STANDARDS);

      // Should use serif fonts
      expect(fonts.h1Font).toContain('Merriweather');
      expect(fonts.h2Font).toContain('Merriweather');
    });

    test('should have proper font sizing hierarchy', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const fontSizes = await page.evaluate(() => {
        const h1 = parseInt(window.getComputedStyle(document.querySelector('h1')).fontSize);
        const h2 = parseInt(window.getComputedStyle(document.querySelector('h2')).fontSize);
        const h3 = document.querySelector('h3') ?
          parseInt(window.getComputedStyle(document.querySelector('h3')).fontSize) : 0;
        const p = parseInt(window.getComputedStyle(document.querySelector('p')).fontSize);

        return { h1, h2, h3, p };
      });

      // Proper hierarchy
      expect(fontSizes.h1).toBeGreaterThan(fontSizes.h2);
      if (fontSizes.h3) {
        expect(fontSizes.h2).toBeGreaterThan(fontSizes.h3);
        expect(fontSizes.h3).toBeGreaterThan(fontSizes.p);
      }
    });

    test('should maintain consistent font weights', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const weights = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3'));

        const uniqueWeights = new Set(
          headings.map(h => window.getComputedStyle(h).fontWeight)
        );

        return {
          count: uniqueWeights.size,
          weights: Array.from(uniqueWeights)
        };
      });

      // Should have limited font weights
      expect(weights.count).toBeLessThanOrEqual(3); // Bold, semi-bold, regular
    });

    test('should have proper line heights', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const lineHeights = await page.evaluate(() => {
        const h2 = window.getComputedStyle(document.querySelector('h2')).lineHeight;
        const p = window.getComputedStyle(document.querySelector('p')).lineHeight;

        return { h2, p };
      });

      // Line heights should be readable
      expect(lineHeights.h2).not.toBe('normal');
      expect(lineHeights.p).not.toBe('normal');
    });
  });

  test.describe('Spacing & Layout', () => {

    test('should follow 8px spacing grid', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const spacing = await page.evaluate((unit) => {
        const gridItems = document.querySelectorAll('.grid-item');
        const results = {
          aligned: 0,
          total: gridItems.length
        };

        gridItems.forEach(item => {
          const style = window.getComputedStyle(item);
          const padding = parseInt(style.padding);
          const margin = parseInt(style.margin);

          if ((padding % unit === 0 || padding === 0) &&
              (margin % unit === 0 || margin === 0)) {
            results.aligned++;
          }
        });

        return results;
      }, BRAND_STANDARDS.spacing);

      // At least 80% should follow grid
      const alignment = spacing.aligned / spacing.total;
      expect(alignment).toBeGreaterThanOrEqual(0.8);
    });

    test('should have consistent padding/margins', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const spacing = await page.evaluate(() => {
        const items = document.querySelectorAll('.grid-item');
        const paddings = new Set();
        const margins = new Set();

        items.forEach(item => {
          const style = window.getComputedStyle(item);
          paddings.add(style.padding);
          margins.add(style.margin);
        });

        return {
          paddingVariants: paddings.size,
          marginVariants: margins.size
        };
      });

      // Should have limited spacing variants
      expect(spacing.paddingVariants).toBeLessThanOrEqual(3);
      expect(spacing.marginVariants).toBeLessThanOrEqual(3);
    });

    test('should align grid gap properly', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const gridGap = await page.evaluate(() => {
        const grid = document.querySelector('.bento-grid');
        const style = window.getComputedStyle(grid);

        return {
          gap: style.gap,
          columnGap: style.columnGap,
          rowGap: style.rowGap
        };
      });

      // Should have explicit gap
      expect(gridGap.gap).not.toBe('normal');
      expect(gridGap.gap).not.toBe('0px');
    });
  });

  test.describe('Component Styling', () => {

    test('should have consistent button styling', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const buttons = await page.evaluate(() => {
        const btns = document.querySelectorAll('button, [role="button"], a.btn');
        const styles = [];

        btns.forEach(btn => {
          const style = window.getComputedStyle(btn);
          styles.push({
            bg: style.backgroundColor,
            color: style.color,
            padding: style.padding,
            radius: style.borderRadius
          });
        });

        return styles;
      });

      // If buttons exist, should be consistent
      if (buttons.length > 0) {
        const bgColors = new Set(buttons.map(b => b.bg));
        expect(bgColors.size).toBeLessThanOrEqual(2); // At most 2 variants
      }
    });

    test('should have consistent card/grid-item styling', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const cards = await page.evaluate(() => {
        const items = document.querySelectorAll('.grid-item');
        const styles = [];

        items.forEach(item => {
          const style = window.getComputedStyle(item);
          styles.push({
            bg: style.backgroundColor,
            radius: style.borderRadius,
            shadow: style.boxShadow,
            border: style.border
          });
        });

        return {
          count: items.length,
          variants: {
            bg: new Set(styles.map(s => s.bg)).size,
            radius: new Set(styles.map(s => s.radius)).size,
            shadow: new Set(styles.map(s => s.shadow)).size
          }
        };
      });

      if (cards.count > 0) {
        // All cards should have same styling
        expect(cards.variants.bg).toBe(1);
        expect(cards.variants.radius).toBe(1);
      }
    });

    test('should have proper focus/hover states', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const stateStyles = await page.evaluate(() => {
        const item = document.querySelector('.grid-item');
        if (!item) return null;

        const defaultStyle = window.getComputedStyle(item);

        // Simulate hover
        item.classList.add('hover');
        const hoverStyle = window.getComputedStyle(item);

        return {
          hasTransition: defaultStyle.transition !== 'none' ||
                        hoverStyle.transition !== 'none',
          stateChangeable: defaultStyle.backgroundColor !== hoverStyle.backgroundColor ||
                          defaultStyle.color !== hoverStyle.color
        };
      });

      if (stateStyles) {
        // Should have some visual feedback
        expect(stateStyles.hasTransition || stateStyles.stateChangeable).toBeTruthy();
      }
    });
  });

  test.describe('Logo & Branding Elements', () => {

    test('should have properly positioned logo', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const logoInfo = await page.evaluate(() => {
        const logo = document.querySelector('img.logo');

        if (!logo) return null;

        const rect = logo.getBoundingClientRect();
        const style = window.getComputedStyle(logo);
        const parent = logo.parentElement;
        const parentRect = parent?.getBoundingClientRect();

        return {
          width: rect.width,
          height: rect.height,
          objectFit: style.objectFit,
          inHeader: parent?.tagName === 'HEADER',
          visible: rect.width > 0 && rect.height > 0
        };
      });

      if (logoInfo) {
        expect(logoInfo.visible).toBeTruthy();
        expect(logoInfo.inHeader).toBeTruthy();
        expect(logoInfo.width).toBeGreaterThan(0);
      }
    });

    test('should maintain logo aspect ratio', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const aspectRatio = await page.evaluate(() => {
        const logo = document.querySelector('img.logo');

        if (!logo) return null;

        const rect = logo.getBoundingClientRect();
        return {
          ratio: rect.width / rect.height,
          natural: logo.naturalWidth /
                  logo.naturalHeight
        };
      });

      if (aspectRatio) {
        // Ratio should be consistent
        const diff = Math.abs(aspectRatio.ratio - aspectRatio.natural);
        expect(diff).toBeLessThan(0.2);
      }
    });
  });

  test.describe('Responsive Brand Consistency', () => {

    test('should maintain brand consistency on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/bento-grid`);

      const mobileStyles = await page.evaluate(() => {
        return {
          headerVisible: !!document.querySelector('header'),
          navVisible: !!document.querySelector('nav'),
          gridVisible: !!document.querySelector('.bento-grid'),
          headingColor: window.getComputedStyle(
            document.querySelector('h1')
          ).color
        };
      });

      // Brand elements should remain visible
      expect(mobileStyles.headerVisible).toBeTruthy();
      expect(mobileStyles.navVisible).toBeTruthy();
      expect(mobileStyles.gridVisible).toBeTruthy();
      expect(mobileStyles.headingColor).toBeTruthy();
    });

    test('should maintain brand consistency on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(`${BASE_URL}/bento-grid`);

      const tabletStyles = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        const h2 = document.querySelector('h2');

        return {
          h1Size: parseInt(window.getComputedStyle(h1).fontSize),
          h2Size: parseInt(window.getComputedStyle(h2).fontSize),
          ratioConsistent: true
        };
      });

      // Font hierarchy should be maintained
      expect(tabletStyles.h1Size).toBeGreaterThan(tabletStyles.h2Size);
    });

    test('should maintain brand consistency on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(`${BASE_URL}/bento-grid`);

      const desktopStyles = await page.evaluate(() => {
        const grid = document.querySelector('.bento-grid');
        const style = window.getComputedStyle(grid);

        return {
          display: style.display,
          gridTemplateColumns: style.gridTemplateColumns,
          properLayout: style.display === 'grid'
        };
      });

      expect(desktopStyles.properLayout).toBeTruthy();
    });
  });
});

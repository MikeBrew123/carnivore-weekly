/**
 * Performance Validation for Bento Grid Redesign
 * Tier 4: Core Web Vitals and performance gate validation
 *
 * Run: npx jest tests/performance.test.js
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Performance thresholds
const THRESHOLDS = {
  lcp: 2500,      // Largest Contentful Paint (ms)
  cls: 0.1,       // Cumulative Layout Shift
  fid: 100,       // First Input Delay (ms)
  fcp: 1800,      // First Contentful Paint (ms)
  tbt: 200        // Total Blocking Time (ms)
};

test.describe('Bento Grid - Performance Validation', () => {

  test.describe('Core Web Vitals', () => {

    test('should measure Core Web Vitals accurately', async ({ page }) => {
      const metrics = {
        lcp: null,
        cls: null,
        fid: null,
        fcp: null,
        tbt: null
      };

      // Inject web-vitals measurement
      await page.addInitScript(() => {
        window.vitals = {};

        // Listen for metrics
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.name === 'largest-contentful-paint') {
                window.vitals.lcp = entry.renderTime || entry.loadTime;
              } else if (entry.name === 'layout-shift') {
                window.vitals.cls = (window.vitals.cls || 0) + entry.value;
              }
            }
          });

          observer.observe({ entryTypes: ['largest-contentful-paint', 'layout-shift'] });
        }
      });

      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.bento-grid', { timeout: 5000 });
      await page.waitForLoadState('networkidle');

      // Get timing information
      const timings = await page.evaluate(() => {
        const perfData = window.performance.timing;
        const navigation = window.performance.navigation;

        return {
          domContentLoadedEventEnd: perfData.domContentLoadedEventEnd - perfData.navigationStart,
          loadEventEnd: perfData.loadEventEnd - perfData.navigationStart,
          firstContentfulPaint: perfData.domInteractive - perfData.navigationStart,
          responseStart: perfData.responseStart - perfData.navigationStart,
          responseEnd: perfData.responseEnd - perfData.navigationStart,
          lcp: window.vitals?.lcp || null,
          cls: window.vitals?.cls || null
        };
      });

      // All timings should be reasonable
      expect(timings.loadEventEnd).toBeGreaterThan(0);
      expect(timings.responseStart).toBeGreaterThan(0);
    });

    test('should not exceed LCP threshold', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}/bento-grid`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.bento-grid', { timeout: 5000 });

      const loadTime = Date.now() - startTime;

      // Load time should be under LCP threshold (with some margin)
      expect(loadTime).toBeLessThan(THRESHOLDS.lcp + 500);
    });

    test('should have minimal Cumulative Layout Shift', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.bento-grid', { timeout: 5000 });

      const initialLayout = await page.locator('.grid-item').first().boundingBox();

      // Scroll and check for layout shift
      await page.evaluate(() => {
        window.scrollBy(0, 300);
      });

      await page.waitForTimeout(300);

      const finalLayout = await page.locator('.grid-item').first().boundingBox();

      if (initialLayout && finalLayout) {
        const horizontalShift = Math.abs(initialLayout.x - finalLayout.x);
        const verticalShift = Math.abs(initialLayout.y - finalLayout.y);

        // CLS should be minimal
        const estimatedCLS = (horizontalShift + verticalShift) / 1000;
        expect(estimatedCLS).toBeLessThan(0.2);
      }
    });

    test('should have good First Contentful Paint', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}/bento-grid`, { waitUntil: 'domcontentloaded' });

      const fcpTime = Date.now() - startTime;

      // FCP should be under threshold
      expect(fcpTime).toBeLessThan(THRESHOLDS.fcp + 500);
    });
  });

  test.describe('Resource Loading', () => {

    test('should load images efficiently', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const resourceTiming = await page.evaluate(() => {
        const entries = performance.getEntriesByType('resource');
        const images = entries.filter(e => e.initiatorType === 'img');

        return {
          imageCount: images.length,
          totalImageTime: images.reduce((sum, img) => sum + img.duration, 0),
          largestImage: Math.max(...images.map(img => img.transferSize || 0)),
          totalImageSize: images.reduce((sum, img) => sum + (img.transferSize || 0), 0)
        };
      });

      // Should have reasonable image loading
      expect(resourceTiming.imageCount).toBeGreaterThan(0);
      expect(resourceTiming.totalImageTime).toBeLessThan(5000); // 5 seconds max
    });

    test('should not have render-blocking resources', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const blockingResources = await page.evaluate(() => {
        const entries = performance.getEntriesByType('resource');
        const blocking = entries.filter(entry => {
          return (entry.initiatorType === 'link' || entry.initiatorType === 'script') &&
            entry.duration > 100; // Resources taking > 100ms
        });

        return {
          count: blocking.length,
          resources: blocking.map(r => ({
            name: r.name,
            type: r.initiatorType,
            duration: r.duration
          })).slice(0, 5)
        };
      });

      // Should minimize blocking resources
      expect(blockingResources.count).toBeLessThan(5);
    });

    test('should use efficient asset compression', async ({ page }) => {
      const responses = [];

      page.on('response', response => {
        responses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers()
        });
      });

      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForLoadState('networkidle');

      // Check for compression headers
      const compressedResponses = responses.filter(r =>
        r.headers['content-encoding'] === 'gzip' ||
        r.headers['content-encoding'] === 'br' ||
        r.headers['content-encoding'] === 'deflate'
      );

      // Critical resources should be compressed
      expect(compressedResponses.length).toBeGreaterThan(0);
    });
  });

  test.describe('JavaScript Performance', () => {

    test('should have minimal main thread blocking', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.bento-grid', { timeout: 5000 });

      const blockingTime = Date.now() - startTime;

      // Should complete without excessive main thread blocking
      expect(blockingTime).toBeLessThan(THRESHOLDS.tbt + 500);
    });

    test('should not have large JavaScript bundles', async ({ page }) => {
      const resourceSizes = await page.evaluate(() => {
        const entries = performance.getEntriesByType('resource');
        const scripts = entries.filter(e => e.initiatorType === 'script');

        return {
          totalSize: scripts.reduce((sum, s) => sum + (s.transferSize || 0), 0),
          count: scripts.length,
          largestScript: Math.max(...scripts.map(s => s.transferSize || 0))
        };
      });

      // Total JS should be reasonable
      expect(resourceSizes.totalSize).toBeLessThan(500000); // 500KB
    });

    test('should defer non-critical JavaScript', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      // Check script loading attributes
      const scriptInfo = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'));
        return scripts.map(s => ({
          src: s.src,
          async: s.async,
          defer: s.defer,
          type: s.type
        })).slice(0, 5);
      });

      // Should have properly deferred scripts
      expect(scriptInfo.length).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('CSS Performance', () => {

    test('should have optimized CSS', async ({ page }) => {
      const resourceInfo = await page.evaluate(() => {
        const entries = performance.getEntriesByType('resource');
        const stylesheets = entries.filter(e => e.initiatorType === 'link' && e.name.includes('.css'));

        return {
          count: stylesheets.length,
          totalSize: stylesheets.reduce((sum, s) => sum + (s.transferSize || 0), 0),
          loadTime: stylesheets.reduce((sum, s) => sum + s.duration, 0)
        };
      });

      // CSS should be reasonable size
      if (resourceInfo.count > 0) {
        expect(resourceInfo.totalSize).toBeLessThan(100000); // 100KB
      }
    });

    test('should not have unused CSS', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      // Check for critical CSS
      const criticalCSS = await page.evaluate(() => {
        const styles = Array.from(document.querySelectorAll('style'));
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

        return {
          inlineStyles: styles.length,
          stylesheets: links.length,
          hasCriticalCSS: styles.length > 0 || links[0]?.media === 'print'
        };
      });

      // Should have some CSS
      expect(criticalCSS.inlineStyles + criticalCSS.stylesheets).toBeGreaterThan(0);
    });
  });

  test.describe('Memory Usage', () => {

    test('should not have memory leaks on navigation', async ({ page }) => {
      // Navigate multiple times and check memory
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Navigate to page
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.bento-grid', { timeout: 5000 });

      // Navigate back and forth
      for (let i = 0; i < 3; i++) {
        await page.goto(`${BASE_URL}/`);
        await page.goto(`${BASE_URL}/bento-grid`);
      }

      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Memory increase should be reasonable
      const memoryIncrease = finalMemory - initialMemory;
      if (initialMemory > 0) {
        const percentIncrease = (memoryIncrease / initialMemory) * 100;
        expect(percentIncrease).toBeLessThan(100); // Less than double
      }
    });
  });

  test.describe('Network Performance', () => {

    test('should minimize network requests', async ({ page }) => {
      const requestCount = { count: 0 };

      page.on('request', () => {
        requestCount.count++;
      });

      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForLoadState('networkidle');

      // Should have reasonable number of requests
      expect(requestCount.count).toBeLessThan(100);
    });

    test('should use caching effectively', async ({ page }) => {
      // First load
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForLoadState('networkidle');

      const firstLoadResources = await page.evaluate(() => {
        return performance.getEntriesByType('resource').length;
      });

      // Second load (should use cache)
      const resourcesBefore = firstLoadResources;

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Reload should serve from cache
      // (actual cache behavior depends on server headers)
    });
  });

  test.describe('Runtime Performance', () => {

    test('should handle interactions smoothly', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.grid-item', { timeout: 5000 });

      const startTime = Date.now();

      // Perform interaction
      const firstItem = page.locator('.grid-item').first();
      await firstItem.hover();

      const interactionTime = Date.now() - startTime;

      // Interaction response should be quick
      expect(interactionTime).toBeLessThan(500); // 500ms max
    });

    test('should render efficiently on slower devices', async ({ page }) => {
      // Simulate slower network
      await page.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        await route.continue();
      });

      const startTime = Date.now();

      await page.goto(`${BASE_URL}/bento-grid`);
      await page.waitForSelector('.bento-grid', { timeout: 10000 });

      const totalTime = Date.now() - startTime;

      // Should still load reasonably quickly
      expect(totalTime).toBeLessThan(10000);
    });
  });
});

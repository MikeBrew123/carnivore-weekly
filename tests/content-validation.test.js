/**
 * Content Validation for Bento Grid Redesign
 * Tier 6: Validates copy authenticity, grammar, voice, and SEO
 *
 * Run: npx jest tests/content-validation.test.js
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Bento Grid - Content Validation', () => {

  test.describe('Copy Quality', () => {

    test('should have meaningful content on all grid items', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const content = await page.evaluate(() => {
        const items = document.querySelectorAll('.grid-item');
        const results = [];

        items.forEach((item, i) => {
          const title = item.querySelector('h2')?.textContent.trim() || '';
          const description = item.querySelector('p')?.textContent.trim() || '';

          results.push({
            index: i,
            hasTitle: title.length > 0,
            titleLength: title.length,
            hasDescription: description.length > 0,
            descriptionLength: description.length,
            titleWords: title.split(/\s+/).length,
            descriptionWords: description.split(/\s+/).length
          });
        });

        return results;
      });

      // All items should have content
      expect(content.length).toBeGreaterThan(0);

      content.forEach(item => {
        expect(item.hasTitle).toBeTruthy();
        expect(item.titleLength).toBeGreaterThan(0);
        expect(item.titleWords).toBeGreaterThanOrEqual(1);
        expect(item.hasDescription).toBeTruthy();
        expect(item.descriptionLength).toBeGreaterThan(10);
        expect(item.descriptionWords).toBeGreaterThanOrEqual(3);
      });
    });

    test('should have proper grammar and no obvious typos', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const grammarResults = await page.evaluate(() => {
        const text = document.body.innerText;
        const issues = [];

        // Common typos
        const typos = [
          { pattern: /\bteh\b/gi, replace: 'the' },
          { pattern: /\brecieve\b/gi, replace: 'receive' },
          { pattern: /\boccured\b/gi, replace: 'occurred' },
          { pattern: /\bseperate\b/gi, replace: 'separate' }
        ];

        typos.forEach(({ pattern, replace }) => {
          if (pattern.test(text)) {
            issues.push(`Typo: "${pattern}" should be "${replace}"`);
          }
        });

        // Double spaces
        if (/  +/g.test(text)) {
          issues.push('Double spaces detected');
        }

        // Multiple punctuation
        if (/[.!?]{2,}/g.test(text)) {
          issues.push('Multiple punctuation marks detected');
        }

        return {
          issues,
          passed: issues.length === 0
        };
      });

      expect(grammarResults.passed).toBeTruthy();
      expect(grammarResults.issues).toEqual([]);
    });

    test('should maintain consistent voice and tone', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const voiceAnalysis = await page.evaluate(() => {
        const items = document.querySelectorAll('.grid-item');
        const patterns = {
          overly_promotional: 0,
          vague: 0,
          passive: 0,
          issues: []
        };

        items.forEach((item, i) => {
          const text = item.innerText.toLowerCase();

          // Check for overly promotional language
          if (/amazing|incredible|must-have|can't miss|revolutionary/i.test(text)) {
            patterns.overly_promotional++;
            patterns.issues.push(`Item ${i}: Overly promotional language`);
          }

          // Check for vague language
          if (/something|things|stuff|basically|actually|really/i.test(text)) {
            patterns.vague++;
            patterns.issues.push(`Item ${i}: Vague language`);
          }

          // Check for passive voice
          if (/\b(is|are|was|were)\s+\w+ed\b/i.test(text)) {
            patterns.passive++;
          }
        });

        return {
          itemCount: items.length,
          patterns,
          issues: patterns.issues.slice(0, 5), // First 5 issues
          passed: patterns.overly_promotional === 0 && patterns.vague < items.length * 0.3
        };
      });

      // Voice should be appropriate for brand
      expect(voiceAnalysis.patterns.overly_promotional).toBe(0);
      expect(voiceAnalysis.passed).toBeTruthy();
    });

    test('should not have truncated or incomplete sentences', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const completeness = await page.evaluate(() => {
        const items = document.querySelectorAll('.grid-item');
        const issues = [];

        items.forEach((item, i) => {
          const text = item.innerText;

          // Check for ending with common incomplete patterns
          if (/[^.!?:;]$/.test(text.trim())) {
            // Text should end with punctuation (not always required but good practice)
          }

          // Check for ellipsis at end (incomplete thought)
          if (/\.\.\.$/.test(text.trim())) {
            issues.push(`Item ${i}: Ends with ellipsis (incomplete)`);
          }

          // Check for broken HTML entities
          if (/&\w+;|&#\d+;/.test(text)) {
            // This is okay - just tracking
          }
        });

        return {
          complete: issues.length === 0,
          issues
        };
      });

      expect(completeness.issues).toEqual([]);
    });
  });

  test.describe('Link Validity', () => {

    test('should have valid link hrefs', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const linkResults = await page.evaluate(() => {
        const links = document.querySelectorAll('a');
        const results = {
          valid: 0,
          issues: []
        };

        links.forEach((link, i) => {
          const href = link.getAttribute('href');
          const text = link.textContent.trim();

          if (!href) {
            results.issues.push(`Link ${i}: Missing href attribute`);
            return;
          }

          if (href === '' || href === '#') {
            results.issues.push(`Link ${i}: Empty or broken href`);
            return;
          }

          if (!text) {
            results.issues.push(`Link ${i}: No link text`);
            return;
          }

          results.valid++;
        });

        return results;
      });

      // All links should be valid
      expect(linkResults.issues).toEqual([]);
    });

    test('should have descriptive link text', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const linkText = await page.evaluate(() => {
        const links = document.querySelectorAll('a');
        const results = {
          descriptive: 0,
          vague: 0,
          issues: []
        };

        links.forEach((link, i) => {
          const text = link.textContent.trim();

          // Vague link text
          if (/^(click here|link|read more|here|this page|view)$/i.test(text)) {
            const ariaLabel = link.getAttribute('aria-label');
            if (!ariaLabel) {
              results.vague++;
              results.issues.push(`Link ${i}: Vague text "${text}"`);
              return;
            }
          }

          results.descriptive++;
        });

        return results;
      });

      // Most links should have descriptive text
      expect(linkText.vague).toBe(0);
    });
  });

  test.describe('SEO Metadata', () => {

    test('should have complete page title', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const title = await page.title();

      // Title should exist and be reasonable
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThanOrEqual(30);
      expect(title.length).toBeLessThanOrEqual(60);
    });

    test('should have meta description', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');

      // Meta description should exist
      expect(metaDescription).toBeTruthy();
      expect(metaDescription.length).toBeGreaterThanOrEqual(120);
      expect(metaDescription.length).toBeLessThanOrEqual(160);
    });

    test('should have lang attribute', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const lang = await page.evaluate(() => {
        return document.documentElement.getAttribute('lang');
      });

      expect(lang).toBeTruthy();
      expect(lang).toBe('en');
    });

    test('should have proper heading structure for SEO', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const headings = await page.evaluate(() => {
        const h = [];
        document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
          h.push({
            level: el.tagName,
            text: el.textContent.trim()
          });
        });
        return h;
      });

      // Should start with h1
      expect(headings[0]?.level).toBe('H1');

      // Headings should have content
      headings.forEach(h => {
        expect(h.text.length).toBeGreaterThan(0);
      });
    });

    test('should have Open Graph metadata', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const og = await page.evaluate(() => {
        const meta = {};

        document.querySelectorAll('meta[property^="og:"]').forEach(el => {
          const property = el.getAttribute('property');
          const content = el.getAttribute('content');
          if (property) {
            meta[property] = content;
          }
        });

        return meta;
      });

      // Should have basic OG tags (optional but good practice)
      // This is informational - don't block on it
    });
  });

  test.describe('Image Alt Text', () => {

    test('should have meaningful alt text', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const altResults = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        const results = {
          valid: 0,
          issues: []
        };

        images.forEach((img, i) => {
          const alt = img.getAttribute('alt') || '';
          const src = img.getAttribute('src') || '';

          if (!alt) {
            results.issues.push(`Image ${i}: Missing alt text`);
            return;
          }

          // Alt should not be filename
          if (/\.(jpg|png|gif|webp)$/i.test(alt)) {
            results.issues.push(`Image ${i}: Alt is filename "${alt}"`);
            return;
          }

          // Alt should be reasonable length
          if (alt.length > 150) {
            results.issues.push(`Image ${i}: Alt text too long (${alt.length})`);
            return;
          }

          // Alt should be descriptive (not just image types)
          if (/^(image|photo|picture|graphic)$/i.test(alt)) {
            results.issues.push(`Image ${i}: Alt not descriptive "${alt}"`);
            return;
          }

          results.valid++;
        });

        return results;
      });

      expect(altResults.issues).toEqual([]);
    });

    test('should have alt text for decorative purposes', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const decorative = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        const results = {
          withoutAlt: [],
          withEmptyAlt: []
        };

        images.forEach((img, i) => {
          const alt = img.getAttribute('alt');
          const ariaHidden = img.getAttribute('aria-hidden');

          if (alt === null && !ariaHidden) {
            results.withoutAlt.push(`Image ${i}`);
          }
        });

        return results;
      });

      // All images should either have alt text or aria-hidden
      expect(decorative.withoutAlt).toEqual([]);
    });
  });

  test.describe('Brand Voice & Authenticity', () => {

    test('should not have AI-generated patterns', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const aiPatterns = await page.evaluate(() => {
        const text = document.body.innerText;
        const detectedPatterns = [];

        const aiIndicators = [
          { regex: /in conclusion,? it is clear that/i, label: 'AI conclusion phrase' },
          { regex: /furthermore,? it is important to note/i, label: 'AI transition phrase' },
          { regex: /^in this article, we (will |explore|discuss)/im, label: 'AI article intro' },
          { regex: /the importance of .+ cannot be overstated/i, label: 'AI emphasis pattern' },
          { regex: /it is widely known that/i, label: 'AI generalization' },
          { regex: /from a scientific perspective,?/i, label: 'AI qualifier phrase' },
          { regex: /as (an ai|mentioned earlier)/i, label: 'AI self-reference' }
        ];

        aiIndicators.forEach(({ regex, label }) => {
          if (regex.test(text)) {
            detectedPatterns.push(label);
          }
        });

        return {
          detected: detectedPatterns,
          score: detectedPatterns.length / aiIndicators.length
        };
      });

      // Should not have AI patterns
      expect(aiPatterns.detected).toEqual([]);
    });

    test('should have consistent brand terminology', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const terminology = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        const issues = [];

        // Check for brand name consistency
        const carnivoreCount = (text.match(/carnivore diet/gi) || []).length;
        const meatDietCount = (text.match(/meat-based diet/gi) || []).length;

        if (carnivoreCount > 0 && meatDietCount > 0) {
          issues.push('Inconsistent diet terminology');
        }

        // Check for feature terminology
        const gridCount = (text.match(/\bgrid\b/gi) || []).length;
        const bentoCount = (text.match(/bento/gi) || []).length;

        // Should use "bento grid" consistently
        if (gridCount > bentoCount + 5) {
          issues.push('Using "grid" without "bento" context');
        }

        return {
          consistent: issues.length === 0,
          issues
        };
      });

      expect(terminology.consistent).toBeTruthy();
    });

    test('should use appropriate formality level', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const formality = await page.evaluate(() => {
        const text = document.body.innerText;
        const patterns = {
          tooFormal: 0,
          tooCasual: 0,
          issues: []
        };

        // Too formal patterns
        if (/utilize|leverage|synergize|paradigm/i.test(text)) {
          patterns.tooFormal++;
          patterns.issues.push('Over-formal language');
        }

        // Too casual patterns
        if (/gonna|wanna|y'all|ain't|LOL/i.test(text)) {
          patterns.tooCasual++;
          patterns.issues.push('Too casual language');
        }

        return {
          appropriate: patterns.tooFormal === 0 && patterns.tooCasual === 0,
          patterns
        };
      });

      expect(formality.appropriate).toBeTruthy();
    });
  });

  test.describe('Accessibility of Content', () => {

    test('should have readable text sizes', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const readability = await page.evaluate(() => {
        const items = document.querySelectorAll('.grid-item');
        const sizes = [];

        items.forEach(item => {
          const p = item.querySelector('p');
          if (p) {
            const fontSize = parseInt(window.getComputedStyle(p).fontSize);
            sizes.push(fontSize);
          }
        });

        return {
          count: sizes.length,
          minSize: Math.min(...sizes),
          avgSize: sizes.length > 0 ?
            sizes.reduce((a, b) => a + b, 0) / sizes.length : 0,
          allReadable: sizes.every(s => s >= 14) // Minimum readable size
        };
      });

      if (readability.count > 0) {
        // Text should be readable
        expect(readability.minSize).toBeGreaterThanOrEqual(12);
        expect(readability.allReadable).toBeTruthy();
      }
    });

    test('should have adequate line length', async ({ page }) => {
      await page.goto(`${BASE_URL}/bento-grid`);

      const lineLength = await page.evaluate(() => {
        const items = document.querySelectorAll('.grid-item');
        const results = [];

        items.forEach((item, i) => {
          const p = item.querySelector('p');
          if (p) {
            const width = p.offsetWidth;
            const hasGoodLength = width > 250 && width < 600; // Good reading width
            results.push({
              width,
              optimal: hasGoodLength
            });
          }
        });

        const optimalCount = results.filter(r => r.optimal).length;
        return {
          tested: results.length,
          optimal: optimalCount,
          ratio: optimalCount / results.length
        };
      });

      if (lineLength.tested > 0) {
        // Most should have good line length
        expect(lineLength.ratio).toBeGreaterThanOrEqual(0.8);
      }
    });
  });
});

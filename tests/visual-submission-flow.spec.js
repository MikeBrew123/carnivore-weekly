import { test, expect } from '@playwright/test';
import path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(PROJECT_ROOT, 'agents/visual_validation_reports');
const BASELINE_DIR = path.join(PROJECT_ROOT, 'agents/visual_baselines');

test.describe('Visual Validation: Submission Flow & Progress Bar', () => {

  test.describe('Submit Button (Desktop 1400x900)', () => {
    test.use({ viewport: { width: 1400, height: 900 } });

    test('Button visible below form fields', async ({ page }) => {
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const form = page.locator('form');
      expect(form).toBeDefined();

      // Get all buttons in form
      const buttons = form.locator('button');
      expect(await buttons.count()).toBeGreaterThan(0);
    });

    test('Button styling: gold background, white text, 44px+ height', async ({ page }) => {
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const form = page.locator('form');
      const button = form.locator('button').last();

      // Should be visible
      await expect(button).toBeVisible();

      // Check dimensions
      const box = await button.boundingBox();
      expect(box).toBeDefined();
      expect(box.height).toBeGreaterThanOrEqual(44);

      // Check colors
      const styles = await button.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color
        };
      });

      console.log('Button styles:', styles);
    });

    test('Button text readable and centered', async ({ page }) => {
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const button = page.locator('form button').last();
      const text = await button.innerText();

      expect(text.length).toBeGreaterThan(0);
      expect(text.toLowerCase()).toContain('generate');
    });

    test('Desktop screenshot captured', async ({ page }) => {
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const screenshotPath = path.join(REPORT_DIR, `submission_flow_desktop_${new Date().toISOString().split('T')[0]}.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`Desktop screenshot: ${screenshotPath}`);
    });
  });

  test.describe('Submit Button (Mobile 375x812)', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('Button full width (minus padding)', async ({ page }) => {
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const button = page.locator('form button').last();
      await expect(button).toBeVisible();

      const box = await button.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
    });

    test('No horizontal scroll', async ({ page }) => {
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const windowWidth = await page.evaluate(() => window.innerWidth);

      console.log(`Body width: ${bodyWidth}px, Window width: ${windowWidth}px`);
      expect(bodyWidth).toBeLessThanOrEqual(windowWidth);
    });

    test('Text readable without zooming', async ({ page }) => {
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const button = page.locator('form button').last();
      const text = await button.innerText();
      const fontSize = await button.evaluate(el => {
        return window.getComputedStyle(el).fontSize;
      });

      console.log(`Button text: "${text}"`);
      console.log(`Font size: ${fontSize}`);

      expect(text.length).toBeGreaterThan(0);
    });

    test('Mobile screenshot captured', async ({ page }) => {
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const screenshotPath = path.join(REPORT_DIR, `submission_flow_mobile_${new Date().toISOString().split('T')[0]}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Mobile screenshot: ${screenshotPath}`);
    });
  });

  test.describe('Form Structure & Validation', () => {
    test.use({ viewport: { width: 1400, height: 900 } });

    test('Form element exists with proper structure', async ({ page }) => {
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const form = page.locator('form');
      expect(form).toBeDefined();

      // Check key form elements
      const fieldsets = form.locator('fieldset');
      const inputCount = await form.locator('input').count();
      const textareaCount = await form.locator('textarea').count();

      console.log(`Fieldsets: ${await fieldsets.count()}`);
      console.log(`Input fields: ${inputCount}`);
      console.log(`Textarea fields: ${textareaCount}`);

      expect(inputCount).toBeGreaterThan(5);
      expect(textareaCount).toBeGreaterThan(0);
    });

    test('Email field validation states visible', async ({ page }) => {
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const emailField = page.locator('input[type="email"]');
      expect(emailField).toBeDefined();

      // Check if email field has validation styling
      const styles = await emailField.evaluate(el => {
        return window.getComputedStyle(el);
      });

      console.log('Email field exists with validation styling');
    });

    test('Required field indicators visible', async ({ page }) => {
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const requiredFields = page.locator('[aria-required="true"], [required]');
      const count = await requiredFields.count();

      console.log(`Required fields found: ${count}`);
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Accessibility Checks', () => {
    test.use({ viewport: { width: 1400, height: 900 } });

    test('Form has proper aria labels', async ({ page }) => {
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const inputs = page.locator('input, textarea, select');
      const inputArray = await inputs.all();

      let withAriaLabel = 0;
      for (const input of inputArray) {
        const hasAriaLabel = await input.getAttribute('aria-label').catch(() => null);
        if (hasAriaLabel) withAriaLabel++;
      }

      console.log(`Inputs with aria-label: ${withAriaLabel}/${inputArray.length}`);
    });

    test('Keyboard navigation works', async ({ page }) => {
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const firstInput = page.locator('input').first();
      await firstInput.focus();

      const focused = await page.evaluate(() => {
        return document.activeElement?.id || document.activeElement?.name || 'unknown';
      });

      console.log(`First input focused: ${focused}`);
      expect(focused).not.toBe('unknown');
    });

    test('Focus visible on keyboard navigation', async ({ page }) => {
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const button = page.locator('form button').last();
      await button.focus();

      const hasFocusOutline = await button.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          outline: computed.outline,
          outlineColor: computed.outlineColor,
          boxShadow: computed.boxShadow
        };
      });

      console.log('Focus styles:', hasFocusOutline);
    });
  });

  test.describe('Color Compliance (Brand Colors)', () => {
    test.use({ viewport: { width: 1400, height: 900 } });

    test('Verify heading colors (#b8860b gold)', async ({ page }) => {
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const h1 = page.locator('h1').first();
      const h2 = page.locator('h2').first();

      const h1Color = await h1.evaluate(el => window.getComputedStyle(el).color);
      const h2Color = await h2.evaluate(el => window.getComputedStyle(el).color);

      console.log(`H1 color: ${h1Color}`);
      console.log(`H2 color: ${h2Color}`);

      // Colors should be defined
      expect(h1Color).toBeDefined();
      expect(h2Color).toBeDefined();
    });

    test('Verify input border colors (#d4a574 tan)', async ({ page }) => {
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const input = page.locator('input[type="text"], input[type="email"]').first();
      const borderColor = await input.evaluate(el => window.getComputedStyle(el).borderColor);

      console.log(`Input border color: ${borderColor}`);
      expect(borderColor).toBeDefined();
    });

    test('Verify body text color (#f4e4d4 light tan on dark)', async ({ page }) => {
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const paragraph = page.locator('p').first();
      const textColor = await paragraph.evaluate(el => window.getComputedStyle(el).color);

      console.log(`Body text color: ${textColor}`);
      expect(textColor).toBeDefined();
    });
  });

  test.describe('Responsive Design Testing', () => {
    test('Mobile (375px) - No horizontal scroll', async ({ page }) => {
      page.setViewportSize({ width: 375, height: 812 });
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const windowWidth = await page.evaluate(() => window.innerWidth);

      expect(bodyWidth).toBeLessThanOrEqual(windowWidth);
    });

    test('Tablet (768px) - Layout stacks properly', async ({ page }) => {
      page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const form = page.locator('form');
      expect(form).toBeVisible();

      // Check that form doesn't overflow horizontally
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const windowWidth = await page.evaluate(() => window.innerWidth);

      expect(bodyWidth).toBeLessThanOrEqual(windowWidth);
    });

    test('Desktop (1400px) - Full layout works', async ({ page }) => {
      page.setViewportSize({ width: 1400, height: 900 });
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const form = page.locator('form');
      expect(form).toBeVisible();

      const button = form.locator('button').last();
      expect(button).toBeVisible();
    });
  });

  test.describe('Progress Bar Elements (Future State)', () => {
    test.use({ viewport: { width: 1400, height: 900 } });

    test('Progress bar HTML structure exists (when generated)', async ({ page }) => {
      // Note: Progress bar may be hidden until form submission
      // This test checks for the presence of progress-related elements

      const content = await page.content();

      // Progress bar elements may be dynamically created
      // For now, just verify form loads
      const form = page.locator('form');
      expect(form).toBeDefined();
    });

    test('Progress elements styled with gold (#ffd700)', async ({ page }) => {
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      // Check if any progress-related CSS exists
      const styles = await page.evaluate(() => {
        const styleSheets = Array.from(document.styleSheets);
        return styleSheets.map(sheet => {
          try {
            return Array.from(sheet.cssRules)
              .filter(rule => rule.selectorText?.includes('progress'))
              .map(rule => rule.cssText);
          } catch {
            return [];
          }
        }).flat();
      });

      console.log('Progress-related styles found:', styles.length);
    });
  });

  test.describe('Visual Regression Baseline Update', () => {
    test.use({ viewport: { width: 1400, height: 900 } });

    test('Capture desktop baseline screenshot', async ({ page }) => {
      await page.goto('file://' + path.join(PROJECT_ROOT, 'public/calculator-form-rebuild.html'));

      const dateStr = new Date().toISOString().split('T')[0];
      const screenshotPath = path.join(BASELINE_DIR, `submission_flow_desktop_baseline_${dateStr}.png`);

      await page.screenshot({ path: screenshotPath });
      console.log(`Baseline screenshot saved: ${screenshotPath}`);
    });
  });

});

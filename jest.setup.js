/**
 * Jest Setup - Configure test environment and utilities
 */

// Set environment variables
process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Extend Jest matchers
expect.extend({
  toBeValidURL(received) {
    const pass = /^https?:\/\/.+/.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid URL`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid URL`,
        pass: false
      };
    }
  },

  toHaveGoodContrast(received) {
    const { fg, bg } = received;
    const fgLum = getLuminance(fg);
    const bgLum = getLuminance(bg);
    const contrast = (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05);
    const pass = contrast >= 4.5;

    if (pass) {
      return {
        message: () => `expected contrast of ${contrast.toFixed(2)}:1 not to be >= 4.5:1`,
        pass: true
      };
    } else {
      return {
        message: () => `expected contrast of ${contrast.toFixed(2)}:1 to be >= 4.5:1`,
        pass: false
      };
    }
  }
});

// Helper function
function getLuminance(color) {
  const rgb = color.match(/\d+/g);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(x => {
    x = parseInt(x) / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Global test hooks
beforeAll(() => {
  console.log('\n🚀 Starting Bento Grid QA Tests\n');
});

afterAll(() => {
  console.log('\n✅ QA Tests Complete\n');
});

/**
 * Jest Configuration for Bento Grid QA Tests
 * Accessibility, performance, brand, and content validation
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/accessibility.test.js',
    '**/tests/performance.test.js',
    '**/tests/brand-consistency.test.js',
    '**/tests/content-validation.test.js'
  ],

  collectCoverageFrom: [
    'public/**/*.html',
    'templates/**/*.html',
    '!**/node_modules/**',
    '!**/test-results/**'
  ],

  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  reporters: [
    'default'
  ],

  testTimeout: 30000,

  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  verbose: true
};

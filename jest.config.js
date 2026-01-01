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
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'jest-results.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathAsClassName: false
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: 'test-results',
        filename: 'jest-report.html',
        pageTitle: 'Jest Report',
        expand: true,
        openReport: false
      }
    ]
  ],

  testTimeout: 30000,

  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  verbose: true
};

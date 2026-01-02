import js from '@eslint/js';

const sharedGlobals = {
  // Node.js globals
  console: 'readonly',
  process: 'readonly',
  Buffer: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  global: 'readonly',
  // Browser globals
  document: 'readonly',
  window: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  fetch: 'readonly',
  Response: 'readonly',
  Request: 'readonly',
  crypto: 'readonly'
};

const sharedRules = {
  ...js.configs.recommended.rules,
  'no-unused-vars': ['warn', { argsIgnorePattern: '^_|^err|^error' }],
  'no-console': 'off',
  'no-undef': 'warn'
};

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'public/**',
      '.next/**',
      '.wrangler/**',
      'api/.wrangler/**'
    ]
  },
  // CommonJS files (most of the project)
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: sharedGlobals
    },
    rules: sharedRules
  }
];

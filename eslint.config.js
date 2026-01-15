// eslint.config.js - Flat config for Expo
import expoConfig from 'eslint-config-expo/flat.js';

export default [
  // Base Expo configuration (includes TypeScript support)
  ...expoConfig,

  // Test files - Jest globals are handled by jest-expo
  {
    files: [
      '**/__tests__/**/*.js',
      '**/__tests__/**/*.ts',
      '**/__tests__/**/*.tsx',
      '**/*.test.js',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.js',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      'test-setup/**/*.js'
    ],
    languageOptions: {
      globals: {
        // Jest globals (provided by jest-expo)
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly'
      }
    },
    rules: {
      // Relax some rules in tests
      'no-unused-vars': 'off'
    }
  },

  // Server-side Node.js files
  {
    files: ['multiplayer/server/**/*.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    },
    rules: {
      'no-console': 'off' // Server logging is OK
    }
  },

  // Global overrides and ignores
  {
    ignores: ['dist/*', 'node_modules/*', 'build/*', '.expo/*']
  }
];

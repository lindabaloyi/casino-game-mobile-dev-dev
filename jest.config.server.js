module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/multiplayer/**/*.test.js',
    '<rootDir>/multiplayer/**/__tests__/**/*.js'
  ],
  collectCoverageFrom: [
    'multiplayer/**/*.js',
    '!multiplayer/**/*.test.js',
    '!multiplayer/**/__tests__/**',
    '!multiplayer/server/index.js'
  ],
  moduleFileExtensions: ['js', 'json'],
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/multiplayer/__tests__/setup.js']
};
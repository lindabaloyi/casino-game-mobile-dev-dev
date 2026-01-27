module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  testEnvironment: 'jsdom',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-modules-core|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@testing-library))'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(ttf|otf|mjs)$': '<rootDir>/__mocks__/fileMock.js',
  },
  // Setup mocks for React Native libraries
  setupFiles: [
    '<rootDir>/__mocks__/react-native-gesture-handler.js',
    '<rootDir>/__mocks__/react-native-reanimated.js',
    '<rootDir>/__mocks__/expo-modules-core.js'
  ],
  testMatch: [
    '<rootDir>/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/**/*.(test|spec).(ts|tsx|js|jsx)'
  ],
  collectCoverageFrom: [
    'hooks/**/*.(ts|tsx)',
    'components/**/*.(ts|tsx)',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testTimeout: 10000,
  // Exclude problematic directories
  testPathIgnorePatterns: [
    '<rootDir>/multiplayer/',
    '<rootDir>/node_modules/',
    '<rootDir>/.expo/',
    '<rootDir>/.expo-shared/'
  ]
};

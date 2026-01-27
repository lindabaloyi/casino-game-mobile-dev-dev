jest.mock('expo-modules-core', () => ({
  ...jest.requireActual('expo-modules-core'),
  NativeModulesProxy: {
    EXNativeModulesProxy: {},
  },
  EventEmitter: jest.fn(),
}));

jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
  loadAsync: jest.fn(),
  isLoaded: jest.fn(() => true), // Added isLoaded mock
}));

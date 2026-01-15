// Mock for react-native-reanimated
const React = require('react');

// Mock shared values
const useSharedValue = (initialValue) => ({
  value: initialValue,
});

// Mock animated style
const useAnimatedStyle = (styleUpdater) => {
  return styleUpdater();
};

// Mock runOnJS - this is the key function for preventing crashes
const runOnJS = (fn) => {
  // In tests, just call the function directly since we're not in a worklet context
  return (...args) => fn(...args);
};

// Mock withSpring for animations
const withSpring = (value, config) => value;

// Mock Animated component
const Animated = {
  View: ({ style, children, ...props }) => {
    return React.createElement('div', {
      ...props,
      'data-testid': 'animated-view',
      style: Array.isArray(style) ? Object.assign({}, ...style) : style,
    }, children);
  },
};

module.exports = {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
  Animated,
};

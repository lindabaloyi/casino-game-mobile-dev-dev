// Mock for react-native-gesture-handler
const React = require('react');

// Create a fully chainable mock gesture object
const createChainableGesture = () => {
  const gesture = {
    enabled: function() { return gesture; },
    minDistance: function() { return gesture; },
    onStart: function() { return gesture; },
    onUpdate: function() { return gesture; },
    onEnd: function() { return gesture; },
  };
  return gesture;
};

const mockGesture = {
  Pan: function() { return createChainableGesture(); },
};

const GestureDetector = ({ gesture, children }) => {
  return React.createElement('div', {
    'data-testid': 'gesture-detector',
    'data-gesture': gesture,
  }, children);
};

module.exports = {
  Gesture: mockGesture,
  GestureDetector,
};

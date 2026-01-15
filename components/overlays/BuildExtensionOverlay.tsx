import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface BuildExtensionOverlayProps {
  isVisible: boolean;
  buildId?: string;
  extensionText?: string;  // e.g., "Extend build 5 to 9"
  onAccept: (buildId: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

const BuildExtensionOverlay: React.FC<BuildExtensionOverlayProps> = ({
  isVisible,
  buildId,
  extensionText = 'EXTEND BUILD',
  onAccept,
  onCancel,
  disabled = false
}) => {
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible, fadeAnim]);

  if (!isVisible) {
    return null;
  }
  return (
    <Animated.View
      style={[styles.overlayContainer, { opacity: fadeAnim }]}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      {/* Extension indicator */}
      <View style={styles.extensionIndicator}>
        <Text style={styles.indicatorText}>{extensionText}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton, disabled && styles.disabled]}
          onPress={() => {
            console.log(`[BUILD_EXTENSION_OVERLAY] ✅ ACCEPT button pressed for build ${buildId}`, {
              buildId,
              disabled,
              timestamp: Date.now(),
              action: 'acceptBuildExtension'
            });
            if (onAccept) {
              onAccept(buildId || 'unknown');
            } else {
              console.error(`[BUILD_EXTENSION_OVERLAY] No onAccept callback provided for build ${buildId}`);
            }
          }}
          disabled={disabled}
          accessibilityLabel="Accept build extension"
          accessibilityHint="Accepts the build extension and validates the move"
        >
          <Ionicons name="checkmark-circle" size={24} color="#28a745" />
          <Text style={styles.buttonText}>Accept</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton, disabled && styles.disabled]}
          onPress={() => {
            console.log(`[BUILD_EXTENSION_OVERLAY] ❌ CANCEL button pressed for build ${buildId}`, {
              buildId,
              disabled,
              timestamp: Date.now(),
              action: 'cancelBuildExtension'
            });
            if (onCancel) {
              onCancel();
            } else {
              console.error(`[BUILD_EXTENSION_OVERLAY] No onCancel callback provided for build ${buildId}`);
            }
          }}
          disabled={disabled}
          accessibilityLabel="Cancel build extension"
          accessibilityHint="Cancels the build extension and returns the card"
        >
          <Ionicons name="close-circle" size={24} color="#dc3545" />
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    bottom: -70, // Exact position for build extension overlay
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    pointerEvents: 'none', // Container doesn't block, individual buttons do
    transform: [{ scale: 0.6 }] // Scale as specified
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 8,
    elevation: 10,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    marginHorizontal: 2,
    minWidth: 60,
    pointerEvents: 'auto' // Buttons can be pressed
  },
  acceptButton: {
    backgroundColor: '#d4edda',
    borderWidth: 1,
    borderColor: '#28a745'
  },
  cancelButton: {
    backgroundColor: '#f8d7da',
    borderWidth: 1,
    borderColor: '#dc3545'
  },
  disabled: {
    opacity: 0.5
  },
  buttonText: {
    color: '#333',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center'
  },
  extensionIndicator: {
    marginTop: 8,
    backgroundColor: '#007bff', // Blue for build extensions
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  indicatorText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1
  }
});

export default BuildExtensionOverlay;
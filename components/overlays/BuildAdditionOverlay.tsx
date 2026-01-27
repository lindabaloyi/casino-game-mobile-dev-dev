import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface BuildAdditionOverlayProps {
  isVisible: boolean;
  buildId?: string;
  onAccept: (buildId: string) => void;
  onCancel: (buildId: string) => void;
  onReject?: (buildId: string) => void;
  disabled?: boolean;
}

const BuildAdditionOverlay: React.FC<BuildAdditionOverlayProps> = ({
  isVisible,
  buildId,
  onAccept,
  onCancel,
  onReject,
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
    console.log(`[BUILD_ADDITION_OVERLAY] Overlay hidden for build ${buildId || 'unknown'}`);
    return null;
  }

  console.log(`[BUILD_ADDITION_OVERLAY] 🎬 Rendering build addition overlay for build ${buildId}, disabled: ${disabled}`, {
    isVisible,
    buildId,
    disabled,
    hasOnAccept: typeof onAccept === 'function',
    hasOnCancel: typeof onCancel === 'function'
  });

  return (
    <Animated.View
      style={[styles.overlayContainer, { opacity: fadeAnim }]}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      {/* Build addition indicator - Same design as BuildExtensionOverlay */}
      <View style={styles.additionIndicator}>
        <Text style={styles.indicatorText}>ADD-ON</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton, disabled && styles.disabled]}
          onPress={() => {
            console.log(`[BUILD_ADDITION_OVERLAY] ✅ ACCEPT button pressed for build ${buildId}`, {
              buildId,
              disabled,
              timestamp: Date.now(),
              action: 'acceptBuildAddition'
            });
            if (onAccept && buildId) {
              onAccept(buildId);
            } else {
              console.error(`[BUILD_ADDITION_OVERLAY] No onAccept callback or buildId provided`);
            }
          }}
          disabled={disabled}
          accessibilityLabel="Accept build addition"
          accessibilityHint="Accepts adding cards to your build"
        >
          <Ionicons name="checkmark-circle" size={24} color="#28a745" />
          <Text style={styles.buttonText}>Accept</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton, disabled && styles.disabled]}
          onPress={() => {
            console.log(`[BUILD_ADDITION_OVERLAY] ❌ CANCEL button pressed for build ${buildId}`, {
              buildId,
              disabled,
              timestamp: Date.now(),
              action: 'rejectBuildAddition'
            });
            if (onReject && buildId) {
              onReject(buildId);
            } else if (onCancel && buildId) {
              onCancel(buildId);
            } else {
              console.error(`[BUILD_ADDITION_OVERLAY] No onReject or onCancel callback or buildId provided`);
            }
          }}
          disabled={disabled}
          accessibilityLabel="Cancel build addition"
          accessibilityHint="Cancels adding cards to your build"
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
    bottom: -70, // Exact position as BuildExtensionOverlay
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
  additionIndicator: {
    marginTop: 8,
    backgroundColor: '#007bff', // Same blue as BuildExtensionOverlay
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

export default BuildAdditionOverlay;
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface StagingOverlayProps {
  isVisible: boolean;
  stackId?: string;
  onAccept: () => void;
  onReject: () => void;
  disabled?: boolean;
}

const StagingOverlay: React.FC<StagingOverlayProps> = ({
  isVisible,
  stackId,
  onAccept,
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
    console.log(`[STAGING_OVERLAY] Overlay hidden for stack ${stackId || 'unknown'}`);
    return null;
  }

  console.log(`[STAGING_OVERLAY] 🎬 Rendering staging overlay for stack ${stackId}, disabled: ${disabled}`, {
    isVisible,
    stackId,
    disabled,
    hasOnAccept: typeof onAccept === 'function',
    hasOnReject: typeof onReject === 'function'
  });

  return (
    <Animated.View
      style={[styles.overlayContainer, { opacity: fadeAnim }]}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton, disabled && styles.disabled]}
          onPress={() => {
            console.log(`[STAGING_OVERLAY] ✅ ACCEPT button pressed for stack ${stackId}`, {
              stackId,
              disabled,
              timestamp: Date.now(),
              action: 'finalizeStagingStack'
            });
            if (onAccept) {
              onAccept();
            } else {
              console.error(`[STAGING_OVERLAY] No onAccept callback provided for stack ${stackId}`);
            }
          }}
          disabled={disabled}
          accessibilityLabel="Accept staging build"
          accessibilityHint="Accepts and creates the temporary card build"
        >
          <Ionicons name="checkmark-circle" size={24} color="#28a745" />
          <Text style={styles.buttonText}>Accept</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton, disabled && styles.disabled]}
          onPress={() => {
            console.log(`[STAGING_OVERLAY] ❌ CANCEL button pressed for stack ${stackId}`, {
              stackId,
              disabled,
              timestamp: Date.now(),
              action: 'cancelStagingStack'
            });
            if (onReject) {
              onReject();
            } else {
              console.error(`[STAGING_OVERLAY] No onReject callback provided for stack ${stackId}`);
            }
          }}
          disabled={disabled}
          accessibilityLabel="Cancel staging build"
          accessibilityHint="Cancels the card staging and returns cards"
        >
          <Ionicons name="close-circle" size={24} color="#dc3545" />
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Staging indicator */}
      <View style={styles.stagingIndicator}>
        <Text style={styles.indicatorText}>STAGING</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: -50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    pointerEvents: 'none' // Container doesn't block, individual buttons do
  },
  buttonContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#007AFF'
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 4,
    minWidth: 80,
    pointerEvents: 'auto' // Buttons can be pressed
  },
  acceptButton: {
    backgroundColor: '#d4edda',
    borderWidth: 1,
    borderColor: '#28a745'
  },
  rejectButton: {
    backgroundColor: '#f8d7da',
    borderWidth: 1,
    borderColor: '#dc3545'
  },
  disabled: {
    opacity: 0.5
  },
  buttonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center'
  },
  stagingIndicator: {
    marginTop: 8,
    backgroundColor: '#17a2b8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#17a2b8',
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

export default StagingOverlay;

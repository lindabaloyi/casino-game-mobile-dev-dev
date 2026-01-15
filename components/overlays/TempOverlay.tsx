import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TempOverlayProps {
  isVisible: boolean;
  tempId?: string;
  overlayText?: string;  // NEW: Customizable text (default: 'TEMP')
  onAccept: (tempId: string) => void;
  onReject: () => void;
  disabled?: boolean;
}

const TempOverlay: React.FC<TempOverlayProps> = ({
  isVisible,
  tempId,
  overlayText = 'TEMP',  // Default to 'TEMP' for new standard
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
    return null;
  }
  // All temp stacks now show Accept/Cancel buttons (including build augmentations)
  return (
    <Animated.View
      style={[styles.overlayContainer, { opacity: fadeAnim }]}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      {/* Dynamic indicator */}
      <View style={styles.tempIndicator}>
        <Text style={styles.indicatorText}>{overlayText}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton, disabled && styles.disabled]}
          onPress={() => {
            console.log(`[TEMP_OVERLAY] ✅ ACCEPT button pressed for temp ${tempId}`, {
              tempId,
              disabled,
              timestamp: Date.now(),
              action: 'finalizeTemp'
            });
            if (onAccept) {
              onAccept(tempId || 'unknown');
            } else {
              console.error(`[TEMP_OVERLAY] No onAccept callback provided for temp ${tempId}`);
            }
          }}
          disabled={disabled}
          accessibilityLabel="Accept temp"
          accessibilityHint="Accepts and creates the temporary card combination"
        >
          <Ionicons name="checkmark-circle" size={24} color="#28a745" />
          <Text style={styles.buttonText}>Accept</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton, disabled && styles.disabled]}
          onPress={() => {
            console.log(`[TEMP_OVERLAY] ❌ CANCEL button pressed for temp ${tempId}`, {
              tempId,
              disabled,
              timestamp: Date.now(),
              action: 'cancelTemp'
            });
            if (onReject) {
              onReject();
            } else {
              console.error(`[TEMP_OVERLAY] No onReject callback provided for temp ${tempId}`);
            }
          }}
          disabled={disabled}
          accessibilityLabel="Cancel temp"
          accessibilityHint="Cancels the temp and returns cards"
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
    bottom: -70, // Exact position for temp overlay
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
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center'
  },
  tempIndicator: {
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

export default TempOverlay;

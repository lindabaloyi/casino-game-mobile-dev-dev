import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface BuildMergeOverlayProps {
  isVisible: boolean;
  buildId?: string;
  extensionText?: string;  // e.g., "Merge extension into build 5"
  onMerge: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

const BuildMergeOverlay: React.FC<BuildMergeOverlayProps> = ({
  isVisible,
  buildId,
  extensionText = 'MERGE INTO BUILD',
  onMerge,
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
    console.log(`[BUILD_MERGE_OVERLAY] Overlay hidden for build ${buildId || 'unknown'}`);
    return null;
  }

  console.log(`[BUILD_MERGE_OVERLAY] 🔀 Rendering merge overlay for build ${buildId}`, {
    isVisible,
    buildId,
    disabled,
    extensionText,
    hasOnMerge: typeof onMerge === 'function',
    hasOnCancel: typeof onCancel === 'function'
  });

  return (
    <Animated.View
      style={[styles.overlayContainer, { opacity: fadeAnim }]}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      {/* Merge indicator */}
      <View style={styles.mergeIndicator}>
        <Text style={styles.indicatorText}>{extensionText}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.mergeButton, disabled && styles.disabled]}
          onPress={() => {
            console.log(`[BUILD_MERGE_OVERLAY] 🔀 MERGE button pressed for build ${buildId}`, {
              disabled,
              timestamp: Date.now(),
              action: 'mergeBuildExtension'
            });
            if (onMerge) {
              onMerge();
            } else {
              console.error(`[BUILD_MERGE_OVERLAY] Missing onMerge callback for build ${buildId}`);
            }
          }}
          disabled={disabled}
          accessibilityLabel="Merge build extension"
          accessibilityHint="Merges the extension into your existing build instead of creating a new one"
        >
          <Ionicons name="git-merge" size={24} color="#28a745" />
          <Text style={styles.buttonText}>Merge</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton, disabled && styles.disabled]}
          onPress={() => {
            console.log(`[BUILD_MERGE_OVERLAY] ❌ CANCEL button pressed for build ${buildId}`, {
              disabled,
              timestamp: Date.now(),
              action: 'cancelBuildExtension'
            });
            if (onCancel) {
              onCancel();
            } else {
              console.error(`[BUILD_MERGE_OVERLAY] No onCancel callback provided for build ${buildId}`);
            }
          }}
          disabled={disabled}
          accessibilityLabel="Cancel build merge"
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
    bottom: -70, // Exact position for build merge overlay
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
  mergeButton: {
    backgroundColor: '#d1ecf1', // Light blue/cyan for merge operations
    borderWidth: 1,
    borderColor: '#17a2b8'
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
  mergeIndicator: {
    marginTop: 8,
    backgroundColor: '#17a2b8', // Blue for merge operations (distinct from extension blue)
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

export default BuildMergeOverlay;

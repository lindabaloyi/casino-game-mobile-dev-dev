/**
 * StackActionStrip
 * Generic Accept / Cancel button strip shown at the bottom of the table
 * when the current player has a pending stack (temp, build, extend_build).
 *
 * All copy and colours are driven by `constants/stackActions.ts` — adding a
 * new stack type requires only an entry in that config, no UI changes here.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { STACK_CONFIG, StackType } from '../../constants/stackActions';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  /** Which type of pending stack this strip is confirming. */
  stackType: StackType;
  /** The server-side ID of the pending stack. */
  stackId: string;
  onAccept: (stackId: string) => void;
  onCancel: (stackId: string) => void;
  /** Optional callback for button click sound */
  onPlayButtonSound?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StackActionStrip({ stackType, stackId, onAccept, onCancel, onPlayButtonSound }: Props) {
  const config   = STACK_CONFIG[stackType];
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Handle button press with optional sound
  const handleAccept = (id: string) => {
    if (onPlayButtonSound) {
      onPlayButtonSound();
    }
    onAccept(id);
  };

  // Handle button press with optional sound
  const handleCancel = (id: string) => {
    if (onPlayButtonSound) {
      onPlayButtonSound();
    }
    onCancel(id);
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue:  1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.strip, { opacity: fadeAnim }]}>
      {/* Accept / Confirm */}
      <TouchableOpacity
        style={[
          styles.btn,
          { backgroundColor: config.acceptTheme.bg, borderColor: config.acceptTheme.border },
        ]}
        onPress={() => handleAccept(stackId)}
        accessibilityLabel={config.acceptLabel}
      >
        <Text style={styles.btnText}>{config.acceptLabel}</Text>
      </TouchableOpacity>

      {/* Cancel */}
      <TouchableOpacity
        style={[
          styles.btn,
          { backgroundColor: config.cancelTheme.bg, borderColor: config.cancelTheme.border },
        ]}
        onPress={() => handleCancel(stackId)}
        accessibilityLabel={config.cancelLabel}
      >
        <Text style={styles.btnText}>{config.cancelLabel}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  strip: {
    position:      'absolute',
    bottom:        14,
    left:          0,
    right:         0,
    flexDirection: 'row',
    justifyContent:'center',
    gap:           12,
  },
  btn: {
    paddingVertical:   7,
    paddingHorizontal: 20,
    borderRadius:      20,
    borderWidth:       1.5,
    alignItems:        'center',
    justifyContent:    'center',
  },
  btnText: {
    fontSize:   13,
    fontWeight: '700',
    color:      '#333',
  },
});

export default StackActionStrip;

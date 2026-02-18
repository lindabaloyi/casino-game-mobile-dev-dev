/**
 * TempStackOverlay
 * Accept / Cancel buttons shown on a temp stack when it is the owner's turn.
 *
 * Accept → server advances turn, temp stack stays on table
 * Cancel → server dissolves the stack, cards return to hand/table
 *
 * Rendered as an absolutely-positioned strip below the stacked cards
 * inside TempStackView.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  stackId: string;
  onAccept: (stackId: string) => void;
  onCancel:  (stackId: string) => void;
}

export function TempStackOverlay({ stackId, onAccept, onCancel }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* TEMP badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>TEMP</Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.btn, styles.acceptBtn]}
          onPress={() => onAccept(stackId)}
          accessibilityLabel="Accept temp stack"
        >
          <Text style={styles.btnText}>✓</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.cancelBtn]}
          onPress={() => onCancel(stackId)}
          accessibilityLabel="Cancel temp stack"
        >
          <Text style={styles.btnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,           // just below the 96px card stack
    left: -10,          // extend slightly beyond the 70px container so buttons aren't cramped
    right: -10,
    alignItems: 'center',
    zIndex: 10,
  },
  badge: {
    backgroundColor: '#17a2b8',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 6,
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  acceptBtn: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  cancelBtn: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  btnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default TempStackOverlay;

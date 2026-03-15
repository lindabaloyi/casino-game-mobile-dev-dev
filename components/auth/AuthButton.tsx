/**
 * AuthButton Component
 * Styled button for authentication forms (gold with green text)
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function AuthButton({ title, onPress, loading, disabled, style }: AuthButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color="#0f4d0f" />
      ) : (
        <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    marginVertical: 8,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255, 215, 0, 0.5)',
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  buttonText: {
    color: '#0f4d0f',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextDisabled: {
    color: 'rgba(15, 77, 15, 0.5)',
  },
});

export default AuthButton;

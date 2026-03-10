/**
 * StatusSection
 * 
 * Displays current lobby status - waiting, ready, or error.
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type StatusType = 'waiting' | 'ready' | 'error';

interface StatusSectionProps {
  status: StatusType;
  message: string;
}

export function StatusSection({ status, message }: StatusSectionProps) {
  if (status === 'waiting') {
    return (
      <View style={styles.waiting}>
        <ActivityIndicator size="small" color="#FFD700" />
        <Text style={styles.waitingText}>{message}</Text>
      </View>
    );
  }

  if (status === 'ready') {
    return (
      <View style={styles.ready}>
        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
        <Text style={styles.readyText}>{message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.error}>
      <Ionicons name="alert-circle" size={20} color="#FFC107" />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  waitingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginLeft: 10,
  },
  ready: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  readyText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  errorText: {
    color: '#FFC107',
    fontSize: 14,
    marginLeft: 10,
  },
});

export default StatusSection;

/**
 * HeaderButtons Component
 * Burger menu button and notification bell for HomeScreen
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderButtonsProps {
  onMenuPress: () => void;
  onNotificationPress: () => void;
  unreadCount: number;
}

export function HeaderButtons({ 
  onMenuPress, 
  onNotificationPress, 
  unreadCount 
}: HeaderButtonsProps) {
  return (
    <View style={styles.container}>
      {/* Burger Menu Button */}
      <TouchableOpacity 
        style={styles.menuButton} 
        onPress={onMenuPress}
      >
        <Ionicons name="menu" size={26} color="white" />
      </TouchableOpacity>

      {/* Notification Bell */}
      <TouchableOpacity 
        style={styles.notificationButton} 
        onPress={onNotificationPress}
      >
        <Ionicons name="notifications" size={24} color="white" />
        {unreadCount > 0 && (
          <View style={styles.notificationBadge}>
            <Ionicons 
              name={unreadCount > 9 ? "notifications" : undefined}
              size={10}
              color="white"
            >
              {unreadCount > 9 ? undefined : unreadCount}
            </Ionicons>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  menuButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 10,
    borderRadius: 10,
  },
  notificationButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 10,
    borderRadius: 10,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
});

export default HeaderButtons;

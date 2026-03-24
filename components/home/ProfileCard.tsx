/**
 * ProfileCard Component
 * Compact profile preview shown on HomeScreen
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Debug logging for diagnosing stretching issues
const DEBUG = __DEV__;
if (DEBUG) {
  console.log('[ProfileCard] Component loaded - Platform:', Platform.OS);
}

interface ProfileCardProps {
  profile: {
    username: string;
    wins: number;
    losses: number;
  };
  currentAvatar: {
    id: string;
    emoji: string;
  };
  winRate: number;
  onPress: () => void;
}

export function ProfileCard({ 
  profile, 
  currentAvatar, 
  winRate, 
  onPress 
}: ProfileCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  
  // Debug: Log screen dimensions for diagnosing stretch issues
  if (DEBUG) {
    console.log('[ProfileCard] Screen width:', screenWidth, 'Platform:', Platform.OS);
  }
  
  // Calculate max width to prevent stretching on wide Android screens
  // Use 60% of screen width, but cap at 280px for tablets and 220px for phones
  const cardMaxWidth = Math.min(screenWidth * 0.6, screenWidth > 400 ? 280 : 220);
  
  // Calculate responsive values based on screen width
  const fontSizeScale = screenWidth / 400; // Base scale on 400px width
  const responsiveFontSize = Math.max(10, Math.min(15, 12 * fontSizeScale));
  const responsiveNameSize = Math.max(13, Math.min(18, 15 * fontSizeScale));
  const responsiveIconSize = Math.max(16, Math.min(24, 20 * fontSizeScale));
  const avatarSize = Math.max(32, Math.min(44, 38 * fontSizeScale));
  const horizontalPadding = Math.max(4, Math.min(8, 6 * fontSizeScale));
  
  if (DEBUG) {
    console.log('[ProfileCard] Calculated maxWidth:', cardMaxWidth);
    console.log('[ProfileCard] Responsive fontSize:', responsiveFontSize, 'iconSize:', responsiveIconSize);
  }
  
  return (
    <TouchableOpacity 
      style={[styles.container, { width: cardMaxWidth, padding: horizontalPadding }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.profileLeft}>
        <View style={[
          styles.avatarContainer,
          { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
        ]}>
          <Text style={{ fontSize: avatarSize * 0.55 }}>{currentAvatar.emoji}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { fontSize: responsiveNameSize }]} numberOfLines={1}>
            {profile.username}
          </Text>
          <View style={styles.statsRow}>
            <View style={[styles.statBadge, { paddingHorizontal: horizontalPadding }]}>
              <Text style={[styles.statBadgeText, { fontSize: responsiveFontSize }]}>W: {profile.wins}</Text>
            </View>
            <View style={[styles.statBadge, styles.lossBadge, { paddingHorizontal: horizontalPadding }]}>
              <Text style={[styles.statBadgeText, { fontSize: responsiveFontSize }]}>L: {profile.losses}</Text>
            </View>
            <View style={[styles.statBadge, styles.winRateBadge, { paddingHorizontal: horizontalPadding }]}>
              <Text style={[styles.statBadgeText, { fontSize: responsiveFontSize }]}>{winRate}%</Text>
            </View>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={responsiveIconSize} color="rgba(255, 255, 255, 0.5)" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    zIndex: 10,
    // Ensure proper aspect ratio and prevent stretching
    maxWidth: 280,
    minWidth: 180,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  statsRow: {
    flexDirection: 'row',
    // Use margin instead of gap for Android compatibility
    // gap: 5 is not supported on older Android versions
  },
  statBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginRight: 5, // Fallback for gap - last item will have margin handled by parent
  },
  lossBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
  },
  winRateBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  statBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default ProfileCard;

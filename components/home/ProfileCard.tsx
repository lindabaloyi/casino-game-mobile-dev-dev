/**
 * ProfileCard Component
 * Compact profile preview shown on HomeScreen
 * Updated design matching the new HTML mockup
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  
  // Calculate responsive values
  const cardMaxWidth = Math.min(screenWidth * 0.55, screenWidth > 400 ? 260 : 220);
  const fontSizeScale = screenWidth / 400;
  const responsiveNameSize = Math.max(12, Math.min(16, 14 * fontSizeScale));
  const responsiveStatSize = Math.max(10, Math.min(12, 11 * fontSizeScale));
  const avatarSize = Math.max(32, Math.min(40, 36 * fontSizeScale));
  
  return (
    <TouchableOpacity 
      style={[styles.container, { width: cardMaxWidth }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { width: avatarSize, height: avatarSize }]}>
        <Text style={{ fontSize: avatarSize * 0.5 }}>{currentAvatar.emoji}</Text>
      </View>
      
      {/* Name & Stats */}
      <View style={styles.profileInfo}>
        <Text style={[styles.profileName, { fontSize: responsiveNameSize }]} numberOfLines={1}>
          {profile.username}
        </Text>
        <View style={styles.statsRow}>
          <View style={[styles.statPill, styles.statW]}>
            <Text style={[styles.statText, { fontSize: responsiveStatSize }]}>W: {profile.wins}</Text>
          </View>
          <View style={[styles.statPill, styles.statL]}>
            <Text style={[styles.statText, { fontSize: responsiveStatSize }]}>L: {profile.losses}</Text>
          </View>
          <View style={[styles.statPill, styles.statPct]}>
            <Text style={[styles.statText, { fontSize: responsiveStatSize }]}>{winRate}%</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 45,
    right: 62, // Make room for notification button
    backgroundColor: '#0f3318',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#2a6632',
    zIndex: 10,
  },
  avatar: {
    backgroundColor: '#2a6632',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: '#f5c842',
    fontWeight: '600',
    lineHeight: 17,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 3,
  },
  statPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statW: {
    backgroundColor: '#2a5c20',
  },
  statL: {
    backgroundColor: '#3a1a1a',
  },
  statPct: {
    backgroundColor: '#2a4a20',
  },
  statText: {
    fontWeight: '600',
    color: '#a8d87a',
  },
});

export default ProfileCard;

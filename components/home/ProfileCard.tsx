/**
 * ProfileCard Component
 * Compact profile preview shown on HomeScreen
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
  const avatarSize = 38;
  
  return (
    <TouchableOpacity 
      style={styles.container} 
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
          <Text style={styles.profileName} numberOfLines={1}>
            {profile.username}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>W: {profile.wins}</Text>
            </View>
            <View style={[styles.statBadge, styles.lossBadge]}>
              <Text style={styles.statBadgeText}>L: {profile.losses}</Text>
            </View>
            <View style={[styles.statBadge, styles.winRateBadge]}>
              <Text style={styles.statBadgeText}>{winRate}%</Text>
            </View>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
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
    gap: 5,
  },
  statBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
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

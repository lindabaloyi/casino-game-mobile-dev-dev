/**
 * PlayerCard
 * 
 * Reusable player display card for lobby.
 * Shows avatar, name, ready status, and optional ping.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PlayerCardProps {
  avatar: string;
  username: string;
  isReady: boolean;
  ping?: number;
  isEmpty?: boolean;
  slotNumber?: number;
}

const AVATAR_EMOJI_MAP: Record<string, string> = {
  '🦊': '🦊', '🐼': '🐼', '🦁': '🦁', '🐯': '🐯',
  '🐵': '🐵', '🐸': '🐸', '🦄': '🦄', '🐲': '🐲',
};

function getAvatarEmoji(avatarId: string): string {
  return AVATAR_EMOJI_MAP[avatarId] || '🎮';
}

function getPingColor(ping: number): string {
  if (ping < 100) return '#4CAF50';
  if (ping < 200) return '#FFC107';
  return '#F44336';
}

function getPingIcon(ping: number): 'wifi' | 'wifi-outline' {
  return ping < 200 ? 'wifi' : 'wifi-outline';
}

export function PlayerCard({ 
  avatar, 
  username, 
  isReady, 
  ping, 
  isEmpty = false,
  slotNumber 
}: PlayerCardProps) {
  if (isEmpty) {
    return (
      <View style={[styles.card, styles.cardEmpty]}>
        <View style={[styles.avatar, styles.avatarEmpty]}>
          <Ionicons name="person-outline" size={24} color="rgba(255,255,255,0.3)" />
        </View>
        <Text style={styles.nameEmpty}>Waiting...</Text>
        <Text style={styles.slotText}>Player {slotNumber !== undefined ? slotNumber + 1 : '?'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getAvatarEmoji(avatar)}</Text>
        <View style={[
          styles.readyIndicator,
          isReady ? styles.readyIndicatorReady : styles.readyIndicatorNotReady
        ]}>
          <Ionicons 
            name={isReady ? "checkmark" : "time-outline"} 
            size={12} 
            color="white" 
          />
        </View>
      </View>
      <Text style={styles.name} numberOfLines={1}>{username}</Text>
      
      {ping !== undefined && (
        <View style={styles.status}>
          <View style={styles.pingBadge}>
            <Ionicons 
              name={getPingIcon(ping)} 
              size={12} 
              color={getPingColor(ping)} 
            />
            <Text style={styles.pingText}>{ping}ms</Text>
          </View>
        </View>
      )}
      
      <Text style={[
        styles.readyText,
        isReady ? styles.readyTextReady : styles.readyTextNotReady
      ]}>
        {isReady ? 'READY' : 'NOT READY'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  cardEmpty: {
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarEmpty: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarText: {
    fontSize: 28,
  },
  readyIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readyIndicatorReady: {
    backgroundColor: '#4CAF50',
  },
  readyIndicatorNotReady: {
    backgroundColor: '#FF9800',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  nameEmpty: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 4,
    textAlign: 'center',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pingText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 3,
  },
  readyText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  readyTextReady: {
    color: '#4CAF50',
  },
  readyTextNotReady: {
    color: '#FF9800',
  },
  slotText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.3)',
  },
});

export default PlayerCard;

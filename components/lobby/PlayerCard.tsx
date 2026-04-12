/**
 * PlayerCard
 * 
 * Reusable player display card for lobby.
 * Shows avatar, name, ready status, and optional ping.
 * 
 * Updated to support both object-based and individual prop interfaces.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PlayerData {
  id: string;
  username: string;
  avatar: string;
  isReady: boolean;
  isConnected: boolean;
  ping: number;
}

interface PlayerCardProps {
  player?: PlayerData;
  isOwn?: boolean;
  slotIndex?: number;
  placeholderName?: string; // For dynamic slot names
  avatarEmoji?: string;
  pingColor?: (ping: number) => string;
  pingIcon?: (ping: number) => any;
  // Legacy props for backward compatibility
  avatar?: string;
  username?: string;
  isReady?: boolean;
  ping?: number;
  isEmpty?: boolean;
  slotNumber?: number;
}

// Default ping color/icon functions
const defaultGetPingColor = (ping: number): string => {
  if (ping < 100) return '#4CAF50';
  if (ping < 200) return '#FFC107';
  return '#F44336';
};

const defaultGetPingIcon = (ping: number): 'wifi' | 'wifi-outline' => {
  return ping < 200 ? 'wifi' : 'wifi-outline';
};

// Avatar emoji mapping
const AVATAR_EMOJI_MAP: Record<string, string> = {
  'lion': '🦁', 'tiger': '🐯', 'elephant': '🐘', 'monkey': '🐵',
  'panda': '🐼', 'fox': '🦊', 'wolf': '🐺', 'bear': '🐻',
};

function getAvatarEmoji(avatarId: string): string {
  return AVATAR_EMOJI_MAP[avatarId] || '🎮';
}

export function PlayerCard({ 
  player,
  isOwn,
  slotIndex,
  placeholderName,
  avatarEmoji,
  pingColor = defaultGetPingColor,
  pingIcon = defaultGetPingIcon,
  // Legacy props
  avatar,
  username: usernameProp,
  isReady: isReady,
  ping,
  isEmpty,
  slotNumber,
}: PlayerCardProps) {
  // Handle new object-based interface
  if (player) {
    const isPlayerReady = player.isReady;
    // Use player username if available, otherwise use placeholderName
    // If no player.username and no placeholderName, default to slot-based name
    let displayName: string;
    if (player.username && player.username.trim()) {
      displayName = player.username;
    } else if (placeholderName) {
      displayName = placeholderName;
    } else if (isOwn) {
      displayName = 'You';
    } else {
      displayName = `Player ${(slotIndex ?? 0) + 1}`;
    }
    
    const emoji = avatarEmoji || getAvatarEmoji(player.avatar);

    return (
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{emoji}</Text>
          <View style={[
            styles.readyIndicator,
            isPlayerReady ? styles.readyIndicatorReady : styles.readyIndicatorNotReady
          ]}>
            <Ionicons 
              name={isPlayerReady ? "checkmark" : "time-outline"} 
              size={12} 
              color="white" 
            />
          </View>
        </View>
        <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
        
        <View style={styles.status}>
          <View style={styles.pingBadge}>
            <Ionicons 
              name={pingIcon(player.ping)} 
              size={12} 
              color={pingColor(player.ping)} 
            />
            <Text style={styles.pingText}>{player.ping}ms</Text>
          </View>
        </View>
        
        <Text style={[
          styles.readyText,
          isPlayerReady ? styles.readyTextReady : styles.readyTextNotReady
        ]}>
          {isPlayerReady ? 'READY' : 'NOT READY'}
        </Text>
      </View>
    );
  }

  // Handle empty slot (new interface)
  if (slotIndex !== undefined) {
    const displayName = placeholderName || `Player ${slotIndex + 1}`;
    
    return (
      <View style={[styles.card, styles.cardEmpty]}>
        <View style={[styles.avatar, styles.avatarEmpty]}>
          <Ionicons name="person-outline" size={24} color="rgba(255,255,255,0.3)" />
        </View>
        <Text style={styles.nameEmpty}>Waiting...</Text>
        <Text style={styles.slotText}>{displayName}</Text>
      </View>
    );
  }

  // Handle legacy props for backward compatibility
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

  // Legacy filled slot
  const finalUsername = usernameProp || 'Player';
  const finalAvatarEmoji = avatar ? getAvatarEmoji(avatar) : '🎮';
  const finalPing = ping ?? 0;

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{finalAvatarEmoji}</Text>
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
      <Text style={styles.name} numberOfLines={1}>{finalUsername}</Text>
      
      {ping !== undefined && (
        <View style={styles.status}>
          <View style={styles.pingBadge}>
            <Ionicons 
              name={defaultGetPingIcon(finalPing)} 
              size={12} 
              color={defaultGetPingColor(finalPing)} 
            />
            <Text style={styles.pingText}>{finalPing}ms</Text>
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
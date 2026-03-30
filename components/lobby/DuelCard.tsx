/**
 * DuelCard
 * 
 * VS card display for 2-hands mode (1v1).
 * Shows local player on left, opponent on right.
 * 
 * Updated to support dynamic player names based on game mode.
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameMode } from '../../utils/modeConfig';

interface PlayerData {
  id: string;
  username: string;
  avatar: string;
  isReady: boolean;
  isConnected: boolean;
  ping: number;
}

interface DuelCardProps {
  // New object-based props
  player?: PlayerData;
  opponent?: PlayerData;
  isOwn?: boolean;
  slotIndex?: number;
  placeholderName?: string;
  opponentPlaceholderName?: string;
  mode?: GameMode;
  // Loading state - when true, show loading instead of fallback
  isLoading?: boolean;
  opponentIsLoading?: boolean;
  // Legacy props for backward compatibility
  playerName?: string;
  playerAvatar?: string;
  isReady?: boolean;
  opponentReady?: boolean;
  playersInLobby?: number;
  requiredPlayers?: number;
}

const AVATAR_EMOJI_MAP: Record<string, string> = {
  'lion': '🦁', 'tiger': '🐯', 'elephant': '🐘', 'monkey': '🐵',
  'panda': '🐼', 'fox': '🦊', 'wolf': '🐺', 'bear': '🐻',
  '🦊': '🦊', '🐼': '🐼', '🦁': '🦁', '🐯': '🐯',
  '🐵': '🐵', '🐸': '🐸', '🦄': '🦄', '🐲': '🐲',
};

function getAvatarEmoji(avatarId: string): string {
  return AVATAR_EMOJI_MAP[avatarId] || '🎮';
}

// Get dynamic placeholder name based on game mode and slot
function getSlotPlaceholder(slotIndex: number, mode: GameMode | undefined): string {
  if (slotIndex === 0) {
    return 'You';
  }
  
  const placeholders: Record<string, string[]> = {
    'two-hands': ['You', 'Opponent'],
    'three-hands': ['You', 'Player 2', 'Player 3'],
    'four-hands': ['You', 'Player 2', 'Player 3', 'Player 4'],
    'party': ['You', 'Teammate 1', 'Opponent 1', 'Opponent 2'],
    'freeforall': ['You', 'Player 2', 'Player 3', 'Player 4'],
    'tournament': ['You', 'Player 2', 'Player 3', 'Player 4'],
  };
  
  const modeKey = mode || 'two-hands';
  return placeholders[modeKey]?.[slotIndex] || `Player ${slotIndex + 1}`;
}

// Determine display name with fallback chain
function getDisplayName(
  player: PlayerData | undefined,
  isOwn: boolean | undefined,
  slotIndex: number | undefined,
  placeholderName: string | undefined,
  mode: GameMode | undefined,
  defaultName: string
): string {
  if (player?.username && player.username.trim()) {
    return player.username;
  }
  if (placeholderName) {
    return placeholderName;
  }
  if (isOwn) {
    return 'You';
  }
  if (slotIndex !== undefined) {
    return getSlotPlaceholder(slotIndex, mode);
  }
  return defaultName;
}

export function DuelCard({ 
  // New props
  player,
  opponent,
  isOwn = false,
  slotIndex = 0,
  placeholderName,
  opponentPlaceholderName,
  mode,
  isLoading = false,
  opponentIsLoading = false,
  // Legacy props
  playerName, 
  playerAvatar, 
  isReady: isReadyProp, 
  opponentReady: opponentReadyProp,
  playersInLobby = 0,
  requiredPlayers = 2
}: DuelCardProps) {
  // For 2-player mode, show traditional VS layout
  // For 3+ player modes, show player count progress
  const showPlayerProgress = requiredPlayers > 2;
  
  // Handle new object-based interface
  const hasPlayerData = player !== undefined;
  const hasOpponentData = opponent !== undefined;
  
  // Determine names with fallback logic - NO FALLBACK to placeholders when loading
  // If loading, show "Loading..." - don't use placeholders
  let localPlayerName: string;
  if (isLoading || !hasPlayerData) {
    localPlayerName = 'Loading...';
  } else if (player?.username && player.username.trim()) {
    localPlayerName = player.username;
  } else {
    localPlayerName = placeholderName || 'You';
  }
  
  let opponentPlayerName: string;
  if (opponentIsLoading || !hasOpponentData) {
    opponentPlayerName = 'Loading...';
  } else if (opponent?.username && opponent.username.trim()) {
    opponentPlayerName = opponent.username;
  } else {
    opponentPlayerName = opponentPlaceholderName || 'Opponent';
  }
  
  // Determine ready states
  const localReady = hasPlayerData ? (player?.isReady ?? false) : (isReadyProp ?? false);
  const oppReady = hasOpponentData ? (opponent?.isReady ?? false) : (opponentReadyProp ?? false);
  
  // Determine avatars
  const localAvatar = hasPlayerData 
    ? getAvatarEmoji(player?.avatar || 'lion') 
    : getAvatarEmoji(playerAvatar || 'lion');
  const opponentAvatar = hasOpponentData
    ? getAvatarEmoji(opponent?.avatar || 'lion')
    : (opponentReadyProp ? '👤' : '');
  
  // Check if should show loading state for local player
  const showLocalLoading = isLoading || (!hasPlayerData && playersInLobby === 0);
  // Check if should show loading state for opponent
  const showOpponentLoading = opponentIsLoading || (!hasOpponentData && playersInLobby < 2);
  
  return (
    <View style={styles.card}>
      {showPlayerProgress ? (
        // Multi-player mode: Show progress
        <View style={styles.progressContainer}>
          <Text style={styles.progressTitle}>Waiting for Players</Text>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill, 
              { width: `${Math.min((playersInLobby / requiredPlayers) * 100, 100)}%` }
            ]} />
          </View>
          <Text style={styles.progressText}>
            {playersInLobby} / {requiredPlayers} players
          </Text>
        </View>
      ) : (
        // 2-player mode: Show VS layout
        <View style={styles.vsContainer}>
          {/* Player Side */}
          <View style={styles.playerSide}>
            <View style={[styles.avatar, showLocalLoading && styles.avatarEmpty]}>
              {showLocalLoading ? (
                <ActivityIndicator size="small" color="#FFD700" />
              ) : (
                <Text style={styles.avatarText}>{localAvatar}</Text>
              )}
              {!showLocalLoading && (
                <View style={[
                  styles.readyIndicator,
                  localReady ? styles.readyIndicatorReady : styles.readyIndicatorNotReady
                ]}>
                  <Ionicons 
                    name={localReady ? "checkmark" : "time-outline"} 
                    size={12} 
                    color="white" 
                  />
                </View>
              )}
            </View>
            <Text style={[styles.playerName, showLocalLoading && styles.playerNameLoading]} numberOfLines={1}>
              {localPlayerName}
            </Text>
            {!showLocalLoading && (
              <Text style={[
                styles.readyLabel,
                localReady ? styles.readyLabelReady : styles.readyLabelNotReady
              ]}>
                {localReady ? 'READY' : 'NOT READY'}
              </Text>
            )}
          </View>
          
          {/* VS */}
          <View style={styles.vsCenter}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          
          {/* Opponent Side */}
          <View style={styles.playerSide}>
            <View style={[
              styles.avatar,
              showOpponentLoading ? styles.avatarEmpty : (!oppReady && styles.avatarEmpty)
            ]}>
              {showOpponentLoading ? (
                <ActivityIndicator size="small" color="#FFD700" />
              ) : oppReady ? (
                <Text style={styles.avatarText}>{opponentAvatar}</Text>
              ) : (
                <Ionicons name="person-outline" size={28} color="rgba(255,255,255,0.3)" />
              )}
              {!showOpponentLoading && oppReady && (
                <View style={[
                  styles.readyIndicator,
                  styles.readyIndicatorReady
                ]}>
                  <Ionicons name="checkmark" size={12} color="white" />
                </View>
              )}
            </View>
            <Text style={[styles.playerName, showOpponentLoading && styles.playerNameLoading]}>
              {opponentPlayerName}
            </Text>
            {!showOpponentLoading && (
              <Text style={[
                styles.readyLabel,
                oppReady ? styles.readyLabelReady : styles.readyLabelNotReady
              ]}>
                {oppReady ? 'READY' : 'NOT READY'}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  // Progress bar styles for multi-player modes
  progressContainer: {
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  vsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  playerSide: {
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarEmpty: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarText: {
    fontSize: 36,
  },
  readyIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readyIndicatorReady: {
    backgroundColor: '#4CAF50',
  },
  readyIndicatorNotReady: {
    backgroundColor: '#FF9800',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  playerNameLoading: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
  },
  readyLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  readyLabelReady: {
    color: '#4CAF50',
  },
  readyLabelNotReady: {
    color: '#FF9800',
  },
  vsCenter: {
    paddingHorizontal: 15,
  },
  vsText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
});

export default DuelCard;

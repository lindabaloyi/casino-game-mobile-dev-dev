/**
 * GameOpponentsMenu
 * 
 * Dropdown panel showing game options and list of opponents.
 * Part of the in-game home menu system.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AVATAR_OPTIONS } from '../../hooks/usePlayerProfile';

interface GameOpponentsMenuProps {
  /** Current player's index (0-3) */
  playerNumber: number;
  /** List of players in the game */
  players: any[];
  /** Callback when user wants to quit the game */
  onQuitGame: () => void;
  /** Callback when user taps on an opponent */
  onOpponentPress: (playerIndex: number) => void;
  /** Callback to close the menu */
  onClose: () => void;
}

export function GameOpponentsMenu({
  playerNumber,
  players,
  onQuitGame,
  onOpponentPress,
  onClose,
}: GameOpponentsMenuProps) {
  // Get opponent players (excluding self)
  const opponents = players.filter((_, index) => index !== playerNumber);

  const getAvatarEmoji = (avatarId: string) => {
    const avatar = AVATAR_OPTIONS.find((a) => a.id === avatarId);
    return avatar?.emoji || '🎮';
  };

  const getPlayerName = (player: any, index: number) => {
    if (player?.username) return player.username;
    if (player?.name) return player.name;
    return `Player ${index + 1}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Quit Game Option */}
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => {
          onClose();
          onQuitGame();
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="exit-outline" size={22} color="#ff6b6b" />
        <Text style={[styles.menuItemText, { color: '#ff6b6b' }]}>
          Quit Game
        </Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* Opponents Section */}
      <Text style={styles.sectionTitle}>Opponents</Text>

      {opponents.length > 0 ? (
        <ScrollView 
          style={styles.opponentsList}
          showsVerticalScrollIndicator={false}
        >
          {opponents.map((player, idx) => {
            const actualIndex = playerNumber < idx + 1 ? idx : idx + 1;
            return (
              <TouchableOpacity
                key={`opponent-${actualIndex}`}
                style={styles.opponentItem}
                onPress={() => onOpponentPress(actualIndex)}
                activeOpacity={0.7}
              >
                <View style={styles.opponentAvatar}>
                  <Text style={styles.opponentAvatarText}>
                    {getAvatarEmoji(player?.avatar)}
                  </Text>
                </View>
                <View style={styles.opponentInfo}>
                  <Text style={styles.opponentName} numberOfLines={1}>
                    {getPlayerName(player, actualIndex)}
                  </Text>
                  <Text style={styles.opponentTapHint}>Tap to view profile</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.noOpponents}>
          <Text style={styles.noOpponentsText}>No other players</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 220,
    maxHeight: 350,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  opponentsList: {
    maxHeight: 200,
  },
  opponentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  opponentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  opponentAvatarText: {
    fontSize: 18,
  },
  opponentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  opponentName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  opponentTapHint: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  noOpponents: {
    padding: 16,
    alignItems: 'center',
  },
  noOpponentsText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
  },
});

export default GameOpponentsMenu;

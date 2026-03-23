/**
 * OpponentProfileModal
 * 
 * Minimal modal showing opponent details during a game.
 * Allows viewing profile and sending friend requests/messages.
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AVATAR_OPTIONS } from '../../hooks/usePlayerProfile';

interface OpponentProfileModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Opponent player data */
  opponent: {
    username?: string;
    avatar?: string;
    stats?: {
      wins?: number;
      losses?: number;
      totalGames?: number;
      rank?: number | null;
    };
    userId?: string;
  } | null;
  /** Whether this opponent is already a friend */
  isFriend: boolean;
  /** Whether there's already a pending friend request */
  isPendingRequest: boolean;
  /** Loading state for friend actions */
  isLoading: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback to send friend request */
  onSendFriendRequest: () => void;
  /** Callback to send message (placeholder for future) */
  onSendMessage?: () => void;
}

export function OpponentProfileModal({
  visible,
  opponent,
  isFriend,
  isPendingRequest,
  isLoading,
  onClose,
  onSendFriendRequest,
  onSendMessage,
}: OpponentProfileModalProps) {
  if (!opponent) return null;

  const getAvatarEmoji = (avatarId?: string) => {
    const avatar = AVATAR_OPTIONS.find((a) => a.id === avatarId);
    return avatar?.emoji || '🎮';
  };

  const username = opponent.username || 'Unknown Player';
  const avatarEmoji = getAvatarEmoji(opponent.avatar);
  const stats = opponent.stats || {};
  const wins = stats.wins || 0;
  const losses = stats.losses || 0;
  const totalGames = stats.totalGames || 0;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const rank = stats.rank;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.modalContent}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>

          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
          </View>

          {/* Username */}
          <Text style={styles.username}>{username}</Text>

          {/* Rank Badge */}
          {rank && (
            <View style={styles.rankBadge}>
              <Ionicons name="trophy" size={14} color="#FFD700" />
              <Text style={styles.rankText}>Rank #{rank}</Text>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalGames}</Text>
              <Text style={styles.statLabel}>Games</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{wins}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{losses}</Text>
              <Text style={styles.statLabel}>Losses</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>{winRate}%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFD700" />
            ) : isFriend ? (
              <View style={styles.friendBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.friendText}>Friend</Text>
              </View>
            ) : isPendingRequest ? (
              <View style={styles.pendingBadge}>
                <Ionicons name="time-outline" size={20} color="#FFC107" />
                <Text style={styles.pendingText}>Request Sent</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={onSendFriendRequest}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-add-outline" size={20} color="#FFD700" />
                  <Text style={styles.actionButtonText}>Add Friend</Text>
                </TouchableOpacity>

                {onSendMessage && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.secondaryButton]}
                    onPress={onSendMessage}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chatbubble-outline" size={20} color="white" />
                    <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                      Message
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '85%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 10,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  avatarEmoji: {
    fontSize: 40,
  },
  username: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginBottom: 16,
  },
  rankText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#1B5E20',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 0,
  },
  secondaryButtonText: {
    color: 'white',
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  friendText: {
    color: '#4CAF50',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  pendingText: {
    color: '#FFC107',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default OpponentProfileModal;

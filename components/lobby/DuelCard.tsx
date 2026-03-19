/**
 * DuelCard
 * 
 * VS card display for 2-hands mode (1v1).
 * Shows local player on left, opponent on right.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DuelCardProps {
  playerName: string;
  playerAvatar: string;
  isReady: boolean;
  opponentReady: boolean;
}

const AVATAR_EMOJI_MAP: Record<string, string> = {
  '🦊': '🦊', '🐼': '🐼', '🦁': '🦁', '🐯': '🐯',
  '🐵': '🐵', '🐸': '🐸', '🦄': '🦄', '🐲': '🐲',
};

function getAvatarEmoji(avatarId: string): string {
  return AVATAR_EMOJI_MAP[avatarId] || '🎮';
}

export function DuelCard({ 
  playerName, 
  playerAvatar, 
  isReady, 
  opponentReady 
}: DuelCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.vsContainer}>
        {/* Player Side */}
        <View style={styles.playerSide}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getAvatarEmoji(playerAvatar)}</Text>
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
          <Text style={styles.playerName} numberOfLines={1}>
            {playerName}
          </Text>
          <Text style={[
            styles.readyLabel,
            isReady ? styles.readyLabelReady : styles.readyLabelNotReady
          ]}>
            {isReady ? 'READY' : 'NOT READY'}
          </Text>
        </View>
        
        {/* VS */}
        <View style={styles.vsCenter}>
          <Text style={styles.vsText}>VS</Text>
        </View>
        
        {/* Opponent Side */}
        <View style={styles.playerSide}>
          <View style={[
            styles.avatar,
            !opponentReady && styles.avatarEmpty
          ]}>
            {opponentReady ? (
              <Text style={styles.avatarText}>👤</Text>
            ) : (
              <Ionicons name="person-outline" size={28} color="rgba(255,255,255,0.3)" />
            )}
            {opponentReady && (
              <View style={[
                styles.readyIndicator,
                styles.readyIndicatorReady
              ]}>
                <Ionicons name="checkmark" size={12} color="white" />
              </View>
            )}
          </View>
          <Text style={styles.playerName}>
            {opponentReady ? 'Opponent' : 'Waiting...'}
          </Text>
          <Text style={[
            styles.readyLabel,
            opponentReady ? styles.readyLabelReady : styles.readyLabelNotReady
          ]}>
            {opponentReady ? 'READY' : 'NOT READY'}
          </Text>
        </View>
      </View>
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

/**
 * CapturedCardsView
 * Displays captured cards on the sides of the table area.
 * 
 * - Left side: Player's own captures (view only)
 * - Right side: Opponent's captures (draggable)
 * - Shows the TOP card (last in array = most recently captured)
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from './types';

interface CapturedCardsViewProps {
  /** Cards captured by the player */
  playerCaptures: Card[];
  /** Cards captured by the opponent */
  opponentCaptures: Card[];
  /** Player number (0 or 1) */
  playerNumber: number;
}

export function CapturedCardsView({
  playerCaptures,
  opponentCaptures,
  playerNumber,
}: CapturedCardsViewProps) {
  const playerLabel = playerNumber === 0 ? 'P1' : 'P2';
  const opponentLabel = playerNumber === 0 ? 'P2' : 'P1';

  // Get the top card (last in array = most recently captured)
  const playerTopCard = playerCaptures.length > 0 
    ? playerCaptures[playerCaptures.length - 1] 
    : null;
  const opponentTopCard = opponentCaptures.length > 0 
    ? opponentCaptures[opponentCaptures.length - 1] 
    : null;

  return (
    <View style={styles.container}>
      {/* Player's captures (left side) - view only */}
      <View style={styles.captureSection}>
        <Text style={styles.label}>{playerLabel}</Text>
        <View style={styles.cardContainer}>
          {playerTopCard ? (
            <PlayingCard 
              rank={playerTopCard.rank} 
              suit={playerTopCard.suit} 
            />
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>-</Text>
            </View>
          )}
        </View>
        <Text style={styles.count}>{playerCaptures.length}</Text>
      </View>

      {/* Opponent's captures (right side) - draggable indicator */}
      <View style={styles.captureSection}>
        <Text style={styles.label}>{opponentLabel}</Text>
        <View style={styles.cardContainer}>
          {opponentTopCard ? (
            <PlayingCard 
              rank={opponentTopCard.rank} 
              suit={opponentTopCard.suit} 
            />
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>-</Text>
            </View>
          )}
        </View>
        <Text style={styles.count}>{opponentCaptures.length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    pointerEvents: 'none',
  },
  captureSection: {
    alignItems: 'center',
    width: 70,
  },
  label: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardContainer: {
    width: 56,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    width: 56,
    height: 84,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 24,
  },
  count: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
});

export default CapturedCardsView;

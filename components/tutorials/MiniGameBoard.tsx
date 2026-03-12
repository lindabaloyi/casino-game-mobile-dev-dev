/**
 * MiniGameBoard Component
 * 
 * A simplified game table for tutorials.
 * Shows table cards, player hands, and capture piles.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MiniCard } from './MiniCard';

interface CardData {
  rank: string;
  suit: string;
  value: number;
  cardId?: string;
  type?: string;
  stackId?: string;
  cards?: CardData[];
  owner?: number;
  hasBase?: boolean;
}

interface MiniGameBoardProps {
  tableCards: CardData[];
  hands: Record<number, CardData[]>;
  captures?: Record<number, CardData[]>;
  currentPlayer: number;
  highlightedZone?: string;
  style?: object;
}

export function MiniGameBoard({ 
  tableCards, 
  hands, 
  captures = {},
  currentPlayer,
  highlightedZone,
  style 
}: MiniGameBoardProps) {
  
  // Separate loose cards from stacks
  const looseCards = tableCards.filter(tc => !tc.type);
  const stacks = tableCards.filter(tc => tc.type === 'temp_stack' || tc.type === 'build_stack');

  return (
    <View style={[styles.container, style]}>
      {/* Table Area */}
      <View style={styles.tableArea}>
        <Text style={styles.tableLabel}>TABLE</Text>
        
        {/* Loose Cards Row */}
        <View style={styles.looseCardsRow}>
          {looseCards.map((card, index) => (
            <View key={`loose-${index}`} style={styles.cardSlot}>
              <MiniCard 
                card={card} 
                highlighted={highlightedZone === `table-${index}`}
              />
            </View>
          ))}
          {looseCards.length === 0 && (
            <Text style={styles.emptyText}>No cards</Text>
          )}
        </View>

        {/* Stacks Row */}
        <View style={styles.stacksRow}>
          {stacks.map((stack, index) => (
            <View 
              key={stack.stackId || index} 
              style={[
                styles.stackContainer,
                highlightedZone === `table-${looseCards.length + index}` && styles.highlighted,
              ]}
            >
              <View style={styles.stackCards}>
                {stack.cards?.map((card, cardIndex) => (
                  <MiniCard key={cardIndex} card={card} size="small" />
                ))}
              </View>
              <View style={[
                styles.stackBadge,
                stack.type === 'build_stack' && styles.buildBadge,
              ]}>
                <Text style={styles.stackValue}>{stack.value}</Text>
              </View>
              <Text style={styles.stackType}>
                {stack.type === 'temp_stack' ? 'TEMP' : 'BUILD'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Player Areas */}
      <View style={styles.playersArea}>
        {/* Player 1 (Opponent) */}
        <View style={styles.playerArea}>
          <View style={[
            styles.playerHeader,
            currentPlayer === 1 && styles.activePlayer,
          ]}>
            <Text style={styles.playerName}>Player 2</Text>
            <Text style={styles.captureCount}>
              {captures[1]?.length || 0} captured
            </Text>
          </View>
          <View style={styles.hand}>
            {(hands[1] || []).map((card, index) => (
              <MiniCard key={index} card={card} size="small" />
            ))}
          </View>
        </View>

        {/* Player 0 (You) */}
        <View style={styles.playerArea}>
          <View style={[
            styles.playerHeader,
            currentPlayer === 0 && styles.activePlayer,
          ]}>
            <Text style={styles.playerName}>Player 1 (You)</Text>
            <Text style={styles.captureCount}>
              {captures[0]?.length || 0} captured
            </Text>
          </View>
          <View style={[
            styles.hand,
            highlightedZone === 'hand-0' && styles.highlightedHand,
          ]}>
            {(hands[0] || []).map((card, index) => (
              <MiniCard 
                key={index} 
                card={card} 
                size="small"
                highlighted={highlightedZone === `hand-0`}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1B5E20',
    borderRadius: 12,
    padding: 12,
    minHeight: 280,
  },
  tableArea: {
    flex: 1,
    marginBottom: 12,
  },
  tableLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  looseCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 60,
    gap: 6,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    marginBottom: 8,
  },
  cardSlot: {
    marginHorizontal: 2,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  stacksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 12,
    minHeight: 80,
  },
  stackContainer: {
    alignItems: 'center',
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  stackCards: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  stackBadge: {
    backgroundColor: '#FF9800',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 2,
  },
  buildBadge: {
    backgroundColor: '#9C27B0',
  },
  stackValue: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stackType: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 8,
    fontWeight: '600',
  },
  playersArea: {
    gap: 8,
  },
  playerArea: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 8,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  activePlayer: {
    borderBottomColor: '#FFD700',
    borderBottomWidth: 2,
  },
  playerName: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  captureCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
  },
  hand: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44,
    alignItems: 'center',
  },
  highlightedHand: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  highlighted: {
    borderColor: '#FFD700',
    borderWidth: 2,
  },
});

export default MiniGameBoard;

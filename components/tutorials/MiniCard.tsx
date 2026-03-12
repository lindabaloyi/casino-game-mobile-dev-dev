/**
 * MiniCard Component
 * 
 * A simplified card display for tutorials.
 * Smaller than regular game cards, used in mini game board.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CardData {
  rank: string;
  suit: string;
  value: number;
  cardId?: string;
}

interface MiniCardProps {
  card: CardData;
  size?: 'small' | 'medium';
  highlighted?: boolean;
}

const SUIT_COLORS: Record<string, string> = {
  '♥': '#E74C3C',
  '♦': '#E74C3C',
  '♠': '#2C3E50',
  '♣': '#2C3E50',
};

const SUIT_SYMBOLS: Record<string, string> = {
  '♥': '♡',
  '♦': '◇',
  '♠': '♤',
  '♣': '♧',
};

export function MiniCard({ card, size = 'medium', highlighted = false }: MiniCardProps) {
  const isRed = SUIT_COLORS[card.suit] === '#E74C3C';
  const suitSymbol = SUIT_SYMBOLS[card.suit] || card.suit;
  
  const cardSize = size === 'small' ? CARD_SMALL : CARD_MEDIUM;
  
  return (
    <View 
      style={[
        styles.card, 
        { width: cardSize.width, height: cardSize.height },
        highlighted && styles.highlighted,
      ]}
    >
      <View style={styles.cardContent}>
        <Text style={[
          styles.rank, 
          { color: isRed ? '#E74C3C' : '#2C3E50' },
          size === 'small' && styles.rankSmall,
        ]}>
          {card.rank}
        </Text>
        <Text style={[
          styles.suit, 
          { color: isRed ? '#E74C3C' : '#2C3E50' },
          size === 'small' && styles.suitSmall,
        ]}>
          {suitSymbol}
        </Text>
      </View>
    </View>
  );
}

const CARD_SMALL = { width: 28, height: 40 };
const CARD_MEDIUM = { width: 36, height: 52 };

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BDC3C7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  highlighted: {
    borderColor: '#FFD700',
    borderWidth: 2,
    shadowColor: '#FFD700',
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rank: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  rankSmall: {
    fontSize: 10,
  },
  suit: {
    fontSize: 12,
  },
  suitSmall: {
    fontSize: 8,
  },
});

export default MiniCard;

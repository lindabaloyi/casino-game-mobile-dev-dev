/**
 * StackCardPair
 * Shared component that renders two fanned cards (base + top).
 * Used by both TempStackView and BuildStackView.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from './types';

// ── Layout constants ──────────────────────────────────────────────────────────

const CARD_W       = 56;   // matches PlayingCard width
const CARD_H       = 84;   // matches PlayingCard height
const STACK_OFFSET = 6;    // how much the top card is shifted right/down
const BADGE_H      = 22;   // height reserved for the badge below the cards
const STACK_PAD    = 4;    // extra breathing room on the right

// ── Props ─────────────────────────────────────────────────────────────────────

interface StackCardPairProps {
  /** Two cards to display: bottom (base) and top (most recent) */
  cards: [Card, Card];
  /** Display value shown in the badge */
  displayValue: string;
  /** Background color for the value badge */
  badgeColor: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StackCardPair({ cards, displayValue, badgeColor }: StackCardPairProps) {
  const [bottom, top] = cards;

  if (!bottom || !top) return null;

  return (
    <View style={styles.container}>
      {/* Base card — highest value */}
      <View style={styles.cardBottom}>
        <PlayingCard rank={bottom.rank} suit={bottom.suit} />
      </View>

      {/* Top card — most recently added, offset for fan effect */}
      <View style={styles.cardTop}>
        <PlayingCard rank={top.rank} suit={top.suit} />
      </View>

      {/* Build indicator - shows build value with color */}
      <View style={[styles.valueBadge, { backgroundColor: badgeColor }]}>
        <Text style={styles.valueText}>{displayValue}</Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width:    CARD_W + STACK_OFFSET + STACK_PAD,
    height:   CARD_H + STACK_OFFSET + BADGE_H,
    position: 'relative',
  },
  cardBottom: {
    position: 'absolute',
    top:  0,
    left: 0,
  },
  cardTop: {
    position:     'absolute',
    top:          STACK_OFFSET,
    left:         STACK_OFFSET,
    shadowColor:  '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius:  3,
    elevation:    4,
  },
  // Value badge - shows build value (top-right corner)
  valueBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 20,        // Make sure it appears above cards
    elevation: 5,      // Android shadow
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  valueText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});

export default StackCardPair;

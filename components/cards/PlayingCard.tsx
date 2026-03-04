/**
 * PlayingCard
 * Classic playing card with exaggerated corner labels and a large center suit.
 *
 * Layout:
 *   ┌──────────────┐
 *   │ A            │  ← big bold rank
 *   │ ♠            │  ← bold suit below rank
 *   │              │
 *   │      ♠       │  ← huge center suit
 *   │              │
 *   │            ♠ │  ← bottom-right corner (rotated 180°)
 *   │            A │
 *   └──────────────┘
 */

import React from 'react';
import { StyleSheet, Text, View, ViewStyle, useWindowDimensions } from 'react-native';

// ── Types ────────────────────────────────────────────────────────────────────

interface PlayingCardProps {
  rank: string;
  suit: string;
  faceDown?: boolean;
  style?: ViewStyle;
  /** Card width - defaults to 56 */
  width?: number;
  /** Card height - defaults to 84 */
  height?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isRed(suit: string): boolean {
  return suit === '♥' || suit === '♦';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PlayingCard({ rank, suit, faceDown = false, style, width = 56, height = 84 }: PlayingCardProps) {
  const { width: screenWidth } = useWindowDimensions();

  // Calculate responsive card dimensions based on screen width
  const responsiveWidth = Math.min(width, screenWidth / 7);
  const responsiveHeight = Math.min(height, responsiveWidth * 1.5);

  // Fixed size for center suit - smaller than default to reduce overlap
  const centerSuitSize = 20;
  // Corner elements scale proportionally but stay readable
  const cornerRankSize = Math.max(13, Math.min(16, Math.floor(responsiveWidth / 2.8)));
  const cornerSuitSize = Math.max(10, Math.min(13, Math.floor(responsiveWidth / 3.5)));
  // Corner offset - position closer to the edge (reduced from previous calculation)
  const cornerOffset = Math.max(1, Math.min(3, Math.floor(responsiveWidth / 20)));

  if (faceDown) {
    return (
      <View style={[styles.card, { width: responsiveWidth, height: responsiveHeight }, styles.cardBack, style]}>
        <View style={[styles.backInner, { width: responsiveWidth * 0.82, height: responsiveHeight * 0.86 }]}>
          <Text style={[styles.backPattern, { fontSize: responsiveWidth * 0.64 }]}>🂠</Text>
        </View>
      </View>
    );
  }

  const color = isRed(suit) ? styles.red : styles.black;

  return (
    <View style={[styles.card, { width: responsiveWidth, height: responsiveHeight }, style]}>
      {/* Top-left corner */}
      <View style={[styles.cornerTL, { top: cornerOffset, left: cornerOffset }]}>
        <Text style={[styles.cornerRank, color, { fontSize: cornerRankSize, lineHeight: cornerRankSize * 1.1 }]}>{rank}</Text>
        <Text style={[styles.cornerSuit, color, { fontSize: cornerSuitSize, lineHeight: cornerSuitSize * 1.15 }]}>{suit}</Text>
      </View>

      {/* Centre large suit */}
      <View style={styles.center}>
        <Text style={[styles.centerSuit, color, { fontSize: centerSuitSize, lineHeight: centerSuitSize * 1.2 }]}>{suit}</Text>
      </View>

      {/* Bottom-right corner — rotated 180° */}
      <View style={[styles.cornerBR, { bottom: cornerOffset, right: cornerOffset, transform: [{ rotate: '180deg' }] }]}>
        <Text style={[styles.cornerRank, color, { fontSize: cornerRankSize, lineHeight: cornerRankSize * 1.1 }]}>{rank}</Text>
        <Text style={[styles.cornerSuit, color, { fontSize: cornerSuitSize, lineHeight: cornerSuitSize * 1.15 }]}>{suit}</Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    width: 56,
    height: 84,
    backgroundColor: '#FAFAFA',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Face-down card
  cardBack: {
    backgroundColor: '#1565C0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backInner: {
    width: 46,
    height: 72,
    borderRadius: 5,
    backgroundColor: '#1976D2',
    borderWidth: 3,
    borderColor: '#0D47A1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backPattern: {
    fontSize: 36,
    color: '#0D47A1',
  },

  // Corners
  cornerTL: {
    position: 'absolute',
    alignItems: 'center',
  },
  cornerBR: {
    position: 'absolute',
    alignItems: 'center',
  },
  cornerRank: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  cornerSuit: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 15,
  },

  // Centre
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerSuit: {
    fontSize: 36,
    lineHeight: 42,
  },

  // Colours
  red:   { color: '#C62828' },
  black: { color: '#1A1A1A' },
});

export default PlayingCard;

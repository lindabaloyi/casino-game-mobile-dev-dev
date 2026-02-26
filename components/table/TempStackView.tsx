/**
 * TempStackView
 * Renders a temp_stack or build_stack as a fanned pair of cards.
 * 
 * - temp_stack: shows TEMP badge
 * - build_stack: shows owner indicator (P1 or P2)
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';
import { TempStack, BuildStack } from './types';
import { TempStackBounds } from '../../hooks/useDrag';
import { getStackConfig } from '../../constants/stackActions';
import { Card } from './types';

// ── Layout constants ──────────────────────────────────────────────────────────

const CARD_W       = 56;   // matches PlayingCard width
const CARD_H       = 84;   // matches PlayingCard height
const STACK_OFFSET = 6;    // how much the top card is shifted right/down
const BADGE_H      = 22;   // height reserved for the badge below the cards
const STACK_PAD    = 4;    // extra breathing room on the right

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  stack: TempStack | BuildStack;
  /** Re-measure when table card count changes (flex reflow). */
  layoutVersion:       number;
  registerTempStack:   (stackId: string, bounds: TempStackBounds) => void;
  unregisterTempStack: (stackId: string) => void;
  /** Capture callback - for when a hand card is dropped on this stack */
  onCapture?: (card: Card, targetType: 'loose' | 'build', targetRank?: string, targetSuit?: string, targetStackId?: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TempStackView({ stack, layoutVersion, registerTempStack, unregisterTempStack, onCapture }: Props) {
  const viewRef = useRef<View>(null);

  // bottom = highest-value card (set at creation)
  // top    = most recently added card
  const bottom = stack.cards[0];
  const top    = stack.cards[stack.cards.length - 1];

  // ── Position registration ─────────────────────────────────────────────────
  const onLayout = useCallback(() => {
    // RAF ensures the native frame is fully painted before measuring.
    requestAnimationFrame(() => {
      viewRef.current?.measureInWindow((x, y, width, height) => {
        registerTempStack(stack.stackId, {
          x, y, width, height,
          stackId: stack.stackId,
          owner:   stack.owner,
        });
      });
    });
  }, [stack.stackId, stack.owner, registerTempStack]);

  // Re-measure on table reflow (sibling card changes shift this stack's position).
  useEffect(() => {
    requestAnimationFrame(() => {
      viewRef.current?.measureInWindow((x, y, width, height) => {
        registerTempStack(stack.stackId, {
          x, y, width, height,
          stackId: stack.stackId,
          owner:   stack.owner,
        });
      });
    });
  }, [layoutVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => unregisterTempStack(stack.stackId);
  }, [stack.stackId, unregisterTempStack]);

  // ── Resolve badge config from design tokens ───────────────────────────────
  const config = getStackConfig(stack.type);
  const badgeColor = config?.badgeColor ?? '#17a2b8';
  const badgeLabel = config?.label      ?? stack.type.toUpperCase();

  // Determine owner label for build_stack
  const isBuild = stack.type === 'build_stack';
  const ownerLabel = `P${stack.owner + 1}`;

  if (!bottom || !top) return null;

  return (
    <View ref={viewRef} style={styles.container} onLayout={onLayout}>
      {/* Base card — highest value */}
      <View style={styles.cardBottom}>
        <PlayingCard rank={bottom.rank} suit={bottom.suit} />
      </View>

      {/* Top card — most recently added, offset for fan effect */}
      <View style={styles.cardTop}>
        <PlayingCard rank={top.rank} suit={top.suit} />
      </View>

      {/* Value indicator - shows running total from stack.value */}
      <View style={styles.valueBadge}>
        <Text style={styles.valueText}>{stack.value}</Text>
      </View>

      {/* Badge — show for temp_stack type only */}
      {stack.type === 'temp_stack' && (
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { backgroundColor: badgeColor }]}>
            {badgeLabel}
          </Text>
        </View>
      )}

      {/* Owner indicator — show for build_stack type only */}
      {isBuild && (
        <View style={styles.ownerBadge}>
          <Text style={styles.ownerText}>{ownerLabel}</Text>
        </View>
      )}
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
    elevation:     4,
  },
  // Value badge - shows the running total (top-right corner)
  valueBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#9C27B0', // Purple
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
  badge: {
    position: 'absolute',
    bottom:   0,
    left:     0,
    right:    0,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  // Owner badge for build stacks (P1 or P2 indicator)
  ownerBadge: {
    position: 'absolute',
    bottom:   0,
    left:     0,
    right:    0,
    alignItems: 'center',
  },
  ownerText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#f59e0b', // amber
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
});

export default TempStackView;

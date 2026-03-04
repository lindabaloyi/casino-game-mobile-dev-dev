/**
 * BuildStackView
 * Renders a build_stack (accepted temp stack).
 * 
 * Characteristics:
 * - NOT draggable (no drag gesture)
 * - Shows owner indicator (P1 or P2)
 * - Shows build value badge
 * - Shows EXTEND indicator when extending
 * - Always shows 2 cards (base and top) like TempStack
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';
import { BuildStack } from './types';
import { TempStackBounds } from '../../hooks/useDrag';

// ── Layout constants ──────────────────────────────────────────────────────────

const CARD_W       = 56;
const CARD_H       = 84;
const STACK_OFFSET = 6;
const BADGE_H      = 22;
const STACK_PAD    = 4;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  stack: BuildStack;
  /** Re-measure when table card count changes (flex reflow). */
  layoutVersion: number;
  registerTempStack: (stackId: string, bounds: TempStackBounds) => void;
  unregisterTempStack: (stackId: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BuildStackView({ 
  stack, 
  layoutVersion, 
  registerTempStack, 
  unregisterTempStack, 
}: Props) {
  const viewRef = useRef<View>(null);

  // bottom = highest-value card (base)
  // top    = most recently added card
  const bottom = stack.cards[0];
  const top    = stack.cards[stack.cards.length - 1];
  
  // Check if there's a pending extension (supports both old looseCard and new cards format)
  const pendingExtension = stack.pendingExtension;
  const isExtending = !!(pendingExtension?.looseCard || pendingExtension?.cards);
  
  // Calculate total pending value (sum of all pending cards for multi-card extensions)
  let totalPendingValue = 0;
  if (pendingExtension?.cards) {
    totalPendingValue = pendingExtension.cards.reduce((sum, p) => sum + p.card.value, 0);
  } else if (pendingExtension?.looseCard) {
    totalPendingValue = pendingExtension.looseCard.value;
  }
  
  // Calculate remaining need
  const remainingNeed = stack.value - totalPendingValue;
  
  let displayValue: string;
  let badgeColor: string;
  
  if (isExtending) {
    if (remainingNeed > 0) {
      // Incomplete extension - need more to complete
      displayValue = `-${remainingNeed}`;
      badgeColor = '#E53935'; // red for incomplete
    } else {
      // Complete - total pending equals or exceeds build value
      displayValue = stack.value.toString();
      badgeColor = '#9C27B0'; // purple for completed
    }
  } else {
    displayValue = stack.value?.toString() ?? '-';
    badgeColor = '#9C27B0'; // purple for completed build
  }

  // Owner label or EXTEND indicator
  const showExtending = isExtending;

  // ── Position registration ─────────────────────────────────────────────────
  const onLayout = useCallback(() => {
    requestAnimationFrame(() => {
      viewRef.current?.measureInWindow((x, y, width, height) => {
        registerTempStack(stack.stackId, {
          x, y, width, height,
          stackId: stack.stackId,
          owner:   stack.owner,
          stackType: stack.type,
        });
      });
    });
  }, [stack.stackId, stack.owner, stack.type, registerTempStack]);

  // Re-measure on table reflow
  useEffect(() => {
    requestAnimationFrame(() => {
      viewRef.current?.measureInWindow((x, y, width, height) => {
        registerTempStack(stack.stackId, {
          x, y, width, height,
          stackId: stack.stackId,
          owner:   stack.owner,
          stackType: stack.type,
        });
      });
    });
  }, [layoutVersion, stack.stackId, stack.owner, stack.type, registerTempStack]);

  useEffect(() => {
    return () => unregisterTempStack(stack.stackId);
  }, [stack.stackId, unregisterTempStack]);

  if (!bottom || !top) return null;

  return (
    <View ref={viewRef} style={styles.container} onLayout={onLayout}>
      {/* Base card — highest value (bottom of stack) */}
      <View style={styles.cardBottom}>
        <PlayingCard rank={bottom.rank} suit={bottom.suit} />
      </View>

      {/* Top card — most recently added, offset for fan effect */}
      <View style={styles.cardTop}>
        <PlayingCard rank={top.rank} suit={top.suit} />
      </View>

      {/* Build value badge */}
      <View style={[styles.valueBadge, { backgroundColor: badgeColor }]}>
        <Text style={styles.valueText}>{displayValue}</Text>
      </View>

      {/* Owner indicator or EXTEND badge */}
      {showExtending ? (
        <View style={styles.extendBadge}>
          <Text style={styles.extendText}>EXTEND</Text>
        </View>
      ) : (
        <View style={styles.ownerBadge}>
          <Text style={styles.ownerText}>P{stack.owner + 1}</Text>
        </View>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

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
    zIndex: 20,
    elevation: 5,
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
  extendBadge: {
    position: 'absolute',
    bottom:   0,
    left:     0,
    right:    0,
    alignItems: 'center',
  },
  extendText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    backgroundColor: '#8b5cf6', // purple
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
});

export default BuildStackView;

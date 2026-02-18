/**
 * TempStackView
 * Renders a temp_stack (or any stack with a `type` field) as a fanned pair
 * of cards with a coloured badge label at the bottom.
 *
 * Badge colour and label are driven by `constants/stackActions.ts` —
 * no changes here when new stack types (build, extend) are added.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';
import { TempStack } from './types';
import { TempStackBounds } from '../../hooks/useDrag';
import { getStackConfig } from '../../constants/stackActions';

// ── Layout constants ──────────────────────────────────────────────────────────

const CARD_W       = 56;   // matches PlayingCard width
const CARD_H       = 84;   // matches PlayingCard height
const STACK_OFFSET = 6;    // how much the top card is shifted right/down
const BADGE_H      = 22;   // height reserved for the TEMP badge below the cards
const STACK_PAD    = 4;    // extra breathing room on the right

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  stack: TempStack;
  /** Re-measure when table card count changes (flex reflow). */
  layoutVersion:       number;
  registerTempStack:   (stackId: string, bounds: TempStackBounds) => void;
  unregisterTempStack: (stackId: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TempStackView({ stack, layoutVersion, registerTempStack, unregisterTempStack }: Props) {
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

      {/* Badge — colour + label driven by stackActions config */}
      <View style={styles.badge}>
        <Text style={[styles.badgeText, { backgroundColor: badgeColor }]}>
          {badgeLabel}
        </Text>
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
    elevation:     4,
  },
  badge: {
    position: 'absolute',
    bottom:   0,
    left:     0,
    right:    0,
    alignItems: 'center',
  },
  badgeText: {
    color:          '#fff',
    fontSize:       8,
    fontWeight:     'bold',
    letterSpacing:  1,
    paddingHorizontal: 8,
    paddingVertical:   2,
    borderRadius:   6,
    overflow:       'hidden',
  },
});

export default TempStackView;

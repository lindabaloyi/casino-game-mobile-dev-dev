/**
 * TableArea
 * The central drop zone where cards accumulate.
 *
 * Layout when a temp stack is active (player's turn):
 *
 *   ┌──────────────────────────────────┐
 *   │          TABLE AREA              │
 *   │                                  │
 *   │  [Card]  [Card]  [Card]          │
 *   │                  [Card]  ← top   │
 *   │                  [TEMP]  ← badge │  (on the card stack)
 *   │                                  │
 *   │      [✓ Accept]  [✕ Cancel]      │  (fixed bottom of table)
 *   └──────────────────────────────────┘
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';
import { CardBounds } from '../../hooks/useDrag';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Card {
  rank: string;
  suit: string;
  value: number;
}

interface TempStack {
  type: 'temp_stack';
  stackId: string;
  cards: Card[];
  owner: number;
  value: number;
}

type TableItem = Card | TempStack;

interface Props {
  tableCards: TableItem[];
  isMyTurn: boolean;
  tableRef: React.RefObject<View | null>;
  onTableLayout: () => void;
  registerCard: (id: string, bounds: CardBounds) => void;
  unregisterCard: (id: string) => void;
  /** stackId of the temp stack to show the overlay for, or null */
  overlayStackId: string | null;
  onAcceptTemp: (stackId: string) => void;
  onCancelTemp: (stackId: string) => void;
}

// ── Sub-component: loose card with position registration ─────────────────────

function LooseCardView({
  card,
  registerCard,
  unregisterCard,
}: {
  card: Card;
  registerCard: (id: string, bounds: CardBounds) => void;
  unregisterCard: (id: string) => void;
}) {
  const viewRef = useRef<View>(null);
  const cardId  = `${card.rank}${card.suit}`;

  const onLayout = useCallback(() => {
    viewRef.current?.measureInWindow((x, y, width, height) => {
      registerCard(cardId, { x, y, width, height, card });
    });
  }, [card, cardId, registerCard]);

  useEffect(() => {
    return () => unregisterCard(cardId);
  }, [cardId, unregisterCard]);

  return (
    <View ref={viewRef} onLayout={onLayout}>
      <PlayingCard rank={card.rank} suit={card.suit} />
    </View>
  );
}

// ── Sub-component: stacked temp cards + TEMP badge ────────────────────────────

function TempStackView({ stack }: { stack: TempStack }) {
  const [bottom, top] = stack.cards;
  if (!bottom || !top) return null;

  return (
    <View style={styles.tempContainer}>
      {/* Bottom card (original table card) */}
      <View style={styles.tempBottom}>
        <PlayingCard rank={bottom.rank} suit={bottom.suit} />
      </View>

      {/* Top card (player's hand card) — offset so both visible */}
      <View style={styles.tempTop}>
        <PlayingCard rank={top.rank} suit={top.suit} />
      </View>

      {/* TEMP badge — sits at the bottom of the top card */}
      <View style={styles.tempBadge}>
        <Text style={styles.tempBadgeText}>TEMP</Text>
      </View>
    </View>
  );
}

// ── Sub-component: fixed Accept/Cancel strip ──────────────────────────────────

function TempActionStrip({
  stackId,
  onAccept,
  onCancel,
}: {
  stackId: string;
  onAccept: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.actionStrip, { opacity: fadeAnim }]}>
      <TouchableOpacity
        style={[styles.actionBtn, styles.acceptBtn]}
        onPress={() => onAccept(stackId)}
        accessibilityLabel="Accept temp stack"
      >
        <Text style={styles.actionBtnText}>✓  Accept</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, styles.cancelBtn]}
        onPress={() => onCancel(stackId)}
        accessibilityLabel="Cancel temp stack"
      >
        <Text style={styles.actionBtnText}>✕  Cancel</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TableArea({
  tableCards,
  isMyTurn,
  tableRef,
  onTableLayout,
  registerCard,
  unregisterCard,
  overlayStackId,
  onAcceptTemp,
  onCancelTemp,
}: Props) {
  const looseCards = tableCards.filter((tc): tc is Card      => !(tc as any).type);
  const tempStacks = tableCards.filter((tc): tc is TempStack => (tc as any).type === 'temp_stack');

  return (
    <View
      ref={tableRef}
      style={[styles.area, isMyTurn && styles.areaActive]}
      onLayout={onTableLayout}
    >
      {/* Drop hint */}
      {isMyTurn && tableCards.length === 0 && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>Drop a card here to trail</Text>
        </View>
      )}

      {/* Cards */}
      <View style={styles.cardRow}>
        {looseCards.map((card) => (
          <LooseCardView
            key={`${card.rank}${card.suit}`}
            card={card}
            registerCard={registerCard}
            unregisterCard={unregisterCard}
          />
        ))}

        {tempStacks.map((stack) => (
          <TempStackView key={stack.stackId} stack={stack} />
        ))}
      </View>

      {/*
        Accept / Cancel strip — fixed at the bottom of the table area.
        Only visible to the owning player on their turn (overlayStackId set).
      */}
      {overlayStackId && (
        <TempActionStrip
          stackId={overlayStackId}
          onAccept={onAcceptTemp}
          onCancel={onCancelTemp}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CARD_W = 56;   // matches PlayingCard width
const CARD_H = 84;   // matches PlayingCard height

const styles = StyleSheet.create({
  area: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  areaActive: {
    borderColor: '#66BB6A',
    borderStyle: 'dashed',
  },
  hintContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintText: {
    color: '#81C784',
    fontSize: 14,
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
  cardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Temp stack ──────────────────────────────────────────────────────────

  // Height = card height + badge height (~20) + top-card offset (6)
  tempContainer: {
    width:  CARD_W + 6 + 4,   // card + offset + breathing room
    height: CARD_H + 6 + 22,  // card + offset + badge
    position: 'relative',
  },
  tempBottom: {
    position: 'absolute',
    top:  0,
    left: 0,
  },
  tempTop: {
    position: 'absolute',
    top:  6,
    left: 6,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  tempBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tempBadgeText: {
    backgroundColor: '#17a2b8',
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },

  // ── Accept / Cancel action strip (fixed bottom of table) ────────────────

  actionStrip: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  actionBtn: {
    paddingVertical: 7,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  cancelBtn: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
});

export default TableArea;

/**
 * BuildStackView
 * Renders a build_stack (accepted temp stack).
 * 
 * Characteristics:
 * - Draggable by owner when there's a pending extension (can capture instead of accepting)
 * - Shows owner indicator (P1 or P2)
 * - Shows build value badge
 * - Shows EXTEND indicator when extending
 * - Always shows 2 cards (base and top) like TempStack
 * - In party mode, shows team colors and "friendly"/"enemy" indicator
 */

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import { PlayingCard } from '../cards/PlayingCard';
import { BuildStack } from './types';
import { TempStackBounds, CapturePileBounds } from '../../hooks/useDrag';
import { PlayerIcon } from '../ui/PlayerIcon';
import { CARD_WIDTH, CARD_HEIGHT } from '../../constants/cardDimensions';
import { 
  getTeamFromIndex, 
  getPlayerPositionLabel, 
  getPlayerTag
} from '../../shared/game/team';
import { 
  getTeamColors as getTeamColorsFromConstants, 
  TEAM_A_COLORS,
  TEAM_B_COLORS,
  getPlayerColors,
  type TeamId,
  type TeamColors 
} from '../../constants/teamColors';

// ── Layout constants ──────────────────────────────────────────────────────────

const CARD_W       = CARD_WIDTH;  // 56 - shared constant
const CARD_H       = CARD_HEIGHT; // 84 - shared constant
const STACK_OFFSET = 6;
const BADGE_H      = 22;
const STACK_PAD    = 4;

// Canonical purple from Team B colors
export const CANONICAL_PURPLE = TEAM_B_COLORS.primary;

// Gold color for Player 1 (2-player mode) - orange (#FF9800)
export const PLAYER_1_GOLD = '#FF9800';

// Purple for Player 2 (2-player mode) and Team B
export const PLAYER_2_PURPLE = TEAM_B_COLORS.primary;

// White color
export const WHITE = '#FFFFFF';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  stack: BuildStack;
  /** Re-measure when table card count changes (flex reflow). */
  layoutVersion: number;
  registerTempStack: (stackId: string, bounds: TempStackBounds) => void;
  unregisterTempStack: (stackId: string) => void;
  /** Current player index (for party mode team colors) */
  currentPlayerIndex?: number;
  /** Whether this is party mode (4-player) */
  isPartyMode?: boolean;
  /** Callback when build is tapped - for Shiya selection */
  onBuildTap?: (stack: BuildStack) => void;
  // Drag props - enabled when build has pending extension
  isMyTurn?: boolean;
  playerNumber?: number;
  findCapturePileAtPoint?: (x: number, y: number) => CapturePileBounds | null;
  onDragStart?: (stack: BuildStack) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (stack: BuildStack) => void;
  onDropToCapture?: (stack: BuildStack) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BuildStackView({ 
  stack, 
  layoutVersion, 
  registerTempStack, 
  unregisterTempStack,
  currentPlayerIndex,
  isPartyMode = false,
  onBuildTap,
  isMyTurn,
  playerNumber,
  findCapturePileAtPoint,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDropToCapture,
}: Props) {
  const viewRef = useRef<View>(null);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // bottom = highest-value card (base)
  // top    = most recently added card (or most recent pending card if extending)
  const bottom = stack.cards[0];
  
  // Check if there's a pending extension (supports both old looseCard and new cards format)
  const pendingExtension = stack.pendingExtension;
  const isExtending = !!(pendingExtension?.looseCard || pendingExtension?.cards);

  // Get pending cards in order they were added
  const pendingCards = pendingExtension?.cards?.map(p => p.card) ?? 
                      (pendingExtension?.looseCard ? [pendingExtension.looseCard] : []);

  // The card shown on top: most recent pending card if any, otherwise the original top
  const top = pendingCards.length > 0 
    ? pendingCards[pendingCards.length - 1] 
    : stack.cards[stack.cards.length - 1];

  // Build is draggable when:
  // - It's the player's turn
  // - They own the build
  // - There's a pending extension on the build
  const canDrag = isMyTurn && 
    playerNumber !== undefined && 
    stack.owner === playerNumber && 
    isExtending;

  // ── Drag handlers ────────────────────────────────────────────────────────
  const handleDragStartInternal = useCallback(() => {
    if (onDragStart) {
      onDragStart(stack);
    }
  }, [onDragStart, stack]);

  const handleDragMoveInternal = useCallback((x: number, y: number) => {
    if (onDragMove) {
      onDragMove(x, y);
    }
  }, [onDragMove]);

  const handleDragEndInternal = useCallback((absX: number, absY: number) => {
    translateX.value = 0;
    translateY.value = 0;
    isDragging.value = false;

    console.log(`[BuildStackView] Drag end - absX: ${absX}, absY: ${absY}, playerNumber: ${playerNumber}, canDrag: ${canDrag}`);

    // Check if dropped on player's own capture pile
    if (findCapturePileAtPoint && playerNumber !== undefined) {
      const pile = findCapturePileAtPoint(absX, absY);
      console.log(`[BuildStackView] findCapturePileAtPoint result:`, pile);
      
      if (pile && pile.playerIndex === playerNumber) {
        console.log('[BuildStackView] Dropped on own capture pile:', pile);
        if (onDropToCapture) {
          onDropToCapture(stack);
        }
        return;
      }
    }

    // Otherwise, call normal onDragEnd
    console.log('[BuildStackView] Not dropped on capture pile - calling onDragEnd');
    if (onDragEnd) {
      onDragEnd(stack);
    }
  }, [findCapturePileAtPoint, onDropToCapture, onDragEnd, stack, playerNumber, translateX, translateY, isDragging, canDrag]);

  const panGesture = Gesture.Pan()
    .enabled(!!canDrag)
    .onStart(() => {
      isDragging.value = true;
      runOnJS(handleDragStartInternal)();
    })
    .onUpdate((event) => {
      if (isDragging.value) {
        translateX.value = event.translationX;
        translateY.value = event.translationY;
        runOnJS(handleDragMoveInternal)(event.absoluteX, event.absoluteY);
      }
    })
    .onEnd((event) => {
      runOnJS(handleDragEndInternal)(event.absoluteX, event.absoluteY);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    zIndex: isDragging.value ? 100 : 1,
  }));

  // Calculate team colors for party mode
  const { ownerTeam, colors } = useMemo(() => {
    const team = getTeamFromIndex(stack.owner) as TeamId;
    const tag = getPlayerTag(stack.owner);
    const position = getPlayerPositionLabel(stack.owner);
    
    // Get team colors based on party mode and team
    let teamColors: TeamColors;
    
    if (isPartyMode) {
      // Party mode (4-player): use team-specific colors
      teamColors = team === 'A' ? TEAM_A_COLORS : TEAM_B_COLORS;
    } else {
      // 2-player mode: use gold for P1, purple for P2
      teamColors = stack.owner === 0 
        ? { ...TEAM_B_COLORS, primary: PLAYER_1_GOLD, accent: '#B8860B' }  // Gold for P1
        : TEAM_B_COLORS;  // Purple for P2
    }
    
    return { 
      ownerTeam: team, 
      ownerTag: tag, 
      ownerPosition: position,
      colors: teamColors,
    };
  }, [stack.owner, isPartyMode]);
  
  // Compute effective sum with reset on exact matches
  // This matches the server-side validation logic:
  // - Iterate through cards in order
  // - Reset sum to 0 whenever it equals build value
  let effectiveSum = 0;
  for (const card of pendingCards) {
    effectiveSum += card.value;
    if (effectiveSum === stack.value) {
      effectiveSum = 0; // reset after exact match
    }
  }

  let displayValue: string;
  if (effectiveSum === 0) {
    // Currently at a completed state (or no pending cards)
    displayValue = stack.value?.toString() ?? '-';
  } else if (effectiveSum < stack.value) {
    // Need more cards
    displayValue = `-${stack.value - effectiveSum}`;
  } else {
    // Excess
    displayValue = `+${effectiveSum - stack.value}`;
  }

  // Badge color: accent while incomplete (effectiveSum !== 0), team color when complete
  const getBadgeColor = (): string => {
    if (isExtending) {
      if (effectiveSum !== 0) {
        return colors.accent; // incomplete
      } else {
        // complete – use team color
        return isPartyMode 
          ? (ownerTeam === 'B' ? CANONICAL_PURPLE : PLAYER_1_GOLD)
          : (stack.owner === 0 ? PLAYER_1_GOLD : PLAYER_2_PURPLE);
      }
    } else {
      // Not extending – normal team color
      return isPartyMode 
        ? (ownerTeam === 'B' ? CANONICAL_PURPLE : PLAYER_1_GOLD)
        : (stack.owner === 0 ? PLAYER_1_GOLD : PLAYER_2_PURPLE);
    }
  };

  const badgeColor = getBadgeColor();

  // Owner label color - use WHITE for consistency with party mode
  const ownerTextColor = isPartyMode ? colors.text : '#FFFFFF';

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
    <GestureDetector gesture={panGesture}>
      <Animated.View 
        ref={viewRef} 
        style={[styles.container, animatedStyle]} 
        onLayout={onLayout}
      >
        {/* Tap handler for Shiya selection - only works when not dragging */}
        <TouchableOpacity 
          style={styles.tapArea} 
          onPress={() => !isDragging.value && onBuildTap?.(stack)} 
          activeOpacity={0.7}
        />
      {/* Base card — highest value (bottom of stack) */}
      <View style={styles.cardBottom}>
        <PlayingCard rank={bottom.rank} suit={bottom.suit} />
      </View>

      {/* Top card — most recently added, offset for fan effect */}
      <View style={styles.cardTop}>
        <PlayingCard rank={top.rank} suit={top.suit} />
      </View>

      {/* Build value badge - centered on card, square with rounded corners */}
      <View style={[styles.valueBadge, { backgroundColor: badgeColor }]}>
        <Text style={styles.valueText}>{displayValue}</Text>
      </View>

      {/* Owner indicator - top-right corner with team colors */}
      {isPartyMode ? (
        <View style={styles.ownerBadgeContainer}>
          <PlayerIcon 
            playerIndex={stack.owner} 
            size="small" 
          />
        </View>
      ) : (
        <View style={styles.ownerBadgeContainer}>
          <View style={[
            styles.ownerBadge, 
            { 
              backgroundColor: stack.owner === 0 ? PLAYER_1_GOLD : PLAYER_2_PURPLE,
              borderColor: '#FFFFFF',
              borderWidth: 2,
            }
          ]}>
            <Text style={[styles.ownerText, { color: '#FFFFFF' }]}>P{stack.owner + 1}</Text>
          </View>
        </View>
      )}
      </Animated.View>
    </GestureDetector>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width:    CARD_W + STACK_OFFSET + STACK_PAD,
    height:   CARD_H + STACK_OFFSET + BADGE_H,
    position: 'relative',
  },
  tapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
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
    top: '50%',
    left: '50%',
    transform: [{ translateX: -18 }, { translateY: -18 }],
    width: 36,
    height: 36,
    borderRadius: 6,
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
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  ownerBadgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    alignItems: 'center',
  },
  ownerBadge: {
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  ownerText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
    color: WHITE,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    backgroundColor: CANONICAL_PURPLE, // canonical purple - also used for EXTEND badge
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
});

export default BuildStackView;

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
 * - In party mode, shows team colors and "friendly"/"enemy" indicator
 */

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';
import { BuildStack } from './types';
import { TempStackBounds } from '../../hooks/useDrag';
import { PlayerIcon } from '../ui/PlayerIcon';
import { 
  getTeamFromIndex, 
  getPlayerPositionLabel, 
  getPlayerTag
} from '../../shared/game/team';
import { 
  getTeamColors as getTeamColorsFromConstants, 
  TEAM_A_COLORS,
  TEAM_B_COLORS,
  NEUTRAL_COLORS,
  type TeamId,
  type TeamColors 
} from '../../constants/teamColors';

// ── Layout constants ──────────────────────────────────────────────────────────

const CARD_W       = 56;
const CARD_H       = 84;
const STACK_OFFSET = 6;
const BADGE_H      = 22;
const STACK_PAD    = 4;

// Canonical purple from Team B colors
export const CANONICAL_PURPLE = TEAM_B_COLORS.primary;

// Gold color for Team A
export const TEAM_A_GOLD = TEAM_A_COLORS.primary;

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
}: Props) {
  const viewRef = useRef<View>(null);

  // Calculate team colors for party mode
  const { ownerTeam, ownerTag, ownerPosition, colors } = useMemo(() => {
    const team = getTeamFromIndex(stack.owner) as TeamId;
    const tag = getPlayerTag(stack.owner);
    const position = getPlayerPositionLabel(stack.owner);
    
    // Get team colors based on party mode and team
    let teamColors: TeamColors;
    
    if (isPartyMode) {
      // Use team-specific colors
      teamColors = team === 'A' ? TEAM_A_COLORS : TEAM_B_COLORS;
    } else {
      // Default neutral colors for non-party mode
      teamColors = NEUTRAL_COLORS;
    }
    
    return { 
      ownerTeam: team, 
      ownerTag: tag, 
      ownerPosition: position,
      colors: teamColors,
    };
  }, [stack.owner, isPartyMode]);

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
  
  // Build value badge color - use team colors throughout
  const getBadgeColor = (): string => {
    if (isExtending) {
      if (remainingNeed > 0) {
        // Incomplete extension - use accent color for warning
        return colors.accent;
      } else {
        // Complete - use team-specific color: purple for Team B, gold for Team A
        return ownerTeam === 'B' ? CANONICAL_PURPLE : TEAM_A_GOLD;
      }
    } else {
      // Completed build - use team-specific color: purple for Team B, gold for Team A
      return ownerTeam === 'B' ? CANONICAL_PURPLE : TEAM_A_GOLD;
    }
  };
  
  const displayValue = isExtending && remainingNeed > 0 
    ? `-${remainingNeed}` 
    : (stack.value?.toString() ?? '-');
  const badgeColor = getBadgeColor();

  // Owner label color based on team
  const ownerTextColor = isPartyMode ? colors.text : NEUTRAL_COLORS.text;

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
    <TouchableOpacity onPress={() => onBuildTap?.(stack)} activeOpacity={0.7}>
      <View ref={viewRef} style={styles.container} onLayout={onLayout}>
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
          <View style={[styles.ownerBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.ownerText, { color: ownerTextColor }]}>P{stack.owner + 1}</Text>
          </View>
        </View>
      )}
    </View>
    </TouchableOpacity>
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

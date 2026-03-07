/**
 * CapturedCardsView
 * Displays captured cards on the sides of the table area.
 * 
 * - LEFT side: Opponent's captures (draggable - can play from)
 * - RIGHT side: Your captures (drop target - can capture to)
 * - Shows the TOP card (last in array = most recently captured)
 */

import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from './types';
import { CapturePileBounds, CapturedCardBounds } from '../../hooks/useDrag';
import { OpponentDragState } from '../../hooks/useGameState';
import { getTeamFromIndex } from '../../shared/game/team';
import { getTeamColors, TEAM_A_COLORS, TEAM_B_COLORS, type TeamColors } from '../../constants/teamColors';

interface CapturedCardsViewProps {
  /** Cards captured by the player */
  playerCaptures: Card[];
  /** Cards captured by the opponent */
  opponentCaptures: Card[];
  /** Player number (0-3) */
  playerNumber: number;
  /** Total player count (2 or 4) */
  playerCount?: number;
  /** All players' captures (for 4-player mode) */
  allPlayerCaptures?: Card[][];
  /** Whether it's this player's turn */
  isMyTurn?: boolean;
  /** Register captured card position */
  registerCapturedCard?: (bounds: CapturedCardBounds) => void;
  /** Unregister captured card */
  unregisterCapturedCard?: () => void;
  /** Register capture pile bounds */
  registerCapturePile?: (bounds: CapturePileBounds) => void;
  /** Unregister capture pile */
  unregisterCapturePile?: () => void;
  /** Find card at point (for detecting drag over table cards) */
  findCardAtPoint?: (x: number, y: number, excludeId?: string) => { id: string; card: Card } | null;
  /** Find temp stack at point */
  findTempStackAtPoint?: (x: number, y: number) => { stackId: string; owner: number; stackType: 'temp_stack' | 'build_stack' } | null;
  /** Callback when drag starts */
  onDragStart?: (card: Card, absoluteX: number, absoluteY: number) => void;
  /** Callback when drag moves */
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  /** Callback when drag ends - return action to send */
  onDragEnd?: (card: Card, targetCard?: Card, targetStackId?: string) => void;
  /** Extend build callback - for extending own build with captured card */
  onExtendBuild?: (card: Card, stackId: string, cardSource: 'table' | 'hand' | 'captured') => void;
  /** Opponent's drag state - for hiding cards when opponent is dragging */
  opponentDrag?: OpponentDragState | null;
  /** Party mode flag - for team colors */
  isPartyMode?: boolean;
  /** Current player index - for highlighting current turn */
  currentPlayerIndex?: number;
}

// ── Draggable Opponent Capture Card Component ─────────────────────────────────────

interface DraggableOpponentCardProps {
  card: Card;
  opponentIndex: number;
  isMyTurn: boolean;
  onDragStart?: (card: Card, absoluteX: number, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (card: Card, absX: number, absY: number) => void;
  findCardAtPoint?: (x: number, y: number, excludeId?: string) => { id: string; card: Card } | null;
  findTempStackAtPoint?: (x: number, y: number) => { stackId: string; owner: number; stackType: 'temp_stack' | 'build_stack' } | null;
  playerNumber: number;
  opponentDrag?: OpponentDragState | null;
  onExtendBuild?: (card: Card, stackId: string, cardSource: 'table' | 'hand' | 'captured') => void;
}

function DraggableOpponentCard({
  card,
  isMyTurn,
  onDragStart,
  onDragMove,
  onDragEnd,
  findCardAtPoint,
  findTempStackAtPoint,
  playerNumber,
  opponentDrag,
  onExtendBuild
}: DraggableOpponentCardProps) {
  const cardRef = useRef<View>(null);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const draggedCard = useSharedValue<Card | null>(null);

  const handleDragEndInternal = useCallback((card: Card, absX: number, absY: number) => {
    if (!onDragEnd || !findCardAtPoint || !findTempStackAtPoint) {
      return;
    }

    // Check if dropped on a loose card
    const targetCardResult = findCardAtPoint(absX, absY);
    if (targetCardResult) {
      onDragEnd(card, absX, absY);
      return;
    }

    // Check if dropped on a temp stack or build stack
    const targetStack = findTempStackAtPoint(absX, absY);
    if (targetStack) {
      if (targetStack.stackType === 'build_stack' && targetStack.owner === playerNumber) {
        if (onExtendBuild) {
          onExtendBuild(card, targetStack.stackId, 'captured');
        }
      } else if (targetStack.owner === playerNumber) {
        onDragEnd(card, absX, absY);
      }
      return;
    }

    // Reset position
    translateX.value = 0;
    translateY.value = 0;
  }, [onDragEnd, findCardAtPoint, findTempStackAtPoint, playerNumber, onExtendBuild, translateX, translateY]);

  const panGesture = Gesture.Pan()
    .enabled(isMyTurn)
    .onStart((event) => {
      isDragging.value = true;
      draggedCard.value = card;
      if (onDragStart) onDragStart(card, event.absoluteX, event.absoluteY);
    })
    .onUpdate((event) => {
      if (isDragging.value) {
        translateX.value = event.translationX;
        translateY.value = event.translationY;
        if (onDragMove) onDragMove(event.absoluteX, event.absoluteY);
      }
    })
    .onEnd((event) => {
      if (isDragging.value && draggedCard.value) {
        handleDragEndInternal(draggedCard.value, event.absoluteX, event.absoluteY);
      }
      setTimeout(() => {
        translateX.value = 0;
        translateY.value = 0;
        isDragging.value = false;
        draggedCard.value = null;
      }, 100);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    zIndex: isDragging.value ? 100 : 1,
    opacity: isDragging.value ? 0 : 1,
  }));

  // Check if this card is being dragged by opponent
  const cardId = `${card.rank}${card.suit}`;
  const isHidden = opponentDrag?.isDragging &&
                   opponentDrag.source === 'captured' &&
                   opponentDrag.cardId === cardId;

  if (isHidden) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>-</Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={animatedStyle}>
        <View ref={cardRef}>
          <PlayingCard rank={card.rank} suit={card.suit} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

// ── Main CapturedCardsView Component ───────────────────────────────────────────

export function CapturedCardsView({
  playerCaptures,
  opponentCaptures,
  playerNumber,
  playerCount = 2,
  allPlayerCaptures,
  isMyTurn = false,
  registerCapturedCard,
  unregisterCapturedCard,
  registerCapturePile,
  unregisterCapturePile,
  findCardAtPoint,
  findTempStackAtPoint,
  onDragStart,
  onDragMove,
  onDragEnd,
  onExtendBuild,
  opponentDrag,
  isPartyMode: isPartyModeProp,
  currentPlayerIndex,
}: CapturedCardsViewProps) {
  // Get team info for 4-player mode - use prop if available
  const isPartyMode = isPartyModeProp ?? playerCount === 4;
  
  // Get teammate index (for 4-player mode)
  const getTeammateIndex = (idx: number): number => {
    if (idx < 2) return idx === 0 ? 1 : 0; // Team A: 0↔1
    return idx === 2 ? 3 : 2; // Team B: 2↔3
  };
  
  const teammateIndex = isPartyMode ? getTeammateIndex(playerNumber) : (playerNumber === 0 ? 1 : 0);
  
  // For 2-player: opponent is player 1 - 0
  // For 4-player: opponents are players not on my team
  const getOpponentIndices = (): number[] => {
    if (!isPartyMode) return [playerNumber === 0 ? 1 : 0];
    // In party mode, opponents are players on the other team
    return playerNumber < 2 ? [2, 3] : [0, 1];
  };
  
  const opponentIndices = getOpponentIndices();
  
  // Player labels for display
  // For party mode: P1/P2 (minimal notation)
  // For 2-player: P1/P2
  const getPlayerLabel = (playerIdx: number): string => {
    if (!isPartyMode) return `P${playerIdx + 1}`;
    
    // Party mode: just show P1/P2 within team (minimal notation)
    const teamPlayer = playerIdx < 2 ? playerIdx + 1 : playerIdx - 1;
    return `P${teamPlayer}`;
  };
  
  // Get team colors for a player
  const getPlayerTeamColors = (playerIdx: number): TeamColors => {
    const team = getTeamFromIndex(playerIdx);
    return team === 'A' ? TEAM_A_COLORS : TEAM_B_COLORS;
  };
  
  // Create styled label with team background color
  const createTeamLabel = (playerIdx: number, captureCount: number) => {
    const colors = getPlayerTeamColors(playerIdx);
    const label = getPlayerLabel(playerIdx);
    return (
      <View style={[styles.teamLabelContainer, { backgroundColor: colors.primary }]}>
        <Text style={styles.teamLabelText}>{label} ({captureCount})</Text>
      </View>
    );
  };

  // Get captures arrays - use allPlayerCaptures if available
  const captures = allPlayerCaptures || [];
  const myCaptures = captures[playerNumber] || playerCaptures;
  const teammateCaptures = captures[teammateIndex] || [];
  const opponentCapturesList = opponentIndices.map(i => captures[i] || []);

  // Get the top card (last in array = most recently captured)
  const playerTopCard = myCaptures.length > 0 
    ? myCaptures[myCaptures.length - 1] 
    : null;
  const teammateTopCard = teammateCaptures.length > 0
    ? teammateCaptures[teammateCaptures.length - 1]
    : null;
  const opponentTopCards = opponentCapturesList.map(caps => 
    caps.length > 0 ? caps[caps.length - 1] : null
  );

  // Player capture pile ref
  const playerCaptureRef = useRef<View>(null);

  // Register player capture pile bounds
  const handlePlayerCaptureLayout = useCallback(() => {
    if (playerCaptureRef.current && registerCapturePile) {
      playerCaptureRef.current.measureInWindow((x, y, width, height) => {
        console.log('[CapturedCardsView] Registering player capture pile:', { x, y, width, height, playerIndex: playerNumber });
        registerCapturePile({ x, y, width, height, playerIndex: playerNumber });
      });
    }
  }, [registerCapturePile, playerNumber]);

  // Register player capture pile on mount
  useEffect(() => {
    if (playerCaptureRef.current && registerCapturePile) {
      setTimeout(() => {
        playerCaptureRef.current?.measureInWindow((x, y, width, height) => {
          console.log('[CapturedCardsView] Registering player capture pile:', { x, y, width, height, playerIndex: playerNumber });
          registerCapturePile({ x, y, width, height, playerIndex: playerNumber });
        });
      }, 100);
    }
  }, [registerCapturePile, playerNumber]);

  // Handle drag start for opponent cards
  const handleDragStartInternal = useCallback((card: Card, absX: number, absY: number) => {
    console.log('[CapturedCardsView] Opponent drag started:', card, 'at', absX, absY);
    if (onDragStart) onDragStart(card, absX, absY);
  }, [onDragStart]);

  // Handle drag move for opponent cards
  const handleDragMoveInternal = useCallback((x: number, y: number) => {
    if (onDragMove) onDragMove(x, y);
  }, [onDragMove]);

  // Handle drag end for opponent cards - need to use absolute position from event
  const handleDragEndInternal = useCallback((card: Card, absX: number, absY: number) => {
    if (!onDragEnd || !findCardAtPoint || !findTempStackAtPoint) {
      console.log('[CapturedCardsView] Drag ended - missing callbacks');
      return;
    }

    console.log('[CapturedCardsView] === Opponent Captured Card Drag End ===');
    console.log('[CapturedCardsView] Dragging card:', `${card.rank}${card.suit}`);
    console.log('[CapturedCardsView] Drop position:', { absX, absY });

    // Check if dropped on a loose card (using finger position directly)
    const targetCardResult = findCardAtPoint(absX, absY);
    console.log('[CapturedCardsView] findCardAtPoint result:', targetCardResult);
    
    if (targetCardResult) {
      console.log('[CapturedCardsView] Dropped on loose card:', targetCardResult);
      console.log('[CapturedCardsView] Calling onDragEnd with:', { 
        card: `${card.rank}${card.suit}`, 
        targetCard: `${targetCardResult.card.rank}${targetCardResult.card.suit}`
      });
      onDragEnd(card, targetCardResult.card);
      return;
    }

    // Check if dropped on a temp stack or build stack
    const targetStack = findTempStackAtPoint(absX, absY);
    if (targetStack) {
      console.log('[CapturedCardsView] Dropped on stack:', targetStack);
      
      // Check if it's a build stack - can extend own build
      if (targetStack.stackType === 'build_stack' && targetStack.owner === playerNumber) {
        console.log('[CapturedCardsView] Extending own build with captured card');
        if (onExtendBuild) {
          onExtendBuild(card, targetStack.stackId, 'captured');
        }
        return;
      }
      
      // Can only add to own temp stack
      if (targetStack.owner === playerNumber) {
        console.log('[CapturedCardsView] Adding to own temp stack');
        onDragEnd(card, undefined, targetStack.stackId);
      } else {
        console.log('[CapturedCardsView] Cannot add to opponent stack');
      }
      return;
    }

    console.log('[CapturedCardsView] No valid drop target found');
  }, [findCardAtPoint, findTempStackAtPoint, onDragEnd, onExtendBuild, playerNumber]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unregisterCapturedCard) {
        unregisterCapturedCard();
      }
      if (unregisterCapturePile) {
        unregisterCapturePile();
      }
    };
  }, [unregisterCapturedCard, unregisterCapturePile]);

  // Player section (always on right)
  const isPlayerActive = currentPlayerIndex === playerNumber;
  const playerTeamColors = getPlayerTeamColors(playerNumber);
  const playerRingColor = isPlayerActive ? playerTeamColors.primary : 'transparent';
  
  console.log('[CapturedCardsView] Player ring check:', {
    currentPlayerIndex,
    playerNumber,
    isPlayerActive,
    playerRingColor
  });
  
  const playerSection = (
    <View 
      style={styles.captureSection} 
      ref={playerCaptureRef} 
      onLayout={handlePlayerCaptureLayout}
      key="player"
    >
      {createTeamLabel(playerNumber, myCaptures.length)}
      <View style={[
        styles.cardContainer,
        isPlayerActive && styles.cardContainerActive,
        { borderColor: playerRingColor }
      ]}>
        {playerTopCard ? (
          <PlayingCard 
            rank={playerTopCard.rank} 
            suit={playerTopCard.suit} 
          />
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>-</Text>
          </View>
        )}
      </View>
    </View>
  );

  // Teammate section (for 4-player mode, below player)
  const isTeammateActive = currentPlayerIndex === teammateIndex;
  const teammateTeamColors = getPlayerTeamColors(teammateIndex);
  const teammateRingColor = isTeammateActive ? teammateTeamColors.primary : 'transparent';
  
  console.log('[CapturedCardsView] Teammate ring check:', {
    currentPlayerIndex,
    teammateIndex,
    isTeammateActive,
    teammateRingColor
  });
  
  const teammateSection = isPartyMode ? (
    <View style={styles.captureSection} key="teammate">
      {createTeamLabel(teammateIndex, teammateCaptures.length)}
      <View style={[
        styles.cardContainer,
        isTeammateActive && styles.cardContainerActive,
        { borderColor: teammateRingColor }
      ]}>
        {teammateTopCard ? (
          <PlayingCard 
            rank={teammateTopCard.rank} 
            suit={teammateTopCard.suit} 
          />
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>-</Text>
          </View>
        )}
      </View>
    </View>
  ) : null;

  // Render opponent sections with draggable cards
  const renderOpponentSection = (index: number) => {
    const topCard = opponentTopCards[index];
    const captures = opponentCapturesList[index];
    const opponentIdx = opponentIndices[index];
    const isOpponentActive = currentPlayerIndex === opponentIdx;
    const opponentTeamColors = getPlayerTeamColors(opponentIdx);
    const opponentRingColor = isOpponentActive ? opponentTeamColors.primary : 'transparent';
    
    console.log('[CapturedCardsView] Opponent ring check:', {
      index,
      opponentIdx,
      currentPlayerIndex,
      isOpponentActive,
      opponentRingColor
    });
    
    if (!topCard) {
      return (
        <View style={styles.captureSection} key={`opponent-${index}`}>
          {createTeamLabel(opponentIdx, captures.length)}
          <View style={[
            styles.cardContainer,
            isOpponentActive && styles.cardContainerActive,
            { borderColor: opponentRingColor }
          ]}>
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>-</Text>
            </View>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.captureSection} key={`opponent-${index}`}>
        {createTeamLabel(opponentIdx, captures.length)}
        <View style={[
          styles.cardContainer,
          isOpponentActive && styles.cardContainerActive,
          { borderColor: opponentRingColor }
        ]}>
          <DraggableOpponentCard
            card={topCard}
            opponentIndex={opponentIndices[index]}
            isMyTurn={isMyTurn}
            onDragStart={handleDragStartInternal}
            onDragMove={handleDragMoveInternal}
            onDragEnd={handleDragEndInternal}
            findCardAtPoint={findCardAtPoint}
            findTempStackAtPoint={findTempStackAtPoint}
            playerNumber={playerNumber}
            opponentDrag={opponentDrag}
            onExtendBuild={onExtendBuild}
          />
        </View>
      </View>
    );
  };

  // For 4-player mode: LEFT = [opponent1, opponent2], RIGHT = [player, teammate]
  // Current: Purple P1 + Purple P2 on LEFT, Orange P1 + Orange P2 on RIGHT
  // Swapped: Purple P1 + Orange P2 on LEFT, Orange P1 + Purple P2 on RIGHT
  const leftSidePlayerIndices: number[] = isPartyMode 
    ? [opponentIndices[0], teammateIndex]  // Purple P1 + Orange P2 (SWAPPED)
    : [opponentIndices[0]];
  
  const rightSidePlayerIndices: number[] = isPartyMode 
    ? [playerNumber, opponentIndices[1]]  // Orange P1 + Purple P2 (SWAPPED)
    : [playerNumber];

  // Helper to render a player section by index
  const renderPlayerSectionByIndex = (idx: number, isMyOwn: boolean) => {
    if (idx === playerNumber) {
      return playerSection;
    } else if (idx === teammateIndex) {
      return teammateSection;
    } else {
      // It's an opponent - find its position in opponentIndices
      const oppIdx = opponentIndices.indexOf(idx);
      if (oppIdx >= 0) {
        return renderOpponentSection(oppIdx);
      }
      return null;
    }
  };

  // Render left side players
  const leftSideSections = leftSidePlayerIndices.map((idx: number, i: number) => (
    <View key={`left-${i}`}>
      {renderPlayerSectionByIndex(idx, false)}
    </View>
  ));

  // Render right side players
  const rightSideSections = rightSidePlayerIndices.map((idx: number, i: number) => (
    <View key={`right-${i}`}>
      {renderPlayerSectionByIndex(idx, idx === playerNumber)}
    </View>
  ));

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* LEFT side */}
      <View style={styles.sideContainer}>
        {leftSideSections}
      </View>
      {/* RIGHT side */}
      <View style={styles.sideContainer}>
        {rightSideSections}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  sideContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  captureSection: {
    alignItems: 'center',
    width: 70,
  },
  labelWithCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  teamLabelContainer: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 4,
  },
  teamLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cardContainer: {
    width: 56,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardContainerActive: {
    borderWidth: 3,
  },
  emptyCard: {
    width: 56,
    height: 84,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 24,
  },
});

export default CapturedCardsView;

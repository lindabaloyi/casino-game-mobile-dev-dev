/**
  * CapturedCardsView
  * Displays captured cards on the sides of the table area.
  * 
  * - LEFT side: Opponent's captures (draggable - can play from)
  * - RIGHT side: Your captures (drop target - can capture to)
  * - Shows the TOP card (last in array = most recently captured)
  * 
  * Supports multi-player modes:
  * - 2-player: LEFT = opponent, RIGHT = player
  * - 3-player: LEFT = opponent 1 + opponent 2, RIGHT = player
  * - 4-player party: LEFT = opponent + teammate, RIGHT = player + opponent
  * - 4-player freeforall: LEFT = 2 opponents, RIGHT = player + opponent
  */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card } from './types';
import { CapturePileBounds, CapturedCardBounds } from '../../hooks/useDrag';
import { OpponentDragState } from '../../hooks/useGameState';
import { usePlayerTeam } from '../../hooks/usePlayerTeam';
import { CapturePile } from './CapturePile';

interface CapturedCardsViewProps {
  /** Cards captured by the player */
  playerCaptures: Card[];
  /** Cards captured by the opponent */
  opponentCaptures: Card[];
  /** Player number (0-3) */
  playerNumber: number;
  /** Total player count (2, 3, or 4) */
  playerCount?: number;
  /** All players' captures (for 3+ player mode) */
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
  unregisterCapturePile?: (playerIndex: number) => void;
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
  /** Game mode type - for special rendering (two-hands for 3-player, freeforall for 4-player) */
  gameMode?: 'two-hands' | 'three-hands' | 'party' | 'freeforall';
}

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
  gameMode,
}: CapturedCardsViewProps) {
  // Use the team utilities hook
  const {
    isPartyMode,
    teammateIndex,
    opponentIndices,
    getPlayerLabel,
    getPlayerTeamColors,
  } = usePlayerTeam(playerNumber, playerCount);

  // Override isPartyMode if explicitly provided
  const finalIsPartyMode = isPartyModeProp ?? isPartyMode;

  // Get captures arrays - use allPlayerCaptures if available
  const captures = allPlayerCaptures || [];
  const myCaptures = captures[playerNumber] || playerCaptures;
  const teammateCaptures = captures[teammateIndex] || [];
  const opponentCapturesList = opponentIndices.map(i => captures[i] || []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unregisterCapturedCard) {
        unregisterCapturedCard();
      }
    };
  }, [unregisterCapturedCard]);

  // Get captures for a specific player index
  const getCapturesForIndex = (idx: number): Card[] => {
    if (idx === playerNumber) return myCaptures;
    if (idx === teammateIndex) return teammateCaptures;
    const oppIdx = opponentIndices.indexOf(idx);
    if (oppIdx >= 0) return opponentCapturesList[oppIdx];
    return [];
  };

  // Determine if a pile is draggable
  // In party mode: only opponents are draggable, not teammate
  // In non-party mode: the single opponent is draggable
  const isPileDraggable = (idx: number): boolean => {
    if (idx === playerNumber) return false; // Can't drag own cards
    if (finalIsPartyMode && idx === teammateIndex) return false; // Can't drag teammate's cards in party mode
    // All other players (opponents) are draggable
    return true;
  };

  // Build left and right side player lists
   // For 2-player: LEFT = opponent, RIGHT = player
   // For 3-player: LEFT = opponent 1 + opponent 2, RIGHT = player
   // For 4-player party: LEFT = opponent + teammate, RIGHT = player + opponent
   // For 4-player freeforall: LEFT = 2 opponents, RIGHT = player + opponent
   
   let leftSideIndices: number[];
   let rightSideIndices: number[];
   
   // Filter out invalid indices (-1) to prevent rendering ghost players
   const validOpponentIndices = opponentIndices.filter(i => i >= 0);
   const validTeammateIndex = teammateIndex >= 0 ? teammateIndex : null;
   
   if (playerCount === 2) {
     leftSideIndices = validOpponentIndices.length > 0 ? [validOpponentIndices[0]] : [];
     rightSideIndices = [playerNumber];
   } else if (playerCount === 3) {
     // 3-player: show both opponents on left, player on right
     leftSideIndices = validOpponentIndices.slice(0, 2);
     rightSideIndices = [playerNumber];
   } else if (playerCount === 4 && finalIsPartyMode && validTeammateIndex !== null) {
     // 4-player party: left = opponent + teammate, right = player + other opponent
     leftSideIndices = [validOpponentIndices[0], validTeammateIndex];
     rightSideIndices = [playerNumber, validOpponentIndices[1] ?? playerNumber];
   } else {
     // 4-player free-for-all: left = 2 opponents, right = player + opponent
     leftSideIndices = validOpponentIndices.slice(0, 2);
     rightSideIndices = [playerNumber, validOpponentIndices[2] ?? playerNumber];
   }

  // Render a single pile
  const renderPile = (idx: number) => {
    const pileCaptures = getCapturesForIndex(idx);
    
    return (
      <CapturePile
        key={`pile-${idx}`}
        playerIndex={idx}
        captures={pileCaptures}
        isActive={currentPlayerIndex === idx}
        isMyTurn={isMyTurn}
        isDraggable={isPileDraggable(idx)}
        playerNumber={playerNumber}
        playerCount={playerCount}
        isPartyMode={finalIsPartyMode}
        onDragStart={onDragStart as any}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd as any}
        findCardAtPoint={findCardAtPoint}
        findTempStackAtPoint={findTempStackAtPoint}
        onExtendBuild={onExtendBuild as any}
        opponentDrag={opponentDrag}
        registerCapturePile={registerCapturePile}
        unregisterCapturePile={unregisterCapturePile}
        getPlayerLabel={getPlayerLabel}
        getPlayerTeamColors={getPlayerTeamColors}
      />
    );
  };

  // Render left side piles
  const leftSidePiles = leftSideIndices.map((idx: number, i: number) => (
    <View key={`left-${i}`}>
      {renderPile(idx)}
    </View>
  ));

  // Render right side piles
  const rightSidePiles = rightSideIndices.map((idx: number, i: number) => (
    <View key={`right-${i}`}>
      {renderPile(idx)}
    </View>
  ));

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* LEFT side: Opponents + teammate (in party mode) */}
      <View style={styles.sideContainer}>
        {leftSidePiles}
      </View>
      {/* RIGHT side: Player */}
      <View style={styles.sideContainer}>
        {rightSidePiles}
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
});

export default CapturedCardsView;

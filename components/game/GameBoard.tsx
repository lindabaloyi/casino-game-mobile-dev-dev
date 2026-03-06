/**
 * GameBoard — orchestrator
 *
 * Single responsibility: wire data → callbacks → sub-components.
 * No styles, no layout logic, no UI primitives here.
 *
 * Sub-components own their own look:
 *   GameStatusBar   — round / turn / score display
 *   TableArea       — table drop zone + card display (loose cards + temp stacks)
 *   PlayerHandArea  — scrollable draggable hand
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { GameState, OpponentDragState } from '../../hooks/useGameState';
import { useDrag } from '../../hooks/useDrag';
import { useDragOverlay } from '../../hooks/drag/useDragOverlay';
import { useModalManager } from '../../hooks/game/useModalManager';
import { useGameActions } from '../../hooks/game/useGameActions';
import { useGameComputed } from '../../hooks/game/useGameComputed';
import { useGameRound } from '../../hooks/game/useGameRound';
import { useDragHandlers } from '../../hooks/game/useDragHandlers';
import { useActionHandlers } from '../../hooks/game/useActionHandlers';
import { useTableBounds } from '../../hooks/game/useTableBounds';

import { GameStatusBar } from './GameStatusBar';
import { TableArea } from '../table/TableArea';
import { PlayerHandArea } from './PlayerHandArea';
import { GameModals } from './GameModals';
import { DragGhost } from './DragGhost';
import { OpponentGhostCard } from './OpponentGhostCard';
import { ErrorBanner } from '../shared/ErrorBanner';
import { Card as TableCard } from '../../types';
import { RoundEndModal } from '../modals/RoundEndModal';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GameBoardProps {
  gameState: GameState;
  playerNumber: number;
  sendAction: (action: { type: string; payload?: Record<string, unknown> }) => void;
  startNextRound?: () => void;
  onRestart?: () => void;
  onBackToMenu?: () => void;
  serverError?: { message: string } | null;
  onServerErrorClose?: () => void;
  /** Opponent's current drag state for ghost card rendering */
  opponentDrag?: OpponentDragState | null;
  /** Emit drag start event to server for broadcasting */
  emitDragStart?: (card: any, source: any, position: { x: number; y: number }) => void;
  /** Emit drag move event to server (throttled) */
  emitDragMove?: (card: any, position: { x: number; y: number }) => void;
  /** Emit drag end event to server */
  emitDragEnd?: (card: any, position: { x: number; y: number }, outcome: any, targetType?: any, targetId?: any) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GameBoard({
  gameState,
  playerNumber,
  sendAction,
  startNextRound,
  serverError,
  onServerErrorClose,
  opponentDrag,
  emitDragStart,
  emitDragMove,
  emitDragEnd,
}: GameBoardProps) {
  // Local state
  const [errorVersion, setErrorVersion] = useState(0);
  const [dragVersion, setDragVersion] = useState(0);
  const [showRoundEnd, setShowRoundEnd] = useState(false);

  // Effects
  useEffect(() => {
    if (serverError) {
      setErrorVersion(v => v + 1);
    }
  }, [serverError]);

  // Core hooks
  const drag = useDrag();
  const dragOverlay = useDragOverlay();
  const modals = useModalManager();
  const actions = useGameActions(sendAction);
  
  // Computed values
  const computed = useGameComputed(gameState, playerNumber);
  const { getTableBounds } = useTableBounds(drag.dropBounds);
  const roundInfo = useGameRound(gameState);

  // Show round end modal when round is over
  useEffect(() => {
    console.log(`[GameBoard] roundInfo updated: isOver=${roundInfo.isOver}, showRoundEnd=${showRoundEnd}`);
    if (roundInfo.isOver && !showRoundEnd) {
      console.log(`[GameBoard] 🏁 Round ended, showing modal`);
      console.log(`[GameBoard] Final state: cardsRemaining=[${roundInfo.cardsRemaining}]`);
      setShowRoundEnd(true);
    }
  }, [roundInfo.isOver, showRoundEnd, roundInfo.roundNumber, roundInfo.endReason, roundInfo.cardsRemaining]);

  // Handle round end modal close
  // For local game: transition to next round
  // For multiplayer: server auto-transitions, but we check if round already changed
  const handleRoundEndClose = () => {
    setShowRoundEnd(false);
    
    // For local game, manually transition to next round
    // The startNextRound function is only provided for local game mode
    // (for multiplayer, server auto-transitions)
    if (startNextRound && roundInfo.roundNumber === 1) {
      console.log('[GameBoard] Modal closed, starting next round for local game');
      startNextRound();
    }
  };

  // Handle next round

  // Drag end wrapper
  const handleDragEndWrapper = () => {
    setDragVersion(v => v + 1);
  };

  // Drag handlers
  const dragHandlers = useDragHandlers({
    dragOverlay,
    dropBounds: drag.dropBounds,
    emitDragStart,
    emitDragMove,
    emitDragEnd,
    findCapturePileAtPoint: drag.findCapturePileAtPoint,
    findCardAtPoint: drag.findCardAtPoint,
    findTempStackAtPoint: drag.findTempStackAtPoint,
    playerNumber,
    actions,
    onDragEndWrapper: handleDragEndWrapper,
    openStealModal: modals.openStealModal,
    table: computed.table,
  });

  // Action handlers
  const actionHandlers = useActionHandlers(
    actions,
    modals,
    computed.table,
    playerNumber,
    dragHandlers.handleDragEnd
  );

  // ── Unified Drop Handler ─────────────────────────────────────────────────
  // Centralized logic for all stack drops (hand, table, captured cards)
  // Ensures consistent validation and modal handling
  // Priority: CAPTURE (direct) > STEAL (modal) > BLOCK
  const handleDropOnStack = useCallback((
    card: any,
    stackId: string,
    stackOwner: number,
    stackType: string,
    source: 'hand' | 'table' | 'captured'
  ) => {
    console.log(`[GameBoard] handleDropOnStack - card: ${card.rank}${card.suit}, stack: ${stackId}, type: ${stackType}, source: ${source}`);
    
    // Common: Hide end turn button when player makes a new action
    modals.hideEndTurnButton();

    // Check if this is an opponent's build - validate steal vs capture
    if (stackType === 'build_stack' && stackOwner !== playerNumber) {
      const buildStack = computed.table.find(
        (tc: any) => tc.stackId === stackId && tc.type === 'build_stack'
      );
      
      if (buildStack) {
        const fullStack = buildStack as any;
        
        // PRIORITY 1: If card value matches build value → CAPTURE (direct, no modal)
        if (card.value === fullStack.value) {
          console.log(`[GameBoard] handleDropOnStack - CAPTURE: card value ${card.value} matches build value ${fullStack.value}`);
          actions.stackDrop(card, stackId, stackOwner, stackType as 'temp_stack' | 'build_stack', source);
          return;
        }
        
        // PRIORITY 2: Check if steal is valid (not a base build)
        if (fullStack.hasBase === true) {
          console.log(`[GameBoard] handleDropOnStack - BLOCKED: Cannot steal base build ${stackId} (hasBase: ${fullStack.hasBase}, buildType: ${fullStack.buildType})`);
          // Fall through to action which will fail appropriately
        } else {
          console.log(`[GameBoard] handleDropOnStack - STEAL: card value ${card.value} != build value ${fullStack.value}, opening steal modal`);
          modals.openStealModal(card, fullStack);
          return; // Stop here - modal is open
        }
      }
    }
    
    // Default: Forward to stackDrop action with source info
    actions.stackDrop(card, stackId, stackOwner, stackType as 'temp_stack' | 'build_stack', source);
  }, [playerNumber, computed.table, modals, actions]);

  // Render
  return (
    <View style={styles.root}>
      {serverError && (
        <ErrorBanner 
          message={serverError.message} 
          onClose={onServerErrorClose} 
        />
      )}

      <GameStatusBar
        round={gameState.round}
        currentPlayer={gameState.currentPlayer}
        playerNumber={playerNumber}
        scores={gameState.scores as [number, number]}
        cardsRemaining={roundInfo.cardsRemaining as [number, number]}
      />

      <TableArea
        tableCards={computed.table}
        tableVersion={computed.tableVersion}
        isMyTurn={computed.isMyTurn}
        playerNumber={playerNumber}
        tableRef={drag.tableRef}
        onTableLayout={drag.onTableLayout}
        registerCard={drag.registerCard}
        unregisterCard={drag.unregisterCard}
        registerTempStack={drag.registerTempStack}
        unregisterTempStack={drag.unregisterTempStack}
        findCardAtPoint={drag.findCardAtPoint}
        findTempStackAtPoint={drag.findTempStackAtPoint}
        onTableCardDropOnCard={actions.createTemp}
        onStackDrop={(card, stackId, owner, stackType) => handleDropOnStack(card, stackId, owner, stackType, 'table')}
        onTableDragStart={dragHandlers.handleTableDragStart}
        onTableDragMove={dragHandlers.handleDragMove}
        onTableDragEnd={dragHandlers.handleTableDragEnd}
        overlayStackId={computed.overlayStackId}
        onAcceptTemp={actionHandlers.handleAcceptClick}
        onCancelTemp={actions.cancelTemp}
        onCapture={actionHandlers.handleCapture}
        playerCaptures={computed.playerCaptures}
        opponentCaptures={computed.opponentCaptures}
        playerCount={computed.playerCount}
        allPlayerCaptures={computed.allPlayerCaptures}
        registerCapturedCard={drag.registerCapturedCard}
        unregisterCapturedCard={drag.unregisterCapturedCard}
        onCapturedCardDragStart={dragHandlers.handleCapturedDragStart}
        onCapturedCardDragMove={dragOverlay.moveDrag}
        onCapturedCardDragEnd={(card, targetCard, targetStackId) => {
          console.log(`[GameBoard] onCapturedCardDragEnd - card: ${card?.rank}${card?.suit}`);
          if (targetCard) {
            actions.createTemp(card, targetCard);
          } else if (targetStackId) {
            actions.addToTemp(card, targetStackId);
          }
          dragOverlay.endDrag();
        }}
        findCapturePileAtPoint={drag.findCapturePileAtPoint}
        registerCapturePile={drag.registerCapturePile}
        unregisterCapturePile={drag.unregisterCapturePile}
        onDropToCapture={actions.dropToCapture}
        extendingBuildId={computed.extendingBuildId}
        onExtendBuild={actionHandlers.handleExtendBuild}
        onAcceptExtend={actionHandlers.handleExtendAcceptClick}
        onDeclineExtend={actionHandlers.handleDeclineExtend}
        playerHand={computed.myHand}
        opponentDrag={opponentDrag}
        // Disable only the temp stack overlay when action buttons are shown in player hand
        // ExtensionOverlay should still show when extendingBuildId is set
        disableOverlays={!!computed.overlayStackId}
      />

      <PlayerHandArea
        key={`playerHand-${errorVersion}-${dragVersion}`}
        hand={computed.myHand}
        isMyTurn={computed.isMyTurn}
        playerNumber={playerNumber}
        dropBounds={drag.dropBounds}
        findCardAtPoint={drag.findCardAtPoint}
        findTempStackAtPoint={drag.findTempStackAtPoint}
        tableCards={computed.table}
        onDropOnStack={(card, stackId, stackOwner, stackType) => handleDropOnStack(card, stackId, stackOwner, stackType, 'hand')}
        onDropOnCard={(card, targetCard) => {
          console.log(`[GameBoard] onDropOnCard - card: ${card.rank}${card.suit}`);
          modals.hideEndTurnButton();
          actions.createTemp(card, targetCard);
        }}
        onDropOnTable={(card) => {
          console.log(`[GameBoard] onDropOnTable - card: ${card.rank}${card.suit}`);
          modals.hideEndTurnButton();
          actionHandlers.handleTrail(card);
        }}
        onDragStart={dragHandlers.handleHandDragStart}
        onDragMove={dragHandlers.handleDragMove}
        onDragEnd={dragHandlers.handleDragEnd}
        opponentDrag={opponentDrag}
        // Stack action props for action strip in hand area
        activeStackId={computed.overlayStackId || computed.extendingBuildId}
        activeStackType={computed.overlayStackId ? 'temp_stack' : (computed.extendingBuildId ? 'extend_build' : null)}
        onAcceptStack={computed.overlayStackId ? actionHandlers.handleAcceptClick : (computed.extendingBuildId ? actionHandlers.handleExtendAcceptClick : undefined)}
        onCancelStack={computed.overlayStackId ? actions.cancelTemp : (computed.extendingBuildId ? actionHandlers.handleDeclineExtend : undefined)}
        showEndTurnButton={modals.showEndTurnButton}
        onEndTurn={actions.endTurn}
      />

      <DragGhost 
        draggingCard={dragOverlay.draggingCard}
        ghostStyle={dragOverlay.ghostStyle}
      />

      {opponentDrag?.isDragging && (
        <OpponentGhostCard
          card={opponentDrag.card}
          position={opponentDrag.position}
          tableBounds={getTableBounds()}
          targetType={opponentDrag.targetType}
          targetId={opponentDrag.targetId}
          cardPositions={drag.cardPositions.current}
          stackPositions={drag.tempStackPositions.current}
        />
      )}

      <GameModals
        showPlayModal={modals.showPlayModal}
        selectedTempStack={modals.selectedTempStack}
        playerHand={computed.myHand as TableCard[]}
        onConfirmPlay={actionHandlers.handleConfirmPlay}
        onCancelPlay={modals.closePlayModal}
        showStealModal={modals.showStealModal}
        stealTargetCard={modals.stealTargetCard}
        stealTargetStack={modals.stealTargetStack}
        playerNumber={playerNumber}
        onConfirmSteal={actionHandlers.handleConfirmSteal}
        onCancelSteal={modals.closeStealModal}
        onStealCompleted={modals.onStealCompleted}
      />

      <RoundEndModal
        visible={showRoundEnd}
        roundNumber={roundInfo.roundNumber}
        endReason={roundInfo.endReason as 'all_cards_played' | undefined}
        scores={gameState.scores as [number, number]}
        // For multiplayer: server handles round transitions automatically, so hide Next Round button
        // For local game: the startNextRound callback will be provided
        onNextRound={startNextRound ? () => {
          setShowRoundEnd(false);
          startNextRound();
        } : undefined}
        onClose={handleRoundEndClose}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1B5E20',
  },
});

export default GameBoard;

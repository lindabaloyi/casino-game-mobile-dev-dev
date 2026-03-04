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

import React, { useState, useEffect } from 'react';
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
    if (roundInfo.isOver && !showRoundEnd) {
      console.log(`[GameBoard] 🏁 Showing RoundEndModal: round=${roundInfo.roundNumber}, reason=${roundInfo.endReason}`);
      console.log(`[GameBoard] Final state: cardsRemaining=[${roundInfo.cardsRemaining}]`);
      setShowRoundEnd(true);
    }
  }, [roundInfo.isOver, showRoundEnd, roundInfo.roundNumber, roundInfo.endReason, roundInfo.cardsRemaining]);

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
        cardsRemaining={roundInfo.cardsRemaining}
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
        onStackDrop={(card, stackId, owner, stackType) => {
          console.log(`[GameBoard] onStackDrop - card: ${card.rank}${card.suit}, stack: ${stackId}, type: ${stackType}, owner: P${owner}`);
          actions.stackDrop(card, stackId, owner, stackType, 'table');
        }}
        onTableDragStart={dragHandlers.handleTableDragStart}
        onTableDragMove={dragHandlers.handleDragMove}
        onTableDragEnd={dragHandlers.handleTableDragEnd}
        overlayStackId={computed.overlayStackId}
        onAcceptTemp={actionHandlers.handleAcceptClick}
        onCancelTemp={actions.cancelTemp}
        onCapture={actionHandlers.handleCapture}
        playerCaptures={computed.playerCaptures}
        opponentCaptures={computed.opponentCaptures}
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
        onDropOnStack={(card, stackId, stackOwner, stackType) => {
          console.log(`[GameBoard] onDropOnStack - card: ${card.rank}${card.suit}`);
          
          // Hide end turn button when player makes a new action
          modals.hideEndTurnButton();
          
          // Check if this is an opponent's build - show steal modal
          if (stackType === 'build_stack' && stackOwner !== playerNumber) {
            // Find the build stack from table
            const buildStack = computed.table.find(
              (tc: any) => tc.stackId === stackId && tc.type === 'build_stack'
            );
            if (buildStack) {
              console.log(`[GameBoard] Opening steal modal for opponent's build: ${stackId}`);
              modals.openStealModal(card, buildStack as any);
              return;
            }
          }
          
          actions.stackDrop(card, stackId, stackOwner, stackType, 'hand');
        }}
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
        activeStackId={computed.overlayStackId}
        activeStackType={computed.overlayStackId ? 'temp_stack' : null}
        onAcceptStack={computed.overlayStackId ? actionHandlers.handleAcceptClick : undefined}
        onCancelStack={computed.overlayStackId ? actions.cancelTemp : undefined}
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
        endReason={roundInfo.endReason}
        scores={gameState.scores as [number, number]}
        onNextRound={() => {
          setShowRoundEnd(false);
          if (startNextRound) {
            startNextRound();
          }
        }}
        onClose={() => setShowRoundEnd(false)}
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

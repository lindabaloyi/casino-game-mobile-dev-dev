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
 *
 * Drag-overlay pattern
 * ────────────────────
 * React Native's ScrollView cannot have overflow:visible, so a dragged card
 * rendered inside it will always be clipped by the ScrollView boundary.
 * To fix this we use a "portal" pattern:
 *   1. When drag starts, DraggableHandCard hides itself (opacity → 0).
 *   2. GameBoard receives onDragStart/Move/End callbacks and renders a ghost
 *      PlayingCard in a full-screen absolutely-positioned overlay — the LAST
 *      child of the root, so it always paints above everything else.
 *   3. The ghost follows the finger via Reanimated shared values (no React
 *      state updates, no re-renders per frame).
 */

import React, { useMemo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { GameState, OpponentDragState } from '../../hooks/useGameState';
import { useDrag } from '../../hooks/useDrag';
import { GameStatusBar } from './GameStatusBar';
import { TableArea } from '../table/TableArea';
import { PlayerHandArea } from './PlayerHandArea';
import { PlayingCard } from '../cards/PlayingCard';
import { PlayOptionsModal } from '../table/PlayOptionsModal';
import { StealBuildModal } from '../table/StealBuildModal';
// import { ExtendBuildModal } from '../table/ExtendBuildModal'; // Not used in drag-drop flow
import { TempStack, Card as TableCard, BuildStack } from '../table/types';

// Hooks
import { useDragOverlay } from './hooks/useDragOverlay';
import { useStealDetection } from './hooks/useStealDetection';
import { useModalManager } from './hooks/useModalManager';
import { useGameActions } from './hooks/useGameActions';
import { OpponentGhostCard } from './OpponentGhostCard';

// ── Constants ─────────────────────────────────────────────────────────────────

const CARD_WIDTH  = 56;
const CARD_HEIGHT = 84;

// ── Types ─────────────────────────────────────────────────────────────────────

interface GameBoardProps {
  gameState: GameState;
  playerNumber: number;
  sendAction: (action: { type: string; payload?: Record<string, unknown> }) => void;
  onRestart?: () => void;
  onBackToMenu?: () => void;
  serverError?: { message: string } | null;
  onServerErrorClose?: () => void;
  /** Opponent's current drag state for ghost card rendering */
  opponentDrag?: OpponentDragState | null;
  /** Emit drag start event to server for broadcasting */
  emitDragStart?: (card: { rank: string; suit: string; value: number }, source: 'hand' | 'table' | 'captured', position: { x: number; y: number }) => void;
  /** Emit drag move event to server (throttled) */
  emitDragMove?: (card: { rank: string; suit: string; value: number }, position: { x: number; y: number }) => void;
  /** Emit drag end event to server */
  emitDragEnd?: (card: { rank: string; suit: string; value: number }, position: { x: number; y: number }, outcome: 'success' | 'miss' | 'cancelled', targetType?: string, targetId?: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GameBoard({
  gameState,
  playerNumber,
  sendAction,
  serverError,
  onServerErrorClose,
  opponentDrag,
  emitDragStart,
  emitDragMove,
  emitDragEnd,
}: GameBoardProps) {
  // ── Context Value ─────────────────────────────────────────────────────────
  // (We don't use context provider - passing sendAction directly to hooks)

  // ── Derived data ──────────────────────────────────────────────────────────
  const isMyTurn = gameState.currentPlayer === playerNumber;
  const myHand = useMemo(() => gameState.playerHands?.[playerNumber] ?? [], [gameState.playerHands, playerNumber]);
  const table = useMemo(() => gameState.tableCards ?? [], [gameState.tableCards]);
  
  const playerCaptures = useMemo(() => gameState.playerCaptures?.[playerNumber] ?? [], [gameState.playerCaptures, playerNumber]);
  const opponentCaptures = useMemo(() => gameState.playerCaptures?.[playerNumber === 0 ? 1 : 0] ?? [], [gameState.playerCaptures, playerNumber]);

  // Table version counter
  const tableVersion = useMemo(() => {
    const cards = gameState.tableCards ?? [];
    const cardCount = cards.length;
    const idString = cards.map((c: any) => c.stackId || `${c.rank}${c.suit}`).join('');
    return cardCount + idString.length;
  }, [gameState.tableCards]);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const {
    tableRef,
    dropBounds,
    onTableLayout,
    registerCard,
    unregisterCard,
    findCardAtPoint,
    getCardPosition,
    
    registerTempStack,
    unregisterTempStack,
    findTempStackAtPoint,
    getStackPosition,
    
    registerCapturedCard,
    unregisterCapturedCard,
    findCapturePileAtPoint,
    registerCapturePile,
    unregisterCapturePile,
    cardPositions,
    tempStackPositions,
  } = useDrag();

  const dragOverlay = useDragOverlay();
  const stealDetection = useStealDetection(playerNumber);
  const modals = useModalManager();
  const actions = useGameActions(sendAction);

  // ── Computed values ───────────────────────────────────────────────────────
  // Find overlay stack (player's temp stack that needs accepting)
  const overlayStackId: string | null = useMemo(() => {
    if (!isMyTurn) return null;
    const myTemp = table.find(
      (tc: any) => tc.type === 'temp_stack' && tc.owner === playerNumber,
    ) as TempStack | undefined;
    return myTemp?.stackId ?? null;
  }, [table, isMyTurn, playerNumber]);

  // ── Drag Handlers ─────────────────────────────────────────────────────────
  
  const handleTableDragStart = useCallback((card: any) => {
    console.log('[GameBoard] handleTableDragStart called with card:', card);
    const cardId = `${card.rank}${card.suit}`;
    dragOverlay.startDrag(card, 'table');
    // Emit drag start to server for broadcasting to opponent
    // Note: This is called when dragging a TABLE card (loose card on table)
    if (emitDragStart) {
      emitDragStart(card, 'table', { x: 0.5, y: 0.5 }); // TABLE not hand!
    }
  }, [dragOverlay, emitDragStart]);

  // Wrapper for captured card drag start (single arg)
  const handleCapturedDragStart = useCallback((card: any) => {
    dragOverlay.startDrag(card, 'captured');
    // Emit drag start to server for broadcasting to opponent
    if (emitDragStart) {
      console.log('[GameBoard] Emitting dragStart for captured card');
      emitDragStart(card, 'captured', { x: 0.5, y: 0.5 });
    }
  }, [dragOverlay, emitDragStart]);

  const handleDragMove = useCallback(
    (absoluteX: number, absoluteY: number) => {
      // Debug: measure frame timing
      const startTime = Date.now();
      
      dragOverlay.moveDrag(absoluteX, absoluteY);

      // Emit drag move to server for broadcasting to opponent
      if (emitDragMove && dragOverlay.draggingCard) {
        // Convert to normalized coordinates (placeholder - should use actual table bounds)
        emitDragMove(dragOverlay.draggingCard, { x: absoluteX / 400, y: absoluteY / 300 });
      }

      // Check if over opponent's build - show steal overlay
      const stackHit = findTempStackAtPoint?.(absoluteX, absoluteY);
      if (stackHit) {
        const stack = table.find(
          (tc: any) => tc.stackId === stackHit.stackId && tc.type === 'build_stack',
        ) as BuildStack | undefined;
        
        if (stack && stack.owner !== playerNumber) {
          stealDetection.showOverlay(stack, absoluteX, absoluteY);
          const elapsed = Date.now() - startTime;
          if (elapsed > 10) console.log(`[GameBoard] handleDragMove slow: ${elapsed}ms`);
          return;
        }
      }
      
      // Not over opponent's build - hide overlay
      if (stealDetection.showStealOverlay) {
        stealDetection.hideOverlay();
      }
      
      const elapsed = Date.now() - startTime;
      if (elapsed > 10) console.log(`[GameBoard] handleDragMove slow: ${elapsed}ms`);
    },
    [dragOverlay, findTempStackAtPoint, table, playerNumber, stealDetection, emitDragMove],
  );

  const handleDragEnd = useCallback((targetType?: string, outcome: 'success' | 'miss' | 'cancelled' = 'cancelled', targetId?: string) => {
    // Emit drag end to server
    if (emitDragEnd && dragOverlay.draggingCard) {
      emitDragEnd(dragOverlay.draggingCard, { x: 0.5, y: 0.5 }, outcome, targetType, targetId);
    }
    dragOverlay.endDrag();
    stealDetection.hideOverlay();
  }, [dragOverlay, stealDetection, emitDragEnd]);

  const handleTableDragEnd = useCallback(() => {
    const absX = dragOverlay.overlayX.value + CARD_WIDTH / 2;
    const absY = dragOverlay.overlayY.value + CARD_HEIGHT / 2;

    let targetType: string | undefined;
    let targetId: string | undefined;
    let outcome: 'success' | 'miss' | 'cancelled' = 'miss';

    // Check capture pile
    if (findCapturePileAtPoint) {
      const capturePile = findCapturePileAtPoint(absX, absY);
      if (capturePile) {
        targetType = 'capture';
        outcome = 'success';
        handleDragEnd(targetType, outcome);
        return;
      }
    }

    // Check loose cards
    const targetCardResult = findCardAtPoint?.(absX, absY);
    if (targetCardResult && dragOverlay.draggingCard) {
      targetType = 'card';
      targetId = targetCardResult.id;
      outcome = 'success';
      actions.createTemp(dragOverlay.draggingCard, targetCardResult.card);
      handleDragEnd(targetType, outcome, targetId);
      return;
    }

    // Check temp stacks (only temp_stack, not build_stack)
    const targetStack = findTempStackAtPoint?.(absX, absY);
    if (targetStack && targetStack.stackType === 'temp_stack' && dragOverlay.draggingCard) {
      targetType = 'temp_stack';
      targetId = targetStack.stackId;
      outcome = 'success';
      if (targetStack.owner === playerNumber) {
        actions.addToTemp(dragOverlay.draggingCard, targetStack.stackId);
      }
      handleDragEnd(targetType, outcome, targetId);
      return;
    }

    // Check build stacks
    if (targetStack && targetStack.stackType === 'build_stack' && dragOverlay.draggingCard) {
      targetType = 'stack';
      targetId = targetStack.stackId;
      outcome = 'success';
      // Let SmartRouter handle the action
      handleDragEnd(targetType, outcome, targetId);
      return;
    }

    // Missed - no target hit
    handleDragEnd(targetType, outcome);
  }, [dragOverlay, findCapturePileAtPoint, findCardAtPoint, findTempStackAtPoint, playerNumber, actions, handleDragEnd]);

  // ── Action Handlers ───────────────────────────────────────────────────────
  // Simple pass-through to router - no UI decisions!
  const handleCapture = useCallback(
    (card: any, targetType: 'loose' | 'build', targetRank?: string, targetSuit?: string, targetStackId?: string) => {
      actions.capture(card, targetType, targetRank, targetSuit, targetStackId);
    },
    [actions],
  );

  // Trail handler with client-side validation for active build
  // This validates BEFORE sending to server, so card stays visible if rejected
  const handleTrail = useCallback(
    (card: any) => {
      // Check if player has an active build - if so, reject trail
      const hasActiveBuild = table.some(
        (tc: any) => tc.type === 'build_stack' && tc.owner === playerNumber
      );
      
      if (hasActiveBuild) {
        console.log(`[GameBoard] Cannot trail - player ${playerNumber} has an active build`);
        // Need to reset the drag overlay to restore card visibility
        // Since onDragEnd was already called (card is invisible), we need to trigger a re-render
        // The simplest way is to call handleDragEnd which will reset the overlay state
        handleDragEnd();
        return;
      }
      
      actions.trail(card);
    },
    [actions, table, playerNumber, handleDragEnd],
  );

  const handleAcceptClick = useCallback((stackId: string) => {
    const stack = table.find((tc: any) => tc.stackId === stackId) as TempStack | undefined;
    if (stack) {
      modals.openPlayModal(stack);
    }
  }, [table, modals]);

  const handleConfirmPlay = useCallback((buildValue: number) => {
    if (modals.selectedTempStack) {
      actions.acceptTemp(modals.selectedTempStack.stackId, buildValue);
    }
    modals.closePlayModal();
  }, [modals, actions]);

  const handleConfirmSteal = useCallback(() => {
    if (modals.stealTargetCard && modals.stealTargetStack) {
      actions.stealBuild(modals.stealTargetCard, modals.stealTargetStack.stackId);
    }
    modals.closeStealModal();
  }, [modals, actions]);

  const handleStealOverlayPress = useCallback(() => {
    if (dragOverlay.draggingCard && stealDetection.stealOverlayStack) {
      modals.openStealModal(dragOverlay.draggingCard, stealDetection.stealOverlayStack);
      stealDetection.hideOverlay();
    }
  }, [dragOverlay, stealDetection, modals]);

  // Build extension handler - router decides whether to start or accept
  const handleExtendBuild = useCallback((card: any, buildStackId: string, cardSource: 'table' | 'hand' | 'captured' = 'table') => {
    // Let the router decide - just send the action!
    console.log(`[GameBoard] extendBuild - card: ${card.rank}${card.suit}, stackId: ${buildStackId}, cardSource: ${cardSource}`);
    actions.extendBuild(card, buildStackId, cardSource);
  }, [actions]);

  // When Accept button is clicked on extension strip (after loose card is locked)
  // In the drag-drop flow, the extension completes when hand card is dropped on the build
  // This callback is kept for UI consistency but the actual completion happens via drag
  const handleExtendAcceptClick = useCallback((stackId: string) => {
    // Find the extending build to see its state
    const stack = table.find((tc: any) => tc.stackId === stackId) as BuildStack | undefined;
    if (stack?.pendingExtension?.looseCard) {
      console.log(`[GameBoard] Extend Accept clicked for ${stackId}`);
      console.log(`[GameBoard] Pending loose card: ${stack.pendingExtension.looseCard.rank}${stack.pendingExtension.looseCard.suit}`);
      console.log(`[GameBoard] Player should drag a hand card to complete the extension`);
    } else {
      console.log(`[GameBoard] No pending extension found for ${stackId}`);
    }
  }, [table]);

  // Decline/Cancel extension - returns loose card to table
  const handleDeclineExtend = useCallback((stackId: string) => {
    actions.declineBuildExtension(stackId);
  }, [actions]);

  // Find player's build that has pending extension
  const extendingBuildId: string | null = useMemo(() => {
    if (!isMyTurn) return null;
    const myExtending = table.find(
      (tc: any) => tc.type === 'build_stack' && tc.owner === playerNumber && tc.pendingExtension?.looseCard,
    ) as BuildStack | undefined;
    return myExtending?.stackId ?? null;
  }, [table, isMyTurn, playerNumber]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {serverError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{serverError.message}</Text>
          <Text style={styles.errorClose} onPress={onServerErrorClose}>✕</Text>
        </View>
      )}

      <GameStatusBar
        round={gameState.round}
        currentPlayer={gameState.currentPlayer}
        playerNumber={playerNumber}
        scores={gameState.scores as [number, number]}
      />

      <TableArea
        tableCards={table}
        tableVersion={tableVersion}
        isMyTurn={isMyTurn}
        playerNumber={playerNumber}
        tableRef={tableRef}
        onTableLayout={onTableLayout}
        registerCard={registerCard}
        unregisterCard={unregisterCard}
        registerTempStack={registerTempStack}
        unregisterTempStack={unregisterTempStack}
        findCardAtPoint={findCardAtPoint}
        findTempStackAtPoint={findTempStackAtPoint}
        onTableCardDropOnCard={actions.createTemp}
        onStackDrop={(card, stackId, owner, stackType) => {
          console.log(`[GameBoard] onStackDrop - card: ${card.rank}${card.suit}, stack: ${stackId}, type: ${stackType}, owner: P${owner}`);
          // DUMB - let SmartRouter decide!
          actions.stackDrop(card, stackId, owner, stackType, 'table');
        }}
        onTableDragStart={handleTableDragStart}
        onTableDragMove={handleDragMove}
        onTableDragEnd={handleTableDragEnd}
        overlayStackId={overlayStackId}
        onAcceptTemp={handleAcceptClick}
        onCancelTemp={actions.cancelTemp}
        onCapture={handleCapture}
        playerCaptures={playerCaptures}
        opponentCaptures={opponentCaptures}
        registerCapturedCard={registerCapturedCard}
        unregisterCapturedCard={unregisterCapturedCard}
        onCapturedCardDragStart={handleCapturedDragStart}
        onCapturedCardDragMove={dragOverlay.moveDrag}
        onCapturedCardDragEnd={actions.playFromCaptures}
        findCapturePileAtPoint={findCapturePileAtPoint}
        registerCapturePile={registerCapturePile}
        unregisterCapturePile={unregisterCapturePile}
        onDropToCapture={actions.dropToCapture}
        // Extension props
        extendingBuildId={extendingBuildId}
        onExtendBuild={handleExtendBuild}
        onAcceptExtend={handleExtendAcceptClick}
        onDeclineExtend={handleDeclineExtend}
        playerHand={myHand}
        opponentDrag={opponentDrag}
      />

      <PlayerHandArea
        hand={myHand}
        isMyTurn={isMyTurn}
        playerNumber={playerNumber}
        dropBounds={dropBounds}
        findCardAtPoint={findCardAtPoint}
        findTempStackAtPoint={findTempStackAtPoint}
        tableCards={table}
        // DUMB callbacks - just report what was hit, SmartRouter decides action
        onDropOnStack={(card, stackId, stackOwner, stackType) => {
          console.log(`[GameBoard] onDropOnStack - card: ${card.rank}${card.suit}, stack: ${stackId}, type: ${stackType}, owner: P${stackOwner}`);
          
          // DUMB - let SmartRouter decide!
          actions.stackDrop(card, stackId, stackOwner, stackType, 'hand');
        }}
        onDropOnCard={(card, targetCard) => {
          console.log(`[GameBoard] onDropOnCard - card: ${card.rank}${card.suit}, target: ${targetCard.rank}${targetCard.suit}`);
          // Drop on specific card - create temp stack
          actions.createTemp(card, targetCard);
        }}
        onDropOnTable={(card) => {
          console.log(`[GameBoard] onDropOnTable - card: ${card.rank}${card.suit}`);
          // Drop on table zone - trail
          // Note: card is already hidden (opacity=0), action decides what happens
          actions.trail(card);
        }}
        // Legacy callbacks for ghost overlay
        onDragStart={handleTableDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        // Opponent drag state for hiding cards during opponent's drag
        opponentDrag={opponentDrag}
      />

      {/* Ghost overlay - shows where the dragged card is */}
      {dragOverlay.draggingCard && (
        <Animated.View style={dragOverlay.ghostStyle} pointerEvents="none">
          <PlayingCard
            rank={dragOverlay.draggingCard.rank}
            suit={dragOverlay.draggingCard.suit}
          />
        </Animated.View>
      )}

      {/* Opponent's ghost card - shows where opponent is dragging */}
      {opponentDrag && opponentDrag.isDragging && (
        <OpponentGhostCard
          card={opponentDrag.card}
          position={opponentDrag.position}
          tableBounds={{ width: 400, height: 300 }}
          targetType={opponentDrag.targetType}
          targetId={opponentDrag.targetId}
          cardPositions={cardPositions.current}
          stackPositions={tempStackPositions.current}
        />
      )}

      {/* Play Options Modal */}
      {modals.showPlayModal && modals.selectedTempStack && (
        <PlayOptionsModal
          visible={modals.showPlayModal}
          cards={modals.selectedTempStack.cards}
          playerHand={myHand as TableCard[]}
          onConfirm={handleConfirmPlay}
          onCancel={modals.closePlayModal}
        />
      )}

      {/* Steal Build Confirmation Modal */}
      {modals.showStealModal && modals.stealTargetCard && modals.stealTargetStack && (
        <StealBuildModal
          visible={modals.showStealModal}
          handCard={modals.stealTargetCard}
          buildCards={modals.stealTargetStack.cards}
          buildValue={modals.stealTargetStack.value}
          buildOwner={modals.stealTargetStack.owner}
          playerNumber={playerNumber}
          onConfirm={handleConfirmSteal}
          onCancel={modals.closeStealModal}
        />
      )}

      {/* Extend Build Modal - kept for modal flow but not shown in drag-drop implementation */}
      {/* In drag-drop flow, extension completes when hand card is dropped */}
      {/* {modals.showExtendModal && modals.extendTargetBuild && (
        <ExtendBuildModal
          visible={modals.showExtendModal}
          buildStack={modals.extendTargetBuild}
          playerHand={myHand as TableCard[]}
          onAccept={handleAcceptExtend}
          onCancel={handleDeclineExtend}
        />
      )} */}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1B5E20',
  },
  errorBanner: {
    backgroundColor: '#B71C1C',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  errorText:  { color: '#fff', flex: 1, fontSize: 13 },
  errorClose: { color: '#fff', fontSize: 18, paddingHorizontal: 8 },
});

export default GameBoard;

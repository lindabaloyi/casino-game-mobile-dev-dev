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

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { GameState, OpponentDragState } from '../../hooks/useGameState';
import { useDrag } from '../../hooks/useDrag';
import { GameStatusBar } from './GameStatusBar';
import { TableArea } from '../table/TableArea';
import { PlayerHandArea } from './PlayerHandArea';
import { PlayingCard } from '../cards/PlayingCard';
import { PlayOptionsModal } from '../modals/PlayOptionsModal';
import { StealBuildModal } from '../modals/StealBuildModal';
import { TempStack, Card as TableCard, BuildStack } from '../../types';

// Hooks
import { useDragOverlay } from '../../hooks/drag/useDragOverlay';
import { useModalManager } from '../../hooks/game/useModalManager';
import { useGameActions } from '../../hooks/game/useGameActions';
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
  // Error version counter - increment on error to force re-render of PlayerHandArea
  const [errorVersion, setErrorVersion] = useState(0);
  // Drag version counter - increment on drag end to force re-render and restore card visibility
  const [dragVersion, setDragVersion] = useState(0);

  // Track server errors to reset card visibility
  useEffect(() => {
    if (serverError) {
      setErrorVersion(v => v + 1);
    }
  }, [serverError]);

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
  
  // Get table bounds with fallback - used for ghost card rendering
  const getTableBounds = useCallback(() => {
    const bounds = dropBounds.current;
    if (bounds.width > 0 && bounds.height > 0) {
      return bounds;
    }
    // Fallback: use screen dimensions as approximation
    return { width: 400, height: 300 };
  }, [dropBounds]);

  // Handler for hand card drag start
  const handleHandDragStart = useCallback((card: any, absoluteX?: number, absoluteY?: number) => {
    console.log('[GameBoard] ===== HANDLE HAND DRAG START =====');
    dragOverlay.startDrag(card, 'hand', absoluteX, absoluteY);
    
    if (emitDragStart && absoluteX !== undefined && absoluteY !== undefined) {
      if (!dropBounds.current || dropBounds.current.width === 0 || dropBounds.current.height === 0) {
        console.warn('[GameBoard] Cannot emit dragStart - table bounds not ready');
        return;
      }
      
      const normX = Math.max(0, Math.min(1, absoluteX / dropBounds.current.width));
      const normY = Math.max(0, Math.min(1, absoluteY / dropBounds.current.height));
      emitDragStart(card, 'hand', { x: normX, y: normY });
    }
  }, [dragOverlay, emitDragStart, dropBounds]);

  const handleTableDragStart = useCallback((card: any, absoluteX?: number, absoluteY?: number) => {
    console.log('[GameBoard] ===== HANDLE TABLE DRAG START =====');
    dragOverlay.startDrag(card, 'table', absoluteX, absoluteY);
    
    if (emitDragStart && absoluteX !== undefined && absoluteY !== undefined) {
      if (!dropBounds.current || dropBounds.current.width === 0 || dropBounds.current.height === 0) {
        console.warn('[GameBoard] Cannot emit dragStart - table bounds not ready');
        return;
      }
      
      const normX = Math.max(0, Math.min(1, absoluteX / dropBounds.current.width));
      const normY = Math.max(0, Math.min(1, absoluteY / dropBounds.current.height));
      emitDragStart(card, 'table', { x: normX, y: normY });
    }
  }, [dragOverlay, emitDragStart, dropBounds]);

  // Wrapper for captured card drag start
  const handleCapturedDragStart = useCallback((card: any, absoluteX?: number, absoluteY?: number) => {
    console.log('[GameBoard] ===== HANDLE CAPTURED DRAG START =====');
    dragOverlay.startDrag(card, 'captured', absoluteX, absoluteY);
    
    if (emitDragStart && absoluteX !== undefined && absoluteY !== undefined) {
      const normX = Math.max(0, Math.min(1, absoluteX / dropBounds.current.width));
      const normY = Math.max(0, Math.min(1, absoluteY / dropBounds.current.height));
      emitDragStart(card, 'captured', { x: normX, y: normY });
    }
  }, [dragOverlay, emitDragStart, dropBounds]);

  const handleDragMove = useCallback(
    (absoluteX: number, absoluteY: number) => {
      const startTime = Date.now();
      
      dragOverlay.moveDrag(absoluteX, absoluteY);

      // Emit drag move to server
      if (emitDragMove && dragOverlay.draggingCard) {
        const tableWidth = dropBounds.current.width || 400;
        const tableHeight = dropBounds.current.height || 300;
        const normX = Math.max(0, Math.min(1, absoluteX / tableWidth));
        const normY = Math.max(0, Math.min(1, absoluteY / tableHeight));
        emitDragMove(dragOverlay.draggingCard, { x: normX, y: normY });
      }

      const elapsed = Date.now() - startTime;
      if (elapsed > 10) console.log(`[GameBoard] handleDragMove slow: ${elapsed}ms`);
    },
    [dragOverlay, emitDragMove, dropBounds],
  );

  // Handle drag end
  const handleDragEnd = useCallback((targetType?: string, outcome: 'success' | 'miss' | 'cancelled' = 'cancelled', targetId?: string) => {
    const absX = dragOverlay.overlayX.value + CARD_WIDTH / 2;
    const absY = dragOverlay.overlayY.value + CARD_HEIGHT / 2;
    
    if (emitDragEnd && dragOverlay.draggingCard) {
      const tableWidth = dropBounds.current.width || 400;
      const tableHeight = dropBounds.current.height || 300;
      const normX = Math.max(0, Math.min(1, absX / tableWidth));
      const normY = Math.max(0, Math.min(1, absY / tableHeight));
      emitDragEnd(dragOverlay.draggingCard, { x: normX, y: normY }, outcome, targetType, targetId);
    }
    dragOverlay.endDrag();
  }, [dragOverlay, emitDragEnd, dropBounds]);

  // Track drag end to restore card visibility
  const handleDragEndWrapper = useCallback((...args: any[]) => {
    handleDragEnd(...args);
    setDragVersion(v => v + 1);
  }, [handleDragEnd]);

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
        if (emitDragEnd && dragOverlay.draggingCard) {
          const normX = absX / (dropBounds.current.width || 400);
          const normY = absY / (dropBounds.current.height || 300);
          emitDragEnd(dragOverlay.draggingCard, { x: normX, y: normY }, outcome, targetType, undefined);
        }
        handleDragEndWrapper(targetType, outcome);
        return;
      }
    }

    // Check loose cards
    const targetCardResult = findCardAtPoint?.(absX, absY);
    if (targetCardResult && dragOverlay.draggingCard) {
      targetType = 'card';
      targetId = targetCardResult.id;
      outcome = 'success';
      
      if (emitDragEnd && dragOverlay.draggingCard) {
        const normX = absX / (dropBounds.current.width || 400);
        const normY = absY / (dropBounds.current.height || 300);
        emitDragEnd(dragOverlay.draggingCard, { x: normX, y: normY }, outcome, targetType, targetId);
      }
      
      actions.createTemp(dragOverlay.draggingCard, targetCardResult.card);
      handleDragEndWrapper(targetType, outcome, targetId);
      return;
    }

    // Check temp stacks
    const targetStack = findTempStackAtPoint?.(absX, absY);
    if (targetStack && targetStack.stackType === 'temp_stack' && dragOverlay.draggingCard) {
      targetType = 'temp_stack';
      targetId = targetStack.stackId;
      outcome = 'success';
      
      if (emitDragEnd && dragOverlay.draggingCard) {
        const normX = absX / (dropBounds.current.width || 400);
        const normY = absY / (dropBounds.current.height || 300);
        emitDragEnd(dragOverlay.draggingCard, { x: normX, y: normY }, outcome, targetType, targetId);
      }
      
      if (targetStack.owner === playerNumber) {
        actions.addToTemp(dragOverlay.draggingCard, targetStack.stackId);
      }
      handleDragEndWrapper(targetType, outcome, targetId);
      return;
    }

    // Check build stacks
    if (targetStack && targetStack.stackType === 'build_stack' && dragOverlay.draggingCard) {
      targetType = 'stack';
      targetId = targetStack.stackId;
      outcome = 'success';
      
      if (emitDragEnd && dragOverlay.draggingCard) {
        const normX = absX / (dropBounds.current.width || 400);
        const normY = absY / (dropBounds.current.height || 300);
        emitDragEnd(dragOverlay.draggingCard, { x: normX, y: normY }, outcome, targetType, targetId);
      }
      
      handleDragEndWrapper(targetType, outcome, targetId);
      return;
    }

    // Missed
    if (emitDragEnd && dragOverlay.draggingCard) {
      const normX = absX / (dropBounds.current.width || 400);
      const normY = absY / (dropBounds.current.height || 300);
      emitDragEnd(dragOverlay.draggingCard, { x: normX, y: normY }, outcome, targetType, targetId);
    }
    handleDragEndWrapper(targetType, outcome);
  }, [dragOverlay, findCapturePileAtPoint, findCardAtPoint, findTempStackAtPoint, playerNumber, actions, handleDragEnd, handleDragEndWrapper, emitDragEnd, dropBounds]);

  // ── Action Handlers ───────────────────────────────────────────────────────
  const handleCapture = useCallback(
    (card: any, targetType: 'loose' | 'build', targetRank?: string, targetSuit?: string, targetStackId?: string) => {
      actions.capture(card, targetType, targetRank, targetSuit, targetStackId);
    },
    [actions],
  );

  const handleTrail = useCallback(
    (card: any) => {
      const hasActiveBuild = table.some(
        (tc: any) => tc.type === 'build_stack' && tc.owner === playerNumber
      );
      
      if (hasActiveBuild) {
        console.log(`[GameBoard] Cannot trail - player ${playerNumber} has an active build`);
        handleDragEndWrapper();
        return;
      }
      
      actions.trail(card);
    },
    [actions, table, playerNumber, handleDragEndWrapper],
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

  // Build extension handler
  const handleExtendBuild = useCallback((card: any, buildStackId: string, cardSource: 'table' | 'hand' | 'captured' = 'table') => {
    console.log(`[GameBoard] extendBuild - card: ${card.rank}${card.suit}, stackId: ${buildStackId}, cardSource: ${cardSource}`);
    actions.extendBuild(card, buildStackId, cardSource);
  }, [actions]);

  const handleExtendAcceptClick = useCallback((stackId: string) => {
    const stack = table.find((tc: any) => tc.stackId === stackId) as BuildStack | undefined;
    if (stack?.pendingExtension?.looseCard) {
      console.log(`[GameBoard] Extend Accept clicked for ${stackId}`);
      console.log(`[GameBoard] Pending loose card: ${stack.pendingExtension.looseCard.rank}${stack.pendingExtension.looseCard.suit}`);
    }
  }, [table]);

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
        onCapturedCardDragEnd={(card, targetCard, targetStackId) => {
          console.log(`[GameBoard] onCapturedCardDragEnd - card: ${card?.rank}${card?.suit}`);
          if (targetCard) {
            actions.createTemp(card, targetCard);
          } else if (targetStackId) {
            actions.addToTemp(card, targetStackId);
          }
          dragOverlay.endDrag();
        }}
        findCapturePileAtPoint={findCapturePileAtPoint}
        registerCapturePile={registerCapturePile}
        unregisterCapturePile={unregisterCapturePile}
        onDropToCapture={actions.dropToCapture}
        extendingBuildId={extendingBuildId}
        onExtendBuild={handleExtendBuild}
        onAcceptExtend={handleExtendAcceptClick}
        onDeclineExtend={handleDeclineExtend}
        playerHand={myHand}
        opponentDrag={opponentDrag}
      />

      <PlayerHandArea
        key={`playerHand-${errorVersion}-${dragVersion}`}
        hand={myHand}
        isMyTurn={isMyTurn}
        playerNumber={playerNumber}
        dropBounds={dropBounds}
        findCardAtPoint={findCardAtPoint}
        findTempStackAtPoint={findTempStackAtPoint}
        tableCards={table}
        onDropOnStack={(card, stackId, stackOwner, stackType) => {
          console.log(`[GameBoard] onDropOnStack - card: ${card.rank}${card.suit}`);
          actions.stackDrop(card, stackId, stackOwner, stackType, 'hand');
        }}
        onDropOnCard={(card, targetCard) => {
          console.log(`[GameBoard] onDropOnCard - card: ${card.rank}${card.suit}`);
          actions.createTemp(card, targetCard);
        }}
        onDropOnTable={(card) => {
          console.log(`[GameBoard] onDropOnTable - card: ${card.rank}${card.suit}`);
          actions.trail(card);
        }}
        onDragStart={handleHandDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        opponentDrag={opponentDrag}
      />

      {/* Ghost overlay */}
      {dragOverlay.draggingCard && (
        <Animated.View style={dragOverlay.ghostStyle} pointerEvents="none">
          <PlayingCard
            rank={dragOverlay.draggingCard.rank}
            suit={dragOverlay.draggingCard.suit}
          />
        </Animated.View>
      )}

      {/* Opponent's ghost card */}
      {opponentDrag && opponentDrag.isDragging && (
        <OpponentGhostCard
          card={opponentDrag.card}
          position={opponentDrag.position}
          tableBounds={getTableBounds()}
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

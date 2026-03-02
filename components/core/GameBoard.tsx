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
import { GameState } from '../../hooks/useGameState';
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
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GameBoard({
  gameState,
  playerNumber,
  sendAction,
  serverError,
  onServerErrorClose,
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
    
    registerTempStack,
    unregisterTempStack,
    findTempStackAtPoint,
    
    registerCapturedCard,
    unregisterCapturedCard,
    findCapturePileAtPoint,
    registerCapturePile,
    unregisterCapturePile,
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
  
  // Wrapper for table drag start (single arg)
  const handleTableDragStart = useCallback((card: any) => {
    dragOverlay.startDrag(card, 'hand');
  }, [dragOverlay]);

  // Wrapper for captured card drag start (single arg)
  const handleCapturedDragStart = useCallback((card: any) => {
    dragOverlay.startDrag(card, 'captured');
  }, [dragOverlay]);

  const handleDragMove = useCallback(
    (absoluteX: number, absoluteY: number) => {
      dragOverlay.moveDrag(absoluteX, absoluteY);

      // Check if over opponent's build - show steal overlay
      const stackHit = findTempStackAtPoint?.(absoluteX, absoluteY);
      if (stackHit) {
        const stack = table.find(
          (tc: any) => tc.stackId === stackHit.stackId && tc.type === 'build_stack',
        ) as BuildStack | undefined;
        
        if (stack && stack.owner !== playerNumber) {
          stealDetection.showOverlay(stack, absoluteX, absoluteY);
          return;
        }
      }
      
      // Not over opponent's build - hide overlay
      if (stealDetection.showStealOverlay) {
        stealDetection.hideOverlay();
      }
    },
    [dragOverlay, findTempStackAtPoint, table, playerNumber, stealDetection],
  );

  const handleDragEnd = useCallback(() => {
    dragOverlay.endDrag();
    stealDetection.hideOverlay();
  }, [dragOverlay, stealDetection]);

  const handleTableDragEnd = useCallback(() => {
    const absX = dragOverlay.overlayX.value + CARD_WIDTH / 2;
    const absY = dragOverlay.overlayY.value + CARD_HEIGHT / 2;

    // Check capture pile
    if (findCapturePileAtPoint) {
      const capturePile = findCapturePileAtPoint(absX, absY);
      if (capturePile) {
        handleDragEnd();
        return;
      }
    }

    // Check loose cards
    const targetCard = findCardAtPoint?.(absX, absY);
    if (targetCard && dragOverlay.draggingCard) {
      actions.createTemp(dragOverlay.draggingCard, targetCard);
      handleDragEnd();
      return;
    }

    // Check temp stacks (only temp_stack, not build_stack)
    const targetStack = findTempStackAtPoint?.(absX, absY);
    if (targetStack && targetStack.stackType === 'temp_stack' && dragOverlay.draggingCard) {
      if (targetStack.owner === playerNumber) {
        actions.addToTemp(dragOverlay.draggingCard, targetStack.stackId);
      }
      handleDragEnd();
      return;
    }

    handleDragEnd();
  }, [dragOverlay, findCapturePileAtPoint, findCardAtPoint, findTempStackAtPoint, playerNumber, actions, handleDragEnd]);

  // ── Action Handlers ───────────────────────────────────────────────────────
  // Simple pass-through to router - no UI decisions!
  const handleCapture = useCallback(
    (card: any, targetType: 'loose' | 'build', targetRank?: string, targetSuit?: string, targetStackId?: string) => {
      actions.capture(card, targetType, targetRank, targetSuit, targetStackId);
    },
    [actions],
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
        onTableCardDropOnTemp={actions.addToTemp}
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
      />

      <PlayerHandArea
        hand={myHand}
        isMyTurn={isMyTurn}
        playerNumber={playerNumber}
        dropBounds={dropBounds}
        findCardAtPoint={findCardAtPoint}
        findTempStackAtPoint={findTempStackAtPoint}
        tableCards={table}
        onTrail={actions.trail}
        onCardDrop={actions.createTemp}
        onAddToTemp={actions.addToTemp}
        onExtendBuild={(card: any, stackId: string, cardSource: 'table' | 'hand' | 'captured' = 'hand') => {
          // Let the router decide - just send the action!
          console.log(`[GameBoard] onExtendBuild - card: ${card.rank}${card.suit}, stackId: ${stackId}, cardSource: ${cardSource}`);
          actions.extendBuild(card, stackId, cardSource);
        }}
        onDragStart={handleTableDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onCapture={handleCapture}
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

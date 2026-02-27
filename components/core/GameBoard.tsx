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

import React, { useCallback, useState, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { GameState } from '../../hooks/useGameState';
import { useDrag } from '../../hooks/useDrag';
import { GameStatusBar } from './GameStatusBar';
import { TableArea } from '../table/TableArea';
import { PlayerHandArea } from './PlayerHandArea';
import { PlayingCard } from '../cards/PlayingCard';
import { AcceptValidationModal } from '../table/AcceptValidationModal';
import type { Card } from '../table/types';
import { isDirectCapture } from '../../src/utils/buildValidators';

// ── Constants ─────────────────────────────────────────────────────────────────

const CARD_WIDTH  = 56;
const CARD_HEIGHT = 84;

// ── Types ─────────────────────────────────────────────────────────────────────

type DragSource = 'hand' | 'captured' | null;

interface GameBoardProps {
  gameState: GameState;
  playerNumber: number;
  sendAction: (action: { type: string; payload?: Record<string, unknown> }) => void;
  onRestart?: () => void;
  onBackToMenu?: () => void;
  serverError?: { message: string } | null;
  onServerErrorClose?: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function GameBoard({
  gameState,
  playerNumber,
  sendAction,
  serverError,
  onServerErrorClose,
}: GameBoardProps) {
  // ── Derived data ──────────────────────────────────────────────────────────
  const myHand   = gameState.playerHands?.[playerNumber] ?? [];
  const table    = gameState.tableCards ?? [];
  const isMyTurn = gameState.currentPlayer === playerNumber;

  // Captured cards arrays
  const playerCaptures = gameState.playerCaptures?.[playerNumber] ?? [];
  const opponentCaptures = gameState.playerCaptures?.[playerNumber === 0 ? 1 : 0] ?? [];

  // Table version counter
  const tableVersion = useMemo(() => {
    const cards = gameState.tableCards ?? [];
    const cardCount = cards.length;
    const idString = cards.map((c: any) => c.stackId || `${c.rank}${c.suit}`).join('');
    return cardCount + idString.length;
  }, [gameState.tableCards]);

  // ── Drop zone + card position tracking ───────────────────────────────────
  const {
    tableRef,
    dropBounds,
    onTableLayout,
    registerCard,
    unregisterCard,
    findCardAtPoint,
    isNearAnyCard,
    registerTempStack,
    unregisterTempStack,
    findTempStackAtPoint,
    isNearAnyStack,
    registerCapturedCard,
    unregisterCapturedCard,
  } = useDrag();

  // ── Drag overlay state ────────────────────────────────────────────────────
  const [draggingCard, setDraggingCard] = useState<Card | null>(null);
  const [dragSource, setDragSource] = useState<DragSource>(null);
  const overlayX = useSharedValue(0);
  const overlayY = useSharedValue(0);

  // ── Accept validation modal state ────────────────────────────────────────
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedTempStack, setSelectedTempStack] = useState<any>(null);

  const handleDragStart = useCallback((card: Card) => {
    setDraggingCard(card);
    setDragSource('hand');
  }, []);

  const handleDragMove = useCallback(
    (absoluteX: number, absoluteY: number) => {
      // Position ghost centered on finger
      overlayX.value = absoluteX - CARD_WIDTH / 2;
      overlayY.value = absoluteY - CARD_HEIGHT / 2;
    },
    [overlayX, overlayY],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingCard(null);
    setDragSource(null);
  }, []);

  // Ghost style - simple positioning, no transforms
  const ghostStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: overlayX.value,
    top: overlayY.value,
    zIndex: 1000,
  }));

  // ── Action callbacks ──────────────────────────────────────────────────────

  const handleTrail = useCallback(
    (card: Card) => {
      sendAction({ type: 'trail', payload: { card } as unknown as Record<string, unknown> });
    },
    [sendAction],
  );

  // Check if player owns an active temp stack (build)
  const hasActiveBuild = useMemo(() => {
    return (table as any[]).some(
      (tc: any) => tc.type === 'temp_stack' && tc.owner === playerNumber,
    );
  }, [table, playerNumber]);

  const handleCardDrop = useCallback(
    (handCard: Card, targetCard: Card) => {
      // FIRST CHECK: Direct capture - when dropping on loose card with same value
      // If player owns active build → always direct capture
      // OR if player has NO build option (no card with value * 2)
      if (handCard.value === targetCard.value) {
        const shouldDirectCapture = isDirectCapture(handCard.value, myHand, hasActiveBuild);
        if (shouldDirectCapture) {
          console.log(`[GameBoard] Direct capture: ${handCard.rank}${handCard.suit} on ${targetCard.rank}${targetCard.suit} (hasActiveBuild: ${hasActiveBuild})`);
          sendAction({ type: 'directCapture', payload: { card: handCard, targetCard } as unknown as Record<string, unknown> });
          return;
        }
      }
      
      // Normal flow: create temp stack
      sendAction({ type: 'createTemp', payload: { card: handCard, targetCard } as unknown as Record<string, unknown> });
    },
    [sendAction, myHand, hasActiveBuild],
  );

  const handleTableCardDropOnCard = useCallback(
    (card: Card, targetCard: Card) => {
      sendAction({ type: 'createTempFromTable', payload: { card, targetCard } as unknown as Record<string, unknown> });
    },
    [sendAction],
  );

  const handleTableCardDropOnTemp = useCallback(
    (tableCard: Card, stackId: string) => {
      sendAction({ type: 'addToTemp', payload: { tableCard, stackId } as unknown as Record<string, unknown> });
    },
    [sendAction],
  );

  // ── Accept validation modal handlers ─────────────────────────────────────
  const handleAcceptTemp = useCallback(
    (stackId: string) => {
      // Find the temp stack
      const tempStack = table.find(
        (tc: any) => tc.type === 'temp_stack' && tc.stackId === stackId,
      );
      
      if (!tempStack) return;
      
      // Set the selected temp stack and show modal
      setSelectedTempStack(tempStack);
      setShowAcceptModal(true);
    },
    [table],
  );

  const handleAcceptModalClose = useCallback(() => {
    setShowAcceptModal(false);
    setSelectedTempStack(null);
  }, []);

  const handleCancelTemp = useCallback(
    (stackId: string) => {
      sendAction({ type: 'cancelTemp', payload: { stackId } as unknown as Record<string, unknown> });
    },
    [sendAction],
  );

  const handleCapture = useCallback(
    (card: Card, targetType: 'loose' | 'build', targetRank?: string, targetSuit?: string, targetStackId?: string) => {
      sendAction({ 
        type: 'capture', 
        payload: { card, targetType, targetRank, targetSuit, targetStackId } as unknown as Record<string, unknown> 
      });
    },
    [sendAction],
  );

  const handleCapturedCardDragStart = useCallback((card: Card) => {
    setDraggingCard(card);
    setDragSource('captured');
  }, []);

  const handleCapturedCardDragMove = useCallback(
    (absoluteX: number, absoluteY: number) => {
      overlayX.value = absoluteX - CARD_WIDTH / 2;
      overlayY.value = absoluteY - CARD_HEIGHT / 2;
    },
    [overlayX, overlayY],
  );

  const handleCapturedCardDragEnd = useCallback(
    (card: Card, targetCard?: Card, targetStackId?: string) => {
      if (targetCard) {
        sendAction({ 
          type: 'playFromCaptures', 
          payload: { capturedCard: card, targetCard } as unknown as Record<string, unknown> 
        });
      } else if (targetStackId) {
        sendAction({ 
          type: 'playFromCaptures', 
          payload: { capturedCard: card, targetStackId } as unknown as Record<string, unknown> 
        });
      }
      setDraggingCard(null);
      setDragSource(null);
    },
    [sendAction],
  );

  // Find overlay stack
  const overlayStackId: string | null = (() => {
    if (!isMyTurn) return null;
    const myTemp = (table as any[]).find(
      (tc: any) => tc.type === 'temp_stack' && tc.owner === playerNumber,
    );
    return myTemp?.stackId ?? null;
  })();

  // ── Render ────────────────────────────────────────────────────────────────
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
        tableCards={table as any}
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
        onTableCardDropOnCard={handleTableCardDropOnCard}
        onTableCardDropOnTemp={handleTableCardDropOnTemp}
        onTableDragStart={handleDragStart}
        onTableDragMove={handleDragMove}
        onTableDragEnd={handleDragEnd}
        overlayStackId={overlayStackId}
        onAcceptTemp={handleAcceptTemp}
        onCancelTemp={handleCancelTemp}
        onCapture={handleCapture}
        playerCaptures={playerCaptures}
        opponentCaptures={opponentCaptures}
        registerCapturedCard={registerCapturedCard}
        unregisterCapturedCard={unregisterCapturedCard}
        onCapturedCardDragStart={handleCapturedCardDragStart}
        onCapturedCardDragMove={handleCapturedCardDragMove}
        onCapturedCardDragEnd={handleCapturedCardDragEnd}
      />

      <PlayerHandArea
        hand={myHand}
        isMyTurn={isMyTurn}
        dropBounds={dropBounds}
        findCardAtPoint={findCardAtPoint}
        findTempStackAtPoint={findTempStackAtPoint}
        isNearAnyCard={isNearAnyCard}
        isNearAnyStack={isNearAnyStack}
        onTrail={handleTrail}
        onCardDrop={handleCardDrop}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onCapture={handleCapture}
      />

      {/* Ghost overlay - only for hand card drags */}
      {draggingCard && dragSource === 'hand' && (
        <Animated.View style={ghostStyle} pointerEvents="none">
          <PlayingCard
            rank={draggingCard.rank}
            suit={draggingCard.suit}
          />
        </Animated.View>
      )}

      {/* Accept Validation Modal - shows build/capture options */}
      <AcceptValidationModal
        visible={showAcceptModal}
        onClose={handleAcceptModalClose}
        tempStack={selectedTempStack}
        playerHand={myHand}
        sendAction={sendAction}
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

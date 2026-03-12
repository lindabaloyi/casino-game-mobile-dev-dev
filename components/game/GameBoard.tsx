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

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useTurnTimer } from '../../hooks/game/useTurnTimer';

import { GameStatusBar } from './GameStatusBar';
import { TableArea } from '../table/TableArea';
import { PlayerHandArea } from './PlayerHandArea';
import { GameModals } from './GameModals';
import { DragGhost } from './DragGhost';
import { OpponentGhostCard } from './OpponentGhostCard';
import { ErrorBanner } from '../shared/ErrorBanner';
import { Card as TableCard } from '../../types';
import { GameOverModal } from '../modals/GameOverModal';
import { ShiyaRecallModal } from '../modals/ShiyaRecallModal';
import { areTeammates } from '../../shared/game/team';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GameBoardProps {
  gameState: GameState;
  /** Game over data from server - ensures consistent modal display across clients */
  gameOverData?: {
    winner: number;
    finalScores: number[];
    capturedCards?: number[];
    tableCardsRemaining?: number;
    deckRemaining?: number;
    scoreBreakdowns?: any[];
    teamScoreBreakdowns?: any;
  } | null;
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
  gameOverData,
  playerNumber,
  sendAction,
  startNextRound,
  onRestart,
  onBackToMenu,
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
  const [selectedBuildForShiya, setSelectedBuildForShiya] = useState<any>(null);
  
  // Shiya recall modal state
  const [shiyaRecallCandidate, setShiyaRecallCandidate] = useState<any>(null);
  const recallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shiyaButtonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track round transitions to prevent double triggers
  const lastProcessedRound = useRef<number>(0);

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
  
  // Turn timer - 20 second countdown
  const turnTimer = useTurnTimer({
    currentPlayer: gameState.currentPlayer,
    isMyTurn: computed.isMyTurn,
    gameOver: (gameState.gameOver || !!gameOverData) || false,
    modalVisible: modals.showPlayModal || modals.showStealModal,
    roundOver: roundInfo.isOver,
    onTimeout: () => {
      // Auto-end turn when timer expires
      console.log('[GameBoard] Timer expired - auto-ending turn');
      actions.endTurn();
    },
  });

  // Debug logging disabled for cleaner console

  // KISS Round Transition Logic
  // When round ends:
  // - Round 1 → automatically start Round 2 (deal 10 cards each)
  // - Round 2 → Game Over (handled by gameState.gameOver)
  useEffect(() => {
    // Only transition if round just ended and we have startNextRound (local game)
    if (roundInfo.isOver && startNextRound) {
      const currentRound = roundInfo.roundNumber;
      
      // Prevent double triggers - only process if we haven't already
      if (lastProcessedRound.current >= currentRound) {
        return;
      }
      lastProcessedRound.current = currentRound;
      
      if (currentRound === 1) {
        // Round 1 ended - automatically start Round 2
        console.log(`[GameBoard] Round 1 ended, automatically starting Round 2`);
        startNextRound();
      }
      // Round 2 ending is handled by gameState.gameOver (no action needed)
    }
  }, [roundInfo.isOver, roundInfo.roundNumber, startNextRound]);

  // Shiya Recall Detection
  // Watch shiyaRecalls in game state - when a recall offer appears for this player,
  // show the recall modal. This is the proper separation: shiyaRecalls is ephemeral notification
  // state, separate from persistent teamCapturedBuilds.
  useEffect(() => {
    if (gameState.playerCount !== 4) return;
    
    // Check if there's a recall offer for this player
    const myRecall = gameState.shiyaRecalls?.[playerNumber];
    
    if (myRecall) {
      // Clear any existing timer
      if (recallTimerRef.current) clearTimeout(recallTimerRef.current);
      
      // Set the recall candidate - pass the full recall object
      setShiyaRecallCandidate(myRecall);

      // Auto-dismiss after 4 seconds (matching expiresAt timestamp)
      const timeUntilExpiry = myRecall.expiresAt - Date.now();
      const autoCloseMs = Math.max(1000, Math.min(4000, timeUntilExpiry));
      
      recallTimerRef.current = setTimeout(() => {
        setShiyaRecallCandidate(null);
        recallTimerRef.current = null;
      }, autoCloseMs);
    } else {
      // No recall for this player - clear if there's a stale candidate
      // (only clear if the candidate's stackId doesn't match any active recall)
      if (shiyaRecallCandidate && !gameState.shiyaRecalls?.[playerNumber]) {
        setShiyaRecallCandidate(null);
        if (recallTimerRef.current) {
          clearTimeout(recallTimerRef.current);
          recallTimerRef.current = null;
        }
      }
    }

    // Cleanup timer on unmount
    return () => {
      if (recallTimerRef.current) clearTimeout(recallTimerRef.current);
      if (shiyaButtonTimerRef.current) clearTimeout(shiyaButtonTimerRef.current);
    };
  }, [gameState.shiyaRecalls, gameState.playerCount, playerNumber]);

  // Drag end wrapper
  const handleDragEndWrapper = () => {
    setDragVersion(v => v + 1);
  };

  // Handle build tap for Shiya selection
  const handleBuildTap = useCallback((build: any) => {
    
    // Only set as selected if it's a teammate's build (NOT own build) and we have a matching card
    if (!build || gameState.playerCount !== 4) {
      setSelectedBuildForShiya(null);
      return;
    }
    
    // Check if it's NOT own build (must be teammate's build, not own)
    if (build.owner === playerNumber) {
      setSelectedBuildForShiya(null);
      return;
    }
    
    // Check if it's a teammate's build
    if (!areTeammates(playerNumber, build.owner)) {
      setSelectedBuildForShiya(null);
      return;
    }
    
    // Check if Shiya is already active
    if (build.shiyaActive) {
      setSelectedBuildForShiya(null);
      return;
    }
    
    // Check if we have a matching card
    const myHand = gameState.players?.[playerNumber]?.hand ?? [];
    const hasMatch = myHand.some((card: any) => card.value === build.value);
    
    if (hasMatch) {
      setSelectedBuildForShiya(build);
      
      // Auto-hide Shiya button after 5 seconds if not clicked
      if (shiyaButtonTimerRef.current) clearTimeout(shiyaButtonTimerRef.current);
      shiyaButtonTimerRef.current = setTimeout(() => {
        setSelectedBuildForShiya(null);
        shiyaButtonTimerRef.current = null;
      }, 5000);
    } else {
      setSelectedBuildForShiya(null);
    }
  }, [gameState, playerNumber]);

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
    dragHandlers.handleDragEnd,
    gameState.playerCount === 4,
    roundInfo.roundNumber
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
    // Hide end turn button when player makes a new action
    modals.hideEndTurnButton();

    // Check if this is a friendly build (owner OR teammate in party mode)
    const isPartyMode = gameState.playerCount === 4;
    const isFriendlyBuild = stackOwner === playerNumber || (isPartyMode && areTeammates(playerNumber, stackOwner));
    
    // Check if this is an opponent's build - validate steal vs capture
    if (stackType === 'build_stack' && !isFriendlyBuild) {
      const buildStack = computed.table.find(
        (tc: any) => tc.stackId === stackId && tc.type === 'build_stack'
      );
      
      if (buildStack) {
        const fullStack = buildStack as any;
        
        // PRIORITY 1: If card value matches build value → CAPTURE (direct, no modal)
        if (card.value === fullStack.value) {
          actions.stackDrop(card, stackId, stackOwner, stackType as 'temp_stack' | 'build_stack', source);
          return;
        }
        
        // PRIORITY 2: Check if steal is valid (not a base build)
        if (fullStack.hasBase === true) {
          // Cannot steal base build - fall through to action which will fail appropriately
        } else {
          modals.openStealModal(card, fullStack);
          return; // Modal is open
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
        playerCount={gameState.playerCount}
        scores={gameState.scores as [number, number]}
        cardsRemaining={roundInfo.cardsRemaining as [number, number]}
        // Timer props
        timeRemaining={turnTimer.timeRemaining}
        showTimer={computed.isMyTurn && !(gameState.gameOver || !!gameOverData) && !roundInfo.isOver}
        isLowTime={turnTimer.isLowTime}
      />

      <TableArea
        tableCards={computed.table}
        tableVersion={computed.tableVersion}
        isMyTurn={computed.isMyTurn}
        playerNumber={playerNumber}
        // Party mode props for team colors
        isPartyMode={gameState.playerCount === 4}
        currentPlayerIndex={gameState.currentPlayer}
        tableRef={drag.tableRef}
        onTableLayout={drag.onTableLayout}
        registerCard={drag.registerCard}
        unregisterCard={drag.unregisterCard}
        registerTempStack={drag.registerTempStack}
        unregisterTempStack={drag.unregisterTempStack}
        findCardAtPoint={drag.findCardAtPoint}
        findTempStackAtPoint={drag.findTempStackAtPoint}
        onTableCardDropOnCard={(card, targetCard) => {
          actions.createTemp(card, targetCard, 'table');
        }}
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
        onCapturedCardDragEnd={(card, targetCard, targetStackId, source) => {
          // Emit drag-end to server so opponents can clean up ghost cards
          if (emitDragEnd) {
            const absX = dragOverlay.overlayX.value + 28;
            const absY = dragOverlay.overlayY.value + 42;
            const tableBounds = drag.dropBounds.current;
            const normX = Math.max(0, Math.min(1, absX / (tableBounds.width || 400)));
            const normY = Math.max(0, Math.min(1, absY / (tableBounds.height || 300)));
            
            if (targetCard) {
              const cardId = `${targetCard.rank}${targetCard.suit}`;
              emitDragEnd(card, { x: normX, y: normY }, 'success', 'card', cardId);
            } else if (targetStackId) {
              emitDragEnd(card, { x: normX, y: normY }, 'success', 'temp_stack', targetStackId);
            } else {
              emitDragEnd(card, { x: normX, y: normY }, 'miss');
            }
          }
          
          if (targetCard) {
            actions.createTemp(card, targetCard, source || 'captured');
          } else if (targetStackId) {
            actions.addToTemp(card, targetStackId, source || 'captured');
          }
          dragOverlay.endDrag();
        }}
        findCapturePileAtPoint={drag.findCapturePileAtPoint}
        registerCapturePile={drag.registerCapturePile}
        unregisterCapturePile={drag.unregisterCapturePile}
        onDropToCapture={actions.dropToCapture}
        onDropBuildToCapture={(stack) => {
          actions.dropToCapture({ stackId: stack.stackId, stackType: 'build_stack' });
        }}
        extendingBuildId={computed.extendingBuildId}
        onExtendBuild={actionHandlers.handleExtendBuild}
        onAcceptExtend={actionHandlers.handleExtendAcceptClick}
        onDeclineExtend={actionHandlers.handleDeclineExtend}
        playerHand={computed.myHand}
        opponentDrag={opponentDrag}
        // Disable only the temp stack overlay when action buttons are shown in player hand
        // ExtensionOverlay should still show when extendingBuildId is set
        disableOverlays={!!computed.overlayStackId}
        onBuildTap={handleBuildTap}
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
          modals.hideEndTurnButton();
          actions.createTemp(card, targetCard, 'hand');
        }}
        onDropOnTable={(card) => {
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
        onEndTurn={() => {
          modals.hideEndTurnButton();
          actions.endTurn();
        }}
        // Shiya props - party mode build capture
        gameState={gameState}
        currentPlayer={gameState.currentPlayer}
        selectedBuild={selectedBuildForShiya}
        onShiya={(stackId) => {
          // Clear the Shiya button immediately when clicked
          if (shiyaButtonTimerRef.current) {
            clearTimeout(shiyaButtonTimerRef.current);
            shiyaButtonTimerRef.current = null;
          }
          setSelectedBuildForShiya(null);
          actions.shiya(stackId);
        }}
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
          capturePositions={drag.capturePilePositions.current}
        />
      )}

      <GameModals
        showPlayModal={modals.showPlayModal}
        selectedTempStack={modals.selectedTempStack}
        playerHand={computed.myHand as TableCard[]}
        teamCapturedBuilds={gameState.teamCapturedBuilds}
        playerNumber={playerNumber}
        players={gameState.players}
        onConfirmPlay={actionHandlers.handleConfirmPlay}
        onCancelPlay={modals.closePlayModal}
        showStealModal={modals.showStealModal}
        stealTargetCard={modals.stealTargetCard}
        stealTargetStack={modals.stealTargetStack}
        onConfirmSteal={actionHandlers.handleConfirmSteal}
        onCancelSteal={modals.closeStealModal}
        onStealCompleted={modals.onStealCompleted}
      />

      {/* Shiya Recall Modal - appears when teammate captures your Shiya build */}
      <ShiyaRecallModal
        visible={!!shiyaRecallCandidate}
        build={shiyaRecallCandidate}
        onRecall={() => {
          // Clear timer and call recallBuild (no arguments needed - server reads from shiyaRecalls)
          if (recallTimerRef.current) clearTimeout(recallTimerRef.current);
          setShiyaRecallCandidate(null);
          actions.recallBuild();
        }}
        onClose={() => {
          setShiyaRecallCandidate(null);
          if (recallTimerRef.current) clearTimeout(recallTimerRef.current);
        }}
        autoCloseMs={4000}
      />

      {/* No Round End Modal - transitions are automatic */}
      {/* KISS: Round 1 → Round 2 → Game Over */}

      {/* Debug: Log when game over modal should show */}
      {(() => {
        const isVisible = gameState.gameOver || !!gameOverData;
        console.log('[GameBoard] GameOverModal visible check:', { 
          gameState_gameOver: gameState.gameOver, 
          gameOverData_exists: !!gameOverData,
          gameOverData: gameOverData ? 'present' : 'null',
          playerCount: gameState.playerCount,
          final: isVisible
        });
        return null;
      })()}
      
      <GameOverModal
        visible={(gameState.gameOver || !!gameOverData) || false}
        scores={gameOverData?.finalScores || gameState.scores as number[]}
        playerCount={gameState.playerCount}
        capturedCards={gameOverData?.capturedCards || gameState.players?.map(p => p.captures?.length || 0) || []}
        tableCardsRemaining={gameOverData?.tableCardsRemaining ?? gameState.tableCards?.length ?? 0}
        deckRemaining={gameOverData?.deckRemaining ?? gameState.deck?.length ?? 0}
        scoreBreakdowns={gameOverData?.scoreBreakdowns}
        teamScoreBreakdowns={gameOverData?.teamScoreBreakdowns}
        onPlayAgain={onRestart ? () => {
          console.log('[GameBoard] Play Again clicked');
          if (gameState.playerCount === 2) {
            onRestart();
          }
        } : undefined}
        onBackToMenu={onBackToMenu}
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

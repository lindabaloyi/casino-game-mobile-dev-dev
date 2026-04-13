/**
 * GameBoard — orchestrator
 *
 * Single responsibility: wire data → callbacks → sub-components.
 * No styles, no layout logic, no UI primitives here.
 *
 * Sub-components own their own look:
 *   CornerTimer    — timer in top-right corner (non-intrusive)
 *   RoundIndicator — round number in top-left corner
 *   TurnStatusIndicator — turn status centered at top
 *   TableArea      — table drop zone + card display (loose cards + temp stacks)
 *   PlayerHandArea — scrollable draggable hand
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
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
import { useCaptureSound } from '../../hooks/useCaptureSound';
import { useSound } from '../../hooks/useSound';
import { useTournamentStatus } from '../../hooks/useTournamentStatus';

import { TableArea } from '../table/TableArea';
import { PlayerHandArea } from './PlayerHandArea';
import { GameModals } from './GameModals';
import { DragGhost } from './DragGhost';
import { OpponentGhostCard } from './OpponentGhostCard';
import { ErrorBanner } from '../shared/ErrorBanner';
import { Card as TableCard } from '../../types';
import { GameOverModal } from '../modals/GameOverModal';
import { HomeMenuButton } from './HomeMenuButton';
import { OpponentProfileModal } from '../modals/OpponentProfileModal';
import { useOpponentInfo } from '../../hooks/useOpponentInfo';
import { areTeammates, isPartyGame } from '../../shared/game/team';
import { CornerTimer } from './CornerTimer';
import { RoundIndicator } from './RoundIndicator';
import { TurnStatusIndicator } from './TurnStatusIndicator';

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
    isPartyMode?: boolean;
    // Tournament-specific props
    isTournamentMode?: boolean;
    playerStatuses?: { [playerId: string]: string };
    qualifiedPlayers?: string[];
    nextGameId?: number;
    nextPhase?: string;
    transitionType?: 'auto' | 'manual';
    countdownSeconds?: number;
    eliminatedPlayers?: string[];
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
  
  // Track round transitions to prevent double triggers
  const lastProcessedRound = useRef<number>(0);

  // Effects
  useEffect(() => {
    if (serverError) {
      setErrorVersion(v => v + 1);
    }
  }, [serverError]);

  // Hide navigation bar for full-screen game experience
  useEffect(() => {
    const setupNavBar = async () => {
      try {
        // Only set visibility - behavior control not supported reliably
        await NavigationBar.setVisibilityAsync('hidden');
      } catch (error) {
        console.error('[GameBoard] Error hiding navigation bar:', error);
      }
    };
    
    setupNavBar();
    
    return () => {
      NavigationBar.setVisibilityAsync('visible').catch(() => {});
    };
  }, []);

  // Core hooks
  const drag = useDrag();
  const dragOverlay = useDragOverlay();
  const modals = useModalManager();
  const actions = useGameActions(sendAction);
  
  // Opponent info hook for profile modal
  const opponentInfo = useOpponentInfo();
  
  // Tournament status for disqualified player detection
  const tournamentStatus = useTournamentStatus(gameState, playerNumber);

  // Computed values
  const computed = useGameComputed(gameState, playerNumber);
  const { getTableBounds } = useTableBounds(drag.dropBounds);
  const roundInfo = useGameRound(gameState);
  
  // Memoized computed values for performance
  const gameMode = useMemo(() => {
    return gameState.gameMode || (
      gameState.playerCount === 2 ? 'two-hands' :
      gameState.playerCount === 3 ? 'two-hands' :
      (gameState.playerCount === 4 && gameState.players?.some((p: any) => p?.team)) ? 'party' : 'freeforall'
    );
  }, [gameState.gameMode, gameState.playerCount, gameState.players]);

  const isPartyMode = useMemo(() => 
    gameState.playerCount === 4 && gameState.gameMode === 'party',
    [gameState.playerCount, gameState.gameMode]
  );

  const buildStacks = useMemo(() => 
    computed.table.filter((tc: any) => tc.type === 'build_stack') as any[],
    [computed.table]
  );

  const showTimer = useMemo(() => 
    computed.isMyTurn && !(gameState.gameOver || !!gameOverData) && !roundInfo.isOver,
    [computed.isMyTurn, gameState.gameOver, gameOverData, roundInfo.isOver]
  );

  const capturedCardCounts = useMemo(() => 
    gameState.players?.map(p => p.captures?.length || 0) || [],
    [gameState.players]
  );

  const isGameOver = useMemo(() => 
    (gameState.gameOver || !!gameOverData) || false,
    [gameState.gameOver, gameOverData]
  );

  const shouldShowStandardGameOver = useMemo(() => {
    if (!isGameOver) {
      return false;
    }

    // Show modal for all games (tournament and non-tournament) - same behavior
    return true;
  }, [isGameOver, gameState.tournamentMode, gameOverData]);
  
  // Turn timer - 20 second countdown
  const turnTimer = useTurnTimer({
    currentPlayer: gameState.currentPlayer,
    isMyTurn: computed.isMyTurn,
    gameOver: (gameState.gameOver || !!gameOverData) || false,
    modalVisible: modals.showPlayModal || modals.showStealModal,
    roundOver: roundInfo.isOver,
    onTimeout: () => {
      // Auto-end turn when timer expires
      actions.endTurn();
    },
  });

  // Capture sound detection - plays sound when player captures cards
  useCaptureSound(gameState, playerNumber);

  // Sound effects for card contact (moved here to persist across drags)
  const { playCardContact, playTrail, playTableCardDrag, playButton, playCapture, playShiya } = useSound();

  // Debug logging disabled for cleaner console

  // Clear pending drop when card is removed from its source (hand or table)
  // This ensures optimistic UI state is reset after server confirms the action
  useEffect(() => {
    if (dragOverlay.pendingDropCard) {
      if (dragOverlay.pendingDropSource === 'hand') {
        // Check if the pending drop card is still in hand
        const myHand = gameState.players?.[playerNumber]?.hand ?? [];
        const stillInHand = myHand.some(
          (c: any) => c.rank === dragOverlay.pendingDropCard?.rank && c.suit === dragOverlay.pendingDropCard?.suit
        );
        
        if (!stillInHand) {
          // Card was removed from hand - clear pending drop
          dragOverlay.clearPendingDrop();
        }
      } else if (dragOverlay.pendingDropSource === 'table') {
        // Check if the pending drop card is still on table (not in a stack)
        const tableCards = computed.table ?? [];
        const stillOnTable = tableCards.some(
          (tc: any) => !tc.type && tc.rank === dragOverlay.pendingDropCard?.rank && tc.suit === dragOverlay.pendingDropCard?.suit
        );
        
        if (!stillOnTable) {
          // Card was removed from table - clear pending drop
          dragOverlay.clearPendingDrop();
        }
      }
    }
  }, [gameState.players, computed.table, dragOverlay, playerNumber]);

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
        startNextRound();
      }
      // Round 2 ending is handled by gameState.gameOver (no action needed)
    }
  }, [roundInfo.isOver, roundInfo.roundNumber, startNextRound]);

  // Note: Recall is now triggered via double-tap on teammate's capture pile
  // No modal needed - handled by handleRecallAttempt callback

  // === Modal handling for pendingChoice ===
  // showStealOnly: true → show only "Confirm Steal" option
  // showStealOnly: false → show both "Capture" and "Steal" options
  useEffect(() => {
    const pendingChoice = (gameState as any)?.pendingChoice;
    
    // Open modal when pendingChoice appears
    if (pendingChoice && pendingChoice.playerIndex === playerNumber && modals.captureOrStealData === null) {
      const buildOwner = pendingChoice.buildOwner;
      const isOwnBuild = buildOwner === playerNumber;
      
      if (!isOwnBuild) {
        // Use single modal for all scenarios
        modals.openCaptureOrStealModal({
          card: pendingChoice.card,
          buildValue: pendingChoice.buildValue || (pendingChoice.card?.value || 5),
          buildCards: pendingChoice.buildCards || [],
          extendedTarget: pendingChoice.extendedTarget || 10,
          stackId: pendingChoice.stackId,
          showStealOnly: pendingChoice.showStealOnly || false,
        });
      }
    }
    // Close modal when pendingChoice is cleared by server
    else if (!pendingChoice && modals.showCaptureOrStealModal) {
      modals.closeCaptureOrStealModal();
      modals.onStealCompleted();
    }
  }, [gameState, modals, playerNumber]);

  // Drag end wrapper
  const handleDragEndWrapper = () => {
    setDragVersion(v => v + 1);
  };

  // Play shiya sound on successful recall
  useEffect(() => {
    const lastAction = (gameState as any)?.lastAction;
    if (lastAction === 'recall') {
      playShiya();
    }
  }, [gameState, playShiya]);

  // Handle build tap for Shiya selection or dual builds
  const handleBuildTap = useCallback((stack: any) => {
    // Check if party mode (required for Shiya)
    if (!stack || gameState.playerCount !== 4) {
      // Not party mode - only handle confirm modal for own temp stacks (dual builds feature)
      if (stack?.type === 'temp_stack' && stack.owner === playerNumber) {
        modals.openConfirmTempBuildModal(stack);
      }
      return;
    }
    
    // === SHIYA ELIGIBILITY CHECK (for BOTH build_stack and temp_stack) ===
    
    // Check if it's own stack - no Shiya on own stacks
    if (stack.owner === playerNumber) {
      // For own temp stacks, show confirm modal (dual builds feature)
      if (stack.type === 'temp_stack') {
        modals.openConfirmTempBuildModal(stack);
      }
      return;
    }
    
    // Check if it's a teammate's stack
    const isTeammate = areTeammates(playerNumber, stack.owner);
    if (!isTeammate) {
      return;
    }
    
    // Not party mode - only handle confirm modal for own temp stacks (dual builds feature)
    if (stack.type === 'temp_stack' && stack.owner === playerNumber) {
      modals.openConfirmTempBuildModal(stack);
    }
  }, [gameState, playerNumber, modals]);

  // Handle recall attempt from capture pile (Shiya post-capture)
  const handleRecallAttempt = useCallback((targetPlayerIndex: number) => {
    // Check party mode
    if (gameState.playerCount !== 4) {
      return;
    }
    
    // Check if target is a teammate
    if (!areTeammates(playerNumber, targetPlayerIndex)) {
      return;
    }
    
    // Get target player's captures
    const targetCaptures = gameState.players?.[targetPlayerIndex]?.captures ?? [];
    
    if (targetCaptures.length === 0) {
      return;
    }
    
    // Get player's hand
    const myHand = gameState.players?.[playerNumber]?.hand ?? [];
    
    // Check if player has any matching cards in hand
    // For simplicity, we attempt to recall the most recent capture
    // The server will validate if there's a match
    const mostRecentCapture = targetCaptures[targetCaptures.length - 1];
    const hasMatch = myHand.some((card: any) => card.rank === mostRecentCapture.rank);
    
    if (!hasMatch) {
      // Could show feedback here
      return;
    }
    
    // Use unified recall - the server will validate that this player is the activator
    // Get the recall ID from shiyaRecalls
    const myRecalls = gameState.shiyaRecalls?.[playerNumber] as Record<string, any> | undefined;
    if (myRecalls && Object.keys(myRecalls).length > 0) {
      const recallId = Object.keys(myRecalls)[0];
      actions.recall(recallId);
    }
  }, [gameState, playerNumber, actions]);

  // Drag handlers
  // IMPORTANT: Use gameState.tableCards directly instead of computed.table
  // to avoid stale closure issues with memoized selectors
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
    table: gameState.tableCards ?? [],
    onTableCardDragDrop: playTableCardDrag,
  });

  // Action handlers
  // IMPORTANT: Use gameState.tableCards directly instead of computed.table
  // to avoid stale closure issues with memoized selectors
  const actionHandlers = useActionHandlers(
    actions,
    modals,
    gameState.tableCards ?? [],
    playerNumber,
    dragHandlers.handleDragEnd,
    gameState.playerCount === 4,
    roundInfo.roundNumber,
    computed.myHand as TableCard[],
    buildStacks
  );

  // ── Unified Drop Handler ─────────────────────────────────────────────────
  // All stack drops are forwarded to the server's smart router.
  // The router handles all business logic including:
  // - Steal validation (vs capture vs extend)
  // - Build value validation
  // - Ownership changes
  // This ensures the server has full authority over game rules.
  // 
  // IMPORTANT: Use gameState.tableCards directly instead of computed.table
  // to avoid stale closure issues where useMemo may lag behind gameState updates.
  
  // ── Build Stack Drop Handler ────────────────────────────────────────────────
  const handleBuildStackDrop = useCallback((
    card: any,
    stackId: string,
    stackOwner: number,
    source: 'hand' | 'table' | 'captured'
  ) => {
    // Hide end turn button when player makes a new action
    modals.hideEndTurnButton();

    // Forward to server - use specific action based on ownership
    // Determine if friendly build (own or teammate)
    const isFriendly = stackOwner === playerNumber || 
      (isPartyGame(gameState) && areTeammates(playerNumber, stackOwner));
    
    if (isFriendly) {
      actions.friendBuildDrop(card, stackId, source);
    } else {
      actions.opponentBuildDrop(card, stackId, source);
    }
  }, [modals, actions, gameState.tableCards, playerNumber, gameState.playerCount]);

  // ── Temp Stack Drop Handler ─────────────────────────────────────────────────
  const handleTempStackDrop = useCallback((
    card: any,
    stackId: string,
    source: 'hand' | 'table' | 'captured'
  ) => {
    modals.hideEndTurnButton();
    actions.addToTemp(card, stackId, source);
  }, [modals, actions]);

  // ── Memoized Callbacks for Inline Handlers ─────────────────────────────────
  
  const handleTableCardDropOnCard = useCallback((card: any, targetCard: any) => {
    actions.createTemp(card, targetCard, 'table');
  }, [actions]);

  const handleCapturedCardDragEnd = useCallback((
    card: any,
    targetCard: any,
    targetStackId: string | undefined,
    source: string | undefined
  ) => {
    // OPTIMISTIC UI: Mark card as pending drop to hide it immediately
    dragOverlay.markPendingDrop(card, 'captured');
    
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
  }, [dragOverlay, emitDragEnd, drag.dropBounds, actions]);

  const handleCaptureBuild = useCallback((
    card: any,
    stackId: string,
    cardSource: string | undefined
  ) => {
    console.log('[GameBoard] handleCaptureBuild:', {
      card: `${card?.rank}${card?.suit}`,
      cardValue: card?.value,
      stackId,
      cardSource,
      playerNumber
    });

    // OPTIMISTIC UI: Mark card as pending drop to hide it immediately
    dragOverlay.markPendingDrop(card, 'captured');
    
    // Emit drag-end to server so opponents can clean up ghost cards
    if (emitDragEnd) {
      const absX = dragOverlay.overlayX.value + 28;
      const absY = dragOverlay.overlayY.value + 42;
      const tableBounds = drag.dropBounds.current;
      const normX = Math.max(0, Math.min(1, absX / (tableBounds.width || 400)));
      const normY = Math.max(0, Math.min(1, absY / (tableBounds.height || 300)));
      emitDragEnd(card, { x: normX, y: normY }, 'success', 'build_stack', stackId);
    }
    
    // Use gameState.tableCards directly instead of computed.table for latest state
    const tableCards = gameState.tableCards ?? [];
    const buildStack = tableCards.find(
      (tc: any) => tc.stackId === stackId && tc.type === 'build_stack'
    ) as any;
    const stackOwner = buildStack?.owner ?? 0;
    
    const source = cardSource || 'captured';
    
    // Use specific action based on build ownership
    const isFriendly = stackOwner === playerNumber || 
      (isPartyGame(gameState) && areTeammates(playerNumber, stackOwner));
    
    console.log('[GameBoard] handleCaptureBuild decision:', {
      stackOwner,
      isFriendly,
      action: isFriendly ? 'friendBuildDrop' : 'opponentBuildDrop',
      source
    });
    
    if (isFriendly) {
      actions.friendBuildDrop(card, stackId, source);
    } else {
      actions.opponentBuildDrop(card, stackId, source);
    }
    dragOverlay.endDrag();
  }, [dragOverlay, emitDragEnd, drag.dropBounds, actions, gameState.tableCards, playerNumber, gameState.playerCount]);

  const handleDropBuildToCapture = useCallback((stack: any) => {
    actions.dropToCapture({ stackId: stack.stackId, stackType: 'build_stack' });
  }, [actions]);

  const handleLooseCardDrop = useCallback((card: any, targetCard: any) => {
    modals.hideEndTurnButton();
    actions.createTemp(card, targetCard, 'hand');
  }, [modals, actions]);

  const handleDropOnTable = useCallback((card: any) => {
    modals.hideEndTurnButton();
    actionHandlers.handleTrail(card);
  }, [modals, actionHandlers]);

  const handleEndTurn = useCallback(() => {
    modals.hideEndTurnButton();
    actions.endTurn();
  }, [modals, actions]);

  const handleConfirmTempBuild = useCallback((value: number) => {
    if (modals.confirmTempBuildStack) {
      actions.setTempBuildValue(modals.confirmTempBuildStack.stackId, value);
      modals.closeConfirmTempBuildModal();
    }
  }, [modals, actions]);

  const handlePlayAgain = useCallback(() => {
    if (gameState.playerCount === 2 && onRestart) {
      onRestart();
    }
  }, [gameState.playerCount, onRestart]);

  const handleQuitGame = useCallback(() => {
    if (onBackToMenu) {
      onBackToMenu();
    }
  }, [onBackToMenu]);

  const handleOpponentPress = useCallback((playerIndex: number) => {
    opponentInfo.selectOpponent(playerIndex, gameState.players || []);
  }, [opponentInfo, gameState.players]);

  const handleSendFriendRequest = useCallback(async () => {
    const result = await opponentInfo.sendFriendRequest();
  }, [opponentInfo]);

  // Render
  return (
    <SafeAreaView style={styles.root}>
      {serverError && (
        <ErrorBanner 
          message={serverError.message} 
          onClose={onServerErrorClose} 
        />
      )}

      {/* Corner timer - top right corner */}
      <CornerTimer
        timeRemaining={turnTimer.timeRemaining}
        visible={showTimer}
        isLowTime={turnTimer.isLowTime}
      />

      {/* Round indicator - top left corner */}
      <RoundIndicator round={gameState.round} />

      {/* Turn status - centered at top */}
      <TurnStatusIndicator
        currentPlayer={gameState.currentPlayer}
        playerNumber={playerNumber}
        playerCount={gameState.playerCount}
        isPartyMode={isPartyMode}
      />

      <TableArea
        tableCards={computed.table}
        tableVersion={computed.tableVersion}
        isMyTurn={computed.isMyTurn}
        playerNumber={playerNumber}
        // Party mode for team colors - determine from gameMode
        // For 4-player: pass isPartyMode to determine team rendering
        isPartyMode={isPartyMode}
        currentPlayerIndex={gameState.currentPlayer}
        // Use gameMode from useMemo
        gameMode={gameMode}
        tableRef={drag.tableRef}
        onTableLayout={drag.onTableLayout}
        registerCard={drag.registerCard}
        unregisterCard={drag.unregisterCard}
        registerTempStack={drag.registerTempStack}
        unregisterTempStack={drag.unregisterTempStack}
        registerBuildStack={drag.registerBuildStack}
        unregisterBuildStack={drag.unregisterBuildStack}
        findCardAtPoint={drag.findCardAtPoint}
        findTempStackAtPoint={drag.findTempStackAtPoint}
        findBuildStackAtPoint={drag.findBuildStackAtPoint}
        onTableCardDropOnCard={handleTableCardDropOnCard}
        onDropOnBuildStack={(card, stackId, owner, source) => handleBuildStackDrop(card, stackId, owner, source || 'table')}
        onDropOnTempStack={(card, stackId, source) => handleTempStackDrop(card, stackId, source || 'table')}
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
        onCapturedCardDragEnd={handleCapturedCardDragEnd}
        onCaptureBuild={handleCaptureBuild}
        findCapturePileAtPoint={drag.findCapturePileAtPoint}
        registerCapturePile={drag.registerCapturePile}
        unregisterCapturePile={drag.unregisterCapturePile}
        onDropToCapture={actions.dropToCapture}
        onDropBuildToCapture={handleDropBuildToCapture}
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
        onRecallAttempt={handleRecallAttempt}
        onPlayButtonSound={playButton}
        onCardPlayed={playCardContact}
        pendingDropCard={dragOverlay.pendingDropCard}
        pendingDropSource={dragOverlay.pendingDropSource}
      />

      <PlayerHandArea
        key={`playerHand-${errorVersion}-${dragVersion}`}
        hand={computed.myHand}
        isMyTurn={computed.isMyTurn}
        playerNumber={playerNumber}
        dropBounds={drag.dropBounds}
        findCardAtPoint={drag.findCardAtPoint}
        findTempStackAtPoint={drag.findTempStackAtPoint}
        findBuildStackAtPoint={drag.findBuildStackAtPoint}
        tableCards={computed.table}
        onDropOnBuildStack={handleBuildStackDrop}
        onDropOnTempStack={handleTempStackDrop}
        onDropOnLooseCard={handleLooseCardDrop}
        onDropOnTable={handleDropOnTable}
        onDragStart={dragHandlers.handleHandDragStart}
        onDragMove={dragHandlers.handleDragMove}
        onDragEnd={dragHandlers.handleDragEnd}
        opponentDrag={opponentDrag}
        // Optimistic UI: pass pending drop state to hide cards immediately after drop
        pendingDropCard={dragOverlay.pendingDropCard}
        pendingDropSource={dragOverlay.pendingDropSource}
        // Stack action props for action strip in hand area
        activeStackId={computed.overlayStackId || computed.extendingBuildId}
        activeStackType={computed.overlayStackId ? 'temp_stack' : (computed.extendingBuildId ? 'extend_build' : null)}
        onAcceptStack={computed.overlayStackId ? actionHandlers.handleAcceptClick : (computed.extendingBuildId ? actionHandlers.handleExtendAcceptClick : undefined)}
        onCancelStack={computed.overlayStackId ? actions.cancelTemp : (computed.extendingBuildId ? actionHandlers.handleDeclineExtend : undefined)}
        showEndTurnButton={modals.showEndTurnButton}
        onEndTurn={handleEndTurn}
        // Sound effect for card contact
        onCardContact={playCardContact}
        // Sound effect for trail
        onTrailSound={playTrail}
        // Sound effect for button clicks
        onPlayButtonSound={playButton}
        // Game state for party mode
        gameState={gameState}
        currentPlayer={gameState.currentPlayer}
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
        onPlayButtonSound={playButton}
        showStealModal={modals.showStealModal}
        stealTargetCard={modals.stealTargetCard}
        stealTargetStack={modals.stealTargetStack}
        onConfirmSteal={() => actionHandlers.handleConfirmSteal(computed.myHand as TableCard[])}
        onCancelSteal={modals.closeStealModal}
        onStealCompleted={modals.onStealCompleted}
        // Pass game state for modals that need it
        playerCount={gameState.playerCount}
        isPartyMode={isPartyMode}
        // Confirm temp build modal (double-click)
        showConfirmTempBuild={modals.showConfirmTempBuild}
        confirmTempBuildStack={modals.confirmTempBuildStack}
        onConfirmTempBuild={handleConfirmTempBuild}
        onCancelConfirmTempBuild={modals.closeConfirmTempBuildModal}
        // Extend build modal
        showExtendModal={modals.showExtendModal}
        extendTargetBuild={modals.extendTargetBuild}
        onConfirmExtend={actionHandlers.handleConfirmExtendAccept}
        onDeclineExtend={actionHandlers.handleCancelExtendAccept}
        onPlayButtonSoundExtend={playButton}
        // Capture or steal modal
        showCaptureOrStealModal={modals.showCaptureOrStealModal}
        captureOrStealCard={modals.captureOrStealData?.card}
        captureOrStealBuildValue={modals.captureOrStealData?.buildValue}
        captureOrStealBuildCards={modals.captureOrStealData?.buildCards}
        captureOrStealExtendedTarget={modals.captureOrStealData?.extendedTarget}
        captureOrStealShowStealOnly={modals.captureOrStealData?.showStealOnly}
        onConfirmCapture={() => modals.captureOrStealData && actionHandlers.handleConfirmCaptureChoice(modals.captureOrStealData)}
        onConfirmExtendChoice={() => modals.captureOrStealData && actionHandlers.handleConfirmExtendChoice(modals.captureOrStealData)}
        onCancelCaptureOrSteal={modals.closeCaptureOrStealModal}
        // Disqualified player modal (tournament)
        showDisqualifiedModal={tournamentStatus.isEliminated}
        // Get the player's playerId to access tournament data
        disqualifiedPlayerIndex={playerNumber}
        disqualifiedTournamentScore={(() => {
          // Get playerId from gameState.players array
          const playerId = gameState.players?.[playerNumber]?.id;
          return playerId ? tournamentStatus.tournamentScores[playerId] ?? 0 : 0;
        })()}
        disqualifiedFinalRank={Object.values(tournamentStatus.playerStatuses).filter(s => s === 'ELIMINATED' || s === 'ACTIVE').length}
        disqualifiedTotalPlayers={Object.keys(tournamentStatus.playerStatuses).length}
        disqualifiedEliminationRound={tournamentStatus.tournamentPhase ?? 'Qualifying'}
        disqualifiedRoundsSurvived={tournamentStatus.tournamentRound - 1}
        onReturnToLobby={onBackToMenu}
        onWatchTournament={() => {
          // Keep watching as spectator
        }}
      />

      {/* Recall is triggered via double-tap on teammate's capture pile - no modal needed */}

    
      
      {/* GameOverModal - Tournament winner display */}
      <GameOverModal
        visible={shouldShowStandardGameOver}
        scores={gameOverData?.finalScores || gameState.scores as number[]}
        playerCount={gameState.playerCount}
        capturedCards={gameOverData?.capturedCards || capturedCardCounts}
        tableCardsRemaining={gameOverData?.tableCardsRemaining ?? gameState.tableCards?.length ?? 0}
        deckRemaining={gameOverData?.deckRemaining ?? gameState.deck?.length ?? 0}
        scoreBreakdowns={gameOverData?.scoreBreakdowns}
        teamScoreBreakdowns={gameOverData?.teamScoreBreakdowns}
        isPartyMode={gameOverData?.isPartyMode ?? isPartyMode}
        isTournamentMode={gameOverData?.isTournamentMode ?? (gameState.tournamentMode === 'knockout')}
        gameType={gameOverData?.gameType}
        playerStatuses={gameState.playerStatuses}
        qualifiedPlayers={gameState.qualifiedPlayers}
        nextGameId={gameOverData?.nextGameId}
        nextPhase={gameOverData?.nextPhase}
        transitionType={gameOverData?.transitionType}
        countdownSeconds={gameOverData?.countdownSeconds}
        eliminatedPlayers={gameOverData?.eliminatedPlayers}
        onTransitionToNextGame={() => {
          if (gameOverData?.nextGameId) {
            sendAction({ type: 'join-tournament-game', payload: { gameId: gameOverData.nextGameId } });
          }
        }}
        onPlayAgain={onRestart ? handlePlayAgain : undefined}
        onBackToMenu={onBackToMenu}
      />

      {/* Home Menu Button - Bottom left corner */}
      <HomeMenuButton
        playerNumber={playerNumber}
        players={gameState.players || []}
        onQuitGame={handleQuitGame}
        onOpponentPress={handleOpponentPress}
      />

      {/* Opponent Profile Modal */}
      <OpponentProfileModal
        visible={opponentInfo.isModalVisible}
        opponent={opponentInfo.selectedOpponent}
        isFriend={opponentInfo.isFriend(opponentInfo.selectedOpponent?.userId)}
        isPendingRequest={opponentInfo.isPendingRequest(opponentInfo.selectedOpponent?.userId)}
        isLoading={opponentInfo.isLoadingFriendRequest}
        onClose={opponentInfo.closeModal}
        onSendFriendRequest={handleSendFriendRequest}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1B5E20',
    paddingTop: 0, // Removed - indicators now integrated onto board
  },
});

export default GameBoard;

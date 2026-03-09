/**
 * useGameStateSync
 * 
 * Handles game state synchronization from the server.
 * 
 * Responsibilities:
 *  - Listen for game events (game-start, game-update, round-end, game-over)
 *  - Manage local game state
 *  - Handle player disconnection
 *  - Expose game actions
 *  - Validate card inventory to detect desync
 * 
 * Usage:
 *   const { gameState, gameOverData, playerNumber, sendAction, requestSync } = useGameStateSync(socket);
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Card {
  rank: string;
  suit: string;
  value: number;
}

export interface GameState {
  deck: Card[];
  players: {
    id: number;
    name: string;
    hand: Card[];
    captures: Card[];
    score: number;
    team?: 'A' | 'B';
    buildStacks?: Array<{
      owner: number;
      value: number;
      cards: Card[];
      cardsMap: Record<string, Card>;
      name: string;
      buildType: 'solo' | 'extendable';
      stackType: 'build';
      stackId?: string;
      shiyaActive?: boolean;
    }>;
  }[];
  table: Card[];
  tableCards: Card[];
  currentPlayer: number;
  round: number;
  scores: number[];
  teamScores: [number, number];
  playerCount: number;
  turnCounter: number;
  moveCount: number;
  gameOver: boolean;
  roundEndReason?: 'cards_depleted' | 'max_moves' | 'all_cards_played' | 'all_players_acted';
  roundPlayers?: Record<number, {
    playerId: number;
    turnStarted: boolean;
    turnEnded: boolean;
    actionTriggered: boolean;
    actionCompleted: boolean;
  }>;
  // Party mode (2v2): Track builds captured from teammates
  // teamCapturedBuilds[0] = builds captured from Team A, teamCapturedBuilds[1] = builds captured from Team B
  // Each entry contains { value: number, originalOwner: number, capturedBy: number }
  teamCapturedBuilds?: { 0: { value: number; originalOwner: number; capturedBy: number }[]; 1: { value: number; originalOwner: number; capturedBy: number }[] };
}

export interface GameOverData {
  winner: number;
  finalScores: number[];
  capturedCards?: number[];
  tableCardsRemaining?: number;
  deckRemaining?: number;
}

export interface UseGameStateSyncResult {
  /** Current game state from server */
  gameState: GameState | null;
  /** Game over data for modal display */
  gameOverData: GameOverData | null;
  /** Player number (0-3) */
  playerNumber: number | null;
  /** Whether opponent disconnected */
  opponentDisconnected: boolean;
  /** Error message */
  error: string | null;
  /** Send game action to server */
  sendAction: (action: { type: string; payload?: Record<string, unknown> }) => void;
  /** Request state sync from server */
  requestSync: () => void;
  /** Clear error */
  clearError: () => void;
}

// ── Card Count Validation Helper ──────────────────────────────────────────────

/**
 * Count all cards in the game state
 * Returns breakdown for debugging
 */
function countAllCards(state: GameState): { total: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};
  
  // Count deck
  breakdown.deck = state.deck?.length ?? 0;
  
  // Count each player's hand
  state.players?.forEach((player, idx) => {
    breakdown[`player${idx}_hand`] = player.hand?.length ?? 0;
    breakdown[`player${idx}_captures`] = player.captures?.length ?? 0;
  });
  
  // Count table cards (loose cards only, not stacks)
  const looseCards = state.tableCards?.filter((tc: any) => !tc.type) ?? [];
  breakdown.looseCards = looseCards.length;
  
  // Count cards in temp stacks
  const tempStackCards = state.tableCards
    ?.filter((tc: any) => tc.type === 'temp_stack' && tc.cards)
    .flatMap((tc: any) => tc.cards) ?? [];
  breakdown.tempStackCards = tempStackCards.length;
  
  // Count cards in build stacks
  const buildStackCards = state.tableCards
    ?.filter((tc: any) => tc.type === 'build_stack' && tc.cards)
    .flatMap((tc: any) => tc.cards) ?? [];
  breakdown.buildStackCards = buildStackCards.length;
  
  // Total
  const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
  
  return { total, breakdown };
}

/**
 * Validate card inventory - returns expected total based on player count
 * Game uses 40 cards (reduced deck)
 * 2 players: each gets 10 cards, 20 on table = 20 dealt + 20 table = 40
 * 4 players: each gets 10 cards, 0 on table = 40 dealt + 0 table = 40
 */
function getExpectedCardTotal(playerCount: number): number {
  return 40; // Reduced deck (40 cards)
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGameStateSync(socket: Socket | null): UseGameStateSyncResult {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameOverData, setGameOverData] = useState<GameOverData | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle game-start event
  useEffect(() => {
    if (!socket) return;

    const handleGameStart = (data: { gameState: GameState; playerNumber: number }) => {
      console.log('[useGameStateSync] game-start received:', data);
      setGameState(data.gameState);
      setPlayerNumber(data.playerNumber);
      setOpponentDisconnected(false);
      setError(null);
      setGameOverData(null);
    };

    socket.on('game-start', handleGameStart);

    return () => {
      socket.off('game-start', handleGameStart);
    };
  }, [socket]);

  // ── Card Count Validation ───────────────────────────────────────────────────
  // Validate card inventory on every state update to detect desync early
  const prevCardCount = useRef<number>(0);
  
  useEffect(() => {
    if (!gameState) return;
    
    const { total, breakdown } = countAllCards(gameState);
    const expected = getExpectedCardTotal(gameState.playerCount);
    
    // Log card count on state change
    console.log('[useGameStateSync] Card count:', {
      expected,
      actual: total,
      breakdown,
      round: gameState.round,
      moveCount: gameState.moveCount
    });
    
    // Check for unexpected changes
    if (prevCardCount.current !== 0 && prevCardCount.current !== total) {
      const diff = total - prevCardCount.current;
      if (Math.abs(diff) > 1) {
        // More than 1 card change is unexpected
        console.error('[useGameStateSync] ⚠️ UNEXPECTED CARD COUNT CHANGE:', {
          previous: prevCardCount.current,
          current: total,
          diff,
          breakdown
        });
      }
    }
    
    // Validate against expected total
    if (total !== expected) {
      console.error('[useGameStateSync] ⚠️ CARD COUNT MISMATCH:', {
        expected,
        actual: total,
        diff: expected - total,
        breakdown
      });
      // Note: We don't auto-request sync here as it could cause loops
      // The server will validate and reject invalid actions
    }
    
    prevCardCount.current = total;
  }, [gameState]);

  // Handle game-update event
  useEffect(() => {
    if (!socket) return;

    const handleGameUpdate = (state: GameState) => {
      console.log('[useGameStateSync] game-update received, round:', state.round);
      setGameState(state);
    };

    socket.on('game-update', handleGameUpdate);

    return () => {
      socket.off('game-update', handleGameUpdate);
    };
  }, [socket]);

  // Handle round-end event
  useEffect(() => {
    if (!socket) return;

    const handleRoundEnd = (data: {
      round: number;
      reason: 'cards_depleted' | 'max_moves';
    }) => {
      console.log('[useGameStateSync] round-end received:', data);
      setGameState(prev => prev ? {
        ...prev,
        round: data.round,
        roundEndReason: data.reason,
      } : null);
    };

    socket.on('round-end', handleRoundEnd);

    return () => {
      socket.off('round-end', handleRoundEnd);
    };
  }, [socket]);

  // Handle game-over event
  useEffect(() => {
    if (!socket) return;

    const handleGameOver = (data: GameOverData) => {
      console.log('[useGameStateSync] game-over received:', data);
      setGameOverData(data);
    };

    socket.on('game-over', handleGameOver);

    return () => {
      socket.off('game-over', handleGameOver);
    };
  }, [socket]);

  // Handle player disconnection
  useEffect(() => {
    if (!socket) return;

    const handlePlayerDisconnected = () => {
      console.log('[useGameStateSync] player-disconnected received');
      setOpponentDisconnected(true);
    };

    socket.on('player-disconnected', handlePlayerDisconnected);

    return () => {
      socket.off('player-disconnected', handlePlayerDisconnected);
    };
  }, [socket]);

  // Handle errors
  useEffect(() => {
    if (!socket) return;

    const handleError = (data: { message: string }) => {
      console.log('[useGameStateSync] error received:', data.message);
      setError(data.message);
      
      // Request sync after error
      setTimeout(() => {
        socket.emit('request-sync');
      }, 100);
    };

    socket.on('error', handleError);

    return () => {
      socket.off('error', handleError);
    };
  }, [socket]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const sendAction = useCallback((action: { type: string; payload?: Record<string, unknown> }) => {
    socket?.emit('game-action', action);
  }, [socket]);

  const requestSync = useCallback(() => {
    socket?.emit('request-sync');
  }, [socket]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    gameState,
    gameOverData,
    playerNumber,
    opponentDisconnected,
    error,
    sendAction,
    requestSync,
    clearError,
  };
}

export default useGameStateSync;

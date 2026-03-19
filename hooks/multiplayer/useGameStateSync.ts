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

// Import player profile for win/loss tracking
import { usePlayerProfile } from '../usePlayerProfile';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Card {
  rank: string;
  suit: string;
  value: number;
}

// Shiya Recall interface
// Transient recall offers created when a teammate captures a build where Shiya was activated
// These are ephemeral - they expire after a short time (typically 4 seconds)
export interface ShiyaRecall {
  stackId: string;
  value: number;
  base?: number;
  need?: number;
  buildType?: 'sum' | 'diff';
  capturedBy: number;        // Player index who captured the build
  originalOwner: number;     // Player index who originally owned the build
  buildCards: Card[];       // Cards in the captured build
  captureCards: Card[];     // Cards used to capture
  expiresAt: number;        // Timestamp when recall expires
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
  // Party mode (2v2): Track builds that can be rebuilt by each player
  // teamCapturedBuilds[playerIndex] = builds that THIS PLAYER can rebuild
  // Only the OTHER teammate (not the original builder) can rebuild
  // Example: If Player 2 builds and opponent captures, Player 3 gets the entry
  teamCapturedBuilds?: { 
    [playerIndex: number]: { value: number; originalOwner: number; capturedBy: number; stackId: string; cards: any[] }[]
  };
  // Shiya Recall offers - supports multiple recalls per player using stackId as key
  // Key = player index who can accept the recall, then stackId
  // This is separate from teamCapturedBuilds because it represents transient notifications, not persistent team assets
  shiyaRecalls?: {
    [playerIndex: number]: {
      [stackId: string]: ShiyaRecall;
    };
  };
  // Tournament mode (knockout)
  tournamentMode?: 'knockout' | null;
  tournamentPhase?: 'QUALIFYING' | 'SEMI_FINAL' | 'FINAL_SHOWDOWN' | 'COMPLETED' | null;
  tournamentRound?: number;
  playerStatuses?: { [playerIndex: string]: 'ACTIVE' | 'ELIMINATED' | 'SPECTATOR' | 'WINNER' };
  tournamentScores?: { [playerIndex: string]: number };
  eliminationOrder?: number[];
  finalShowdownHandsPlayed?: number;
  finalShowdownScores?: { [playerIndex: string]: number };
}

export interface GameOverData {
  winner: number;
  finalScores: number[];
  capturedCards?: number[];
  tableCardsRemaining?: number;
  deckRemaining?: number;
  isPartyMode?: boolean; // NEW: tells frontend if party mode (teams) or free-for-all
  scoreBreakdowns?: Array<{
    totalCards: number;
    spadeCount: number;
    cardPoints: number;
    spadeBonus: number;
    cardCountBonus: number;
    totalScore: number;
    cards: Array<{
      rank: string;
      suit: string;
      value: number;
      display: string;
      points: number;
    }>;
    // Detailed breakdown by card type
    tenDiamondCount: number;
    tenDiamondPoints: number;
    twoSpadeCount: number;
    twoSpadePoints: number;
    aceCount: number;
    acePoints: number;
  }>;
  // Team score breakdowns for 4-player mode
  teamScoreBreakdowns?: {
    teamA: {
      totalCards: number;
      spadeCount: number;
      cardPoints: number;
      spadeBonus: number;
      cardCountBonus: number;
      totalScore: number;
      tenDiamondCount: number;
      tenDiamondPoints: number;
      twoSpadeCount: number;
      twoSpadePoints: number;
      aceCount: number;
      acePoints: number;
      players: Array<{
        playerIndex: number;
        totalCards: number;
        spadeCount: number;
        cardPoints: number;
        spadeBonus: number;
        cardCountBonus: number;
        totalScore: number;
      }>;
    };
    teamB: {
      totalCards: number;
      spadeCount: number;
      cardPoints: number;
      spadeBonus: number;
      cardCountBonus: number;
      totalScore: number;
      tenDiamondCount: number;
      tenDiamondPoints: number;
      twoSpadeCount: number;
      twoSpadePoints: number;
      aceCount: number;
      acePoints: number;
      players: Array<{
        playerIndex: number;
        totalCards: number;
        spadeCount: number;
        cardPoints: number;
        spadeBonus: number;
        cardCountBonus: number;
        totalScore: number;
      }>;
    };
  };
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

  // Player profile for win/loss tracking
  const { recordWin, recordLoss } = usePlayerProfile();

  // Handle game-start event
  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleGameStart = (data: any) => {
      console.log('[useGameStateSync] 🔥 game-start RECEIVED from server!');
      console.log('[useGameStateSync] gameState playerCount:', data.gameState?.playerCount);
      console.log('[useGameStateSync] playerNumber:', data.playerNumber);
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
    }
    
    prevCardCount.current = total;
  }, [gameState]);

  // Handle game-update event
  useEffect(() => {
    if (!socket) return;

    const handleGameUpdate = (state: GameState) => {
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
      console.log('[useGameStateSync] Received game-over event:', JSON.stringify(data, null, 2));
      setGameOverData(data);
      
      // Record win/loss for player
      if (playerNumber !== null) {
        const isWinner = data.winner === playerNumber;
        if (isWinner) {
          recordWin();
        } else {
          recordLoss();
        }
      }
    };

    socket.on('game-over', handleGameOver);

    return () => {
      socket.off('game-over', handleGameOver);
    };
  }, [socket, playerNumber, recordWin, recordLoss]);

  // Handle player disconnection
  useEffect(() => {
    if (!socket) return;

    const handlePlayerDisconnected = () => {
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

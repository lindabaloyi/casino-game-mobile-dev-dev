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
import { useGameReady } from './useGameReady';

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
  gameId?: number; // Set when received from server (via game-start event)
  deck: Card[];
  gameMode?: 'two-hands' | 'party' | 'three-hands' | 'four-hands' | 'tournament';
  players: {
    id: number;
    name: string;
    hand: Card[];
    captures: Card[];
    score: number;
    team?: 'A' | 'B';
    buildStacks?: {
      owner: number;
      value: number;
      cards: Card[];
      cardsMap: Record<string, Card>;
      name: string;
      buildType: 'solo' | 'extendable';
      stackType: 'build';
      stackId?: string;
      shiyaActive?: boolean;
    }[];
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
  // Pending shiya button - shows on action strip when teammate captures with matching card
  pendingShiya?: { playerIndex: number; recallId: string; expiresAt: number } | null;
  // Tournament mode (knockout)
  tournamentMode?: 'knockout' | null;
  tournamentPhase?: 'QUALIFYING' | 'SEMI_FINAL' | 'FINAL_SHOWDOWN' | 'COMPLETED' | null;
  tournamentRound?: number;
  playerStatuses?: { [playerId: string]: 'ACTIVE' | 'ELIMINATED' | 'SPECTATOR' | 'WINNER' };
  tournamentScores?: { [playerId: string]: number };
  eliminationOrder?: string[];
  finalShowdownHandsPlayed?: number;
  finalShowdownScores?: { [playerId: string]: number };
  qualifiedPlayers?: string[];
  qualificationScores?: { [playerId: string]: { totalPoints: number; cardPoints: number; tenDiamondPoints: number; twoSpadePoints: number; acePoints: number; spadeBonus: number; cardCountBonus: number; rank?: number } };
}

export interface GameOverData {
  winner: number;
  finalScores: number[];
  capturedCards?: number[];
  tableCardsRemaining?: number;
  deckRemaining?: number;
  isPartyMode?: boolean; // NEW: tells frontend if party mode (teams) or free-for-all
  // Tournament-specific data
  isTournamentMode?: boolean;
  playerStatuses?: { [playerId: string]: 'ACTIVE' | 'ELIMINATED' | 'SPECTATOR' | 'WINNER' };
  qualifiedPlayers?: string[];
  tournamentPhase?: 'QUALIFYING' | 'SEMI_FINAL' | 'FINAL' | 'FINAL_SHOWDOWN' | 'COMPLETED';
  qualificationScores?: { [playerId: string]: { totalPoints: number; cardPoints: number; tenDiamondPoints: number; twoSpadePoints: number; acePoints: number; spadeBonus: number; cardCountBonus: number; rank?: number } };
  // Tournament transition data
  nextGameId?: number;
  nextPhase?: string;
  transitionType?: 'auto' | 'manual';
  countdownSeconds?: number;
  eliminatedPlayers?: string[];
  // Tournament ranking debug info
  rankings?: string[]; // Player IDs in rank order (best first)
  tieBreakReason?: string; // Explain tie-break if applicable
  previousWinner?: string; // Previous hand winner userId

  scoreBreakdowns?: {
    totalCards: number;
    spadeCount: number;
    cardPoints: number;
    spadeBonus: number;
    cardCountBonus: number;
    totalScore: number;
    cards: {
      rank: string;
      suit: string;
      value: number;
      display: string;
      points: number;
    }[];
    // Detailed breakdown by card type
    tenDiamondCount: number;
    tenDiamondPoints: number;
    twoSpadeCount: number;
    twoSpadePoints: number;
    aceCount: number;
    acePoints: number;
  }[];
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
      players: {
        playerIndex: number;
        totalCards: number;
        spadeCount: number;
        cardPoints: number;
        spadeBonus: number;
        cardCountBonus: number;
        totalScore: number;
      }[];
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
      players: {
        playerIndex: number;
        totalCards: number;
        spadeCount: number;
        cardPoints: number;
        spadeBonus: number;
        cardCountBonus: number;
        totalScore: number;
      }[];
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
  /** Whether the local game is fully initialized and ready */
  gameReady: boolean;
  /** Whether all clients have confirmed they're ready */
  allClientsReady: boolean;
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

  // Game ready validation
  const { gameReady, allClientsReady, validateGameReady, emitClientReady } = useGameReady(socket);
  
  // Store gameId for emitClientReady
  const gameIdRef = useRef<number | null>(null);

  // Log ALL socket events received (global interceptor)
  useEffect(() => {
    if (!socket) return;
    const onAny = (event: string, ...args: any[]) => {
      // Socket event received
    };
    socket.onAny(onAny);
    return () => {
      try {
        socket.offAny(onAny);
      } catch (e) {}
    };
  }, [socket]);

  // Handle game-start event
  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleGameStart = (data: any) => {
      if (!data.gameState) {
        return;
      }
      
      setGameState(data.gameState);
      
      // Verify playerNumber matches user's actual position in gameState.players
      if (data.myUserId && data.gameState?.players) {
        const myIndex = data.gameState.players.findIndex(
          (p: any) => p.userId === data.myUserId
        );
        if (myIndex !== -1 && myIndex !== data.playerNumber) {
          setPlayerNumber(myIndex);
        } else {
          setPlayerNumber(data.playerNumber);
        }
      } else {
        setPlayerNumber(data.playerNumber);
      }
      
      setOpponentDisconnected(false);
      setError(null);
      setGameOverData(null);
      
      // Store gameId for emitClientReady
      if (data.gameId !== undefined && data.gameId !== null) {
        gameIdRef.current = data.gameId;
      }
    };

    socket.on('game-start', handleGameStart);

    return () => {
      socket.off('game-start', handleGameStart);
    };
  }, [socket]);

  // Trigger game ready validation when gameState or playerNumber changes
  useEffect(() => {
    if (!gameState) return;
    
    if (playerNumber === null) {
      return;
    }
    
    // Validate game state is ready
    const isValid = validateGameReady(gameState, playerNumber);
    
    if (isValid && gameIdRef.current !== null) {
      emitClientReady(gameIdRef.current, playerNumber);
    }
  }, [gameState, playerNumber, validateGameReady, emitClientReady]);

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

    const handleGameUpdate = (state: any) => {
      // Check for pending choice (capture vs extend modal)
      if ((state as any).pendingChoice) {
        // pending choice exists
      }
      
      // CRITICAL: Update playerNumber if provided (e.g., after tournament phase transitions)
      // The server sends playerNumber in game-update after remapping indices
      // FIXED: Handle null playerNumber for ELIMINATED players
      if (state.playerNumber !== undefined) {
        const newPlayerNumber = state.playerNumber;
        if (newPlayerNumber !== playerNumber) {
          setPlayerNumber(newPlayerNumber);
        }
      }
      
      setGameState(state);
    };

    socket.on('game-update', handleGameUpdate);

    return () => {
      socket.off('game-update', handleGameUpdate);
    };
  }, [socket, playerNumber]);

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
      // Extract tournament ranking data from game-over
      setGameOverData(data);
      
      // Record win/loss for player with game mode
      if (playerNumber !== null) {
        const isWinner = data.winner === playerNumber;
        
        // Get game mode from gameState or infer from player count
        // Map server game modes to our stats model modes
        let gameMode = 'two-hands'; // default
        
        if (gameState) {
          const serverMode = gameState.gameMode;
          if (serverMode === 'party' || serverMode === 'four-hands') {
            gameMode = 'four-hands'; // 4-player mode
          } else if (serverMode === 'three-hands') {
            gameMode = 'three-hands';
          } else if (serverMode === 'tournament') {
            gameMode = 'tournament';
          } else {
            gameMode = 'two-hands'; // default two-player
          }
        } else if (data.isPartyMode) {
          gameMode = 'four-hands';
        }
        
        if (isWinner) {
          recordWin(gameMode);
        } else {
          recordLoss(gameMode);
        }
      }
    };

    socket.on('game-over', handleGameOver);

    return () => {
      socket.off('game-over', handleGameOver);
    };
  }, [socket, playerNumber, recordWin, recordLoss, gameState]);

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

  // Handle errors - ignore room-error to prevent game state interference
  useEffect(() => {
    if (!socket) return;

    const handleError = (data: { message: string }) => {
      console.warn('[Client] 💥 Server error (ignored):', data.message);
      // Do NOT setError here - it interferes with game state transitions
      // The error is logged but doesn't affect gameState
    };

    socket.on('error', handleError);

    return () => {
      socket.off('error', handleError);
    };
  }, [socket]);

  // Handle room-error - ignore completely after game-start is received
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

  // Fallback: request game state if not received within 2 seconds
  // This handles race conditions where game-start emits before listener attaches
  useEffect(() => {
    if (!socket?.connected) return;
    
    const timeout = setTimeout(() => {
      if (!gameState) {
        socket.emit('request-sync');
      }
    }, 2000);
    
    return () => clearTimeout(timeout);
  }, [socket?.connected, gameState]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    gameState,
    gameOverData,
    playerNumber,
    opponentDisconnected,
    error,
    gameReady,
    allClientsReady,
    sendAction,
    requestSync,
    clearError,
  };
}

export default useGameStateSync;

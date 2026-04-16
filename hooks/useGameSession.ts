/**
 * useGameState - Simplified game state hook
 * 
 * Responsibilities:
 * - Listen for game-start events
 * - Listen for game-update events
 * - Provide game state to UI
 * - Send game actions
 * 
 * Does NOT handle room lifecycle - that's useRoom's job.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

export interface Card {
  rank: string;
  suit: string;
  value: number;
}

export interface GameState {
  gameId?: number;
  deck: Card[];
  players: {
    id: number;
    name: string;
    hand: Card[];
    captures: Card[];
    score: number;
    team?: 'A' | 'B';
    buildStacks?: any[];
  }[];
  table: Card[];
  tableCards: Card[];
  currentPlayer: number;
  round: number;
  scores: number[];
  playerCount: number;
  gameOver?: boolean;
}

export interface GameOverData {
  winner: number;
  finalScores: number[];
  isPartyMode?: boolean;
}

export interface UseGameStateResult {
  gameState: GameState | null;
  gameOverData: GameOverData | null;
  playerNumber: number | null;
  sendAction: (action: { type: string; payload?: Record<string, unknown> }) => void;
  requestSync: () => void;
}

export function useGameState(socket: Socket | null): UseGameStateResult {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameOverData, setGameOverData] = useState<GameOverData | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  
  // Track if we've received game-start to prevent overwrites
  const gameStartedRef = useRef(false);

  useEffect(() => {
    if (!socket) return;

    const handleGameStart = (data: any) => {
      // Only process if we haven't already started
      if (gameStartedRef.current) return;
      
      if (data.gameState) {
        gameStartedRef.current = true;
        setGameState(data.gameState);
        setPlayerNumber(data.playerNumber ?? 0);
        setGameOverData(null);
      }
    };

    const handleGameUpdate = (state: any) => {
      if (gameStartedRef.current && state) {
        setGameState(state);
      }
    };

    const handleGameOver = (data: GameOverData) => {
      setGameOverData(data);
      gameStartedRef.current = false;
    };

    socket.on('game-start', handleGameStart);
    socket.on('game-update', handleGameUpdate);
    socket.on('game-over', handleGameOver);

    return () => {
      socket.off('game-start', handleGameStart);
      socket.off('game-update', handleGameUpdate);
      socket.off('game-over', handleGameOver);
    };
  }, [socket]);

  const sendAction = useCallback((action: { type: string; payload?: Record<string, unknown> }) => {
    socket?.emit('game-action', action);
  }, [socket]);

  const requestSync = useCallback(() => {
    socket?.emit('request-sync');
  }, [socket]);

  return {
    gameState,
    gameOverData,
    playerNumber,
    sendAction,
    requestSync,
  };
}

export default useGameState;
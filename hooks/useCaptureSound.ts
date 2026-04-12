/**
 * useCaptureSound Hook
 * Watches game state for capture events and plays capture sound.
 * Detects when any player's captures increase.
 */

import { useEffect, useRef } from 'react';
import { useSound } from './useSound';

interface Player {
  captures?: Card[];
}

interface GameState {
  players?: Player[];
  playerCount?: number;
}

interface Card {
  rank: string;
  suit: string;
  value: number;
}

export function useCaptureSound(gameState: GameState | null, playerNumber: number) {
  const { playCapture } = useSound();
  const previousCapturesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!gameState?.players) return;

    const currentCaptureCounts = gameState.players.map(p => p?.captures?.length || 0);
    
    // Initialize on first render
    if (previousCapturesRef.current.length === 0) {
      previousCapturesRef.current = [...currentCaptureCounts];
      return;
    }

    // Check if current player's captures increased (they made a capture)
    const previousCount = previousCapturesRef.current[playerNumber] || 0;
    const currentCount = currentCaptureCounts[playerNumber] || 0;
    
    if (currentCount > previousCount) {
      playCapture();
    }

    // Update previous counts
    previousCapturesRef.current = [...currentCaptureCounts];
  }, [gameState, playerNumber, playCapture]);
}

export default useCaptureSound;
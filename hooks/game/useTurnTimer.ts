import { useState, useEffect, useRef, useCallback } from 'react';

// Timer duration in seconds (3 minutes = 180 seconds)
export const TURN_TIMER_DURATION = 180;

// Low time threshold (seconds) - triggers warning visual
export const LOW_TIME_THRESHOLD = 5;

/**
 * useTurnTimer
 * 
 * Manages a countdown timer for each player's turn.
 * - 20 seconds per turn
 * - Auto-resets when turn changes
 * - Pauses when explicitly paused (animations, between rounds, etc.)
 * - Callback when timer expires
 */
export interface UseTurnTimerResult {
  /** Current time remaining in seconds */
  timeRemaining: number;
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** Whether time is running low (≤5 seconds) */
  isLowTime: boolean;
  /** Start the timer */
  start: () => void;
  /** Pause the timer */
  pause: () => void;
  /** Resume the timer */
  resume: () => void;
  /** Reset the timer to full duration */
  reset: () => void;
}

interface UseTurnTimerProps {
  /** Current player index (0 or 1) */
  currentPlayer: number;
  /** Whether it's this client's turn */
  isMyTurn: boolean;
  /** Callback when timer expires (timeout) */
  onTimeout: () => void;
  /** Whether the game is over */
  gameOver?: boolean;
  /** Whether a modal is showing (pause timer during modals) */
  modalVisible?: boolean;
  /** Whether round is over (pause timer between rounds) */
  roundOver?: boolean;
}

export function useTurnTimer({
  currentPlayer,
  isMyTurn,
  onTimeout,
  gameOver = false,
  modalVisible = false,
  roundOver = false,
}: UseTurnTimerProps): UseTurnTimerResult {
  const [timeRemaining, setTimeRemaining] = useState(TURN_TIMER_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  
  // Track previous player to detect turn changes
  const prevPlayerRef = useRef<number>(currentPlayer);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Computed: is time running low
  const isLowTime = timeRemaining <= LOW_TIME_THRESHOLD && timeRemaining > 0;
  
  // Clear timer interval
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // Start the timer
  const start = useCallback(() => {
    clearTimer();
    setTimeRemaining(TURN_TIMER_DURATION);
    setIsRunning(true);
  }, [clearTimer]);
  
  // Pause the timer
  const pause = useCallback(() => {
    clearTimer();
    setIsRunning(false);
  }, [clearTimer]);
  
  // Resume the timer
  const resume = useCallback(() => {
    if (timeRemaining > 0 && !gameOver && !roundOver) {
      setIsRunning(true);
    }
  }, [timeRemaining, gameOver, roundOver]);
  
  // Reset the timer
  const reset = useCallback(() => {
    clearTimer();
    setTimeRemaining(TURN_TIMER_DURATION);
    setIsRunning(false);
  }, [clearTimer]);
  
  // Handle timeout
  const handleTimeout = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setTimeRemaining(0);
    onTimeout();
  }, [clearTimer, onTimeout]);
  
  // Timer tick effect
  useEffect(() => {
    if (isRunning && timeRemaining > 0 && !gameOver && !roundOver) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up - trigger timeout
            // Use setTimeout to avoid calling callback during render
            setTimeout(() => handleTimeout(), 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, gameOver, roundOver, handleTimeout]);
  
  // Reset timer when turn changes (new player)
  useEffect(() => {
    if (prevPlayerRef.current !== currentPlayer) {
      prevPlayerRef.current = currentPlayer;
      // Reset timer for new player
      setTimeRemaining(TURN_TIMER_DURATION);
      setIsRunning(false); // Don't auto-start, wait for player to take turn
    }
  }, [currentPlayer]);
  
  // Auto-start timer when it's my turn and game is active
  useEffect(() => {
    if (isMyTurn && !gameOver && !roundOver && !modalVisible) {
      // Start timer when player's turn begins
      if (!isRunning && timeRemaining === TURN_TIMER_DURATION) {
        setIsRunning(true);
      }
    }
  }, [isMyTurn, gameOver, roundOver, modalVisible, isRunning, timeRemaining]);
  
  // Pause when modal is visible, round is over, or game is over
  useEffect(() => {
    if (modalVisible || roundOver || gameOver) {
      pause();
    }
  }, [modalVisible, roundOver, gameOver, pause]);
  
  // Reset when game starts new
  useEffect(() => {
    if (gameOver) {
      reset();
    }
  }, [gameOver, reset]);
  
  return {
    timeRemaining,
    isRunning,
    isLowTime,
    start,
    pause,
    resume,
    reset,
  };
}

export default useTurnTimer;

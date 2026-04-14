/**
 * useGameOverModal.ts
 * Custom hook for GameOverModal business logic
 * Extracts all non-JSX logic from GameOverModal
 */

import { useState, useEffect, useRef } from 'react';
import { Animated, AnimatedValue } from 'react-native';

interface PlayerBreakdown {
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
}

interface UseGameOverModalProps {
  visible: boolean;
  scores: number[];
  playerCount: number;
  scoreBreakdowns?: PlayerBreakdown[];
  isPartyMode?: boolean;
  isTournamentMode?: boolean;
  playerStatuses?: { [playerId: string]: string };
  qualifiedPlayers?: string[];
  tournamentPhase?: string;
  nextGameId?: number;
  transitionType?: 'auto' | 'manual';
  countdownSeconds?: number;
  playerId?: string;
}

interface UseGameOverModalReturn {
  titleText: string;
  score1: number;
  score2: number;
  score3: number;
  score4: number;
  localStatusText: string;
  shouldShowCountdown: boolean;
  shouldShowPlayAgain: boolean;
  countdown: number;
  fadeAnim: AnimatedValue;
  scaleAnim: AnimatedValue;
}

export function useGameOverModal({
  visible,
  scores,
  playerCount,
  isPartyMode,
  isTournamentMode,
  playerStatuses,
  tournamentPhase,
  nextGameId,
  transitionType,
  playerId,
}: UseGameOverModalProps): UseGameOverModalReturn {
  const [countdown, setCountdown] = useState(10);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Phase display text
  const getPhaseDisplayText = (): string => {
    if (!tournamentPhase) return 'Game Over';
    switch (tournamentPhase) {
      case 'QUALIFYING': return 'Qualifying Round';
      case 'QUALIFICATION_REVIEW': return 'Qualification Complete';
      case 'SEMI_FINAL': return 'Semi-Final';
      case 'FINAL_SHOWDOWN': return 'Tournament Complete';
      case 'COMPLETED': return 'Tournament Complete';
      default: return tournamentPhase;
    }
  };

  const titleText = isTournamentMode ? getPhaseDisplayText() : 'Game Over';

  // Scores
  const score1 = scores[0] || 0;
  const score2 = scores[1] || 0;
  const score3 = scores[2] || 0;
  const score4 = scores[3] || 0;

  // Winner logic (non-tournament)
  const getScoreBasedWinner = (): string => {
    if (playerCount === 4 && isPartyMode) {
      const teamAScore = score1 + score2;
      const teamBScore = score3 + score4;
      if (teamAScore > teamBScore) return 'Team A';
      if (teamBScore > teamAScore) return 'Team B';
      return 'Tie';
    }
    if (playerCount === 4) {
      const maxScore = Math.max(score1, score2, score3, score4);
      const winners = [];
      if (score1 === maxScore) winners.push('Player 1');
      if (score2 === maxScore) winners.push('Player 2');
      if (score3 === maxScore) winners.push('Player 3');
      if (score4 === maxScore) winners.push('Player 4');
      return winners.length === 1 ? winners[0] : 'Tie';
    }
    if (playerCount === 3) {
      const maxScore = Math.max(score1, score2, score3);
      const winners = [
        score1 === maxScore ? 'Player 1' : null,
        score2 === maxScore ? 'Player 2' : null,
        score3 === maxScore ? 'Player 3' : null,
      ].filter(Boolean);
      return winners.length === 1 ? winners[0]! : 'Tie';
    }
    return score1 > score2 ? 'Player 1' : score2 > score1 ? 'Player 2' : 'Tie';
  };

  // Local player status
  const isFinalPhase = tournamentPhase === 'FINAL_SHOWDOWN' || tournamentPhase === 'COMPLETED';
  const localPlayerStatus = playerId ? playerStatuses?.[playerId] : undefined;
  const isLocalWinner = localPlayerStatus === 'WINNER';
  const isLocalQualified = localPlayerStatus === 'QUALIFIED';
  const shouldShowCountdown = isTournamentMode && !isFinalPhase && (isLocalWinner || isLocalQualified);

  const getLocalStatusText = (): string => {
    if (!isTournamentMode || !playerId) {
      const winnerText = getScoreBasedWinner();
      return winnerText === 'Tie' ? "It's a Tie!" : `${winnerText} Wins!`;
    }

    const status = playerStatuses?.[playerId];
    if (status === 'WINNER') return 'YOU WIN!';
    if (status === 'QUALIFIED') return 'YOU QUALIFIED!';
    if (status === 'ELIMINATED') return 'ELIMINATED';
    return 'Game Over';
  };

  const localStatusText = getLocalStatusText();
  const shouldShowPlayAgain = !isTournamentMode || (!nextGameId && transitionType !== 'auto');

  // Animation effect
  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  // Countdown effect
  useEffect(() => {
    if (visible && shouldShowCountdown) {
      setCountdown(10);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, shouldShowCountdown]);

  return {
    titleText,
    score1,
    score2,
    score3,
    score4,
    localStatusText,
    shouldShowCountdown,
    shouldShowPlayAgain,
    countdown,
    fadeAnim,
    scaleAnim,
  };
}

export default useGameOverModal;
/**
 * GameOverModal
 * Modal displayed when the game ends.
 * Shows a minimal point breakdown: only positive contributions, no totals.
 * Always displays total cards and total spades below a separator.
 * 
 * Uses centralized styling from shared/config/gameOverStyles.ts
 * Uses separated components for better maintainability
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, Animated, ViewStyle, TextStyle } from 'react-native';

import {
  GAME_OVER_COLORS,
  GAME_OVER_SIZES,
  GAME_OVER_LAYOUT,
} from '../../shared/config/gameOverStyles';

import { useGameOverModal } from './useGameOverModal';
import PlayerCard from './PlayerCard';
import TeamCard from './TeamCard';
import GameOverButtons from './GameOverButtons';

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

interface TeamBreakdown {
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
}

interface TeamScoreBreakdowns {
  teamA: TeamBreakdown;
  teamB: TeamBreakdown;
}

interface GameOverModalProps {
  visible: boolean;
  scores: number[];
  playerCount: number;
  capturedCards?: number[];
  tableCardsRemaining?: number;
  deckRemaining?: number;
  scoreBreakdowns?: PlayerBreakdown[];
  teamScoreBreakdowns?: TeamScoreBreakdowns;
  isPartyMode?: boolean;
  isTournamentMode?: boolean;
  gameType?: 'standard' | 'three-hands' | 'party';
  playerStatuses?: { [playerId: string]: string };
  qualifiedPlayers?: string[];
  tournamentPhase?: string;
  nextGameId?: number;
  nextPhase?: string;
  transitionType?: 'auto' | 'manual';
  countdownSeconds?: number;
  eliminatedPlayers?: string[];
  playerId?: string;
  onTransitionToNextGame?: () => void;
  onPlayAgain?: () => void;
  onBackToMenu?: () => void;
}

export function GameOverModal({
  visible,
  scores,
  playerCount,
  capturedCards,
  tableCardsRemaining,
  deckRemaining,
  scoreBreakdowns,
  teamScoreBreakdowns,
  isPartyMode,
  isTournamentMode,
  gameType,
  playerStatuses,
  qualifiedPlayers,
  tournamentPhase,
  nextGameId,
  nextPhase,
  transitionType,
  countdownSeconds,
  eliminatedPlayers,
  playerId,
  onTransitionToNextGame,
  onPlayAgain,
  onBackToMenu,
}: GameOverModalProps) {
  const {
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
  } = useGameOverModal({
    visible,
    scores,
    playerCount,
    scoreBreakdowns,
    isPartyMode,
    isTournamentMode,
    playerStatuses,
    qualifiedPlayers,
    tournamentPhase,
    nextGameId,
    transitionType,
    countdownSeconds,
    playerId,
  });

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.modal, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.title}>{titleText}</Text>

          <View style={styles.scoresSection}>
            <Text style={styles.scoresTitle}>Final Scores</Text>

            {playerCount === 2 && (
              <View style={styles.playersRow}>
                <PlayerCard playerIndex={0} playerName="Player 1" score={score1} breakdown={scoreBreakdowns?.[0]} />
                <PlayerCard playerIndex={1} playerName="Player 2" score={score2} breakdown={scoreBreakdowns?.[1]} />
              </View>
            )}

            {playerCount === 3 && (
              <View style={styles.threePlayersContainer}>
                <PlayerCard playerIndex={0} playerName="Player 1" score={score1} breakdown={scoreBreakdowns?.[0]} />
                <PlayerCard playerIndex={1} playerName="Player 2" score={score2} breakdown={scoreBreakdowns?.[1]} />
                <PlayerCard playerIndex={2} playerName="Player 3" score={score3} breakdown={scoreBreakdowns?.[2]} />
              </View>
            )}

            {playerCount === 4 && isPartyMode && (
              <View style={styles.partyTeamsRow}>
                {teamScoreBreakdowns ? (
                  <View style={styles.partyTeamsDetailedRow}>
                    <TeamCard teamName="Team A" team={teamScoreBreakdowns.teamA} teamScore={score1 + score2} />
                    <TeamCard teamName="Team B" team={teamScoreBreakdowns.teamB} teamScore={score3 + score4} />
                  </View>
                ) : (
                  <>
                    <View style={[styles.partyTeamCard, styles.partyTeamCardTeamA]}>
                      <Text style={[styles.partyTeamLabel, styles.partyTeamLabelTeamA]}>Team A</Text>
                      <Text style={styles.partyTeamScore}>{score1 + score2}</Text>
                    </View>
                    <View style={[styles.partyTeamCard, styles.partyTeamCardTeamB]}>
                      <Text style={[styles.partyTeamLabel, styles.partyTeamLabelTeamB]}>Team B</Text>
                      <Text style={styles.partyTeamScore}>{score3 + score4}</Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {playerCount === 4 && !isPartyMode && (
              <View style={styles.fourPlayersContainer}>
                <PlayerCard playerIndex={0} playerName="Player 1" score={score1} breakdown={scoreBreakdowns?.[0]} />
                <PlayerCard playerIndex={1} playerName="Player 2" score={score2} breakdown={scoreBreakdowns?.[1]} />
                <PlayerCard playerIndex={2} playerName="Player 3" score={score3} breakdown={scoreBreakdowns?.[2]} />
                <PlayerCard playerIndex={3} playerName="Player 4" score={score4} breakdown={scoreBreakdowns?.[3]} />
              </View>
            )}
          </View>

          <Text style={styles.winnerText}>{localStatusText}</Text>

          <GameOverButtons
            isTournamentMode={isTournamentMode ?? false}
            shouldShowCountdown={shouldShowCountdown}
            shouldShowPlayAgain={shouldShowPlayAgain}
            countdown={countdown}
            onPlayAgain={onPlayAgain}
            onBackToMenu={onBackToMenu}
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create<{
  overlay: ViewStyle;
  modal: ViewStyle;
  title: TextStyle;
  scoresSection: ViewStyle;
  scoresTitle: TextStyle;
  playersRow: ViewStyle;
  threePlayersContainer: ViewStyle;
  fourPlayersContainer: ViewStyle;
  winnerText: TextStyle;
  partyTeamsRow: ViewStyle;
  partyTeamsDetailedRow: ViewStyle;
  partyTeamCard: ViewStyle;
  partyTeamCardTeamA: ViewStyle;
  partyTeamCardTeamB: ViewStyle;
  partyTeamLabel: TextStyle;
  partyTeamLabelTeamA: TextStyle;
  partyTeamLabelTeamB: TextStyle;
  partyTeamScore: TextStyle;
}>({
  overlay: {
    flex: 1,
    backgroundColor: GAME_OVER_COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: GAME_OVER_COLORS.background,
    padding: GAME_OVER_LAYOUT.modalPadding,
    borderRadius: GAME_OVER_SIZES.modalRadius,
    width: GAME_OVER_LAYOUT.modalWidth,
    maxWidth: GAME_OVER_LAYOUT.modalMaxWidth,
    maxHeight: GAME_OVER_LAYOUT.modalMaxHeight,
    alignItems: 'center',
  },
  title: {
    fontSize: GAME_OVER_SIZES.titleSize,
    fontWeight: 'bold',
    marginBottom: GAME_OVER_LAYOUT.sectionMarginBottom,
    color: GAME_OVER_COLORS.textPrimary,
  },
  scoresSection: {
    width: '100%',
    marginVertical: GAME_OVER_LAYOUT.sectionMarginVertical,
  },
  scoresTitle: {
    fontSize: GAME_OVER_SIZES.scoresTitleSize,
    fontWeight: '600',
    marginBottom: 10,
    color: GAME_OVER_COLORS.textSecondary,
    textAlign: 'center',
  },
  playersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  threePlayersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  fourPlayersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  winnerText: {
    fontSize: GAME_OVER_SIZES.winnerTextSize,
    fontWeight: 'bold',
    marginVertical: GAME_OVER_LAYOUT.winnerTextMarginVertical,
    textAlign: 'center',
    color: GAME_OVER_COLORS.winnerText,
  },
  partyTeamsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
  },
  partyTeamsDetailedRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
  },
  partyTeamCard: {
    flex: 1,
    backgroundColor: GAME_OVER_COLORS.panelBackground,
    borderRadius: GAME_OVER_SIZES.panelRadius,
    padding: GAME_OVER_LAYOUT.teamPanelPadding,
    marginHorizontal: GAME_OVER_LAYOUT.partyTeamTileMarginHorizontal,
    alignItems: 'center',
    minHeight: GAME_OVER_SIZES.partyTeamTileMinHeight,
    borderWidth: 2,
    minWidth: '42%',
    justifyContent: 'center',
  },
  partyTeamCardTeamA: {
    backgroundColor: GAME_OVER_COLORS.teamABackground,
    borderColor: GAME_OVER_COLORS.teamABorder,
  },
  partyTeamCardTeamB: {
    backgroundColor: GAME_OVER_COLORS.teamBBackground,
    borderColor: GAME_OVER_COLORS.teamBBorder,
  },
  partyTeamLabel: {
    fontSize: GAME_OVER_SIZES.partyTeamNameSize,
    fontWeight: 'bold',
    color: GAME_OVER_COLORS.textPrimary,
    marginBottom: 4,
  },
  partyTeamLabelTeamA: {
    color: GAME_OVER_COLORS.teamAText,
  },
  partyTeamLabelTeamB: {
    color: GAME_OVER_COLORS.teamBText,
  },
  partyTeamScore: {
    fontSize: GAME_OVER_SIZES.partyTeamScoreSize,
    fontWeight: 'bold',
    color: GAME_OVER_COLORS.gold,
  },
});

export default GameOverModal;
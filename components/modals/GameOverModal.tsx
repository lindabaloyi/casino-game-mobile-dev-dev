/**
 * GameOverModal
 * Modal displayed when the game ends.
 * Shows a minimal point breakdown: only positive contributions, no totals.
 * Always displays total cards and total spades below a separator.
 * 
 * Uses centralized styling from shared/config/gameOverStyles.ts
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, ViewStyle, TextStyle } from 'react-native';

import {
  GAME_OVER_COLORS,
  GAME_OVER_SIZES,
  GAME_OVER_LAYOUT,
} from '../../shared/config/gameOverStyles';

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
  players: Array<{
    playerIndex: number;
    totalCards: number;
    spadeCount: number;
    cardPoints: number;
    spadeBonus: number;
    cardCountBonus: number;
    totalScore: number;
  }>;
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
  playerStatuses?: { [playerIndex: string]: string };
  qualifiedPlayers?: number[];
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
  playerStatuses,
  qualifiedPlayers,
  onPlayAgain,
  onBackToMenu,
}: GameOverModalProps) {
  const score1 = scores[0] || 0;
  const score2 = scores[1] || 0;
  const score3 = scores[2] || 0;
  const score4 = scores[3] || 0;

  // Determine winner text
  let winnerText: string;
  if (playerCount === 4 && isPartyMode) {
    const teamAScore = score1 + score2;
    const teamBScore = score3 + score4;
    if (teamAScore > teamBScore) winnerText = 'Team A';
    else if (teamBScore > teamAScore) winnerText = 'Team B';
    else winnerText = 'Tie';
  } else if (playerCount === 4) {
    const maxScore = Math.max(score1, score2, score3, score4);
    const winners = [];
    if (score1 === maxScore) winners.push('Player 1');
    if (score2 === maxScore) winners.push('Player 2');
    if (score3 === maxScore) winners.push('Player 3');
    if (score4 === maxScore) winners.push('Player 4');
    winnerText = winners.length === 1 ? winners[0] : 'Tie';
  } else if (playerCount === 3) {
    const maxScore = Math.max(score1, score2, score3);
    const winners = [
      score1 === maxScore ? 'Player 1' : null,
      score2 === maxScore ? 'Player 2' : null,
      score3 === maxScore ? 'Player 3' : null,
    ].filter(Boolean);
    winnerText = winners.length === 1 ? winners[0]! : 'Tie';
  } else {
    winnerText = score1 > score2 ? 'Player 1' : score2 > score1 ? 'Player 2' : 'Tie';
  }

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

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

  const getWinnerText = () => (winnerText === 'Tie' ? "It's a Tie!" : `${winnerText} Wins!`);

  // New minimal player breakdown: only positive points & bonuses, then separator, then cards/spades
  const renderPlayerBreakdown = (playerIndex: number, playerName: string, score: number) => {
    const bd = scoreBreakdowns?.[playerIndex];
    
    if (!bd) {
      return (
        <View style={styles.playerPanel}>
          <View style={styles.playerHeader}>
            <Text style={styles.playerName}>{playerName}</Text>
            <Text style={styles.playerScore}>{score}</Text>
          </View>
        </View>
      );
    }

    // Determine if any point line should be shown
    const hasPoints =
      bd.tenDiamondPoints > 0 ||
      bd.twoSpadePoints > 0 ||
      bd.acePoints > 0 ||
      bd.spadeBonus > 0 ||
      bd.cardCountBonus > 0;

    return (
      <View style={styles.playerPanel}>
        <View style={styles.playerHeader}>
          <Text style={styles.playerName}>{playerName}</Text>
          <Text style={styles.playerScore}>{score}</Text>
        </View>

        {hasPoints && (
          <View style={styles.pointsContainer}>
            {bd.tenDiamondPoints > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>10♦</Text>
                <Text style={styles.breakdownValue}>{bd.tenDiamondPoints} pts</Text>
              </View>
            )}
            {bd.twoSpadePoints > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>2♠</Text>
                <Text style={styles.breakdownValue}>{bd.twoSpadePoints} pts</Text>
              </View>
            )}
            {bd.acePoints > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Aces</Text>
                <Text style={styles.breakdownValue}>{bd.acePoints} pts</Text>
              </View>
            )}
            {bd.spadeBonus > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Spades ({bd.spadeCount})</Text>
                <Text style={[styles.breakdownValue, styles.activeBonus]}>+{bd.spadeBonus}</Text>
              </View>
            )}
            {bd.cardCountBonus > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Cards ({bd.totalCards})</Text>
                <Text style={[styles.breakdownValue, styles.activeBonus]}>+{bd.cardCountBonus}</Text>
              </View>
            )}
          </View>
        )}

        {/* Separator only if there are points to show above */}
        {hasPoints && <View style={styles.separator} />}

        {/* Always show cards and spades */}
        <View style={styles.statsContainer}>
          <View style={styles.breakdownRow}>
            <Text style={styles.statsLabel}>Cards</Text>
            <Text style={styles.statsValue}>{bd.totalCards}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.statsLabel}>Spades</Text>
            <Text style={styles.statsValue}>{bd.spadeCount}</Text>
          </View>
        </View>
      </View>
    );
  };

  // Similar style for team breakdown
  const renderTeamBreakdown = (teamName: string, team: TeamBreakdown | null, teamScore: number) => {
    // If no team data, return null so caller can use simple card instead
    if (!team) {
      return null;
    }

    const hasPoints =
      team.tenDiamondPoints > 0 ||
      team.twoSpadePoints > 0 ||
      team.acePoints > 0 ||
      team.spadeBonus > 0 ||
      team.cardCountBonus > 0;

    return (
      <View style={styles.teamPanel}>
        <View style={styles.teamHeader}>
          <Text style={styles.teamName}>{teamName}</Text>
          <Text style={styles.teamScore}>{teamScore}</Text>
        </View>

        {hasPoints && (
          <View style={styles.pointsContainer}>
            {team.tenDiamondPoints > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>10♦</Text>
                <Text style={styles.breakdownValue}>{team.tenDiamondPoints} pts</Text>
              </View>
            )}
            {team.twoSpadePoints > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>2♠</Text>
                <Text style={styles.breakdownValue}>{team.twoSpadePoints} pts</Text>
              </View>
            )}
            {team.acePoints > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Aces</Text>
                <Text style={styles.breakdownValue}>{team.acePoints} pts</Text>
              </View>
            )}
            {team.spadeBonus > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Spades ({team.spadeCount})</Text>
                <Text style={[styles.breakdownValue, styles.activeBonus]}>+{team.spadeBonus}</Text>
              </View>
            )}
            {team.cardCountBonus > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Cards ({team.totalCards})</Text>
                <Text style={[styles.breakdownValue, styles.activeBonus]}>+{team.cardCountBonus}</Text>
              </View>
            )}
          </View>
        )}

        {hasPoints && <View style={styles.separator} />}

        <View style={styles.statsContainer}>
          <View style={styles.breakdownRow}>
            <Text style={styles.statsLabel}>Cards</Text>
            <Text style={styles.statsValue}>{team.totalCards}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.statsLabel}>Spades</Text>
            <Text style={styles.statsValue}>{team.spadeCount}</Text>
          </View>
        </View>

        {/* Player contributions (only for team mode) */}
        {team.players.length > 0 && (
          <View style={styles.playersSection}>
            <Text style={styles.breakdownTitle}>Contributions</Text>
            {team.players.map((player, idx) => (
              <View key={idx} style={styles.playerContribution}>
                <Text style={styles.playerLabel}>P{player.playerIndex + 1}</Text>
                <Text style={styles.playerPoints}>{player.cardPoints} pts</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Tournament player: status badges + same minimal layout
  const renderTournamentPlayer = (playerIndex: number, playerName: string, score: number) => {
    const bd = scoreBreakdowns?.[playerIndex];
    const status = playerStatuses?.[playerIndex];
    const isQualified = qualifiedPlayers?.includes(playerIndex) || status === 'WINNER';
    const isKnockedOut = status === 'ELIMINATED';

    if (!bd) {
      return (
        <View style={styles.playerPanel}>
          <View style={styles.playerHeader}>
            <Text style={styles.playerName}>{playerName}</Text>
            <Text style={styles.playerScore}>{score}</Text>
          </View>
        </View>
      );
    }

    const hasPoints =
      bd.tenDiamondPoints > 0 ||
      bd.twoSpadePoints > 0 ||
      bd.acePoints > 0 ||
      bd.spadeBonus > 0 ||
      bd.cardCountBonus > 0;

    return (
      <View style={styles.playerPanel}>
        <View style={styles.playerHeader}>
          <Text style={styles.playerName}>{playerName}</Text>
          <Text style={styles.playerScore}>{score}</Text>
        </View>

        {/* Status badges */}
        {isQualified && (
          <View style={styles.qualifiedBadge}>
            <Text style={styles.qualifiedBadgeText}>✓ Qualified</Text>
          </View>
        )}
        {isKnockedOut && (
          <View style={styles.knockedOutBadge}>
            <Text style={styles.knockedOutBadgeText}>✗ Knocked Out</Text>
          </View>
        )}

        {hasPoints && (
          <View style={styles.pointsContainer}>
            {bd.tenDiamondPoints > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>10♦</Text>
                <Text style={styles.breakdownValue}>{bd.tenDiamondPoints} pts</Text>
              </View>
            )}
            {bd.twoSpadePoints > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>2♠</Text>
                <Text style={styles.breakdownValue}>{bd.twoSpadePoints} pts</Text>
              </View>
            )}
            {bd.acePoints > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Aces</Text>
                <Text style={styles.breakdownValue}>{bd.acePoints} pts</Text>
              </View>
            )}
            {bd.spadeBonus > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Spades ({bd.spadeCount})</Text>
                <Text style={[styles.breakdownValue, styles.activeBonus]}>+{bd.spadeBonus}</Text>
              </View>
            )}
            {bd.cardCountBonus > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Cards ({bd.totalCards})</Text>
                <Text style={[styles.breakdownValue, styles.activeBonus]}>+{bd.cardCountBonus}</Text>
              </View>
            )}
          </View>
        )}

        {hasPoints && <View style={styles.separator} />}

        <View style={styles.statsContainer}>
          <View style={styles.breakdownRow}>
            <Text style={styles.statsLabel}>Cards</Text>
            <Text style={styles.statsValue}>{bd.totalCards}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.statsLabel}>Spades</Text>
            <Text style={styles.statsValue}>{bd.spadeCount}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.modal, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.title}>Game Over</Text>

          <View style={styles.scoresSection}>
            <Text style={styles.scoresTitle}>Final Scores</Text>

            {playerCount === 2 && (
              <View style={styles.playersRow}>
                {renderPlayerBreakdown(0, 'Player 1', score1)}
                {renderPlayerBreakdown(1, 'Player 2', score2)}
              </View>
            )}

            {playerCount === 3 && (
              <View style={styles.threePlayersContainer}>
                {renderPlayerBreakdown(0, 'Player 1', score1)}
                {renderPlayerBreakdown(1, 'Player 2', score2)}
                {renderPlayerBreakdown(2, 'Player 3', score3)}
              </View>
            )}

            {playerCount === 4 && isPartyMode && (
              <View style={styles.partyTeamsRow}>
                {teamScoreBreakdowns ? (
                  <>
                    {renderTeamBreakdown('Team A', teamScoreBreakdowns.teamA, score1 + score2)}
                    {renderTeamBreakdown('Team B', teamScoreBreakdowns.teamB, score3 + score4)}
                  </>
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

            {/* All 4-player modes use the same breakdown layout */}
            {playerCount === 4 && !isPartyMode && (
              <View style={styles.fourPlayersContainer}>
                {renderPlayerBreakdown(0, 'Player 1', score1)}
                {renderPlayerBreakdown(1, 'Player 2', score2)}
                {renderPlayerBreakdown(2, 'Player 3', score3)}
                {renderPlayerBreakdown(3, 'Player 4', score4)}
              </View>
            )}
          </View>

          <Text style={styles.winnerText}>{getWinnerText()}</Text>

          <View style={styles.buttons}>
            {onPlayAgain && (
              <View style={styles.button}>
                <Text style={styles.buttonText} onPress={onPlayAgain}>
                  Play Again
                </Text>
              </View>
            )}
            {onBackToMenu && (
              <Text style={styles.backButtonText} onPress={onBackToMenu}>
                Back to Menu
              </Text>
            )}
          </View>
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
  playerPanel: ViewStyle;
  playerHeader: ViewStyle;
  playerName: TextStyle;
  playerScore: TextStyle;
  pointsContainer: ViewStyle;
  breakdownRow: ViewStyle;
  breakdownLabel: TextStyle;
  breakdownValue: TextStyle;
  activeBonus: TextStyle;
  separator: ViewStyle;
  statsContainer: ViewStyle;
  statsLabel: TextStyle;
  statsValue: TextStyle;
  teamsContainer: ViewStyle;
  teamPanel: ViewStyle;
  teamHeader: ViewStyle;
  teamName: TextStyle;
  teamScore: TextStyle;
  breakdownTitle: TextStyle;
  playersSection: ViewStyle;
  playerContribution: ViewStyle;
  playerLabel: TextStyle;
  playerPoints: TextStyle;
  teamRow: ViewStyle;
  teamLabel: TextStyle;
  // Party mode team row styles
  partyTeamsRow: ViewStyle;
  partyTeamCard: ViewStyle;
  partyTeamCardTeamA: ViewStyle;
  partyTeamCardTeamB: ViewStyle;
  partyTeamLabel: TextStyle;
  partyTeamLabelTeamA: TextStyle;
  partyTeamLabelTeamB: TextStyle;
  partyTeamScore: TextStyle;
  winnerText: TextStyle;
  buttons: ViewStyle;
  button: ViewStyle;
  buttonText: TextStyle;
  backButtonText: TextStyle;
  qualifiedBadge: ViewStyle;
  qualifiedBadgeText: TextStyle;
  knockedOutBadge: ViewStyle;
  knockedOutBadgeText: TextStyle;
}>({
  // ========================================
  // UNIFIED STYLES - Using centralized config
  // ========================================
  
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
  playerPanel: {
    flex: 1,
    backgroundColor: GAME_OVER_COLORS.panelBackground,
    borderRadius: GAME_OVER_SIZES.panelRadius,
    padding: GAME_OVER_LAYOUT.panelPadding,
    marginHorizontal: GAME_OVER_LAYOUT.panelMarginHorizontal,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: GAME_OVER_LAYOUT.playerHeaderMarginBottom,
    paddingBottom: GAME_OVER_LAYOUT.playerHeaderPaddingBottom,
    borderBottomWidth: GAME_OVER_LAYOUT.playerHeaderBorderWidth,
    borderBottomColor: GAME_OVER_COLORS.borderLight,
  },
  playerName: {
    fontSize: GAME_OVER_SIZES.playerNameSize,
    fontWeight: '600',
    color: GAME_OVER_COLORS.textPrimary,
  },
  playerScore: {
    fontSize: GAME_OVER_SIZES.playerScoreSize,
    fontWeight: 'bold',
    color: GAME_OVER_COLORS.gold,
  },
  pointsContainer: {
    marginBottom: GAME_OVER_LAYOUT.pointsContainerMarginBottom,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: GAME_OVER_LAYOUT.breakdownRowPaddingVertical,
  },
  breakdownLabel: {
    fontSize: GAME_OVER_SIZES.labelSize,
    color: GAME_OVER_COLORS.textTertiary,
  },
  breakdownValue: {
    fontSize: GAME_OVER_SIZES.breakdownValueSize,
    fontWeight: '500',
    color: GAME_OVER_COLORS.textPrimary,
  },
  activeBonus: {
    color: GAME_OVER_COLORS.activeBonus,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: GAME_OVER_COLORS.separator,
    marginVertical: GAME_OVER_LAYOUT.separatorMarginVertical,
  },
  statsContainer: {
    marginTop: GAME_OVER_LAYOUT.statsContainerMarginTop,
  },
  statsLabel: {
    fontSize: GAME_OVER_SIZES.statsLabelSize,
    fontWeight: '600',
    color: GAME_OVER_COLORS.textPrimary,
  },
  statsValue: {
    fontSize: GAME_OVER_SIZES.statsValueSize,
    fontWeight: '500',
    color: GAME_OVER_COLORS.textPrimary,
  },
  // Team styles
  teamsContainer: {
    width: '100%',
  },
  teamPanel: {
    backgroundColor: GAME_OVER_COLORS.panelBackground,
    borderRadius: GAME_OVER_SIZES.panelRadius,
    padding: GAME_OVER_LAYOUT.teamPanelPadding,
    marginBottom: GAME_OVER_LAYOUT.teamPanelMarginBottom,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: GAME_OVER_LAYOUT.teamHeaderMarginBottom,
    paddingBottom: GAME_OVER_LAYOUT.teamHeaderPaddingBottom,
    borderBottomWidth: GAME_OVER_LAYOUT.teamHeaderBorderWidth,
    borderBottomColor: GAME_OVER_COLORS.borderLight,
  },
  teamName: {
    fontSize: GAME_OVER_SIZES.teamNameSize,
    fontWeight: 'bold',
    color: GAME_OVER_COLORS.textPrimary,
  },
  teamScore: {
    fontSize: GAME_OVER_SIZES.teamScoreSize,
    fontWeight: 'bold',
    color: GAME_OVER_COLORS.gold,
  },
  breakdownTitle: {
    fontSize: GAME_OVER_SIZES.breakdownTitleSize,
    fontWeight: '600',
    color: GAME_OVER_COLORS.textSecondary,
    marginBottom: 4,
  },
  playersSection: {
    paddingTop: GAME_OVER_LAYOUT.playersSectionPaddingTop,
    marginTop: GAME_OVER_LAYOUT.playersSectionMarginTop,
    borderTopWidth: GAME_OVER_LAYOUT.playersSectionBorderTopWidth,
    borderTopColor: GAME_OVER_COLORS.separator,
  },
  playerContribution: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  playerLabel: {
    fontSize: GAME_OVER_SIZES.contributionLabelSize,
    color: GAME_OVER_COLORS.textSecondary,
  },
  playerPoints: {
    fontSize: GAME_OVER_SIZES.contributionValueSize,
    fontWeight: '500',
    color: GAME_OVER_COLORS.textPrimary,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: GAME_OVER_LAYOUT.teamRowPaddingHorizontal,
    marginVertical: GAME_OVER_LAYOUT.teamRowMarginVertical,
  },
  teamLabel: {
    fontSize: GAME_OVER_SIZES.teamNameSize,
    fontWeight: '600',
    color: GAME_OVER_COLORS.textPrimary,
  },
  // Party mode team row - horizontal layout like 2/3/4 player modes
  partyTeamsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
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
  winnerText: {
    fontSize: GAME_OVER_SIZES.winnerTextSize,
    fontWeight: 'bold',
    marginVertical: GAME_OVER_LAYOUT.winnerTextMarginVertical,
    textAlign: 'center',
    color: GAME_OVER_COLORS.winnerText,
  },
  buttons: {
    width: '100%',
    gap: 8,
    marginTop: GAME_OVER_LAYOUT.buttonMarginTop,
  },
  button: {
    paddingVertical: GAME_OVER_LAYOUT.buttonPaddingVertical,
    paddingHorizontal: GAME_OVER_LAYOUT.buttonPaddingHorizontal,
    borderRadius: GAME_OVER_SIZES.panelRadius,
    alignItems: 'center',
    width: '100%',
    backgroundColor: GAME_OVER_COLORS.buttonBackground,
  },
  buttonText: {
    color: GAME_OVER_COLORS.buttonText,
    fontSize: GAME_OVER_SIZES.buttonTextSize,
    fontWeight: 'bold',
  },
  backButtonText: {
    color: GAME_OVER_COLORS.backButtonText,
    fontSize: GAME_OVER_SIZES.backButtonSize,
    textAlign: 'center',
    marginTop: GAME_OVER_LAYOUT.backButtonMarginTop,
  },
  // Tournament-specific styles
  qualifiedBadge: {
    backgroundColor: GAME_OVER_COLORS.qualifiedBadge,
    paddingHorizontal: GAME_OVER_LAYOUT.badgePaddingHorizontal,
    paddingVertical: GAME_OVER_LAYOUT.badgePaddingVertical,
    borderRadius: 4,
    alignSelf: GAME_OVER_LAYOUT.badgeAlignSelf,
    marginBottom: GAME_OVER_LAYOUT.badgeMarginBottom,
  },
  qualifiedBadgeText: {
    color: GAME_OVER_COLORS.textPrimary,
    fontSize: GAME_OVER_SIZES.badgeFontSize,
    fontWeight: '700',
  },
  knockedOutBadge: {
    backgroundColor: GAME_OVER_COLORS.knockedOutBadge,
    paddingHorizontal: GAME_OVER_LAYOUT.badgePaddingHorizontal,
    paddingVertical: GAME_OVER_LAYOUT.badgePaddingVertical,
    borderRadius: 4,
    alignSelf: GAME_OVER_LAYOUT.badgeAlignSelf,
    marginBottom: GAME_OVER_LAYOUT.badgeMarginBottom,
  },
  knockedOutBadgeText: {
    color: GAME_OVER_COLORS.textPrimary,
    fontSize: GAME_OVER_SIZES.badgeFontSize,
    fontWeight: '700',
  },
});

export default GameOverModal;

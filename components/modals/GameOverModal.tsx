/**
 * GameOverModal
 * Modal displayed when the game ends.
 * Shows a minimal point breakdown: only positive contributions, no totals.
 * Always displays total cards and total spades below a separator.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated } from 'react-native';

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
  const renderTeamBreakdown = (teamName: string, team: TeamBreakdown, teamScore: number) => {
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
              <View style={styles.teamsContainer}>
                {teamScoreBreakdowns ? (
                  <>
                    {renderTeamBreakdown('Team A', teamScoreBreakdowns.teamA, score1 + score2)}
                    {renderTeamBreakdown('Team B', teamScoreBreakdowns.teamB, score3 + score4)}
                  </>
                ) : (
                  <>
                    <View style={styles.teamRow}>
                      <Text style={styles.teamLabel}>Team A</Text>
                      <Text style={styles.teamScore}>{score1 + score2}</Text>
                    </View>
                    <View style={styles.teamRow}>
                      <Text style={styles.teamLabel}>Team B</Text>
                      <Text style={styles.teamScore}>{score3 + score4}</Text>
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1B5E20',
    padding: 20,
    borderRadius: 12,
    width: '92%',
    maxWidth: 560,
    maxHeight: '90%',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#FFFFFF',
  },
  scoresSection: {
    width: '100%',
    marginVertical: 10,
  },
  scoresTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    color: 'rgba(255, 255, 255, 0.7)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 3,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  playerScore: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  pointsContainer: {
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  breakdownLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  breakdownValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  activeBonus: {
    color: '#FFD700',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 6,
  },
  statsContainer: {
    marginTop: 4,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  // Team styles
  teamsContainer: {
    width: '100%',
  },
  teamPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  teamScore: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  breakdownTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  playersSection: {
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  playerContribution: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  playerLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  playerPoints: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginVertical: 4,
  },
  teamLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  winnerText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 14,
    textAlign: 'center',
    color: '#FFD700',
  },
  buttons: {
    width: '100%',
    gap: 8,
    marginTop: 6,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FFD700',
  },
  buttonText: {
    color: '#1B5E20',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 2,
  },
  // Tournament-specific styles
  qualifiedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 8,
  },
  qualifiedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  knockedOutBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 8,
  },
  knockedOutBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default GameOverModal;

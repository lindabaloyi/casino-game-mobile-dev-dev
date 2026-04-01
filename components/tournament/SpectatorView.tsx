/**
 * SpectatorView
 * Displayed when player has been eliminated from tournament.
 * Shows tournament progress and allows viewing game as spectator.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useThemeColor } from '../../hooks/use-theme-color';

interface SpectatorViewProps {
  tournamentPhase: string | null;
  tournamentRound: number;
  finalShowdownHandsPlayed: number;
  eliminationOrder: number[];
  playerStatuses: { [playerIndex: string]: string };
  tournamentScores: { [playerIndex: string]: number };
  playerCount: number;
}

export function SpectatorView({
  tournamentPhase,
  tournamentRound,
  finalShowdownHandsPlayed,
  eliminationOrder,
  playerStatuses,
  tournamentScores,
  playerCount,
}: SpectatorViewProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  
  const getPhaseLabel = () => {
    switch (tournamentPhase) {
      case 'QUALIFYING':
        return 'Qualifying Round';
      case 'SEMI_FINAL':
        return 'Semi-Final';
      case 'FINAL_SHOWDOWN':
        return `Final Showdown (${finalShowdownHandsPlayed}/2)`;
      case 'COMPLETED':
        return 'Tournament Complete!';
      default:
        return 'Tournament';
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Still Playing';
      case 'ELIMINATED':
        return 'Eliminated';
      case 'SPECTATOR':
        return 'Spectating';
      case 'WINNER':
        return '🏆 Winner!';
      default:
        return status;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '#22c55e';
      case 'ELIMINATED':
        return '#ef4444';
      case 'SPECTATOR':
        return '#f59e0b';
      case 'WINNER':
        return '#fbbf24';
      default:
        return '#6b7280';
    }
  };
  
  // Get active players - filter by ACTIVE/WINNER status (not by index >= playerCount)
  // After tournament transitions, playerStatuses still uses ORIGINAL indices
  // Example: {"0":"ACTIVE","1":"ACTIVE","2":"ELIMINATED","3":"ACTIVE"} with playerCount=3
  // Should show players 0,1,3 as active -> display as P1, P2, P4
  const activePlayers = Object.entries(playerStatuses)
    .filter(([_, status]) => status === 'ACTIVE' || status === 'WINNER')
    .map(([index]) => parseInt(index))
    .sort((a, b) => a - b)  // Sort by original index
    .map((origIndex, displayIdx) => displayIdx + 1);  // Display as 1,2,3,... (not origIndex+1)
  
  // DEBUG: Log playerStatuses and tournamentScores to diagnose winner display issue
  console.log('[SpectatorView] playerStatuses:', JSON.stringify(playerStatuses));
  console.log('[SpectatorView] tournamentScores:', JSON.stringify(tournamentScores));
  console.log('[SpectatorView] activePlayers calculated:', activePlayers);
  console.log('[SpectatorView] playerCount:', playerCount);
  console.log('[SpectatorView] tournamentPhase:', tournamentPhase);
  
  // Build a mapping from original index to display index for the standings
  // This is needed because playerStatuses uses ORIGINAL indices but playerCount is the NEW count
  const originalIndices = Object.keys(playerStatuses)
    .map(k => parseInt(k))
    .filter(idx => idx < playerCount || playerStatuses[idx] === 'ELIMINATED')  // Include all stored indices
    .sort((a, b) => a - b);
  
  // Map original index to display position (1-based)
  const getDisplayIndex = (origIndex: number): number => {
    const position = originalIndices.indexOf(origIndex);
    return position >= 0 ? position + 1 : origIndex + 1;
  };
  
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <Text style={[styles.eliminatedText, { color: '#ef4444' }]}>
          You've Been Eliminated!
        </Text>
        <Text style={[styles.spectatingText, { color: textColor }]}>
          You're now spectating the tournament
        </Text>
      </View>
      
      <View style={styles.phaseContainer}>
        <Text style={[styles.phaseLabel, { color: tintColor }]}>
          {getPhaseLabel()}
        </Text>
        {tournamentPhase !== 'FINAL_SHOWDOWN' && tournamentPhase !== 'COMPLETED' && (
          <Text style={[styles.roundText, { color: textColor }]}>
            Round {tournamentRound}
          </Text>
        )}
      </View>
      
      {activePlayers.length > 0 && (
        <View style={styles.activeSection}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Still in the tournament:
          </Text>
          <View style={styles.activePlayersRow}>
            {activePlayers.map((playerNum) => (
              <View 
                key={playerNum} 
                style={[styles.activePlayerBadge, { backgroundColor: '#22c55e' }]}
              >
                <Text style={styles.activePlayerText}>P{playerNum}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      <View style={styles.standingsSection}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          Standings
        </Text>
        <ScrollView style={styles.standingsList}>
          {originalIndices.map((origIndex) => {
            const status = playerStatuses[origIndex] || 'ACTIVE';
            return (
              <View key={origIndex} style={styles.standingRow}>
                <View 
                  style={[
                    styles.statusDot, 
                    { backgroundColor: getStatusColor(status) }
                  ]} 
                />
                <Text style={[styles.playerName, { color: textColor }]}>
                  Player {getDisplayIndex(origIndex)}
                </Text>
                <Text style={[styles.playerScore, { color: tintColor }]}>
                  {tournamentScores[origIndex] || 0} pts
                </Text>
                <Text style={[
                  styles.playerStatus,
                  { color: getStatusColor(status) }
                ]}>
                  {getStatusLabel(status)}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
      
      {eliminationOrder.length > 0 && (
        <View style={styles.eliminationSection}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Elimination Order
          </Text>
          <View style={styles.eliminationRow}>
            {eliminationOrder.map((playerIndex, position) => (
              <View key={position} style={styles.eliminationItem}>
                <Text style={[styles.eliminationPosition, { color: '#ef4444' }]}>
                  #{position + 1}
                </Text>
                <Text style={[styles.eliminationPlayer, { color: textColor }]}>
                  P{playerIndex + 1}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: textColor }]}>
          You can watch the rest of the tournament unfold!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  eliminatedText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  spectatingText: {
    fontSize: 16,
  },
  phaseContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  phaseLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  roundText: {
    fontSize: 14,
    marginTop: 4,
  },
  activeSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  activePlayersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  activePlayerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activePlayerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  standingsSection: {
    width: '100%',
    marginBottom: 20,
  },
  standingsList: {
    maxHeight: 150,
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    marginBottom: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  playerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  playerScore: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  playerStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  eliminationSection: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  eliminationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  eliminationItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 8,
    borderRadius: 8,
    minWidth: 60,
  },
  eliminationPosition: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  eliminationPlayer: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default SpectatorView;

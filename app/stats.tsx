/**
 * Stats Screen
 * Player statistics dashboard with game-related metrics
 * Uses in-game color scheme matching leaderboards/friends
 */

import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerProfile } from '../hooks/usePlayerProfile';

// In-game color scheme - matching leaderboards/friends
const COLORS = {
  background: '#0f4d0f',
  headerBg: '#1a5c1a',
  primary: '#FFD700',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  cardBg: 'rgba(0, 0, 0, 0.4)',
  border: 'rgba(255, 215, 0, 0.3)',
  accent: '#9C27B0',
};

// Mock game stats (would be tracked in extended profile)
const MOCK_STATS = {
  captures: 847,
  buildsMade: 156,
  points: 2847,
  pointsPerGame: 12.4,
  currentStreak: 3,
  bestStreak: 12,
};

// Section definitions
const SECTIONS = [
  {
    id: 'overview',
    title: 'Overview',
    stats: [
      { id: 'games', label: 'Games Played', icon: '🎮', getValue: (p: any) => p?.totalGames || 0 },
      { id: 'wins', label: 'Wins', icon: '🏆', getValue: (p: any) => p?.wins || 0 },
      { id: 'winRate', label: 'Win Rate', icon: '📊', getValue: (p: any) => {
        const rate = p?.totalGames > 0 ? ((p?.wins || 0) / p.totalGames * 100).toFixed(1) : '0.0';
        return `${rate}%`;
      }},
    ],
  },
  {
    id: 'gameplay',
    title: 'Gameplay',
    stats: [
      { id: 'captures', label: 'Captures', icon: '🎯', getValue: () => MOCK_STATS.captures },
      { id: 'builds', label: 'Builds Made', icon: '🧱', getValue: () => MOCK_STATS.buildsMade },
      { id: 'points', label: 'Points', icon: '⭐', getValue: () => MOCK_STATS.points },
      { id: 'ppg', label: 'Points/Game', icon: '📈', getValue: () => MOCK_STATS.pointsPerGame },
    ],
  },
  {
    id: 'streaks',
    title: 'Streaks',
    stats: [
      { id: 'current', label: 'Current Streak', icon: '🔥', getValue: () => MOCK_STATS.currentStreak, highlight: true },
      { id: 'best', label: 'Best Streak', icon: '💎', getValue: () => MOCK_STATS.bestStreak, highlight: true },
    ],
  },
];

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  highlight?: boolean;
}

function StatCard({ label, value, icon, highlight }: StatCardProps) {
  return (
    <View style={[styles.statCard, highlight && styles.statCardHighlight]}>
      <View style={[styles.statIcon, highlight && styles.statIconHighlight]}>
        <Text style={styles.statIconText}>{icon}</Text>
      </View>
      <View style={styles.statInfo}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
      </View>
    </View>
  );
}

export const options = {
  headerShown: false,
};

export default function StatsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { profile, isLoading } = usePlayerProfile();

  // Calculate win rate
  const winRate = profile.totalGames > 0 
    ? ((profile.wins / profile.totalGames) * 100).toFixed(1)
    : '0.0';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.brandName}>STATS</Text>
          <Text style={styles.brandSub}>Your Performance</Text>
        </View>
        
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Overview Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxIcon}>🎮</Text>
              <Text style={styles.statBoxValue}>{profile.totalGames}</Text>
              <Text style={styles.statBoxLabel}>Games</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxIcon}>🏆</Text>
              <Text style={styles.statBoxValue}>{profile.wins}</Text>
              <Text style={styles.statBoxLabel}>Wins</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxIcon}>📊</Text>
              <Text style={styles.statBoxValueGold}>{winRate}%</Text>
              <Text style={styles.statBoxLabel}>Win Rate</Text>
            </View>
          </View>
        </View>

        {/* Gameplay Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gameplay</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Captures" value={MOCK_STATS.captures.toString()} icon="🎯" />
            <StatCard label="Builds Made" value={MOCK_STATS.buildsMade.toString()} icon="🧱" />
            <StatCard label="Points" value={MOCK_STATS.points.toLocaleString()} icon="⭐" />
            <StatCard label="Points/Game" value={MOCK_STATS.pointsPerGame.toString()} icon="📈" />
          </View>
        </View>

        {/* Streaks Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streaks</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, styles.statBoxHighlight]}>
              <Text style={styles.statBoxIcon}>🔥</Text>
              <Text style={styles.statBoxValueGold}>{MOCK_STATS.currentStreak}</Text>
              <Text style={styles.statBoxLabel}>Current</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxHighlight]}>
              <Text style={styles.statBoxIcon}>💎</Text>
              <Text style={styles.statBoxValueGold}>{MOCK_STATS.bestStreak}</Text>
              <Text style={styles.statBoxLabel}>Best</Text>
            </View>
          </View>
        </View>

        {/* Win/Loss Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Win/Loss Breakdown</Text>
          <View style={styles.breakdownCard}>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownValue}>{profile.wins}</Text>
                <Text style={styles.breakdownLabel}>Wins</Text>
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownValue}>{profile.losses}</Text>
                <Text style={styles.breakdownLabel}>Losses</Text>
              </View>
            </View>
            {/* Progress bar */}
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${profile.totalGames > 0 ? (profile.wins / profile.totalGames * 100) : 0}%` }
                ]} 
              />
            </View>
            <Text style={styles.breakdownNote}>Win/Loss ratio</Text>
          </View>
        </View>

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.primary}15`,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 8,
    borderRadius: 8,
  },
  titleContainer: {
    alignItems: 'center',
  },
  brandName: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  brandSub: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.08)',
  },
  statBoxHighlight: {
    backgroundColor: `${COLORS.primary}12`,
    borderColor: `${COLORS.primary}30`,
  },
  statBoxIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statBoxValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  statBoxValueGold: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '700',
  },
  statBoxLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  statsGrid: {
    gap: 8,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.08)',
  },
  statCardHighlight: {
    backgroundColor: `${COLORS.primary}12`,
    borderColor: `${COLORS.primary}30`,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(27, 94, 32, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statIconHighlight: {
    backgroundColor: `${COLORS.primary}20`,
  },
  statIconText: {
    fontSize: 16,
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  statValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  statValueHighlight: {
    color: COLORS.primary,
  },
  breakdownCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.08)',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  breakdownValue: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
  },
  breakdownLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  breakdownNote: {
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
  },
  bottomPadding: {
    height: 40,
  },
});

/**
 * Stats Screen
 * Player statistics dashboard with game-related metrics
 * Uses in-game color scheme matching leaderboards/friends
 */

import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerProfile } from '../hooks/usePlayerProfile';
import { usePlayerStats, ModeStats } from '../hooks/usePlayerStats';

import { GAME_MODES } from '../shared/config/gameModes';

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

// Mode definitions for the toggle - dynamically generated from centralized config
const MODES = [
  { id: 'all', label: 'All' },
  ...GAME_MODES.filter(mode => mode.key !== 'tournament').map(mode => ({
    id: mode.key,
    label: mode.title
  }))
] as const;

type ModeId = typeof MODES[number]['id'];

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  suffix?: string;
  highlight?: boolean;
}

function StatCard({ label, value, icon, suffix, highlight }: StatCardProps) {
  return (
    <View style={[styles.statCard, highlight && styles.statCardHighlight]}>
      <View style={[styles.statIcon, highlight && styles.statIconHighlight]}>
        <Text style={styles.statIconText}>{icon}</Text>
      </View>
      <View style={styles.statInfo}>
        <Text style={styles.statLabel}>{label}</Text>
        <View style={styles.statValueRow}>
          <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
          {suffix && <Text style={styles.statSuffix}>{suffix}</Text>}
        </View>
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
  const { profile, isLoading: profileLoading } = usePlayerProfile();
  const { stats, isLoading: statsLoading, error, refresh } = usePlayerStats();
  const [selectedMode, setSelectedMode] = useState<ModeId>('all');

  const isLoading = profileLoading || statsLoading;

  // Get mode-specific stats
  const modeStats: ModeStats | null = useMemo(() => {
    if (!stats) return null;
    if (selectedMode === 'all') {
      return {
        games: stats.totalGames || 0,
        wins: stats.wins || 0,
        losses: stats.losses || 0,
      };
    }
    return stats.modeStats?.[selectedMode] || { games: 0, wins: 0, losses: 0 };
  }, [stats, selectedMode]);

  // Calculate win rate for selected mode
  const winRate = modeStats && modeStats.games > 0 
    ? ((modeStats.wins / modeStats.games) * 100).toFixed(1)
    : '0.0';

  // Calculate averages per game (using total games for card stats since they're not mode-specific)
  const games = stats?.totalGames || 1;
  const avgAces = stats ? (stats.acesKept / games).toFixed(1) : '0.0';
  const avgSpades = stats ? (stats.spadesCountKept / games).toFixed(1) : '0.0';
  const avgTwoSpades = stats ? (stats.twoSpadesKept / games).toFixed(1) : '0.0';
  const avgTenDiamonds = stats ? ((stats.tenDiamondsKept * 2) / games).toFixed(1) : '0.0';
  const avgSpadesBonus = stats ? (stats.spadesBonusCount / games).toFixed(1) : '0.0';
  const avgCards20 = stats ? (stats.cardCountBonus20 / games).toFixed(1) : '0.0';
  const avgCards21 = stats ? (stats.cardCountBonus21 / games).toFixed(1) : '0.0';

  // Format number with commas
  const formatNumber = (num: number) => num.toLocaleString();

  // Show error if present
  if (error) {
    return (
      <View style={styles.container}>
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
        </View>
        <View style={[styles.scrollContent, { paddingTop: 50 }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.primary, textAlign: 'center' }]}>
            Failed to load stats
          </Text>
          <Text style={[styles.statLabel, { textAlign: 'center', marginTop: 10 }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.modeToggle, { alignSelf: 'center', marginTop: 20 }]}
            onPress={refresh}
          >
            <Text style={styles.modeToggleTextActive}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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

      {/* Mode Toggle */}
      <View style={styles.modeToggleContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modeToggleContent}
        >
          {MODES.map((mode) => (
            <TouchableOpacity
              key={mode.id}
              style={[
                styles.modeToggle,
                selectedMode === mode.id && styles.modeToggleActive
              ]}
              onPress={() => setSelectedMode(mode.id)}
            >
              <Text style={[
                styles.modeToggleText,
                selectedMode === mode.id && styles.modeToggleTextActive
              ]}>
                {mode.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
              <Text style={styles.statBoxValue}>{modeStats?.games || 0}</Text>
              <Text style={styles.statBoxLabel}>Games</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxIcon}>🏆</Text>
              <Text style={styles.statBoxValue}>{modeStats?.wins || 0}</Text>
              <Text style={styles.statBoxLabel}>Wins</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxIcon}>📊</Text>
              <Text style={styles.statBoxValueGold}>{winRate}%</Text>
              <Text style={styles.statBoxLabel}>Win Rate</Text>
            </View>
          </View>
        </View>

        {/* Point Retention Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Point Retention</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxIcon}>📊</Text>
              <Text style={styles.statBoxValue}>{stats ? formatNumber(stats.totalPointsKept) : '0'}</Text>
              <Text style={styles.statBoxLabel}>Total Points</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxIcon}>📈</Text>
              <Text style={styles.statBoxValueGold}>{stats ? stats.pointRetentionPerGame.toFixed(1) : '0.0'}</Text>
              <Text style={styles.statBoxLabel}>Avg/Game</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxHighlight]}>
              <Text style={styles.statBoxIcon}>🏆</Text>
              <Text style={styles.statBoxValueGold}>{stats ? stats.motoTrophyCount : '0'}</Text>
              <Text style={styles.statBoxLabel}>Moto Trophies</Text>
            </View>
          </View>
        </View>

        {/* Card Points Section - Shows Averages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card Points Captured</Text>
          <View style={styles.statsGrid}>
            <StatCard 
              label="Aces" 
              value={avgAces}
              icon="🅰️" 
              suffix="pts"
            />
            <StatCard 
              label="Spades (all)" 
              value={avgSpades}
              icon="♠️" 
              suffix="cards"
            />
            <StatCard 
              label="Two Spades" 
              value={avgTwoSpades}
              icon="🃏" 
              suffix="cards"
            />
            <StatCard 
              label="Ten Diamonds" 
              value={avgTenDiamonds}
              icon="💎" 
              suffix="pts"
            />
          </View>
        </View>

        {/* Bonuses Section - Shows Averages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bonuses Earned</Text>
          <View style={styles.statsGrid}>
            <StatCard 
              label="Spades Bonus" 
              value={avgSpadesBonus}
              icon="🎴" 
              suffix="times"
              highlight={!!(stats && stats.spadesBonusCount > 0)}
            />
            <StatCard 
              label="20 Cards" 
              value={avgCards20}
              icon="🃏" 
              suffix="times"
              highlight={!!(stats && stats.cardCountBonus20 > 0)}
            />
            <StatCard 
              label="21+ Cards" 
              value={avgCards21}
              icon="🎯" 
              suffix="times"
              highlight={!!(stats && stats.cardCountBonus21 > 0)}
            />
          </View>
        </View>

        {/* Win/Loss Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Win/Loss Breakdown</Text>
          <View style={styles.breakdownCard}>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownValue}>{modeStats?.wins || 0}</Text>
                <Text style={styles.breakdownLabel}>Wins</Text>
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownValue}>{modeStats?.losses || 0}</Text>
                <Text style={styles.breakdownLabel}>Losses</Text>
              </View>
            </View>
            {/* Progress bar */}
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${modeStats && modeStats.games > 0 ? (modeStats.wins / modeStats.games * 100) : 0}%` }
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
  modeToggleContainer: {
    backgroundColor: COLORS.headerBg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.1)',
  },
  modeToggleContent: {
    paddingHorizontal: 14,
    gap: 8,
  },
  modeToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  modeToggleActive: {
    backgroundColor: `${COLORS.primary}20`,
    borderColor: COLORS.primary,
  },
  modeToggleText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  modeToggleTextActive: {
    color: COLORS.primary,
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
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  statValueHighlight: {
    color: COLORS.primary,
  },
  statSuffix: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
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
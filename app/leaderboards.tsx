/**
 * Leaderboards Screen
 * Full leaderboard page with game mode tabs, podium, and rankings
 * Now fetches live data from server
 */

import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLeaderboard, GameMode } from '../hooks/useLeaderboard';

// In-game color scheme - matching friends/game-modes pages
const COLORS = {
  background: '#0f4d0f',
  headerBg: '#1a5c1a',
  primary: '#FFD700',  // Gold
  main: '#FFD700',     // Gold (used for accents)
  secondary: '#9C27B0', // Purple
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  cardBg: 'rgba(0, 0, 0, 0.4)',
  border: '#FFD700',
};

// Game modes
export const MODES: { id: GameMode; label: string; icon: string }[] = [
  { id: '2h', label: '2 Hands', icon: '✌️' },
  { id: '3h', label: '3 Hands', icon: '🤟' },
  { id: '4h', label: '4 Hands', icon: '✋' },
  { id: '4hp', label: '4H Party', icon: '🎉' },
  { id: '4hk', label: '4H Knockout', icon: '🥊' },
];

interface Entry {
  rank: number;
  name: string;
  score: number;
  wins: number;
  country: string;
}

// Podium styles for top 3 (Gold, Purple, Green accents)
const POD_STYLE = [
  { color: COLORS.primary, border: '#FFD70055', bg: '#FFD70015', rankBg: '#FFD70030' },  // Gold
  { color: COLORS.secondary, border: '#9C27B044', bg: '#9C27B012', rankBg: '#9C27B028' }, // Purple
  { color: '#4CAF50', border: '#4CAF5044', bg: '#4CAF5012', rankBg: '#4CAF5025' },    // Green
];

interface AvatarProps {
  name: string;
  color: string;
  size?: number;
  radius?: number;
  fontSize?: number;
}

function Avatar({ name, color, size = 30, radius = 8, fontSize = 11 }: AvatarProps) {
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: radius,
      backgroundColor: `${color}18`,
      borderWidth: 1,
      borderColor: `${color}40`,
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
    }}>
      <Text style={{ color, fontSize, fontWeight: '700' }}>
        {name.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

interface PodiumProps {
  entry: Entry;
  style: typeof POD_STYLE[0];
  isTop: boolean;
  position: number;
}

function Podium({ entry, style, isTop, position }: PodiumProps) {
  return (
    <View style={{
      flex: 1,
      maxWidth: 115,
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderRadius: 12,
      backgroundColor: style.bg,
      borderWidth: 1,
      borderColor: style.border,
      marginHorizontal: 4,
      // Order: 2nd, 1st, 3rd
      marginTop: isTop ? 0 : 10,
    }}>
      <View style={{
        position: 'absolute',
        top: 6,
        left: 6,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: style.rankBg,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Text style={{ color: style.color, fontSize: 10, fontWeight: '700' }}>
          {entry.rank}
        </Text>
      </View>
      
      {isTop && (
        <Text style={{ fontSize: 18, marginBottom: 2 }}>👑</Text>
      )}
      
      <Avatar 
        name={entry.name} 
        color={style.color} 
        size={isTop ? 36 : 30} 
        radius={isTop ? 10 : 8} 
        fontSize={isTop ? 14 : 11} 
      />
      
      <Text style={{ 
        fontSize: isTop ? 11 : 10, 
        fontWeight: '700', 
        color: COLORS.text,
        marginTop: 4,
        textAlign: 'center',
        maxWidth: 98,
      }} numberOfLines={1}>
        {entry.name}
      </Text>
      
      <Text style={{ 
        fontSize: isTop ? 18 : 15, 
        fontWeight: '700', 
        color: style.color,
        marginTop: 2,
      }}>
        {entry.score.toLocaleString()}
      </Text>
      
      <Text style={{ fontSize: 9, color: COLORS.textMuted, marginTop: 2 }}>
        {entry.country} · {entry.wins}W
      </Text>
    </View>
  );
}

export const options = {
  headerShown: false,
};

export default function LeaderboardsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<GameMode>('2h');
  const [refreshing, setRefreshing] = useState(false);
  
  const { 
    leaderboard, 
    isLoading, 
    isRefreshing, 
    error, 
    isEmpty,
    refresh 
  } = useLeaderboard(mode);

  // Map server data to entry format
  const entries = leaderboard.map((entry, index) => ({
    rank: entry.rank || index + 1,
    name: entry.username || 'Unknown',
    score: entry.wins || 0,
    wins: entry.wins || 0,
    country: '🌍',
  }));

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Show loading state
  if (isLoading && leaderboard.length === 0) {
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
            <Text style={styles.brandName}>LEADERBOARD</Text>
            <Text style={styles.brandSub}>Card Game Rankings</Text>
          </View>
          
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
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
          <Text style={styles.brandName}>LEADERBOARD</Text>
          <Text style={styles.brandSub}>Card Game Rankings</Text>
        </View>
        
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Mode Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {MODES.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[styles.tab, mode === m.id && styles.tabActive]}
            onPress={() => setMode(m.id)}
          >
            <Text style={styles.tabIcon}>{m.icon}</Text>
            <Text style={[styles.tabLabel, mode === m.id && styles.tabLabelActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Podium */}
      <View style={styles.podium}>
        {/* Order: 2nd, 1st, 3rd */}
        {entries[1] && (
          <Podium 
            entry={entries[1]} 
            style={POD_STYLE[1]} 
            isTop={false} 
            position={1}
          />
        )}
        {entries[0] && (
          <Podium 
            entry={entries[0]} 
            style={POD_STYLE[0]} 
            isTop={true} 
            position={0}
          />
        )}
        {entries[2] && (
          <Podium 
            entry={entries[2]} 
            style={POD_STYLE[2]} 
            isTop={false} 
            position={2}
          />
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Section Title */}
      <Text style={styles.sectionTitle}>
        Rankings #{entries.length > 3 ? '#4' : entries.length + 1} — #{Math.min(entries.length, 7)}
      </Text>

      {/* Rankings List */}
      <ScrollView 
        style={styles.list} 
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No players yet</Text>
          </View>
        ) : (
          entries.slice(3).map((e, index) => (
            <View 
              key={`${e.rank}-${index}`} 
              style={styles.row}
            >
              <Text style={styles.rowRank}>#{e.rank}</Text>
              <Avatar name={e.name} color={COLORS.primary} size={28} radius={7} fontSize={10} />
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{e.name}</Text>
                <Text style={styles.rowMeta}>{e.country} · {e.wins} wins</Text>
              </View>
              <Text style={styles.rowScore}>{e.score.toLocaleString()}</Text>
            </View>
          ))
        )}
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.main}28`,
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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.main,
    letterSpacing: 2,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textMuted,
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
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.main,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  tabsContainer: {
    backgroundColor: COLORS.headerBg,
    maxHeight: 50,
  },
  tabsContent: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLORS.main}22`,
    backgroundColor: `${COLORS.background}66`,
  },
  tabActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: COLORS.primary,
  },
  tabIcon: {
    fontSize: 14,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  divider: {
    height: 1,
    backgroundColor: `${COLORS.main}22`,
    marginHorizontal: 14,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: COLORS.cardBg,
  },
  rowRank: {
    fontSize: 13,
    fontWeight: '700',
    color: `${COLORS.primary}66`,
    width: 28,
    textAlign: 'center',
  },
  rowInfo: {
    flex: 1,
    marginLeft: 10,
  },
  rowName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  rowMeta: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  rowScore: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

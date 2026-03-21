/**
 * QualificationReviewModal — landscape layout
 * All players in a single row, countdown below.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface ScoreBreakdown {
  totalPoints: number;
  tenDiamondPoints: number;
  twoSpadePoints: number;
  acePoints: number;
  spadeBonus: number;
  cardCountBonus: number;
  spadeCount?: number;
  totalCards?: number;
}

interface Player {
  playerIndex: number;
  score: ScoreBreakdown;
}

interface Props {
  visible: boolean;
  qualifiedPlayers: Player[];
  eliminatedPlayers?: Player[];
  countdownSeconds: number;
  currentPlayerIndex?: number;
  onCountdownComplete?: () => void;
}

function getPlayerStatusTitle(
  qualifiedPlayers: Player[],
  eliminatedPlayers: Player[],
  currentPlayerIndex?: number
): string {
  // Check if current player is in qualified list
  const qualifiedPlayer = qualifiedPlayers.find(p => p.playerIndex === currentPlayerIndex);
  if (qualifiedPlayer) {
    if (qualifiedPlayer.score.rank === 1) {
      return 'WINNER';
    }
    return 'Qualified';
  }
  
  // Check if current player is in eliminated list
  const eliminatedPlayer = eliminatedPlayers.find(p => p.playerIndex === currentPlayerIndex);
  if (eliminatedPlayer) {
    return 'Knocked out';
  }
  
  // Default: show round name if we can't determine player status
  return qualifiedPlayers.length <= 2 ? 'Final Showdown' : 'Semi-Final';
}

function getCountdownColor(t: number) {
  if (t > 5) return '#4CAF50';
  if (t > 2) return '#FFC107';
  return '#F44336';
}

function PlayerCard({
  player,
  qualified,
}: {
  player: Player;
  qualified: boolean;
}) {
  const s = player.score;
  return (
    <View style={[styles.card, qualified ? styles.cardQualified : styles.cardKnockedOut]}>
      {/* Header */}
      <View style={styles.cardTop}>
        <Text style={styles.playerName}>P{player.playerIndex + 1}</Text>
        <Text style={styles.playerScore}>{s.totalPoints}</Text>
      </View>

      {/* Status badge */}
      <View style={[styles.badge, qualified ? styles.badgeQ : styles.badgeKO]}>
        <Text style={[styles.badgeText, qualified ? styles.badgeTextQ : styles.badgeTextKO]}>
          {qualified ? 'Qualified' : 'Knocked out'}
        </Text>
      </View>

      {/* Point breakdown */}
      <View style={styles.breakdown}>
        {s.tenDiamondPoints > 0 && (
          <Row label="10♦" value={`${s.tenDiamondPoints} pts`} />
        )}
        {s.twoSpadePoints > 0 && (
          <Row label="2♠" value={`${s.twoSpadePoints} pts`} />
        )}
        {s.acePoints > 0 && (
          <Row label="Aces" value={`${s.acePoints} pts`} />
        )}
        {s.spadeBonus > 0 && (
          <Row label="Spades bonus" value={`+${s.spadeBonus}`} gold />
        )}
        {s.cardCountBonus > 0 && (
          <Row label="Cards bonus" value={`+${s.cardCountBonus}`} gold />
        )}

        <View style={styles.sep} />

        <Row label="Cards" value={String(s.totalCards ?? 0)} />
        <Row label="Spades" value={String(s.spadeCount ?? 0)} />
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  gold,
}: {
  label: string;
  value: string;
  gold?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, gold && styles.rowValueGold]}>{value}</Text>
    </View>
  );
}

function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const color = getCountdownColor(seconds);
  const radius = 22;
  const circ = 2 * Math.PI * radius;
  const progress = circ * (1 - seconds / total);

  return (
    <View style={styles.countdownWrap}>
      <Text style={styles.countdownLabel}>Next phase starting in</Text>
      <View style={styles.ringOuter}>
        {/* We fake the SVG ring with a View border trick */}
        <View style={[styles.ringTrack]} />
        <View
          style={[
            styles.ringFill,
            {
              borderColor: color,
              // Rotate to show progress — approximate with border trick
              // For a true arc, use react-native-svg in production
            },
          ]}
        />
        <View style={styles.ringCenter}>
          <Text style={[styles.countdownNumber, { color }]}>{seconds}</Text>
        </View>
      </View>
    </View>
  );
}

export function QualificationReviewModal({
  visible,
  qualifiedPlayers,
  eliminatedPlayers = [],
  countdownSeconds,
  currentPlayerIndex,
  onCountdownComplete,
}: Props) {
  const [countdown, setCountdown] = useState(countdownSeconds);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setCountdown(countdownSeconds);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [visible, countdownSeconds]);

  useEffect(() => {
    if (!visible || countdown <= 0) {
      if (countdown <= 0) onCountdownComplete?.();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, visible]);

  if (!visible) return null;

  const allPlayers = [
    ...qualifiedPlayers.map(p => ({ player: p, qualified: true })),
    ...eliminatedPlayers.map(p => ({ player: p, qualified: false })),
  ];

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.modal, { transform: [{ scale: scaleAnim }] }]}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{getPlayerStatusTitle(qualifiedPlayers, eliminatedPlayers, currentPlayerIndex)}</Text>
            <Text style={styles.subtitle}>Next phase starting soon</Text>
          </View>

          {/* Single-row player grid */}
          <View style={styles.playersRow}>
            {allPlayers.map(({ player, qualified }) => (
              <PlayerCard key={player.playerIndex} player={player} qualified={qualified} />
            ))}
          </View>

          {/* Countdown */}
          <CountdownRing seconds={countdown} total={countdownSeconds} />

        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const GOLD = '#C9A227';
const GREEN_DARK = '#1B5E20';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '92%',
    maxWidth: 720,
    backgroundColor: GREEN_DARK,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: GOLD,
    padding: 16,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: GOLD,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },

  // Players
  playersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 10,
  },
  cardQualified: {
    borderColor: 'rgba(76,175,80,0.55)',
  },
  cardKnockedOut: {
    borderColor: 'rgba(244,67,54,0.4)',
    opacity: 0.75,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 7,
  },
  playerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  playerScore: {
    fontSize: 22,
    fontWeight: 'bold',
    color: GOLD,
  },

  // Badge
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 7,
  },
  badgeQ: {
    backgroundColor: 'rgba(76,175,80,0.2)',
    borderWidth: 0.5,
    borderColor: 'rgba(76,175,80,0.4)',
  },
  badgeKO: {
    backgroundColor: 'rgba(244,67,54,0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(244,67,54,0.35)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  badgeTextQ: { color: '#81c784' },
  badgeTextKO: { color: '#e57373' },

  // Breakdown rows
  breakdown: {
    gap: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  rowValueGold: {
    color: GOLD,
  },
  sep: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 4,
  },

  // Countdown
  countdownWrap: {
    alignItems: 'center',
    gap: 6,
  },
  countdownLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  ringOuter: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringTrack: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ringFill: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
  },
  ringCenter: {
    position: 'absolute',
  },
  countdownNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
});

export default QualificationReviewModal;

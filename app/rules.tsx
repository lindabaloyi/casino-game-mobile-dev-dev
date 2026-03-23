/**
 * Rules Screen
 * Game rules and instructions with segmented sections
 */

import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// In-game color scheme - matching leaderboards/friends pages
const COLORS = {
  background: '#0f4d0f',
  headerBg: '#1a5c1a',
  primary: '#FFD700',  // Gold
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  cardBg: 'rgba(0, 0, 0, 0.4)',
  border: 'rgba(255, 215, 0, 0.3)',
};

// Rule sections with tabs
const SECTIONS = [
  { id: 'capture', label: 'Capture', icon: '🎯' },
  { id: 'build', label: 'Build', icon: '🧱' },
  { id: 'trail', label: 'Trail', icon: '📤' },
  { id: 'scoring', label: 'Scoring', icon: '⭐' },
  { id: 'party', label: 'Party', icon: '🎉' },
  { id: 'modes', label: 'Modes', icon: '🎮' },
  { id: 'flow', label: 'Flow', icon: '🔄' },
];

// Rule content for each section
const RULES = {
  capture: [
    { title: 'Match Rank Capture', text: 'Play a card that matches the rank of a card on the table to capture both cards. Example: play a 7 to capture a 7.' },
    { title: 'Capture Builds', text: 'Capture a build by playing a card matching its total value. Example: a build of 5+2=7 can be captured with a 7.' },
    { title: 'Multi-Card Capture', text: 'Capture multiple table cards if their combined ranks equal your played card. You can combine any number of cards.' },
    { title: 'Auto-Capture', text: 'When you play a card and it can capture something, it happens automatically. No manual selection needed.' },
    { title: 'Capture Priority', text: 'If your card can capture both single cards and builds, builds take priority.' },
  ],
  build: [
    { title: 'Create Build', text: 'Combine 2 or more table cards of the same rank to create a build. Place your card on top to own it.' },
    { title: 'Sum Build', text: 'Combine cards that add up to a value. Example: 4+3=7 creates a build others can capture with a 7.' },
    { title: 'Difference Build', text: 'Use two cards of different ranks to create a build. Their difference is the capture value. Example: 9-2=7.' },
    { title: 'Multi-Build', text: 'Create a build from 3+ cards where the total equals a valid rank (A,2-10,J,Q,K). The value wraps: 10=0, J=11, Q=12, K=13.' },
    { title: 'Temp Stack', text: 'Create an unsigned temporary build with cards from your hand. Add more cards on your next turn to finalize it.' },
    { title: 'Extend Build', text: 'Add cards to an existing build you own to increase its value. The new owner must have a card matching the total.' },
    { title: 'Steal Build', text: 'Capture an opponent\'s build by playing a card that equals its total. You now own the captured build.' },
    { title: 'Build Priority', text: 'When playing a card that can both build and capture, building takes priority. Use the "Build" button instead of tapping a card.' },
  ],
  trail: [
    { title: 'Trail a Card', text: 'Place a card on the table without capturing. This ends your turn and passes to the next player.' },
    { title: 'No Duplicate Rank', text: 'You cannot trail a card if there\'s already a card of the same rank on the table (unless all copies are in builds).' },
    { title: 'No Matching Build', text: 'You cannot trail a card if its value equals any build on the table.' },
    { title: 'Trail Strategy', text: 'Trail your highest cards to avoid giving opponents easy captures. Watch what other players trail.' },
  ],
  scoring: [
    { title: 'Total Points', text: 'Each deal is worth 11 points total. Points come from captured cards and bonuses.' },
    { title: 'Most Cards Bonus', text: 'Player capturing the most cards gets +1 point. Tie goes to last capture.' },
    { title: 'Most Spades Bonus', text: 'Player with most spade cards gets +1 point. Includes spades in builds you own.' },
    { title: '10♠ Bonus', text: 'Capturing the 10 of Spades gives +2 points instead of 1. It\'s worth 2.' },
    { title: '2♠ Bonus', text: 'Capturing the 2 of Spades gives +1 point. Important for the spade bonus!' },
    { title: 'Card Values', text: 'A=1, 2-10 = face value, J=11, Q=12, K=13. Spade bonus only for 10♠ and 2♠.' },
    { title: 'Game Win', text: 'Games end when a player reaches the target score (usually 500). Highest score wins.' },
  ],
  party: [
    { title: 'Team Play', text: '4-Player Party mode has 2 teams: Players 1+3 vs Players 2+4. Teammates sit opposite each other.' },
    { title: 'Teammate Builds', text: 'You can add cards to builds your teammate owns. Work together to create powerful combinations.' },
    { title: 'Cooperative Rebuild', text: 'If your teammate\'s build gets stolen, you can help rebuild it on your next turn.' },
    { title: 'Shiya Recall', text: 'Call "Shiya" when you think your team has all remaining tricks. If correct, your team gets +2 points. If wrong, -2 points.' },
    { title: 'Communication', text: 'Party mode has no hidden information - both teams see all cards. Coordinate with your teammate!' },
  ],
  modes: [
    { title: '2 Hands (2H)', text: 'Two players, each gets 4 cards. Fast-paced 1v1. Most captures wins.' },
    { title: '3 Hands (3H)', text: 'Three players, 4 cards each. More unpredictable with 3-way competition.' },
    { title: '4 Hands (4H)', text: 'Four players, no teams. Everyone for themselves. Capture the most to win.' },
    { title: '4H Party', text: 'Four players in 2 teams (1+3 vs 2+4). Cooperative gameplay with Shiya mechanic.' },
    { title: '4H Knockout', text: 'Four players, last place each round is eliminated. Last player standing wins!' },
  ],
  flow: [
    { title: 'Deal', text: '4 cards dealt to each player, 4 face-up on table. Last dealer card goes to table as extra.' },
    { title: 'Play Order', text: 'Turn passes clockwise. Last player to capture leads the next trick.' },
    { title: 'Turn Timer', text: 'Each turn has a 15-second timer. If expired, a random card is played automatically.' },
    { title: 'Game End', text: 'Game ends when all cards are played. All captures count. Most points wins the deal.' },
    { title: 'Next Deal', text: 'Winner of each deal deals the next. Score accumulates across multiple deals.' },
  ],
};

export const options = {
  headerShown: false,
};

export default function RulesScreen() {
  const router = useRouter();
  const [section, setSection] = useState('capture');
  const rules = RULES[section as keyof typeof RULES] || [];

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
          <Text style={styles.brandName}>RULES</Text>
          <Text style={styles.brandSub}>How to Play</Text>
        </View>
        
        <View style={styles.headerSpacer} />
      </View>

      {/* Section Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {SECTIONS.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.tab, section === s.id && styles.tabActive]}
            onPress={() => setSection(s.id)}
          >
            <Text style={styles.tabIcon}>{s.icon}</Text>
            <Text style={[styles.tabLabel, section === s.id && styles.tabLabelActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Rules List */}
      <ScrollView style={styles.rulesList} contentContainerStyle={styles.rulesContent}>
        {rules.map((rule, index) => (
          <View key={index} style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <Text style={styles.ruleIcon}>📋</Text>
              <Text style={styles.ruleTitle}>{rule.title}</Text>
            </View>
            <Text style={styles.ruleText}>{rule.text}</Text>
          </View>
        ))}
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
    borderBottomColor: `${COLORS.primary}18`,
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
    color: COLORS.primary,
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
  headerSpacer: {
    width: 36,
  },
  tabsContainer: {
    backgroundColor: COLORS.headerBg,
    maxHeight: 56,
  },
  tabsContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    flexDirection: 'row',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${COLORS.primary}18`,
    backgroundColor: `${COLORS.background}55`,
  },
  tabActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: COLORS.primary,
  },
  tabIcon: {
    fontSize: 12,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  rulesList: {
    flex: 1,
  },
  rulesContent: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    paddingBottom: 30,
  },
  ruleCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: `${COLORS.primary}15`,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  ruleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    flex: 1,
  },
  ruleText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
});

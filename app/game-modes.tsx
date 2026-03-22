/**
 * Game Modes Screen
 * Full page for selecting multiplayer game modes (landscape)
 * 
 * Replaces the PlayOnlineMenu modal with a proper screen flow
 */

import React from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export type GameModeOption = 'two-hands' | 'three-hands' | 'four-hands' | 'party' | 'freeforall';

interface GameModeInfo {
  id: GameModeOption;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  players: string;
}

const GAME_MODES: GameModeInfo[] = [
  {
    id: 'two-hands',
    title: '2 Hands',
    subtitle: '1v1 Battle',
    description: 'Classic duel against one opponent',
    icon: 'people',
    players: '2 Players',
  },
  {
    id: 'three-hands',
    title: '3 Hands',
    subtitle: '3 Player Battle',
    description: 'Face off against two opponents',
    icon: 'people',
    players: '3 Players',
  },
  {
    id: 'four-hands',
    title: '4 Hands',
    subtitle: '4 Player Battle',
    description: 'Every player for themselves!',
    icon: 'trophy',
    players: '4 Players',
  },
  {
    id: 'party',
    title: '4 Hands Party',
    subtitle: '2v2 Team Battle',
    description: 'Team up with a friend for 2v2',
    icon: 'people',
    players: '4 Players',
  },
];

export const options = {
  headerShown: false,
};

export default function GameModesScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  
  // In landscape, width > height
  const isLandscape = width > height;
  
  // Calculate responsive values for landscape
  const scaleFactor = isLandscape ? height / 400 : 1;
  const buttonHeight = Math.round(70 * scaleFactor);
  const iconSize = Math.round(32 * scaleFactor);
  const titleSize = Math.round(20 * scaleFactor);
  const subtitleSize = Math.round(14 * scaleFactor);
  
  const handleSelectMode = (mode: GameModeOption) => {
    // Navigate to online-play with the selected mode
    router.push(`/online-play?mode=${mode}`);
  };

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>Select Game Mode</Text>
      
      {/* Mode Options - Scrollable */}
      <ScrollView 
        style={styles.modesScrollView}
        contentContainerStyle={styles.modesContentContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {GAME_MODES.map((mode, index) => (
          <TouchableOpacity 
            key={mode.id}
            style={[
              styles.modeCard,
              index === 0 && styles.firstModeCard,
            ]}
            onPress={() => handleSelectMode(mode.id)}
            activeOpacity={0.7}
          >
            <View style={styles.modeIconContainer}>
              <Ionicons name={mode.icon as any} size={iconSize} color="#FFD700" />
            </View>
            
            <View style={styles.modeContent}>
              <Text style={[styles.modeTitle, { fontSize: titleSize }]}>{mode.title}</Text>
              <Text style={[styles.modeSubtitle, { fontSize: subtitleSize }]}>{mode.subtitle}</Text>
            </View>
            
            <View style={styles.playersBadge}>
              <Text style={styles.playersText}>{mode.players}</Text>
            </View>
          </TouchableOpacity>
        ))}
        
        {/* Footer hint */}
        <Text style={styles.footerHint}>
          Matchmaking will find opponents automatically
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f4d0f',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 20,
  },
  modesScrollView: {
    flex: 1,
  },
  modesContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
    gap: 16,
  },
  modeCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    minHeight: 80,
  },
  firstModeCard: {
    marginTop: 0,
  },
  modeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modeContent: {
    flex: 1,
  },
  modeTitle: {
    color: 'white',
    fontWeight: '600',
  },
  modeSubtitle: {
    color: '#FFD700',
    fontWeight: '600',
    marginTop: 2,
  },
  playersBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 12,
  },
  playersText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
  },
  footerHint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 20,
    paddingBottom: 20,
  },
});
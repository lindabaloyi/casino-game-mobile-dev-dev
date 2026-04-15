/**
 * Game Modes Screen
 * Full page for selecting multiplayer game modes (landscape)
 * 
 * Upgraded design matching the HTML mockup with mobile responsiveness
 */

import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GAME_MODES as CENTRAL_GAME_MODES } from '../shared/config/gameModes';

export type GameModeOption = 'two-hands' | 'three-hands' | 'four-hands' | 'party';

interface GameModeInfo {
  id: GameModeOption;
  title: string;
  subtitle: string;
  description: string;
  players: string;
}

// Filter out tournament mode for the menu, map to GameModeInfo format
const GAME_MODES: GameModeInfo[] = CENTRAL_GAME_MODES
  .filter(mode => mode.key !== 'tournament')
  .map(mode => ({
    id: mode.id as GameModeOption,
    title: mode.title,
    subtitle: mode.subtitle,
    description: mode.description,
    players: mode.players,
  }));

// Simple icon components using Views and Ionicons
const TwoHandsIcon = () => (
  <View style={iconStyles.container}>
    <View style={iconStyles.row}>
      <View style={[iconStyles.circle, { backgroundColor: '#f5c842' }]} />
      <View style={[iconStyles.circle, { backgroundColor: '#c9a030', marginLeft: 12 }]} />
    </View>
    <View style={iconStyles.curve}>
      <View style={[iconStyles.curveLine, { backgroundColor: '#f5c842' }]} />
      <View style={[iconStyles.curveLine, { backgroundColor: '#c9a030', marginTop: 4 }]} />
    </View>
  </View>
);

const ThreeHandsIcon = () => (
  <View style={iconStyles.container}>
    <View style={iconStyles.row}>
      <View style={[iconStyles.circleSmall, { backgroundColor: '#f5c842' }]} />
      <View style={[iconStyles.circleSmall, { backgroundColor: '#f5c842', marginLeft: 8 }]} />
      <View style={[iconStyles.circleSmall, { backgroundColor: '#c9a030', marginLeft: 8 }]} />
    </View>
    <View style={iconStyles.curve}>
      <View style={[iconStyles.curveLine, { backgroundColor: '#f5c842' }]} />
      <View style={[iconStyles.curveLineSmall, { backgroundColor: '#f5c842', marginTop: 3 }]} />
      <View style={[iconStyles.curveLine, { backgroundColor: '#c9a030', marginTop: 4 }]} />
    </View>
  </View>
);

const FourHandsIcon = () => (
  <View style={iconStyles.container}>
    <View style={iconStyles.card}>
      <View style={iconStyles.cardInner}>
        <View style={[iconStyles.line, { backgroundColor: '#f5c842' }]} />
        <View style={[iconStyles.lineHorizontal, { backgroundColor: '#f5c842' }]} />
      </View>
      <View style={[iconStyles.circleBadge, { backgroundColor: '#f5c842' }]} />
    </View>
    <View style={[iconStyles.curveLine, { backgroundColor: '#f5c842', marginTop: 2 }]} />
  </View>
);

const PartyIcon = () => (
  <View style={iconStyles.container}>
    <View style={iconStyles.starContainer}>
      <Ionicons name="star" size={40} color="#f5c842" />
    </View>
  </View>
);

const iconStyles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  circleSmall: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  curve: {
    marginTop: 6,
    alignItems: 'center',
  },
  curveLine: {
    width: 20,
    height: 3,
    borderRadius: 2,
  },
  curveLineSmall: {
    width: 14,
    height: 2,
    borderRadius: 1,
  },
  card: {
    width: 24,
    height: 30,
    borderRadius: 3,
    backgroundColor: '#2a6632',
    borderWidth: 1.5,
    borderColor: '#f5c842',
    overflow: 'hidden',
  },
  cardInner: {
    flex: 1,
    backgroundColor: '#0f3318',
    margin: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  line: {
    width: 2,
    height: 14,
    borderRadius: 1,
  },
  lineHorizontal: {
    position: 'absolute',
    width: 10,
    height: 2,
    borderRadius: 1,
  },
  circleBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  starContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const getIconComponent = (modeId: GameModeOption) => {
  switch (modeId) {
    case 'two-hands':
      return TwoHandsIcon;
    case 'three-hands':
      return ThreeHandsIcon;
    case 'four-hands':
      return FourHandsIcon;
    case 'party':
      return PartyIcon;
    default:
      return TwoHandsIcon;
  }
};

export const options = {
  headerShown: false,
};

export default function GameModesScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [selectedMode, setSelectedMode] = useState<GameModeOption | null>('two-hands');

  // Responsive calculations
  const isPortrait = height > width;
  const isSmallScreen = width < 400;
  const horizontalPadding = isSmallScreen ? 16 : isPortrait ? 20 : 40;
  const maxContentWidth = Math.min(width - horizontalPadding * 2, 480);

  const handleSelectMode = (mode: GameModeOption) => {
    setSelectedMode(mode);
  };

  const handleStartGame = () => {
    if (selectedMode) {
      router.push(`/online-play?mode=${selectedMode}`);
    }
  };

  return (
    <View style={[styles.container, { paddingHorizontal: horizontalPadding }]}>
      {/* Title */}
      <Text style={[styles.title, isSmallScreen && styles.titleSmall]}>Select game mode</Text>
      
      {/* Mode Options - Scrollable */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={[styles.modesContainer, { maxWidth: maxContentWidth }]}>
          {GAME_MODES.map((mode) => {
            const IconComponent = getIconComponent(mode.id);
            const isSelected = selectedMode === mode.id;
            
            return (
              <Pressable
                key={mode.id}
                style={({ pressed }) => [
                  styles.modeCard,
                  isSelected && styles.modeCardSelected,
                  pressed && styles.modeCardPressed,
                ]}
                onPress={() => handleSelectMode(mode.id)}
              >
                {/* Selected indicator */}
                {isSelected && <View style={styles.selectedIndicator} />}
                
                {/* Icon */}
                <View style={styles.iconWrap}>
                  <IconComponent />
                </View>
                
                {/* Text Content */}
                <View style={styles.textCol}>
                  <Text style={styles.modeName}>{mode.title}</Text>
                  <Text style={styles.modeSub}>{mode.subtitle}</Text>
                </View>
                
                {/* Badge */}
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{mode.players}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Start Button */}
      <Pressable
        style={({ pressed }) => [
          styles.startButton,
          { maxWidth: maxContentWidth },
          pressed && styles.startButtonPressed,
        ]}
        onPress={handleStartGame}
      >
        <Text style={styles.startButtonText}>Start game</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a4a1a',
    paddingTop: 40,
    paddingBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#f5c842',
    letterSpacing: 0.02,
    marginBottom: 20,
    textAlign: 'center',
  },
  titleSmall: {
    fontSize: 18,
  },
  modesContainer: {
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  modeCard: {
    backgroundColor: '#0f3318',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2a6632',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  modeCardSelected: {
    borderColor: '#f5c842',
    backgroundColor: '#143d1e',
  },
  modeCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  selectedIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#f5c842',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    marginLeft: 18,
  },
  modeName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f5c842',
    lineHeight: 24,
  },
  modeSub: {
    fontSize: 13,
    color: '#8fba6a',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#2a5c20',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#3a7a2a',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#a8d87a',
  },
  startButton: {
    marginTop: 20,
    width: '100%',
    paddingVertical: 14,
    backgroundColor: '#f5c842',
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'center',
  },
  startButtonPressed: {
    backgroundColor: '#fad84a',
  },
  startButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f3318',
    letterSpacing: 0.02,
  },
});
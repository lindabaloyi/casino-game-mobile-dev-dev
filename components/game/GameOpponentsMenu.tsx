/**
 * GameOpponentsMenu
 * 
 * In-game menu panel with main menu and settings screens.
 * Uses in-game color scheme matching leaderboards.tsx
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AVATAR_OPTIONS, AvatarId } from '../../hooks/usePlayerProfile';

// In-game color scheme - matching leaderboards.tsx
const COLORS = {
  background: '#1a5c1a',
  headerBg: '#1a5c1a',
  primary: '#FFD700',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  cardBg: 'rgba(0, 0, 0, 0.4)',
  border: 'rgba(255, 215, 0, 0.3)',
  danger: '#EF5350',
  greenAccent: 'rgba(27, 94, 32, 0.4)',
  greenBorder: 'rgba(76, 175, 80, 0.15)',
};

// Settings configuration
interface Setting {
  id: string;
  icon: string;
  label: string;
  type: 'toggle' | 'select';
  value: boolean | string;
  options?: string[];
}

const DEFAULT_SETTINGS: Setting[] = [
  { id: 'sound', icon: '🔊', label: 'Sound Effects', type: 'toggle', value: true },
  { id: 'music', icon: '🎵', label: 'Music', type: 'toggle', value: false },
  { id: 'vibration', icon: '📳', label: 'Vibration', type: 'toggle', value: true },
  { id: 'speed', icon: '⚡', label: 'Game Speed', type: 'select', value: 'Normal', options: ['Slow', 'Normal', 'Fast'] },
  { id: 'difficulty', icon: '🎯', label: 'Difficulty', type: 'select', value: 'Medium', options: ['Easy', 'Medium', 'Hard'] },
];

interface GameOpponentsMenuProps {
  /** Current player's index (0-3) */
  playerNumber: number;
  /** List of players in the game */
  players: any[];
  /** Callback when user wants to quit the game */
  onQuitGame: () => void;
  /** Callback when user taps on an opponent */
  onOpponentPress: (playerIndex: number) => void;
  /** Callback to close the menu */
  onClose: () => void;
}

export function GameOpponentsMenu({
  playerNumber,
  players,
  onQuitGame,
  onOpponentPress,
  onClose,
}: GameOpponentsMenuProps) {
  const [panel, setPanel] = useState<'main' | 'settings'>('main');
  const [settings, setSettings] = useState<Setting[]>(DEFAULT_SETTINGS);
  
  // Animation for panel transitions
  const slideAnim = useRef(new Animated.Value(panel === 'main' ? 0 : 1)).current;
  const previousPanel = useRef(panel);
  
  useEffect(() => {
    if (previousPanel.current !== panel) {
      previousPanel.current = panel;
      Animated.timing(slideAnim, {
        toValue: panel === 'main' ? 0 : 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [panel, slideAnim]);

  // Get opponent players (excluding self)
  const opponents = players.filter((_, index) => index !== playerNumber);

  // Get avatar emoji from player data
  const getAvatarEmoji = (player: any): string => {
    if (player?.avatar && typeof player.avatar === 'string') {
      const avatar = AVATAR_OPTIONS.find((a) => a.id === player.avatar);
      if (avatar) return avatar.emoji;
    }
    // Fallback: try avatarId as direct id
    if (player?.avatarId) {
      const avatar = AVATAR_OPTIONS.find((a) => a.id === player.avatarId);
      if (avatar) return avatar.emoji;
    }
    return '🎮';
  };

  const getPlayerName = (player: any, index: number) => {
    if (player?.username) return player.username;
    if (player?.name) return player.name;
    return `Player ${index + 1}`;
  };

  // Get player color based on player index
  const getPlayerColor = (index: number) => {
    const colors = ['#FF9800', '#9C27B0', '#2196F3', '#800020'];
    return colors[index % colors.length];
  };

  // Toggle a setting
  const toggleSetting = (id: string) => {
    setSettings(prev => prev.map(s => 
      s.id === id && s.type === 'toggle' 
        ? { ...s, value: !s.value } 
        : s
    ));
  };

  // Cycle through options for a select setting
  const cycleOption = (id: string) => {
    setSettings(prev => prev.map(s => {
      if (s.id !== id || s.type !== 'select' || !s.options) return s;
      const currentIndex = s.options.indexOf(s.value as string);
      const nextIndex = (currentIndex + 1) % s.options.length;
      return { ...s, value: s.options[nextIndex] };
    }));
  };

  const handleQuitGame = () => {
    onClose();
    onQuitGame();
  };

  // Animation interpolation
  const mainPanelTranslate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -300],
  });

  const settingsPanelTranslate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  const mainPanelOpacity = slideAnim.interpolate({
    inputRange: [0, 0.5],
    outputRange: [1, 0],
  });

  const settingsPanelOpacity = slideAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.container}>
      {/* Main Panel */}
      <Animated.View
        style={[
          styles.panel,
          styles.mainPanel,
          {
            transform: [{ translateX: mainPanelTranslate }],
            opacity: mainPanelOpacity,
          },
        ]}
        pointerEvents={panel === 'main' ? 'auto' : 'none'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Menu</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {/* Quit Game */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleQuitGame}
            activeOpacity={0.7}
          >
            <Text style={styles.quitIcon}>⤷</Text>
            <Text style={styles.quitLabel}>QUIT GAME</Text>
          </TouchableOpacity>

          {/* Players Section */}
          <Text style={styles.sectionLabel}>Players</Text>
          
          {opponents.length > 0 ? (
            opponents.map((player, idx) => {
              const actualIndex = playerNumber < idx + 1 ? idx : idx + 1;
              const playerColor = getPlayerColor(actualIndex);
              return (
                <TouchableOpacity
                  key={`opponent-${actualIndex}`}
                  style={styles.playerItem}
                  onPress={() => {
                    onClose();
                    onOpponentPress(actualIndex);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.playerAvatar, { 
                    backgroundColor: `${playerColor}18`,
                    borderColor: `${playerColor}35`,
                  }]}>
                    <Text style={styles.playerEmoji}>{getAvatarEmoji(player)}</Text>
                  </View>
                  <Text style={[styles.playerName, { color: playerColor }]}>
                    {getPlayerName(player, actualIndex)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.noPlayers}>
              <Text style={styles.noPlayersText}>No other players</Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Settings Navigation */}
          <Text style={styles.sectionLabel}>Options</Text>
          
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setPanel('settings')}
            activeOpacity={0.7}
          >
            <View style={styles.navIcon}>
              <Text style={styles.navIconText}>⚙️</Text>
            </View>
            <Text style={styles.navLabel}>Settings</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* Settings Panel */}
      <Animated.View
        style={[
          styles.panel,
          styles.settingsPanel,
          {
            transform: [{ translateX: settingsPanelTranslate }],
            opacity: settingsPanelOpacity,
          },
        ]}
        pointerEvents={panel === 'settings' ? 'auto' : 'none'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => setPanel('main')} 
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {settings.map((setting, index) => (
            <View key={setting.id}>
              <View style={styles.settingRow}>
                <View style={styles.settingIcon}>
                  <Text style={styles.settingIconText}>{setting.icon}</Text>
                </View>
                <Text style={styles.settingLabel}>{setting.label}</Text>
                
                {setting.type === 'toggle' ? (
                  <TouchableOpacity
                    style={[
                      styles.toggle,
                      setting.value ? styles.toggleOn : styles.toggleOff,
                    ]}
                    onPress={() => toggleSetting(setting.id)}
                  >
                    <Animated.View
                      style={[
                        styles.toggleKnob,
                        setting.value && styles.toggleKnobOn,
                      ]}
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.chip}
                    onPress={() => cycleOption(setting.id)}
                  >
                    <Text style={styles.chipText}>{setting.value}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {index < settings.length - 1 && <View style={styles.settingDivider} />}
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(15, 35, 18, 0.95)',
    borderRadius: 14,
    overflow: 'hidden',
    width: 260,
    minHeight: 230,
    maxHeight: 380,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mainPanel: {
    zIndex: 1,
  },
  settingsPanel: {
    zIndex: 2,
    backgroundColor: 'rgba(15, 35, 18, 0.98)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 4,
  },
  backButton: {
    padding: 2,
  },
  body: {
    flex: 1,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quitIcon: {
    fontSize: 12,
    color: COLORS.danger,
    marginRight: 6,
  },
  quitLabel: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  sectionLabel: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.25)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  playerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
  },
  playerInitial: {
    fontSize: 10,
    fontWeight: '700',
  },
  playerEmoji: {
    fontSize: 14,
  },
  playerName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  noPlayers: {
    padding: 16,
    alignItems: 'center',
  },
  noPlayersText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    marginHorizontal: 12,
    marginVertical: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: COLORS.greenAccent,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  navIconText: {
    fontSize: 12,
  },
  navLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  settingIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: COLORS.greenAccent,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  settingIconText: {
    fontSize: 12,
  },
  settingLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  toggle: {
    width: 36,
    height: 20,
    borderRadius: 10,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: COLORS.primary,
  },
  toggleOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  toggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  toggleKnobOn: {
    transform: [{ translateX: 16 }],
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  chipText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  settingDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 152, 0, 0.08)',
    marginHorizontal: 12,
  },
});

export default GameOpponentsMenu;

/**
 * PlayOnlineMenu
 * Modal menu for selecting multiplayer game modes
 * 
 * Features:
 * - Hierarchical menu with game mode options
 * - Player count indicators
 * - Mode descriptions
 */

import React from 'react';
import { 
  Modal, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type GameModeOption = 'two-hands' | 'three-hands' | 'party';

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
    title: '⚔️ 2 Hands',
    subtitle: '1v1 Battle',
    description: 'Classic duel against one opponent',
    icon: 'people',
    players: '2 Players',
  },
  {
    id: 'three-hands',
    title: '🎴 3 Hands',
    subtitle: 'Solo Play',
    description: 'Face off against two opponents',
    icon: 'people',
    players: '3 Players',
  },
  {
    id: 'party',
    title: '🎉 Party Mode',
    subtitle: '2v2 Battle',
    description: 'Team up with a friend for 2v2',
    icon: 'people',
    players: '4 Players',
  },
];

interface PlayOnlineMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelectMode: (mode: GameModeOption) => void;
}

export function PlayOnlineMenu({ 
  visible, 
  onClose, 
  onSelectMode 
}: PlayOnlineMenuProps) {
  const handleSelectMode = (mode: GameModeOption) => {
    onSelectMode(mode);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.clickOutside} onPress={onClose} />
        
        <View style={styles.menuContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Play Online</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          {/* Mode Options */}
          <View style={styles.modesContainer}>
            {GAME_MODES.map((mode) => (
              <TouchableOpacity 
                key={mode.id}
                style={styles.modeCard}
                onPress={() => handleSelectMode(mode.id)}
                activeOpacity={0.7}
              >
                <View style={styles.modeIconContainer}>
                  <Ionicons name={mode.icon as any} size={28} color="#FFD700" />
                </View>
                
                <View style={styles.modeContent}>
                  <Text style={styles.modeTitle}>{mode.title}</Text>
                  <Text style={styles.modeSubtitle}>{mode.subtitle}</Text>
                  <Text style={styles.modeDescription}>{mode.description}</Text>
                </View>
                
                <View style={styles.playersBadge}>
                  <Text style={styles.playersText}>{mode.players}</Text>
                </View>
                
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color="rgba(255,255,255,0.5)" 
                  style={styles.chevron}
                />
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Footer hint */}
          <Text style={styles.footerHint}>
            Matchmaking will find opponents automatically
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  clickOutside: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  menuContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFD700',
    width: '85%',
    maxWidth: 340,
    overflow: 'hidden',
    zIndex: 2001,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  closeButton: {
    padding: 4,
  },
  modesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  modeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modeContent: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  modeSubtitle: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  playersBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  playersText: {
    fontSize: 10,
    color: '#FFD700',
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 4,
  },
  footerHint: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    paddingBottom: 16,
    paddingTop: 8,
  },
});

export default PlayOnlineMenu;

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
    backgroundColor: '#0f4d0f',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
    width: '90%',
    maxWidth: 320,
    overflow: 'hidden',
    zIndex: 2001,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 1,
  },
  closeButton: {
    padding: 4,
  },
  modesContainer: {
    paddingHorizontal: 10,
    paddingVertical: 16,
  },
  modeCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  modeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modeContent: {
    flex: 1,
  },
  modeTitle: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  modeSubtitle: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
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
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    paddingBottom: 16,
    paddingTop: 8,
  },
});

export default PlayOnlineMenu;

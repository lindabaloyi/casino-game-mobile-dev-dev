/**
 * HomeMenuButton
 * 
 * Small menu button positioned in the left corner of the game board.
 * Opens a dropdown menu with game options and opponent links.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameOpponentsMenu } from './GameOpponentsMenu';

interface HomeMenuButtonProps {
  /** Current player's index (0-3) */
  playerNumber: number;
  /** List of players in the game */
  players: any[];
  /** Callback when user wants to quit the game */
  onQuitGame: () => void;
  /** Callback when user taps on an opponent */
  onOpponentPress: (playerIndex: number) => void;
}

export const HomeMenuButton = React.memo(function HomeMenuButton({
  playerNumber,
  players,
  onQuitGame,
  onOpponentPress,
}: HomeMenuButtonProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const handleOpenMenu = () => {
    setMenuVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCloseMenu = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMenuVisible(false);
    });
  };

  return (
    <>
      {/* Menu Button */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={handleOpenMenu}
        activeOpacity={0.7}
      >
        <Ionicons name="menu" size={24} color="white" />
      </TouchableOpacity>

      {/* Dropdown Menu */}
      {menuVisible && (
        <Pressable 
          style={styles.overlay} 
          onPress={handleCloseMenu}
        >
          <Animated.View 
            style={[
              styles.menuContainer,
              { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <GameOpponentsMenu
                playerNumber={playerNumber}
                players={players}
                onQuitGame={onQuitGame}
                onOpponentPress={(playerIndex: number) => {
                  handleCloseMenu();
                  onOpponentPress(playerIndex);
                }}
                onClose={handleCloseMenu}
              />
            </Pressable>
          </Animated.View>
        </Pressable>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  menuButton: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
  },
  menuContainer: {
    position: 'absolute',
    left: 12,
    bottom: 60,
    minWidth: 200,
  },
});

export default HomeMenuButton;

/**
 * MusicToggleButton
 * A button to toggle background music mute/unmute.
 * Can be placed anywhere in the game UI.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSoundContext } from '../../hooks/useSoundContext';

export function MusicToggleButton() {
  const { isMusicMuted, toggleMusicMute } = useSoundContext();

  return (
    <TouchableOpacity 
      style={styles.button} 
      onPress={toggleMusicMute}
      accessibilityLabel={isMusicMuted ? 'Unmute music' : 'Mute music'}
    >
      <Text style={styles.icon}>{isMusicMuted ? '🔇' : '🔊'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
});

export default MusicToggleButton;

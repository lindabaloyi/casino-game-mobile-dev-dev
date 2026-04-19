/**
 * SoundContext
 * Provides global sound management including background music that persists
 * across navigation. Wraps the entire app to ensure continuous playback.
 * 
 * Volume Configuration:
 * - BASE_VOLUME: 0.3 (default background music volume)
 * - IN_GAME_VOLUME_SCALE: 0.33 (1/3 volume when in-game)
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';

// Sound file path
const BACKGROUND_MUSIC = require('../assets/sound-effects/background-sound-official.m4a');

// Volume configuration - easy to adjust
const BASE_VOLUME = 0.3;  // Default background music volume
const IN_GAME_VOLUME_SCALE = 0.33;  // 1/3 volume when in-game

interface SoundContextValue {
  isMusicPlaying: boolean;
  isMusicMuted: boolean;
  isInGame: boolean;
  toggleMusicMute: () => void;
  startMusic: () => void;
  stopMusic: () => void;
  setInGameMode: (inGame: boolean) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

export function useSoundContext() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSoundContext must be used within SoundProvider');
  }
  return context;
}

interface SoundProviderProps {
  children: React.ReactNode;
}

export function SoundProvider({ children }: SoundProviderProps) {
  const backgroundMusicRef = useRef<Audio.Sound | null>(null);
  const isLoadedRef = useRef(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isMusicMuted, setIsMusicMuted] = useState(true);  // Muted by default
  const [isInGame, setIsInGame] = useState(false);

  // Calculate current volume based on game mode
  const getCurrentVolume = useCallback(() => {
    const baseVol = isMusicMuted ? 0 : BASE_VOLUME;
    return isInGame ? baseVol * IN_GAME_VOLUME_SCALE : baseVol;
  }, [isMusicMuted, isInGame]);

  // Load and start background music
  const startMusic = useCallback(async () => {
    if (isLoadedRef.current) {
      return;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        BACKGROUND_MUSIC,
        { 
          volume: 0,  // Start muted - user can unmute via toggle
          isLooping: true,
          shouldPlay: true
        }
      );
      backgroundMusicRef.current = sound;
      isLoadedRef.current = true;
      setIsMusicPlaying(true);
    } catch (error) {
      console.error('[SoundContext] Error loading background music:', error);
    }
  }, []);

  // Auto-start background music - DISABLED
  // To enable, uncomment the startMusic() call below
  // startMusic();

  // Stop and unload background music
  const stopMusic = useCallback(async () => {
    if (!isLoadedRef.current || !backgroundMusicRef.current) {
      return;
    }

    try {
      await backgroundMusicRef.current.stopAsync();
      await backgroundMusicRef.current.unloadAsync();
      backgroundMusicRef.current = null;
      isLoadedRef.current = false;
      setIsMusicPlaying(false);
    } catch (error) {
      console.error('[SoundContext] Error stopping background music:', error);
    }
  }, []);

  // Set in-game mode (reduces background music to 1/3)
  const setInGameMode = useCallback(async (inGame: boolean) => {
    setIsInGame(inGame);
    
    if (!isLoadedRef.current || !backgroundMusicRef.current) {
      return;
    }

    try {
      const newVolume = inGame ? BASE_VOLUME * IN_GAME_VOLUME_SCALE : BASE_VOLUME;
      await backgroundMusicRef.current.setVolumeAsync(newVolume);
    } catch (error) {
      console.error('[SoundContext] Error setting in-game mode:', error);
    }
  }, []);

  // Toggle mute/unmute
  const toggleMusicMute = useCallback(async () => {
    if (!isLoadedRef.current || !backgroundMusicRef.current) {
      return;
    }

    try {
      const newMuted = !isMusicMuted;
      const newVolume = newMuted ? 0 : (isInGame ? BASE_VOLUME * IN_GAME_VOLUME_SCALE : BASE_VOLUME);
      await backgroundMusicRef.current.setVolumeAsync(newVolume);
      setIsMusicMuted(newMuted);
    } catch (error) {
      console.error('[SoundContext] Error toggling mute:', error);
    }
  }, [isMusicMuted, isInGame]);
  useEffect(() => {
    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.unloadAsync();
      }
    };
  }, []);

  return (
    <SoundContext.Provider 
      value={{
        isMusicPlaying,
        isMusicMuted,
        isInGame,
        toggleMusicMute,
        startMusic,
        stopMusic,
        setInGameMode,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export default SoundProvider;

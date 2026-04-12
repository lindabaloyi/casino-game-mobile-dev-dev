/**
 * useSound Hook
 * Provides sound effects playback for the casino game.
 * Uses expo-av for audio playback.
 */

import { useCallback, useRef, useEffect } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';

interface SoundFiles {
  cardContact: any;  // require() returns an object
  capture: any;
  button: any;
}

interface SoundObjects {
  cardContact: Audio.Sound | null;
  capture: Audio.Sound | null;
  trail: Audio.Sound | null;
  button: Audio.Sound | null;
  shiya: Audio.Sound | null;
}

// Sound file paths
const CARD_CONTACT_SOUND = require('../assets/sound effects/card contact sound effect.mp3');
const CAPTURE_SOUND = require('../assets/sound effects/capture sound effect.mp3');
const TRAIL_SOUND = require('../assets/sound effects/trailing sound effect.mp3');
const BUTTON_SOUND = require('../assets/sound effects/buttons sound effect.mp3');
const SHIYA_SOUND = require('../assets/sound effects/shiya.mp3');

export function useSound() {
  const soundsRef = useRef<SoundObjects>({
    cardContact: null,
    capture: null,
    trail: null,
    button: null,
    shiya: null,
  });

  // Mute state for background music
  const isMutedRef = useRef(false);
  
  const isLoadedRef = useRef(false);

  // Load all sound files on mount
  useEffect(() => {
    const loadSounds = async () => {
      try {
        // Configure audio mode for game sounds
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        // Load card contact sound
        const { sound: cardContactSound } = await Audio.Sound.createAsync(
          CARD_CONTACT_SOUND,
          { volume: 0.5, shouldPlay: false }
        );
        soundsRef.current.cardContact = cardContactSound;

        // Load capture sound
        const { sound: captureSound } = await Audio.Sound.createAsync(
          CAPTURE_SOUND,
          { volume: 0.7, shouldPlay: false }
        );
        soundsRef.current.capture = captureSound;

        // Load trail sound
        const { sound: trailSound } = await Audio.Sound.createAsync(
          TRAIL_SOUND,
          { volume: 0.6, shouldPlay: false }
        );
        soundsRef.current.trail = trailSound;

        // Load button sound
        const { sound: buttonSound } = await Audio.Sound.createAsync(
          BUTTON_SOUND,
          { volume: 0.5, shouldPlay: false }
        );
        soundsRef.current.button = buttonSound;

        // Load shiya sound
        const { sound: shiyaSound } = await Audio.Sound.createAsync(
          SHIYA_SOUND,
          { volume: 0.7, shouldPlay: false }
        );
        soundsRef.current.shiya = shiyaSound;

        isLoadedRef.current = true;
      } catch (error) {
        console.error('[useSound] Error loading sounds:', error);
      }
    };

    loadSounds();

    // Cleanup on unmount
    return () => {
      const cleanup = async () => {
        try {
          if (soundsRef.current.cardContact) {
            await soundsRef.current.cardContact.unloadAsync();
          }
          if (soundsRef.current.capture) {
            await soundsRef.current.capture.unloadAsync();
          }
          if (soundsRef.current.trail) {
            await soundsRef.current.trail.unloadAsync();
          }
          if (soundsRef.current.button) {
            await soundsRef.current.button.unloadAsync();
          }
          if (soundsRef.current.shiya) {
            await soundsRef.current.shiya.unloadAsync();
          }
        } catch (error) {
          console.error('[useSound] Error cleaning up sounds:', error);
        }
      };
      cleanup();
    };
  }, []);

  // Play card contact sound
  const playCardContact = useCallback(async () => {
    if (!isLoadedRef.current || !soundsRef.current.cardContact) {
      return;
    }

    try {
      // Reset to beginning before playing
      await soundsRef.current.cardContact.setPositionAsync(0);
      await soundsRef.current.cardContact.playAsync();
    } catch (error) {
      console.error('[useSound] Error playing card contact sound:', error);
    }
  }, []);

  // Play capture sound
  const playCapture = useCallback(async () => {
    if (!isLoadedRef.current || !soundsRef.current.capture) {
      return;
    }

    try {
      // Reset to beginning before playing
      await soundsRef.current.capture.setPositionAsync(0);
      await soundsRef.current.capture.playAsync();
    } catch (error) {
      console.error('[useSound] Error playing capture sound:', error);
    }
  }, []);

  // Play trail sound at 2x speed
  const playTrail = useCallback(async () => {
    if (!isLoadedRef.current || !soundsRef.current.trail) {
      return;
    }

    try {
      // Reset to beginning and set playback rate to 2x
      await soundsRef.current.trail.setPositionAsync(0);
      await soundsRef.current.trail.setRateAsync(2.0, true); // 2x speed
      await soundsRef.current.trail.playAsync();
    } catch (error) {
      console.error('[useSound] Error playing trail sound:', error);
    }
  }, []);

  // Play table card drag sound (for dragging loose cards on table)
  const playTableCardDrag = useCallback(async () => {
    if (!isLoadedRef.current || !soundsRef.current.cardContact) {
      return;
    }

    try {
      // Reset to beginning before playing
      await soundsRef.current.cardContact.setPositionAsync(0);
      await soundsRef.current.cardContact.playAsync();
    } catch (error) {
      console.error('[useSound] Error playing table card drag sound:', error);
    }
  }, []);

  // Play button click sound
  const playButton = useCallback(async () => {
    if (!isLoadedRef.current || !soundsRef.current.button) {
      return;
    }

    try {
      // Reset to beginning before playing
      await soundsRef.current.button.setPositionAsync(0);
      await soundsRef.current.button.playAsync();
    } catch (error) {
      console.error('[useSound] Error playing button sound:', error);
    }
  }, []);

  // Play shiya sound
  const playShiya = useCallback(async () => {
    if (!isLoadedRef.current || !soundsRef.current.shiya) {
      return;
    }

    try {
      // Reset to beginning before playing
      await soundsRef.current.shiya.setPositionAsync(0);
      await soundsRef.current.shiya.playAsync();
    } catch (error) {
      console.error('[useSound] Error playing shiya sound:', error);
    }
  }, []);

  // Toggle mute - now just delegates to SoundContext
  const toggleMute = useCallback(async () => {
    // This is now handled by useSoundContext
  }, []);

  // Check if background music is muted
  const isMuted = useCallback(() => {
    return isMutedRef.current;
  }, []);

  return {
    playCardContact,
    playCapture,
    playTrail,
    playTableCardDrag,
    playButton,
    playShiya,
  };
}

export default useSound;
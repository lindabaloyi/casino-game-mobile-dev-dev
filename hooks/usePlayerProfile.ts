/**
 * usePlayerProfile
 * 
 * Manages player profile data including:
 * - Username
 * - Avatar selection
 * - Win/Loss stats
 * 
 * Uses AsyncStorage for local persistence.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AvatarId = 
  | 'lion' 
  | 'tiger' 
  | 'elephant' 
  | 'monkey' 
  | 'panda' 
  | 'fox' 
  | 'wolf' 
  | 'bear';

export interface PlayerProfile {
  username: string;
  avatar: AvatarId;
  wins: number;
  losses: number;
  totalGames: number;
}

export interface UsePlayerProfileResult {
  profile: PlayerProfile;
  isLoading: boolean;
  updateUsername: (username: string) => Promise<void>;
  updateAvatar: (avatar: AvatarId) => Promise<void>;
  recordWin: () => Promise<void>;
  recordLoss: () => Promise<void>;
  resetStats: () => Promise<void>;
}

const STORAGE_KEY = 'player_profile';

const DEFAULT_PROFILE: PlayerProfile = {
  username: 'Player',
  avatar: 'lion',
  wins: 0,
  losses: 0,
  totalGames: 0,
};

const AVATARS: { id: AvatarId; emoji: string; label: string }[] = [
  { id: 'lion', emoji: '🦁', label: 'Lion' },
  { id: 'tiger', emoji: '🐯', label: 'Tiger' },
  { id: 'elephant', emoji: '🐘', label: 'Elephant' },
  { id: 'monkey', emoji: '🐵', label: 'Monkey' },
  { id: 'panda', emoji: '🐼', label: 'Panda' },
  { id: 'fox', emoji: '🦊', label: 'Fox' },
  { id: 'wolf', emoji: '🐺', label: 'Wolf' },
  { id: 'bear', emoji: '🐻', label: 'Bear' },
];

export const AVATAR_OPTIONS = AVATARS;

export function usePlayerProfile(): UsePlayerProfileResult {
  const [profile, setProfile] = useState<PlayerProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setProfile({ ...DEFAULT_PROFILE, ...parsed });
      }
    } catch (error) {
      console.log('[usePlayerProfile] Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async (newProfile: PlayerProfile) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    } catch (error) {
      console.log('[usePlayerProfile] Error saving profile:', error);
    }
  };

  const updateUsername = useCallback(async (username: string) => {
    const trimmed = username.trim().slice(0, 15) || 'Player';
    const newProfile = { ...profile, username: trimmed };
    setProfile(newProfile);
    await saveProfile(newProfile);
  }, [profile]);

  const updateAvatar = useCallback(async (avatar: AvatarId) => {
    const newProfile = { ...profile, avatar };
    setProfile(newProfile);
    await saveProfile(newProfile);
    
    // Sync to server
    try {
      const token = await AsyncStorage.getItem('casino_auth_token');
      if (token) {
        await fetch(`${process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001'}/api/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ avatar })
        });
      }
    } catch (error) {
      console.log('[usePlayerProfile] Error syncing avatar to server:', error);
    }
  }, [profile]);

  const recordWin = useCallback(async () => {
    const newProfile = {
      ...profile,
      wins: profile.wins + 1,
      totalGames: profile.totalGames + 1,
    };
    setProfile(newProfile);
    await saveProfile(newProfile);
  }, [profile]);

  const recordLoss = useCallback(async () => {
    const newProfile = {
      ...profile,
      losses: profile.losses + 1,
      totalGames: profile.totalGames + 1,
    };
    setProfile(newProfile);
    await saveProfile(newProfile);
  }, [profile]);

  const resetStats = useCallback(async () => {
    const newProfile = {
      ...profile,
      wins: 0,
      losses: 0,
      totalGames: 0,
    };
    setProfile(newProfile);
    await saveProfile(newProfile);
  }, [profile]);

  return {
    profile,
    isLoading,
    updateUsername,
    updateAvatar,
    recordWin,
    recordLoss,
    resetStats,
  };
}

export default usePlayerProfile;

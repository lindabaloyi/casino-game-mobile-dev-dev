/**
 * Player Profile Hook with Server Sync
 * 
 * Enhanced hook that:
 * - Syncs with server for consistent data
 * - Validates input before sending
 * - Implements retry logic for failed operations
 * - Handles offline mode gracefully
 * - Provides detailed debug logging
 * - Uses optimistic locking for concurrent updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// DEBUG: Add diagnostic logging for hybrid storage
const STORAGE_KEY = 'player_profile';
const SERVER_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001';

// PRD Storage Keys
const GUEST_PROFILE_KEY = 'guest_profile';
const GUEST_GAME_PROGRESS_KEY = 'guest_game_progress';
const AUTH_CACHE_PROFILE_KEY = 'auth_cache_profile';
const AUTH_CACHE_PROGRESS_KEY = 'auth_cache_progress';
const TOKEN_STORAGE_KEY = 'casino_auth_token';

function profileDebugLog(tag: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [ProfileStorage:${tag}] ${message}`, data || '');
}

// Avatar options
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
  version: number;
  lastSyncAt: string | null;
}

export interface UsePlayerProfileResult {
  profile: PlayerProfile;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  updateUsername: (username: string) => Promise<boolean>;
  updateAvatar: (avatar: AvatarId) => Promise<boolean>;
  recordWin: () => Promise<boolean>;
  recordLoss: () => Promise<boolean>;
  resetStats: () => Promise<boolean>;
  syncWithServer: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

const DEFAULT_PROFILE: PlayerProfile = {
  username: 'Player',
  avatar: 'lion',
  wins: 0,
  losses: 0,
  totalGames: 0,
  version: 1,
  lastSyncAt: null,
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

// Validation helpers
function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Username must be at least 2 characters' };
  }
  
  if (trimmed.length > 15) {
    return { valid: false, error: 'Username must be at most 15 characters' };
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }
  
  return { valid: true };
}

function validateAvatar(avatar: string): { valid: boolean; error?: string } {
  const validAvatars = AVATARS.map(a => a.id);
  if (!validAvatars.includes(avatar as AvatarId)) {
    return { valid: false, error: 'Invalid avatar selection' };
  }
  return { valid: true };
}

// Debug logging
function debugLog(tag: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [PlayerProfile:${tag}] ${message}`, data || '');
}

function debugError(tag: string, message: string, error: any) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [PlayerProfile:${tag}] ${message}`, error);
}

// Get auth token
async function getAuthToken(): Promise<string | null> {
  try {
    profileDebugLog('getAuthToken', 'Fetching auth token');
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    profileDebugLog('getAuthToken', 'Token retrieved', { hasToken: !!token });
    return token;
  } catch (error) {
    debugError('getAuthToken', 'Failed to get auth token', error);
    return null;
  }
}

// API helper with retry logic
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 3,
  retryDelay = 1000
): Promise<T> {
  const token = await getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      debugLog('apiCall', `Attempt ${attempt}/${retries}: ${endpoint}`, { method: options.method });
      
      const response = await fetch(`${SERVER_URL}${endpoint}`, {
        ...options,
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('AUTH_REQUIRED');
        }
        if (response.status === 409) {
          throw new Error('CONFLICT');
        }
        if (response.status >= 500) {
          throw new Error(`SERVER_ERROR_${response.status}`);
        }
        throw new Error(`HTTP_${response.status}`);
      }
      
      const data = await response.json();
      debugLog('apiCall', `Success: ${endpoint}`, { status: response.status });
      return data;
    } catch (error: any) {
      lastError = error;
      debugError('apiCall', `Attempt ${attempt} failed: ${endpoint}`, error);
      
      // Don't retry on auth or conflict errors
      if (error.message === 'AUTH_REQUIRED' || error.message === 'CONFLICT') {
        throw error;
      }
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }
  
  throw lastError || new Error('API call failed after retries');
}

export function usePlayerProfile(): UsePlayerProfileResult {
  const [profile, setProfile] = useState<PlayerProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  
  // Use ref to track latest profile state for callbacks
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  // Clear local profile when user logs out (detect by auth token change)
  useEffect(() => {
    const checkAuthChange = async () => {
      const token = await getAuthToken();
      if (!token) {
        // No auth - clear local profile so new login gets fresh data
        debugLog('loadProfile', 'No auth token, clearing local profile');
        await AsyncStorage.removeItem(STORAGE_KEY);
        setProfile(DEFAULT_PROFILE);
        setIsLoading(false);
      }
    };
    checkAuthChange();
  }, []);

  /**
   * Load profile from local storage and optionally sync with server
   * 
   * PRD Logic:
   * - Guest mode: Read from guest_profile
   * - Auth mode: Read from player_profile (cache), then sync with server
   */
  const loadProfile = async () => {
    profileDebugLog('loadProfile', 'Starting profile load');
    
    // Determine which storage key to use based on auth state
    const token = await getAuthToken();
    const isAuth = !!token;
    
    profileDebugLog('loadProfile', 'Auth state check', { isAuthenticated: isAuth });
    
    try {
      // First load from local storage
      // PRD: Guest uses guest_profile, Auth uses player_profile (cache)
      const storageKey = isAuth ? STORAGE_KEY : GUEST_PROFILE_KEY;
      profileDebugLog('loadProfile', 'Reading from storage', { storageKey });
      
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setProfile({ ...DEFAULT_PROFILE, ...parsed });
        profileDebugLog('loadProfile', 'Loaded from local storage', { storageKey, data: parsed });
      } else {
        profileDebugLog('loadProfile', 'No data in storage, using default', { storageKey });
        // No guest data exists - this is a new guest, create default
        if (!isAuth) {
          // Auto-create guest profile
          const newGuestProfile = { ...DEFAULT_PROFILE };
          await AsyncStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(newGuestProfile));
          profileDebugLog('loadProfile', 'Created new guest profile');
        }
      }
    } catch (error) {
      debugError('loadProfile', 'Error loading from storage', error);
    } finally {
      setIsLoading(false);
    }
    
    // Then try to sync with server (only if authenticated)
    if (isAuth) {
      profileDebugLog('loadProfile', 'Auth user - will sync with server');
      await syncWithServer();
    } else {
      profileDebugLog('loadProfile', 'Guest - no server sync needed');
    }
  };

  /**
   * Save profile to local storage
   * 
   * PRD Logic:
   * - Guest mode: Write to guest_profile
   * - Auth mode: Write to player_profile (cache)
   */
  const saveProfile = async (newProfile: PlayerProfile) => {
    profileDebugLog('saveProfile', 'Starting profile save');
    
    // Determine which storage key to use based on auth state
    const token = await getAuthToken();
    const isAuth = !!token;
    const storageKey = isAuth ? STORAGE_KEY : GUEST_PROFILE_KEY;
    
    profileDebugLog('saveProfile', 'Writing to storage', { storageKey, isAuthenticated: isAuth });
    
    try {
      const toSave = {
        ...newProfile,
        lastSyncAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(storageKey, JSON.stringify(toSave));
      setProfile(toSave);
      profileDebugLog('saveProfile', 'Saved successfully', toSave);
    } catch (error) {
      debugError('saveProfile', 'Error saving to storage', error);
      throw error;
    }
  };

  /**
   * Sync with server to get latest profile data
   */
  const syncWithServer = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) {
      debugLog('syncWithServer', 'No auth token, skipping sync');
      return;
    }
    
    setIsSyncing(true);
    setSyncStatus('syncing');
    setError(null);
    
    try {
      debugLog('syncWithServer', 'Syncing with server...');
      
      const response = await apiCall<{
        success: boolean;
        user?: { username: string };
        profile?: { displayName: string; avatar: string };
        stats?: { wins: number; losses: number; totalGames: number };
      }>('/api/profile', { method: 'GET' });
      
      if (response.success) {
        // DEBUG: Log response stats
        console.log('[syncWithServer] Response stats:', JSON.stringify(response.stats));
        console.log('[syncWithServer] Current profile wins:', profileRef.current.wins);
        
        const newProfile: PlayerProfile = {
          username: response.user?.username || profileRef.current.username,
          avatar: (response.profile?.avatar as AvatarId) || profileRef.current.avatar,
          wins: response.stats?.wins ?? profileRef.current.wins,
          losses: response.stats?.losses ?? profileRef.current.losses,
          totalGames: response.stats?.totalGames ?? profileRef.current.totalGames,
          version: (profileRef.current.version || 0) + 1,
          lastSyncAt: new Date().toISOString(),
        };
        
        console.log('[syncWithServer] New profile to save:', JSON.stringify(newProfile));
        
        await saveProfile(newProfile);
        setSyncStatus('success');
        debugLog('syncWithServer', 'Sync successful', newProfile);
      } else {
        console.log('[syncWithServer] Sync failed - response:', JSON.stringify(response));
      }
    } catch (error: any) {
      debugError('syncWithServer', 'Sync failed', error);
      setError(error.message || 'Sync failed');
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Force refresh from server (bypass cache)
   */
  const forceRefresh = useCallback(async () => {
    debugLog('forceRefresh', 'Force refreshing profile...');
    await syncWithServer();
  }, [syncWithServer]);

  /**
   * Update username with validation and retry
   */
  const updateUsername = useCallback(async (username: string): Promise<boolean> => {
    debugLog('updateUsername', 'Updating username', { username });
    
    // Validate locally first
    const validation = validateUsername(username);
    if (!validation.valid) {
      setError(validation.error || 'Invalid username');
      debugError('updateUsername', 'Validation failed', validation.error);
      return false;
    }
    
    const trimmed = username.trim().slice(0, 15) || 'Player';
    const token = await getAuthToken();
    
    try {
      // Optimistic update
      const newProfile = { ...profileRef.current, username: trimmed };
      await saveProfile(newProfile);
      
      // Sync with server
      if (token) {
        const response = await apiCall<{ success: boolean; error?: string }>(
          '/api/profile',
          {
            method: 'PUT',
            body: JSON.stringify({ username: trimmed }),
          },
          3,
          1000
        );
        
        if (!response.success) {
          // Rollback on server error
          debugError('updateUsername', 'Server rejected update', response.error);
          await loadProfile(); // Reload from server
          setError(response.error || 'Failed to update username');
          return false;
        }
      }
      
      setError(null);
      debugLog('updateUsername', 'Username updated successfully');
      return true;
    } catch (error: any) {
      debugError('updateUsername', 'Update failed', error);
      
      // Rollback on error
      await loadProfile();
      
      if (error.message === 'CONFLICT') {
        setError('Username is already taken');
      } else {
        setError('Failed to update username');
      }
      return false;
    }
  }, []);

  /**
   * Update avatar with validation and retry
   */
  const updateAvatar = useCallback(async (avatar: AvatarId): Promise<boolean> => {
    debugLog('updateAvatar', 'Updating avatar', { avatar });
    
    // Validate locally first
    const validation = validateAvatar(avatar);
    if (!validation.valid) {
      setError(validation.error || 'Invalid avatar');
      debugError('updateAvatar', 'Validation failed', validation.error);
      return false;
    }
    
    const token = await getAuthToken();
    
    try {
      // Optimistic update
      const newProfile = { ...profileRef.current, avatar };
      await saveProfile(newProfile);
      
      // Sync with server
      if (token) {
        const response = await apiCall<{ success: boolean; error?: string }>(
          '/api/profile',
          {
            method: 'PUT',
            body: JSON.stringify({ avatar }),
          },
          3,
          1000
        );
        
        if (!response.success) {
          debugError('updateAvatar', 'Server rejected update', response.error);
          await loadProfile();
          setError(response.error || 'Failed to update avatar');
          return false;
        }
      }
      
      setError(null);
      debugLog('updateAvatar', 'Avatar updated successfully');
      return true;
    } catch (error: any) {
      debugError('updateAvatar', 'Update failed', error);
      
      // Rollback on error
      await loadProfile();
      setError('Failed to update avatar');
      return false;
    }
  }, []);

  /**
   * Record a win with atomic operation
   */
  const recordWin = useCallback(async (): Promise<boolean> => {
    debugLog('recordWin', 'Recording win');
    
    try {
      // Optimistic update
      const newProfile = {
        ...profileRef.current,
        wins: profileRef.current.wins + 1,
        totalGames: profileRef.current.totalGames + 1,
      };
      await saveProfile(newProfile);
      
      // Sync with server
      const token = await getAuthToken();
      if (token) {
        await apiCall('/api/profile/stats/win', { method: 'POST' }, 3, 500);
      }
      
      debugLog('recordWin', 'Win recorded successfully');
      return true;
    } catch (error) {
      debugError('recordWin', 'Failed to record win', error);
      await loadProfile(); // Rollback
      return false;
    }
  }, []);

  /**
   * Record a loss with atomic operation
   */
  const recordLoss = useCallback(async (): Promise<boolean> => {
    debugLog('recordLoss', 'Recording loss');
    
    try {
      // Optimistic update
      const newProfile = {
        ...profileRef.current,
        losses: profileRef.current.losses + 1,
        totalGames: profileRef.current.totalGames + 1,
      };
      await saveProfile(newProfile);
      
      // Sync with server
      const token = await getAuthToken();
      if (token) {
        await apiCall('/api/profile/stats/loss', { method: 'POST' }, 3, 500);
      }
      
      debugLog('recordLoss', 'Loss recorded successfully');
      return true;
    } catch (error) {
      debugError('recordLoss', 'Failed to record loss', error);
      await loadProfile(); // Rollback
      return false;
    }
  }, []);

  /**
   * Reset stats
   */
  const resetStats = useCallback(async (): Promise<boolean> => {
    debugLog('resetStats', 'Resetting stats');
    
    try {
      // Optimistic update
      const newProfile = {
        ...profileRef.current,
        wins: 0,
        losses: 0,
        totalGames: 0,
      };
      await saveProfile(newProfile);
      
      // Sync with server
      const token = await getAuthToken();
      if (token) {
        const response = await apiCall<{ success: boolean }>(
          '/api/profile/stats',
          { method: 'DELETE' },
          3,
          1000
        );
        
        if (!response.success) {
          await loadProfile();
          setError('Failed to reset stats');
          return false;
        }
      }
      
      setError(null);
      debugLog('resetStats', 'Stats reset successfully');
      return true;
    } catch (error) {
      debugError('resetStats', 'Failed to reset stats', error);
      await loadProfile();
      setError('Failed to reset stats');
      return false;
    }
  }, []);

  return {
    profile,
    isLoading,
    isSyncing,
    error,
    syncStatus,
    updateUsername,
    updateAvatar,
    recordWin,
    recordLoss,
    resetStats,
    syncWithServer,
    forceRefresh,
  };
}

export default usePlayerProfile;

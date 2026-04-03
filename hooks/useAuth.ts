/**
 * useAuth Hook
 * Handles authentication state and session management
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get the socket URL from environment or use default
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const API_BASE = SOCKET_URL;

interface User {
  _id: string;
  username: string;
  email: string;
  avatar: string;
  createdAt: string;
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token?: string | null;
}

interface AuthFunctions {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  verifySession: () => Promise<boolean>;
}

// DEBUG: Add diagnostic logging for hybrid storage flow
const AUTH_STORAGE_KEY = 'casino_auth_user';
const TOKEN_STORAGE_KEY = 'casino_auth_token';

// PRD Keys - Guest Mode
const GUEST_PROFILE_KEY = 'guest_profile';
const GUEST_GAME_PROGRESS_KEY = 'guest_game_progress';

// PRD Keys - Authenticated Cache
const AUTH_CACHE_PROFILE_KEY = 'auth_cache_profile';
const AUTH_CACHE_PROGRESS_KEY = 'auth_cache_progress';

function debugLog(tag: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [HybridStorage:${tag}] ${message}`, data || '');
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    debugLog('loadSession', 'Starting session load');
    try {
      const storedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      debugLog('loadSession', 'Checking storage', { hasUser: !!storedUser, hasToken: !!storedToken });
      
      if (storedUser) {
        const user = JSON.parse(storedUser);
        // Verify the session is still valid
        const isValid = await verifySessionServer(user._id);
        if (isValid) {
          setAuthState({
            user,
            token: storedToken,
            isLoading: false,
            isAuthenticated: true,
          });
          return;
        }
      }
    } catch (error) {
      console.error('[Auth] Error loading session:', error);
    }
    
    setAuthState({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  const verifySessionServer = async (userId: string): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token) {
        debugLog('verifySessionServer', 'No token found');
        return false;
      }

      const response = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      debugLog('verifySessionServer', 'Verify response', { success: data.success });
      return data.success === true;
    } catch (error) {
      debugLog('verifySessionServer', 'Verify failed', error);
      return false;
    }
  };

  const login: AuthFunctions['login'] = async (username, password) => {
    debugLog('login', 'Starting login flow', { username });
    try {
      // DEBUG: Check for guest data before login
      const guestProfileRaw = await AsyncStorage.getItem(GUEST_PROFILE_KEY);
      const guestProgressRaw = await AsyncStorage.getItem(GUEST_GAME_PROGRESS_KEY);
      
      const guestProfile = guestProfileRaw ? JSON.parse(guestProfileRaw) : null;
      const guestGameProgress = guestProgressRaw ? JSON.parse(guestProgressRaw) : null;
      
      debugLog('login', 'Guest data check before login', { 
        hasGuestProfile: !!guestProfile, 
        hasGuestProgress: !!guestGameProgress,
        guestProfile: guestProfile ? { wins: guestProfile.wins, losses: guestProfile.losses } : null
      });

      // Send guest data along with login credentials for merging
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username, 
          password,
          guestProfile: guestProfile ? JSON.stringify(guestProfile) : null,
          guestGameProgress: guestGameProgress ? JSON.stringify(guestGameProgress) : null
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store user and token in AsyncStorage
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
        if (data.token) {
          await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        }
        
        // PRD: After successful login, clear guest data (US-02)
        // This ensures no cross-account data leaks
        if (guestProfile || guestGameProgress) {
          debugLog('login', 'Clearing guest data after successful login');
          await AsyncStorage.removeItem(GUEST_PROFILE_KEY);
          await AsyncStorage.removeItem(GUEST_GAME_PROGRESS_KEY);
          debugLog('login', 'Guest data cleared successfully');
        }
        
        // If merged stats were returned, save to local cache
        if (data.mergedStats) {
          debugLog('login', 'Guest data was merged', data.mergedStats);
          // The usePlayerProfile hook will fetch fresh data from server on next load
        }
        
        setAuthState({
          user: data.user,
          token: data.token,
          isLoading: false,
          isAuthenticated: true,
        });
        
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('[Auth] Login error:', error);
      return { success: false, error: 'Unable to connect. Please try again.' };
    }
  };

  const register: AuthFunctions['register'] = async (username, email, password) => {
    debugLog('register', 'Starting registration flow', { username, email });
    try {
      // DEBUG: Check for guest data before registration
      const guestProfileRaw = await AsyncStorage.getItem(GUEST_PROFILE_KEY);
      const guestProgressRaw = await AsyncStorage.getItem(GUEST_GAME_PROGRESS_KEY);
      
      const guestProfile = guestProfileRaw ? JSON.parse(guestProfileRaw) : null;
      const guestGameProgress = guestProgressRaw ? JSON.parse(guestProgressRaw) : null;
      
      debugLog('register', 'Guest data check before registration', { 
        hasGuestProfile: !!guestProfile, 
        hasGuestProgress: !!guestGameProgress,
        guestProfile: guestProfile ? { wins: guestProfile.wins, losses: guestProfile.losses, avatar: guestProfile.avatar } : null
      });

      // Send guest data along with registration for merging
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username, 
          email, 
          password,
          guestProfile: guestProfile ? JSON.stringify(guestProfile) : null,
          guestGameProgress: guestGameProgress ? JSON.stringify(guestGameProgress) : null
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store user and token in AsyncStorage
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
        if (data.token) {
          await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        }
        
        // PRD: After successful registration, clear guest data (US-02)
        // This ensures no cross-account data leaks
        if (guestProfile || guestGameProgress) {
          debugLog('register', 'Clearing guest data after successful registration');
          await AsyncStorage.removeItem(GUEST_PROFILE_KEY);
          await AsyncStorage.removeItem(GUEST_GAME_PROGRESS_KEY);
          debugLog('register', 'Guest data cleared successfully');
        }
        
        setAuthState({
          user: data.user,
          token: data.token,
          isLoading: false,
          isAuthenticated: true,
        });
        
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('[Auth] Register error:', error);
      return { success: false, error: 'Unable to connect. Please try again.' };
    }
  };

  const logout: AuthFunctions['logout'] = async () => {
    debugLog('logout', 'Starting logout - clearing all caches');
    try {
      // DEBUG: Log what we're clearing
      debugLog('logout', 'Clearing auth storage', { AUTH_STORAGE_KEY, TOKEN_STORAGE_KEY });
      
      // Clear all auth data
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      
      // DEBUG: Log cache clearing
      debugLog('logout', 'Clearing player caches');
      
      // Clear player profile data (new user should start fresh)
      await AsyncStorage.removeItem('player_profile');
      await AsyncStorage.removeItem('server_profile_cache');
      await AsyncStorage.removeItem('leaderboard_cache_2h');
      await AsyncStorage.removeItem('leaderboard_cache_3h');
      await AsyncStorage.removeItem('leaderboard_cache_4h');
      await AsyncStorage.removeItem('leaderboard_cache_4hp');
      await AsyncStorage.removeItem('leaderboard_cache_4hk');
      
      // DEBUG: Clear PRD-specific keys
      await AsyncStorage.removeItem(GUEST_PROFILE_KEY);
      await AsyncStorage.removeItem(GUEST_GAME_PROGRESS_KEY);
      await AsyncStorage.removeItem(AUTH_CACHE_PROFILE_KEY);
      await AsyncStorage.removeItem(AUTH_CACHE_PROGRESS_KEY);
      
      debugLog('logout', 'All caches cleared successfully');
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    }
    
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  const verifySession: AuthFunctions['verifySession'] = async () => {
    if (!authState.user) return false;
    
    try {
      // Get token from storage
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      
      const response = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('[Auth] Verify session error:', error);
      return false;
    }
  };

  // Get token from storage (for use in other hooks)
  const getToken = async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error('[Auth] Get token error:', error);
      return null;
    }
  };

  return {
    ...authState,
    login,
    register,
    logout,
    verifySession,
    getToken,
  };
}

export default useAuth;

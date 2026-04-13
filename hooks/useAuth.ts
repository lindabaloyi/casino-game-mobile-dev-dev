/**
 * useAuth Hook
 * Handles authentication state and session management
 * Single source of truth: MongoDB via HTTP-only cookies
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

interface AuthFunctions {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  verifySession: () => Promise<boolean>;
}

const GUEST_PROFILE_KEY = 'guest_profile';
const GUEST_GAME_PROGRESS_KEY = 'guest_game_progress';

function debugLog(tag: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Auth:${tag}] ${message}`, data || '');
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    debugLog('loadSession', 'Starting session load');
    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        debugLog('loadSession', 'Session loaded', { userId: data.user?._id });
        setAuthState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }

      debugLog('loadSession', 'Not authenticated', { status: response.status });
    } catch (error) {
      debugLog('loadSession', 'Network error, falling back to guest', { error });
    }

    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const verifySessionServer = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAuthState(prev => ({
          ...prev,
          user: data.user,
          isAuthenticated: true,
        }));
        return true;
      }

      return false;
    } catch (error) {
      debugLog('verifySessionServer', 'Failed', error);
      return false;
    }
  };

  const login: AuthFunctions['login'] = async (username, password) => {
    debugLog('login', 'Starting login', { username });
    try {
      const guestProfileRaw = await AsyncStorage.getItem(GUEST_PROFILE_KEY);
      const guestProgressRaw = await AsyncStorage.getItem(GUEST_GAME_PROGRESS_KEY);

      const guestProfile = guestProfileRaw ? JSON.parse(guestProfileRaw) : null;
      const guestGameProgress = guestProgressRaw ? JSON.parse(guestProgressRaw) : null;

      debugLog('login', 'Guest data check', {
        hasGuestProfile: !!guestProfile,
        hasGuestProgress: !!guestGameProgress,
      });

      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username,
          password,
          guestProfile: guestProfile ? JSON.stringify(guestProfile) : null,
          guestGameProgress: guestGameProgress ? JSON.stringify(guestGameProgress) : null
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (guestProfile || guestGameProgress) {
          debugLog('login', 'Clearing guest data after login');
          await AsyncStorage.removeItem(GUEST_PROFILE_KEY);
          await AsyncStorage.removeItem(GUEST_GAME_PROGRESS_KEY);
        }

        setAuthState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
        });

        debugLog('login', 'Success', { userId: data.user._id });
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
    debugLog('register', 'Starting registration', { username, email });
    try {
      const guestProfileRaw = await AsyncStorage.getItem(GUEST_PROFILE_KEY);
      const guestProgressRaw = await AsyncStorage.getItem(GUEST_GAME_PROGRESS_KEY);

      const guestProfile = guestProfileRaw ? JSON.parse(guestProfileRaw) : null;
      const guestGameProgress = guestProgressRaw ? JSON.parse(guestProgressRaw) : null;

      debugLog('register', 'Guest data check', {
        hasGuestProfile: !!guestProfile,
        hasGuestProgress: !!guestGameProgress,
      });

      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
        if (guestProfile || guestGameProgress) {
          debugLog('register', 'Clearing guest data after registration');
          await AsyncStorage.removeItem(GUEST_PROFILE_KEY);
          await AsyncStorage.removeItem(GUEST_GAME_PROGRESS_KEY);
        }

        setAuthState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
        });

        debugLog('register', 'Success', { userId: data.user._id });
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
    debugLog('logout', 'Starting logout');
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      debugLog('logout', 'Network error', error);
    }

    try {
      await AsyncStorage.removeItem('player_profile');
      await AsyncStorage.removeItem('server_profile_cache');
      await AsyncStorage.removeItem('leaderboard_cache_2h');
      await AsyncStorage.removeItem('leaderboard_cache_3h');
      await AsyncStorage.removeItem('leaderboard_cache_4h');
      await AsyncStorage.removeItem('leaderboard_cache_4hp');
      await AsyncStorage.removeItem('leaderboard_cache_4hk');
      await AsyncStorage.removeItem(GUEST_PROFILE_KEY);
      await AsyncStorage.removeItem(GUEST_GAME_PROGRESS_KEY);
    } catch (error) {
      debugLog('logout', 'Storage clear error', error);
    }

    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    debugLog('logout', 'Complete');
  };

  const verifySession: AuthFunctions['verifySession'] = async () => {
    return verifySessionServer();
  };

  return {
    ...authState,
    login,
    register,
    logout,
    verifySession,
  };
}

export default useAuth;
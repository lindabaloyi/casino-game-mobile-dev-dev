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

const AUTH_STORAGE_KEY = 'casino_auth_user';
const TOKEN_STORAGE_KEY = 'casino_auth_token';

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
    try {
      const storedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      
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
      // For now, just check if user exists in local storage
      // In production, you'd verify with the server
      return true;
    } catch (error) {
      return false;
    }
  };

  const login: AuthFunctions['login'] = async (username, password) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store user and token in AsyncStorage
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
        if (data.token) {
          await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        }
        
        setAuthState({
          user: data.user,
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
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store user and token in AsyncStorage
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
        if (data.token) {
          await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        }
        
        setAuthState({
          user: data.user,
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
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
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

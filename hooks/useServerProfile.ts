/**
 * useServerProfile Hook
 * 
 * Fetches live player profile data from the server with:
 * - Data caching with configurable TTL
 * - Auto-refresh on interval
 * - Pull-to-refresh support
 * - Loading, error, and empty states
 * - Optimistic updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const CACHE_KEY = 'server_profile_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Extended profile data from server
export interface ServerProfileData {
  // User info
  user: {
    _id: string;
    username: string;
    avatar: string;
    createdAt: string;
  };
  
  // Profile info
  profile: {
    displayName: string;
    avatar: string;
    bio: string;
    preferences: {
      notifications: boolean;
      soundEffects: boolean;
      hapticFeedback: boolean;
      theme: string;
    };
    friends: number;
    version: number;
    createdAt: string;
    updatedAt: string;
  };
  
  // Stats
  stats: {
    wins: number;
    losses: number;
    totalGames: number;
    winRate: number;
    rank: number | null;
    lastGameAt: string | null;
  };
  
  // Server timestamp
  serverTime: string;
}

export interface UseServerProfileResult {
  // Data
  profileData: ServerProfileData | null;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isSyncing: boolean;
  
  // Error state
  error: string | null;
  
  // Data availability
  hasData: boolean;
  isStale: boolean;
  
  // Actions
  refresh: () => Promise<void>;
  forceRefresh: () => Promise<void>;
  updateProfile: (updates: Partial<ServerProfileData>) => Promise<boolean>;
  
  // Cache management
  clearCache: () => Promise<void>;
}

// Get auth token
async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('casino_auth_token');
  } catch {
    return null;
  }
}

// API helper
async function fetchServerProfile(): Promise<ServerProfileData | null> {
  const token = await getAuthToken();
  if (!token) return null;
  
  try {
    const response = await fetch(`${SERVER_URL}/api/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Auth expired, clear token
        await AsyncStorage.removeItem('casino_auth_token');
      }
      return null;
    }
    
    const data = await response.json();
    if (data.success) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

// Cache management
async function getCache(): Promise<{ data: ServerProfileData; timestamp: number } | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}
  return null;
}

async function setCache(data: ServerProfileData): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {}
}

async function clearCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {}
}

export function useServerProfile(): UseServerProfileResult {
  const [profileData, setProfileData] = useState<ServerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check if data is stale
  const isStale = lastFetchTime ? Date.now() - lastFetchTime > CACHE_TTL : true;
  
  // Load profile data
  const loadProfile = useCallback(async (showLoading = true, forceRefresh = false) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    
    try {
      // Try to get cached data first (skip cache on force refresh)
      if (!forceRefresh) {
        const cache = await getCache();
        if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
          setProfileData(cache.data);
          setLastFetchTime(cache.timestamp);
          setIsLoading(false);
          
          // Still fetch fresh data in background if cache is stale
          if (Date.now() - cache.timestamp > CACHE_TTL / 2) {
            fetchFreshData();
          }
          return;
        }
      }
      
      // Fetch from server
      await fetchFreshData();
    } catch (err) {
      setError('Failed to load profile data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);
  
  // Fetch fresh data from server
  const fetchFreshData = useCallback(async () => {
    const data = await fetchServerProfile();
    if (data) {
      setProfileData(data);
      setLastFetchTime(Date.now());
      await setCache(data);
    }
    return data;
  }, []);
  
  // Refresh handler
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadProfile(false, true);
  }, [loadProfile]);
  
  // Force refresh (bypass cache completely)
  const forceRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setIsSyncing(true);
    await clearCache();
    await loadProfile(false, true);
    setIsSyncing(false);
  }, [loadProfile]);
  
  // Update profile on server
  const updateProfile = useCallback(async (updates: Partial<ServerProfileData>): Promise<boolean> => {
    const token = await getAuthToken();
    if (!token) {
      setError('Not authenticated');
      return false;
    }
    
    setIsSyncing(true);
    setError(null);
    
    try {
      const response = await fetch(`${SERVER_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update profile');
        return false;
      }
      
      // Refresh data after update
      await refresh();
      return true;
    } catch (err) {
      setError('Failed to update profile');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [refresh]);
  
  // Clear cache
  const clearCacheFn = useCallback(async () => {
    await clearCache();
    setProfileData(null);
    setLastFetchTime(null);
  }, []);
  
  // Initial load
  useEffect(() => {
    loadProfile(true, false);
    
    // Set up auto-refresh interval
    refreshIntervalRef.current = setInterval(() => {
      if (!isLoading && profileData) {
        fetchFreshData();
      }
    }, CACHE_TTL);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);
  
  return {
    profileData,
    isLoading,
    isRefreshing,
    isSyncing,
    error,
    hasData: !!profileData,
    isStale,
    refresh,
    forceRefresh,
    updateProfile,
    clearCache: clearCacheFn,
  };
}

export default useServerProfile;

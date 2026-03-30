/**
 * useLeaderboard Hook
 * 
 * Fetches live leaderboard data from the server with:
 * - Data caching with shorter TTL (2 minutes)
 * - Game mode filtering support
 * - Pull-to-refresh support
 * - Loading, error, and empty states
 * - Pagination support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const CACHE_KEY = 'leaderboard_cache';
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Leaderboard entry type
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  wins: number;
  totalGames: number;
  winRate: number;
}

// Leaderboard response type
export interface LeaderboardResponse {
  success: boolean;
  leaderboard: LeaderboardEntry[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  serverTime: string;
}

export interface UseLeaderboardResult {
  // Data
  leaderboard: LeaderboardEntry[];
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  
  // Error state
  error: string | null;
  
  // Data availability
  hasData: boolean;
  isEmpty: boolean;
  
  // Actions
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  
  // Pagination state
  hasMore: boolean;
  isLoadingMore: boolean;
}

// Game modes supported
export type GameMode = '2h' | '3h' | '4h' | '4hp' | '4hk';

// Get cache key for specific game mode
function getCacheKey(mode: GameMode): string {
  return `${CACHE_KEY}_${mode}`;
}

// API helper
async function fetchLeaderboard(
  mode: GameMode, 
  limit = 10, 
  offset = 0
): Promise<LeaderboardResponse | null> {
  try {
    const response = await fetch(
      `${SERVER_URL}/api/profile/leaderboard?mode=${mode}&limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch {
    return null;
  }
}

// Cache management
async function getCache(mode: GameMode): Promise<{ data: LeaderboardEntry[]; timestamp: number } | null> {
  try {
    const key = getCacheKey(mode);
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}
  return null;
}

async function setCache(mode: GameMode, data: LeaderboardEntry[]): Promise<void> {
  try {
    const key = getCacheKey(mode);
    await AsyncStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {}
}

export function useLeaderboard(mode: GameMode = '2h'): UseLeaderboardResult {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentModeRef = useRef(mode);
  
  // Keep track of current mode
  useEffect(() => {
    currentModeRef.current = mode;
  }, [mode]);
  
  // Load leaderboard data
  const loadLeaderboard = useCallback(async (showLoading = true, forceRefresh = false) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    
    try {
      // Try to get cached data first (skip cache on force refresh)
      if (!forceRefresh) {
        const cache = await getCache(currentModeRef.current);
        if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
          setLeaderboard(cache.data);
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
      const data = await fetchLeaderboard(currentModeRef.current);
      
      if (data && data.success) {
        setLeaderboard(data.leaderboard);
        setHasMore(data.pagination?.hasMore || false);
        setLastFetchTime(Date.now());
        await setCache(currentModeRef.current, data.leaderboard);
      } else {
        setError('Failed to load leaderboard');
      }
    } catch (err) {
      setError('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);
  
  // Fetch fresh data from server
  const fetchFreshData = useCallback(async () => {
    const data = await fetchLeaderboard(currentModeRef.current);
    if (data && data.success) {
      setLeaderboard(data.leaderboard);
      setHasMore(data.pagination?.hasMore || false);
      setLastFetchTime(Date.now());
      await setCache(currentModeRef.current, data.leaderboard);
    }
    return data;
  }, []);
  
  // Refresh handler
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadLeaderboard(false, true);
  }, [loadLeaderboard]);
  
  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    
    try {
      const offset = leaderboard.length;
      const data = await fetchLeaderboard(currentModeRef.current, 10, offset);
      
      if (data && data.success) {
        const newEntries = data.leaderboard;
        setLeaderboard(prev => [...prev, ...newEntries]);
        setHasMore(data.pagination?.hasMore || false);
      }
    } catch (err) {
      // Silent fail for load more
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, leaderboard.length]);
  
  // Initial load
  useEffect(() => {
    loadLeaderboard(true, false);
    
    // Set up auto-refresh interval (shorter for leaderboard)
    refreshIntervalRef.current = setInterval(() => {
      if (!isLoading && leaderboard.length > 0) {
        fetchFreshData();
      }
    }, CACHE_TTL);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [mode]); // Re-run when mode changes
  
  return {
    leaderboard,
    isLoading,
    isRefreshing,
    error,
    hasData: leaderboard.length > 0,
    isEmpty: !isLoading && leaderboard.length === 0 && !error,
    refresh,
    loadMore,
    hasMore,
    isLoadingMore,
  };
}

export default useLeaderboard;

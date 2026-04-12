/**
 * usePlayerStats Hook
 * Fetches and manages player statistics from the server
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { GAME_MODE_KEYS } from '../shared/config/gameModes';

// Get the socket URL from environment or use default
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const API_BASE = SOCKET_URL;

// Mode stats structure
export interface ModeStats {
  games: number;
  wins: number;
  losses: number;
}

export interface PlayerStatsData {
  _id: string;
  userId: string;
  totalGames: number;
  wins: number;
  losses: number;
  modeStats: Record<typeof GAME_MODE_KEYS[number], ModeStats>;
  totalPointsKept: number;
  pointRetentionPerGame: number;
  acesKept: number;
  tenDiamondsKept: number;
  twoSpadesKept: number;
  spadesCountKept: number;
  spadesBonusCount: number;
  cardCountBonus20: number;
  cardCountBonus21: number;
  motoTrophyCount: number;
  createdAt: string;
  updatedAt: string;
}

interface UsePlayerStatsResult {
  stats: PlayerStatsData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePlayerStats(): UsePlayerStatsResult {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<PlayerStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get auth token from AsyncStorage
  const getAuthToken = async (): Promise<string | null> => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('casino_auth_token');
      if (!token) {
        console.warn('[usePlayerStats] No auth token found');
      }
      return token;
    } catch (err) {
      console.error('[usePlayerStats] Error getting token:', err);
      return null;
    }
  };

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated || !user?._id) {
      setStats(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`${API_BASE}/api/stats/player`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch player stats');
      }

      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      } else {
        throw new Error(data.error || 'Failed to fetch stats');
      }
    } catch (err) {
      console.error('[usePlayerStats] Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?._id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats
  };
}

export default usePlayerStats;
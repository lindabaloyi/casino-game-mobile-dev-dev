/**
 * useUserSearch Hook
 * Searches for users by username
 */

import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

// Get the socket URL from environment or use default
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const API_BASE = SOCKET_URL;

export interface SearchResult {
  _id: string;
  username: string;
  avatar: string;
  createdAt: string;
  stats?: {
    totalGames: number;
    wins: number;
    losses: number;
    rank: number | null;
  };
}

interface UseUserSearchResult {
  searchResults: SearchResult[];
  isSearching: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sendFriendRequest: (userId: string) => Promise<{ success: boolean; error?: string }>;
}

export function useUserSearch(): UseUserSearchResult {
  const { user } = useAuth();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const search = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/users/search?q=${encodeURIComponent(query.trim())}&limit=10`
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      
      // Filter out current user from results
      const filteredResults = data.users?.filter(
        (u: SearchResult) => u._id !== user?._id
      ) || [];
      
      setSearchResults(filteredResults);
    } catch (err) {
      console.error('[useUserSearch] Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [user?._id]);

  const clearResults = useCallback(() => {
    setSearchResults([]);
    setError(null);
  }, []);

  // Send friend request
  const sendFriendRequest = useCallback(async (userId: string) => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      // Get the JWT token from correct storage key
      const token = await AsyncStorage.getItem('casino_auth_token');
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${API_BASE}/api/friends/request/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      return data.success ? { success: true } : { success: false, error: data.error };
    } catch (err) {
      console.error('[useUserSearch] Send friend request error:', err);
      return { success: false, error: 'Failed to send request' };
    }
  }, []);

  return {
    searchResults,
    isSearching,
    error,
    search,
    clearResults,
    searchQuery,
    setSearchQuery,
    sendFriendRequest
  };
}

export default useUserSearch;

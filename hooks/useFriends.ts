/**
 * useFriends Hook
 * Manages friend relationships - friends list, requests, and actions
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

// Get the socket URL from environment or use default
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const API_BASE = SOCKET_URL;

export interface Friend {
  _id: string;
  username: string;
  avatar: string;
  createdAt: string;
  stats: {
    totalGames: number;
    wins: number;
    losses: number;
    rank: number | null;
  };
}

export interface FriendRequest {
  _id: string;
  fromUser?: {
    _id: string;
    username: string;
    avatar: string;
  };
  toUser?: {
    _id: string;
    username: string;
    avatar: string;
  };
  status: 'pending';
  createdAt: string;
  isIncoming: boolean;
}

interface FriendsRequests {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}

interface UseFriendsResult {
  friends: Friend[];
  pendingRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  sendRequest: (userId: string) => Promise<{ success: boolean; error?: string }>;
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useFriends(): UseFriendsResult {
  const { user, isAuthenticated } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    if (!isAuthenticated || !user?._id) {
      setFriends([]);
      setPendingRequests([]);
      setSentRequests([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Fetch friends list
      const friendsResponse = await fetch(`${API_BASE}/api/friends`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!friendsResponse.ok) {
        throw new Error('Failed to fetch friends');
      }
      
      const friendsData = await friendsResponse.json();
      setFriends(friendsData.friends || []);

      // Fetch pending requests
      console.log('[useFriends] 📥 Fetching requests from API...');
      const requestsResponse = await fetch(`${API_BASE}/api/friends/requests`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('[useFriends] 📥 Requests response status:', requestsResponse.status);
      
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        console.log('[useFriends] 📥 Requests data:', JSON.stringify(requestsData));
        setPendingRequests(requestsData.requests?.incoming || []);
        setSentRequests(requestsData.requests?.outgoing || []);
        console.log('[useFriends] 📥 Set pendingRequests:', requestsData.requests?.incoming?.length || 0);
        console.log('[useFriends] 📥 Set sentRequests:', requestsData.requests?.outgoing?.length || 0);
      } else {
        console.log('[useFriends] ❌ Failed to fetch requests, status:', requestsResponse.status);
      }
    } catch (err) {
      console.error('[useFriends] Error fetching friends:', err);
      setError(err instanceof Error ? err.message : 'Failed to load friends');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?._id]);

  // Get auth token from AsyncStorage
  const getAuthToken = async (): Promise<string | null> => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      // Get the JWT token (not the user object)
      const token = await AsyncStorage.getItem('casino_auth_token');
      if (!token) {
        console.warn('[useFriends] No auth token found');
      }
      return token;
    } catch (err) {
      console.error('[useFriends] Error getting token:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const sendRequest = useCallback(async (userId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.warn('[useFriends] No auth token available');
        return { success: false, error: 'Please log in to send friend requests' };
      }

      console.log('[useFriends] 📤 Sending friend request to:', userId);
      console.log('[useFriends] 🔑 Token being used:', token?.substring(0, 20) + '...');

      const response = await fetch(`${API_BASE}/api/friends/request/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[useFriends] 📥 Response status:', response.status);

      const data = await response.json();

      if (response.status === 401) {
        console.warn('[useFriends] ⚠️ Token expired or invalid - clearing auth');
        // Token expired - clear storage and return specific error
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.removeItem('casino_auth_token');
          await AsyncStorage.removeItem('casino_auth_user');
        } catch (e) { /* ignore */ }
        return { success: false, error: 'Session expired. Please log in again.' };
      }

      if (data.success) {
        // Refresh to show the new pending request
        await fetchFriends();
        return { success: true };
      } else {
        console.warn('[useFriends] Send request failed:', data.error);
        return { success: false, error: data.error || 'Failed to send request' };
      }
    } catch (err) {
      console.error('[useFriends] Error sending request:', err);
      return { success: false, error: 'Failed to send friend request. Please try again.' };
    }
  }, [fetchFriends]);

  const acceptRequest = useCallback(async (requestId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.warn('[useFriends] No auth token for accepting request');
        return;
      }

      const response = await fetch(`${API_BASE}/api/friends/accept/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchFriends();
      } else {
        const data = await response.json();
        console.warn('[useFriends] Accept request failed:', data.error);
      }
    } catch (err) {
      console.error('[useFriends] Error accepting request:', err);
    }
  }, [fetchFriends]);

  const declineRequest = useCallback(async (requestId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.warn('[useFriends] No auth token for declining request');
        return;
      }

      const response = await fetch(`${API_BASE}/api/friends/decline/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchFriends();
      } else {
        const data = await response.json();
        console.warn('[useFriends] Decline request failed:', data.error);
      }
    } catch (err) {
      console.error('[useFriends] Error declining request:', err);
    }
  }, [fetchFriends]);

  const removeFriend = useCallback(async (friendId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE}/api/friends/${friendId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchFriends();
      }
    } catch (err) {
      console.error('[useFriends] Error removing friend:', err);
    }
  }, [fetchFriends]);

  const cancelRequest = useCallback(async (requestId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE}/api/friends/cancel/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchFriends();
      }
    } catch (err) {
      console.error('[useFriends] Error canceling request:', err);
    }
  }, [fetchFriends]);

  const unreadCount = pendingRequests.length;

  return {
    friends,
    pendingRequests,
    sentRequests,
    unreadCount,
    isLoading,
    error,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
    refresh: fetchFriends
  };
}

export default useFriends;

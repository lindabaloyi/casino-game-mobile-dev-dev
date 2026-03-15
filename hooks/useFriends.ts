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
      const requestsResponse = await fetch(`${API_BASE}/api/friends/requests`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setPendingRequests(requestsData.requests?.incoming || []);
        setSentRequests(requestsData.requests?.outgoing || []);
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
      const stored = await AsyncStorage.getItem('casino_auth_user');
      if (stored) {
        const userData = JSON.parse(stored);
        return userData._id; // Using user ID as simple auth for now
      }
    } catch (err) {
      console.error('[useFriends] Error getting token:', err);
    }
    return null;
  };

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const sendRequest = useCallback(async (userId: string) => {
    try {
      const token = await getAuthToken();
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

      if (data.success) {
        // Refresh to show the new pending request
        await fetchFriends();
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to send request' };
      }
    } catch (err) {
      console.error('[useFriends] Error sending request:', err);
      return { success: false, error: 'Failed to send friend request' };
    }
  }, [fetchFriends]);

  const acceptRequest = useCallback(async (requestId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE}/api/friends/accept/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchFriends();
      }
    } catch (err) {
      console.error('[useFriends] Error accepting request:', err);
    }
  }, [fetchFriends]);

  const declineRequest = useCallback(async (requestId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE}/api/friends/decline/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchFriends();
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

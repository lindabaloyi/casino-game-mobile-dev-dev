/**
 * useOpponentInfo Hook
 * 
 * Manages opponent data during a game session.
 * Provides methods to fetch opponent profiles and handle friend actions.
 */

import { useState, useCallback, useEffect } from 'react';
import { useFriends, Friend } from './useFriends';
import { useAuth } from './useAuth';

// Get the socket URL from environment or use default
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const API_BASE = SOCKET_URL;

export interface OpponentInfo {
  playerIndex: number;
  username: string;
  avatar: string;
  userId?: string;
  stats?: {
    wins: number;
    losses: number;
    totalGames: number;
    rank: number | null;
  };
}

interface UseOpponentInfoResult {
  /** Currently selected opponent for profile viewing */
  selectedOpponent: OpponentInfo | null;
  /** Whether opponent profile modal is visible */
  isModalVisible: boolean;
  /** Whether friend request is being sent */
  isLoadingFriendRequest: boolean;
  /** Select an opponent to view their profile */
  selectOpponent: (playerIndex: number, players: any[]) => void;
  /** Close the opponent profile modal */
  closeModal: () => void;
  /** Send friend request to selected opponent */
  sendFriendRequest: () => Promise<{ success: boolean; error?: string }>;
  /** Check if opponent is already a friend */
  isFriend: (userId?: string) => boolean;
  /** Check if there's a pending request to this user */
  isPendingRequest: (userId?: string) => boolean;
}

export function useOpponentInfo(): UseOpponentInfoResult {
  const { user, isAuthenticated } = useAuth();
  const { friends, pendingRequests, sentRequests, sendRequest: sendFriendRequestApi } = useFriends();
  
  const [selectedOpponent, setSelectedOpponent] = useState<OpponentInfo | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoadingFriendRequest, setIsLoadingFriendRequest] = useState(false);

  // Select an opponent to view their profile
  const selectOpponent = useCallback((playerIndex: number, players: any[]) => {
    const player = players[playerIndex];
    
    if (player) {
      // Try to get more info from the player object
      const opponentInfo: OpponentInfo = {
        playerIndex,
        username: player.username || player.name || `Player ${playerIndex + 1}`,
        avatar: player.avatar || 'lion',
        userId: player.userId,
        stats: player.stats ? {
          wins: player.stats.wins || 0,
          losses: player.stats.losses || 0,
          totalGames: player.stats.totalGames || 0,
          rank: player.stats.rank ?? null,
        } : undefined,
      };
      
      setSelectedOpponent(opponentInfo);
      setIsModalVisible(true);
    }
  }, []);

  // Close the modal
  const closeModal = useCallback(() => {
    setIsModalVisible(false);
    setSelectedOpponent(null);
  }, []);

  // Send friend request to selected opponent
  const sendFriendRequest = useCallback(async () => {
    if (!selectedOpponent?.userId) {
      return { success: false, error: 'Cannot find user ID' };
    }

    setIsLoadingFriendRequest(true);
    try {
      const result = await sendFriendRequestApi(selectedOpponent.userId);
      return result;
    } finally {
      setIsLoadingFriendRequest(false);
    }
  }, [selectedOpponent, sendFriendRequestApi]);

  // Check if opponent is already a friend
  const isFriend = useCallback((userId?: string) => {
    if (!userId) return false;
    return friends.some(f => f._id === userId);
  }, [friends]);

  // Check if there's a pending request to this user
  const isPendingRequest = useCallback((userId?: string) => {
    if (!userId) return false;
    // Check outgoing requests
    return sentRequests.some(r => r.toUser?._id === userId);
  }, [sentRequests]);

  return {
    selectedOpponent,
    isModalVisible,
    isLoadingFriendRequest,
    selectOpponent,
    closeModal,
    sendFriendRequest,
    isFriend,
    isPendingRequest,
  };
}

export default useOpponentInfo;

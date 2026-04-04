/**
 * useNotifications Hook
 * Handles real-time notifications via Socket.IO using shared socket
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { getSocket, onSocketStateChange, getCurrentSocket } from './multiplayer/socketManager';

export interface Notification {
  id: string;
  type: 'friend_request' | 'friend_accepted' | 'friend_removed';
  fromUser?: {
    _id: string;
    username: string;
    avatar: string;
  };
  message: string;
  timestamp: string;
  read: boolean;
}

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export function useNotifications(refreshFriends: () => Promise<void> = async () => {}): UseNotificationsResult {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Event handlers
  const friendRequestHandler = useCallback((data: { requestId: string; fromUser: { _id: string; username: string; avatar?: string } }) => {
    const notification: Notification = {
      id: `request-${data.requestId}`,
      type: 'friend_request',
      fromUser: {
        _id: data.fromUser._id,
        username: data.fromUser.username,
        avatar: data.fromUser.avatar || ''
      },
      message: `${data.fromUser.username} sent you a friend request`,
      timestamp: new Date().toISOString(),
      read: false
    };

    setNotifications(prev => [notification, ...prev]);

    // Refresh friends to update pending requests
    refreshFriends();
  }, [refreshFriends]);

  const friendAcceptedHandler = useCallback((data: { friendId: string; friend: { _id: string; username: string; avatar: string } }) => {
    const notification: Notification = {
      id: `accepted-${Date.now()}`,
      type: 'friend_accepted',
      fromUser: data.friend,
      message: `${data.friend.username} accepted your friend request`,
      timestamp: new Date().toISOString(),
      read: false
    };

    setNotifications(prev => [notification, ...prev]);

    // Refresh friends to update friends list
    refreshFriends();
  }, [refreshFriends]);

  const friendRemovedHandler = useCallback((data: { userId: string; username: string }) => {
    const notification: Notification = {
      id: `removed-${Date.now()}`,
      type: 'friend_removed',
      message: `${data.username} removed you from friends`,
      timestamp: new Date().toISOString(),
      read: false
    };

    setNotifications(prev => [notification, ...prev]);

    // Refresh friends to update friends list
    refreshFriends();
  }, [refreshFriends]);

  // Connect to shared socket when user is authenticated
  useEffect(() => {
    if (!user?._id) {
      setIsConnected(false);
      return;
    }

    let attached = false;
    const unsubscribe = onSocketStateChange((connected, sock) => {
      setIsConnected(connected);
      if (connected && sock && !attached) {
        // Attach notification listeners to shared socket (only once)
        sock.on('friend-request', friendRequestHandler);
        sock.on('friend-accepted', friendAcceptedHandler);
        sock.on('friend-removed', friendRemovedHandler);
        attached = true;
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      // Remove listeners from shared socket
      const currentSock = getCurrentSocket();
      if (currentSock) {
        currentSock.off('friend-request', friendRequestHandler);
        currentSock.off('friend-accepted', friendAcceptedHandler);
        currentSock.off('friend-removed', friendRemovedHandler);
      }
    };
  }, [user?._id, friendRequestHandler, friendAcceptedHandler, friendRemovedHandler]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearNotifications
  };
}

export default useNotifications;

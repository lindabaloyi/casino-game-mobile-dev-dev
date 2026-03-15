/**
 * useNotifications Hook
 * Handles real-time notifications via Socket.IO
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

// Get the socket URL from environment or use default
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001';

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
  const socketRef = useRef<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Connect to socket when user is authenticated
  useEffect(() => {
    if (!user?._id) {
      // Disconnect if no user
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Create socket connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Notifications] Connected to socket');
      setIsConnected(true);
      
      // Authenticate with user ID
      socket.emit('authenticate', user._id);
    });

    socket.on('disconnect', () => {
      console.log('[Notifications] Disconnected from socket');
      setIsConnected(false);
    });

    // Friend request received
    socket.on('friend-request', (data: { requestId: string; fromUser: { _id: string; username: string; avatar?: string } }) => {
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
    });

    // Friend request accepted
    socket.on('friend-accepted', (data: { friendId: string; friend: { _id: string; username: string; avatar: string } }) => {
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
    });

    // Friend removed
    socket.on('friend-removed', (data: { userId: string; username: string }) => {
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
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?._id, refreshFriends]);

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

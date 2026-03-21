/**
 * useLobbyMock
 * 
 * Mock lobby data handling hook.
 * In production, this would be replaced with real server data.
 * 
 * Extracted from OnlinePlayScreen for better separation of concerns.
 */

import { useState, useEffect, useRef } from 'react';
import { Animated, Vibration } from 'react-native';
import { AVATAR_OPTIONS } from './usePlayerProfile';
import { ModeConfig } from '../utils/modeConfig';

export interface LobbyPlayer {
  id: string;
  username: string;
  avatar: string;
  isReady: boolean;
  isConnected: boolean;
  ping: number;
}

interface ServerLobbyPlayer {
  userId: string;
  username: string;
  avatar: string;
  displayName: string;
}

interface UseLobbyMockProps {
  modeConfig: ModeConfig;
  playersInLobby: number;
  profile: {
    username?: string;
    avatar: string;
    userId?: string;
  };
  serverLobbyPlayers?: ServerLobbyPlayer[];
  initialReady?: boolean;
}

export const useLobbyMock = ({ 
  modeConfig, 
  playersInLobby, 
  profile,
  serverLobbyPlayers,
  initialReady = false,
}: UseLobbyMockProps) => {
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const notificationAnim = useRef(new Animated.Value(-100)).current;
  const [isReady, setIsReady] = useState(initialReady);

  // Initialize with self and merge with server players when available
  useEffect(() => {
    // If we have server player data, use it (with self at index 0)
    if (serverLobbyPlayers && serverLobbyPlayers.length > 0) {
      // Map server players to lobby player format
      const mappedPlayers: LobbyPlayer[] = serverLobbyPlayers.map((player, index) => ({
        id: player.userId || String(index + 1),
        username: player.username || 'Player',
        avatar: player.avatar || 'lion',
        isReady: index > 0, // Other players assumed ready
        isConnected: true,
        ping: Math.floor(Math.random() * 150) + 30,
      }));
      
      // Update self with profile data
      if (mappedPlayers.length > 0 && profile.userId) {
        const selfIndex = mappedPlayers.findIndex(p => p.id === profile.userId);
        if (selfIndex >= 0) {
          mappedPlayers[selfIndex] = {
            ...mappedPlayers[selfIndex],
            username: profile.username || mappedPlayers[selfIndex].username,
            avatar: profile.avatar || mappedPlayers[selfIndex].avatar,
            isReady,
            ping: 45,
          };
        }
      }
      
      setLobbyPlayers(mappedPlayers);
      return;
    }
    
    // Fallback: Create self with profile data
    setLobbyPlayers([
      {
        id: '1',
        username: profile.username || 'You',
        avatar: profile.avatar,
        isReady,
        isConnected: true,
        ping: 45,
      },
    ]);
  }, [profile, isReady, serverLobbyPlayers]);

  // Update own ready status
  useEffect(() => {
    setLobbyPlayers(prev =>
      prev.map((p, i) => (i === 0 ? { ...p, isReady } : p))
    );
  }, [isReady]);

  // Handle server player updates (when real player data is available)
  useEffect(() => {
    // If we have server player data, use it directly instead of simulating
    if (serverLobbyPlayers && serverLobbyPlayers.length > 0) {
      // Already handled in the initialization effect
      return;
    }
    
    // Fallback: Simulate other players joining (when no server data)
    const maxPlayers = modeConfig.playerCount;
    if (playersInLobby > 1 && lobbyPlayers.length < Math.min(playersInLobby, maxPlayers)) {
      const newPlayer: LobbyPlayer = {
        id: String(lobbyPlayers.length + 1),
        username: `Player ${lobbyPlayers.length + 1}`,
        avatar: AVATAR_OPTIONS[lobbyPlayers.length % AVATAR_OPTIONS.length].id,
        isReady: true,
        isConnected: true,
        ping: Math.floor(Math.random() * 150) + 30,
      };
      setLobbyPlayers(prev => [...prev, newPlayer]);
      
      // Show notification with animation
      setNotification(`${newPlayer.username} joined!`);
      Vibration.vibrate(100);
      Animated.timing(notificationAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-hide notification
      const timer = setTimeout(() => {
        Animated.timing(notificationAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [playersInLobby, modeConfig.playerCount, serverLobbyPlayers]);

  // Helper functions for Lobby component
  const getAvatarEmoji = (avatarId: string) => {
    const avatar = AVATAR_OPTIONS.find(a => a.id === avatarId);
    return avatar?.emoji || '🎮';
  };

  const getPingColor = (ping: number) => {
    if (ping < 100) return '#4CAF50';
    if (ping < 200) return '#FFC107';
    return '#F44336';
  };

  const getPingIcon = (ping: number) => {
    if (ping < 100) return 'wifi';
    if (ping < 200) return 'wifi';
    return 'wifi-outline';
  };

  const showNotificationFn = (message: string) => {
    setNotification(message);
    Vibration.vibrate(100);
    Animated.timing(notificationAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(notificationAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 2500);
  };

  return {
    lobbyPlayers,
    notification,
    notificationAnim,
    showNotification: showNotificationFn,
    isReady,
    setIsReady,
    // Helper functions
    getAvatarEmoji,
    getPingColor,
    getPingIcon,
  };
};

export default useLobbyMock;

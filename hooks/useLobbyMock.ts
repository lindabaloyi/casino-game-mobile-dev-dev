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
  /** @deprecated Use serverLobbyPlayers.length instead - single source of truth */
  playersInLobby?: number;
  profile: {
    username?: string;
    avatar: string;
    userId?: string;
  };
  serverLobbyPlayers?: ServerLobbyPlayer[];
  initialReady?: boolean;
  /** Room-based player data for private rooms (overrides serverLobbyPlayers) */
  roomPlayers?: { socketId: string; isHost: boolean }[];
  roomPlayerCount?: number;
}

export const useLobbyMock = ({ 
  modeConfig, 
  playersInLobby, 
  profile,
  serverLobbyPlayers,
  initialReady = false,
  roomPlayers,
  roomPlayerCount,
}: UseLobbyMockProps) => {
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const notificationAnim = useRef(new Animated.Value(-100)).current;
  const [isReady, setIsReady] = useState(initialReady);

// Initialize with self and merge with server/room players when available
  useEffect(() => {
    // Priority 1: Room-based players (private rooms)
    if (roomPlayers !== undefined && roomPlayerCount !== undefined) {
      const maxPlayers = modeConfig.playerCount;
      const players: LobbyPlayer[] = [];

      // Slot 0 is always self
      players.push({
        id: profile.userId || '1',
        username: profile.username || 'You',
        avatar: profile.avatar || 'lion',
        isReady,
        isConnected: true,
        ping: 45,
      });

      // Fill remaining slots based on roomPlayerCount
      for (let i = 1; i < maxPlayers; i++) {
        if (i < roomPlayerCount) {
          players.push({
            id: String(i + 1),
            username: `Player ${i + 1}`,
            avatar: AVATAR_OPTIONS[i % AVATAR_OPTIONS.length].id,
            isReady: true,
            isConnected: true,
            ping: Math.floor(Math.random() * 150) + 30,
          });
        }
      }

      setLobbyPlayers(players);
      return;
    }

    // Priority 2: Server lobby players (matchmaking)
    if (serverLobbyPlayers && serverLobbyPlayers.length > 0) {
      const mappedPlayers: LobbyPlayer[] = serverLobbyPlayers.map((player, index) => ({
        id: player.userId || String(index + 1),
        username: player.username || 'Player',
        avatar: player.avatar || 'lion',
        isReady: index > 0,
        isConnected: true,
        ping: Math.floor(Math.random() * 150) + 30,
      }));

      // Ensure self is at index 0
      if (profile.userId) {
        const selfIndex = mappedPlayers.findIndex(p => p.id === profile.userId);

        if (selfIndex > 0) {
          const [selfPlayer] = mappedPlayers.splice(selfIndex, 1);
          mappedPlayers.unshift({
            ...selfPlayer,
            avatar: profile.avatar || selfPlayer.avatar,
            isReady,
            ping: 45,
          });
        } else if (selfIndex === 0) {
          mappedPlayers[0] = {
            ...mappedPlayers[0],
            avatar: profile.avatar || mappedPlayers[0].avatar,
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
  }, [profile, isReady, serverLobbyPlayers, roomPlayers, roomPlayerCount, modeConfig.playerCount]);

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
    const currentCount = lobbyPlayers.length;
    // Use serverLobbyPlayers.length as the source of truth
    const targetCount = serverLobbyPlayers?.length ?? playersInLobby ?? 0;
    
    // Only add players if:
    // 1. More players have joined than we currently have
    // 2. We haven't reached max players yet
    if (targetCount > currentCount && currentCount < maxPlayers) {
      // Calculate how many new players to add
      const newPlayerCount = Math.min(targetCount, maxPlayers) - currentCount;
      
      if (newPlayerCount > 0) {
        const newPlayers: LobbyPlayer[] = [];
        
        for (let i = 0; i < newPlayerCount; i++) {
          const slotIndex = currentCount + i;
          newPlayers.push({
            id: String(slotIndex + 1),
            username: `Player ${slotIndex + 1}`,
            avatar: AVATAR_OPTIONS[slotIndex % AVATAR_OPTIONS.length].id,
            isReady: true,
            isConnected: true,
            ping: Math.floor(Math.random() * 150) + 30,
          });
        }
        
        setLobbyPlayers(prev => [...prev, ...newPlayers]);
        
        // Show notification for the first new player
        if (newPlayers.length > 0) {
          setNotification(`${newPlayers[0].username} joined!`);
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
      }
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

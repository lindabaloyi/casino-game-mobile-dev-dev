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
  /** Room-based player data for private rooms (overrides serverLobbyPlayers) */
  roomPlayers?: Array<{ socketId: string; isHost: boolean }>;
  roomPlayerCount?: number;
  /** Whether the game has started (prevents lobby processing) */
  gameStarted?: boolean;
}

export const useLobbyMock = ({
  modeConfig,
  playersInLobby,
  profile,
  serverLobbyPlayers,
  initialReady = false,
  roomPlayers,
  roomPlayerCount,
  gameStarted = false,
}: UseLobbyMockProps) => {
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const notificationAnim = useRef(new Animated.Value(-100)).current;
  const [isReady, setIsReady] = useState(initialReady);

// Initialize with self and merge with server/room players when available
  useEffect(() => {
    console.log('[useLobbyMock] ========== EFFECT TRIGGERED ==========');
    console.log('[useLobbyMock] gameStarted:', gameStarted);
    console.log('[useLobbyMock] serverLobbyPlayers exists:', !!serverLobbyPlayers);
    console.log('[useLobbyMock] serverLobbyPlayers length:', serverLobbyPlayers?.length || 0);
    console.log('[useLobbyMock] serverLobbyPlayers value:', JSON.stringify(serverLobbyPlayers));
    console.log('[useLobbyMock] Current lobbyPlayers state:', JSON.stringify(lobbyPlayers));
    console.log('[useLobbyMock] profile.userId:', profile.userId);
    console.log('[useLobbyMock] playersInLobby:', playersInLobby);
    console.log('[useLobbyMock] modeConfig.playerCount:', modeConfig.playerCount);

    // STATE MACHINE GUARD: Do not process lobby data if game has started
    if (gameStarted) {
      console.log('[useLobbyMock] ⚠️ Game has started, skipping lobby processing');
      return;
    }

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
          // Slot is occupied but we don't have username from room system
          // Show generic player name
          players.push({
            id: String(i + 1),
            username: `Player ${i + 1}`,
            avatar: AVATAR_OPTIONS[i % AVATAR_OPTIONS.length].id,
            isReady: true,
            isConnected: true,
            ping: Math.floor(Math.random() * 150) + 30,
          });
        }
        // Empty slots remain undefined
      }

      console.log('[useLobbyMock] Room-based players:', JSON.stringify(players));
      setLobbyPlayers(players);
      return;
    }

    // Priority 2: Server lobby players (matchmaking)
    if (serverLobbyPlayers && serverLobbyPlayers.length > 0) {
      console.log('[useLobbyMock] ===== PROCESSING SERVER LOBBY PLAYERS =====');
      console.log('[useLobbyMock] serverLobbyPlayers length:', serverLobbyPlayers.length);

      // Map server players to lobby player format
      const mappedPlayers: LobbyPlayer[] = serverLobbyPlayers.map((player, index) => {
        const name = player.username || 'Player';
        console.log(`[useLobbyMock] Mapping player at index ${index}:`, {
          userId: player.userId,
          username: player.username,
          finalName: name,
          avatar: player.avatar
        });
        return {
          id: player.userId || String(index + 1),
          username: name,
          avatar: player.avatar || 'lion',
          isReady: index > 0, // Other players assumed ready
          isConnected: true,
          ping: Math.floor(Math.random() * 150) + 30,
        };
      });

      console.log('[useLobbyMock] ===== MAPPED PLAYERS (before reordering) =====');
      console.log('[useLobbyMock] mappedPlayers:', JSON.stringify(mappedPlayers));
      console.log('[useLobbyMock] mappedPlayers order:', mappedPlayers.map((p, i) => `[${i}] ${p.username} (id: ${p.id})`).join(', '));

      // CRITICAL: Ensure self is at index 0, other players fill subsequent slots
      if (profile.userId) {
        const selfIndex = mappedPlayers.findIndex(p => p.id === profile.userId);
        console.log('[useLobbyMock] ===== REORDERING LOGIC =====');
        console.log('[useLobbyMock] Looking for self with userId:', profile.userId);
        console.log('[useLobbyMock] selfIndex found:', selfIndex);

        if (selfIndex > 0) {
          console.log('[useLobbyMock] Self found at index', selfIndex, '- MOVING to index 0');
          console.log('[useLobbyMock] Array BEFORE splice:', JSON.stringify(mappedPlayers));
          // Move self to index 0
          const [selfPlayer] = mappedPlayers.splice(selfIndex, 1);
          console.log('[useLobbyMock] After splice, removed:', JSON.stringify(selfPlayer));
          console.log('[useLobbyMock] Array AFTER splice:', JSON.stringify(mappedPlayers));
          mappedPlayers.unshift({
            ...selfPlayer,
            // Keep server username, only override avatar and ready state
            avatar: profile.avatar || selfPlayer.avatar,
            isReady,
            ping: 45,
          });
          console.log('[useLobbyMock] Array AFTER unshift:', JSON.stringify(mappedPlayers));
        } else if (selfIndex === 0) {
          console.log('[useLobbyMock] Self already at index 0 - updating avatar and ready state only');
          // Self is already at index 0, keep server username/displayName, only update avatar and ready state
          mappedPlayers[0] = {
            ...mappedPlayers[0],
            avatar: profile.avatar || mappedPlayers[0].avatar,
            isReady,
            ping: 45,
          };
        } else {
          console.log('[useLobbyMock] WARNING: Self not found in mappedPlayers! userId:', profile.userId);
        }
      }

      console.log('[useLobbyMock] ===== FINAL STATE =====');
      console.log('[useLobbyMock] Final mapped players:', JSON.stringify(mappedPlayers));
      console.log('[useLobbyMock] Final order:', mappedPlayers.map((p, i) => `[${i}] ${p.username} (id: ${p.id})`).join(', '));
      console.log('[useLobbyMock] ===== SETTING LOBBY PLAYERS =====');
      setLobbyPlayers(mappedPlayers);
      console.log('[useLobbyMock] lobbyPlayers state should now be updated');
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
  }, [profile, isReady, serverLobbyPlayers, roomPlayers, roomPlayerCount, modeConfig.playerCount, gameStarted]);

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
    
    // Only add players if:
    // 1. More players have joined than we currently have
    // 2. We haven't reached max players yet
    if (playersInLobby > currentCount && currentCount < maxPlayers) {
      // Calculate how many new players to add
      const newPlayerCount = Math.min(playersInLobby, maxPlayers) - currentCount;
      
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

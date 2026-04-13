/**
 * useLobbyState
 * 
 * Handles multiplayer game lobby state.
 * Supports 2-player (duel), 3-player (three-hands), and 4-player (party) games.
 * 
 * Responsibilities:
 *  - Track lobby status (waiting for players)
 *  - Track players in lobby (single source of truth: lobbyPlayers array)
 *  - Poll for updates periodically
 * 
 * Usage:
 *   const { isInLobby, playersInLobby, requiredPlayers, lobbyPlayers } = useLobbyState(socket, playerCount);
 */

import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

export interface LobbyPlayerInfo {
  userId: string;
  username: string;
  avatar: string;
}

// Display format for PlayerCard component
export interface LobbyDisplayPlayer {
  id: string;
  username: string;
  avatar: string;
  isReady: boolean;
  isConnected: boolean;
  ping: number;
}

export interface UseLobbyStateResult {
  /** Whether we're waiting in the lobby */
  isInLobby: boolean;
  /** Number of players currently in lobby (derived from lobbyPlayers.length) */
  playersInLobby: number;
  /** Required number of players to start */
  requiredPlayers: number;
  /** Whether the local player is ready */
  isReady: boolean;
  /** Whether all required players have joined and are ready */
  allPlayersReady: boolean;
  /** Toggle ready status */
  toggleReady: () => void;
  /** Player info from server - SINGLE SOURCE OF TRUTH */
  lobbyPlayers: LobbyPlayerInfo[];
  /** Display format for PlayerCard component */
  displayPlayers: LobbyDisplayPlayer[];
  /** Room code for sharing with friends */
  roomCode: string | null;
  /** Notification when new player joins */
  newPlayerNotification: string | null;
  /** Clear the notification */
  clearNotification: () => void;
}

export function useLobbyState(
  socket: Socket | null,
  playerCount: number,
  gameMode?: string
): UseLobbyStateResult {
  const [isInLobby, setIsInLobby] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayerInfo[]>([]);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [newPlayerNotification, setNewPlayerNotification] = useState<string | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Use ref to track previous player count for notification
  const prevPlayerCountRef = useRef(0);
  
  // Use ref to track if game has started (avoids stale closure in event handlers)
  const gameStartedRef = useRef(false);
  
  // Determine required players based on playerCount
  const requiredPlayers = playerCount || 2;
  const isMultiplayerMode = playerCount > 1;
  
  // SINGLE SOURCE OF TRUTH: playersInLobby is derived from lobbyPlayers.length
  const playersInLobby = lobbyPlayers.length;
  
  // Compute whether all players are ready (all required players joined)
  const allPlayersReady = playersInLobby >= requiredPlayers && playersInLobby > 0;
  
  // Toggle ready status
  const toggleReady = () => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    if (socket?.connected) {
      socket.emit('player-ready', { ready: newReadyState });
    }
  };

  // Helper to detect new player and show notification
  const handleLobbyUpdate = (newPlayers: LobbyPlayerInfo[]) => {
    const prevCount = prevPlayerCountRef.current;
    const newCount = newPlayers.length;
    
    // If new player joined (and we weren't at max)
    if (newCount > prevCount && prevCount < requiredPlayers) {
      // Find the new player (one that wasn't in the previous list)
      const prevUserIds = new Set(lobbyPlayers.map(p => p.userId));
      const newPlayer = newPlayers.find(p => !prevUserIds.has(p.userId));
      
      if (newPlayer) {
        setNewPlayerNotification(`${newPlayer.username} joined!`);
      }
    }
    
    prevPlayerCountRef.current = newCount;
  };

  // Transform server data to display format for PlayerCard
  const transformToDisplayPlayers = (players: LobbyPlayerInfo[]): LobbyDisplayPlayer[] => {
    return players.map((p, index) => ({
      id: p.userId || `player-${index}`,
      username: p.username || `Player ${index + 1}`,
      avatar: p.avatar || 'lion',
      isReady: true,
      isConnected: true,
      ping: Math.floor(Math.random() * 100) + 30, // Placeholder ping
    }));
  };

  const clearNotification = () => setNewPlayerNotification(null);

  useEffect(() => {
    // Only listen to lobby events in multiplayer mode (3+ players)
    if (!socket || !isMultiplayerMode) {
      // Reset state when not in multiplayer mode
      setIsInLobby(false);
      setLobbyPlayers([]);
      return;
    }

    // Handle queue-state-update - unified event from server push on queue changes
    const handleQueueStateUpdate = (data: { 
      gameType: string; 
      requiredPlayers: number; 
      players?: LobbyPlayerInfo[]; 
      roomCode?: string;
    }) => {
      console.log(`[Client] queue-state-update received: gameType=${data.gameType}, players=${data.players?.length || 0}, required=${data.requiredPlayers}`);
      if (gameStartedRef.current) {
        return;
      }
      setIsInLobby(true);
      handleLobbyUpdate(data.players || []);
      setLobbyPlayers(data.players || []);
      if (data.roomCode) {
        setRoomCode(data.roomCode);
      }
    };

    // Handle party-waiting (4-player mode)
    const handlePartyWaiting = (data: { playersJoined: number; players?: LobbyPlayerInfo[] }) => {
      if (gameStartedRef.current) {
        return;
      }
      setIsInLobby(true);
      handleLobbyUpdate(data.players || []);
      setLobbyPlayers(data.players || []);
      if ((data as any).roomCode) {
        setRoomCode((data as any).roomCode);
      }
    };

    // Handle three-hands-waiting (3-player mode)
    const handleThreeHandsWaiting = (data: { playersJoined: number; players?: LobbyPlayerInfo[] }) => {
      if (gameStartedRef.current) {
        return;
      }
      setIsInLobby(true);
      handleLobbyUpdate(data.players || []);
      setLobbyPlayers(data.players || []);
      if ((data as any).roomCode) {
        setRoomCode((data as any).roomCode);
      }
    };

    // Handle freeforall-waiting (4-player free-for-all mode)
    const handleFreeForAllWaiting = (data: { playersJoined: number; players?: LobbyPlayerInfo[] }) => {
      if (gameStartedRef.current) {
        return;
      }
      setIsInLobby(true);
      handleLobbyUpdate(data.players || []);
      setLobbyPlayers(data.players || []);
      if ((data as any).roomCode) {
        setRoomCode((data as any).roomCode);
      }
    };

    // Handle tournament-waiting (4-player tournament mode)
    const handleTournamentWaiting = (data: { playersJoined: number; players?: LobbyPlayerInfo[] }) => {
      if (gameStartedRef.current) {
        return;
      }
      setIsInLobby(true);
      handleLobbyUpdate(data.players || []);
      setLobbyPlayers(data.players || []);
      if ((data as any).roomCode) {
        setRoomCode((data as any).roomCode);
      }
    };

    // Handle tournament-party waiting (server sends party-waiting for all 4-player modes)
    const handleTournamentPartyWaiting = (data: { playersJoined: number; players?: LobbyPlayerInfo[] }) => {
      if (gameStartedRef.current) {
        return;
      }
      setIsInLobby(true);
      handleLobbyUpdate(data.players || []);
      setLobbyPlayers(data.players || []);
      if ((data as any).roomCode) {
        setRoomCode((data as any).roomCode);
      }
    };

    // Handle four-hands-waiting (4-player mode - distinct from party/freeforall/tournament)
    const handleFourHandsWaiting = (data: { playersJoined: number; players?: LobbyPlayerInfo[] }) => {
      if (gameStartedRef.current) {
        return;
      }
      setIsInLobby(true);
      handleLobbyUpdate(data.players || []);
      setLobbyPlayers(data.players || []);
      if ((data as any).roomCode) {
        setRoomCode((data as any).roomCode);
      }
    };

    // Handle two-hands-waiting (2-player mode)
    const handleTwoHandsWaiting = (data: { playersJoined: number; players?: LobbyPlayerInfo[] }) => {
      if (gameStartedRef.current) {
        return;
      }
      setIsInLobby(true);
      handleLobbyUpdate(data.players || []);
      setLobbyPlayers(data.players || []);
      if ((data as any).roomCode) {
        setRoomCode((data as any).roomCode);
      }
    };

    const handleGameStart = (data: any) => {
      gameStartedRef.current = true;
      setIsInLobby(false);
      const actualPlayerCount = data.gameState?.playerCount || requiredPlayers;
      setLobbyPlayers(prev => {
        return Array(actualPlayerCount).fill(null).map((_, i) => prev[i] || { userId: `player_${i}`, username: `Player ${i + 1}`, avatar: 'lion' });
      });
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    // Listen to queue-state-update for unified server push (NEW - replaces per-type events)
    socket.on('queue-state-update', handleQueueStateUpdate);
    
    // Legacy events - keep for backward compatibility during transition
    // Listen to appropriate events based on player count (legacy - keep for backward compatibility)
    if (requiredPlayers === 4) {
      socket.on('party-waiting', handlePartyWaiting);
      socket.on('freeforall-waiting', handleFreeForAllWaiting);
      socket.on('four-hands-waiting', handleFourHandsWaiting);
      socket.on('tournament-waiting', handleTournamentWaiting);
    } else if (requiredPlayers === 3) {
      socket.on('three-hands-waiting', handleThreeHandsWaiting);
    } else if (requiredPlayers === 2) {
      socket.on('duel-waiting', handleTwoHandsWaiting);
    }
    
    socket.on('game-start', handleGameStart);

    // No more polling needed - server pushes queue-state-update on any change
    // Keep request-lobby-status as fallback for initial connect
    socket.emit('request-lobby-status');

    return () => {
      socket.off('queue-state-update', handleQueueStateUpdate);
      
      if (requiredPlayers === 4) {
        socket.off('party-waiting', handlePartyWaiting);
        socket.off('freeforall-waiting', handleFreeForAllWaiting);
        socket.off('four-hands-waiting', handleFourHandsWaiting);
        socket.off('tournament-waiting', handleTournamentWaiting);
      } else if (requiredPlayers === 3) {
        socket.off('three-hands-waiting', handleThreeHandsWaiting);
      } else if (requiredPlayers === 2) {
        socket.off('duel-waiting', handleTwoHandsWaiting);
      }
      socket.off('game-start', handleGameStart);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [socket, isMultiplayerMode, requiredPlayers]);

  return {
    isInLobby,
    playersInLobby,
    requiredPlayers,
    isReady,
    allPlayersReady,
    toggleReady,
    lobbyPlayers,
    displayPlayers: transformToDisplayPlayers(lobbyPlayers),
    roomCode,
    newPlayerNotification,
    clearNotification,
  };
}

export default useLobbyState;

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
  
  // Use refs to track previous state for notification comparison
  const prevPlayerCountRef = useRef(0);
  const prevLobbyPlayersRef = useRef<LobbyPlayerInfo[]>([]);
  
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
    const prevPlayers = prevLobbyPlayersRef.current;
    const prevCount = prevPlayers.length;
    const newCount = newPlayers.length;
    
    console.log('[Debug] handleLobbyUpdate: prevCount=', prevCount, 'newCount=', newCount);
    
    // If new player joined (and we weren't at max)
    if (newCount > prevCount && prevCount < requiredPlayers) {
      // Find the new player (one that wasn't in the previous list)
      const prevUserIds = new Set(prevPlayers.map(p => p.userId));
      const newPlayer = newPlayers.find(p => !prevUserIds.has(p.userId));
      
      console.log('[Debug] New player detected:', newPlayer);
      
      if (newPlayer && newPlayer.username) {
        console.log('[Debug] Setting notification for:', newPlayer.username);
        setNewPlayerNotification(`${newPlayer.username} joined!`);
      }
    }
    
    prevPlayerCountRef.current = newCount;
    prevLobbyPlayersRef.current = newPlayers;
  };

  // Transform server data to display format for PlayerCard
  const transformToDisplayPlayers = (players: LobbyPlayerInfo[]): LobbyDisplayPlayer[] => {
    console.log('[Debug] transformToDisplayPlayers: inputCount=', players.length);
    console.log('[Debug] transformToDisplayPlayers: players=', JSON.stringify(players));
    
    const result = players.map((p, index) => ({
      id: p.userId || `player-${index}`,
      username: p.username || '',
      avatar: p.avatar || 'lion',
      isReady: true,
      isConnected: true,
      ping: Math.floor(Math.random() * 100) + 30,
    }));
    
    console.log('[Debug] transformToDisplayPlayers: output=', JSON.stringify(result));
    return result;
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
      console.log('[Debug] handleQueueStateUpdate received:', JSON.stringify(data));
      
      if (gameStartedRef.current) {
        console.log('[Debug] Game already started, ignoring');
        return;
      }
      setIsInLobby(true);
      const playersData = data.players || [];
      console.log('[Debug] handleQueueStateUpdate: playersData length=', playersData.length);
      handleLobbyUpdate(playersData);
      setLobbyPlayers(playersData);
      if (data.roomCode) {
        setRoomCode(data.roomCode);
      }
    };

    const handleGameStart = (data: any) => {
      console.log('[Debug] handleGameStart received, gameId:', data.gameId);
      console.log('[Debug] handleGameStart playerInfos:', JSON.stringify(data.playerInfos));
      gameStartedRef.current = true;
      setIsInLobby(false);
      
      // Use real player data from server instead of generating fake "Player 1", "Player 2", etc.
      if (data.playerInfos && data.playerInfos.length > 0) {
        console.log('[Debug] Using real playerInfos from server');
        setLobbyPlayers(data.playerInfos);
      } else {
        console.log('[Debug] WARNING - falling back to fake player data (should not happen!)');
        const actualPlayerCount = data.gameState?.playerCount || requiredPlayers;
        setLobbyPlayers(Array(actualPlayerCount).fill(null).map((_, i) => ({ userId: `player_${i}`, username: `Player ${i + 1}`, avatar: 'lion' })));
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    // Listen to queue-state-update for unified server push (single source of truth)
    socket.on('queue-state-update', handleQueueStateUpdate);
    
    // Game start event
    socket.on('game-start', handleGameStart);

    // No more polling needed - server pushes queue-state-update on any change
    // Keep request-lobby-status as fallback for initial connect
    socket.emit('request-lobby-status');

    return () => {
      socket.off('queue-state-update', handleQueueStateUpdate);
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

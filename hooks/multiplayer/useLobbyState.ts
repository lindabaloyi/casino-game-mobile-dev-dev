/**
 * useLobbyState
 * 
 * Handles multiplayer game lobby state.
 * Supports 2-player (duel), 3-player (three-hands), and 4-player (party) games.
 * 
 * Responsibilities:
 *  - Track lobby status (waiting for players)
 *  - Track number of players in lobby
 *  - Poll for updates periodically
 * 
 * Usage:
 *   const { isInLobby, playersInLobby, requiredPlayers } = useLobbyState(socket, playerCount);
 */

import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

export interface LobbyPlayerInfo {
  userId: string;
  username: string;
  avatar: string;
  displayName: string;
}

export interface UseLobbyStateResult {
  /** Whether we're waiting in the lobby */
  isInLobby: boolean;
  /** Number of players currently in lobby */
  playersInLobby: number;
  /** Required number of players to start */
  requiredPlayers: number;
  /** Whether the local player is ready */
  isReady: boolean;
  /** Whether all required players have joined and are ready */
  allPlayersReady: boolean;
  /** Toggle ready status */
  toggleReady: () => void;
  /** Player info from server (when available) */
  lobbyPlayers: LobbyPlayerInfo[];
  /** Room code for sharing with friends */
  roomCode: string | null;
}

export function useLobbyState(
  socket: Socket | null,
  playerCount: number
): UseLobbyStateResult {
  const [isInLobby, setIsInLobby] = useState(false);
  const [playersInLobby, setPlayersInLobby] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayerInfo[]>([]);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Use ref to track if game has started (avoids stale closure in event handlers)
  const gameStartedRef = useRef(false);
  
  // Determine required players based on playerCount
  const requiredPlayers = playerCount || 2;
  const isMultiplayerMode = playerCount > 1;
  
  // Compute whether all players are ready (all required players joined)
  const allPlayersReady = playersInLobby >= requiredPlayers && playersInLobby > 0;
  
  // Debug logging for player count changes
  console.log(`[useLobbyState] playersInLobby: ${playersInLobby}, requiredPlayers: ${requiredPlayers}, allPlayersReady: ${allPlayersReady}, isReady: ${isReady}`);
  
  // Toggle ready status
  const toggleReady = () => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    if (socket?.connected) {
      socket.emit('player-ready', { ready: newReadyState });
    }
  };

  useEffect(() => {
    // Only listen to lobby events in multiplayer mode (3+ players)
    if (!socket || !isMultiplayerMode) {
      // Reset state when not in multiplayer mode
      setIsInLobby(false);
      setPlayersInLobby(0);
      return;
    }

    // Handle party-waiting (4-player mode)
    // Only handle if we're in party mode specifically - avoid conflict with four-hands
    const handlePartyWaiting = (data: { playersJoined: number; players?: LobbyPlayerInfo[] }) => {
      // Ignore party-waiting for four-hands mode to prevent conflicts
      // four-hands mode should only listen to four-hands-waiting
      if (requiredPlayers === 4 && playerCount === 4) {
        // Check if this is actually a party queue or four-hands queue
        // For now, skip party-waiting in four-hands mode to avoid conflicts
        console.log('[useLobbyState] Skipping party-waiting for four-hands mode (using four-hands-waiting instead)');
        return;
      }
      
      // Ignore lobby updates after game has started
      if (gameStartedRef.current) {
        return;
      }
      console.log('[useLobbyState] party-waiting received:', data);
      setIsInLobby(true);
      setPlayersInLobby(data.playersJoined);
      if (data.players) {
        setLobbyPlayers(data.players);
      }
      if ((data as any).roomCode) {
        setRoomCode((data as any).roomCode);
      }
    };

    // Handle three-hands-waiting (3-player mode)
    const handleThreeHandsWaiting = (data: { playersJoined: number; players?: LobbyPlayerInfo[] }) => {
      // Ignore lobby updates after game has started
      // This prevents stale 0-player counts from overwriting game state
      if (gameStartedRef.current) {
        console.log('[useLobbyState] ⚠️ Ignoring three-hands-waiting after game started');
        return;
      }
      console.log('[useLobbyState] three-hands-waiting received:', data);
      console.log('[useLobbyState] Players data received:', JSON.stringify(data.players));
      setIsInLobby(true);
      setPlayersInLobby(data.playersJoined);
      if (data.players) {
        setLobbyPlayers(data.players);
      }
      if ((data as any).roomCode) {
        setRoomCode((data as any).roomCode);
      }
    };

    // Handle freeforall-waiting (4-player free-for-all mode)
    const handleFreeForAllWaiting = (data: { playersJoined: number; players?: LobbyPlayerInfo[] }) => {
      // Ignore lobby updates after game has started
      if (gameStartedRef.current) {
        return;
      }
      console.log('[useLobbyState] freeforall-waiting received:', data);
      setIsInLobby(true);
      setPlayersInLobby(data.playersJoined);
      if (data.players) {
        setLobbyPlayers(data.players);
      }
      if ((data as any).roomCode) {
        setRoomCode((data as any).roomCode);
      }
    };

    // Handle tournament-waiting (4-player tournament mode)
    // NOTE: Server may also send party-waiting for tournament mode, so we handle both
    const handleTournamentWaiting = (data: { playersJoined: number; players?: LobbyPlayerInfo[] }) => {
      // Ignore lobby updates after game has started
      if (gameStartedRef.current) {
        return;
      }
      console.log('[useLobbyState] tournament-waiting received:', data);
      setIsInLobby(true);
      setPlayersInLobby(data.playersJoined);
      if (data.players) {
        setLobbyPlayers(data.players);
      }
      if ((data as any).roomCode) {
        setRoomCode((data as any).roomCode);
      }
    };

    // Handle tournament-party waiting (server sends party-waiting for all 4-player modes)
    const handleTournamentPartyWaiting = (data: { playersJoined: number; players?: LobbyPlayerInfo[] }) => {
      // Ignore lobby updates after game has started
      if (gameStartedRef.current) {
        return;
      }
      console.log('[useLobbyState] tournament-mode party-waiting received:', data);
      setIsInLobby(true);
      setPlayersInLobby(data.playersJoined);
      if (data.players) {
        setLobbyPlayers(data.players);
      }
      if ((data as any).roomCode) {
        setRoomCode((data as any).roomCode);
      }
    };

    // Handle four-hands-waiting (4-player mode - distinct from party/freeforall/tournament)
    const handleFourHandsWaiting = (data: { playersJoined: number; players?: LobbyPlayerInfo[] }) => {
      // Ignore lobby updates after game has started
      if (gameStartedRef.current) {
        return;
      }
      console.log('[useLobbyState] four-hands-waiting received:', data);
      console.log('[useLobbyState] Players data received:', JSON.stringify(data.players));
      setIsInLobby(true);
      setPlayersInLobby(data.playersJoined);
      if (data.players) {
        setLobbyPlayers(data.players);
      }
      if ((data as any).roomCode) {
        setRoomCode((data as any).roomCode);
      }
    };

    // Track which mode we're in based on requiredPlayers and add appropriate listeners
    const isFourPlayerMode = requiredPlayers === 4;
    const isTournamentMode = playerCount === 4; // This is a bit redundant but needed for listener registration

    // Handle two-hands-waiting (2-player mode)
    const handleTwoHandsWaiting = (data: { playersJoined: number; players?: LobbyPlayerInfo[] }) => {
      // Ignore lobby updates after game has started
      if (gameStartedRef.current) {
        return;
      }
      console.log('[useLobbyState] duel-waiting received:', data);
      setIsInLobby(true);
      setPlayersInLobby(data.playersJoined);
      if (data.players) {
        setLobbyPlayers(data.players);
      }
      if ((data as any).roomCode) {
        setRoomCode((data as any).roomCode);
      }
    };

    const handleGameStart = () => {
      // Game started, no longer in lobby
      console.log('[useLobbyState] 🔔 game-start received - setting gameStartedRef=true');
      gameStartedRef.current = true;
      setIsInLobby(false);
      // CRITICAL: Set playersInLobby to requiredPlayers since game started with full lobby
      // This ensures allPlayersReady becomes true and UI shows correct state
      setPlayersInLobby(requiredPlayers);
      // Stop polling when game starts
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    // Listen to appropriate events based on player count
    // For 4-player games, listen to party-waiting, freeforall-waiting, four-hands-waiting, AND tournament-waiting
    // CRITICAL: For tournament mode, we MUST also listen to party-waiting because
    // the server sends party-waiting for ALL 4-player modes including tournament
    if (requiredPlayers === 4) {
      socket.on('party-waiting', handlePartyWaiting);
      socket.on('freeforall-waiting', handleFreeForAllWaiting);
      socket.on('four-hands-waiting', handleFourHandsWaiting);
      socket.on('tournament-waiting', handleTournamentWaiting);
      // Make tournament mode also respond to party-waiting messages
      // This handles the case where server sends party-waiting for tournament queues
    } else if (requiredPlayers === 3) {
      socket.on('three-hands-waiting', handleThreeHandsWaiting);
    } else if (requiredPlayers === 2) {
      socket.on('duel-waiting', handleTwoHandsWaiting);
    }
    
    socket.on('game-start', handleGameStart);

    // Start polling for lobby status every 5 seconds (reduced from 2s to reduce server load)
    // This ensures all players get updates even if they miss a broadcast
    pollingIntervalRef.current = setInterval(() => {
      if (socket?.connected && !gameStartedRef.current) {
        socket.emit('request-lobby-status');
      }
    }, 5000);

    // Request initial status
    socket.emit('request-lobby-status');

    return () => {
      socket.off('party-waiting', handlePartyWaiting);
      socket.off('three-hands-waiting', handleThreeHandsWaiting);
      socket.off('duel-waiting', handleTwoHandsWaiting);
      socket.off('freeforall-waiting', handleFreeForAllWaiting);
      socket.off('four-hands-waiting', handleFourHandsWaiting);
      socket.off('tournament-waiting', handleTournamentWaiting);
      socket.off('game-start', handleGameStart);
      // Clean up polling interval
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
    roomCode,
  };
}

export default useLobbyState;

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
  /** Room code for sharing with friends */
  roomCode: string | null;
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
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Use ref to track if game has started (avoids stale closure in event handlers)
  const gameStartedRef = useRef(false);
  
  // Determine required players based on playerCount
  const requiredPlayers = playerCount || 2;
  const isMultiplayerMode = playerCount > 1;
  
  // SINGLE SOURCE OF TRUTH: playersInLobby is derived from lobbyPlayers.length
  const playersInLobby = lobbyPlayers.length;
  
  // Compute whether all players are ready (all required players joined)
  const allPlayersReady = playersInLobby >= requiredPlayers && playersInLobby > 0;
  
  // Debug logging for player count changes
  console.log(`[useLobbyState] playersInLobby: ${playersInLobby} (from lobbyPlayers.length), requiredPlayers: ${requiredPlayers}, allPlayersReady: ${allPlayersReady}, isReady: ${isReady}`);
  
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
      setLobbyPlayers([]);
      return;
    }

    // Handle party-waiting (4-player mode)
    const handlePartyWaiting = (data: { playersJoined: number; players?: LobbyPlayerInfo[] }) => {
      if (gameStartedRef.current) {
        return;
      }
      console.log('[useLobbyState] party-waiting received:', data);
      setIsInLobby(true);
      // Set lobbyPlayers from server data - this is the single source of truth
      setLobbyPlayers(data.players || []);
      if ((data as any).roomCode) {
        setRoomCode((data as any).roomCode);
      }
    };

    // Handle three-hands-waiting (3-player mode)
    const handleThreeHandsWaiting = (data: { playersJoined: number; players?: LobbyPlayerInfo[] }) => {
      if (gameStartedRef.current) {
        console.log('[useLobbyState] ⚠️ Ignoring three-hands-waiting after game started');
        return;
      }
      console.log('[useLobbyState] three-hands-waiting received:', data);
      setIsInLobby(true);
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
      console.log('[useLobbyState] freeforall-waiting received:', data);
      setIsInLobby(true);
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
      console.log('[useLobbyState] tournament-waiting received:', data);
      setIsInLobby(true);
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
      console.log('[useLobbyState] tournament-mode party-waiting received:', data);
      setIsInLobby(true);
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
      console.log('[useLobbyState] four-hands-waiting received:', data);
      setIsInLobby(true);
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
      console.log('[useLobbyState] duel-waiting received:', data);
      setIsInLobby(true);
      setLobbyPlayers(data.players || []);
      if ((data as any).roomCode) {
        setRoomCode((data as any).roomCode);
      }
    };

    const handleGameStart = (data: any) => {
      console.log('[useLobbyState] 🔔 game-start received - setting gameStartedRef=true');
      console.log('[useLobbyState] 🔔 game-start data:', JSON.stringify({
        playerCount: data.gameState?.playerCount,
        tournamentPhase: data.tournamentPhase,
        tournamentHand: data.tournamentHand
      }));
      gameStartedRef.current = true;
      setIsInLobby(false);
      // Use actual player count from gameState for tournament transitions
      const actualPlayerCount = data.gameState?.playerCount || requiredPlayers;
      console.log(`[useLobbyState] 🔔 Setting playersInLobby to ${actualPlayerCount} based on gameState.playerCount`);
      setLobbyPlayers(prev => {
        // Create a full array of the right size for UI purposes
        return Array(actualPlayerCount).fill(null).map((_, i) => prev[i] || { userId: `player_${i}`, username: `Player ${i + 1}`, avatar: 'lion' });
      });
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    // Listen to appropriate events based on player count
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

    // Start polling for lobby status every 5 seconds
    pollingIntervalRef.current = setInterval(() => {
      if (socket?.connected && !gameStartedRef.current) {
        socket.emit('request-lobby-status');
      }
    }, 5000);

    // Request initial status
    socket.emit('request-lobby-status');

    return () => {
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
    roomCode,
  };
}

export default useLobbyState;

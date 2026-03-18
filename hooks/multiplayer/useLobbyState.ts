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
}

export function useLobbyState(
  socket: Socket | null,
  playerCount: number
): UseLobbyStateResult {
  const [isInLobby, setIsInLobby] = useState(false);
  const [playersInLobby, setPlayersInLobby] = useState(0);
  const [isReady, setIsReady] = useState(false);
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
    const handlePartyWaiting = (data: { playersJoined: number }) => {
      // Ignore lobby updates after game has started
      if (gameStartedRef.current) {
        return;
      }
      console.log('[useLobbyState] party-waiting received:', data);
      setIsInLobby(true);
      setPlayersInLobby(data.playersJoined);
    };

    // Handle three-hands-waiting (3-player mode)
    const handleThreeHandsWaiting = (data: { playersJoined: number }) => {
      // Ignore lobby updates after game has started
      // This prevents stale 0-player counts from overwriting game state
      if (gameStartedRef.current) {
        console.log('[useLobbyState] ⚠️ Ignoring three-hands-waiting after game started');
        return;
      }
      console.log('[useLobbyState] three-hands-waiting received:', data);
      setIsInLobby(true);
      setPlayersInLobby(data.playersJoined);
    };

    // Handle freeforall-waiting (4-player free-for-all mode)
    const handleFreeForAllWaiting = (data: { playersJoined: number }) => {
      // Ignore lobby updates after game has started
      if (gameStartedRef.current) {
        return;
      }
      console.log('[useLobbyState] freeforall-waiting received:', data);
      setIsInLobby(true);
      setPlayersInLobby(data.playersJoined);
    };

    // Handle two-hands-waiting (2-player mode)
    const handleTwoHandsWaiting = (data: { playersJoined: number }) => {
      // Ignore lobby updates after game has started
      if (gameStartedRef.current) {
        return;
      }
      console.log('[useLobbyState] two-hands-waiting received:', data);
      setIsInLobby(true);
      setPlayersInLobby(data.playersJoined);
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
    // For 4-player games, listen to both party-waiting and freeforall-waiting
    if (requiredPlayers === 4) {
      socket.on('party-waiting', handlePartyWaiting);
      socket.on('freeforall-waiting', handleFreeForAllWaiting);
    } else if (requiredPlayers === 3) {
      socket.on('three-hands-waiting', handleThreeHandsWaiting);
    } else if (requiredPlayers === 2) {
      socket.on('two-hands-waiting', handleTwoHandsWaiting);
    }
    
    socket.on('game-start', handleGameStart);

    // Start polling for lobby status every 2 seconds
    // This ensures all players get updates even if they miss a broadcast
    pollingIntervalRef.current = setInterval(() => {
      if (socket?.connected) {
        socket.emit('request-lobby-status');
      }
    }, 2000);

    // Request initial status
    socket.emit('request-lobby-status');

    return () => {
      socket.off('party-waiting', handlePartyWaiting);
      socket.off('three-hands-waiting', handleThreeHandsWaiting);
      socket.off('two-hands-waiting', handleTwoHandsWaiting);
      socket.off('freeforall-waiting', handleFreeForAllWaiting);
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
  };
}

export default useLobbyState;

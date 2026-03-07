/**
 * useLobbyState
 * 
 * Handles party game lobby state.
 * Only applicable for party mode (4-player games).
 * 
 * Responsibilities:
 *  - Track lobby status (waiting for players)
 *  - Track number of players in lobby
 *  - Poll for updates periodically
 * 
 * Usage:
 *   const { isInLobby, playersInLobby } = useLobbyState(socket, isPartyMode);
 */

import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

export interface UseLobbyStateResult {
  /** Whether we're waiting in the lobby */
  isInLobby: boolean;
  /** Number of players currently in lobby */
  playersInLobby: number;
}

export function useLobbyState(
  socket: Socket | null,
  isPartyMode: boolean
): UseLobbyStateResult {
  const [isInLobby, setIsInLobby] = useState(false);
  const [playersInLobby, setPlayersInLobby] = useState(0);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Only listen to lobby events in party mode
    if (!socket || !isPartyMode) {
      // Reset state when not in party mode
      setIsInLobby(false);
      setPlayersInLobby(0);
      return;
    }

    const handlePartyWaiting = (data: { playersJoined: number }) => {
      console.log('[useLobbyState] party-waiting:', data);
      setIsInLobby(true);
      setPlayersInLobby(data.playersJoined);
    };

    const handleGameStart = () => {
      // Game started, no longer in lobby
      console.log('[useLobbyState] game started, leaving lobby');
      setIsInLobby(false);
      // Stop polling when game starts
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    socket.on('party-waiting', handlePartyWaiting);
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
      socket.off('game-start', handleGameStart);
      // Clean up polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [socket, isPartyMode]);

  return {
    isInLobby,
    playersInLobby,
  };
}

export default useLobbyState;

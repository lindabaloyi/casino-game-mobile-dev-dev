/**
 * useLobbyState
 * 
 * Handles party game lobby state.
 * Only applicable for party mode (4-player games).
 * 
 * Responsibilities:
 *  - Track lobby status (waiting for players)
 *  - Track number of players in lobby
 * 
 * Usage:
 *   const { isInLobby, playersInLobby } = useLobbyState(socket, isPartyMode);
 */

import { useState, useEffect } from 'react';
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

    socket.on('party-waiting', handlePartyWaiting);

    return () => {
      socket.off('party-waiting', handlePartyWaiting);
    };
  }, [socket, isPartyMode]);

  return {
    isInLobby,
    playersInLobby,
  };
}

export default useLobbyState;

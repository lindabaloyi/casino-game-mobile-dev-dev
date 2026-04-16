/**
 * useLobby
 * 
 * Single source of truth for lobby state.
 * Listens to socket events and maintains players array.
 * No version counters - React natural reactivity handles updates.
 * 
 * Usage:
 *   const lobby = useLobby(socket, mode);
 *   const { displayPlayers, isInLobby, requiredPlayers } = lobby;
 */

import { useState, useEffect, useMemo } from 'react';
import { Socket } from 'socket.io-client';
import { GameMode } from '../utils/modeConfig';

export interface LobbyPlayer {
  userId: string;
  username: string;
  avatar: string;
}

export interface DisplayPlayer {
  id: string;
  username: string;
  avatar: string;
  isReady: boolean;
  isConnected: boolean;
  ping: number;
}

export interface UseLobbyResult {
  players: LobbyPlayer[];
  displayPlayers: DisplayPlayer[];
  isInLobby: boolean;
  requiredPlayers: number;
  roomCode: string | null;
  isReady: boolean;
  toggleReady: () => void;
}

const MODE_PLAYER_COUNT: Record<string, number> = {
  'two-hands': 2,
  'three-hands': 3,
  'party': 4,
  'tournament': 4,
  'four-hands': 4,
  'private': 0,  // Private rooms don't use matchmaking
};

export function useLobby(socket: Socket | null, gameMode: GameMode): UseLobbyResult {
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [isInLobby, setIsInLobby] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const requiredPlayers = MODE_PLAYER_COUNT[gameMode] || 2;

  useEffect(() => {
    if (!socket) return;

    // Skip all lobby logic for private rooms - they don't use matchmaking
    if (gameMode === 'private') {
      console.log('[Debug] useLobby: skipping - private mode, no matchmaking');
      return;  // No queue events, no request-lobby-status
    }
    console.log('[Debug] useLobby: setting up queue listeners for:', gameMode);

    console.log('[Debug] useLobby: setting up queue listeners for', gameMode);

    const handleQueueUpdate = (data: {
      gameType?: string;
      requiredPlayers?: number;
      players?: LobbyPlayer[];
      roomCode?: string;
    }) => {
      setPlayers([...(data.players || [])]);
      setIsInLobby(true);
      if (data.roomCode) setRoomCode(data.roomCode);
    };

    const handleGameStart = () => {
      setIsInLobby(false);
    };

    socket.on('queue-state-update', handleQueueUpdate);
    socket.on('duel-waiting', handleQueueUpdate);
    socket.on('three-hands-waiting', handleQueueUpdate);
    socket.on('party-waiting', handleQueueUpdate);
    socket.on('four-hands-waiting', handleQueueUpdate);
    socket.on('four-hands-ready', handleQueueUpdate);
    socket.on('tournament-waiting', handleQueueUpdate);
    socket.on('tournament-ready', handleQueueUpdate);
    socket.on('game-start', handleGameStart);

    socket.emit('request-lobby-status');

    return () => {
      socket.off('queue-state-update', handleQueueUpdate);
      socket.off('duel-waiting', handleQueueUpdate);
      socket.off('three-hands-waiting', handleQueueUpdate);
      socket.off('party-waiting', handleQueueUpdate);
      socket.off('four-hands-waiting', handleQueueUpdate);
      socket.off('four-hands-ready', handleQueueUpdate);
      socket.off('tournament-waiting', handleQueueUpdate);
      socket.off('tournament-ready', handleQueueUpdate);
      socket.off('game-start', handleGameStart);
    };
  }, [socket]);

  const displayPlayers = useMemo((): DisplayPlayer[] => {
    return players.map((p, idx) => ({
      id: p.userId || `player-${idx}`,
      username: p.username?.trim() || `Player ${idx + 1}`,
      avatar: p.avatar || 'lion',
      isReady: true,
      isConnected: true,
      ping: Math.floor(Math.random() * 100) + 30,
    }));
  }, [players]);

  const toggleReady = () => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    if (socket?.connected) {
      socket.emit('player-ready', { ready: newReadyState });
    }
  };

  return {
    players,
    displayPlayers,
    isInLobby,
    requiredPlayers,
    roomCode,
    isReady,
    toggleReady,
  };
}

export default useLobby;
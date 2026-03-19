/**
 * useRoom
 * 
 * Handles private room creation and joining on the client.
 * Works with Socket.IO to manage room lifecycle.
 * 
 * Responsibilities:
 *  - Create a new room and get room code
 *  - Join an existing room by code
 *  - Leave current room
 *  - Poll for room status updates
 *  - Handle room events (created, joined, updated, error)
 * 
 * Usage:
 *   const { room, createRoom, joinRoom, leaveRoom, startGame, error } = useRoom(socket);
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';

<<<<<<< HEAD
export type GameMode = 'two-hands' | 'party' | 'three-hands' | 'four-hands' | 'freeforall';
=======
export type GameMode = '2-hands' | 'party';
>>>>>>> sort-building

export interface RoomPlayer {
  socketId: string;
  isHost: boolean;
}

export interface RoomState {
  roomCode: string | null;
  gameMode: GameMode | null;
  status: 'none' | 'waiting' | 'ready' | 'started' | 'error';
  players: RoomPlayer[];
  maxPlayers: number;
  playerCount: number;
  isHost: boolean;
}

export interface UseRoomResult {
  /** Current room state */
  room: RoomState;
  /** Error message if any */
  error: string | null;
  /** Whether we're in a room */
  isInRoom: boolean;
  /** Create a new room */
  createRoom: (gameMode: GameMode, maxPlayers: number) => void;
  /** Join an existing room by code */
  joinRoom: (roomCode: string) => void;
  /** Leave current room */
  leaveRoom: () => void;
  /** Start the game (host only) */
  startGame: () => void;
  /** Clear error */
  clearError: () => void;
}

export function useRoom(socket: Socket | null): UseRoomResult {
  const [room, setRoom] = useState<RoomState>({
    roomCode: null,
    gameMode: null,
    status: 'none',
    players: [],
    maxPlayers: 0,
    playerCount: 0,
    isHost: false,
  });
  const [error, setError] = useState<string | null>(null);
  
  // Track if we're the host
  const isHostRef = useRef(false);

  useEffect(() => {
    if (!socket) return;

    // Handle room created
    const handleRoomCreated = (data: { roomCode: string; room: any }) => {
      setRoom({
        roomCode: data.roomCode,
        gameMode: data.room.gameMode,
        status: data.room.status,
        players: data.room.players,
        maxPlayers: data.room.maxPlayers,
        playerCount: data.room.playerCount,
        isHost: true,
      });
      isHostRef.current = true;
      setError(null);
    };

    // Handle room joined
    const handleRoomJoined = (data: { room: any }) => {
      setRoom({
        roomCode: data.room.code,
        gameMode: data.room.gameMode,
        status: data.room.status,
        players: data.room.players,
        maxPlayers: data.room.maxPlayers,
        playerCount: data.room.playerCount,
        isHost: data.room.hostSocketId === socket.id,
      });
      isHostRef.current = data.room.hostSocketId === socket.id;
      setError(null);
    };

    // Handle room updated
    const handleRoomUpdated = (data: { room: any }) => {
      setRoom(prev => ({
        ...prev,
        status: data.room.status,
        players: data.room.players,
        playerCount: data.room.playerCount,
      }));
    };

    // Handle room left
    const handleRoomLeft = () => {
      setRoom({
        roomCode: null,
        gameMode: null,
        status: 'none',
        players: [],
        maxPlayers: 0,
        playerCount: 0,
        isHost: false,
      });
      isHostRef.current = false;
      setError(null);
    };

    // Handle room error
    const handleRoomError = (data: { message: string }) => {
      setError(data.message);
      setRoom(prev => ({ ...prev, status: 'error' }));
    };

    // Handle game start (from server)
    const handleGameStart = () => {
      setRoom(prev => ({ ...prev, status: 'started' }));
    };

    socket.on('room-created', handleRoomCreated);
    socket.on('room-joined', handleRoomJoined);
    socket.on('room-updated', handleRoomUpdated);
    socket.on('room-left', handleRoomLeft);
    socket.on('room-error', handleRoomError);
    socket.on('game-start', handleGameStart);

    return () => {
      socket.off('room-created', handleRoomCreated);
      socket.off('room-joined', handleRoomJoined);
      socket.off('room-updated', handleRoomUpdated);
      socket.off('room-left', handleRoomLeft);
      socket.off('room-error', handleRoomError);
      socket.off('game-start', handleGameStart);
    };
  }, [socket]);

  const createRoom = useCallback((gameMode: GameMode, maxPlayers: number) => {
    if (!socket?.connected) {
      setError('Not connected to server');
      return;
    }
    socket.emit('create-room', { gameMode, maxPlayers });
  }, [socket]);

  const joinRoom = useCallback((roomCode: string) => {
    if (!socket?.connected) {
      setError('Not connected to server');
      return;
    }
    socket.emit('join-room', { roomCode: roomCode.toUpperCase() });
  }, [socket]);

  const leaveRoom = useCallback(() => {
    if (!socket?.connected) return;
    socket.emit('leave-room');
  }, [socket]);

  const startGame = useCallback(() => {
    if (!socket?.connected) return;
    if (!isHostRef.current) {
      setError('Only the host can start the game');
      return;
    }
    socket.emit('start-room-game');
  }, [socket]);

  const clearError = useCallback(() => {
    setError(null);
    setRoom(prev => ({ ...prev, status: prev.status === 'error' ? 'waiting' : prev.status }));
  }, []);

  return {
    room,
    error,
    isInRoom: room.status !== 'none' && room.status !== 'started',
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    clearError,
  };
}

export default useRoom;

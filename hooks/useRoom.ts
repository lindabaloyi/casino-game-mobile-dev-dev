/**
 * useRoom - Simplified room lifecycle hook
 * 
 * Responsibilities:
 * - Create rooms
 * - Join rooms  
 * - Leave rooms
 * - Handle room events (created, joined, updated, error)
 * 
 * Does NOT handle game state - that's useGameState's job.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

export interface RoomPlayer {
  socketId: string;
  isHost: boolean;
  joinedAt?: number;
}

export interface RoomState {
  roomCode: string | null;
  gameMode: string | null;
  status: 'none' | 'waiting' | 'ready' | 'started' | 'error';
  players: RoomPlayer[];
  maxPlayers: number;
  playerCount: number;
  isHost: boolean;
}

export interface UseRoomOptions {
  roomCode?: string | null;
}

export interface UseRoomResult {
  room: RoomState;
  error: string | null;
  isInRoom: boolean;
  createRoom: (gameMode: string, maxPlayers: number) => void;
  joinRoom: (roomCode: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
}

export function useRoom(socket: Socket | null, options?: UseRoomOptions): UseRoomResult {
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
  const isHostRef = useRef(false);
  
  // Permanent guard to prevent duplicate join-room emissions
  const joinAttemptedRef = useRef<string | null>(null);

  // Auto-join room when roomCode is provided
  useEffect(() => {
    if (!socket?.connected) return;
    if (!options?.roomCode) return;
    if (joinAttemptedRef.current === options.roomCode) return;
    
    const code = options.roomCode.toUpperCase();
    joinAttemptedRef.current = code;
    socket.emit('join-room', { roomCode: code });
  }, [socket?.connected, options?.roomCode]);

  // Room event listeners
  useEffect(() => {
    if (!socket) return;

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

    const handleRoomUpdated = (data: { room: any }) => {
      setRoom(prev => ({
        ...prev,
        status: data.room.status,
        players: data.room.players,
        playerCount: data.room.playerCount,
      }));
    };

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
      joinAttemptedRef.current = null;
    };

    const handleRoomError = (data: { message: string }) => {
      // Only set error if not already in game
      if (room.status !== 'started') {
        setError(data.message);
      }
    };

    socket.on('room-created', handleRoomCreated);
    socket.on('room-joined', handleRoomJoined);
    socket.on('room-updated', handleRoomUpdated);
    socket.on('room-left', handleRoomLeft);
    socket.on('room-error', handleRoomError);

    return () => {
      socket.off('room-created', handleRoomCreated);
      socket.off('room-joined', handleRoomJoined);
      socket.off('room-updated', handleRoomUpdated);
      socket.off('room-left', handleRoomLeft);
      socket.off('room-error', handleRoomError);
    };
  }, [socket, room.status]);

  const createRoom = useCallback((gameMode: string, maxPlayers: number) => {
    if (!socket?.connected) return;
    socket.emit('create-room', { gameMode, maxPlayers });
  }, [socket]);

  const joinRoom = useCallback((roomCode: string) => {
    if (!socket?.connected) return;
    const code = roomCode.toUpperCase();
    if (joinAttemptedRef.current === code) return; // Guard against duplicate
    joinAttemptedRef.current = code;
    socket.emit('join-room', { roomCode: code });
  }, [socket]);

  const leaveRoom = useCallback(() => {
    if (!socket?.connected) return;
    socket.emit('leave-room');
    joinAttemptedRef.current = null;
  }, [socket]);

  const startGame = useCallback(() => {
    if (!socket?.connected) return;
    if (!isHostRef.current) return;
    socket.emit('start-room-game');
  }, [socket]);

  const isInRoom = room.status !== 'none' && room.status !== 'started';

  return {
    room,
    error,
    isInRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
  };
}

export default useRoom;
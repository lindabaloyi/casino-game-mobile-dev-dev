/**
 * Multiplayer Hooks
 * 
 * A collection of focused hooks for multiplayer game functionality.
 * 
 * @example
 * import { useSocketConnection, useGameStateSync, useLobbyState, useOpponentDrag } from './hooks/multiplayer';
 */

export { useSocketConnection, type GameMode, type UseSocketConnectionOptions, type UseSocketConnectionResult } from './useSocketConnection';
export { useGameStateSync, type Card, type GameState, type GameOverData, type UseGameStateSyncResult } from './useGameStateSync';
export { useLobbyState, type UseLobbyStateResult } from './useLobbyState';
export { useOpponentDrag, type OpponentDragState, type UseOpponentDragResult } from './useOpponentDrag';
export { useRoom, type GameMode as RoomGameMode, type RoomState, type UseRoomResult } from './useRoom';

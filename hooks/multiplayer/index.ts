/**
 * Multiplayer Hooks
 * 
 * A collection of focused hooks for multiplayer game functionality.
 */

export { useSocketConnection, type GameMode, type UseSocketConnectionOptions, type UseSocketConnectionResult } from './useSocketConnection';
export { useGameStateSync, type Card, type GameState, type GameOverData, type UseGameStateSyncResult } from './useGameStateSync';
export { useOpponentDrag, type OpponentDragState, type UseOpponentDragResult } from './useOpponentDrag';
export { useRoom, type GameMode as RoomGameMode, type RoomState, type UseRoomResult } from './useRoom';

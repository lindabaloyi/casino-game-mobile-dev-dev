/**
 * types/game.types.ts
 * Shared game type definitions for the casino game.
 * 
 * Single source of truth — import from here instead of re-declaring
 * game types across components.
 */

import { Card } from './card.types';

// ── Stack types ───────────────────────────────────────────────────────────────

export interface TempStack {
  type: 'temp_stack';
  stackId: string;
  cards: Card[];
  owner: number;
  value: number;
  base: number;
  need: number;
  buildType?: 'sum' | 'diff';
}

export interface BuildStack {
  type: 'build_stack';
  stackId: string;
  cards: Card[];
  owner: number;
  value: number;
  hasBase: boolean;
  pendingExtension?: {
    // New array format (supports multi-card extensions)
    cards?: Array<{ card: Card; source: string }>;
    // Legacy single-card format
    looseCard?: Card;
  };
}

export type AnyStack = TempStack | BuildStack;

// ── Union type for all items that can appear on the table ─────────────────────

export type TableItem = Card | TempStack | BuildStack;

// ── Type guards ───────────────────────────────────────────────────────────────

export function isTempStack(item: TableItem): item is TempStack {
  return 'type' in item && (item as TempStack).type === 'temp_stack';
}

export function isBuildStack(item: TableItem): item is BuildStack {
  return 'type' in item && (item as BuildStack).type === 'build_stack';
}

export function isAnyStack(item: TableItem): item is AnyStack {
  return isTempStack(item) || isBuildStack(item);
}

export function isLooseCard(item: TableItem): item is Card {
  return !isAnyStack(item);
}

// ── Player types ─────────────────────────────────────────────────────────────

export type TeamId = 'A' | 'B';

export interface Player {
  id: number;
  name: string;
  hand: Card[];
  captures: Card[];
  score: number;
  team?: TeamId; // Optional: team membership (computed from index if not set)
}

export interface GameState {
  players: Player[];
  table: TableItem[];
  currentPlayer: number;
  phase: 'play' | 'build' | 'scoring';
  round: number;
  teamScores: [number, number]; // [Team A, Team B]
  playerCount: number; // 2 or 4 players
}

// ── Team helpers ─────────────────────────────────────────────────────────────

/**
 * Get team ID from player index.
 * Players 0,1 = Team A, Players 2,3 = Team B
 */
export function getTeamFromIndex(playerIndex: number): TeamId {
  return playerIndex < 2 ? 'A' : 'B';
}

/**
 * Get teammate index (for 2v2 mode)
 * Returns the other player on the same team
 */
export function getTeammateIndex(playerIndex: number): number | null {
  if (playerIndex < 0 || playerIndex > 3) return null;
  // Team A: 0↔1, Team B: 2↔3
  return playerIndex < 2 
    ? (playerIndex === 0 ? 1 : 0)
    : (playerIndex === 2 ? 3 : 2);
}

// ── Action types ─────────────────────────────────────────────────────────────

export type ActionType = 
  | 'trail'
  | 'capture'
  | 'build'
  | 'steal'
  | 'extend_build'
  | 'cancel_temp'
  | 'accept_temp';

export interface GameAction {
  type: ActionType;
  playerId: number;
  payload?: any;
}

// ── Drag types ───────────────────────────────────────────────────────────────

export type DragSource = 'hand' | 'table' | 'captures';

export interface DragItem {
  cardId: string;
  source: DragSource;
  card?: Card;
  buildId?: string;
  isMultiCard?: boolean;
}

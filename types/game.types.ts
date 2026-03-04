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

export interface Player {
  id: number;
  name: string;
  hand: Card[];
  captures: Card[];
  score: number;
}

export interface GameState {
  players: Player[];
  table: TableItem[];
  currentPlayer: number;
  phase: 'play' | 'build' | 'scoring';
  round: number;
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

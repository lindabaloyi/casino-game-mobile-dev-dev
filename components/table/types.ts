/**
 * components/table/types.ts
 * Shared domain types for all table-related components.
 *
 * Single source of truth — import from here instead of re-declaring
 * Card / TempStack / BuildStack / TableItem in every component.
 */

// ── Card ──────────────────────────────────────────────────────────────────────

export interface Card {
  rank: string;
  suit: string;
  value: number;
  /** Internal metadata — set by server actions, stripped on cancel. */
  source?: 'hand' | 'table' | 'captured';
}

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
  // Dual build support: fixed base value
  baseFixed?: boolean;
  // Pending extension cards (like build_stack)
  pendingExtension?: {
    cards: { card: Card; source: string }[];
  };
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
    cards?: { card: Card; source: string }[];
    // Legacy single-card format
    looseCard?: Card;
  };
  /** Pending capture - when opponent is building to capture this build */
  pendingCapture?: {
    cards: { card: Card; source: string; originalOwner?: number }[];
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

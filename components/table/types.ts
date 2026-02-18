/**
 * components/table/types.ts
 * Shared domain types for all table-related components.
 *
 * Single source of truth — import from here instead of re-declaring
 * Card / TempStack / TableItem in every component.
 */

// ── Card ──────────────────────────────────────────────────────────────────────

export interface Card {
  rank: string;
  suit: string;
  value: number;
  /** Internal metadata — set by server actions, stripped on cancel. */
  source?: 'hand' | 'table';
}

// ── Stack types ───────────────────────────────────────────────────────────────

export interface TempStack {
  type: 'temp_stack';
  stackId: string;
  cards: Card[];
  owner: number;
  value: number;
}

export interface BuildStack {
  type: 'build_stack';
  stackId: string;
  cards: Card[];
  owner: number;
  value: number;
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

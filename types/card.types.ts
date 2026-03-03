/**
 * types/card.types.ts
 * Shared card type definitions for the casino game.
 * 
 * Single source of truth — import from here instead of re-declaring
 * Card types across components.
 */

// ── Card ──────────────────────────────────────────────────────────────────────

export interface Card {
  rank: string;
  suit: string;
  value: number;
  /** Internal metadata — set by server actions, stripped on cancel. */
  source?: 'hand' | 'table' | 'captured';
  /** Optional ID for tracking individual cards */
  id?: string;
}

// ── Card Helpers ───────────────────────────────────────────────────────────

export const SUITS = ['♠', '♥', '♦', '♣'] as const;
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export type Suit = typeof SUITS[number];
export type Rank = typeof RANKS[number];

// Card value mapping
export const CARD_VALUES: Record<Rank, number> = {
  'A': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
};

// Color helpers
export function getCardColor(suit: string): 'red' | 'black' {
  return (suit === '♥' || suit === '♦') ? 'red' : 'black';
}

export function isRedSuit(suit: string): boolean {
  return suit === '♥' || suit === '♦';
}

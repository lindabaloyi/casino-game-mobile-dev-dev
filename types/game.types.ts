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
  // Shiya (party mode) - indicates build was claimed by teammate
  shiyaActive?: boolean;
  shiyaPlayer?: number;
  previousOwner?: number;
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

/**
 * Per-player turn tracking state for a round.
 * Used to track whether a player has started/ended their turn.
 */
export interface RoundPlayerState {
  playerId: number;
  turnStarted: boolean;
  turnEnded: boolean;
  actionTriggered: boolean;
  actionCompleted: boolean;
}

// Map of player index to their round state
export type RoundPlayers = Record<number, RoundPlayerState>;

export interface GameState {
  players: Player[];
  table: TableItem[];
  currentPlayer: number;
  phase: 'play' | 'build' | 'scoring';
  round: number;
  teamScores: [number, number]; // [Team A, Team B]
  playerCount: number; // 2 or 4 players
  
  // Turn tracking per round
  roundPlayers: RoundPlayers;
  
  // Party mode (2v2): Track builds captured from teammates
  // teamCapturedBuilds[0] = builds captured from Team A, teamCapturedBuilds[1] = builds captured from Team B
  // Each entry contains { value: number, originalOwner: number, capturedBy: number }
  teamCapturedBuilds?: { 0: { value: number; originalOwner: number; capturedBy: number }[]; 1: { value: number; originalOwner: number; capturedBy: number }[] };
}

// ── Team helpers ─────────────────────────────────────────────────────────────

/**
 * Party turn sequence for 4-player games
 * Order: Team A P1 (0) → Team B P1 (2) → Team A P2 (1) → Team B P2 (3)
 */
export const PARTY_TURN_SEQUENCE = [0, 2, 1, 3] as const;
export type PartyTurnSequence = readonly [0, 2, 1, 3];

/**
 * Get the next player in party turn sequence
 */
export function getNextPartyPlayer(currentPlayer: number): number {
  const sequence = [...PARTY_TURN_SEQUENCE];
  const currentIndex = sequence.indexOf(currentPlayer as 0 | 2 | 1 | 3);
  if (currentIndex === -1) return sequence[0];
  return sequence[(currentIndex + 1) % sequence.length];
}

/**
 * Check if game uses party turn order (4 players)
 */
export function isPartyGame(playerCount: number): boolean {
  return playerCount === 4;
}

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

/**
 * Get player position label (P1 or P2) within their team
 * Team A: 0=P1, 1=P2 | Team B: 2=P1, 3=P2
 */
export function getPlayerPositionLabel(playerIndex: number): 'P1' | 'P2' {
  return playerIndex % 2 === 0 ? 'P1' : 'P2';
}

/**
 * Get full player tag (e.g., "Team A P1")
 */
export function getPlayerTag(playerIndex: number): string {
  const team = getTeamFromIndex(playerIndex);
  const position = getPlayerPositionLabel(playerIndex);
  return `Team ${team} ${position}`;
}

/**
 * Check if two players are teammates
 */
export function areTeammates(player1: number, player2: number): boolean {
  return getTeamFromIndex(player1) === getTeamFromIndex(player2);
}

// ── Team Colors ───────────────────────────────────────────────────────────────

export interface TeamColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  border: string;
}

/**
 * Team A colors - Coral/Red theme
 * Players 0 and 1 belong to Team A
 */
export const TEAM_A_COLORS: TeamColors = {
  primary: '#FF6B6B',
  secondary: '#FFE3E3',
  accent: '#C92A2A',
  background: '#FFF5F5',
  text: '#8B0000',
  border: '#FF8787',
};

/**
 * Team B colors - Blue theme
 * Players 2 and 3 belong to Team B
 */
export const TEAM_B_COLORS: TeamColors = {
  primary: '#4DABF7',
  secondary: '#E3F2FD',
  accent: '#1864AB',
  background: '#F0F7FF',
  text: '#0D47A1',
  border: '#74C0FC',
};

/**
 * Get team colors by team ID
 */
export function getTeamColors(teamId: TeamId): TeamColors {
  return teamId === 'A' ? TEAM_A_COLORS : TEAM_B_COLORS;
}

/**
 * Get the opposite team's colors
 */
export function getOppositeTeamColors(teamId: TeamId): TeamColors {
  return teamId === 'A' ? TEAM_B_COLORS : TEAM_A_COLORS;
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

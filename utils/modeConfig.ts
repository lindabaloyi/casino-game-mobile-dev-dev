/**
 * Mode Configuration
 * 
 * Centralized configuration for all game modes.
 * Extracted from OnlinePlayScreen for better separation of concerns.
 */

export type GameMode = 'two-hands' | 'three-hands' | 'four-hands' | 'party' | 'tournament';

export interface ModeConfig {
  title: string;
  subtitle: string;
  connectingSubtitle: string;
  playerCount: number;
  isTeamMode: boolean;
}

export const MODE_CONFIG: Record<GameMode, ModeConfig> = {
  'two-hands': {
    title: '⚔️ 2 Hands',
    subtitle: '1v1 Battle',
    connectingSubtitle: 'Finding opponent for 2 hands',
    playerCount: 2,
    isTeamMode: false,
  },
  'three-hands': {
    title: '🎴 3 Hands',
    subtitle: '3 Player Battle',
    connectingSubtitle: 'Finding opponents for three hands',
    playerCount: 3,
    isTeamMode: false,
  },
  'four-hands': {
    title: '🎯 4 Hands',
    subtitle: '4 Player Free-For-All',
    connectingSubtitle: 'Finding opponents for four hands',
    playerCount: 4,
    isTeamMode: false,
  },
  'party': {
    title: '🎉 Party Mode',
    subtitle: '2v2 Battle',
    connectingSubtitle: 'Finding players for party mode',
    playerCount: 4,
    isTeamMode: true,
  },
  'tournament': {
    title: '🏆 Tournament',
    subtitle: '4 Player Knockout',
    connectingSubtitle: 'Finding players for tournament',
    playerCount: 4,
    isTeamMode: false,
  },
};

export default MODE_CONFIG;

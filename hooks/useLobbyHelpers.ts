/**
 * useLobbyHelpers
 * 
 * Pure display utilities for lobby components.
 * No state management - just helper functions.
 * 
 * Extracted to replace redundant useLobbyMock hook.
 */

import { AVATAR_OPTIONS } from './usePlayerProfile';

export const getAvatarEmoji = (avatarId: string): string => {
  const avatar = AVATAR_OPTIONS.find(a => a.id === avatarId);
  return avatar?.emoji || '🎮';
};

export const getPingColor = (ping: number): string => {
  if (ping < 100) return '#4CAF50';
  if (ping < 200) return '#FFC107';
  return '#F44336';
};

export const getPingIcon = (ping: number): string => {
  if (ping < 100) return 'wifi';
  if (ping < 200) return 'wifi';
  return 'wifi-outline';
};

export default {
  getAvatarEmoji,
  getPingColor,
  getPingIcon,
};
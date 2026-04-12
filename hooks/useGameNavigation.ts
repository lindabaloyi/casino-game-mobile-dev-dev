/**
 * useGameNavigation
 * 
 * Handles navigation callbacks for game screens.
 * Provides consistent navigation actions across multiplayer and party modes.
 */

import { useCallback } from 'react';
import { useRouter } from 'expo-router';

export interface UseGameNavigationResult {
  /** Navigate back to home */
  goBack: () => void;
  /** Restart the current game */
  onRestart: () => void;
  /** Exit to home menu */
  onBackToMenu: () => void;
}

export function useGameNavigation(): UseGameNavigationResult {
  const router = useRouter();

  const goBack = useCallback(() => {
    router.replace('/' as any);
  }, [router]);

  const onRestart = useCallback(() => {
    // This will be connected to requestSync in the container
  }, []);

  const onBackToMenu = useCallback(() => {
    router.replace('/' as any);
  }, [router]);

  return {
    goBack,
    onRestart,
    onBackToMenu,
  };
}

export default useGameNavigation;

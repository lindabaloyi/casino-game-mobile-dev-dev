/**
 * useBuildContactRegistration - Hook for registering build positions with contact detection
 * FIXED VERSION: Properly registers builds for drag-and-drop interactions
 */

import { useEffect } from 'react';
import { View } from 'react-native';
import { removePosition, reportPosition } from '../src/utils/contactDetection';
import { DEBUG_CONFIG } from '../src/utils/debugConfig';

interface UseBuildContactRegistrationProps {
  buildItem: any;
  stackRef: React.RefObject<View>;
}

export function useBuildContactRegistration({
  buildItem,
  stackRef
}: UseBuildContactRegistrationProps): void {
  useEffect(() => {
    // 🚨 SAFETY CHECK 1: Valid build item
    if (!buildItem || !buildItem.buildId) {
      console.warn('[BUILD_CONTACT_REG] ❌ Invalid buildItem:', buildItem);
      return;
    }

    const buildId = buildItem.buildId;

    // 🚨 SAFETY CHECK 2: Valid ref
    if (!stackRef || !stackRef.current) {
      console.warn('[BUILD_CONTACT_REG] ❌ Invalid stackRef for build:', buildId);
      return;
    }

    console.log('[BUILD_CONTACT_REG] 🎯 Setting up contact registration for build:', {
      buildId,
      owner: buildItem.owner,
      cardCount: buildItem.cards?.length || 0
    });

    // Calculate accurate build dimensions for contact detection
    const calculateBuildDimensions = (cardCount: number) => {
      const baseHeight = 120;  // Standard card height
      const cardOverlap = 12;  // Overlap per additional card (from StackRenderer)
      const totalHeight = baseHeight + (Math.max(0, cardCount - 1) * cardOverlap);

      return {
        width: 80,   // Standard card width
        height: totalHeight
      };
    };

    // Function to measure and register build position
    const registerBuildBounds = () => {
      try {
        stackRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
          // Validate measurements
          if (isNaN(x) || isNaN(y) || width <= 0 || height <= 0) {
            if (DEBUG_CONFIG.CONTACT_DETECTION) {
              console.warn('[BUILD_CONTACT_REG] ⚠️ Invalid measurements:', { x, y, width, height });
            }
            return;
          }

          // Calculate accurate dimensions based on card count
          const cardCount = buildItem.cards?.length || 1;
          const accurateDimensions = calculateBuildDimensions(cardCount);

          // 🏗️ Register build with contact system (FIXED DATA STRUCTURE + ACCURATE DIMENSIONS)
          reportPosition(buildId, {
            id: buildId,
            x,
            y,
            width: accurateDimensions.width,     // ✅ Accurate width
            height: accurateDimensions.height,   // ✅ Accurate height based on card count
            type: 'build',
            data: {
              owner: buildItem.owner,
              value: buildItem.value,
              cards: buildItem.cards,
              isExtendable: true,
              buildId: buildId
            }
          });

          if (DEBUG_CONFIG.CONTACT_DETECTION) {
            console.log('📍 [BUILD_CONTACT_REG] 📍 Registered build position:', {
              buildId,
              owner: buildItem.owner,
              x: Math.round(x),
              y: Math.round(y),
              width: Math.round(width),
              height: Math.round(height),
              cardCount: buildItem.cards?.length || 0,
              timestamp: Date.now()
            });
          }
        });
      } catch (error) {
        console.error('[BUILD_CONTACT_REG] ❌ Error measuring build:', error);
      }
    };

    // Initial registration with small delay to ensure render
    const initialTimeout = setTimeout(() => {
      registerBuildBounds();
    }, 100);

    // Setup interval to update position (builds might move when cards are added)
    const UPDATE_INTERVAL = 1000; // Update every 1000ms (reduced frequency for performance)
    const intervalId = setInterval(registerBuildBounds, UPDATE_INTERVAL);

    // Cleanup function
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);

      // Remove from contact registry
      removePosition(buildId);

      if (DEBUG_CONFIG.CONTACT_DETECTION) {
        console.log('[BUILD_CONTACT_REG] 🧹 Cleaned up contact position for build:', buildId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildItem.buildId, buildItem.cards?.length, stackRef]); // Re-run only when build ID, card count, or ref changes
}

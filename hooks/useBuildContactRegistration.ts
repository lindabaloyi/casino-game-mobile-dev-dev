/**
 * useBuildContactRegistration - Hook for registering build positions with contact detection
 * Separated from BuildCardRenderer for better organization and testability
 */

import { useEffect } from 'react';
import { View } from 'react-native';

interface BuildContactRegistrationProps {
  buildItem: any;
  stackRef: React.RefObject<View>;
}

export function useBuildContactRegistration({
  buildItem,
  stackRef
}: BuildContactRegistrationProps) {

  // Register build position with contact detection system
  useEffect(() => {
    if (!stackRef.current) return;

    const buildId = buildItem.buildId;

    const measureAndReport = () => {
      stackRef.current?.measureInWindow((x, y, width, height) => {
        // Skip invalid measurements
        if (x === 0 && y === 0 && width === 0 && height === 0) {
          console.log('[BUILD_CONTACT_REG] Invalid measurement for build:', buildId);
          return;
        }

        console.log('[BUILD_CONTACT_REG] 📍 Reporting build position for contact detection:', {
          id: buildId,
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(width),
          height: Math.round(height),
          type: 'build',
          owner: buildItem.owner,
          value: buildItem.value
        });

        // Import and use reportPosition from contactDetection
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { reportPosition } = require('../src/utils/contactDetection');
        reportPosition(buildId, {
          id: buildId,
          x,
          y,
          width,
          height,
          type: 'build',
          data: buildItem
        });
      });
    };

    // Initial report
    const initialTimeout = setTimeout(measureAndReport, 50);

    // Re-measure periodically
    const intervalId = setInterval(measureAndReport, 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
      // Clean up position when component unmounts
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { removePosition } = require('../src/utils/contactDetection');
        removePosition(buildId);
      } catch {
        console.log('[BUILD_CONTACT_REG] Could not clean up position for:', buildId);
      }
      console.log('[BUILD_CONTACT_REG] 🧹 Cleaned up contact position for build:', buildId);
    };
  }, [buildItem, stackRef]);

  // This hook doesn't return anything - it's purely for side effects
}

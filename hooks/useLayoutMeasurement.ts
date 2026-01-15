import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';

interface LayoutBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

type ExpandedBounds = LayoutBounds;

/**
 * Hook for measuring component layout and calculating drop zone bounds
 * Handles retry logic for invalid measurements and bounds expansion
 */
export const useLayoutMeasurement = (
  stackId: string,
  expansionFactor: number = 0.15
) => {
  const ref = useRef<View>(null);
  const [bounds, setBounds] = useState<ExpandedBounds | null>(null);
  const [isMeasured, setIsMeasured] = useState(false);

  const calculateExpandedBounds = useCallback((
    x: number,
    y: number,
    width: number,
    height: number,
    factor: number
  ): ExpandedBounds => {
    return {
      x: x - (width * factor),
      y: y - (height * factor),
      width: width * (1 + 2 * factor),  // Double expansion for total area
      height: height * (1 + 2 * factor)
    };
  }, []);

  const measure = useCallback(() => {
    if (!ref.current) {
      return;
    }

    ref.current.measureInWindow((pageX, pageY, measuredWidth, measuredHeight) => {
      // Skip invalid measurements (often happen on first render)
      if (pageX === 0 && pageY === 0) {
        // Retry measurement after a short delay
        setTimeout(() => {
          if (ref.current) {
            ref.current.measureInWindow((retryX, retryY, retryWidth, retryHeight) => {
              if (retryX !== 0 || retryY !== 0) {
                const expandedBounds = calculateExpandedBounds(
                  retryX, retryY, measuredWidth, measuredHeight, expansionFactor
                );
                setBounds(expandedBounds);
                setIsMeasured(true);

                console.log(`[useLayoutMeasurement] 📏 Final bounds for ${stackId}:`, {
                  bounds: expandedBounds,
                  expansionFactor: `${(expansionFactor * 100).toFixed(0)}%`,
                  totalExpansion: `${((expansionFactor * 2) * 100).toFixed(0)}% wider/taller`
                });
              } else {
              }
            });
          }
        }, 100);
        return;
      }

      // Valid measurement - calculate expanded bounds
      const expandedBounds = calculateExpandedBounds(
        pageX, pageY, measuredWidth, measuredHeight, expansionFactor
      );
      setBounds(expandedBounds);
      setIsMeasured(true);

      console.log(`[useLayoutMeasurement] 📏 Measured bounds for ${stackId}:`, {
        bounds: expandedBounds,
        expansionFactor: `${(expansionFactor * 100).toFixed(0)}%`,
        totalExpansion: `${((expansionFactor * 2) * 100).toFixed(0)}% wider/taller`
      });
    });
  }, [stackId, expansionFactor, calculateExpandedBounds]);

  return {
    ref,
    bounds,
    isMeasured,
    measure
  };
};

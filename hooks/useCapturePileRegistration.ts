/**
 * useCapturePileRegistration
 * Custom hook for measuring and registering capture pile bounds.
 */

import { useEffect, useCallback, useRef } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import { CapturePileBounds } from './useDrag';

interface UseCapturePileRegistrationProps {
  registerCapturePile?: (bounds: CapturePileBounds) => void;
  unregisterCapturePile?: () => void;
  playerIndex: number;
}

export function useCapturePileRegistration({
  registerCapturePile,
  unregisterCapturePile,
  playerIndex,
}: UseCapturePileRegistrationProps) {
  const hasRegisteredRef = useRef(false);

  const measureAndRegister = useCallback(() => {
    // This will be called via ref in the component
  }, []);

  // Handle layout event to register bounds
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    if (registerCapturePile && !hasRegisteredRef.current) {
      event.target.measureInWindow((x, y, width, height) => {
        registerCapturePile({ x, y, width, height, playerIndex });
        hasRegisteredRef.current = true;
      });
    }
  }, [registerCapturePile, playerIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unregisterCapturePile) {
        unregisterCapturePile();
      }
    };
  }, [unregisterCapturePile]);

  return {
    handleLayout,
    measureAndRegister,
    hasRegistered: hasRegisteredRef.current,
  };
}

export default useCapturePileRegistration;

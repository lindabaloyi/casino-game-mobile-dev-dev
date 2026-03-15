/**
 * useStackRegistration
 * Handles measuring the view and registering/unregistering with the parent drag system.
 * Reusable by both TempStackView and BuildStackView.
 */

import { useEffect, useCallback, useRef } from 'react';
import { View } from 'react-native';
import { TempStackBounds } from '../../../hooks/useDrag';

interface UseStackRegistrationProps {
  stackId: string;
  owner: number;
  stackType: string;
  layoutVersion: number;
  register: (id: string, bounds: TempStackBounds) => void;
  unregister: (id: string) => void;
}

export function useStackRegistration({
  stackId,
  owner,
  stackType,
  layoutVersion,
  register,
  unregister,
}: UseStackRegistrationProps) {
  const viewRef = useRef<View>(null);

  const measure = useCallback(() => {
    requestAnimationFrame(() => {
      viewRef.current?.measureInWindow((x, y, width, height) => {
        register(stackId, {
          x,
          y,
          width,
          height,
          stackId,
          owner,
          stackType: stackType as 'temp_stack' | 'build_stack',
        });
      });
    });
  }, [stackId, owner, stackType, register]);

  // Measure on layout version change (table reflow)
  useEffect(() => {
    measure();
  }, [layoutVersion, measure]);

  // Unregister on unmount
  useEffect(() => {
    return () => unregister(stackId);
  }, [stackId, unregister]);

  return viewRef;
}

export default useStackRegistration;

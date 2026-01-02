/**
 * useDragSnapping - Universal hook for visual drag snapping to valid targets
 * Provides magnetic "fits like a glove" behavior for drag operations
 */

import { useCallback, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { findContactAtPoint } from '../src/utils/contactDetection';

interface Contact {
  id: string;
  type: string;
  distance: number;
  x: number;
  y: number;
  width: number;
  height: number;
  data?: any;
}

interface DragSnappingOptions {
  pan: Animated.ValueXY;
  currentPlayer: number;
  contactThreshold?: number;
  snapAnimationConfig?: {
    duration: number;
    easing: any;
  };
}

interface DragSnappingResult {
  snappedContact: Contact | null;
  isSnapped: boolean;
  checkSnappingAtPosition: (x: number, y: number) => void;
  unsnap: () => void;
  snapToContact: (contact: Contact) => void;
}

export function useDragSnapping({
  pan,
  currentPlayer,
  contactThreshold = 80,
  snapAnimationConfig = {
    duration: 200,
    easing: Easing.out(Easing.back(1.5))
  }
}: DragSnappingOptions): DragSnappingResult {

  const [snappedContact, setSnappedContact] = useState<Contact | null>(null);
  const lastCheckTime = useRef(0);
  const checkThrottleMs = 16; // ~60fps

  // Check if a contact is a valid snapping target
  const isValidSnapTarget = useCallback((contact: Contact): boolean => {
    if (contact.type === 'build') {
      // Only snap to player's own builds
      const build = contact.data;
      return build && build.owner === currentPlayer;
    }
    return false;
  }, [currentPlayer]);

  // Snap to a specific contact position
  const snapToContact = useCallback((contact: Contact) => {
    if (!isValidSnapTarget(contact)) return;

    console.log(`[DRAG_SNAPPING] 🎯 Snapping to ${contact.type}: ${contact.id}`);

    // Calculate center position of the contact
    const centerX = contact.x + contact.width / 2;
    const centerY = contact.y + contact.height / 2;

    // Get current pan offset values
    const currentX = (pan.x as any)._value || 0;
    const currentY = (pan.y as any)._value || 0;

    // Calculate required translation to center on target
    const targetX = centerX - currentX;
    const targetY = centerY - currentY;

    // Animate to snapped position
    Animated.timing(pan, {
      toValue: { x: targetX, y: targetY },
      duration: snapAnimationConfig.duration,
      easing: snapAnimationConfig.easing,
      useNativeDriver: false
    }).start();

    setSnappedContact(contact);
  }, [pan, snapAnimationConfig, isValidSnapTarget]);

  // Remove snapping and return to finger-following
  const unsnap = useCallback(() => {
    if (snappedContact) {
      console.log(`[DRAG_SNAPPING] 🆓 Unsnapping from ${snappedContact.type}: ${snappedContact.id}`);
      setSnappedContact(null);
    }
  }, [snappedContact]);

  // Check for snapping at a specific position (throttled)
  const checkSnappingAtPosition = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastCheckTime.current < checkThrottleMs) return;

    lastCheckTime.current = now;

    const basicContact = findContactAtPoint(x, y, contactThreshold);

    if (basicContact) {
      // Get full position data from contactPositions
      // Import the positions map dynamically to avoid circular imports
      const { contactPositions } = require('../src/utils/contactDetection');
      const fullPosition = contactPositions.get(basicContact.id);

      if (fullPosition) {
        // Create complete contact object
        const contact: Contact = {
          id: basicContact.id,
          type: basicContact.type,
          distance: basicContact.distance,
          x: fullPosition.x,
          y: fullPosition.y,
          width: fullPosition.width,
          height: fullPosition.height,
          data: basicContact.data || fullPosition.data
        };

        if (isValidSnapTarget(contact)) {
          // Valid snapping target found
          if (!snappedContact || snappedContact.id !== contact.id) {
            snapToContact(contact);
          }
          return;
        }
      }
    }

    // No valid target or moved away from current target
    unsnap();
  }, [contactThreshold, isValidSnapTarget, snappedContact, snapToContact, unsnap]);

  return {
    snappedContact,
    isSnapped: snappedContact !== null,
    checkSnappingAtPosition,
    unsnap,
    snapToContact
  };
}

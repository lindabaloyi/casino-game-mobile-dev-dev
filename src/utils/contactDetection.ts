/**
 * Simple contact-based detection system
 * Replaces the complex drop zone system
 */

import { DEBUG_CONFIG } from './debugConfig';

export interface ContactPosition {
  id: string;              // Unique identifier: "5♦" for cards, buildId for builds
  x: number;               // Screen X coordinate
  y: number;               // Screen Y coordinate
  width: number;          // Element width
  height: number;         // Element height
  type: 'card' | 'build' | 'tempStack';
  data?: any;             // Original card/build data for action determination
}

// Global registry of positions - simple Map
const contactPositions = new Map<string, ContactPosition>();

/**
 * Report a card/build position to the contact system
 */
export function reportPosition(id: string, position: ContactPosition): void {
  contactPositions.set(id, position);

  if (DEBUG_CONFIG.CONTACT_DETECTION) {
    console.log(`[CONTACT] 📍 Position reported: ${id} (${position.type})`);
  }
}

/**
 * Remove a position from the contact system
 */
export function removePosition(id: string): void {
  contactPositions.delete(id);
  console.log('[CONTACT] 🗑️ Position removed:', id);
}

/**
 * Find the closest contact at a given point, with a priority system.
 */
export function findContactAtPoint(
  x: number,
  y: number,
  threshold: number = 80
): {
  id: string;
  type: string;
  distance: number;
  data?: any;
} | null {

  if (contactPositions.size === 0) {
    if (DEBUG_CONFIG.CONTACT_SYSTEM) {
      console.log('[CONTACT] 🔍 No positions registered');
    }
    return null;
  }

  const hits = [];

  console.log(`[CONTACT] 🔍 Checking contact at (${x.toFixed(1)}, ${y.toFixed(1)}) against ${contactPositions.size} positions (threshold: ${threshold}px)`);

  // Log all registered positions for debugging
  console.log('[CONTACT] 📍 Registered positions:');
  for (const [id, pos] of contactPositions) {
    console.log(`  - ${id} (${pos.type}): (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}) ${pos.width.toFixed(1)}x${pos.height.toFixed(1)}`);
  }

  for (const [id, pos] of contactPositions) {
    const centerX = pos.x + pos.width / 2;
    const centerY = pos.y + pos.height / 2;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

    console.log(`[CONTACT] Distance to ${id} (${pos.type}): ${distance.toFixed(1)}px ${distance < threshold ? '✅ HIT' : '❌ MISS'}`);

    if (distance < threshold) {
      hits.push({ id, type: pos.type, distance, data: pos.data });
    }
  }

  if (hits.length === 0) {
    if (DEBUG_CONFIG.CONTACT_SYSTEM) {
      console.log(`[CONTACT] ❌ No contact within ${threshold}px threshold`);
    }
    return null;
  }

  // If we have hits, apply priority logic
  const priorityOrder = ['build', 'card', 'tempStack'];

  let bestHit = null;

  for (const priority of priorityOrder) {
    const priorityHits = hits.filter(hit => hit.type === priority);
    if (priorityHits.length > 0) {
      // If we find any hits at the current priority level, find the closest one among them
      let closestInPriority = priorityHits[0];
      for (let i = 1; i < priorityHits.length; i++) {
        if (priorityHits[i].distance < closestInPriority.distance) {
          closestInPriority = priorityHits[i];
        }
      }
      bestHit = closestInPriority;
      break; // Stop searching once we've found a contact at the highest priority level
    }
  }

  // Fallback to closest if no priority match (shouldn't happen if hits > 0)
  if (!bestHit && hits.length > 0) {
    bestHit = hits.reduce((closest, current) => current.distance < closest.distance ? current : closest, hits[0]);
  }

  if (DEBUG_CONFIG.CONTACT_SYSTEM) {
    if (bestHit) {
      console.log(`[CONTACT] ✅ Found contact: ${bestHit.id} (${bestHit.type}) at ${bestHit.distance.toFixed(1)}px`);
    }
  }

  return bestHit;
}


/**
 * Clear all positions (useful for cleanup)
 */
export function clearAllPositions(): void {
  contactPositions.clear();
  console.log('[CONTACT] 🧹 Cleared all positions');
}

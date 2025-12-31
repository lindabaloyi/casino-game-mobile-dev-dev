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
 * Find the closest contact at a given point - pure distance-based detection
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
    console.log(`[CONTACT]   Position: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}) Size: ${pos.width.toFixed(1)}x${pos.height.toFixed(1)} Center: (${centerX.toFixed(1)}, ${centerY.toFixed(1)})`);

    if (distance < threshold) {
      console.log(`[CONTACT]   ✅ Adding to hits: ${id}`);
      hits.push({ id, type: pos.type, distance, data: pos.data });
    }
  }

  if (hits.length === 0) {
    if (DEBUG_CONFIG.CONTACT_SYSTEM) {
      console.log(`[CONTACT] ❌ No contact within ${threshold}px threshold`);
    }
    return null;
  }

  // PURE DISTANCE-BASED: Find the closest hit regardless of type
  const closestHit = hits.reduce((closest, current) =>
    current.distance < closest.distance ? current : closest, hits[0]);

  if (DEBUG_CONFIG.CONTACT_SYSTEM) {
    console.log(`[CONTACT] ✅ Found closest contact: ${closestHit.id} (${closestHit.type}) at ${closestHit.distance.toFixed(1)}px`);
  }

  return closestHit;
}


/**
 * Clear all positions (useful for cleanup)
 */
export function clearAllPositions(): void {
  contactPositions.clear();
  console.log('[CONTACT] 🧹 Cleared all positions');
}

/**
 * Simple contact-based detection system
 * Replaces the complex drop zone system
 */

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

  console.log('[CONTACT] 📍 Position reported:', {
    id,
    type: position.type,
    bounds: { x: position.x, y: position.y, width: position.width, height: position.height }
  });
}

/**
 * Remove a position from the contact system
 */
export function removePosition(id: string): void {
  contactPositions.delete(id);
  console.log('[CONTACT] 🗑️ Position removed:', id);
}

/**
 * Find the closest contact at a given point
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
    console.log('[CONTACT] 🔍 No positions registered');
    return null;
  }

  let closest = null;
  let minDistance = Infinity;

  console.log(`[CONTACT] 🔍 Checking contact at (${x.toFixed(1)}, ${y.toFixed(1)}) against ${contactPositions.size} positions`);

  for (const [id, pos] of contactPositions) {
    // Calculate center of the element
    const centerX = pos.x + pos.width / 2;
    const centerY = pos.y + pos.height / 2;

    // Simple Euclidean distance
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

    console.log(`[CONTACT] 📏 Check ${id} (${pos.type}): distance=${distance.toFixed(1)}`);

    if (distance < threshold && distance < minDistance) {
      minDistance = distance;
      closest = { id, type: pos.type, distance, data: pos.data };
      console.log(`[CONTACT] 🎯 New closest: ${id} (${pos.type}) at ${distance.toFixed(1)}px`);
    }
  }

  if (closest) {
    console.log(`[CONTACT] ✅ Found contact: ${closest.id} (${closest.type}) at ${closest.distance.toFixed(1)}px`);
  } else {
    console.log(`[CONTACT] ❌ No contact within ${threshold}px threshold`);
  }

  return closest;
}

/**
 * Clear all positions (useful for cleanup)
 */
export function clearAllPositions(): void {
  contactPositions.clear();
  console.log('[CONTACT] 🧹 Cleared all positions');
}

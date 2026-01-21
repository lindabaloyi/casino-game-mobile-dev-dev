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
export const contactPositions = new Map<string, ContactPosition>();

/**
 * Report a card/build position to the contact system
 */
export function reportPosition(id: string, position: ContactPosition): void {
  contactPositions.set(id, position);
}

/**
 * Remove a position from the contact system
 */
export function removePosition(id: string): void {
  contactPositions.delete(id);
}

/**
 * Find the closest contact at a given point - distance-based with context priority
 */
export function findContactAtPoint(
  x: number,
  y: number,
  threshold: number = 80,
  context?: {
    hasActiveBuild?: boolean;
    currentPlayer?: number;
    excludeId?: string;  // NEW: Exclude this contact ID from results
  }
): {
  id: string;
  type: string;
  distance: number;
  data?: any;
} | null {

  console.log('[CONTACT_DETECTION] 🔍 Searching for contact at point:', { x, y, threshold, context });

  if (contactPositions.size === 0) {
    console.log('[CONTACT_DETECTION] ❌ No contact positions registered!');
    return null;
  }

  console.log('[CONTACT_DETECTION] 📋 All registered contacts:', Array.from(contactPositions.entries()).map(([id, pos]) => ({
    id,
    type: pos.type,
    x: Math.round(pos.x),
    y: Math.round(pos.y),
    width: pos.width,
    height: pos.height,
    centerX: Math.round(pos.x + pos.width / 2),
    centerY: Math.round(pos.y + pos.height / 2)
  })));

  const hits = [];

  for (const [id, pos] of contactPositions) {
    // Skip excluded contact (prevents dragged card from finding itself)
    if (context?.excludeId && id === context.excludeId) {
      console.log(`[CONTACT_DETECTION] ⏭️ Skipping excluded contact: ${id}`);
      continue;
    }

    const centerX = pos.x + pos.width / 2;
    const centerY = pos.y + pos.height / 2;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

    console.log(`[CONTACT_DETECTION] 📏 Distance calculation for ${id}:`, {
      contactCenter: `(${Math.round(centerX)}, ${Math.round(centerY)})`,
      dropPoint: `(${Math.round(x)}, ${Math.round(y)})`,
      distance: Math.round(distance),
      threshold,
      withinThreshold: distance < threshold,
      type: pos.type
    });

    if (distance < threshold) {
      console.log(`[CONTACT_DETECTION] ✅ HIT: ${id} is within threshold!`);
      hits.push({ id, type: pos.type, distance, data: pos.data });
    } else {
      console.log(`[CONTACT_DETECTION] ❌ MISS: ${id} is outside threshold`);
    }
  }

  if (hits.length === 0) {
    return null;
  }

  // 🎯 CONTEXT PRIORITY: During build extension, prefer player's own build
  if (context?.hasActiveBuild && context?.currentPlayer !== undefined) {
    const playerBuildHit = hits.find(hit =>
      hit.type === 'build' && hit.data?.owner === context.currentPlayer
    );

    if (playerBuildHit) {
      return playerBuildHit;
    }
  }

  // PURE DISTANCE-BASED: Find the closest hit regardless of type
  return hits.reduce((closest, current) =>
    current.distance < closest.distance ? current : closest, hits[0]);
}


/**
 * Get all registered contacts (for debugging)
 */
export function getAllContacts(): ContactPosition[] {
  return Array.from(contactPositions.values());
}

/**
 * Debug full contact registry (comprehensive diagnostic)
 */
export function debugFullContactRegistry() {
  const contacts = Array.from(contactPositions.entries());

  const byType: Record<string, any[]> = {};
  contacts.forEach(([id, contact]) => {
    const type = contact.type;
    if (!byType[type]) byType[type] = [];
    byType[type].push({ ...contact });
  });

  return { contacts, byType };
}

/**
 * Clear all positions (useful for cleanup)
 */
export function clearAllPositions(): void {
  contactPositions.clear();
}

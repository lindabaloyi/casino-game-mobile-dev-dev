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

  if (contactPositions.size === 0) {
    return null;
  }

  const hits = [];

  for (const [id, pos] of contactPositions) {
    // Skip excluded contact (prevents dragged card from finding itself)
    if (context?.excludeId && id === context.excludeId) {
      continue;
    }

    const centerX = pos.x + pos.width / 2;
    const centerY = pos.y + pos.height / 2;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

    if (distance < threshold) {
      hits.push({ id, type: pos.type, distance, data: pos.data });
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

  console.log('📊 Contacts by type:', Object.keys(byType).map(type => ({
    type,
    count: byType[type].length,
    ids: byType[type].map(c => c.id)
  })));

  // Show builds in detail
  if (byType.build) {
    byType.build.forEach((build, i) => {
      console.log(`  Build ${i}: ${build.id}`, {
        owner: build.data?.owner,
        bounds: { x: Math.round(build.x), y: Math.round(build.y),
                 width: Math.round(build.width), height: Math.round(build.height) },
        cards: build.data?.cards?.length || 0
      });
    });
  }

  // Show temp stacks in detail
  if (byType.tempStack) {
    byType.tempStack.forEach((stack, i) => {
      console.log(`  TempStack ${i}: ${stack.id}`, {
        bounds: { x: Math.round(stack.x), y: Math.round(stack.y) },
        isUniversalStaging: stack.id.includes('universal-staging')
      });
    });
  }

  // Show loose cards
  if (byType.card) {
  }
  return { contacts, byType };
}

/**
 * Clear all positions (useful for cleanup)
 */
export function clearAllPositions(): void {
  contactPositions.clear();
}

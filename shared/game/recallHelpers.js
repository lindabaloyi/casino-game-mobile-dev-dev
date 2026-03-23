/**
 * Recall Helpers - Unified approach for Shiya recall system
 * 
 * Key principle: Store the exact captured item at capture time,
 * restore it verbatim on recall.
 * 
 * All 4 capture actions trigger recall for the capturer's teammates:
 * - captureTemp.js (captures opponent's temp stack)
 * - captureOwn.js (captures own temp stack)
 * - completeCapture.js (completes a build capture)
 * - dropToCapture.js (drops own stack to capture)
 */

const { areTeammates, getTeamFromIndex } = require('./team');

/**
 * Deep clone an object
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Extract cards from any capturable item
 * - Single card: returns [card]
 * - Stack with cards: returns card.cards
 */
function getCardsFromItem(item) {
  return item.cards || [item];
}

/**
 * Generate unique recall ID
 */
function generateRecallId(capturedBy) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `recall_${capturedBy}_${timestamp}_${random}`;
}

/**
 * Get teammate indices for a player (excluding self)
 */
function getTeammates(state, playerIdx) {
  const team = getTeamFromIndex(playerIdx);
  const teammates = [];
  
  for (let i = 0; i < state.playerCount; i++) {
    if (i !== playerIdx && getTeamFromIndex(i) === team) {
      teammates.push(i);
    }
  }
  
  return teammates;
}

/**
 * Create recall entries for teammates when a capture happens.
 * 
 * NEW BEHAVIOR: Always create recall entries for the capturer's teammates
 * when any capture occurs - no Shiya activation required.
 * 
 * @param {object} state - Game state (cloned)
 * @param {number} capturerIdx - Player who did the capturing
 * @param {object} capturedItem - The exact table item being captured
 *                               (single card, temp stack, or build stack)
 * @returns {object} Updated state
 */
function createRecallEntries(state, capturerIdx, capturedItem) {
  // Only in party mode (4 players)
  if (state.playerCount !== 4) {
    return state;
  }

  // Get teammates of the capturer (excluding self)
  const teammates = getTeammates(state, capturerIdx);
  if (teammates.length === 0) return state;

  // Initialize shiyaRecalls if needed
  if (!state.shiyaRecalls) {
    state.shiyaRecalls = {};
  }

  for (const teammateIdx of teammates) {
    if (!state.shiyaRecalls[teammateIdx]) {
      state.shiyaRecalls[teammateIdx] = {};
    }

    const recallId = generateRecallId(capturerIdx);
    state.shiyaRecalls[teammateIdx][recallId] = {
      recallId,
      originalStackId: capturedItem.stackId,
      capturedItem: deepClone(capturedItem),
      capturedBy: capturerIdx,
      timestamp: Date.now(),
      value: capturedItem.value,
      type: capturedItem.type || 'single_card',
      description: generateDescription(capturedItem),
    };

    console.log(`[createRecallEntries] Created recall for teammate ${teammateIdx}:`, {
      recallId,
      originalStackId: capturedItem.stackId,
      type: capturedItem.type,
      value: capturedItem.value,
    });
  }

  return state;
}

/**
 * Generate human-readable description for a captured item
 */
function generateDescription(capturedItem) {
  if (!capturedItem.type) {
    // Single card
    return `${capturedItem.rank}${capturedItem.suit}`;
  }
  
  if (capturedItem.type === 'temp_stack') {
    const cardValues = capturedItem.cards?.map(c => c.rank).join('+') || '';
    return `Temp Stack: ${capturedItem.value} (${cardValues})`;
  }
  
  if (capturedItem.type === 'build_stack') {
    const cardValues = capturedItem.cards?.map(c => c.rank).join('+') || '';
    return `Build: ${capturedItem.value} (${cardValues})`;
  }
  
  return `${capturedItem.type}: ${capturedItem.value}`;
}

module.exports = {
  deepClone,
  getCardsFromItem,
  generateRecallId,
  getTeammates,
  createRecallEntries,           // new name
  createShiyaRecallEntries: createRecallEntries, // alias for backward compatibility
  generateDescription,
};

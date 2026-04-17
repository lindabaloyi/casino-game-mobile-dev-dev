/**
 * captureTemp
 * Immediate capture of a temp stack when player drops a card matching the build hint.
 * 
 * This action is routed by SmartRouter when:
 * 1. Player drops a card onto their own temp stack
 * 2. The dropped card matches the temp stack's build hint (need value)
 * 3. This provides instant capture without showing PlayOptionsModal
 */

const { cloneState, nextTurn, startPlayerTurn, triggerAction } = require('../');
const { createRecallEntries } = require('../recallHelpers');
const buildCalculator = require('../buildCalculator');

/**
 * Helper: Counts bits in a mask (for partition iteration)
 */
function bitCount(mask) {
  let count = 0;
  while (mask) {
    count += mask & 1;
    mask >>= 1;
  }
  return count;
}

/**
 * Helper: Check if a card is from a capture pile
 */
function hasCaptureCardSource(card) {
  const source = card.source;
  if (!source) return false;
  return source.startsWith('captured');
}

/**
 * Helper: Check if a card is from an OPPONENT'S capture pile (not the capturing player's own)
 * @param {Object} card - The card object with source property
 * @param {number} playerIndex - The capturing player's index
 * @returns {boolean} - True if from opponent's capture pile
 */
function isOpponentCaptureCard(card, playerIndex) {
  const source = card.source;
  if (!source) return false;
  
  // 'captured' alone means player's own captures - not opponent
  if (source === 'captured') return false;
  
  // 'captured_X' where X is not the playerIndex = opponent's capture
  if (source.startsWith('captured_')) {
    const ownerIdx = parseInt(source.split('_')[1], 10);
    return ownerIdx !== playerIndex;
  }
  
  return false;
}

/**
 * Validates that opponent capture cards are allowed based on build type.
 * Refined rules from .clinerules:
 * - For each constituent build in partition:
 *   - If sum build (total ≤10): all cards must be loose
 *   - If difference build (total >10): opponent capture cards allowed
 *
 * @param {Array} stackCards - Array of cards in the temp stack
 * @param {Object} captureCard - The card being used to capture
 * @param {number} playerIndex - The capturing player's index
 * @returns {Object} - { valid: boolean, reason: string }
 */
function validateOpponentCaptureCards(stackCards, captureCard, playerIndex) {
  // Combine all cards for validation
  const allCards = [...stackCards, captureCard];
  
  if (!allCards || allCards.length === 0) {
    return { valid: true, reason: 'No cards to validate' };
  }

  // Get card values
  const values = allCards.map(c => c.value);
  const n = values.length;
  
  // Check if any cards come from OPPONENT'S capture pile (not own)
  const hasOpponentCapture = allCards.some(c => isOpponentCaptureCard(c, playerIndex));

  // If no opponent capture cards, validation passes
  if (!hasOpponentCapture) {
    return { valid: true, reason: 'No opponent capture cards used' };
  }

  // CRITICAL: Determine what build value the capture card is capturing for
  // The capture card value IS the target value being captured
  const captureValue = captureCard.value;
  
  // Get the stack card values (not including capture card)
  const stackValues = stackCards.map(c => c.value);
  const stackTotal = stackValues.reduce((a, b) => a + b, 0);

  // Check if stack cards are all same rank (e.g., [2,2,2]) - allow capture with that rank
  const stackRanks = stackCards.map(c => c.rank);
  const stackAllSameRank = stackRanks.length > 1 && stackRanks.every(r => r === stackRanks[0]);
  if (stackAllSameRank && captureCard.value === stackValues[0]) {
    // Same-rank stack - opponent capture cards allowed
    return { valid: true, reason: 'Same-rank stack: opponent capture cards allowed' };
  }

  // Determine if the capture is for a sum build or difference build:
  // - If stackTotal equals captureValue: it's a sum build (all cards add up exactly)
  // - If stackTotal > captureValue: it's a difference build (captureValue = largest card)
  
  // Check if it's a sum build capture
  if (stackTotal === captureValue && stackTotal <= 10) {
    // Sum build capture: check if stack contains opponent capture cards
    const hasOpponentInStack = stackCards.some(c => isOpponentCaptureCard(c, playerIndex));
    if (hasOpponentInStack) {
      return {
        valid: false,
        reason: `Sum build (total=${stackTotal}): cannot use opponent capture cards in stack. Use only hand or table cards.`
      };
    }
    return { valid: true, reason: 'Sum build: stack cards are valid (loose cards only)' };
  }
  
  // Check if it's a difference build capture (captureValue is the largest card)
  // Difference build: captureValue = largest card in stack
  if (stackTotal > captureValue) {
    const maxStackValue = Math.max(...stackValues);
    const otherSum = stackTotal - maxStackValue;
    const need = captureValue - otherSum;
    
    if (maxStackValue === captureValue && need >= 0) {
      // Valid difference build - opponent capture cards allowed
      return { valid: true, reason: 'Difference build: opponent capture cards allowed' };
    }
  }
  
  // Also check reverse: captureValue could be largest, and other cards form the need
  if (captureValue > stackTotal - captureValue) {
    const need = captureValue - (stackTotal - captureValue);
    if (need >= 0) {
      // Valid difference build - opponent capture cards allowed
      return { valid: true, reason: 'Difference build: opponent capture cards allowed' };
    }
  }
  
  // Now try multi-build partition logic as fallback
  const multiBuildResult = buildCalculator.calculateMultiBuildValue(values);
  
  // If multi-build partition exists, check each sub-build
  if (multiBuildResult !== null && multiBuildResult.buildType === 'multi') {
    // Find the actual partition (which cards go to which build)
    const maxMask = 1 << n;
    
    // Try all partitions to find one where both sub-builds are valid
    for (let mask = 1; mask < maxMask; mask++) {
      const size1 = bitCount(mask);
      if (size1 < 1 || size1 >= n) continue;
      
      // Get indices for first subset
      const subset1Indices = [];
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) subset1Indices.push(i);
      }
      
      // Get indices for second subset (complement)
      const subset2Indices = [];
      for (let i = 0; i < n; i++) {
        if (!(mask & (1 << i))) subset2Indices.push(i);
      }
      
      // Get values and cards for each subset
      const subset1Values = subset1Indices.map(i => values[i]);
      const subset2Values = subset2Indices.map(i => values[i]);
      const subset1Cards = subset1Indices.map(i => allCards[i]);
      const subset2Cards = subset2Indices.map(i => allCards[i]);
      
      // Check if both subsets form valid builds
      const target1 = buildCalculator.getBuildTargetForSubset(subset1Values);
      const target2 = buildCalculator.getBuildTargetForSubset(subset2Values);
      
      if (target1 !== null && target2 !== null && target1 === target2) {
        // Valid partition found! Check each sub-build
        const sum1 = subset1Values.reduce((a, b) => a + b, 0);
        const sum2 = subset2Values.reduce((a, b) => a + b, 0);
        
        // Check sub-build 1
        if (sum1 <= 10) {
          // Sum build: all cards must be loose (not opponent capture)
          const hasOpponentInBuild1 = subset1Cards.some(c => isOpponentCaptureCard(c, playerIndex));
          if (hasOpponentInBuild1) {
            return {
              valid: false,
              reason: `Multi-build: sum sub-build (total=${sum1}) cannot use opponent capture cards. Use only hand or table cards.`
            };
          }
        }
        
        // Check sub-build 2
        if (sum2 <= 10) {
          // Sum build: all cards must be loose (not opponent capture)
          const hasOpponentInBuild2 = subset2Cards.some(c => isOpponentCaptureCard(c, playerIndex));
          if (hasOpponentInBuild2) {
            return {
              valid: false,
              reason: `Multi-build: sum sub-build (total=${sum2}) cannot use opponent capture cards. Use only hand or table cards.`
            };
          }
        }
        
        // Both sub-builds pass (either difference builds or sum with no opponent cards)
        return { valid: true, reason: 'Multi-build: sub-builds valid (difference or sum with loose cards)' };
      }
    }
    
    // If we found multi-build result but couldn't reconstruct partition, allow it
    // (conservative fallback)
    return { valid: true, reason: 'Multi-build partition validated' };
  }

  // Single build case (no partition): sum build or difference build without multi-build
  const total = values.reduce((a, b) => a + b, 0);
  
  // Check for difference build (total >10, target = largest)
  if (total > 10) {
    const target = buildCalculator.getBuildTargetForSubset(values);
    if (target !== null && target === Math.max(...values)) {
      return { valid: true, reason: 'Difference build: opponent capture cards allowed' };
    }
  }

  // Sum build (total ≤10): no opponent capture cards allowed
  if (total <= 10) {
    return { 
      valid: false, 
      reason: 'Sum build (total ≤10): cannot use opponent capture cards. Use only hand or table cards.' 
    };
  }

  // Fallback: allow if we can't determine build type
  return { valid: true, reason: 'Build type undetermined, allowing' };
}

function captureTemp(state, payload, playerIndex) {
  const { card, stackId, source } = payload;
  
  if (!card || !stackId) {
    throw new Error('captureTemp: missing card or stackId');
  }
  
  let newState = cloneState(state);
  
  // Find the temp stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'temp_stack' && tc.stackId === stackId,
  );
  
  if (stackIdx === -1) {
    throw new Error(`captureTemp: temp stack "${stackId}" not found`);
  }
  
  const stack = newState.tableCards[stackIdx];
  
  // Validate that this is the player's own temp stack
  if (stack.owner !== playerIndex) {
    throw new Error(`captureTemp: cannot capture temp stack owned by player ${stack.owner}`);
  }

  // Validate opponent capture cards are allowed based on build type
  // Use the source from payload directly
  const captureCardForValidation = { 
    value: card.value, 
    source: source || 'hand' 
  };
  const validation = validateOpponentCaptureCards(stack.cards, captureCardForValidation, playerIndex);
  
  console.log(`[captureTemp] Validating capture:`, {
    playerIndex,
    stackCardValues: stack.cards.map(c => c.value),
    stackCardSources: stack.cards.map(c => c.source),
    captureCardValue: card.value,
    captureCardSource: source || 'hand',
    validation
  });
  
  if (!validation.valid) {
    throw new Error(`captureTemp: ${validation.reason}`);
  }

  // Find and remove the card from the source
  const cardSource = source || 'hand';
  let capturedCard = null;
  
  if (cardSource === 'table') {
    const tableIdx = newState.tableCards.findIndex(
      tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
    );
    if (tableIdx !== -1) {
      [capturedCard] = newState.tableCards.splice(tableIdx, 1);
    }
  } else if (cardSource === 'hand') {
    const hand = newState.players[playerIndex].hand;
    const handIdx = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
    if (handIdx !== -1) {
      [capturedCard] = hand.splice(handIdx, 1);
    }
  } else if (cardSource.startsWith('captured_')) {
    const ownerIdx = parseInt(cardSource.split('_')[1], 10);
    if (!isNaN(ownerIdx) && ownerIdx >= 0 && ownerIdx < newState.players.length) {
      const captures = newState.players[ownerIdx].captures;
      const capIdx = captures.findIndex(c => c.rank === card.rank && c.suit === card.suit);
      if (capIdx !== -1) {
        [capturedCard] = captures.splice(capIdx, 1);
      }
    }
  }
  
  if (!capturedCard) {
    throw new Error(`captureTemp: card ${card.rank}${card.suit} not found at source ${cardSource}`);
  }
  
  // Add the captured stack cards to player's captures
  const capturedStackCards = [...stack.cards];
  newState.players[playerIndex].captures.push(...capturedStackCards);
  
  // Also capture the dropped card
  newState.players[playerIndex].captures.push(capturedCard);
  
  // Calculate and add score for captured cards
  let capturedScore = 0;
  for (const c of capturedStackCards) {
    capturedScore += c.value;
  }
  capturedScore += capturedCard.value;
  newState.players[playerIndex].score += capturedScore;
  
  // Remove the temp stack from table
  newState.tableCards.splice(stackIdx, 1);
  
  // --- Recall: Create recall entries for capturer's teammates ---
  // NEW BEHAVIOR: Always create recall entries for teammates of the capturer
  // No Shiya activation required. The recall stores the exact captured item.
  // Create a combined item representing what was captured (stack cards + capture card)
  const capturedItem = {
    stackId: stack.stackId,
    type: 'temp_stack',
    value: stack.value,
    owner: stack.owner,
    cards: [
      ...stack.cards.map(c => ({ ...c })),
      { ...capturedCard }
    ],
};
   
  console.log(`[captureTemp] 🎯 Player ${playerIndex} captured temp stack! Value: ${stack.value}, Cards: ${stack.cards.map(c => c.rank+c.suit).join(', ')} + ${capturedCard.rank}${capturedCard.suit}`);
  newState = createRecallEntries(newState, playerIndex, capturedItem);
  
  console.log(`[captureTemp] Player ${playerIndex} captured temp stack with ${capturedStackCards.length + 1} cards, score: ${capturedScore}`);
  
  // Mark turn as started and ended
  startPlayerTurn(newState, playerIndex);
  triggerAction(newState, playerIndex);
  if (newState.roundPlayers && newState.roundPlayers[playerIndex]) {
    newState.roundPlayers[playerIndex].turnEnded = true;
  }
  
  return nextTurn(newState);
}

module.exports = captureTemp;

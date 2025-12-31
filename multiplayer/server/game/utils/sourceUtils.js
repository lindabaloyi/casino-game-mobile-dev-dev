
/**
 * Finds and removes a specific card from a player's hand.
 * @param {Array<Object>} hand - The player's hand array.
 * @param {Object} card - The card to remove.
 * @returns {boolean} - True if the card was found and removed, false otherwise.
 */
function removeCardFromHand(hand, card) {
  const cardIndex = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
  if (cardIndex > -1) {
    hand.splice(cardIndex, 1);
    return true;
  }
  return false;
}

/**
 * Finds and removes a specific loose card from the table.
 * @param {Array<Object>} tableCards - The array of cards on the table.
 * @param {Object} card - The card to remove.
 * @returns {boolean} - True if the card was found and removed, false otherwise.
 */
function removeCardFromTable(tableCards, card) {
  const cardIndex = tableCards.findIndex(item => 
    item.type !== 'build' && 
    item.type !== 'temporary_stack' &&
    item.rank === card.rank && 
    item.suit === card.suit
  );
  if (cardIndex > -1) {
    tableCards.splice(cardIndex, 1);
    return true;
  }
  return false;
}

/**
 * Removes a card from its specified source (player's hand or table).
 * @param {Object} gameState - The entire game state.
 * @param {Object} card - The card to be removed.
 * @param {string} source - The source of the card ('hand', 'table', 'loose').
 * @param {number} playerIndex - The index of the player performing the action.
 * @returns {{success: boolean, error?: string}}
 */
function removeCardFromSource(gameState, card, source, playerIndex) {
  if (source === 'hand') {
    const hand = gameState.playerHands[playerIndex];
    if (removeCardFromHand(hand, card)) {
      return { success: true };
    }
    return { success: false, error: `Card ${card.rank}${card.suit} not found in player ${playerIndex}'s hand.` };
  } 
  
  if (source === 'table' || source === 'loose') {
    if (removeCardFromTable(gameState.tableCards, card)) {
      return { success: true };
    }
    return { success: false, error: `Loose card ${card.rank}${card.suit} not found on the table.` };
  }

  return { success: false, error: `Invalid card source: ${source}.` };
}

module.exports = { removeCardFromSource };

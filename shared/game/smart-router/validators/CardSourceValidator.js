/**
 * CardSourceValidator
 * Validates that a card actually exists at the claimed source (hand, table, captures).
 * Centralizes source validation across all handlers.
 */

class CardSourceValidator {
  /**
   * Validate that a card exists at the claimed source.
   * @param {object} card - Card with rank and suit
   * @param {string} source - Claimed source ('hand', 'table', 'captured')
   * @param {number} playerIndex - Player index
   * @param {object} state - Game state
   * @returns {string} Validated source
   * @throws if card not found at claimed source
   */
  validate(card, source, playerIndex, state) {
    if (!card || !card.rank || !card.suit) {
      throw new Error('Invalid card');
    }

    switch (source) {
      case 'hand':
        return this.validateHand(card, playerIndex, state);
      
      case 'table':
        return this.validateTable(card, state);
      
      case 'captured':
      case 'captured_self':
        return this.validateCaptured(card, playerIndex, state);
      
      default:
        // For unknown sources, try to detect
        return this.detectAndValidate(card, playerIndex, state);
    }
  }

  /**
   * Validate card is in player's hand.
   */
  validateHand(card, playerIndex, state) {
    const hand = state.players?.[playerIndex]?.hand || [];
    const found = hand.some(c => c.rank === card.rank && c.suit === card.suit);
    
    if (!found) {
      throw new Error(`Card ${card.rank}${card.suit} not in player ${playerIndex}'s hand`);
    }
    
    return 'hand';
  }

  /**
   * Validate card is on table as loose card.
   */
  validateTable(card, state) {
    const onTable = state.tableCards?.some(
      tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit
    );
    
    if (!onTable) {
      throw new Error(`Card ${card.rank}${card.suit} not on table`);
    }
    
    return 'table';
  }

  /**
   * Validate card is in player's captures.
   */
  validateCaptured(card, playerIndex, state) {
    const captures = state.players?.[playerIndex]?.captures || [];
    const found = captures.some(c => c.rank === card.rank && c.suit === card.suit);
    
    if (!found) {
      throw new Error(`Card ${card.rank}${card.suit} not in player ${playerIndex}'s captures`);
    }
    
    return 'captured';
  }

  /**
   * Detect where the card actually is if source is unknown.
   */
  detectAndValidate(card, playerIndex, state) {
    // Check hand first
    const hand = state.players?.[playerIndex]?.hand || [];
    if (hand.some(c => c.rank === card.rank && c.suit === card.suit)) {
      return 'hand';
    }

    // Check table
    const onTable = state.tableCards?.some(
      tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit
    );
    if (onTable) {
      return 'table';
    }

    // Check captures
    const captures = state.players?.[playerIndex]?.captures || [];
    if (captures.some(c => c.rank === card.rank && c.suit === card.suit)) {
      return 'captured';
    }

    throw new Error(`Card ${card.rank}${card.suit} not found anywhere`);
  }

  /**
   * Get the source of a card without throwing.
   * Returns the detected source or null.
   */
  getSource(card, playerIndex, state) {
    try {
      return this.detectAndValidate(card, playerIndex, state);
    } catch {
      return null;
    }
  }
}

module.exports = CardSourceValidator;

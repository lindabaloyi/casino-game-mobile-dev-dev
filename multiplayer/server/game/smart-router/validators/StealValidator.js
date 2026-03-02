/**
 * StealValidator
 * Pure validation logic for stealing opponent builds.
 */

class StealValidator {
  /**
   * Check if a steal would be valid
   */
  static isValid(stack, card) {
    // Check 1: Cannot steal base builds
    if (stack.hasBase === true) {
      return false;
    }
    
    // Check 2: Cannot steal build value 10
    if (stack.value === 10) {
      return false;
    }
    
    // Check 3: Must create valid build (need >= 0)
    const newNeed = this.calculateNewNeed(stack, card);
    return newNeed >= 0;
  }

  /**
   * Calculate what the new need would be if card is added
   */
  static calculateNewNeed(stack, card) {
    const cards = [...(stack.cards || []), card];
    const totalSum = cards.reduce((sum, c) => sum + c.value, 0);
    
    // Sum builds are always valid
    if (totalSum <= 10) {
      return 0;
    }
    
    // Diff build: need = base - otherSum
    const sorted = [...cards].sort((a, b) => b.value - a.value);
    const base = sorted[0].value;
    const otherSum = sorted.slice(1).reduce((sum, c) => sum + c.value, 0);
    return base - otherSum;
  }

  /**
   * Get error message for invalid steal attempt
   */
  static getErrorMessage(stack, card) {
    if (stack.hasBase === true) {
      return 'Cannot steal: base builds cannot be stolen';
    }
    if (stack.value === 10) {
      return 'Cannot steal: builds with value 10 cannot be stolen';
    }
    const newNeed = this.calculateNewNeed(stack, card);
    if (newNeed < 0) {
      return `Cannot steal: adding ${card.rank} would make the build invalid (cards exceed base)`;
    }
    return 'Cannot steal this build';
  }
}

module.exports = StealValidator;

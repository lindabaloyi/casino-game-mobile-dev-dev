/**
 * advanceFromQualificationReview
 * Advances from qualification review to the next tournament phase.
 * Called when the qualification review countdown reaches zero.
 */

const { cloneState } = require('../');
const { startSemifinal, startFinalShowdown } = require('./startQualificationReview');

/**
 * Advance from qualification review to next phase
 * @param {Object} state - Current game state (should be in QUALIFICATION_REVIEW phase)
 * @returns {Object} Updated state for next phase
 */
function advanceFromQualificationReview(state) {
  const newState = cloneState(state);
  
  console.log('[advanceFromQualificationReview] Advancing from qualification review');
  
  // Verify we're in qualification review phase
  if (newState.tournamentPhase !== 'QUALIFICATION_REVIEW') {
    console.warn('[advanceFromQualificationReview] Not in qualification review phase, ignoring');
    return newState;
  }
  
  // Get the number of qualified players
  const qualifiedCount = newState.qualifiedPlayers?.length || 0;
  
  console.log(`[advanceFromQualificationReview] Qualified count: ${qualifiedCount}`);
  
  // Determine next phase based on qualified count
  if (qualifiedCount <= 2) {
    // 2 players qualified - go to final showdown
    console.log('[advanceFromQualificationReview] Advancing to FINAL_SHOWDOWN');
    return startFinalShowdown(newState);
  } else {
    // 3+ players qualified - go to semifinal
    console.log('[advanceFromQualificationReview] Advancing to SEMI_FINAL');
    return startSemifinal(newState);
  }
}

module.exports = advanceFromQualificationReview;

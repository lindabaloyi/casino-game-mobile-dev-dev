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
 * @param {number} gameId - Game ID (optional, for socket remapping)
 * @param {Object} gameManager - GameManager instance (optional, for socket remapping)
 * @returns {Object} Updated state for next phase
 */
function advanceFromQualificationReview(state, gameId = null, gameManager = null) {
  const newState = cloneState(state);
  
  console.log('[advanceFromQualificationReview] Advancing from qualification review');
  
  // Verify we're in qualification review phase
  if (newState.tournamentPhase !== 'QUALIFICATION_REVIEW') {
    console.warn('[advanceFromQualificationReview] Not in qualification review phase, ignoring');
    return newState;
  }
  
  // Get the number of qualified players
  const qualifiedCount = newState.qualifiedPlayers?.length || 0;
  
  console.log(`[advanceFromQualificationReview] Qualified count: ${qualifiedCount}, qualifiedPlayers: ${JSON.stringify(newState.qualifiedPlayers)}`);
  console.log(`[advanceFromQualificationReview] Players array BEFORE transition:`, newState.players?.map(p => p.id), ', length:', newState.players?.length);
  
  // Determine next phase based on qualified count
  let resultState;
  if (qualifiedCount <= 2) {
    // 2 players qualified - go to final showdown
    console.log('[advanceFromQualificationReview] Advancing to FINAL_SHOWDOWN');
    resultState = startFinalShowdown(newState);
    console.log(`[advanceFromQualificationReview] AFTER transition - players.length: ${resultState.players?.length}, playerCount: ${resultState.playerCount}`);
    console.log(`[advanceFromQualificationReview] Players array AFTER transition:`, resultState.players?.map(p => p.id));
  } else {
    // 3+ players qualified - go to semifinal
    console.log('[advanceFromQualificationReview] Advancing to SEMI_FINAL');
    resultState = startSemifinal(newState);
    console.log(`[advanceFromQualificationReview] AFTER transition - players.length: ${resultState.players?.length}, playerCount: ${resultState.playerCount}`);
    console.log(`[advanceFromQualificationReview] Players array AFTER transition:`, resultState.players?.map(p => p.id));
  }

  return resultState;
}

module.exports = advanceFromQualificationReview;

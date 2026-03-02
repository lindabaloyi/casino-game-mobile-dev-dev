/**
 * stackDrop handler
 * 
 * This is a placeholder handler - SmartRouter already routes this to
 * either addToTemp or extendBuild. This handler exists only because
 * ActionRouter requires all actions to have a registered handler.
 * 
 * @param {object} state - Current game state
 * @param {object} payload - Action payload (not used, SmartRouter handled routing)
 * @param {number} playerIndex - Player making the action
 * @returns {object} - Unchanged state (SmartRouter already routed to real handler)
 */
function stackDrop(state, payload, playerIndex) {
  // SmartRouter already routed this to addToTemp or extendBuild
  // This handler should never be called directly
  console.log('[stackDrop handler] This should not be called - SmartRouter should have already routed');
  return state;
}

module.exports = stackDrop;

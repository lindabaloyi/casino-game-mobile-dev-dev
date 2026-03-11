/**
 * noop (No Operation)
 * Returns the state unchanged.
 * Used by SmartRouter when an action should be silently ignored
 * (e.g., trying to create a temp stack when one already exists).
 */

function noop(state, payload, playerIndex) {
  return state;
}

module.exports = noop;

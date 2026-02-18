/**
 * actions/index.js
 * Maps action-type strings → handler functions.
 *
 * Each handler has the signature:
 *   (gameState, payload, playerIndex) => newGameState
 *
 * Handlers are added here as each milestone is implemented.
 * ActionRouter reads this map and routes incoming socket events.
 */

// ── Registered actions ────────────────────────────────────────────────────────
// (populated milestone by milestone)

const actionHandlers = {
  // ── Milestone 2 ──────────────────────────────────────────────────────────
  trail: require('./trail'),

  // ── Milestone 3 → capture:    require('./capture')
  // ── Milestone 4 → temp stack: require('./tempStack')
  // ── Milestone 5 → build:      require('./build')
  // ── Milestone 6 → extendBuild: require('./extendBuild')
};

module.exports = actionHandlers;

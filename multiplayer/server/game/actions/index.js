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

  // ── Milestone 4 ──────────────────────────────────────────────────────────
  createTemp:          require('./createTemp'),
  addToTemp:           require('./addToTemp'),
  acceptTemp:          require('./acceptTemp'),
  cancelTemp:          require('./cancelTemp'),

  // ── Build actions ─────────────────────────────────────────────────────────
  addToBuild:          require('./addToBuild'),
  stealBuild:          require('./stealBuild'),

  // ── Build Extension actions ──────────────────────────────────────────────
  startBuildExtension: require('./startBuildExtension'),
  acceptBuildExtension: require('./acceptBuildExtension'),
  declineBuildExtension: require('./declineBuildExtension'),

  // ── Capture ────────────────────────────────────────────────────────────────
  capture:             require('./capture'),
  playFromCaptures:    require('./playFromCaptures'),
  dropToCapture:       require('./dropToCapture'),
};

module.exports = actionHandlers;

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

  // ── Stack drop (SmartRouter routes to addToTemp or extendBuild) ───────────
  stackDrop:           require('./stackDrop'),
  // extendBuild is handled by SmartRouter (routes to startBuildExtension or acceptBuildExtension)
  extendBuild:         require('./extendBuild'),

  // ── Build actions ─────────────────────────────────────────────────────────
  addToBuild:          require('./addToBuild'),
  stealBuild:          require('./stealBuild'),

  // ── Build Extension actions ──────────────────────────────────────────────
  startBuildExtension: require('./startBuildExtension'),
  acceptBuildExtension: require('./acceptBuildExtension'),
  declineBuildExtension: require('./declineBuildExtension'),

  // ── Manual Turn Control ──────────────────────────────────────────────────────
  endTurn: require('./endTurn'),

  // ── Capture ───────────────────────────────────────────────────────────────
  capture:              require('./capture'),
  captureOwn:          require('./captureOwn'),
  captureOpponent:     require('./captureOpponent'),
  playFromCaptures:    require('./playFromCaptures'),
  dropToCapture:       require('./dropToCapture'),
};

module.exports = actionHandlers;

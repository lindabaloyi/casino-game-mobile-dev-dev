/**
 * actions/index.js (Shared)
 * Maps action-type strings → handler functions.
 *
 * Each handler has the signature:
 *   (gameState, payload, playerIndex) => newGameState
 *
 * This is shared between server and client (CPU mode).
 */

const actionHandlers = {
  // ── Trail ───────────────────────────────────────────────────────────────────
  trail: require('./trail'),

  // ── Temp Stack actions ─────────────────────────────────────────────────────
  createTemp:          require('./createTemp'),
  addToTemp:           require('./addToTemp'),
  acceptTemp:          require('./acceptTemp'),
  cancelTemp:          require('./cancelTemp'),

  // ── Stack drop (SmartRouter routes to addToTemp or extendBuild) ───────────
  stackDrop:           require('./stackDrop'),
  extendBuild:         require('./extendBuild'),

  // ── Build actions ───────────────────────────────────────────────────────────
  addToBuild:          require('./addToBuild'),
  stealBuild:          require('./stealBuild'),

  // ── Build Extension actions ────────────────────────────────────────────────
  startBuildExtension: require('./startBuildExtension'),
  addToPendingExtension: require('./addToPendingExtension'),
  acceptBuildExtension: require('./acceptBuildExtension'),
  declineBuildExtension: require('./declineBuildExtension'),

  // ── Manual Turn Control ─────────────────────────────────────────────────────
  endTurn: require('./endTurn'),

  // ── Capture ────────────────────────────────────────────────────────────────
  capture:              require('./capture'),
  captureOwn:          require('./captureOwn'),
  captureOpponent:     require('./captureOpponent'),
  playFromCaptures:    require('./playFromCaptures'),
  dropToCapture:       require('./dropToCapture'),
};

module.exports = actionHandlers;

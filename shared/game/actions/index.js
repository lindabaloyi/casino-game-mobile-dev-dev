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
  setTempBuildValue:   require('./setTempBuildValue'),
  captureTemp:         require('./captureTemp'),

  // ── Stack drop (SmartRouter routes to addToTemp or extendBuild) ───────────
  stackDrop:           require('./stackDrop'),
  extendBuild:         require('./extendBuild'),

  // ── Build actions ───────────────────────────────────────────────────────────
  addToBuild:          require('./addToBuild'),
  stealBuild:          require('./stealBuild'),

  // ── Build Extension actions ────────────────────────────────────────────────
  // Unified action (already defined above at line 25)
  // Backward compatibility aliases
  startBuildExtension: require('./extendBuild'),
  addToPendingExtension: require('./extendBuild'),
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

  // ── Recall (Party Mode) ───────────────────────────────────────────────────────
  recall:              require('./recall'),

  // ── Tournament (Knockout Mode) ─────────────────────────────────────────────────
  startTournament:         require('./startTournament'),
  endTournamentRound:     require('./endTournamentRound'),
  endFinalShowdown:        require('./endFinalShowdown'),
  startQualificationReview: require('./startQualificationReview'),
  startSemifinal:          require('./startQualificationReview'),
  advanceFromQualificationReview: require('./advanceFromQualificationReview'),

  // ── Multi-Card Capture (Opponent) ───────────────────────────────────────────
  startBuildCapture:  require('./startBuildCapture'),
  addToCapture:        require('./addToCapture'),
  completeCapture:    require('./completeCapture'),
  cancelCapture:       require('./cancelCapture'),

  // ── Utility ───────────────────────────────────────────────────────────────────
  noop:                require('./noop'),

  // ── Choice (Modal) ───────────────────────────────────────────────────────────
  choice:              require('./choice'),
};

module.exports = actionHandlers;

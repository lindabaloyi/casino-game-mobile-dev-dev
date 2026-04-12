/**
 * TournamentQualification.js
 * Handles qualification logic, tie-breaking, and logging for tournament phases.
 */

const { rankPlayers } = require('../../../shared/game/scoring.js');

const DEBUG = process.env.DEBUG_QUALIFICATION === 'true';
const LOG_QUALIFICATION = process.env.LOG_QUALIFICATION !== 'false'; // default true

/**
 * Qualification result object
 * @typedef {Object} QualificationResult
 * @property {Array} qualified - Players moving to next phase
 * @property {Array} eliminated - Players knocked out
 * @property {string|null} nextPhase - Next phase name (SEMI_FINAL, FINAL, or null)
 * @property {Array} sortedPlayers - All players sorted by rank
 */

/**
 * Log the qualification determination process (always on)
 */
function logQualificationProcess(players, phase, config, result) {
  if (!LOG_QUALIFICATION) return;
  
  const qualifiedCount = phase === 'QUALIFYING' ? (config.qualifyingPlayers || 3) : 
                         phase === 'SEMI_FINAL' ? 2 : 1;
  
  console.log(`\n🏆 [QUALIFICATION] Phase: ${phase} | Qualifying: ${qualifiedCount}`);
  console.log('─'.repeat(50));
  
  // Log sorted players with rankings
  result.sortedPlayers.forEach((p, idx) => {
    const isQualified = idx < qualifiedCount;
    const marker = isQualified ? '✅' : '❌';
    console.log(`  ${idx + 1}. ${p.id.substring(0, 8)}... | score: ${String(p.cumulativeScore).padStart(3)} | spades: ${String(p.cumulativeSpades || 0).padStart(2)} | cards: ${String(p.cumulativeCards || 0).padStart(2)} | ${marker}`);
  });
  
  console.log('─'.repeat(50));
  console.log(`  Qualified: ${result.qualified.map(p => p.id.substring(0, 8) + '...').join(', ')}`);
  if (result.eliminated.length > 0) {
    console.log(`  Eliminated: ${result.eliminated.map(p => p.id.substring(0, 8) + '...').join(', ')}`);
  }
  console.log('');
}

/**
 * Determine which players qualify, which are eliminated, and the next phase.
 * @param {Array} players - Array of player objects (must have id, cumulativeScore, cumulativeSpades, cumulativeCards)
 * @param {string} phase - Current phase ('QUALIFYING', 'SEMI_FINAL', 'FINAL')
 * @param {Object} config - Tournament config (qualifyingPlayers, etc.)
 * @returns {QualificationResult}
 */
function determineQualification(players, phase, config) {
  const activePlayers = players.filter(p => !p.eliminated);
  
  const playerIds = activePlayers.map(p => p.id);
  const scores = activePlayers.map(p => p.cumulativeScore);
  const breakdowns = activePlayers.map(p => ({
    spadeCount: p.cumulativeSpades || 0,
    totalCards: p.cumulativeCards || 0,
    cards: []
  }));
  
  const rankedIndices = rankPlayers(playerIds, scores, breakdowns);
  const sortedPlayers = rankedIndices.map(idx => activePlayers[idx]);
  
  let qualifiedCount, nextPhase;
  
  if (phase === 'QUALIFYING') {
    qualifiedCount = config.qualifyingPlayers || 3;
    nextPhase = 'SEMI_FINAL';
  } else if (phase === 'SEMI_FINAL') {
    qualifiedCount = 2;
    nextPhase = 'FINAL';
  } else {
    return {
      qualified: [],
      eliminated: [],
      nextPhase: null,
      sortedPlayers
    };
  }
  
  const qualified = sortedPlayers.slice(0, qualifiedCount);
  const eliminated = sortedPlayers.slice(qualifiedCount);
  
  const result = {
    qualified,
    eliminated,
    nextPhase,
    sortedPlayers
  };
  
  return result;
}

/**
 * Log a detailed breakdown of the qualification process.
 * @param {string} phase - Current phase
 * @param {number} currentHand - Current hand number (for logging)
 * @param {number} totalHands - Total hands in this phase
 * @param {Array} sortedPlayers - Players sorted by rank
 * @param {Array} qualified - Qualified players
 * @param {Array} eliminated - Eliminated players
 */
function logQualificationBreakdown(phase, currentHand, totalHands, sortedPlayers, qualified, eliminated) {
  console.log(`\n📊 [QUALIFICATION] Phase: ${phase} — Hand ${currentHand}/${totalHands}`);
  console.log(`   Sorted by (score → spades → cards → hash):`);
  
  sortedPlayers.forEach((p, idx) => {
    console.log(`   ${idx+1}. ${p.name} — score=${p.cumulativeScore}, spades=${p.cumulativeSpades}, cards=${p.cumulativeCards}`);
  });
  
  console.log(`✅ QUALIFIED (top ${qualified.length}):`);
  qualified.forEach(p => console.log(`   - ${p.name} (score=${p.cumulativeScore})`));
  
  if (eliminated.length) {
    console.log(`❌ ELIMINATED:`);
    eliminated.forEach(p => console.log(`   - ${p.name} (score=${p.cumulativeScore})`));
  } else {
    console.log(`ℹ️ No elimination this phase (final phase?)`);
  }
  
  console.log(`🔄 Resetting cumulative scores for qualified players to 0\n`);
}

/**
 * Reset scores, spades, and cards for qualified players.
 * @param {Array} players - All players (mutated)
 * @param {Array} qualified - Qualified player objects
 */
function resetQualifiedPlayers(players, qualified) {
  const qualifiedIds = new Set(qualified.map(p => p.id));
  for (const player of players) {
    if (qualifiedIds.has(player.id)) {
      player.cumulativeScore = 0;
      player.cumulativeSpades = 0;
      player.cumulativeCards = 0;
      player.handsPlayed = 0;
    }
  }
}

/**
 * Mark eliminated players as eliminated.
 * @param {Array} eliminated - Eliminated player objects
 */
function markEliminated(eliminated) {
  for (const player of eliminated) {
    player.eliminated = true;
  }
}

module.exports = {
  determineQualification,
  logQualificationBreakdown,
  resetQualifiedPlayers,
  markEliminated
};

/**
 * RoundTransitionService
 * Handles round transitions, game over logic, and tournament phase changes.
 * Extracted from GameCoordinatorService to separate concerns.
 */

const RoundValidator = require('../game/utils/RoundValidator');
const { allPlayersTurnEnded, resetTurnFlags, startPlayerTurn, forceEndTurn, finalizeGame } = require('../../../shared/game');
const scoring = require('../game/scoring');
const TournamentManager = require('./TournamentManager');

class RoundTransitionService {
  constructor(gameManager, tournamentManager, roundValidator) {
    this.gameManager = gameManager;
    this.tournamentManager = tournamentManager;
    this.roundValidator = roundValidator;
  }

  /**
   * Process the result of a game action and determine next steps
   * @param {number} gameId - Game ID
   * @param {Object} newState - New game state after action
   * @param {Object} lastAction - The action that was performed
   * @param {Object} ctx - Player context { gameId, playerIndex, isPartyGame }
   * @returns {Object} Transition result
   */
  processActionResult(gameId, newState, lastAction, ctx) {
    const { isPartyGame } = ctx;

    // Check for round end conditions
    if (allPlayersTurnEnded(newState)) {
      return this._handleRoundEnd(gameId, newState, lastAction, isPartyGame);
    }

    // Check for tournament phase changes
    const oldTournamentPhase = this.gameManager.getGameState(gameId)?.tournamentPhase;
    const newPhase = newState.tournamentPhase;

    if (this._tournamentPhaseChanged(newState, oldTournamentPhase)) {
      return {
        type: 'tournament_phase_change',
        oldPhase: oldTournamentPhase,
        newPhase: newPhase,
        qualifiedPlayers: TournamentManager.getQualifiedPlayers(newState),
        state: newState
      };
    }

    return { type: 'continue', state: newState };
  }

  /**
   * Handle round end logic
   * @private
   */
  _handleRoundEnd(gameId, newState, lastAction, isPartyGame) {
    console.log(`[RoundTransition] Handling round end for game ${gameId}`);

    // Check if round should end (all hands empty)
    const playerCount = newState.playerCount || 2;
    let allHandsEmpty = true;
    for (let i = 0; i < playerCount; i++) {
      if (newState.players[i]?.hand?.length > 0) {
        allHandsEmpty = false;
        break;
      }
    }

    if (!allHandsEmpty) {
      // Not all hands empty, but all turns ended - force end turns for players with empty hands
      let autoEndedAny = false;
      for (let i = 0; i < playerCount; i++) {
        if (newState.players[i]?.hand?.length === 0 && !newState.players[i]?.turnEnded) {
          forceEndTurn(newState, i);
          autoEndedAny = true;
        }
      }

      if (autoEndedAny) {
        resetTurnFlags(newState);
        const nextPlayer = (newState.currentPlayer + 1) % playerCount;
        startPlayerTurn(newState, nextPlayer);
        console.log(`[RoundTransition] Auto-ended turns, continuing to player ${nextPlayer}`);
      }

      return { type: 'continue', state: newState };
    }

    // All hands empty - round actually ended
    const roundCheck = RoundValidator.checkRoundEnd(newState);

    if (roundCheck.ended) {
      console.log(`[RoundTransition] Round ${newState.round} ended: ${roundCheck.reason}`);

      // Calculate scores for the round
      scoring.updateScores(newState);

      // Check for game over
      const gameOverCheck = RoundValidator.checkGameOver(newState);

      if (gameOverCheck.gameOver) {
        console.log(`[RoundTransition] Game ${gameId} ended: ${gameOverCheck.reason}`);
        const finalState = finalizeGame(newState);
        return {
          type: 'game_over',
          reason: gameOverCheck.reason,
          finalState: finalState,
          isPartyGame: isPartyGame
        };
      } else {
        // Start next round
        newState.round += 1;
        resetTurnFlags(newState);
        startPlayerTurn(newState, 0); // First player starts new round
        console.log(`[RoundTransition] Starting round ${newState.round}`);
      }
    }

    return { type: 'round_end', state: newState, summary: RoundValidator.getRoundSummary(newState) };
  }

  /**
   * Check if tournament phase changed
   * @private
   */
  _tournamentPhaseChanged(newState, oldPhase) {
    if (!TournamentManager.isTournamentActive(newState)) return false;

    const newPhase = newState.tournamentPhase;
    return newPhase !== oldPhase &&
           (newPhase === 'SEMI_FINAL' || newPhase === 'FINAL_SHOWDOWN' || newPhase === 'COMPLETED');
  }

  /**
   * Finalize a completed game
   */
  finalizeGame(gameId, finalState, isPartyGame, forceFinalize = false) {
    // Extract game over handling logic from GameCoordinatorService
    console.log(`[RoundTransition] Finalizing game ${gameId}, isPartyGame: ${isPartyGame}, forceFinalize: ${forceFinalize}`);

    const playerCount = finalState.playerCount || finalState.players?.length || 2;

    // Calculate final scores
    scoring.updateScores(finalState);

    // Determine winner(s)
    const scores = finalState.players.map((player, index) => ({
      index,
      score: player.score || 0,
      userId: player.userId
    })).sort((a, b) => b.score - a.score);

    const maxScore = scores[0].score;
    const winners = scores.filter(player => player.score === maxScore);

    console.log(`[RoundTransition] Game ${gameId} final scores:`, scores.map(s => `P${s.index}:${s.score}`).join(', '));
    console.log(`[RoundTransition] Winner(s):`, winners.map(w => `P${w.index}`).join(', '));

    // Mark game as completed
    finalState.completed = true;
    finalState.winners = winners;
    finalState.endTime = new Date().toISOString();

    return finalState;
  }
}

module.exports = RoundTransitionService;
/**
 * GameCoordinatorService
 * Receives socket events, validates them, delegates to ActionRouter,
 * then broadcasts the resulting state via BroadcasterService.
 * 
 * Core responsibilities:
 * - Action execution and validation
 * - Round transitions
 * - Broadcasting game updates
 * 
 * Secondary concerns are delegated to:
 * - TournamentManager: Tournament-specific logic
 * - GamePersistenceService: MongoDB and stats updates
 */

// Round transition logic moved to RoundTransitionService
const TournamentManager = require('./TournamentManager');
const GamePersistenceService = require('./GamePersistenceService');
const GameStats = require('../models/GameStats');
const PlayerContextService = require('./PlayerContextService');
const RoundTransitionService = require('./RoundTransitionService');
const RoundValidator = require('../game/utils/RoundValidator');
const scoring = require('../game/scoring');
const { finalizeGame } = require('../../../shared/game');

class GameCoordinatorService {
  constructor(gameManager, actionRouter, unifiedMatchmaking, broadcaster) {
    this.gameManager = gameManager;
    this.actionRouter = actionRouter;
    this.unifiedMatchmaking = unifiedMatchmaking;
    this.broadcaster = broadcaster;

    // Initialize specialized services
    this.persistence = new GamePersistenceService();
    this.playerContext = new PlayerContextService(unifiedMatchmaking, gameManager);
    this.roundTransition = new RoundTransitionService(gameManager, TournamentManager, RoundValidator);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Resolve which game + player this socket belongs to, or send error. */
  _resolvePlayer(socket) {
    const ctx = this.playerContext.resolvePlayer(socket.id);

    if (!ctx) {
      console.log(`[Coordinator] ❌ _resolvePlayer failed: no context for socket ${socket.id}`);
      this.broadcaster.sendError(socket, 'Not in an active game');
      return null;
    }

    console.log(`[Coordinator] _resolvePlayer: gameId=${ctx.gameId}, playerIndex=${ctx.playerIndex}, isPartyGame=${ctx.isPartyGame}`);
    return ctx;
  }

  // ── Event handlers ─────────────────────────────────────────────────────────────

  /**
   * Handle a game-action event from the client.
   * Expected payload: { type: string, payload: object }
   */
  handleGameAction(socket, data) {
    if (!data?.type) {
      this.broadcaster.sendError(socket, 'Invalid action: missing type');
      return;
    }

    const ctx = this._resolvePlayer(socket);
    if (!ctx) return;

    try {
      console.log(`[Coordinator] handleGameAction - action: ${data.type}, playerIndex: ${ctx.playerIndex}`);

      const newState = this.actionRouter.executeAction(ctx.gameId, ctx.playerIndex, data);

      // Validate new state
      if (!newState) {
        throw new Error('Action returned undefined state');
      }
      if (!newState.players) {
        throw new Error('Action returned state without players array');
      }

      console.log(`[Coordinator] After action ${data.type} - tableCards: ${newState.tableCards?.length}, playerCount: ${newState.playerCount}`);

      // Delegate all transition logic to RoundTransitionService
      const result = this.roundTransition.processActionResult(ctx.gameId, newState, data, ctx);

      this._handleTransitionResult(result, ctx);

    } catch (err) {
      console.error(`[Coordinator] game-action failed: ${err.message}`);
      this.broadcaster.sendError(socket, err.message);
    }
  }

  /**
   * Handle the result of a transition from RoundTransitionService
   * @private
   */
  _handleTransitionResult(result, ctx) {
    const { gameId } = ctx;

    switch (result.type) {
      case 'continue':
        this.broadcaster.broadcastGameUpdate(gameId, result.state, this.unifiedMatchmaking);
        break;

      case 'round_end':
        this.broadcaster.broadcastToGame(gameId, 'round-end', {
          round: result.state.round,
          reason: 'round_complete',
          summary: result.summary
        }, this.unifiedMatchmaking);
        this.broadcaster.broadcastGameUpdate(gameId, result.state, this.unifiedMatchmaking);
        break;

      case 'tournament_phase_change':
        // Handle tournament remapping
        const mapping = TournamentManager.computeIndexMapping(result.qualifiedPlayers);
        this.gameManager.remapPlayerIndices(gameId, mapping);
        this.broadcaster.broadcastGameUpdate(gameId, result.state, this.unifiedMatchmaking);
        break;

      case 'game_over':
        const finalState = this.roundTransition.finalizeGame(gameId, result.finalState, result.isPartyGame);
        this._handleGameOver(gameId, finalState, result.isPartyGame);
        break;
    }
  }

  /**
   * Handle client-ready event from the client.
   * Marks a client as ready and broadcasts when all clients are ready.
   */
  handleClientReady(socket, data) {
    const { gameId, playerIndex } = data;
    console.log(`[Coordinator] handleClientReady received: gameId=${gameId}, playerIndex=${playerIndex}, socket=${socket.id}`);

    if (!gameId || playerIndex === undefined) {
      this.broadcaster.sendError(socket, 'client-ready: gameId and playerIndex are required');
      return;
    }

    // Mark client as ready in GameManager
    this.gameManager.markClientReady(gameId, playerIndex);

    // Get game state to check player count
    const gameState = this.gameManager.getGameState(gameId);
    if (!gameState) {
      this.broadcaster.sendError(socket, 'client-ready: Game not found');
      return;
    }

    // Check if all clients are now ready
    const playerCount = gameState.playerCount || gameState.players?.length || 0;
    const allReady = this.gameManager.areAllClientsReady(gameId, playerCount);
    const readyCount = this.gameManager.getReadyClientCount(gameId);

    console.log(`[Coordinator] Game ${gameId}: ${readyCount}/${playerCount} clients ready`);

    if (allReady) {
      console.log(`[Coordinator] ✅ All clients ready for game ${gameId} - broadcasting all-clients-ready`);
      this.broadcaster.broadcastAllClientsReady(gameId);
    }
  }





  /**
   * Handle start-next-round action from client.
   */
  handleStartNextRound(socket) {
    const ctx = this._resolvePlayer(socket);
    if (!ctx) return;

    const { gameId, playerIndex, isPartyGame } = ctx;

    try {
      const state = this.gameManager.getGameState(gameId);
      if (!state) {
        this.broadcaster.sendError(socket, 'Game not found');
        return;
      }

      const newState = RoundValidator.prepareNextRound(state);
      
      if (newState === null) {
        this._handleGameOver(gameId, state, isPartyGame, true);
        return;
      }

      this.gameManager.saveGameState(gameId, newState);
      this.broadcaster.broadcastGameUpdate(gameId, newState, this.unifiedMatchmaking);
    } catch (err) {
      console.error(`[Coordinator] start-next-round failed: ${err.message}`);
      this.broadcaster.sendError(socket, err.message);
    }
  }

  /**
   * Handle get-player-stats action from client.
   * Returns player statistics and optionally leaderboard.
   */
  async handleGetPlayerStats(socket, data) {
    try {
      const playerId = data?.payload?.playerId || socket.userId;
      
      if (!playerId) {
        this.broadcaster.sendError(socket, 'Player ID required');
        return;
      }

      console.log(`[Coordinator] handleGetPlayerStats - playerId: ${playerId}`);

      // Get player stats from GameStats model
      let stats = await GameStats.findByUserId(playerId);
      if (!stats) {
        // Create new stats record if doesn't exist
        stats = GameStats.create(playerId);
      }
      
      // Get leaderboard (top players by point retention)
      const leaderboard = await GameStats.getTopPlayers('pointRetentionPerGame', 10);

      // Send stats to the requesting client
      socket.emit('player-stats-response', {
        success: true,
        stats,
        leaderboard,
      });

      console.log(`[Coordinator] Sent stats for player ${playerId}:`, {
        totalGames: stats.totalGames,
        pointRetentionPerGame: stats.pointRetentionPerGame,
        motoTrophyCount: stats.motoTrophyCount,
      });
    } catch (err) {
      console.error(`[Coordinator] handleGetPlayerStats failed: ${err.message}`);
      this.broadcaster.sendError(socket, err.message);
    }
  }

  // ── Game Over Handling ─────────────────────────────────────────────────────────────

  /**
   * Handle game over - centralized to avoid duplication
   */
  _handleGameOver(gameId, finalState, isPartyGame, forceFinalize) {
    const finalizedState = forceFinalize ? finalizeGame(finalState) : finalState;
    
    // CRITICAL: Ensure scores are calculated before broadcasting game-over
    // This handles edge cases where scores might not have been calculated yet
    scoring.updateScores(finalizedState);
    
    const finalScores = finalizedState.scores || [0, 0];
    const playerCount = finalizedState.playerCount || 2;
    
    // Calculate detailed stats
    const capturedCards = [];
    const scoreBreakdowns = [];
    const tableCardsRemaining = finalizedState.tableCards?.length || 0;
    const deckRemaining = finalizedState.deck?.length || 0;
    
    // Get team score breakdowns for 4-player party mode
    const isPartyMode = playerCount === 4 && finalizedState.players.some(p => p.team);
    const teamScoreBreakdowns = isPartyMode && playerCount === 4 
      ? scoring.getTeamScoreBreakdown(finalizedState.players)
      : null;
    
    // Get tournament-specific data
    const isTournamentMode = finalizedState.tournamentMode === 'knockout';
    const playerStatuses = finalizedState.playerStatuses || null;
    const qualifiedPlayers = finalizedState.qualifiedPlayers || null;
    
    for (let i = 0; i < playerCount; i++) {
      capturedCards.push(finalizedState.players[i]?.captures?.length || 0);
      const captures = finalizedState.players[i]?.captures || [];
      scoreBreakdowns.push(scoring.getScoreBreakdown(captures));
    }
    
    finalizedState.gameOver = true;
    this.gameManager.saveGameState(gameId, finalizedState);
    
    console.log(`[Coordinator] 🎮 Game over detected for game ${gameId}! Calling persistence service...`);
    
    // Save to MongoDB using persistence service (includes player stats update)
    this.persistence.saveGame(gameId, finalizedState, isPartyGame);
    
    console.log(`[Coordinator] Broadcasting game-over for ${playerCount}-player mode, winner: ${RoundValidator.determineRoundWinner(finalizedState)}`);
    console.log(`[Coordinator] Final scores being sent:`, finalScores);
    console.log(`[Coordinator] Score breakdowns being sent:`, JSON.stringify(scoreBreakdowns, null, 2));
    
    this.broadcaster.broadcastToGame(gameId, 'game-over', {
      winner: RoundValidator.determineRoundWinner(finalizedState),
      finalScores,
      capturedCards,
      tableCardsRemaining,
      deckRemaining,
      scoreBreakdowns,
      teamScoreBreakdowns,
      isPartyMode,
      isTournamentMode,
      playerStatuses,
      qualifiedPlayers,
    }, this.unifiedMatchmaking);
  }
}

module.exports = GameCoordinatorService;

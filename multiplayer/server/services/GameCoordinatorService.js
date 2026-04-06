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
 * Tournament logic: TournamentMaster (centralized)
 */

const RoundValidator = require('../game/utils/RoundValidator');
const { allPlayersTurnEnded, resetTurnFlags, startPlayerTurn, forceEndTurn, finalizeGame } = require('../../../shared/game');
const scoring = require('../game/scoring');
const TournamentMaster = require('./TournamentMaster');
const TournamentBroadcaster = require('./TournamentBroadcaster');
const GamePersistenceService = require('./GamePersistenceService');
const GameStats = require('../models/GameStats');

class GameCoordinatorService {
  constructor(gameManager, actionRouter, unifiedMatchmaking, broadcaster) {
    this.gameManager = gameManager;
    this.actionRouter = actionRouter;
    this.unifiedMatchmaking = unifiedMatchmaking;
    this.broadcaster = broadcaster;
    
    // Initialize secondary services
    this.persistence = new GamePersistenceService();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Resolve which game + player this socket belongs to, or send error. */
  _resolvePlayer(socket) {
    let socketInfo = this.unifiedMatchmaking.socketRegistry.get(socket.id);
    let gameId = socketInfo?.gameId || null;
    let isPartyGame = socketInfo?.gameType === 'party';
    let gameType = socketInfo?.gameType || null;
    
    if (!gameId) {
      for (const [gid, sockets] of this.unifiedMatchmaking.socketRegistry.gameSocketsMap.entries()) {
        if (sockets.includes(socket.id)) {
          gameId = gid;
          const game = this.gameManager.getGameState(gid);
          if (game) {
            isPartyGame = game.players.some(p => p.team);
            gameType = game.playerCount === 2 ? 'two-hands' : game.playerCount === 3 ? 'three-hands' : game.playerCount === 4 && isPartyGame ? 'party' : 'four-hands';
            this.unifiedMatchmaking.socketRegistry.set(socket.id, gameId, gameType, socket.userId || null);
            console.log(`[Coordinator] _resolvePlayer: Fallback lookup - socket ${socket.id} found in game ${gameId}, updated socketRegistry`);
            socketInfo = { gameId, gameType, userId: socket.userId || null };
          }
          break;
        }
      }
    }
    
    console.log(`[Coordinator] _resolvePlayer for socket ${socket.id}: socketInfo =`, socketInfo ? JSON.stringify(socketInfo) : 'NOT FOUND');
    
    if (!gameId) {
      console.log(`[Coordinator] ❌ _resolvePlayer failed: no gameId for socket ${socket.id}`);
      this.broadcaster.sendError(socket, 'Not in an active game');
      return null;
    }
    
    // Get player's original index from socket map
    let playerIndex = this.gameManager.getPlayerIndex(gameId, socket.id);
    
    // Delegate tournament-specific index correction to TournamentMaster (centralized)
    const gameState = this.gameManager.getGameState(gameId);
    if (gameState?.tournamentMode && playerIndex !== null) {
      playerIndex = TournamentMaster.ensureCorrectPlayerIndex(
        gameState, socket.id, playerIndex, this.gameManager
      );
      if (playerIndex === null) {
        this.broadcaster.sendError(socket, 'You have been eliminated from the tournament');
        return null;
      }
    }
    
    console.log(`[Coordinator] _resolvePlayer: gameId=${gameId}, playerIndex=${playerIndex}, isPartyGame=${isPartyGame}`);
    if (playerIndex === null) {
      this.broadcaster.sendError(socket, 'Player not found in game');
      return null;
    }
    return { gameId, playerIndex, isPartyGame };
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

    const { gameId, playerIndex, isPartyGame } = ctx;

    try {
      console.log(`[Coordinator] handleGameAction - action: ${data.type}, playerIndex: ${playerIndex}`);
      
      // Debug: check state before action
      const preState = this.gameManager.getGameState(gameId);
      console.log(`[Coordinator] DEBUG Pre-action: playerCount=${preState?.playerCount}, players.length=${preState?.players?.length}`);
      
      // CRITICAL: Save old tournament phase BEFORE action executes
      const oldTournamentPhase = preState?.tournamentPhase;
      console.log(`[Coordinator] OLD tournament phase before action: ${oldTournamentPhase}`);
      
      const newState = this.actionRouter.executeAction(gameId, playerIndex, data);
      
      // Debug: verify newState is valid
      if (!newState) {
        throw new Error('Action returned undefined state');
      }
      if (!newState.players) {
        throw new Error('Action returned state without players array');
      }
      
      console.log(`[Coordinator] After action ${data.type} - tableCards: ${newState.tableCards?.length}, playerCount: ${newState.playerCount}, players array length: ${newState.players?.length}, players[0].captures: ${newState.players[0]?.captures?.length}, players[1].captures: ${newState.players[1]?.captures?.length}, players[2]?.captures: ${newState.players[2]?.captures?.length}`);
      
      // Check if all players have ended their turn (trick complete)
      if (allPlayersTurnEnded(newState)) {
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
          // Round continues - reset turn flags for next trick
          resetTurnFlags(newState);
          
          // Start the next player's turn (the current player after the trick)
          const nextPlayer = newState.currentPlayer;
          startPlayerTurn(newState, nextPlayer);
        }
      }
      
      // Check if round has ended
      let roundCheck = RoundValidator.shouldEndRound(newState);
      
      // Auto-end turns for players with empty hands
      if (!roundCheck.ended) {
        const playerCount = newState.playerCount || 2;
        let autoEndedAny = false;
        for (let i = 0; i < playerCount; i++) {
          if (newState.players[i]?.hand?.length === 0 && 
              newState.roundPlayers?.[i]?.turnEnded === false) {
            forceEndTurn(newState, i);
            autoEndedAny = true;
          }
        }
        if (autoEndedAny) {
          roundCheck = RoundValidator.shouldEndRound(newState);
        }
      }
      
      if (roundCheck.ended) {
        this._handleRoundEnd(gameId, newState, isPartyGame, data, roundCheck);
      } else {
        // Use TournamentBroadcaster for tournament games
        if (TournamentMaster.isTournamentActive(newState)) {
          TournamentBroadcaster.broadcastGameUpdate(gameId, newState, this.gameManager, this.unifiedMatchmaking);
        } else {
          this.broadcaster.broadcastGameUpdate(gameId, newState, this.unifiedMatchmaking);
        }
      }
    } catch (err) {
      console.error(`[Coordinator] game-action failed: ${err.message}`);
      this.broadcaster.sendError(socket, err.message);
    }
  }

  /**
   * Handle round end - determines next steps based on game mode
   */
  _handleRoundEnd(gameId, newState, isPartyGame, lastAction, roundCheck) {
    // Broadcast round end
    const summary = RoundValidator.getRoundSummary(newState);
    this.broadcaster.broadcastToGame(gameId, 'round-end', {
      round: newState.round,
      reason: roundCheck?.reason || 'unknown',
      summary,
    }, this.unifiedMatchmaking);

    // CRITICAL: Calculate proper scores before checking game over
    // This ensures finalScores contains actual points, not just card counts
    scoring.updateScores(newState);
    
    // Check game over
    const gameOverCheck = RoundValidator.checkGameOver(newState);
    
    // Tournament handling - delegate entirely to TournamentMaster
    if (TournamentMaster.isTournamentActive(newState)) {
      const result = TournamentMaster.handleRoundEnd(
        newState, 
        gameId, 
        this.gameManager,
        this.unifiedMatchmaking,
        this.broadcaster
      );
      
      if (result.gameOver) {
        this._handleGameOver(gameId, result.state || newState, isPartyGame, false);
      } else if (result.newGameId) {
        // TournamentMaster already handled transition (migrated sockets, broadcast)
        console.log(`[Coordinator] Tournament transitioned to game ${result.newGameId}`);
      } else {
        // Same game continues
        this.gameManager.saveGameState(gameId, result.state);
        this.broadcaster.broadcastGameUpdate(gameId, result.state, this.unifiedMatchmaking);
      }
      return;
    }
    
    // Non-tournament game handling
    if (gameOverCheck.gameOver) {
      this._handleGameOver(gameId, newState, isPartyGame, false);
    } else {
      const nextState = RoundValidator.prepareNextRound(newState);
      if (nextState) {
        this.gameManager.saveGameState(gameId, nextState);
        this.broadcaster.broadcastGameUpdate(gameId, nextState, this.unifiedMatchmaking);
      } else {
        this._handleGameOver(gameId, newState, isPartyGame, true);
      }
    }
  }

  /**
   * Handle drag-start event from client.
   */
  handleDragStart(socket, data) {
    const ctx = this._resolvePlayer(socket);
    if (!ctx) return;

    const { gameId, playerIndex, isPartyGame } = ctx;
    
    console.log(`[GameCoordinator] handleDragStart - player ${playerIndex} dragging ${data.card?.rank}${data.card?.suit}, broadcasting to others in game ${gameId}`);
    
    this.broadcaster.broadcastToOthers(gameId, socket.id, 'opponent-drag-start', {
      playerIndex,
      card: data.card,
      cardId: data.cardId,
      source: data.source,
      position: data.position,
      timestamp: Date.now(),
    }, this.unifiedMatchmaking);
  }

  /**
   * Handle drag-move event from client.
   */
  handleDragMove(socket, data) {
    const ctx = this._resolvePlayer(socket);
    if (!ctx) return;

    const { gameId, playerIndex, isPartyGame } = ctx;
    
    console.log(`[GameCoordinator] handleDragMove - player ${playerIndex} at ${data.position?.x?.toFixed(2)}, ${data.position?.y?.toFixed(2)}`);
    
    this.broadcaster.broadcastToOthers(gameId, socket.id, 'opponent-drag-move', {
      playerIndex,
      card: data.card,
      position: data.position,
      timestamp: Date.now(),
    }, this.unifiedMatchmaking);
  }

  /**
   * Handle drag-end event from client.
   */
  handleDragEnd(socket, data) {
    const ctx = this._resolvePlayer(socket);
    if (!ctx) return;

    const { gameId, playerIndex, isPartyGame } = ctx;
    
    console.log(`[GameCoordinator] handleDragEnd - player ${playerIndex}, card ${data.card?.rank}${data.card?.suit}, outcome=${data.outcome || 'miss'}, target=${data.targetType}:${data.targetId}`);
    
    this.broadcaster.broadcastToOthers(gameId, socket.id, 'opponent-drag-end', {
      playerIndex,
      card: data.card,
      position: data.position,
      outcome: data.outcome || 'miss',
      targetType: data.targetType,
      targetId: data.targetId,
      timestamp: Date.now(),
    }, this.unifiedMatchmaking);
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

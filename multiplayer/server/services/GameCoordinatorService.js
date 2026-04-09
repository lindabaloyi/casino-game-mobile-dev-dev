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
 * - TournamentCoordinator: Tournament-specific logic
 * - GamePersistenceService: MongoDB and stats updates
 */

const RoundValidator = require('../game/utils/RoundValidator');
const { allPlayersTurnEnded, resetTurnFlags, startPlayerTurn, forceEndTurn, finalizeGame } = require('../../../shared/game');
const scoring = require('../game/scoring');
const TournamentCoordinator = require('./TournamentCoordinator');
const GamePersistenceService = require('./GamePersistenceService');
const GameStats = require('../models/GameStats');

class GameCoordinatorService {
  constructor(gameManager, actionRouter, unifiedMatchmaking, broadcaster, io) {
    this.gameManager = gameManager;
    this.actionRouter = actionRouter;
    this.unifiedMatchmaking = unifiedMatchmaking;
    this.broadcaster = broadcaster;
    this.io = io;
    
    this.persistence = new GamePersistenceService();
    this.tournamentCoordinator = new TournamentCoordinator(gameManager, unifiedMatchmaking, broadcaster, io);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

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
            socketInfo = { gameId, gameType, userId: socket.userId || null };
          }
          break;
        }
      }
    }
    
    if (!gameId) {
      this.broadcaster.sendError(socket, 'Not in an active game');
      return null;
    }
    const playerIndex = this.gameManager.getPlayerIndex(gameId, socket.id);
    if (playerIndex === null) {
      this.broadcaster.sendError(socket, 'Player not found in game');
      return null;
    }
    return { gameId, playerIndex, isPartyGame };
  }

  // ── Event handlers ─────────────────────────────────────────────────────────────

  handleGameAction(socket, data) {
    if (!data?.type) {
      this.broadcaster.sendError(socket, 'Invalid action: missing type');
      return;
    }

    const ctx = this._resolvePlayer(socket);
    if (!ctx) return;

    const { gameId, playerIndex, isPartyGame } = ctx;

    try {
      const newState = this.actionRouter.executeAction(gameId, playerIndex, data);
      
      if (!newState || !newState.players) {
        throw new Error('Action returned invalid state');
      }

      if (allPlayersTurnEnded(newState)) {
        const playerCount = newState.playerCount || 2;
        let allHandsEmpty = true;
        for (let i = 0; i < playerCount; i++) {
          if (newState.players[i]?.hand?.length > 0) {
            allHandsEmpty = false;
            break;
          }
        }
        
        if (!allHandsEmpty) {
          resetTurnFlags(newState);
          const nextPlayer = newState.currentPlayer;
          startPlayerTurn(newState, nextPlayer);
        }
      }
      
      let roundCheck = RoundValidator.shouldEndRound(newState);
      
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
        this.broadcaster.broadcastGameUpdate(gameId, newState, this.unifiedMatchmaking);
      }
    } catch (err) {
      console.error(`[Coordinator] game-action failed: ${err.message}`);
      this.broadcaster.sendError(socket, err.message);
    }
  }

  _handleRoundEnd(gameId, newState, isPartyGame, lastAction, roundCheck) {
    console.log(`[ROUND_END] Game ${gameId} ended. tournamentMode=${newState.tournamentMode}, phase=${newState.tournamentPhase}, hand=${newState.tournamentHand}`);
    
    const summary = RoundValidator.getRoundSummary(newState);
    this.broadcaster.broadcastToGame(gameId, 'round-end', {
      round: newState.round,
      reason: roundCheck?.reason || 'unknown',
      summary,
    }, this.unifiedMatchmaking);

    scoring.updateScores(newState);
    const gameOverCheck = RoundValidator.checkGameOver(newState);
    
    // For tournament mode: call coordinator to accumulate scores, then emit game-over via _handleGameOver
    if (this.tournamentCoordinator.isTournamentActive(newState)) {
      console.log(`[ROUND_END] Tournament mode - calling coordinator for score accumulation`);
      const result = this.tournamentCoordinator.handleRoundEnd(newState, gameId, lastAction);
      
      // Always emit game-over via _handleGameOver (unified approach)
      if (gameOverCheck.gameOver) {
        console.log(`[ROUND_END] Emitting game-over for tournament hand via _handleGameOver`);
        this._handleGameOver(gameId, result.state, isPartyGame, false);
        return;
      }
      
      // If not game over, continue with next round
      const nextState = RoundValidator.prepareNextRound(result.state);
      if (nextState) {
        this.gameManager.saveGameState(gameId, nextState);
        this.broadcaster.broadcastGameUpdate(gameId, nextState, this.unifiedMatchmaking);
      } else {
        this._handleGameOver(gameId, result.state, isPartyGame, true);
      }
      return;
    }

    // Non-tournament game over handling
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

  // ── Drag handlers ─────────────────────────────────────────────────────────────

  handleDragStart(socket, data) {
    const ctx = this._resolvePlayer(socket);
    if (!ctx) return;
    const { gameId, playerIndex } = ctx;
    
    this.broadcaster.broadcastToOthers(gameId, socket.id, 'opponent-drag-start', {
      playerIndex,
      card: data.card,
      cardId: data.cardId,
      source: data.source,
      position: data.position,
      timestamp: Date.now(),
    }, this.unifiedMatchmaking);
  }

  handleDragMove(socket, data) {
    const ctx = this._resolvePlayer(socket);
    if (!ctx) return;
    const { gameId, playerIndex } = ctx;
    
    this.broadcaster.broadcastToOthers(gameId, socket.id, 'opponent-drag-move', {
      playerIndex,
      card: data.card,
      position: data.position,
      timestamp: Date.now(),
    }, this.unifiedMatchmaking);
  }

  handleDragEnd(socket, data) {
    const ctx = this._resolvePlayer(socket);
    if (!ctx) return;
    const { gameId, playerIndex } = ctx;
    
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

  // ── Round and Stats ─────────────────────────────────────────────────────────────

  handleStartNextRound(socket) {
    const ctx = this._resolvePlayer(socket);
    if (!ctx) return;
    const { gameId, isPartyGame } = ctx;

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

  async handleGetPlayerStats(socket, data) {
    try {
      const playerId = data?.payload?.playerId || socket.userId;
      
      if (!playerId) {
        this.broadcaster.sendError(socket, 'Player ID required');
        return;
      }

      let stats = await GameStats.findByUserId(playerId);
      if (!stats) {
        stats = GameStats.create(playerId);
      }
      
      const leaderboard = await GameStats.getTopPlayers('pointRetentionPerGame', 10);

      socket.emit('player-stats-response', {
        success: true,
        stats,
        leaderboard,
      });
    } catch (err) {
      console.error(`[Coordinator] handleGetPlayerStats failed: ${err.message}`);
      this.broadcaster.sendError(socket, err.message);
    }
  }

  // ── Game Over ─────────────────────────────────────────────────────────────

  _handleGameOver(gameId, finalState, isPartyGame, forceFinalize) {
    const finalizedState = forceFinalize ? finalizeGame(finalState) : finalState;
    
    scoring.updateScores(finalizedState);
    
    const finalScores = finalizedState.scores || [0, 0];
    const playerCount = finalizedState.playerCount || 2;
    
    const capturedCards = [];
    const scoreBreakdowns = [];
    const tableCardsRemaining = finalizedState.tableCards?.length || 0;
    const deckRemaining = finalizedState.deck?.length || 0;
    
    const isPartyMode = playerCount === 4 && finalizedState.players.some(p => p.team);
    const teamScoreBreakdowns = isPartyMode && playerCount === 4 
      ? scoring.getTeamScoreBreakdown(finalizedState.players)
      : null;
    
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
    
    this.persistence.saveGame(gameId, finalizedState, isPartyGame);
    
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
      ...(isTournamentMode && {
        tournamentPhase: finalizedState.tournamentPhase,
        tournamentHand: finalizedState.tournamentHand,
        totalHands: finalizedState.totalHands,
      }),
    }, this.unifiedMatchmaking);
  }

  // ── Tournament Game Join ─────────────────────────────────────────────────────────────

  handleJoinTournamentGame(socket, gameId) {
    console.log(`[Coordinator] handleJoinTournamentGame: socket=${socket.id}, gameId=${gameId}`);
    
    // Get the new game state
    const newGameState = this.gameManager.getGameState(gameId);
    if (!newGameState) {
      this.broadcaster.sendError(socket, 'Game not found');
      return;
    }
    
    // Get player info from socket
    const userId = socket.userId;
    if (!userId) {
      this.broadcaster.sendError(socket, 'User not authenticated');
      return;
    }
    
    // Find player index in new game
    const playerIndex = newGameState.players.findIndex(p => p.id === userId);
    if (playerIndex === -1) {
      this.broadcaster.sendError(socket, 'Player not found in game');
      return;
    }
    
    // Register socket with the new game
    this.unifiedMatchmaking.socketRegistry.set(socket.id, gameId, newGameState.gameMode || 'four-hands', userId);
    
    console.log(`[Coordinator] Registered socket ${socket.id} for game ${gameId}, playerIndex=${playerIndex}`);
    
    // Send game-start to the socket that requested to join
    socket.join(`game-${gameId}`);
    socket.emit('game-start', {
      gameId: gameId,
      gameState: newGameState,
      playerNumber: playerIndex,
      tournamentPhase: newGameState.tournamentPhase,
      tournamentHand: newGameState.tournamentHand,
      totalHands: newGameState.totalHands,
      message: `Hand ${newGameState.tournamentHand} of ${newGameState.totalHands} - ${newGameState.tournamentPhase}`
    });
    
    console.log(`[Coordinator] Sent game-start to socket ${socket.id} for game ${gameId}`);
  }
}

module.exports = GameCoordinatorService;

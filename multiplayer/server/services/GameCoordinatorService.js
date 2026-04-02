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

const RoundValidator = require('../game/utils/RoundValidator');
const { allPlayersTurnEnded, resetTurnFlags, startPlayerTurn, forceEndTurn, finalizeGame } = require('../../../shared/game');
const scoring = require('../game/scoring');
const TournamentManager = require('./TournamentManager');
const GamePersistenceService = require('./GamePersistenceService');

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
    // Check unified matchmaking for any game type
    let socketInfo = this.unifiedMatchmaking.socketGameMap.get(socket.id);
    let gameId = socketInfo?.gameId || null;
    let isPartyGame = socketInfo?.gameType === 'party';
    let gameType = socketInfo?.gameType || null;
    
    // Fallback: Try to find socket in any active game via gameManager
    if (!gameId) {
      for (const [gid, sockets] of this.unifiedMatchmaking.gameSocketsMap.entries()) {
        if (sockets.includes(socket.id)) {
          gameId = gid;
          const game = this.gameManager.getGameState(gid);
          if (game) {
            isPartyGame = game.players.some(p => p.team);
            gameType = game.playerCount === 2 ? 'two-hands' : game.playerCount === 3 ? 'three-hands' : game.playerCount === 4 && isPartyGame ? 'party' : 'four-hands';
            // Update socketGameMap with correct gameId
            this.unifiedMatchmaking.socketGameMap.set(socket.id, { gameId, gameType, userId: socket.userId || null });
            console.log(`[Coordinator] _resolvePlayer: Fallback lookup - socket ${socket.id} found in game ${gameId}, updated socketGameMap`);
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
    const playerIndex = this.gameManager.getPlayerIndex(gameId, socket.id);
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
        // Special handling: Check if tournament phase changed from QUALIFICATION_REVIEW
        // This handles the case where advanceFromQualificationReview action is executed
        // CRITICAL: Use oldTournamentPhase (saved before action) NOT newState.tournamentPhase
        const newPhase = newState?.tournamentPhase;
        console.log(`[Coordinator] Phase check - oldTournamentPhase (from before action): ${oldTournamentPhase}, newPhase: ${newPhase}`);
        
        // Log the socket mapping state
        const socketMap = this.gameManager.socketPlayerMap.get(gameId);
        console.log(`[Coordinator] Socket map at transition check:`, socketMap ? Array.from(socketMap.entries()).map(([id, idx]) => `${id.substr(0,8)}→P${idx}`) : 'no map');
        
        if (oldTournamentPhase === 'QUALIFICATION_REVIEW' && 
            (newPhase === 'SEMI_FINAL' || newPhase === 'FINAL_SHOWDOWN')) {
          console.log(`[Coordinator] Tournament phase transition detected: ${oldTournamentPhase} -> ${newPhase}`);
          console.log(`[Coordinator] Tournament phase transition detected: ${oldTournamentPhase} -> ${newPhase}`);
          const qualifiedPlayers = TournamentManager.getQualifiedPlayers(newState);
          console.log(`[Coordinator] Qualified players for socket cleanup: ${JSON.stringify(qualifiedPlayers)}`);
          
          // CRITICAL FIX: Remap player indices so socket -> new index mapping is correct
          const socketMap = this.gameManager.socketPlayerMap.get(gameId);
          if (socketMap) {
            // Log BEFORE remapping
            console.log(`[Coordinator] Socket map BEFORE remap:`, Array.from(socketMap.entries()).map(([id, idx]) => `${id.substr(0,8)}→P${idx}`));
            
            TournamentManager.remapPlayerIndices(socketMap, qualifiedPlayers);
            
            // Log AFTER remapping
            console.log(`[Coordinator] Socket map AFTER remap:`, Array.from(socketMap.entries()).map(([id, idx]) => `${id.substr(0,8)}→P${idx}`));
            console.log(`[Coordinator] Socket indices remapped for tournament phase`);
          }
        }
        
        this.broadcaster.broadcastGameUpdate(gameId, newState, this.unifiedMatchmaking);
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
    
    // Tournament mode handling
    if (TournamentManager.isTournamentActive(newState)) {
      this._handleTournamentRoundEnd(gameId, newState, isPartyGame, lastAction);
    } else if (gameOverCheck.gameOver) {
      this._handleGameOver(gameId, newState, isPartyGame, false);
    } else {
      // Regular game - auto-transition to next round
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
   * Remove eliminated players from socket maps
   * Keeps qualified players at their original indices
   */
  _removeEliminatedPlayers(gameId, qualifiedPlayers) {
    const socketMap = this.gameManager.socketPlayerMap.get(gameId);
    if (!socketMap) {
      console.log(`[Coordinator] No socket map found for game ${gameId}`);
      return;
    }

    console.log(`[Coordinator] _removeEliminatedPlayers called with qualifiedPlayers: ${JSON.stringify(qualifiedPlayers)}`);
    console.log(`[Coordinator] Current socketMap BEFORE removal:`, Array.from(socketMap.entries()).map(([id, idx]) => `${id.substr(0,8)}→P${idx}`));
    
    // Handle both string playerId (e.g., 'player_0') and numeric indices
    const qualifiedIndices = [];
    for (const q of qualifiedPlayers) {
      if (typeof q === 'string') {
        // Extract numeric index from playerId string like 'player_0' -> 0
        const match = q.match(/^player_(\d+)$/);
        if (match) {
          qualifiedIndices.push(parseInt(match[1], 10));
        } else {
          console.warn(`[Coordinator] Could not parse playerId: ${q}`);
        }
      } else if (typeof q === 'number') {
        qualifiedIndices.push(q);
      }
    }
    
    console.log(`[Coordinator] Qualified indices (numeric): ${JSON.stringify(qualifiedIndices)}`);
    
    const toDelete = [];
    for (const [socketId, playerIndex] of socketMap.entries()) {
      if (!qualifiedIndices.includes(playerIndex)) {
        toDelete.push(socketId);
        console.log(`[Coordinator] Marking socket ${socketId.substr(0,8)} for elimination - playerIndex ${playerIndex} not in qualifiedIndices`);
      }
    }

    for (const socketId of toDelete) {
      const playerIndex = socketMap.get(socketId);
      socketMap.delete(socketId);
      this.unifiedMatchmaking.socketGameMap.delete(socketId);
      console.log(`[Coordinator] Eliminated socket ${socketId.substr(0,8)} (was player ${playerIndex})`);
    }
    
    console.log(`[Coordinator] Remaining sockets AFTER removal:`, Array.from(socketMap.entries()).map(([id, idx]) => `${id.substr(0,8)}→P${idx}`));
  }

  /**
   * Handle tournament round end
   */
  _handleTournamentRoundEnd(gameId, gameState, isPartyGame, lastAction) {
    try {
      console.log(`[Coordinator] _handleTournamentRoundEnd called, lastAction: ${lastAction?.type}, tournamentPhase: ${gameState.tournamentPhase}`);
      
      // Handle special action transitions (from qualification review to semifinal/final)
      if (lastAction?.type === 'advanceFromQualificationReview') {
        console.log(`[Coordinator] Handling advanceFromQualificationReview action`);
        const newState = TournamentManager.handleRoundTransition(gameState, 'advanceFromQualificationReview');
        
        if (newState.tournamentPhase === 'COMPLETED') {
          console.log(`[Coordinator] Tournament COMPLETED! Winner: ${newState.tournamentWinner}`);
          this._handleGameOver(gameId, newState, isPartyGame, false);
          return;
        }

        // Remove eliminated players - now also remap indices for remaining players
        if (newState.tournamentPhase === 'SEMI_FINAL' || newState.tournamentPhase === 'FINAL_SHOWDOWN') {
          const qualifiedPlayers = TournamentManager.getQualifiedPlayers(newState);
          console.log(`[Coordinator] Transition to ${newState.tournamentPhase}, qualified players: ${JSON.stringify(qualifiedPlayers)}`);
          
          // CRITICAL FIX: Remap player indices so socket -> new index mapping is correct
          const socketMap = this.gameManager.socketPlayerMap.get(gameId);
          if (socketMap) {
            // Log BEFORE remapping
            console.log(`[Coordinator] Socket map BEFORE remap:`, Array.from(socketMap.entries()).map(([id, idx]) => `${id.substr(0,8)}→P${idx}`));
            
            TournamentManager.remapPlayerIndices(socketMap, qualifiedPlayers);
            
            // Log AFTER remapping
            console.log(`[Coordinator] Socket map AFTER remap:`, Array.from(socketMap.entries()).map(([id, idx]) => `${id.substr(0,8)}→P${idx}`));
            console.log(`[Coordinator] Socket indices remapped for tournament phase`);
          }
        }

        this.gameManager.saveGameState(gameId, newState);
        this.broadcaster.broadcastGameUpdate(gameId, newState, this.unifiedMatchmaking);
        return;
      }

      // Handle final showdown round
      if (gameState.tournamentPhase === 'FINAL_SHOWDOWN') {
        const showdownState = TournamentManager.handleFinalShowdownRoundEnd(gameState);
        
        if (showdownState.tournamentPhase === 'COMPLETED') {
          console.log(`[Coordinator] Tournament COMPLETED! Winner: ${showdownState.tournamentWinner}`);
          this._handleGameOver(gameId, showdownState, isPartyGame, false);
          return;
        }

        // Remove eliminated players for final showdown
        const qualifiedPlayers = TournamentManager.getQualifiedPlayers(showdownState);
        this._removeEliminatedPlayers(gameId, qualifiedPlayers);

        this.gameManager.saveGameState(gameId, showdownState);
        this.broadcaster.broadcastGameUpdate(gameId, showdownState, this.unifiedMatchmaking);
        return;
      }

      // Handle regular tournament round
      const tournamentState = TournamentManager.handleRoundEnd(gameState);
      
      if (tournamentState.tournamentPhase === 'QUALIFICATION_REVIEW') {
        // Qualification review - just broadcast
        this.gameManager.saveGameState(gameId, tournamentState);
        this.broadcaster.broadcastGameUpdate(gameId, tournamentState, this.unifiedMatchmaking);
      } else if (tournamentState.tournamentPhase === 'SEMI_FINAL' || 
                 tournamentState.tournamentPhase === 'FINAL_SHOWDOWN') {
        // CRITICAL FIX: Remap player indices so socket -> new index mapping is correct
        const qualifiedPlayers = TournamentManager.getQualifiedPlayers(tournamentState);
        console.log(`[Coordinator] Transition to ${tournamentState.tournamentPhase}, qualified players: ${JSON.stringify(qualifiedPlayers)}`);
        
        const socketMap = this.gameManager.socketPlayerMap.get(gameId);
        if (socketMap) {
          // Log BEFORE remapping
          console.log(`[Coordinator] Socket map BEFORE remap:`, Array.from(socketMap.entries()).map(([id, idx]) => `${id.substr(0,8)}→P${idx}`));
          
          TournamentManager.remapPlayerIndices(socketMap, qualifiedPlayers);
          
          // Log AFTER remapping
          console.log(`[Coordinator] Socket map AFTER remap:`, Array.from(socketMap.entries()).map(([id, idx]) => `${id.substr(0,8)}→P${idx}`));
          console.log(`[Coordinator] Socket indices remapped for tournament phase`);
        }
        
        this.gameManager.saveGameState(gameId, tournamentState);
        this.broadcaster.broadcastGameUpdate(gameId, tournamentState, this.unifiedMatchmaking);
      } else if (tournamentState.tournamentPhase === 'COMPLETED') {
        console.log(`[Coordinator] Tournament COMPLETED! Winner: ${tournamentState.tournamentWinner}`);
        this._handleGameOver(gameId, tournamentState, isPartyGame, false);
      } else {
        // Continue tournament
        this.gameManager.saveGameState(gameId, tournamentState);
        this.broadcaster.broadcastGameUpdate(gameId, tournamentState, this.unifiedMatchmaking);
      }
    } catch (err) {
      console.error(`[Coordinator] Tournament round transition failed: ${err.message}`);
      this._handleGameOver(gameId, gameState, isPartyGame, false);
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
    
    // Save to MongoDB using persistence service
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

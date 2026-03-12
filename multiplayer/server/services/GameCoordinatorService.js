/**
 * GameCoordinatorService
 * Receives socket events, validates them, delegates to ActionRouter,
 * then broadcasts the resulting state via BroadcasterService.
 *
 * For Milestone 1 this is intentionally minimal — actions are added
 * one by one in later milestones.
 */

const RoundValidator = require('../game/utils/RoundValidator');
const { allPlayersTurnEnded, resetTurnFlags, startPlayerTurn, forceEndTurn, finalizeGame } = require('../../../shared/game');
const scoring = require('../game/scoring');

class GameCoordinatorService {
  constructor(gameManager, actionRouter, matchmaking, broadcaster, partyMatchmaking = null) {
    this.gameManager  = gameManager;
    this.actionRouter = actionRouter;
    this.matchmaking  = matchmaking;
    this.broadcaster  = broadcaster;
    this.partyMatchmaking = partyMatchmaking;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Resolve which game + player this socket belongs to, or send error. */
  _resolvePlayer(socket) {
    // First check regular matchmaking
    let gameId = this.matchmaking.getGameId(socket.id);
    let isPartyGame = false;
    
    // If not in regular game, check party matchmaking
    if (!gameId && this.partyMatchmaking) {
      gameId = this.partyMatchmaking.getPartyGameId(socket.id);
      isPartyGame = true;
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

  /**
   * Get the appropriate matchmaking service based on whether it's a party game
   */
  _getMatchmakingForGame(isPartyGame) {
    return isPartyGame ? this.partyMatchmaking : this.matchmaking;
  }

  // ── Event handlers ────────────────────────────────────────────────────────

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
      const newState = this.actionRouter.executeAction(gameId, playerIndex, data);
      
      // Get the correct matchmaking service for broadcasting
      const mm = this._getMatchmakingForGame(isPartyGame);
      
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
      
      // Check if round has ended (both hands empty)
      let roundCheck = RoundValidator.shouldEndRound(newState);
      
      // Auto-end turns for players with empty hands (they can't play anyway)
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
        // Re-check round end after auto-ending turns
        if (autoEndedAny) {
          roundCheck = RoundValidator.shouldEndRound(newState);
        }
      }
      
      if (roundCheck.ended) {
        // Broadcast round end to all players
        const summary = RoundValidator.getRoundSummary(newState);
        this.broadcaster.broadcastToGame(gameId, 'round-end', {
          round: newState.round,
          reason: roundCheck.reason,
          summary,
        }, mm);
        
        // Check if game is over
        const gameOverCheck = RoundValidator.checkGameOver(newState);
        if (gameOverCheck.gameOver) {
          // Finalize game - this calculates scores from captured cards
          const finalizedState = finalizeGame(newState);
          
          // Use calculated scores from finalized state
          const finalScores = finalizedState.scores || [0, 0];
          
          // Calculate detailed game-over stats from finalized state
          const playerCount = finalizedState.playerCount || 2;
          const capturedCards = [];
          const scoreBreakdowns = [];
          const tableCardsRemaining = finalizedState.tableCards?.length || 0;
          const deckRemaining = finalizedState.deck?.length || 0;
          
          for (let i = 0; i < playerCount; i++) {
            capturedCards.push(finalizedState.players[i]?.captures?.length || 0);
            // Get detailed score breakdown for each player
            const captures = finalizedState.players[i]?.captures || [];
            scoreBreakdowns.push(scoring.getScoreBreakdown(captures));
          }
          
          finalizedState.gameOver = true;
          this.gameManager.saveGameState(gameId, finalizedState);
          this.broadcaster.broadcastToGame(gameId, 'game-over', {
            winner: gameOverCheck.winner,
            finalScores,
            capturedCards,
            tableCardsRemaining,
            deckRemaining,
            scoreBreakdowns,
          }, mm);
        } else {
          // Auto-transition to next round for multiplayer
          const nextState = RoundValidator.prepareNextRound(newState);
          if (nextState) {
            this.gameManager.saveGameState(gameId, nextState);
            this.broadcaster.broadcastGameUpdate(gameId, nextState, mm);
          } else {
            // No more rounds - end the game
            // Finalize game - this calculates scores from captured cards
            const finalizedState = finalizeGame(newState);
            
            // Use calculated scores from finalized state
            const finalScores = finalizedState.scores || [0, 0];
            
            // Calculate detailed game-over stats from finalized state
            const playerCount = finalizedState.playerCount || 2;
            const capturedCards = [];
            const scoreBreakdowns = [];
            const tableCardsRemaining = finalizedState.tableCards?.length || 0;
            const deckRemaining = finalizedState.deck?.length || 0;
            
            for (let i = 0; i < playerCount; i++) {
              capturedCards.push(finalizedState.players[i]?.captures?.length || 0);
              // Get detailed score breakdown for each player
              const captures = finalizedState.players[i]?.captures || [];
              scoreBreakdowns.push(scoring.getScoreBreakdown(captures));
            }
            
            finalizedState.gameOver = true;
            this.gameManager.saveGameState(gameId, finalizedState);
            const winner = RoundValidator.determineRoundWinner(finalizedState);
            this.broadcaster.broadcastToGame(gameId, 'game-over', {
              winner,
              finalScores,
              capturedCards,
              tableCardsRemaining,
              deckRemaining,
              scoreBreakdowns,
            }, mm);
          }
        }
      } else {
        this.broadcaster.broadcastGameUpdate(gameId, newState, mm);
      }
    } catch (err) {
      console.error(`[Coordinator] game-action failed: ${err.message}`);
      this.broadcaster.sendError(socket, err.message);
    }
  }

  /**
   * Handle drag-start event from client.
   * Broadcasts to opponent so they can see a ghost card.
   */
  handleDragStart(socket, data) {
    const ctx = this._resolvePlayer(socket);
    if (!ctx) return;

    const { gameId, playerIndex, isPartyGame } = ctx;
    const mm = this._getMatchmakingForGame(isPartyGame);
    
    // Broadcast to other player (not self)
    this.broadcaster.broadcastToOthers(gameId, socket.id, 'opponent-drag-start', {
      playerIndex,
      card: data.card,
      cardId: data.cardId,
      source: data.source,
      position: data.position, // normalized 0-1 coordinates
      timestamp: Date.now(),
    }, mm);
  }

  /**
   * Handle drag-move event from client.
   * Broadcasts position updates to opponent.
   */
  handleDragMove(socket, data) {
    const ctx = this._resolvePlayer(socket);
    if (!ctx) return;

    const { gameId, playerIndex, isPartyGame } = ctx;
    const mm = this._getMatchmakingForGame(isPartyGame);

    // console.log(`[Coordinator] drag-move from P${playerIndex}:`, data);
    this.broadcaster.broadcastToOthers(gameId, socket.id, 'opponent-drag-move', {
      playerIndex,
      card: data.card,
      position: data.position, // normalized 0-1 coordinates
      timestamp: Date.now(),
    }, mm);
  }

  /**
   * Handle drag-end event from client.
   * Broadcasts end to opponent, then processes the action.
   */
  handleDragEnd(socket, data) {
    const ctx = this._resolvePlayer(socket);
    if (!ctx) return;

    const { gameId, playerIndex, isPartyGame } = ctx;
    const mm = this._getMatchmakingForGame(isPartyGame);

    // Broadcast end to opponent first
    this.broadcaster.broadcastToOthers(gameId, socket.id, 'opponent-drag-end', {
      playerIndex,
      card: data.card,
      position: data.position,
      outcome: data.outcome || 'miss', // 'success' | 'miss' | 'cancelled'
      targetType: data.targetType,
      targetId: data.targetId,
      timestamp: Date.now(),
    }, mm);
  }

  /**
   * Handle start-next-round action from client.
   * Advances to the next round.
   */
  handleStartNextRound(socket) {
    const ctx = this._resolvePlayer(socket);
    if (!ctx) return;

    const { gameId, playerIndex, isPartyGame } = ctx;
    const mm = this._getMatchmakingForGame(isPartyGame);

    try {
      const state = this.gameManager.getGameState(gameId);
      if (!state) {
        this.broadcaster.sendError(socket, 'Game not found');
        return;
      }

      // Prepare next round using RoundValidator
      const newState = RoundValidator.prepareNextRound(state);
      
      if (newState === null) {
        // No more rounds allowed - end the game
        // Finalize game - this calculates scores from captured cards
        const finalizedState = finalizeGame(state);
        
        // Use calculated scores from finalized state
        const finalScores = finalizedState.scores || [0, 0];
        
        // Calculate detailed game-over stats from finalized state
        const playerCount = finalizedState.playerCount || 2;
        const capturedCards = [];
        const scoreBreakdowns = [];
        const tableCardsRemaining = finalizedState.tableCards?.length || 0;
        const deckRemaining = finalizedState.deck?.length || 0;
        
        for (let i = 0; i < playerCount; i++) {
          capturedCards.push(finalizedState.players[i]?.captures?.length || 0);
          // Get detailed score breakdown for each player
          const captures = finalizedState.players[i]?.captures || [];
          scoreBreakdowns.push(scoring.getScoreBreakdown(captures));
        }
        
        finalizedState.gameOver = true;
        this.gameManager.saveGameState(gameId, finalizedState);
        
        const winner = RoundValidator.determineRoundWinner(finalizedState);
        this.broadcaster.broadcastToGame(gameId, 'game-over', {
          winner,
          finalScores,
          capturedCards,
          tableCardsRemaining,
          deckRemaining,
          scoreBreakdowns,
        }, mm);
        return;
      }
      
      this.gameManager.saveGameState(gameId, newState);
      
      // Broadcast game update with new round
      this.broadcaster.broadcastGameUpdate(gameId, newState, mm);
    } catch (err) {
      console.error(`[Coordinator] start-next-round failed: ${err.message}`);
      this.broadcaster.sendError(socket, err.message);
    }
  }

}

module.exports = GameCoordinatorService;

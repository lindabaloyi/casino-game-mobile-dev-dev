/**
 * GameCoordinatorService
 * Receives socket events, validates them, delegates to ActionRouter,
 * then broadcasts the resulting state via BroadcasterService.
 *
 * For Milestone 1 this is intentionally minimal — actions are added
 * one by one in later milestones.
 */

const RoundValidator = require('../game/utils/RoundValidator');
const { allPlayersTurnEnded, resetTurnFlags, startPlayerTurn, forceEndTurn } = require('../../../shared/game/GameState');

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
      // Log the action
      console.log(`[Coordinator] Action: P${playerIndex} ${data.type} on game ${gameId}${isPartyGame ? ' (party)' : ''}`);
      
      const newState = this.actionRouter.executeAction(gameId, playerIndex, data);
      
      // Log state after action with turn counter
      console.log(`[Coordinator] After action: turnCounter=${newState.turnCounter}, P1hand=${newState.players[0].hand.length}, P2hand=${newState.players[1].hand.length}`);
      
      // Log state after action
      const tableCards = newState.tableCards?.length || 0;
      const playerCount = newState.playerCount || 2;
      console.log(`[Coordinator] After action: Table has ${tableCards} cards, ${playerCount} players`);
      
      // Log scores for all players
      const scores = newState.scores || [];
      if (playerCount === 4 && newState.teamScores) {
        console.log(`[Coordinator] Scores: P0=${scores[0]}, P1=${scores[1]}, P2=${scores[2]}, P3=${scores[3]} | TeamA=${newState.teamScores[0]}, TeamB=${newState.teamScores[1]}`);
      } else {
        console.log(`[Coordinator] Scores: P0=${scores[0]}, P1=${scores[1]}`);
      }
      
      // Get the correct matchmaking service for broadcasting
      const mm = this._getMatchmakingForGame(isPartyGame);
      
      // Check if all players have ended their turn (trick complete)
      if (allPlayersTurnEnded(newState)) {
        console.log(`[Coordinator] ⚡ TRICK COMPLETE - all players have ended their turn ⚡`);
        
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
          console.log(`[Coordinator] Trick complete, resetting turn flags for next trick`);
          resetTurnFlags(newState);
          
          // Start the next player's turn (the current player after the trick)
          // The currentPlayer should already be set correctly by nextTurn
          const nextPlayer = newState.currentPlayer;
          startPlayerTurn(newState, nextPlayer);
          console.log(`[Coordinator] Starting next trick: player ${nextPlayer}`);
        } else {
          console.log(`[Coordinator] Trick complete, round will end (hands empty)`);
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
            console.log(`[Coordinator] Auto-ending turn for player ${i} (empty hand)`);
            forceEndTurn(newState, i);
            autoEndedAny = true;
          }
        }
        // Re-check round end after auto-ending turns
        if (autoEndedAny) {
          console.log(`[Coordinator] Re-checking round end after auto-ending empty-hand turns`);
          roundCheck = RoundValidator.shouldEndRound(newState);
        }
      }
      
      if (roundCheck.ended) {
        console.log(`[Coordinator] ⚠️ Round ${newState.round} ENDED: ${roundCheck.reason} ⚠️`);
        console.log(`[Coordinator] Final scores: P1=${newState.scores?.[0]}, P2=${newState.scores?.[1]}`);
        
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
          console.log(`[Coordinator] 🏆 GAME OVER: Winner=P${gameOverCheck.winner}, Final scores: ${gameOverCheck.finalScores}`);
          
          // Calculate detailed game-over stats from current state
          const playerCount = newState.playerCount || 2;
          const capturedCards = [];
          const tableCardsRemaining = newState.tableCards?.length || 0;
          const deckRemaining = newState.deck?.length || 0;
          
          for (let i = 0; i < playerCount; i++) {
            capturedCards.push(newState.players[i]?.captures?.length || 0);
          }
          
          console.log(`[Coordinator] 🏆 Game Over Stats:`);
          console.log(`[Coordinator]   Captured: P0=${capturedCards[0]}, P1=${capturedCards[1]}`);
          console.log(`[Coordinator]   Table: ${tableCardsRemaining} cards`);
          console.log(`[Coordinator]   Deck: ${deckRemaining} cards`);
          
          newState.gameOver = true;
          this.gameManager.saveGameState(gameId, newState);
          this.broadcaster.broadcastToGame(gameId, 'game-over', {
            winner: gameOverCheck.winner,
            finalScores: gameOverCheck.finalScores,
            capturedCards,
            tableCardsRemaining,
            deckRemaining,
          }, mm);
        } else {
          // Auto-transition to next round for multiplayer
          const nextState = RoundValidator.prepareNextRound(newState);
          if (nextState) {
            console.log(`[Coordinator] Auto-transitioning to Round ${nextState.round}`);
            console.log(`[Coordinator] 📡 Broadcasting game-update to clients for Round ${nextState.round}`);
            console.log(`[Coordinator] 📡 NextState round=${nextState.round}, hands:`, nextState.players.map(p => p.hand.length));
            console.log(`[Coordinator] 📡 NextState deck remaining:`, nextState.deck.length);
            this.gameManager.saveGameState(gameId, nextState);
            this.broadcaster.broadcastGameUpdate(gameId, nextState, mm);
          } else {
            // No more rounds
            console.log(`[Coordinator] No more rounds, ending game`);
            
            // Calculate detailed game-over stats from current state
            const playerCount = newState.playerCount || 2;
            const capturedCards = [];
            const tableCardsRemaining = newState.tableCards?.length || 0;
            const deckRemaining = newState.deck?.length || 0;
            
            for (let i = 0; i < playerCount; i++) {
              capturedCards.push(newState.players[i]?.captures?.length || 0);
            }
            
            newState.gameOver = true;
            this.gameManager.saveGameState(gameId, newState);
            const winner = RoundValidator.determineRoundWinner(newState);
            this.broadcaster.broadcastToGame(gameId, 'game-over', {
              winner,
              finalScores: newState.scores,
              capturedCards,
              tableCardsRemaining,
              deckRemaining,
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
    
    console.log(`[Coordinator] drag-start from P${playerIndex}:`, data);
    
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

    console.log(`[Coordinator] drag-end from P${playerIndex}:`, data);
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

      // Prepare next round using RoundValidator (which now uses shared GameState function)
      const newState = RoundValidator.prepareNextRound(state);
      
      if (newState === null) {
        // No more rounds allowed - end the game
        console.log(`[Coordinator] start-next-round: No more rounds allowed, ending game`);
        
        // Calculate detailed game-over stats from current state
        const playerCount = state.playerCount || 2;
        const capturedCards = [];
        const tableCardsRemaining = state.tableCards?.length || 0;
        const deckRemaining = state.deck?.length || 0;
        
        for (let i = 0; i < playerCount; i++) {
          capturedCards.push(state.players[i]?.captures?.length || 0);
        }
        
        state.gameOver = true;
        this.gameManager.saveGameState(gameId, state);
        
        const winner = RoundValidator.determineRoundWinner(state);
        this.broadcaster.broadcastToGame(gameId, 'game-over', {
          winner,
          finalScores: state.scores,
          capturedCards,
          tableCardsRemaining,
          deckRemaining,
        }, mm);
        return;
      }
      
      this.gameManager.saveGameState(gameId, newState);
      
      console.log(`[Coordinator] Started round ${newState.round}`);
      
      // Broadcast game update with new round
      this.broadcaster.broadcastGameUpdate(gameId, newState, mm);
    } catch (err) {
      console.error(`[Coordinator] start-next-round failed: ${err.message}`);
      this.broadcaster.sendError(socket, err.message);
    }
  }

}

module.exports = GameCoordinatorService;

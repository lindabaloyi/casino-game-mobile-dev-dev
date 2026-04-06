/**
 * TournamentCoordinator
 * Fresh game per phase - no remapping, no multi-hand logic.
 */

const { cloneState } = require('../../../shared/game');
const endTournamentRound = require('../../../shared/game/actions/endTournamentRound');
const endFinalShowdown = require('../../../shared/game/actions/endFinalShowdown');

class TournamentCoordinator {
  constructor(gameManager, matchmaking, broadcaster) {
    this.gameManager = gameManager;
    this.matchmaking = matchmaking;
    this.broadcaster = broadcaster;
  }

  isTournamentActive(gameState) {
    return gameState?.tournamentMode === 'knockout';
  }

  /**
   * Main entry point for tournament round end.
   */
  handleRoundEnd(gameState, gameId, lastAction) {
    // Handle advance from qualification review (user clicked Continue)
    if (lastAction?.type === 'advanceFromQualificationReview') {
      return this._handleAdvanceFromQualificationReview(gameState, gameId);
    }

    const phase = gameState.tournamentPhase;
    if (phase === 'QUALIFYING') {
      return this._handleQualifyingRoundEnd(gameState, gameId);
    } else if (phase === 'SEMI_FINAL') {
      return this._handleSemifinalRoundEnd(gameState, gameId);
    } else if (phase === 'FINAL_SHOWDOWN') {
      return this._handleFinalShowdownRoundEnd(gameState, gameId);
    }
    return { state: gameState, gameOver: false };
  }

  /**
   * Validate client-ready - reject eliminated players.
   */
  handleClientReady(socketId, gameId, playerIndex) {
    const gameState = this.gameManager.getGameState(gameId);
    if (!gameState?.tournamentMode) return true;

    const player = gameState.players?.[playerIndex];
    if (!player) return false;
    return gameState.playerStatuses?.[player.id] !== 'ELIMINATED';
  }

  getPlayerNumber(socketId, gameId, gameState) {
    const socketMap = this.gameManager.socketPlayerMap?.get(gameId);
    const playerIndex = socketMap?.get(socketId);
    if (playerIndex === undefined) return null;
    const player = gameState.players?.[playerIndex];
    if (!player) return null;
    if (gameState.playerStatuses?.[player.id] === 'ELIMINATED') return null;
    return gameState.players.findIndex(p => p.id === player.id);
  }

  getQualifiedPlayers(gameState) {
    return gameState?.qualifiedPlayers || [];
  }

  // ── Phase Handlers ─────────────────────────────────────────────────────────────

  /**
   * Handle advance from qualification review (user clicked Continue)
   */
  _handleAdvanceFromQualificationReview(gameState, gameId) {
    const currentPhase = gameState.tournamentPhase;
    let nextPhase;
    let qualifiedCount;

    if (currentPhase === 'QUALIFICATION_REVIEW') {
      const round = gameState.tournamentRound || 1;
      if (round === 1) {
        nextPhase = 'SEMI_FINAL';
        qualifiedCount = 3;
      } else if (round === 2) {
        nextPhase = 'FINAL_SHOWDOWN';
        qualifiedCount = 2;
      }
    }

    const qualifiedPlayers = gameState.qualifiedPlayers?.slice(0, qualifiedCount) || [];
    
    if (qualifiedPlayers.length < qualifiedCount) {
      return this._handleTournamentComplete(gameState, gameId);
    }

    const nextState = this._createFreshState(gameState, nextPhase, qualifiedPlayers);
    const newGameId = this._createNewGame(nextState);
    this._migrateSockets(gameId, newGameId, qualifiedPlayers);
    this._broadcastTransition(gameId, newGameId, gameState, nextPhase);
    this.gameManager.closeGame(gameId);

    console.log(`[TournamentCoordinator] Advanced to ${nextPhase}, new game: ${newGameId}`);
    return { state: nextState, gameOver: false, newGameId };
  }

  /**
   * Qualifying round ends - create fresh semifinal game with top 3
   */
  _handleQualifyingRoundEnd(gameState, gameId) {
    const resultState = endTournamentRound(gameState);

    if (resultState.tournamentPhase === 'QUALIFICATION_REVIEW') {
      this.gameManager.saveGameState(gameId, resultState);
      this.broadcaster.broadcastGameUpdate(gameId, resultState, this.matchmaking);
      console.log(`[TournamentCoordinator] Entering QUALIFICATION_REVIEW`);
      return { state: resultState, gameOver: false };
    }

    const qualifiedPlayers = resultState.qualifiedPlayers || [];
    
    if (qualifiedPlayers.length < 2) {
      return this._handleTournamentComplete(resultState, gameId);
    }

    console.log(`[TournamentCoordinator] Qualifying complete, qualified: ${JSON.stringify(qualifiedPlayers)}`);

    const semifinalState = this._createFreshState(resultState, 'SEMI_FINAL', qualifiedPlayers);
    const newGameId = this._createNewGame(semifinalState);
    this._migrateSockets(gameId, newGameId, qualifiedPlayers);
    this._broadcastTransition(gameId, newGameId, resultState, 'SEMI_FINAL');
    this.gameManager.closeGame(gameId);

    console.log(`[TournamentCoordinator] Created SEMI_FINAL game: ${newGameId}`);
    return { state: semifinalState, gameOver: false, newGameId };
  }

  /**
   * Semifinal round ends - create fresh final showdown game with top 2
   */
  _handleSemifinalRoundEnd(gameState, gameId) {
    const resultState = endTournamentRound(gameState);

    if (resultState.tournamentPhase === 'QUALIFICATION_REVIEW') {
      this.gameManager.saveGameState(gameId, resultState);
      this.broadcaster.broadcastGameUpdate(gameId, resultState, this.matchmaking);
      console.log(`[TournamentCoordinator] Entering QUALIFICATION_REVIEW`);
      return { state: resultState, gameOver: false };
    }

    const qualifiedPlayers = resultState.qualifiedPlayers || [];
    
    if (qualifiedPlayers.length < 2) {
      return this._handleTournamentComplete(resultState, gameId);
    }

    console.log(`[TournamentCoordinator] Semifinal complete, qualified: ${JSON.stringify(qualifiedPlayers)}`);

    const finalState = this._createFreshState(resultState, 'FINAL_SHOWDOWN', qualifiedPlayers);
    const newGameId = this._createNewGame(finalState);
    this._migrateSockets(gameId, newGameId, qualifiedPlayers);
    this._broadcastTransition(gameId, newGameId, resultState, 'FINAL_SHOWDOWN');
    this.gameManager.closeGame(gameId);

    console.log(`[TournamentCoordinator] Created FINAL_SHOWDOWN game: ${newGameId}`);
    return { state: finalState, gameOver: false, newGameId };
  }

  /**
   * Final showdown ends - determine winner
   */
  _handleFinalShowdownRoundEnd(gameState, gameId) {
    const resultState = endFinalShowdown(gameState);

    if (resultState.tournamentPhase === 'COMPLETED' || resultState.gameOver) {
      const winner = resultState.tournamentWinner;
      console.log(`[TournamentCoordinator] 🏆 Tournament COMPLETED! Winner: ${winner}`);
      
      this.gameManager.saveGameState(gameId, resultState);
      this.broadcaster.broadcastGameUpdate(gameId, resultState, this.matchmaking);
      return { state: resultState, gameOver: true };
    }

    this.gameManager.saveGameState(gameId, resultState);
    this.broadcaster.broadcastGameUpdate(gameId, resultState, this.matchmaking);
    return { state: resultState, gameOver: false };
  }

  /**
   * Handle tournament completion (not enough players)
   */
  _handleTournamentComplete(gameState, gameId) {
    const winner = this._determineWinner(gameState);
    const finalState = {
      ...cloneState(gameState),
      gameOver: true,
      tournamentWinner: winner,
      tournamentPhase: 'COMPLETED'
    };

    console.log(`[TournamentCoordinator] Tournament ended early, winner: ${winner}`);
    this.gameManager.saveGameState(gameId, finalState);
    this.broadcaster.broadcastGameUpdate(gameId, finalState, this.matchmaking);
    return { state: finalState, gameOver: true };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Create a fresh game state for the next phase
   */
  _createFreshState(currentState, nextPhase, qualifiedPlayerIds) {
    const { createDeck } = require('../../../shared/game/deck');
    const { createRoundPlayers } = require('../../../shared/game/turn');
    
    const newState = cloneState(currentState);
    const deck = createDeck();
    
    const cardsPerPlayer = qualifiedPlayerIds.length === 2 ? 10 : 13;
    
    newState.players = qualifiedPlayerIds.map((playerId, index) => ({
      id: playerId,
      index: index,
      hand: deck.splice(0, cardsPerPlayer),
      captures: [],
      score: 0,
      username: currentState.players?.find(p => p.id === playerId)?.username || playerId
    }));
    
    newState.playerCount = qualifiedPlayerIds.length;
    newState.tournamentPhase = nextPhase;
    newState.tournamentRound = (currentState.tournamentRound || 1) + 1;
    newState.round = 1;
    newState.currentPlayer = 0;
    newState.qualifiedPlayers = qualifiedPlayerIds;
    newState.tableCards = deck.splice(0, 4);
    newState.deck = deck;
    newState.gameOver = false;
    newState.scores = new Array(qualifiedPlayerIds.length).fill(0);
    newState.roundPlayers = createRoundPlayers(qualifiedPlayerIds.length);
    newState.gameId = null; // Will be assigned by _createNewGame
    
    // Reset tournament-specific state
    newState.stackCounters = { tempP1: 0, tempP2: 0, tempP3: 0, tempP4: 0, buildP1: 0, buildP2: 0, buildP3: 0, buildP4: 0 };
    newState.lastCapturePlayer = null;
    newState.teamCapturedBuilds = {};
    newState.shiyaRecalls = {};
    newState.turnCounter = 1;
    newState.moveCount = 0;

    console.log(`[TournamentCoordinator] Created fresh state for ${nextPhase} with ${qualifiedPlayerIds.length} players`);
    return newState;
  }

  /**
   * Create new game with fresh gameId
   */
  _createNewGame(state) {
    const newGameId = Date.now();
    state.gameId = newGameId;
    this.gameManager.saveGameState(newGameId, state);
    console.log(`[TournamentCoordinator] Created new game: ${newGameId}`);
    return newGameId;
  }

  /**
   * Migrate only qualified players' sockets to new game
   * Eliminated players are left behind (leak solved)
   */
  _migrateSockets(oldGameId, newGameId, qualifiedPlayerIds) {
    const oldSockets = this.matchmaking.getGameSockets(oldGameId);
    const newSocketMap = new Map();

    console.log(`[TournamentCoordinator] Migrating from game ${oldGameId} to ${newGameId}`);
    console.log(`[TournamentCoordinator] Qualified players: ${JSON.stringify(qualifiedPlayerIds)}`);

    for (const socket of oldSockets) {
      const playerId = this._getPlayerIdFromSocket(socket, oldGameId);
      
      if (playerId && qualifiedPlayerIds.includes(playerId)) {
        const newIndex = qualifiedPlayerIds.indexOf(playerId);
        
        this.matchmaking.socketRegistry?.set(
          socket.id, 
          newGameId, 
          'tournament', 
          socket.userId
        );
        
        newSocketMap.set(socket.id, newIndex);
        
        socket.leave(`game-${oldGameId}`);
        socket.join(`game-${newGameId}`);
        
        console.log(`[TournamentCoordinator] ✓ Migrated socket ${socket.id.substr(0, 8)} (${playerId}) -> index ${newIndex}`);
      } else {
        console.log(`[TournamentCoordinator] ✗ Left behind socket ${socket.id.substr(0, 8)} (not qualified)`);
      }
    }

    this.gameManager.socketPlayerMap?.set(newGameId, newSocketMap);
    this.gameManager.socketPlayerMap?.delete(oldGameId);
  }

  /**
   * Broadcast transition to old game
   */
  _broadcastTransition(oldGameId, newGameId, oldState, nextPhase) {
    const sockets = this.matchmaking.getGameSockets(oldGameId);
    const eliminatedPlayers = this._getEliminatedPlayers(oldState);

    console.log(`[TournamentCoordinator] Broadcasting transition: ${oldState.tournamentPhase} -> ${nextPhase}`);

    for (const socket of sockets) {
      socket.emit('game-over', {
        isTournamentMode: true,
        nextGameId: newGameId,
        nextPhase: nextPhase,
        transitionType: 'auto',
        countdownSeconds: 5,
        finalScores: oldState.scores,
        qualifiedPlayers: oldState.qualifiedPlayers,
        eliminatedPlayers: eliminatedPlayers,
        tournamentScores: oldState.tournamentScores,
      });
    }
  }

  _getPlayerIdFromSocket(socket, gameId) {
    const socketMap = this.gameManager.socketPlayerMap?.get(gameId);
    const playerIndex = socketMap?.get(socket.id);
    if (playerIndex === undefined) return null;
    const gameState = this.gameManager.getGameState(gameId);
    return gameState?.players?.[playerIndex]?.id;
  }

  _getEliminatedPlayers(gameState) {
    return Object.entries(gameState.playerStatuses || {})
      .filter(([_, status]) => status === 'ELIMINATED')
      .map(([id]) => id);
  }

  _determineWinner(gameState) {
    let winnerId = null;
    let maxScore = -1;
    for (const [id, score] of Object.entries(gameState.tournamentScores || {})) {
      if (score > maxScore) {
        maxScore = score;
        winnerId = id;
      }
    }
    return winnerId;
  }
}

module.exports = TournamentCoordinator;

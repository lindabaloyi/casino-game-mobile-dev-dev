/**
 * TournamentCoordinator
 * Fresh game per hand approach using GameFactory for ALL hands.
 * Handles: QUALIFYING → SEMI_FINAL → FINAL
 */

const { initializeGame, cloneState } = require('../../../shared/game');
const { createDeck } = require('../../../shared/game/deck');
const { createRoundPlayers } = require('../../../shared/game/turn');

class TournamentCoordinator {
  constructor(gameManager, matchmaking, broadcaster, io) {
    this.gameManager = gameManager;
    this.matchmaking = matchmaking;
    this.broadcaster = broadcaster;
    this.io = io;
    this.activeTournaments = new Map();
  }

  isTournamentActive(gameState) {
    return gameState?.tournamentMode === 'knockout';
  }

  /**
   * Validate client-ready - reject eliminated players
   */
  handleClientReady(socketId, gameId, playerIndex) {
    const gameState = this.gameManager.getGameState(gameId);
    if (!gameState?.tournamentMode) return true;

    const player = gameState.players?.[playerIndex];
    if (!player) return false;
    return gameState.playerStatuses?.[player.id] !== 'ELIMINATED';
  }

  /**
   * Create a full tournament (QUALIFYING → SEMI_FINAL → FINAL)
   */
  async createTournament(players, config = {}) {
    const tournamentId = `tournament-${Date.now()}`;
    const tournament = {
      id: tournamentId,
      phase: 'QUALIFYING',
      totalHands: config.qualifyingHands || 4,
      currentHand: 0,
      players: players.map(p => ({
        id: p.id || p.playerId || p.userId,
        name: p.name || p.username || 'Player',
        socketId: p.socketId,
        cumulativeScore: 0,
        handsPlayed: 0,
        eliminated: false
      })),
      status: 'active',
      config: {
        qualifyingHands: config.qualifyingHands || 4,
        qualifyingPlayers: config.qualifyingPlayers || 3,
        semifinalHands: config.semifinalHands || 3,
        finalHands: config.finalHands || 2
      }
    };
    this.activeTournaments.set(tournamentId, tournament);
    await this._startNextHand(tournamentId);
    return tournament;
  }

  /**
   * Alias for createTournament (for backwards compatibility)
   */
  async createQualifier(players, config = {}) {
    return this.createTournament(players, config);
  }

  /**
   * Start the next hand using GameFactory
   */
  async _startNextHand(tournamentId) {
    const tournament = this.activeTournaments.get(tournamentId);
    if (!tournament) return;
    
    const activePlayers = tournament.players.filter(p => !p.eliminated);
    const playerCount = activePlayers.length;
    
    const gameType = this._getGameTypeForPlayerCount(playerCount);
    console.log(`[TournamentCoordinator] Creating ${gameType} for ${playerCount} players`);
    
    const playerEntries = activePlayers.map(p => ({
      socket: this._getSocketByPlayerId(p.id),
      userId: p.id
    }));
    
    const result = this.matchmaking.gameFactory.createGame(gameType, playerEntries);
    if (!result) {
      console.error(`[TournamentCoordinator] Failed to create ${gameType} game`);
      return;
    }
    
    const { gameId, gameState, players: resultPlayers } = result;
    
    gameState.tournamentMode = 'knockout';
    gameState.tournamentId = tournamentId;
    gameState.tournamentPhase = tournament.phase;
    gameState.tournamentHand = tournament.currentHand + 1;
    gameState.totalHands = tournament.totalHands;
    gameState.tournamentScores = {};
    gameState.qualifiedPlayers = [];
    gameState.playerStatuses = {};
    
    activePlayers.forEach(p => {
      gameState.tournamentScores[p.id] = p.cumulativeScore;
      gameState.playerStatuses[p.id] = 'ACTIVE';
    });
    
    this.gameManager.saveGameState(gameId, gameState);
    
    tournament.currentHand++;
    tournament.currentGameId = gameId;
    
    if (tournament.currentHand > 1) {
      await this._cleanupOldGame(tournament);
    }
    
    this.io.to(`game-${gameId}`).emit('game-start', {
      gameId,
      tournamentId,
      tournamentPhase: tournament.phase,
      tournamentHand: tournament.currentHand,
      totalHands: tournament.totalHands,
      players: gameState.players,
      round: gameState.round,
      phase: gameState.phase,
      message: `Hand ${tournament.currentHand} of ${tournament.totalHands} - ${tournament.phase}`
    });
    
    console.log(`[TournamentCoordinator] Started ${tournament.phase} hand ${tournament.currentHand}, gameId: ${gameId}`);
    return { gameId, gameState };
  }

  /**
   * Map player count to game type
   */
  _getGameTypeForPlayerCount(playerCount) {
    switch (playerCount) {
      case 4: return 'four-hands';
      case 3: return 'three-hands';
      case 2: return 'two-hands';
      default: return 'four-hands';
    }
  }

  /**
   * Get socket by player ID from socket registry
   */
  _getSocketByPlayerId(playerId) {
    if (!this.matchmaking?.socketRegistry?.socketGameMap) return null;
    
    for (const [socketId, info] of this.matchmaking.socketRegistry.socketGameMap.entries()) {
      if (info.userId === playerId) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) return socket;
      }
    }
    
    for (const [socketId, socket] of this.io.sockets.sockets) {
      if (socket.userId === playerId) return socket;
    }
    
    return null;
  }

  /**
   * Close old game and clean up
   */
  async _cleanupOldGame(tournament) {
    const oldGameId = tournament.previousGameId;
    if (!oldGameId) return;
    
    const oldGame = this.gameManager.getGameState(oldGameId);
    if (oldGame) {
      this.gameManager.closeGame(oldGameId);
      console.log(`[TournamentCoordinator] Closed old game: ${oldGameId}`);
    }
  }

  /**
   * Called when a hand ends
   */
  async handleHandComplete(gameState, results) {
    const tournament = this.activeTournaments.get(gameState.tournamentId);
    if (!tournament) return;
    
    console.log(`[TournamentCoordinator] Hand ${gameState.tournamentHand} complete in ${gameState.tournamentPhase}`);
    
    for (let i = 0; i < results.playerIds.length; i++) {
      const player = tournament.players.find(p => p.id === results.playerIds[i]);
      if (player) {
        player.cumulativeScore += results.finalScores[i];
        player.handsPlayed++;
        console.log(`[TournamentCoordinator] ${player.name}: +${results.finalScores[i]} = ${player.cumulativeScore}`);
      }
    }
    
    tournament.previousGameId = tournament.currentGameId;
    tournament.currentGameId = null;
    
    const phaseComplete = tournament.currentHand >= tournament.totalHands;
    if (phaseComplete) {
      await this._endPhase(gameState.tournamentId);
    } else {
      await this._startNextHand(gameState.tournamentId);
    }
  }

  /**
   * End current phase - determine qualified/eliminated, start next phase
   */
  async _endPhase(tournamentId) {
    const tournament = this.activeTournaments.get(tournamentId);
    if (!tournament) return;
    
    const activePlayers = tournament.players.filter(p => !p.eliminated);
    activePlayers.sort((a, b) => b.cumulativeScore - a.cumulativeScore);
    
    let qualifiedCount, nextPhase;
    
    if (tournament.phase === 'QUALIFYING') {
      qualifiedCount = tournament.config.qualifyingPlayers;
      nextPhase = 'SEMI_FINAL';
    } else if (tournament.phase === 'SEMI_FINAL') {
      qualifiedCount = 2;
      nextPhase = 'FINAL';
    } else {
      await this._endTournament(tournamentId, activePlayers);
      return;
    }
    
    const qualified = activePlayers.slice(0, qualifiedCount);
    const eliminated = activePlayers.slice(qualifiedCount);
    
    eliminated.forEach(p => p.eliminated = true);
    
    console.log(`[TournamentCoordinator] ${tournament.phase} complete - Qualified: ${qualified.map(p => p.name).join(', ')}`);
    
    const lastRoom = `game-${tournament.previousGameId}`;
    
    for (const player of eliminated) {
      const socket = this._getSocketByPlayerId(player.id);
      if (socket) {
        const position = tournament.players.findIndex(p => p.id === player.id) + 1;
        socket.emit('tournament-eliminated', {
          message: `You finished in position ${position}`,
          finalScore: player.cumulativeScore,
          position: position
        });
      }
    }
    
    tournament.phase = nextPhase;
    tournament.totalHands = tournament.config[`${nextPhase.toLowerCase()}Hands`] || 3;
    tournament.currentHand = 0;
    
    tournament.players = tournament.players.map(p => {
      if (qualified.some(q => q.id === p.id)) {
        p.cumulativeScore = 0;
        p.handsPlayed = 0;
      }
      return p;
    });
    
    if (lastRoom) {
      this.io.to(lastRoom).emit('phase-complete', {
        phase: tournament.phase,
        qualified: qualified.map(p => p.id),
        leaderboard: activePlayers.map(p => ({ id: p.id, name: p.name, score: p.cumulativeScore }))
      });
    }
    
    await this._startNextHand(tournamentId);
  }

  /**
   * End tournament - declare winner
   */
  async _endTournament(tournamentId, finalists) {
    const tournament = this.activeTournaments.get(tournamentId);
    if (!tournament) return;
    
    const winner = finalists[0];
    tournament.status = 'completed';
    tournament.winner = winner.id;
    
    console.log(`[TournamentCoordinator] Tournament complete! Winner: ${winner.name}`);
    
    for (const player of tournament.players) {
      const socket = this._getSocketByPlayerId(player.id);
      if (!socket) continue;
      
      const rank = finalists.findIndex(f => f.id === player.id) + 1;
      
      socket.emit('tournament-complete', {
        winner: winner.id,
        winnerName: winner.name,
        finalRank: rank,
        totalScore: player.cumulativeScore,
        leaderboard: finalists.map(p => ({ id: p.id, name: p.name, score: p.cumulativeScore }))
      });
    }
    
    this.activeTournaments.delete(tournamentId);
  }

  /**
   * Main entry point for tournament round end (called from GameCoordinatorService)
   */
  handleRoundEnd(gameState, gameId, lastAction) {
    const phase = gameState?.tournamentPhase;
    
    if (phase === 'QUALIFYING' || phase === 'SEMI_FINAL' || phase === 'FINAL') {
      return this._handleTournamentRoundEnd(gameState, gameId);
    }
    
    return { state: gameState, gameOver: false };
  }

  /**
   * Handle tournament round end - check if hand is complete
   */
  _handleTournamentRoundEnd(gameState, gameId) {
    const tournament = this.activeTournaments.get(gameState.tournamentId);
    
    if (!tournament) {
      return { state: gameState, gameOver: false };
    }
    
    const isHandComplete = gameState.round >= 13 && gameState.gameOver;
    
    if (isHandComplete) {
      const finalScores = gameState.scores || [];
      const playerIds = gameState.players.map(p => p.id);
      
      const results = {
        gameId,
        playerIds,
        finalScores,
        scoreBreakdowns: gameState.scoreBreakdowns || []
      };
      
      this.handleHandComplete(gameState, results);
      return { state: gameState, gameOver: true, nextHand: true };
    }
    
    return { state: gameState, gameOver: false };
  }

  /**
   * Get tournament state (for debugging/API)
   */
  getTournamentState(tournamentId) {
    return this.activeTournaments.get(tournamentId);
  }

  /**
   * Get current leaderboard
   */
  getLeaderboard(tournamentId) {
    const tournament = this.activeTournaments.get(tournamentId);
    if (!tournament) return null;
    
    return [...tournament.players]
      .sort((a, b) => b.cumulativeScore - a.cumulativeScore)
      .map(p => ({
        id: p.id,
        name: p.name,
        score: p.cumulativeScore,
        handsPlayed: p.handsPlayed,
        eliminated: p.eliminated
      }));
  }
}

module.exports = TournamentCoordinator;
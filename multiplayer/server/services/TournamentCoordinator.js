/**
 * TournamentCoordinator
 * Handles tournament hands 2+ after first hand is created via 4-hand matchmaking.
 * Handles: QUALIFYING → SEMI_FINAL → FINAL phase transitions and elimination.
 */

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
   * Register an existing game as the first hand of a tournament
   * Called when a 'four-hands' game is created with tournamentMode flag
   */
  registerExistingGameAsTournament(gameState, players, io) {
    const tournamentId = gameState.tournamentId;
    console.log(`[DEBUG] [TournamentCoordinator] registerExistingGameAsTournament: ${tournamentId}`);
    
    const tournament = {
      id: tournamentId,
      phase: gameState.tournamentPhase || 'QUALIFYING',
      totalHands: gameState.totalHands || 4,
      currentHand: gameState.tournamentHand || 1,
      previousGameId: null,
      currentGameId: gameState.gameId,
      players: players.map((p, i) => ({
        id: p.userId || p.socket?.id || `guest_${i}`,
        socketId: p.socket?.id || null,
        name: p.socket?.userId || `Guest ${i + 1}`,
        cumulativeScore: 0,
        handsPlayed: 0,
        eliminated: false
      })),
      status: 'active',
      config: {
        qualifyingHands: 4,
        qualifyingPlayers: 3,
        semifinalHands: 3,
        finalHands: 2
      }
    };
    
    this.activeTournaments.set(tournamentId, tournament);
    console.log(`[DEBUG] [TournamentCoordinator] Registered tournament ${tournamentId} with ${tournament.players.length} players`);
    
    return tournament;
  }

  /**
   * Start the next hand using GameFactory
   */
  async _startNextHand(tournamentId) {
    const tournament = this.activeTournaments.get(tournamentId);
    if (!tournament) {
      console.log(`[DEBUG] [TournamentCoordinator] _startNextHand: tournament not found for ${tournamentId}`);
      return;
    }
    
    // Skip if tournament is transitioning (countdown in progress)
    if (tournament.status === 'transitioning') {
      console.log(`[START_NEXT_HAND] Skipping - tournament is in transitioning state`);
      return;
    }
    
    console.log(`[START_NEXT_HAND] Phase=${tournament.phase}, hand=${tournament.currentHand + 1}/${tournament.totalHands}`);
    
    const activePlayers = tournament.players.filter(p => !p.eliminated);
    const playerCount = activePlayers.length;
    
    const gameType = this._getGameTypeForPlayerCount(playerCount);
    console.log(`[START_NEXT_HAND] Game type: ${gameType}, players: ${activePlayers.map(p => p.id).join(', ')}`);
    
    const playerEntries = activePlayers.map(p => {
      let socket = this._getSocketByPlayerId(p.id);
      if (!socket && p.socketId) {
        socket = this.io.sockets.sockets.get(p.socketId);
      }
      return {
        socket: socket,
        userId: p.id
      };
    });
    
    const result = this.matchmaking.gameFactory.createGame(gameType, playerEntries);
    if (!result) {
      console.error(`[START_NEXT_HAND] ❌ Failed to create ${gameType} game!`);
      return;
    }
    
    console.log(`[START_NEXT_HAND] ✅ Game created with ID: ${result.gameId}`);
    
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
    
    // Get player sockets and emit game-start with all data client needs
    const tournamentPlayers = tournament.players.filter(p => !p.eliminated);
    console.log(`[DEBUG] [TournamentCoordinator] Emitting game-start to ${tournamentPlayers.length} players`);
    for (let i = 0; i < tournamentPlayers.length; i++) {
      const player = tournamentPlayers[i];
      console.log(`[DEBUG] [TournamentCoordinator] Looking for socket: player.id=${player.id}, socketId=${player.socketId}`);
      let socket = this._getSocketByPlayerId(player.id);
      // Fallback: try socketId if player.id is null
      if (!socket && player.socketId) {
        socket = this.io.sockets.sockets.get(player.socketId);
        console.log(`[DEBUG] [TournamentCoordinator] Fallback socket lookup: ${player.socketId} -> ${socket ? 'found' : 'not found'}`);
      }
      if (socket) {
        console.log(`[DEBUG] [TournamentCoordinator] Found socket ${socket.id}, emitting game-start`);
        // Join socket to game room and update registry
        socket.join(`game-${gameId}`);
        if (this.matchmaking && this.matchmaking.socketRegistry) {
          this.matchmaking.socketRegistry.set(socket.id, gameId, 'tournament', player.id);
        }

        socket.emit('game-start', {
          gameId,
          gameState,
          playerNumber: i,
          playerInfos: gameState.players.map((p, idx) => ({
            playerNumber: idx,
            userId: p.userId,
            username: p.name || `Player ${idx + 1}`,
            avatar: p.avatar || 'lion'
          })),
          tournamentId,
          tournamentPhase: tournament.phase,
          tournamentHand: tournament.currentHand,
          totalHands: tournament.totalHands,
          message: `Hand ${tournament.currentHand} of ${tournament.totalHands} - ${tournament.phase}`
        });
      }
    }
    
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
    if (!playerId) {
      console.log(`[DEBUG] [TournamentCoordinator] _getSocketByPlayerId: playerId is null/undefined`);
      return null;
    }
    
    if (!this.matchmaking?.socketRegistry?.socketGameMap) return null;
    
    for (const [socketId, info] of this.matchmaking.socketRegistry.socketGameMap.entries()) {
      if (info.userId === playerId) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) return socket;
      }
    }
    
    // Also check io.sockets directly (for guests using socket.id as playerId)
    for (const [socketId, socket] of this.io.sockets.sockets) {
      if (socket.id === playerId || socket.userId === playerId) return socket;
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
    console.log(`[TournamentCoordinator] handleHandComplete called, tournamentId: ${gameState.tournamentId}, found: ${!!tournament}`);
    console.log(`[TournamentCoordinator] activeTournaments size: ${this.activeTournaments.size}`);
    console.log(`[TournamentCoordinator] currentHand: ${tournament?.currentHand}, totalHands: ${tournament?.totalHands}`);
    console.log(`[TournamentCoordinator] gameState.gameId: ${gameState.gameId}, results:`, results);
    
    if (!tournament) {
      console.log(`[TournamentCoordinator] ❌ Tournament not found! Cannot emit game-over.`);
      return;
    }
    
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
    console.log(`[TournamentCoordinator] phaseComplete check: ${tournament.currentHand} >= ${tournament.totalHands} = ${phaseComplete}`);
    
    if (phaseComplete) {
      // await this._endPhase(gameState.tournamentId, gameState);
      console.log(`[HAND_END] Phase complete but auto-transition disabled. Tournament stopped.`);
    } else {
      // Score accumulation - game-over emission is now handled by GameCoordinatorService._handleGameOver (unified approach)
      console.log(`[HAND_END] Scores accumulated for hand ${tournament.currentHand}. game-over will be emitted by _handleGameOver.`);
      console.log(`[HAND_END] Cumulative scores:`, tournament.players.map(p => ({ id: p.id, score: p.cumulativeScore })));

      // await this._startNextHand(gameState.tournamentId);
      console.log(`[HAND_END] Auto-next-hand disabled. Waiting for manual trigger.`);
    }
  }

  /**
   * End current phase - determine qualified/eliminated, start next phase
   */
  async _endPhase(tournamentId, gameState) {
    const tournament = this.activeTournaments.get(tournamentId);
    if (!tournament) return;
    
    console.log(`[END_PHASE] Called for tournament ${tournamentId}, phase=${tournament.phase}`);
    
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
    const eliminatedIds = eliminated.map(p => p.id);
    
    eliminated.forEach(p => p.eliminated = true);
    
    console.log(`[TRANSITION] Phase complete: ${tournament.phase} → ${nextPhase}`);
    console.log(`[TRANSITION] Qualified: ${qualified.map(p => p.id).join(', ')}`);
    console.log(`[TRANSITION] Eliminated: ${eliminated.map(p => p.id).join(', ')}`);
    
    // Update tournament state for next phase FIRST
    tournament.phase = nextPhase;
    tournament.totalHands = tournament.config[`${nextPhase.toLowerCase()}Hands`] || 3;
    tournament.currentHand = 0;
    tournament.previousGameId = tournament.currentGameId;
    tournament.status = 'transitioning';
    
    tournament.players = tournament.players.map(p => {
      if (qualified.some(q => q.id === p.id)) {
        p.cumulativeScore = 0;
        p.handsPlayed = 0;
      }
      return p;
    });
    
    // STEP 1: Create the next phase game NOW (before emitting game-over)
    console.log(`[TRANSITION] Creating ${nextPhase} game immediately...`);
    const newGameResult = await this._startNextHand(tournamentId);
    const newGameId = newGameResult?.gameId;
    console.log(`[TRANSITION] Created ${nextPhase} game with ID: ${newGameId}`);
    
    // STEP 2: Emit game-over with the actual nextGameId
    const lastRoom = `game-${tournament.previousGameId}`;
    const lastGameState = this.gameManager.getGameState(tournament.previousGameId);
    
    const gameOverPayload = {
      winner: activePlayers[0]?.id?.replace('player_', '') || '0',
      finalScores: activePlayers.map(p => p.cumulativeScore),
      isTournamentMode: true,
      playerStatuses: Object.fromEntries(tournament.players.map(p => [p.id, p.eliminated ? 'ELIMINATED' : 'ACTIVE'])),
      qualifiedPlayers: qualified.map(p => p.id),
      eliminatedPlayers: eliminatedIds,
      nextGameId: newGameId,
      nextPhase: nextPhase,
      transitionType: 'auto',
      countdownSeconds: 8,
      scoreBreakdowns: lastGameState?.scoreBreakdowns || []
    };
    
    console.log(`[TRANSITION] Emitting game-over with nextGameId=${newGameId}`);
    console.log(`[TRANSITION] Full game-over payload:`, JSON.stringify(gameOverPayload, null, 2));
    
    if (lastGameState && lastRoom) {
      this.io.to(lastRoom).emit('game-over', gameOverPayload);
    }
    
    // Emit phase-complete for any other listeners
    if (lastRoom) {
      this.io.to(lastRoom).emit('phase-complete', {
        phase: tournament.phase,
        qualified: qualified.map(p => p.id),
        leaderboard: activePlayers.map(p => ({ id: p.id, name: p.name, score: p.cumulativeScore }))
      });
    }
    
    // STEP 3: After countdown, broadcast game-start to the new game room
    console.log(`[TRANSITION] Waiting 8 seconds before broadcasting game-start...`);
    setTimeout(() => {
      console.log(`[TRANSITION] Countdown complete, broadcasting game-start for game ${newGameId}`);
      tournament.status = 'active';
      
      // Broadcast game-start to the new game room
      if (newGameId) {
        const newRoom = `game-${newGameId}`;
        const newGameState = this.gameManager.getGameState(newGameId);
        if (newGameState) {
          this.io.to(newRoom).emit('game-start', {
            gameId: newGameId,
            gameState: newGameState,
            tournamentPhase: newGameState.tournamentPhase,
            tournamentHand: newGameState.tournamentHand,
            totalHands: newGameState.totalHands,
            message: `Hand 1 of ${newGameState.totalHands} - ${newGameState.tournamentPhase}`
          });
        }
      }
    }, 8000);
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
    console.log(`[DEBUG] [TournamentCoordinator] handleRoundEnd called: phase=${phase}, tournamentId=${gameState.tournamentId}`);
    
    if (phase === 'QUALIFYING' || phase === 'SEMI_FINAL' || phase === 'FINAL') {
      return this._handleTournamentRoundEnd(gameState, gameId);
    }
    
    return { state: gameState, gameOver: false };
  }

  /**
   * Handle tournament round end - check if hand is complete
   */
  _handleTournamentRoundEnd(gameState, gameId) {
    let tournament = this.activeTournaments.get(gameState.tournamentId);
    
    console.log(`[HAND_END_CHECK] Game ${gameId}: round=${gameState.round}, gameOver=${gameState.gameOver}, tournamentFound=${!!tournament}, tournamentId=${gameState.tournamentId}`);
    
    // Fallback: if tournament not found, register it from game state
    if (!tournament) {
      console.warn(`[FALLBACK] Tournament not found – registering from game state`);
      const players = gameState.players.map((p, i) => ({
        userId: p.id,
        socket: this._getSocketByPlayerId(p.id) || { id: p.id, userId: p.userId }
      }));
      this.registerExistingGameAsTournament(gameState, players, this.io);
      tournament = this.activeTournaments.get(gameState.tournamentId);
      console.log(`[FALLBACK] Registration attempt result:`, !!tournament);
    }
    
    if (!tournament) {
      console.log(`[DEBUG] [TournamentCoordinator] ❌ Tournament STILL NOT FOUND after fallback!`);
      return { state: gameState, gameOver: false };
    }
    
    // Hand is complete when game is over OR when round ended (all cards played)
    const isHandComplete = gameState.gameOver === true || gameState.roundEndReason !== undefined;
    console.log(`[HAND_END_CHECK] isHandComplete=${isHandComplete}, gameOver=${gameState.gameOver}, roundEndReason=${gameState.roundEndReason}, hand=${tournament.currentHand}/${tournament.totalHands}`);
    
    if (isHandComplete) {
      console.log(`[HAND_END] Hand ${gameState.tournamentHand} complete, calling handleHandComplete`);
      
      // Ensure gameOver is set so we can track it
      gameState.gameOver = true;
      
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
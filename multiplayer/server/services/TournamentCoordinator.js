/**
 * TournamentCoordinator
 * Handles tournament elimination after every hand.
 * Eliminates lowest scorer after each hand until one remains.
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
        socket: p.socket,
        socketId: p.socket?.id || null,
        name: p.socket?.userId || `Guest ${i + 1}`,
        cumulativeScore: 0,
        cumulativeSpades: 0,
        cumulativeCards: 0,
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
    
    const playerEntries = activePlayers.map(p => ({
      socket: p.socket,
      userId: p.id
    }));
    
    const result = this.matchmaking._createGameFromEntries(gameType, playerEntries);
    if (!result) {
      console.error(`[START_NEXT_HAND] ❌ Failed to create ${gameType} game!`);
      return;
    }
    
    console.log(`[START_NEXT_HAND] ✅ Game created with ID: ${result.gameId}`);
    
    const { gameId, gameState, players: resultPlayers } = result;
    
    // Ensure currentPlayer starts at 0 for the new game
    console.log(`[START_NEXT_HAND] Initial currentPlayer: ${gameState.currentPlayer}`);
    
    // Set currentPlayer to winner of previous hand (if available)
    const lastGameId = tournament.previousGameId;
    const lastGameState = lastGameId ? this.gameManager.getGameState(lastGameId) : null;
    
    if (lastGameState && lastGameState.scores && lastGameState.players) {
      // Find winner's index in previous game
      const maxScore = Math.max(...lastGameState.scores);
      const winnerIndex = lastGameState.scores.indexOf(maxScore);
      const winnerUserId = lastGameState.players[winnerIndex]?.userId;
      
      console.log(`[START_NEXT_HAND] Previous game winner: index ${winnerIndex}, userId: ${winnerUserId}, score: ${maxScore}`);
      
      // Map winner to new game index
      if (winnerUserId) {
        const newWinnerIndex = gameState.players.findIndex(p => p.userId === winnerUserId);
        if (newWinnerIndex !== -1) {
          console.log(`[START_NEXT_HAND] Winner starts next hand: index ${newWinnerIndex}`);
          gameState.currentPlayer = newWinnerIndex;
        }
      }
    } else if (gameState.currentPlayer !== 0) {
      console.warn(`[START_NEXT_HAND] Forcing currentPlayer to 0 (no previous game)`);
      gameState.currentPlayer = 0;
    }
    
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
      const socket = player.socket;
      if (socket) {
        console.log(`[DEBUG] [TournamentCoordinator] Using stored socket ${socket.id}, emitting game-start`);

        socket.emit('game-start', {
          gameId,
          gameState,
          playerNumber: i,
          myUserId: player.id,  // Player's actual userId for index verification
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
    
    // Index-based accumulation - same approach as game-over modal
    for (let i = 0; i < tournament.players.length; i++) {
      const player = tournament.players[i];
      if (player) {
        // Scores from gameState (already computed by scoring system)
        player.cumulativeScore += gameState.scores[i] || 0;

        // Captures from gameState (already stored)
        const captures = gameState.players[i]?.captures || [];
        player.cumulativeCards += captures.length;
        player.cumulativeSpades += captures.filter(c => c.suit === '♠').length;
        
        player.handsPlayed++;
        
        console.log(`[TournamentCoordinator] ${player.name}: +${gameState.scores[i]} = ${player.cumulativeScore} (spades: +${captures.filter(c => c.suit === '♠').length}=${player.cumulativeSpades}, cards: +${captures.length}=${player.cumulativeCards})`);
      }
    }
    
    tournament.previousGameId = tournament.currentGameId;
    tournament.currentGameId = null;
    
    // Get active (non-eliminated) players
    const active = tournament.players.filter(p => !p.eliminated);
    console.log(`[HAND_END] Active players before elimination: ${active.length}`);
    
    // ELIMINATE AFTER EVERY HAND (if more than 1 player remains)
    if (active.length > 1) {
      // Sort by score (ascending) - lowest first
      // Tie-break: higher spades wins, higher cards wins, then deterministic ID
      const sorted = [...active].sort((a, b) => {
        if (a.cumulativeScore !== b.cumulativeScore) 
          return a.cumulativeScore - b.cumulativeScore;
        // Tie-break: more spades wins (keep player with more)
        if (a.cumulativeSpades !== b.cumulativeSpades)
          return b.cumulativeSpades - a.cumulativeSpades;
        if (a.cumulativeCards !== b.cumulativeCards)
          return b.cumulativeCards - a.cumulativeCards;
        // Deterministic tie-break
        return a.id.localeCompare(b.id);
      });

      const lowest = sorted[0];
      lowest.eliminated = true;
      console.log(`[HAND_END] Eliminated ${lowest.id} (score: ${lowest.cumulativeScore}, spades: ${lowest.cumulativeSpades}, cards: ${lowest.cumulativeCards})`);
    }

    // Check remaining players
    const remaining = tournament.players.filter(p => !p.eliminated);
    console.log(`[HAND_END] Remaining players: ${remaining.length}`);

    if (remaining.length > 1) {
      // More than 1 player - start next hand with delay
      console.log(`[HAND_END] Starting next hand with ${remaining.length} players...`);
      setTimeout(async () => {
        await this._startNextHand(gameState.tournamentId);
      }, 10000);
    } else if (remaining.length === 1) {
      // Only 1 player left - declare winner
      console.log(`[HAND_END] Tournament complete! Winner: ${remaining[0].id}`);
      // TODO: Call _endTournament or emit tournament-complete
      this._endTournament(gameState.tournamentId, remaining);
    } else {
      console.log(`[HAND_END] ERROR: No players remaining!`);
    }
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
      const socket = player.socket;
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
    const tournament = this.activeTournaments.get(gameState.tournamentId);
    
    console.log(`[HAND_END_CHECK] Game ${gameId}: round=${gameState.round}, gameOver=${gameState.gameOver}, tournamentFound=${!!tournament}, tournamentId=${gameState.tournamentId}`);
    
    if (!tournament) {
      console.error(`[TournamentCoordinator] FATAL: Tournament not found for game ${gameId}. This should not happen after first hand registration.`);
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
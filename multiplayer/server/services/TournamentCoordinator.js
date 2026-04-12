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
    
    return tournament;
  }

  /**
   * Start the next hand using GameFactory
   */
  async _startNextHand(tournamentId) {
    const tournament = this.activeTournaments.get(tournamentId);
    if (!tournament) {
      return;
    }
    
    // Skip if tournament is transitioning (countdown in progress)
    if (tournament.status === 'transitioning') {
      return;
    }
    
    const activePlayers = tournament.players.filter(p => !p.eliminated);
    const playerCount = activePlayers.length;
    
    // Keep players in original order - no reordering needed
    // Winner tag already set in handleHandComplete, will be used to set currentPlayer below
    
    const gameType = this._getGameTypeForPlayerCount(playerCount);
    
    const playerEntries = activePlayers.map(p => ({
      socket: p.socket,
      userId: p.id
    }));
    
    const result = this.matchmaking._createGameFromEntries(gameType, playerEntries);
    if (!result) {
      console.error(`[TournamentCoordinator] Failed to create game`);
      return;
    }

    const { gameId, gameState, players: resultPlayers } = result;
    
    // Ensure currentPlayer starts at 0 for the new game
    
    // Set currentPlayer to winner (tagged winner will be P1)
    // Use the winnerUserId tag set at end of previous hand
    const winnerUserId = tournament.winnerUserId;
    if (winnerUserId) {
      const winnerIdx = gameState.players.findIndex(p => p.userId === winnerUserId);
      if (winnerIdx !== -1) {
        gameState.currentPlayer = winnerIdx;
      }
    } else {
      console.warn(`[START_NEXT_HAND] No winner tag found, defaulting to index 0`);
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
    for (let i = 0; i < tournamentPlayers.length; i++) {
      const player = tournamentPlayers[i];
      const socket = player.socket;
      if (socket) {
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
    
    if (!tournament) {
      return;
    }
    
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
      }
    }
    
    tournament.previousGameId = tournament.currentGameId;
    tournament.currentGameId = null;
    
    // Get active (non-eliminated) players
    const active = tournament.players.filter(p => !p.eliminated);
    
    // Use TournamentQualification module for proper ranking with tie-breaking
    const { determineQualification } = require('./TournamentQualification');
    const qualResult = determineQualification(active, tournament.phase, tournament.config);
    
    // TournamentQualification ranks players: highest score = rank 0 (first), lowest = last
    // For elimination: remove the last player (lowest rank)
    if (active.length > 1) {
      const sortedByRank = qualResult.sortedPlayers; // Best first
      const lowest = sortedByRank[sortedByRank.length - 1]; // Last = lowest rank
      lowest.eliminated = true;
    }

    // Check remaining players
    const remaining = tournament.players.filter(p => !p.eliminated);
    
    // Tag winner for next hand - winner will be P1
    const winner = qualResult.sortedPlayers[0];
    tournament.winnerUserId = winner.id;
    console.log(`[HAND_END] Winner tagged: ${winner.id.substring(0, 8)}... (will start next hand as P1)`);

    // Determine if phase should transition based on player count
    let nextPhase = tournament.phase;
    if (qualResult.nextPhase && remaining.length > 1) {
      // When moving from 4→3 (QUALIFYING→SEMI_FINAL) or 3→2 (SEMI_FINAL→FINAL)
      nextPhase = qualResult.nextPhase;
      if (nextPhase !== tournament.phase) {
        tournament.phase = nextPhase;
      }
    }

    if (remaining.length > 1) {
      // More than 1 player - start next hand with delay
      setTimeout(async () => {
        await this._startNextHand(gameState.tournamentId);
      }, 10000);
    } else if (remaining.length === 1) {
      // Only 1 player left - declare winner
      this._endTournament(gameState.tournamentId, remaining);
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
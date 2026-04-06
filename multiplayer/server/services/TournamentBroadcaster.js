/**
 * TournamentBroadcaster
 * Handles game updates specifically for tournament games.
 * Keeps tournament logic isolated from the generic BroadcasterService.
 */

class TournamentBroadcaster {
  /**
   * Broadcast game update for tournament games.
   * Assumes gameState.players is already filtered and ordered (by startSemifinal/startFinalShowdown).
   * 
   * @param {number} gameId - Game ID
   * @param {Object} gameState - Current game state
   * @param {Object} gameManager - GameManager instance (for socket map access)
   * @param {Object} matchmakingService - Matchmaking service for getting sockets
   * @param {Object} io - Socket.io instance (optional)
   */
  static broadcastGameUpdate(gameId, gameState, gameManager, matchmakingService, io = null) {
    if (!gameState?.tournamentMode) {
      console.warn('[TournamentBroadcaster] Called for non-tournament game');
      return;
    }

    const mm = matchmakingService;
    const gameSockets = mm.getGameSockets(gameId, io || mm.io);
    
    if (gameSockets.length === 0) {
      console.log(`[TournamentBroadcaster] No sockets found for game ${gameId}`);
      return;
    }

    // Get socket->player mapping (should be already remapped by advanceFromQualificationReview)
    const socketMap = gameManager?.socketPlayerMap?.get(gameId);
    const stateToSend = JSON.parse(JSON.stringify(gameState));
    const qualifiedPlayers = gameState.qualifiedPlayers || [];
    const isTransition = ['SEMI_FINAL', 'FINAL_SHOWDOWN'].includes(gameState.tournamentPhase);

    // Debug: log tournament state (only active players)
    if (isTransition) {
      console.log(`\n🔍 TOURNAMENT BROADCAST — game ${gameId} | Phase: ${gameState.tournamentPhase}`);
      console.log(`Players in array: ${gameState.players?.length || 0}`);
      
      for (let i = 0; i < (gameState.players?.length || 0); i++) {
        const p = gameState.players[i];
        if (!p) continue;
        const status = gameState.playerStatuses?.[p.id] || 'N/A';
        const points = gameState.tournamentScores?.[p.id] || 0;
        const qual = qualifiedPlayers.includes(p.id);
        console.log(`  P${i}: ${p.id} | status: ${status} | pts: ${points} | qual: ${qual ? '✅' : '❌'}`);
      }
      
      console.log(`Qualified list: ${JSON.stringify(qualifiedPlayers)}`);
      console.log('----------------------------------------\n');
    }

    // Broadcast to each socket with correct playerNumber
    gameSockets.forEach(socket => {
      let playerNumber = null;
      
      if (socketMap && socketMap.size > 0) {
        const playerIndex = socketMap.get(socket.id);
        
        if (playerIndex !== undefined && playerIndex !== null) {
          const player = gameState.players?.[playerIndex];
          
          if (player && player.id) {
            const playerStatus = gameState.playerStatuses?.[player.id];
            
            if (playerStatus !== 'ELIMINATED') {
              playerNumber = playerIndex;
              if (isTransition) {
                console.log(`[TournamentBroadcaster] Socket ${socket.id.substr(0,8)} -> playerNumber: ${playerNumber} (${player.id})`);
              }
            } else {
              if (isTransition) {
                console.log(`[TournamentBroadcaster] Socket ${socket.id.substr(0,8)} -> ELIMINATED (${player.id})`);
              }
            }
          }
        }
      }
      
      socket.emit('game-update', {
        ...stateToSend,
        playerNumber
      });
    });
    
    if (isTransition) {
      console.log(`[TournamentBroadcaster] Broadcast complete for game ${gameId}`);
    }
  }

  /**
   * Broadcast round end event for tournament games
   * 
   * @param {number} gameId - Game ID
   * @param {Object} gameState - Current game state  
   * @param {Object} matchmakingService - Matchmaking service
   * @param {Object} roundData - Round summary data
   */
  static broadcastRoundEnd(gameId, gameState, matchmakingService, roundData) {
    if (!gameState?.tournamentMode) return;

    const mm = matchmakingService;
    const gameSockets = mm.getGameSockets(gameId, mm.io);
    
    if (gameSockets.length === 0) return;

    const stateToSend = JSON.parse(JSON.stringify(gameState));

    gameSockets.forEach(socket => {
      socket.emit('round-end', {
        ...roundData,
        tournamentPhase: gameState.tournamentPhase,
        tournamentRound: gameState.tournamentRound,
        qualifiedPlayers: gameState.qualifiedPlayers,
        playerStatuses: gameState.playerStatuses,
        tournamentScores: gameState.tournamentScores
      });
    });
  }

  /**
   * Broadcast game over event for tournament games
   * 
   * @param {number} gameId - Game ID
   * @param {Object} gameState - Final game state
   * @param {Object} matchmakingService - Matchmaking service
   * @param {Object} gameOverData - Game over summary data
   */
  static broadcastGameOver(gameId, gameState, matchmakingService, gameOverData) {
    if (!gameState?.tournamentMode) return;

    const mm = matchmakingService;
    const gameSockets = mm.getGameSockets(gameId, mm.io);
    
    if (gameSockets.length === 0) return;

    const stateToSend = JSON.parse(JSON.stringify(gameState));

    gameSockets.forEach(socket => {
      socket.emit('game-over', {
        ...gameOverData,
        tournamentMode: true,
        tournamentPhase: gameState.tournamentPhase,
        tournamentWinner: gameState.tournamentWinner,
        playerStatuses: gameState.playerStatuses,
        qualifiedPlayers: gameState.qualifiedPlayers,
        eliminationOrder: gameState.eliminationOrder
      });
    });
  }
}

module.exports = TournamentBroadcaster;
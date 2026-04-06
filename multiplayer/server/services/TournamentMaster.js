/**
 * TournamentMaster
 * Centralized tournament orchestration service
 * 
 * Clean implementation - all tournament logic in one place:
 * - Fresh game creation (no socket remapping)
 * - Socket migration to new game
 * - Transition broadcasting
 * 
 * GameCoordinatorService delegates ALL tournament handling to this service.
 */

const TOURNAMENT_DEBUG = process.env.TOURNAMENT_DEBUG === 'true';

class TournamentMaster {
  // ========== Utility Methods ==========
  
  static generateNewGameId() {
    return Date.now() + Math.floor(Math.random() * 10000);
  }

  // ========== State Validation ==========
  
  static isTournamentActive(gameState) {
    return gameState?.tournamentMode === 'knockout' || gameState?.tournamentMode === 'round_robin';
  }

  static getCurrentPhase(gameState) {
    return gameState?.tournamentPhase || null;
  }

  static getTournamentRound(gameState) {
    return gameState?.tournamentRound || 1;
  }

  // ========== Player Index Resolution ==========
  
  static ensureCorrectPlayerIndex(gameState, socketId, currentIndex, gameManager) {
    if (!gameState?.tournamentMode || !gameState.players) {
      return currentIndex;
    }
    
    const socketMap = gameManager.socketPlayerMap;
    if (!socketMap) return currentIndex;
    
    const gameId = [...socketMap.entries()].find(([gid, map]) => map?.get(socketId))?.[0];
    if (!gameId) return currentIndex;
    
    const playerId = socketMap.get(gameId)?.get(socketId);
    if (!playerId) return currentIndex;
    
    const newIndex = gameState.players.findIndex(p => p?.id === playerId);
    if (newIndex === -1) {
      return currentIndex;
    }
    
    return newIndex;
  }

  // ========== Round End Detection ==========
  
  static isRoundEnd(gameState) {
    const { roundEndTriggered, handsPlayed, maxHands } = gameState;
    if (roundEndTriggered) return true;
    if (maxHands && handsPlayed >= maxHands) return true;
    return false;
  }

  static isQualifyingRoundEnd(gameState) {
    return gameState?.tournamentPhase === 'QUALIFYING' && this.isRoundEnd(gameState);
  }

  static isSemifinalRoundEnd(gameState) {
    return gameState?.tournamentPhase === 'SEMI_FINAL' && this.isRoundEnd(gameState);
  }

  static isFinalShowdownRoundEnd(gameState) {
    return gameState?.tournamentPhase === 'FINAL_SHOWDOWN' && this.isRoundEnd(gameState);
  }

  // ========== Qualified Player Computation ==========
  
  static computeQualifiedPlayers(gameState, qualifyCount = 3) {
    const tournamentScores = gameState.tournamentScores || {};
    const playerStatuses = gameState.playerStatuses || {};
    const players = gameState.players || [];
    
    const activePlayers = [];
    for (const player of players) {
      if (player && player.id) {
        const status = playerStatuses[player.id];
        if (status !== 'ELIMINATED') {
          activePlayers.push({
            id: player.id,
            score: tournamentScores[player.id] || 0
          });
        }
      }
    }
    
    activePlayers.sort((a, b) => b.score - a.score);
    return activePlayers.slice(0, qualifyCount).map(p => p.id);
  }

  // ========== Main Entry Point ==========
  
  static handleRoundEnd(gameState, gameId, gameManager, matchmaking, broadcaster) {
    const phase = this.getCurrentPhase(gameState);
    
    if (TOURNAMENT_DEBUG) {
      console.log(`[TournamentMaster] handleRoundEnd: phase=${phase}`);
    }
    
    // Check if round actually ended
    if (!this.isRoundEnd(gameState)) {
      return { gameOver: false, newGameId: null, state: gameState, transition: null };
    }
    
    // Handle based on current phase
    switch (phase) {
      case 'QUALIFYING':
        return this.handleQualifyingEnd(gameState, gameId, gameManager, matchmaking, broadcaster);
      case 'SEMI_FINAL':
        return this.handleSemifinalEnd(gameState, gameId, gameManager, matchmaking, broadcaster);
      case 'FINAL_SHOWDOWN':
        return this.handleFinalShowdownEnd(gameState, gameId, gameManager);
      default:
        return { gameOver: false, newGameId: null, state: gameState, transition: null };
    }
  }

  // ========== Phase Handlers ==========
  
  static handleQualifyingEnd(gameState, gameId, gameManager, matchmaking, broadcaster) {
    if (TOURNAMENT_DEBUG) {
      console.log(`[TournamentMaster] Handling qualifying end for game ${gameId}`);
    }
    
    const qualified = this.computeQualifiedPlayers(gameState, 3);
    const { newGameId, newState } = this.createFreshGameState(gameState, qualified, 'SEMI_FINAL');
    
    // Migrate sockets to new game
    this.migrateSockets(gameId, newGameId, qualified, gameManager, matchmaking);
    
    // Broadcast transition event
    this.broadcastTransition(gameId, newGameId, 'SEMI_FINAL', qualified, matchmaking, broadcaster);
    
    // Broadcast new game start
    broadcaster.broadcastToGame(newGameId, 'game-start', newState, matchmaking);
    
    // Save new game
    gameManager.saveGameState(newGameId, newState);
    
    if (TOURNAMENT_DEBUG) {
      console.log(`[TournamentMaster] Transitioned to semifinal: ${newGameId}`);
    }
    
    return {
      gameOver: false,
      newGameId: newGameId,
      state: newState,
      oldGameId: gameId,
      transition: {
        type: 'PHASE_TRANSITION',
        nextPhase: 'SEMI_FINAL',
        qualifiedPlayers: qualified
      }
    };
  }

  static handleSemifinalEnd(gameState, gameId, gameManager, matchmaking, broadcaster) {
    if (TOURNAMENT_DEBUG) {
      console.log(`[TournamentMaster] Handling semifinal end for game ${gameId}`);
    }
    
    const qualified = this.computeQualifiedPlayers(gameState, 2);
    const { newGameId, newState } = this.createFreshGameState(gameState, qualified, 'FINAL_SHOWDOWN');
    
    this.migrateSockets(gameId, newGameId, qualified, gameManager, matchmaking);
    this.broadcastTransition(gameId, newGameId, 'FINAL_SHOWDOWN', qualified, matchmaking, broadcaster);
    broadcaster.broadcastToGame(newGameId, 'game-start', newState, matchmaking);
    gameManager.saveGameState(newGameId, newState);
    
    return {
      gameOver: false,
      newGameId: newGameId,
      state: newState,
      oldGameId: gameId,
      transition: {
        type: 'PHASE_TRANSITION',
        nextPhase: 'FINAL_SHOWDOWN',
        qualifiedPlayers: qualified
      }
    };
  }

  static handleFinalShowdownEnd(gameState, gameId, gameManager) {
    if (TOURNAMENT_DEBUG) {
      console.log(`[TournamentMaster] Handling final showdown end for game ${gameId}`);
    }
    
    const winner = this.computeQualifiedPlayers(gameState, 1)[0];
    
    if (TOURNAMENT_DEBUG) {
      console.log(`[TournamentMaster] Tournament winner: ${winner}`);
    }
    
    return {
      gameOver: true,
      state: gameState,
      winner: winner,
      transition: null
    };
  }

  // ========== Fresh Game Creation (No Remapping) ==========
  
  static createFreshGameState(oldState, qualifiedPlayerIds, nextPhase) {
    const newGameId = this.generateNewGameId();
    
    const newState = {
      ...oldState,
      gameId: newGameId,
      tournamentPhase: nextPhase,
      playerCount: qualifiedPlayerIds.length,
      qualifiedPlayers: qualifiedPlayerIds,
      currentPlayer: 0,
      round: 1,
      roundEndTriggered: false,
      handsPlayed: 0,
      maxHands: nextPhase === 'SEMI_FINAL' ? 5 : 3,
      tableCards: [],
      deck: [],
      roundPlayers: {},
      scores: qualifiedPlayerIds.map(() => 0),
      tournamentScores: { ...oldState.tournamentScores }
    };
    
    newState.players = oldState.players
      .filter(p => qualifiedPlayerIds.includes(p.id))
      .map((p, idx) => ({
        ...p,
        index: idx,
        hand: [],
        captures: [],
        score: 0
      }));
    
    this.dealCardsForNewGame(newState);
    
    if (TOURNAMENT_DEBUG) {
      console.log(`[TournamentMaster] Created fresh game ${newGameId} for phase ${nextPhase}`);
      console.log(`[TournamentMaster] Players:`, newState.players.map(p => p.id));
    }
    
    return { newGameId, newState };
  }

  static dealCardsForNewGame(state) {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = [];
    
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank });
      }
    }
    
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    state.deck = deck;
    state.tableCards = [];
    
    for (const player of state.players) {
      player.hand = deck.splice(0, 4);
    }
  }

  // ========== Socket Migration ==========
  
  static migrateSockets(oldGameId, newGameId, qualifiedPlayerIds, gameManager, matchmaking) {
    const oldSocketMap = gameManager.socketPlayerMap.get(oldGameId);
    if (!oldSocketMap) {
      console.warn(`[TournamentMaster] No sockets found for game ${oldGameId}`);
      return;
    }
    
    const newSocketMap = new Map();
    const oldGameState = gameManager.getGameState(oldGameId);
    
    for (const [socketId, oldIndex] of oldSocketMap.entries()) {
      const oldPlayer = oldGameState?.players?.[oldIndex];
      if (!oldPlayer) continue;
      
      if (qualifiedPlayerIds.includes(oldPlayer.id)) {
        const newIndex = qualifiedPlayerIds.indexOf(oldPlayer.id);
        newSocketMap.set(socketId, newIndex);
        
        const socketEntry = matchmaking.socketRegistry?.get(socketId);
        if (socketEntry) {
          matchmaking.socketRegistry.set(socketId, newGameId, socketEntry.gameType, socketEntry.userId);
        }
      }
    }
    
    gameManager.socketPlayerMap.set(newGameId, newSocketMap);
    gameManager.socketPlayerMap.delete(oldGameId);
    
    if (TOURNAMENT_DEBUG) {
      console.log(`[TournamentMaster] Migrated ${newSocketMap.size} sockets from ${oldGameId} to ${newGameId}`);
    }
  }

  // ========== Transition Broadcasting ==========
  
  static broadcastTransition(oldGameId, newGameId, nextPhase, qualifiedPlayers, matchmaking, broadcaster) {
    const payload = {
      type: 'TOURNAMENT_TRANSITION',
      gameOver: true,
      nextGameId: newGameId,
      nextPhase: nextPhase,
      qualifiedPlayers: qualifiedPlayers,
      message: `Moving to ${nextPhase} with ${qualifiedPlayers.length} players`
    };
    
    broadcaster.broadcastToGame(oldGameId, 'tournament-transition', payload, matchmaking);
    
    if (TOURNAMENT_DEBUG) {
      console.log(`[TournamentMaster] Broadcast transition to ${oldGameId}: ${nextPhase}`);
    }
  }

  // ========== Debug Info ==========
  
  static getDebugInfo(gameState) {
    const qualified = this.computeQualifiedPlayers(gameState, 3);
    const scores = gameState.tournamentScores || {};
    
    let info = `[TournamentMaster] Debug:\n`;
    info += `  Phase: ${gameState.tournamentPhase}\n`;
    info += `  Round: ${gameState.tournamentRound}\n`;
    info += `  Qualified: ${JSON.stringify(qualified)}\n`;
    info += `  Scores: ${JSON.stringify(scores)}\n`;
    
    return info;
  }
}

module.exports = TournamentMaster;

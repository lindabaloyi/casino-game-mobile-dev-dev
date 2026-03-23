/**
 * GamePersistenceService
 * Handles MongoDB persistence and player stats updates.
 * Separated from game coordination to improve maintainability and testability.
 */

const GameState = require('../models/GameState');
const GameStats = require('../models/GameStats');
const scoring = require('../game/scoring');

class GamePersistenceService {
  /**
   * Save game state to MongoDB
   */
  async saveGame(gameId, gameState, isPartyGame) {
    try {
      const playerCount = gameState.playerCount || 2;
      const gameMode = isPartyGame ? 'party' : (playerCount === 4 ? 'fourPlayer' : 'twoPlayer');
      
      // Extract player info
      const players = gameState.players.map((p, index) => ({
        playerId: `player${index}`,
        name: p.name || `Player ${index + 1}`,
        userId: p.userId || null
      }));

      await GameState.save({
        roomId: gameId,
        gameState: gameState,
        players,
        gameMode,
        round: gameState.round || 1,
        isActive: false,
        actions: []
      });
      
      console.log(`[Persistence] ✅ Game saved to MongoDB: ${gameId}`);
      
      // Update player stats
      await this.updatePlayerStats(gameState, gameMode);
    } catch (error) {
      console.error(`[Persistence] ❌ Failed to save game to MongoDB:`, error.message);
    }
  }

  /**
   * Update player stats after game ends
   */
  async updatePlayerStats(gameState, gameMode) {
    try {
      const playerCount = gameState.playerCount || 2;
      const scores = gameState.scores || [];
      
      if (scores.length < 2) return;
      
      const maxScore = Math.max(...scores);
      const winners = scores.filter(s => s === maxScore).length;
      const isDraw = winners > 1;

      for (let i = 0; i < playerCount; i++) {
        const player = gameState.players[i];
        if (!player?.userId) continue; // Skip CPU players
        
        const won = !isDraw && scores[i] === maxScore;
        const lost = !isDraw && scores[i] < maxScore;
        
        // Calculate game-specific stats
        const captures = player.captures || [];
        
        await GameStats.updateAfterGame(player.userId.toString(), {
          won,
          lost,
          draw: isDraw,
          score: scores[i] || 0,
          cardsCaptured: captures.length,
          buildsCreated: 0,
          buildsStolen: 0,
          trailsMade: 0,
          perfectRound: false,
          gameMode
        });
      }
      
      console.log(`[Persistence] ✅ Player stats updated in MongoDB`);
    } catch (error) {
      console.error(`[Persistence] ❌ Failed to update player stats:`, error.message);
    }
  }
}

module.exports = GamePersistenceService;

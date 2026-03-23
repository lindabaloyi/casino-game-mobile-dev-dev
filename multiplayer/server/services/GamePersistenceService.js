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

      console.log(`[Persistence] 📊 Game ending - scores: ${JSON.stringify(scores)}, maxScore: ${maxScore}, isDraw: ${isDraw}`);
      
      console.log(`[Persistence] 📊 Players in gameState:`, gameState.players.map((p, i) => ({
        index: i,
        name: p.name,
        userId: p.userId,
        userIdType: typeof p.userId,
        hasUserId: !!p.userId
      })));
      
      for (let i = 0; i < playerCount; i++) {
        const player = gameState.players[i];
        console.log(`[Persistence] 📊 Processing player ${i}:`, {
          name: player.name,
          userId: player.userId,
          userIdType: typeof player.userId,
          hasUserId: !!player.userId
        });
        
        if (!player?.userId) {
          console.log(`[Persistence] ⚠️ Player ${i} (${player?.name || 'unknown'}) has NO userId - skipping (likely CPU)`);
          continue; // Skip CPU players
        }
        
        const won = !isDraw && scores[i] === maxScore;
        const lost = !isDraw && scores[i] < maxScore;
        
        console.log(`[Persistence] 📊 Player ${i} (${player.name}): won=${won}, lost=${lost}, score=${scores[i]}`);
        
        // Calculate game-specific stats
        const captures = player.captures || [];
        
        // Get current stats before update
        let currentStats;
        try {
          currentStats = await GameStats.findByUserId(player.userId.toString());
        } catch (e) {
          console.log(`[Persistence] ⚠️ Could not fetch current stats for ${player.userId}:`, e.message);
        }
        
        console.log(`[Persistence] 📊 Stats BEFORE update for ${player.name}:`, {
          totalGames: currentStats?.totalGames || 0,
          wins: currentStats?.wins || 0,
          losses: currentStats?.losses || 0
        });
        
        try {
          const updatedStats = await GameStats.updateAfterGame(player.userId.toString(), {
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
          
          console.log(`[Persistence] 📊 Stats AFTER update for ${player.name}:`, {
            totalGames: updatedStats?.totalGames || 0,
            wins: updatedStats?.wins || 0,
            losses: updatedStats?.losses || 0
          });
        } catch (updateError) {
          console.error(`[Persistence] ❌ FAILED to update stats for ${player.name}:`, updateError.message);
        }
      }
      
      console.log(`[Persistence] ✅ Player stats updated in MongoDB`);
    } catch (error) {
      console.error(`[Persistence] ❌ Failed to update player stats:`, error.message);
    }
  }
}

module.exports = GamePersistenceService;

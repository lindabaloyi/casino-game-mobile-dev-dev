/**
 * GamePersistenceService
 * Handles MongoDB persistence and player stats updates.
 * Separated from game coordination to improve maintainability and testability.
 */

const GameState = require('../models/GameState');
const GameStats = require('../models/GameStats');
const scoring = require('../../../shared/game/scoring');

class GamePersistenceService {
  /**
   * Save game state to MongoDB
   */
  async saveGame(gameId, gameState, isPartyGame) {
    try {
      const gameMode = this.getGameModeFromState(gameState);
      
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
      
      for (let i = 0; i < playerCount; i++) {
        const player = gameState.players[i];
        
        if (!player?.userId) {
          console.log(`[Persistence] ⚠️ Player ${i} (${player?.name || 'unknown'}) has NO userId - skipping (likely CPU)`);
          continue; // Skip CPU players
        }
        
        const won = !isDraw && scores[i] === maxScore;
        const lost = !isDraw && scores[i] < maxScore;
        const playerScore = scores[i] || 0;
        
        console.log(`[Persistence] 📊 Player ${i} (${player.name}): won=${won}, lost=${lost}, score=${playerScore}`);
        
        // Calculate detailed stats from captures
        const captures = player.captures || [];
        const scoreBreakdown = scoring.getScoreBreakdown(captures);

        console.log(`[Persistence] 📊 Score breakdown for ${player.name}:`, {
          aceCount: scoreBreakdown.aceCount,
          tenDiamondCount: scoreBreakdown.tenDiamondCount,
          twoSpadeCount: scoreBreakdown.twoSpadeCount,
          spadeCount: scoreBreakdown.spadeCount,
          spadeBonus: scoreBreakdown.spadeBonus,
          cardCountBonus: scoreBreakdown.cardCountBonus,
          totalScore: scoreBreakdown.totalScore
        });

        try {
          const updatedStats = await GameStats.updateAfterGame(player.userId.toString(), {
            won,
            lost,
            draw: isDraw,
            score: playerScore,
            cardsCaptured: captures.length,
            // Point retention stats
            pointsKept: playerScore,
            motorAchievementCount: playerScore >= 11 ? 1 : 0,
          }, gameMode);
          
          console.log(`[Persistence] 📊 Stats AFTER update for ${player.name}:`, {
            totalGames: updatedStats?.totalGames || 0,
            wins: updatedStats?.wins || 0,
            losses: updatedStats?.losses || 0,
            totalPointsKept: updatedStats?.totalPointsKept || 0,
            motorAchievementCount: updatedStats?.motorAchievementCount || 0
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

  /**
   * Get game mode from game state
   */
  getGameModeFromState(state) {
    // Check tournament mode first
    if (state.tournamentMode) return 'tournament';
    
    const playerCount = state.playerCount;
    const isParty = playerCount === 4 && state.players?.some(p => p.team);
    if (isParty) return 'party';
    if (playerCount === 2) return 'twoHands';
    if (playerCount === 3) return 'threeHands';
    return 'fourHands';
  }
}

module.exports = GamePersistenceService;

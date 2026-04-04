/**
 * broadcast.js
 * Helper functions for broadcasting waiting states and game starts.
 */

const PlayerProfile = require('../../models/PlayerProfile');

function createBroadcastHelpers(unifiedMatchmaking, io) {
  async function broadcastWaiting(gameType) {
    const count = unifiedMatchmaking.getWaitingCount(gameType);
    console.log(`[UnifiedMatchmaking] Broadcasting ${gameType}-waiting: ${count} players`);

    const queue = unifiedMatchmaking.getWaitingQueue(gameType);
    const userIds = queue.map(entry => entry.userId).filter(Boolean);
    const players = await PlayerProfile.getPlayerInfos(userIds);

    // CRITICAL: Map players to match queue order to prevent slot replacement
    const orderedPlayers = queue.map((entry, index) => {
      const playerInfo = players.find(p => p.userId === entry.userId);
      if (playerInfo) return playerInfo;
      // Fallback for guest players
      return {
        userId: entry.userId || `guest-${index + 1}`,
        username: entry.userId ? 'Unknown' : `Player ${index + 1}`,
        avatar: 'lion',
      };
    });

    queue.forEach(entry => {
      entry.socket.emit(`${gameType}-waiting`, {
        playersJoined: count,
        players: orderedPlayers,
      });
    });
  }

  // Legacy aliases for backward compatibility
  async function broadcastTwoHandsWaiting() { return broadcastWaiting('two-hands'); }
  async function broadcastPartyWaiting() { return broadcastWaiting('party'); }
  async function broadcastThreeHandsWaiting() { return broadcastWaiting('three-hands'); }
  async function broadcastFourHandsWaiting() { return broadcastWaiting('four-hands'); }
  async function broadcastFreeForAllWaiting() { return broadcastWaiting('freeforall'); }
  async function broadcastTournamentWaiting() { return broadcastWaiting('tournament'); }

  return {
    broadcastWaiting,
    broadcastTwoHandsWaiting,
    broadcastPartyWaiting,
    broadcastThreeHandsWaiting,
    broadcastFourHandsWaiting,
    broadcastFreeForAllWaiting,
    broadcastTournamentWaiting,
  };
}

module.exports = { createBroadcastHelpers };
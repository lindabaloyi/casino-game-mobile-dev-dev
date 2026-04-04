/**
 * broadcast.js
 * Helper functions for broadcasting waiting states and game starts.
 */

const PlayerProfile = require('../../models/PlayerProfile');

function createBroadcastHelpers(unifiedMatchmaking, io) {
  // Dedicated broadcast function for two-hands mode
  async function broadcastTwoHandsWaiting() {
    const gameType = 'two-hands';
    const count = unifiedMatchmaking.getWaitingCount(gameType);
    console.log(`[UnifiedMatchmaking] Broadcasting ${gameType}-waiting: ${count} players`);

    const queue = unifiedMatchmaking.getWaitingQueue(gameType);
    const userIds = queue.map(entry => entry.userId).filter(Boolean);
    const players = await PlayerProfile.getPlayerInfos(userIds);

    // Map players to match queue order to prevent slot replacement
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

  // Dedicated broadcast function for party mode
  async function broadcastPartyWaiting() {
    const gameType = 'party';
    const count = unifiedMatchmaking.getWaitingCount(gameType);
    console.log(`[UnifiedMatchmaking] Broadcasting ${gameType}-waiting: ${count} players`);

    const queue = unifiedMatchmaking.getWaitingQueue(gameType);
    const userIds = queue.map(entry => entry.userId).filter(Boolean);
    const players = await PlayerProfile.getPlayerInfos(userIds);

    // Map players to match queue order to prevent slot replacement
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

  // Dedicated broadcast function for three-hands mode
  async function broadcastThreeHandsWaiting() {
    const gameType = 'three-hands';
    const count = unifiedMatchmaking.getWaitingCount(gameType);
    console.log(`[UnifiedMatchmaking] Broadcasting ${gameType}-waiting: ${count} players`);

    const queue = unifiedMatchmaking.getWaitingQueue(gameType);
    const userIds = queue.map(entry => entry.userId).filter(Boolean);
    const players = await PlayerProfile.getPlayerInfos(userIds);

    // Map players to match queue order to prevent slot replacement
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

  // Dedicated broadcast function for four-hands mode
  async function broadcastFourHandsWaiting() {
    const gameType = 'four-hands';
    const count = unifiedMatchmaking.getWaitingCount(gameType);
    console.log(`[UnifiedMatchmaking] Broadcasting ${gameType}-waiting: ${count} players`);

    const queue = unifiedMatchmaking.getWaitingQueue(gameType);
    const userIds = queue.map(entry => entry.userId).filter(Boolean);
    const players = await PlayerProfile.getPlayerInfos(userIds);

    // Map players to match queue order to prevent slot replacement
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

  // Dedicated broadcast function for free-for-all mode
  async function broadcastFreeForAllWaiting() {
    const gameType = 'freeforall';
    const count = unifiedMatchmaking.getWaitingCount(gameType);
    console.log(`[UnifiedMatchmaking] Broadcasting ${gameType}-waiting: ${count} players`);

    const queue = unifiedMatchmaking.getWaitingQueue(gameType);
    const userIds = queue.map(entry => entry.userId).filter(Boolean);
    const players = await PlayerProfile.getPlayerInfos(userIds);

    // Map players to match queue order to prevent slot replacement
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

  // Dedicated broadcast function for tournament mode
  async function broadcastTournamentWaiting() {
    const gameType = 'tournament';
    const count = unifiedMatchmaking.getWaitingCount(gameType);
    console.log(`[UnifiedMatchmaking] Broadcasting ${gameType}-waiting: ${count} players`);

    const queue = unifiedMatchmaking.getWaitingQueue(gameType);
    const userIds = queue.map(entry => entry.userId).filter(Boolean);
    const players = await PlayerProfile.getPlayerInfos(userIds);

    // Map players to match queue order to prevent slot replacement
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

  return {
    broadcastTwoHandsWaiting,
    broadcastPartyWaiting,
    broadcastThreeHandsWaiting,
    broadcastFourHandsWaiting,
    broadcastFreeForAllWaiting,
    broadcastTournamentWaiting,
  };
}

module.exports = { createBroadcastHelpers };
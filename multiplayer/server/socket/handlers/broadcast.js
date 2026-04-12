/**
 * broadcast.js
 * Helper functions for broadcasting waiting states and game starts.
 */

const PlayerProfile = require('../../models/PlayerProfile');

function createBroadcastHelpers(unifiedMatchmaking, io) {
  const queueManager = unifiedMatchmaking.queueManager;

  async function broadcastTwoHandsWaiting() {
    const count = unifiedMatchmaking.getWaitingCount('two-hands');
    const roomCode = unifiedMatchmaking.getQueueRoomCode('two-hands');
    
    const queue = queueManager.waitingQueues['two-hands'];
    if (!queue || queue.length === 0) return;
    
    const userIds = queue.map(entry => entry.userId).filter(Boolean);
    const players = await PlayerProfile.getPlayerInfos(userIds);

    // Map players to match queue order to prevent slot replacement
    const orderedPlayers = queue.map((entry, index) => {
      const playerInfo = players.find(p => p.userId === entry.userId);
      if (playerInfo) return playerInfo;
      // Fallback for guest players - use the userId as username if available
      return {
        userId: entry.userId || `guest-${index + 1}`,
        username: entry.userId || `Player ${index + 1}`,
        avatar: 'lion'
      };
    });
    
    queue.forEach(entry => {
      entry.socket.emit('duel-waiting', { 
        playersJoined: count,
        players: orderedPlayers,
        roomCode: roomCode,
      });
    });
  }

  async function broadcastPartyWaiting() {
    const count = unifiedMatchmaking.getWaitingCount('party');
    const roomCode = unifiedMatchmaking.getQueueRoomCode('party');
    
    
    const queue = queueManager.waitingQueues['party'];
    if (!queue || queue.length === 0) return;
    
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
      entry.socket.emit('party-waiting', { 
        playersJoined: count,
        players: orderedPlayers,
        roomCode: roomCode,
      });
    });
  }

  async function broadcastThreeHandsWaiting() {
    const count = unifiedMatchmaking.getWaitingCount('three-hands');
    const roomCode = unifiedMatchmaking.getQueueRoomCode('three-hands');

    
    const queue = queueManager.waitingQueues['freeforall'];
    if (!queue || queue.length === 0) return;
    
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
      entry.socket.emit('freeforall-waiting', { 
        playersJoined: count,
        players: orderedPlayers,
        roomCode: roomCode,
      });
    });
  }

  async function broadcastFourHandsWaiting() {
    const count = unifiedMatchmaking.getWaitingCount('four-hands');
    const roomCode = unifiedMatchmaking.getQueueRoomCode('four-hands');
    
    const queue = queueManager.waitingQueues['four-hands'];
    const userIds = queue.map(entry => entry.userId).filter(Boolean);
    const players = await PlayerProfile.getPlayerInfos(userIds);
    
    const orderedPlayers = queue.map((entry, index) => {
      const playerInfo = players.find(p => p.userId === entry.userId);
      if (playerInfo) return playerInfo;
      return {
        userId: entry.userId || `guest-${index + 1}`,
        username: entry.userId ? 'Unknown' : `Player ${index + 1}`,
        avatar: 'lion',
      };
    });
    
    queue.forEach(entry => {
      if (count === 4) {
        entry.socket.emit('four-hands-ready', {
          playerCount: 4,
          message: '4 players ready - starting game!'
        });
      } else {
        entry.socket.emit('four-hands-waiting', { 
          playersJoined: count,
          players: orderedPlayers,
          roomCode: roomCode,
        });
      }
    });
  }

  async function broadcastFreeForAllWaiting() {
    const count = unifiedMatchmaking.getWaitingCount('freeforall');
    const roomCode = unifiedMatchmaking.getQueueRoomCode('freeforall');
    
    const queue = queueManager.waitingQueues['freeforall'];
    if (!queue || queue.length === 0) return;
    
    const userIds = queue.map(entry => entry.userId).filter(Boolean);
    const players = await PlayerProfile.getPlayerInfos(userIds);
    
    const orderedPlayers = queue.map((entry, index) => {
      const playerInfo = players.find(p => p.userId === entry.userId);
      if (playerInfo) return playerInfo;
      return {
        userId: entry.userId || `guest-${index + 1}`,
        username: entry.userId ? 'Unknown' : `Player ${index + 1}`,
        avatar: 'lion',
      };
    });
    
    queue.forEach(entry => {
      if (count === 4) {
        entry.socket.emit('freeforall-ready', {
          playerCount: 4,
          message: '4 players ready - starting game!'
        });
      } else {
        entry.socket.emit('freeforall-waiting', { 
          playersJoined: count,
          players: orderedPlayers,
          roomCode: roomCode,
        });
      }
    });
  }

  async function broadcastTournamentWaiting() {
    const count = unifiedMatchmaking.getWaitingCount('tournament');
    const roomCode = unifiedMatchmaking.getQueueRoomCode('tournament');
    
    const queue = queueManager.waitingQueues['four-hands'];
    if (!queue || queue.length === 0) return;
    
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
      // If 4 players, emit tournament-ready instead
      if (count === 4) {
        entry.socket.emit('tournament-ready', {
          playerCount: 4,
          message: '4 players ready - starting tournament!'
        });
      } else {
        entry.socket.emit('tournament-waiting', { 
          playersJoined: count,
          players: orderedPlayers,
          roomCode: roomCode,
        });
      }
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
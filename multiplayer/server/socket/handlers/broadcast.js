/**
 * broadcast.js
 * Helper functions for broadcasting waiting states and game starts.
 */

const PlayerProfile = require('../../models/PlayerProfile');

function createBroadcastHelpers(unifiedMatchmaking, io) {
  async function broadcastTwoHandsWaiting() {
    const count = unifiedMatchmaking.getWaitingCount('two-hands');
    const roomCode = unifiedMatchmaking.getQueueRoomCode('two-hands');
    console.log(`[UnifiedMatchmaking] Broadcasting two-hands-waiting: ${count} players, roomCode=${roomCode}`);
    
    const queue = unifiedMatchmaking.waitingQueues['two-hands'];
    const userIds = queue.map(entry => entry.userId).filter(Boolean);
    console.log(`[UnifiedMatchmaking] two-hands queue userIds:`, userIds);
    const players = await PlayerProfile.getPlayerInfos(userIds);
    console.log(`[UnifiedMatchmaking] two-hands playerInfos:`, JSON.stringify(players));
    
// CRITICAL: Map players to match queue order to prevent slot replacement
    const orderedPlayers = queue.map((entry, index) => {
      const playerInfo = players.find(p => p.userId === entry.userId);
      if (playerInfo) return playerInfo;
      // Fallback for guest players - use the userId as username if available
      return {
        userId: entry.userId || `guest-${index + 1}`,
        username: entry.userId || `Player ${index + 1}`,
        avatar: 'lion',
        displayName: entry.userId || `Player ${index + 1}`
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
    console.log(`[UnifiedMatchmaking] Broadcasting party-waiting: ${count} players, roomCode=${roomCode}`);
    
    const queue = unifiedMatchmaking.waitingQueues.party;
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
        displayName: entry.userId ? 'Unknown' : `Player ${index + 1}`
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
    console.log(`[UnifiedMatchmaking] Broadcasting three-hands-waiting: ${count} players, roomCode=${roomCode}`);
    
    const queue = unifiedMatchmaking.waitingQueues['three-hands'];
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
        displayName: entry.userId ? 'Unknown' : `Player ${index + 1}`
      };
    });
    
    queue.forEach(entry => {
      entry.socket.emit('three-hands-waiting', { 
        playersJoined: count,
        players: orderedPlayers,
        roomCode: roomCode,
      });
    });
  }

  async function broadcastFourHandsWaiting() {
    const count = unifiedMatchmaking.getWaitingCount('four-hands');
    const roomCode = unifiedMatchmaking.getQueueRoomCode('four-hands');
    console.log(`[UnifiedMatchmaking] Broadcasting four-hands-waiting: ${count} players, roomCode=${roomCode}`);
    
    const queue = unifiedMatchmaking.waitingQueues['four-hands'];
    const userIds = queue.map(entry => entry.userId).filter(Boolean);
    const players = await PlayerProfile.getPlayerInfos(userIds);
    
    const allPlayers = queue.map((entry, index) => {
      const playerInfo = players.find(p => p.userId === entry.userId);
      if (playerInfo) return playerInfo;
      return {
        userId: entry.userId || `guest-${index + 1}`,
        username: entry.userId ? 'Unknown' : `Player ${index + 1}`,
        avatar: 'lion',
        displayName: entry.userId ? 'Unknown' : `Player ${index + 1}`
      };
    });
    
    queue.forEach(entry => {
      entry.socket.emit('four-hands-waiting', { 
        playersJoined: count,
        players: allPlayers,
        roomCode: roomCode,
      });
    });
  }

  async function broadcastFreeForAllWaiting() {
    const count = unifiedMatchmaking.getWaitingCount('freeforall');
    const roomCode = unifiedMatchmaking.getQueueRoomCode('freeforall');
    console.log(`[UnifiedMatchmaking] Broadcasting free-for-all-waiting: ${count} players, roomCode=${roomCode}`);
    
    const queue = unifiedMatchmaking.waitingQueues.freeforall;
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
        displayName: entry.userId ? 'Unknown' : `Player ${index + 1}`
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

  async function broadcastTournamentWaiting() {
    const count = unifiedMatchmaking.getWaitingCount('tournament');
    const roomCode = unifiedMatchmaking.getQueueRoomCode('tournament');
    console.log(`[UnifiedMatchmaking] Broadcasting tournament-waiting: ${count} players, roomCode=${roomCode}`);
    
    if (!unifiedMatchmaking.waitingQueues.tournament) {
      unifiedMatchmaking.waitingQueues.tournament = [];
    }
    
    const queue = unifiedMatchmaking.waitingQueues.tournament;
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
        displayName: entry.userId ? 'Unknown' : `Player ${index + 1}`
      };
    });
    
    queue.forEach(entry => {
      entry.socket.emit('tournament-waiting', { 
        playersJoined: count,
        players: orderedPlayers,
        roomCode: roomCode,
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
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
      // Fallback for guest players - use empty username, let client handle display
      return {
        userId: entry.userId || `guest-${index + 1}`,
        username: '',
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
        username: entry.userId ? '' : '',
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
    console.log('[Broadcast] broadcastThreeHandsWaiting called, count:', count);
    
    const queue = queueManager.waitingQueues['three-hands'];
    if (!queue || queue.length === 0) {
      console.log('[Broadcast] no queue for three-hands, returning');
      return;
    }
    
    const userIds = queue.map(entry => entry.userId).filter(Boolean);
    const players = await PlayerProfile.getPlayerInfos(userIds);
    console.log('[Broadcast] got player infos, count:', players?.length);
    
    // CRITICAL: Map players to match queue order to prevent slot replacement
    const orderedPlayers = queue.map((entry, index) => {
      const playerInfo = players.find(p => p.userId === entry.userId);
      if (playerInfo) return playerInfo;
      // Fallback for guest players
      return {
        userId: entry.userId || `guest-${index + 1}`,
        username: entry.userId ? '' : '',
        avatar: 'lion',

      };
    });
    
    console.log('[Broadcast] emitting three-hands-waiting, players:', orderedPlayers.length);
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
    
    const queue = queueManager.waitingQueues['four-hands'];
    const userIds = queue.map(entry => entry.userId).filter(Boolean);
    const players = await PlayerProfile.getPlayerInfos(userIds);
    
    const orderedPlayers = queue.map((entry, index) => {
      const playerInfo = players.find(p => p.userId === entry.userId);
      if (playerInfo) return playerInfo;
      return {
        userId: entry.userId || `guest-${index + 1}`,
        username: entry.userId ? '' : '',
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
        username: entry.userId ? '' : '',
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
        username: entry.userId ? '' : '',
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

  async function broadcastQueueState(gameType) {
    console.log('[Broadcast] broadcastQueueState called, gameType:', gameType);
    const queue = queueManager.waitingQueues[gameType];
    if (!queue || queue.length === 0) {
      console.log('[Broadcast] queue is empty for', gameType, ', returning');
      return;
    }

    // Get required players from queue manager config
    const playersNeeded = queueManager.getPlayersNeeded(gameType);
    const requiredPlayers = queue.length + playersNeeded;
    console.log('[Broadcast] queue length:', queue.length, 'required:', requiredPlayers);

    const userIds = queue.map(entry => entry.userId).filter(Boolean);
    const players = await PlayerProfile.getPlayerInfos(userIds);

    const orderedPlayers = queue.map((entry, index) => {
      const playerInfo = players.find(p => p.userId === entry.userId);
      return playerInfo || {
        userId: entry.userId || `guest-${index + 1}`,
        username: entry.userId ? '' : '',
        avatar: 'lion'
      };
    });

    const payload = {
      gameType,
      requiredPlayers,
      players: orderedPlayers,
      roomCode: unifiedMatchmaking.getQueueRoomCode(gameType)
    };

    console.log('[Broadcast] emitting queue-state-update, players:', orderedPlayers.length);
    // Use io.to() for simultaneous broadcast to ALL sockets in queue
    // This ensures ALL clients receive the update at the same time
    queue.forEach(entry => {
      entry.socket.emit('queue-state-update', payload);
    });
    
    console.log(`[Broadcast] queue-state-update sent to ${queue.length} players for ${gameType}`);
  }

  return {
    broadcastTwoHandsWaiting,
    broadcastPartyWaiting,
    broadcastThreeHandsWaiting,
    broadcastFourHandsWaiting,
    broadcastFreeForAllWaiting,
    broadcastTournamentWaiting,
    broadcastQueueState,
  };
}

module.exports = { createBroadcastHelpers };
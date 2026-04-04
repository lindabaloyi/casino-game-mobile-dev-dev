const SocketRegistry = require('../server/services/SocketRegistry');

describe('SocketRegistry', () => {
  let socketRegistry;
  let mockIo;
  let mockSocket;

  beforeEach(() => {
    mockSocket = {
      id: 'socket123',
      connected: true,
      join: jest.fn(),
      leave: jest.fn()
    };

    mockIo = {
      sockets: {
        sockets: {
          get: jest.fn().mockReturnValue(mockSocket)
        }
      }
    };

    socketRegistry = new SocketRegistry(mockIo);
    jest.clearAllMocks();
  });

  describe('set()', () => {
    test('should register socket in game', () => {
      socketRegistry.set('socket123', 42, 'three-hands', 'user1');

      const gameInfo = socketRegistry.get('socket123');
      expect(gameInfo).toEqual({
        gameId: 42,
        gameType: 'three-hands',
        userId: 'user1'
      });

      const gameSockets = socketRegistry.getGameSockets(42);
      expect(gameSockets).toEqual(['socket123']);
    });

    test('should make socket join game room', () => {
      socketRegistry.set('socket123', 42, 'three-hands', 'user1');

      expect(mockSocket.join).toHaveBeenCalledWith(42);
    });

    test('should handle multiple sockets in same game', () => {
      socketRegistry.set('socket1', 42, 'three-hands', 'user1');
      socketRegistry.set('socket2', 42, 'three-hands', 'user2');

      const gameSockets = socketRegistry.getGameSockets(42);
      expect(gameSockets).toEqual(['socket1', 'socket2']);
    });

    test('should not duplicate socket IDs in game', () => {
      socketRegistry.set('socket123', 42, 'three-hands', 'user1');
      socketRegistry.set('socket123', 42, 'three-hands', 'user1');

      const gameSockets = socketRegistry.getGameSockets(42);
      expect(gameSockets).toEqual(['socket123']);
    });
  });

  describe('get()', () => {
    test('should return game info for registered socket', () => {
      socketRegistry.set('socket123', 42, 'three-hands', 'user1');

      const gameInfo = socketRegistry.get('socket123');
      expect(gameInfo).toEqual({
        gameId: 42,
        gameType: 'three-hands',
        userId: 'user1'
      });
    });

    test('should return null for unregistered socket', () => {
      const gameInfo = socketRegistry.get('unregistered');

      expect(gameInfo).toBeNull();
    });
  });

  describe('delete()', () => {
    test('should remove socket from all mappings', () => {
      socketRegistry.set('socket123', 42, 'three-hands', 'user1');

      socketRegistry.delete('socket123');

      expect(socketRegistry.get('socket123')).toBeNull();
      expect(socketRegistry.getGameSockets(42)).toEqual([]);
    });

    test('should make socket leave game room', () => {
      socketRegistry.set('socket123', 42, 'three-hands', 'user1');

      socketRegistry.delete('socket123');

      expect(mockSocket.leave).toHaveBeenCalledWith(42);
    });

    test('should handle non-existing socket gracefully', () => {
      socketRegistry.delete('nonexistent');

      // Should not throw
      expect(socketRegistry.getGameSockets(42)).toEqual([]);
    });

    test('should remove game from gameSocketsMap when last socket leaves', () => {
      socketRegistry.set('socket123', 42, 'three-hands', 'user1');

      expect(socketRegistry.getActiveGames()).toContain(42);

      socketRegistry.delete('socket123');

      expect(socketRegistry.getActiveGames()).not.toContain(42);
    });
  });

  describe('getGameSockets()', () => {
    test('should return socket IDs for game', () => {
      socketRegistry.set('socket1', 42, 'three-hands', 'user1');
      socketRegistry.set('socket2', 42, 'three-hands', 'user2');

      const sockets = socketRegistry.getGameSockets(42);
      expect(sockets).toEqual(['socket1', 'socket2']);
    });

    test('should return empty array for non-existing game', () => {
      const sockets = socketRegistry.getGameSockets(999);
      expect(sockets).toEqual([]);
    });
  });

  describe('getActiveGames()', () => {
    test('should return all active game IDs', () => {
      socketRegistry.set('socket1', 42, 'three-hands', 'user1');
      socketRegistry.set('socket2', 43, 'four-hands', 'user2');

      const activeGames = socketRegistry.getActiveGames();
      expect(activeGames).toHaveLength(2);
      expect(activeGames).toContain(42);
      expect(activeGames).toContain(43);
    });

    test('should return empty array when no games', () => {
      const activeGames = socketRegistry.getActiveGames();
      expect(activeGames).toEqual([]);
    });
  });

  describe('cleanupGame()', () => {
    test('should clean up all sockets for a game', () => {
      socketRegistry.set('socket1', 42, 'three-hands', 'user1');
      socketRegistry.set('socket2', 42, 'three-hands', 'user2');
      socketRegistry.set('socket3', 43, 'four-hands', 'user3');

      socketRegistry.cleanupGame(42);

      expect(socketRegistry.get('socket1')).toBeNull();
      expect(socketRegistry.get('socket2')).toBeNull();
      expect(socketRegistry.get('socket3')).toEqual({
        gameId: 43,
        gameType: 'four-hands',
        userId: 'user3'
      });

      expect(socketRegistry.getGameSockets(42)).toEqual([]);
      expect(socketRegistry.getGameSockets(43)).toEqual(['socket3']);
    });

    test('should make all sockets leave game room', () => {
      socketRegistry.set('socket1', 42, 'three-hands', 'user1');
      socketRegistry.set('socket2', 42, 'three-hands', 'user2');

      socketRegistry.cleanupGame(42);

      expect(mockSocket.leave).toHaveBeenCalledTimes(2);
      expect(mockSocket.leave).toHaveBeenCalledWith(42);
    });
  });

  describe('handleDisconnection()', () => {
    let mockEndGameCallback;

    beforeEach(() => {
      mockEndGameCallback = jest.fn();
    });

    test('should handle disconnection of socket in game', () => {
      socketRegistry.set('socket123', 42, 'three-hands', 'user1');

      const result = socketRegistry.handleDisconnection(mockSocket, mockEndGameCallback);

      expect(result).toEqual({
        gameId: 42,
        gameType: 'three-hands',
        userId: 'user1',
        remainingSockets: 0
      });

      expect(mockSocket.leave).toHaveBeenCalledWith(42);
      expect(socketRegistry.get('socket123')).toBeNull();
    });

    test('should end game when last socket disconnects', () => {
      socketRegistry.set('socket123', 42, 'three-hands', 'user1');

      socketRegistry.handleDisconnection(mockSocket, mockEndGameCallback);

      expect(mockEndGameCallback).toHaveBeenCalledWith(42);
    });

    test('should not end game when other sockets remain', () => {
      socketRegistry.set('socket123', 42, 'three-hands', 'user1');
      socketRegistry.set('socket456', 42, 'three-hands', 'user2');

      socketRegistry.handleDisconnection(mockSocket, mockEndGameCallback);

      expect(mockEndGameCallback).not.toHaveBeenCalled();
    });

    test('should return null for socket not in game', () => {
      const result = socketRegistry.handleDisconnection(mockSocket, mockEndGameCallback);

      expect(result).toBeNull();
      expect(mockEndGameCallback).not.toHaveBeenCalled();
    });
  });

  describe('getStats()', () => {
    test('should return registry statistics', () => {
      socketRegistry.set('socket1', 42, 'three-hands', 'user1');
      socketRegistry.set('socket2', 42, 'three-hands', 'user2');
      socketRegistry.set('socket3', 43, 'four-hands', 'user3');

      const stats = socketRegistry.getStats();

      expect(stats).toEqual({
        totalSockets: 3,
        activeGames: 2,
        gameSocketCounts: [
          { gameId: 42, socketCount: 2 },
          { gameId: 43, socketCount: 1 }
        ]
      });
    });

    test('should return empty stats when no data', () => {
      const stats = socketRegistry.getStats();

      expect(stats).toEqual({
        totalSockets: 0,
        activeGames: 0,
        gameSocketCounts: []
      });
    });
  });
});
/**
 * Mock UnifiedMatchmaking for RoomService unit tests
 */

const socketRegistry = new Map();
const gameSocketsMap = new Map();

module.exports = {
  socketRegistry: {
    set: jest.fn((socketId, gameId, gameType, userId) => {
      socketRegistry.set(socketId, { gameId, gameType, userId });
    }),
    get: jest.fn((socketId) => {
      return socketRegistry.get(socketId);
    }),
    delete: jest.fn((socketId) => {
      socketRegistry.delete(socketId);
    }),
    clear: jest.fn(() => {
      socketRegistry.clear();
    }),
  },

  setGameSockets: jest.fn((gameId, socketIds) => {
    gameSocketsMap.set(gameId, socketIds);
  }),

  getGameSockets: jest.fn((gameId) => {
    return gameSocketsMap.get(gameId) || [];
  }),

  isUserInGame: jest.fn(() => false),

  isUserInQueue: jest.fn(() => false),

  reset: () => {
    socketRegistry.clear();
    gameSocketsMap.clear();
  },
};
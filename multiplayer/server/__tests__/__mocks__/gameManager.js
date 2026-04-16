/**
 * Mock GameManager for RoomService unit tests
 */

let currentGameId = 0;
const gameStateStore = new Map();

module.exports = {
  startGame: jest.fn((playerCount, isPartyMode = false) => {
    currentGameId++;
    const gameState = {
      gameId: currentGameId,
      deck: [],
      players: new Array(playerCount).fill(null).map((_, i) => ({
        id: i,
        name: `Player ${i}`,
        hand: [],
        captures: [],
        score: 0,
      })),
      table: [],
      currentPlayer: 0,
      round: 1,
      scores: new Array(playerCount).fill(0),
    };
    gameStateStore.set(currentGameId, gameState);
    return { gameId: currentGameId, gameState };
  }),

  startPartyGame: jest.fn(() => {
    currentGameId++;
    const gameState = {
      gameId: currentGameId,
      deck: [],
      players: new Array(4).fill(null).map((_, i) => ({
        id: i,
        name: `Player ${i}`,
        hand: [],
        captures: [],
        score: 0,
        team: i < 2 ? 'A' : 'B',
      })),
      table: [],
      currentPlayer: 0,
      round: 1,
      scores: [0, 0],
    };
    gameStateStore.set(currentGameId, gameState);
    return { gameId: currentGameId, gameState };
  }),

  addPlayerToGame: jest.fn(),

  setPlayerUserId: jest.fn(),

  clearClientReadyStatus: jest.fn(),

  getGameState: jest.fn((gameId) => {
    return gameStateStore.get(gameId) || null;
  }),

  reset: () => {
    currentGameId = 0;
    gameStateStore.clear();
  },
};
// Server-side test setup for Jest
// Configure test environment for Node.js server tests

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  // Keep error and warn for debugging
  // Comment out info and log during development
  // info: jest.fn(),
  // log: jest.fn(),
  debug: jest.fn(),
};

// Mock process.env for server tests
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';

// Mock socket.io for server tests
jest.mock('socket.io', () => ({
  Server: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    to: jest.fn(() => ({ emit: jest.fn() })),
    listen: jest.fn(),
    close: jest.fn()
  }))
}));

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn()
  }))
}));

// Mock Express for server tests
jest.mock('express', () => {
  const mockApp = {
    use: jest.fn(() => mockApp),
    get: jest.fn(() => mockApp),
    post: jest.fn(() => mockApp),
    listen: jest.fn(() => ({ close: jest.fn() })),
    set: jest.fn(() => mockApp)
  };
  return jest.fn(() => mockApp);
});

// Global test utilities
global.createMockGameState = () => ({
  round: 1,
  currentPlayer: 0,
  playerHands: [[], []],
  playerCaptures: [[], []],
  tableCards: [],
  gameId: 'test-game',
  players: ['player1', 'player2']
});

global.createMockCard = (rank = 'A', suit = '♠', value = 1) => ({
  rank,
  suit,
  value,
  id: `${rank}${suit}`
});

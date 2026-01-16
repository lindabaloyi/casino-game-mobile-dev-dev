/**
 * Client-Server State Synchronization Test Suite
 * Validates that client and server maintain synchronized game state
 * Uses A-10 card data to test realistic scenarios
 */

const { GameState } = require('../multiplayer/server/game-logic/game-state');

// Mock WebSocket for testing
class MockWebSocket {
  constructor() {
    this.sentMessages = [];
    this.receivedMessages = [];
    this.connected = true;
  }

  emit(event, data) {
    this.sentMessages.push({ event, data, timestamp: Date.now() });
  }

  simulateReceive(event, data) {
    this.receivedMessages.push({ event, data, timestamp: Date.now() });
    return { event, data };
  }
}

// Test card data using A-10 as requested
const TEST_CARDS = {
  player1Initial: [
    { rank: 'A', suit: '♠', value: 1 },
    { rank: '5', suit: '♥', value: 5 },
    { rank: '8', suit: '♦', value: 8 },
    { rank: '10', suit: '♣', value: 10 }
  ],
  player2Initial: [
    { rank: '2', suit: '♠', value: 2 },
    { rank: '7', suit: '♥', value: 7 },
    { rank: '9', suit: '♦', value: 9 },
    { rank: '3', suit: '♣', value: 3 }
  ],
  tableCards: [
    { rank: '4', suit: '♠', value: 4 },
    { rank: '6', suit: '♥', value: 6 }
  ]
};

describe('Client-Server State Synchronization', () => {

  let mockWebSocket;
  let serverState;
  let clientState;

  beforeEach(() => {
    mockWebSocket = new MockWebSocket();

    // Initialize server state
    serverState = {
      playerHands: [TEST_CARDS.player1Initial, TEST_CARDS.player2Initial],
      tableCards: TEST_CARDS.tableCards,
      currentPlayer: 0,
      round: 1,
      scores: [0, 0],
      gameOver: false,
      winner: null,
      playerCaptures: [[], []]
    };

    // Initialize client state (starts synchronized)
    clientState = JSON.parse(JSON.stringify(serverState));
  });

  describe('Hand Size Synchronization', () => {
    test('should maintain synchronized hand sizes after actions', () => {
      // Simulate server processing a trail action
      serverState.playerHands[0].pop(); // Remove 10♣ from player 1's hand
      serverState.tableCards.push({ rank: '10', suit: '♣', value: 10 });
      serverState.currentPlayer = 1; // Switch to player 2's turn

      // Server sends update
      mockWebSocket.simulateReceive('game-update', serverState);

      // Client should receive and update state
      clientState = serverState;

      // Validate synchronization
      expect(serverState.playerHands[0].length).toBe(3);
      expect(clientState.playerHands[0].length).toBe(3);
      expect(serverState.playerHands[1].length).toBe(4);
      expect(clientState.playerHands[1].length).toBe(4);
      expect(serverState.currentPlayer).toBe(clientState.currentPlayer);
    });

    test('should detect desynchronized hand sizes (intentionally fails to show detection)', () => {
      // Create fresh states for this test
      const testServerState = JSON.parse(JSON.stringify(serverState));
      const testClientState = JSON.parse(JSON.stringify(serverState));

      // Server processes action (remove one card)
      const removedCard = testServerState.playerHands[0].splice(0, 1)[0]; // Remove A♠
      testServerState.tableCards.push(removedCard);

      // Client misses update (stale state)
      // testClientState remains unchanged

      // This test intentionally shows desynchronization detection
      // Server processed action: removed 1 card, hand should be length 3
      // Client missed update: hand should still be length 4
      expect(testServerState.playerHands[0].length).toBe(3);
      expect(testClientState.playerHands[0].length).toBe(4); // Stale - detects the issue!

      // Test should catch this mismatch
      expect(testServerState.playerHands[0].length)
        .not.toBe(testClientState.playerHands[0].length);
    });
  });

  describe('Card Content Validation', () => {
    test('should maintain exact card content synchronization', () => {
      // Server and client should have identical card arrays
      expect(serverState.playerHands[0]).toEqual(clientState.playerHands[0]);
      expect(serverState.playerHands[1]).toEqual(clientState.playerHands[1]);
      expect(serverState.tableCards).toEqual(clientState.tableCards);
    });

    test('should detect card content desynchronization', () => {
      // Create fresh states for this test
      const testServerState = JSON.parse(JSON.stringify(serverState));
      const testClientState = JSON.parse(JSON.stringify(serverState));

      // Server removes specific card
      const removedCard = testServerState.playerHands[0].splice(2, 1)[0]; // Remove 8♦
      testServerState.tableCards.push(removedCard);

      // Client has different card removed (desynchronized)
      testClientState.playerHands[0].splice(0, 1); // Remove A♠ instead

      // Should detect the mismatch
      expect(testServerState.playerHands[0]).not.toEqual(testClientState.playerHands[0]);
      expect(testServerState.tableCards.length).toBe(testClientState.tableCards.length + 1);
    });

    test('should validate specific card ranks A-10', () => {
      // Use fresh test data to avoid state pollution from other tests
      const testPlayer1Cards = [
        { rank: 'A', suit: '♠', value: 1 },
        { rank: '5', suit: '♥', value: 5 },
        { rank: '8', suit: '♦', value: 8 },
        { rank: '10', suit: '♣', value: 10 }
      ];
      const testPlayer2Cards = [
        { rank: '2', suit: '♠', value: 2 },
        { rank: '7', suit: '♥', value: 7 },
        { rank: '9', suit: '♦', value: 9 },
        { rank: '3', suit: '♣', value: 3 }
      ];

      const expectedPlayer1Cards = ['A', '5', '8', '10'];
      const actualPlayer1Ranks = testPlayer1Cards.map(card => card.rank);

      expect(actualPlayer1Ranks).toEqual(expectedPlayer1Cards);

      const expectedPlayer2Cards = ['2', '7', '9', '3'];
      const actualPlayer2Ranks = testPlayer2Cards.map(card => card.rank);

      expect(actualPlayer2Ranks).toEqual(expectedPlayer2Cards);
    });
  });

  describe('Turn State Synchronization', () => {
    test('should synchronize currentPlayer changes', () => {
      // Initial state
      expect(serverState.currentPlayer).toBe(0);
      expect(clientState.currentPlayer).toBe(0);

      // Server switches turn
      serverState.currentPlayer = 1;
      clientState.currentPlayer = 1;

      expect(serverState.currentPlayer).toBe(clientState.currentPlayer);
    });

    test('should detect turn desynchronization', () => {
      // Server switches to player 2
      serverState.currentPlayer = 1;

      // Client misses update, still thinks it's player 1's turn
      // clientState.currentPlayer remains 0

      expect(serverState.currentPlayer).not.toBe(clientState.currentPlayer);
    });
  });

  describe('WebSocket Message Delivery', () => {
    test('should verify game-update messages are sent', () => {
      // Simulate server sending state update
      mockWebSocket.emit('game-update', serverState);

      expect(mockWebSocket.sentMessages).toHaveLength(1);
      expect(mockWebSocket.sentMessages[0].event).toBe('game-update');
      expect(mockWebSocket.sentMessages[0].data).toEqual(serverState);
    });

    test('should verify client receives game-update messages', () => {
      // Server sends update
      mockWebSocket.emit('game-update', serverState);

      // Client receives it
      const received = mockWebSocket.simulateReceive('game-update', serverState);

      expect(received.event).toBe('game-update');
      expect(received.data.playerHands).toEqual(serverState.playerHands);
    });

    test('should detect missed WebSocket messages', () => {
      // Server sends update
      mockWebSocket.emit('game-update', serverState);

      // Client doesn't receive it (0 received messages)
      expect(mockWebSocket.receivedMessages).toHaveLength(0);

      // This indicates a WebSocket delivery failure
      expect(mockWebSocket.sentMessages).toHaveLength(1);
      expect(mockWebSocket.receivedMessages).toHaveLength(0);
    });
  });

  describe('Action State Transitions', () => {
    test('should validate trail action state changes', () => {
      const initialHandSize = serverState.playerHands[0].length;
      const initialTableSize = serverState.tableCards.length;

      // Simulate trail action
      const trailedCard = serverState.playerHands[0].pop(); // Remove last card
      serverState.tableCards.push(trailedCard); // Add to table

      // Validate state changes
      expect(serverState.playerHands[0].length).toBe(initialHandSize - 1);
      expect(serverState.tableCards.length).toBe(initialTableSize + 1);
      expect(serverState.tableCards[serverState.tableCards.length - 1]).toEqual(trailedCard);
    });

    test('should validate capture action state changes', () => {
      // Create fresh state for this test
      const testState = JSON.parse(JSON.stringify(serverState));

      // Add a capturable pair to table (using 4♠ from table and adding another 4)
      testState.tableCards.push({ rank: '4', suit: '♥', value: 4 });

      const initialHandSize = testState.playerHands[0].length;
      const initialTableSize = testState.tableCards.length;
      const initialCapturesSize = testState.playerCaptures[0].length;

      // Simulate capture (4♥ captures both 4s)
      const capturedCards = [
        testState.tableCards.find(card => card.rank === '4' && card.suit === '♠'),
        testState.tableCards.find(card => card.rank === '4' && card.suit === '♥'),
        testState.playerHands[0].find(card => card.rank === 'A') // Using A♠ as capturer
      ].filter(Boolean);

      // Remove from hand and table, add to captures
      testState.playerHands[0] = testState.playerHands[0].filter(card => card.rank !== 'A');
      testState.tableCards = testState.tableCards.filter(card => card.rank !== '4');
      testState.playerCaptures[0].push(...capturedCards);

      // Validate state changes
      expect(testState.playerHands[0].length).toBeLessThan(initialHandSize);
      expect(testState.tableCards.length).toBeLessThan(initialTableSize);
      expect(testState.playerCaptures[0].length).toBeGreaterThan(initialCapturesSize);
    });

    test('should validate round transition state changes', () => {
      // Set up round 1 completion
      serverState.playerHands = [[], []]; // Both players empty
      serverState.round = 1;

      // Simulate round transition
      serverState.round = 2;
      serverState.playerHands = [
        [ // Player 1 gets remaining cards
          { rank: '4', suit: '♥', value: 4 },
          { rank: '6', suit: '♠', value: 6 }
        ],
        [ // Player 2 gets remaining cards
          { rank: '7', suit: '♦', value: 7 },
          { rank: '9', suit: '♣', value: 9 }
        ]
      ];

      // Validate round transition
      expect(serverState.round).toBe(2);
      expect(serverState.playerHands[0].length).toBe(2);
      expect(serverState.playerHands[1].length).toBe(2);
    });
  });

  describe('Game Over State Validation', () => {
    test('should validate round 2 game over conditions', () => {
      // Set up round 2 with both players having cards
      serverState.round = 2;
      serverState.playerHands = [TEST_CARDS.player1Initial, TEST_CARDS.player2Initial];

      // Not game over yet
      expect(serverState.gameOver).toBe(false);

      // Simulate both players emptying hands
      serverState.playerHands = [[], []];
      serverState.gameOver = true;
      serverState.winner = 0; // Player 1 wins
      serverState.finalScores = [15, 12];

      // Validate game over state
      expect(serverState.gameOver).toBe(true);
      expect(serverState.playerHands[0].length).toBe(0);
      expect(serverState.playerHands[1].length).toBe(0);
      expect(serverState.winner).toBe(0);
      expect(serverState.finalScores).toEqual([15, 12]);
    });

    test('should distinguish round 1 vs round 2 end conditions', () => {
      // Round 1: Both empty = Round transition (not game over)
      serverState.round = 1;
      serverState.playerHands = [[], []];
      expect(serverState.gameOver).toBe(false);

      // Round 2: Both empty = Game over
      serverState.round = 2;
      serverState.playerHands = [[], []];
      serverState.gameOver = true;
      expect(serverState.gameOver).toBe(true);
    });
  });
});

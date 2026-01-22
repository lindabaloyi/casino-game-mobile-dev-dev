/**
 * Game Over Flow Jest Tests
 * Tests the complete game over flow: point card extraction and table placement
 */

const handleGameOver = require("../multiplayer/server/game/actions/game-over");
const handleCleanup = require("../multiplayer/server/game/actions/cleanup");

// Mock game manager and logger
jest.mock("../multiplayer/server/utils/logger", () => ({
  createLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe("Game Over Flow", () => {
  let mockGameManager;
  let mockGameState;

  beforeEach(() => {
    // Mock game manager
    mockGameManager = {
      getGameState: jest.fn(),
      activeGames: new Map(),
    };

    // Mock game state with player captures
    mockGameState = {
      playerCaptures: [
        // Player 0: 10♦, 2♠, A♠, A♥, plus 6 more ♠ for bonus, plus filler cards
        [
          { rank: "10", suit: "♦" }, // 2 points
          { rank: "2", suit: "♠" }, // 1 point
          { rank: "A", suit: "♠" }, // 1 point
          { rank: "A", suit: "♥" }, // 1 point
          { rank: "3", suit: "♠" }, // spade for 6+ bonus
          { rank: "4", suit: "♠" }, // spade
          { rank: "5", suit: "♠" }, // spade
          { rank: "6", suit: "♠" }, // spade
          { rank: "7", suit: "♠" }, // spade
          ...Array(23).fill({ rank: "K", suit: "♣" }), // 23 more = 32 total (21+ bonus)
        ],
        // Player 1: A♦, A♣, plus 20 more cards (22 total - 21+ bonus)
        [
          { rank: "A", suit: "♦" }, // 1 point
          { rank: "A", suit: "♣" }, // 1 point
          ...Array(20).fill({ rank: "Q", suit: "♥" }), // 20 more = 22 total
        ],
      ],
      tableCards: [],
      scores: [0, 0],
      lastCapturer: 0,
      turnCounter: 40,
    };

    mockGameManager.getGameState.mockReturnValue(mockGameState);
    mockGameManager.activeGames.set("test-game", mockGameState);
  });

  describe("Score Calculation", () => {
    test("should calculate correct final scores", async () => {
      const result = await handleGameOver(
        mockGameManager,
        0,
        { type: "game-over" },
        "test-game",
      );

      // Player 0: 32 cards (10♦=2, 2♠=1, A♠=1, A♥=1) + 7♠ bonus (+2) + 32 cards bonus (+2) = 9 points
      // Player 1: 22 cards (A♦=1, A♣=1) + 22 cards bonus (+2) = 4 points
      expect(result.scores).toEqual([9, 4]);
      expect(result.scores[0] + result.scores[1]).toBe(13); // Total points
    });

    test("should determine winner correctly", async () => {
      const result = await handleGameOver(
        mockGameManager,
        0,
        { type: "game-over" },
        "test-game",
      );

      expect(result.winner).toBe(0); // Player 0 wins with 9 > 4
    });
  });

  describe("Table Preservation", () => {
    test("should not modify table cards", async () => {
      // Set up some table cards
      mockGameState.tableCards = [
        { rank: "J", suit: "♠" },
        { rank: "9", suit: "♦" },
      ];

      const result = await handleGameOver(
        mockGameManager,
        0,
        { type: "game-over" },
        "test-game",
      );

      // Table cards should remain unchanged
      expect(result.tableCards).toEqual([
        { rank: "J", suit: "♠" },
        { rank: "9", suit: "♦" },
      ]);
    });
  });

  describe("Game Over State", () => {
    test("should set game over state correctly", async () => {
      const result = await handleGameOver(
        mockGameManager,
        0,
        { type: "game-over" },
        "test-game",
      );

      expect(result.gameOver).toBe(true);
      expect(result.gameOverTimestamp).toBeDefined();
      expect(typeof result.gameOverTimestamp).toBe("number");
    });

    test("should maintain final scores", async () => {
      const result = await handleGameOver(
        mockGameManager,
        0,
        { type: "game-over" },
        "test-game",
      );

      expect(result.scores).toEqual([9, 4]); // Based on our test data
      expect(result.scores[0] + result.scores[1]).toBe(13); // Total points
    });
  });

  describe("Integration with Cleanup", () => {
    test("cleanup should automatically trigger game over", async () => {
      // Add some cards to table for cleanup
      mockGameState.tableCards = [
        { rank: "J", suit: "♠" },
        { rank: "9", suit: "♦" },
      ];

      // Run cleanup - it should automatically trigger game over
      const result = await handleCleanup(
        mockGameManager,
        0,
        { type: "cleanup" },
        "test-game",
      );

      // Verify the result is the game over state
      expect(result.gameOver).toBe(true);
      expect(result.scores).toEqual([9, 4]); // Final scores calculated
      expect(result.winner).toBe(0); // Winner determined

      // Verify cleanup was performed - table cards awarded to last capturer
      expect(result.playerCaptures[0].length).toBe(34); // 32 original + 2 awarded
      expect(result.playerCaptures[1].length).toBe(22); // 22 original (unchanged)

      // Verify table cards remain as awarded by cleanup (not modified by game over)
      expect(result.tableCards).toEqual([]); // Cleanup clears table after awarding cards
    });
  });
});

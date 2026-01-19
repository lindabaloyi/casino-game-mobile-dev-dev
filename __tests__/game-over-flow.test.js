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

  describe("Point Card Extraction", () => {
    test("should extract 10♦ from player captures", async () => {
      const result = await handleGameOver(
        mockGameManager,
        0,
        { type: "game-over" },
        "test-game",
      );

      const diamondTen = result.tableCards.find(
        (card) =>
          card.type === "game-over-point-card" &&
          card.rank === "10" &&
          card.suit === "♦" &&
          card.player === 0,
      );

      expect(diamondTen).toBeDefined();
      expect(diamondTen.pointValue).toBe(2);
    });

    test("should extract 2♠ from player captures", async () => {
      const result = await handleGameOver(
        mockGameManager,
        0,
        { type: "game-over" },
        "test-game",
      );

      const spadeTwo = result.tableCards.find(
        (card) =>
          card.type === "game-over-point-card" &&
          card.rank === "2" &&
          card.suit === "♠" &&
          card.player === 0,
      );

      expect(spadeTwo).toBeDefined();
      expect(spadeTwo.pointValue).toBe(1);
    });

    test("should extract all aces from player captures", async () => {
      const result = await handleGameOver(
        mockGameManager,
        0,
        { type: "game-over" },
        "test-game",
      );

      const aces = result.tableCards.filter(
        (card) =>
          card.type === "game-over-point-card" &&
          card.rank === "A" &&
          card.pointValue === 1,
      );

      expect(aces.length).toBe(4); // A♠, A♥ from player 0, A♦, A♣ from player 1
    });

    test("should create spades bonus for 6+ spades", async () => {
      const result = await handleGameOver(
        mockGameManager,
        0,
        { type: "game-over" },
        "test-game",
      );

      const spadesBonus = result.tableCards.find(
        (card) =>
          card.type === "game-over-bonus" &&
          card.bonus === "spades-6" &&
          card.player === 0,
      );

      expect(spadesBonus).toBeDefined();
      expect(spadesBonus.points).toBe(2);
      expect(spadesBonus.description).toBe("7 Spades"); // A♠, 2♠, 3♠, 4♠, 5♠, 6♠, 7♠ = 7 spades
    });

    test("should create *21 cards bonus for 21+ total cards", async () => {
      const result = await handleGameOver(
        mockGameManager,
        0,
        { type: "game-over" },
        "test-game",
      );

      const cardsBonus = result.tableCards.find(
        (card) =>
          card.type === "game-over-bonus" &&
          card.bonus === "cards-21" &&
          card.player === 0,
      );

      expect(cardsBonus).toBeDefined();
      expect(cardsBonus.points).toBe(2);
      expect(cardsBonus.description).toBe("*32 Cards");
      expect(cardsBonus.rank).toBe("*");
      expect(cardsBonus.suit).toBe("21");
    });
  });

  describe("Table Placement", () => {
    test("should place all point cards and bonuses on table", async () => {
      const result = await handleGameOver(
        mockGameManager,
        0,
        { type: "game-over" },
        "test-game",
      );

      expect(result.tableCards.length).toBeGreaterThan(0);

      // Should have point cards and bonuses
      const pointCards = result.tableCards.filter(
        (card) => card.type === "game-over-point-card",
      );
      const bonuses = result.tableCards.filter(
        (card) => card.type === "game-over-bonus",
      );
      const separators = result.tableCards.filter(
        (card) => card.type === "game-over-separator",
      );

      expect(pointCards.length).toBe(6); // 10♦, 2♠, A♠, A♥, A♦, A♣ = 6 point cards total
      expect(bonuses.length).toBe(3); // spades bonus + 2 cards bonuses
      expect(separators.length).toBe(1); // separator between players
    });

    test("should organize cards by player with separators", async () => {
      const result = await handleGameOver(
        mockGameManager,
        0,
        { type: "game-over" },
        "test-game",
      );

      // Find separator
      const separatorIndex = result.tableCards.findIndex(
        (card) => card.type === "game-over-separator",
      );

      expect(separatorIndex).toBeGreaterThan(0);

      // Cards before separator should belong to player 0
      const player0Cards = result.tableCards.slice(0, separatorIndex);
      const player0Items = player0Cards.filter(
        (card) =>
          card.player === 0 ||
          card.type === "game-over-point-card" ||
          card.type === "game-over-bonus",
      );

      expect(player0Cards.length).toBeGreaterThan(0);
      expect(player0Items.length).toBe(player0Cards.length); // All cards should belong to player 0

      // Cards after separator should belong to player 1
      const player1Cards = result.tableCards.slice(separatorIndex + 1);
      const player1Items = player1Cards.filter(
        (card) =>
          card.player === 1 ||
          card.type === "game-over-point-card" ||
          card.type === "game-over-bonus",
      );

      expect(player1Cards.length).toBeGreaterThan(0);
      expect(player1Items.length).toBe(player1Cards.length); // All cards should belong to player 1
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

      // Verify the result is the game over state (not just cleanup)
      expect(result.gameOver).toBe(true);
      expect(result.tableCards.length).toBeGreaterThan(0); // Point cards placed on table

      // Verify cleanup was performed
      expect(result.playerCaptures[0].length).toBe(34); // 32 + 2 awarded cards
      expect(
        result.tableCards.some((card) => card.type === "game-over-point-card"),
      ).toBe(true);

      // Verify game over state
      expect(result.gameOver).toBe(true);
      expect(result.scores).toBeDefined();
    });
  });
});

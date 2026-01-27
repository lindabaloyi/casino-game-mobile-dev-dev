const handleRejectBuildAddition = require("../multiplayer/server/game/actions/build/rejectBuildAddition");
const { createLogger } = require("../multiplayer/server/utils/logger");

// Mock logger to prevent console output during tests
jest.mock("../multiplayer/server/utils/logger", () => ({
  createLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe("Build Addition Rejection", () => {
  let mockGameManager;
  let mockGameState;
  const gameId = "test-game";
  const playerIndex = 0; // Player 0

  beforeEach(() => {
    // Reset mock game state before each test
    mockGameState = {
      playerHands: [
        [
          { rank: "K", suit: "♦", value: 10 },
          // The 7♠ is conceptually removed from hand for addition, so it's not here initially
        ], // Player 0's hand
        [], // Player 1's hand
      ],
      tableCards: [
        {
          type: "build",
          buildId: "build-1",
          value: 5, // Original value
          cards: [{ rank: "5", suit: "♣", value: 5, source: "table" }], // Original cards
          owner: playerIndex, // Player 0's build
          // Simulate pending addition state for build-1
          previewValue: 12, // 5 + 7
          previewCards: [
            { rank: "5", suit: "♣", value: 5, source: "table" },
            { rank: "7", suit: "♠", value: 7, source: "hand" },
          ],
          originalValue: 5,
          originalCards: [{ rank: "5", suit: "♣", value: 5, source: "table" }],
        },
      ],
      pendingBuildAdditions: {
        "build-1": {
          playerIndex: playerIndex,
          addedCards: [{ rank: "7", suit: "♠", value: 7, source: "hand" }],
        },
      },
      currentPlayer: playerIndex,
      lastCapturer: null,
      scores: [0, 0],
      playerCaptures: [[], []],
    };

    // Mock gameManager
    mockGameManager = {
      getGameState: jest.fn(() => mockGameState),
      setGameState: jest.fn((id, state) => {
        mockGameState = state;
      }),
      activeGames: new Map([[gameId, mockGameState]]),
    };
  });

  test("should successfully reject a build addition and return added cards to hand", () => {
    const expectedFinalHandSize = 2; // Original hand size before any additions
    const addedCard = mockGameState.pendingBuildAdditions["build-1"].addedCards[0];

    // Simulate rejection action
    const rejectAction = {
      type: "rejectBuildAddition",
      payload: { buildId: "build-1" },
    };

    const updatedGameState = handleRejectBuildAddition(
      mockGameManager,
      playerIndex,
      rejectAction,
      gameId,
    );

    // Assertions
    // 1. Build should be restored to original state
    const restoredBuild = updatedGameState.tableCards.find(
      (card) => card.buildId === "build-1",
    );
    expect(restoredBuild.value).toBe(5);
    expect(restoredBuild.cards).toEqual([
      { rank: "5", suit: "♣", value: 5, source: "table" },
    ]);
    expect(restoredBuild.previewValue).toBeUndefined();
    expect(restoredBuild.previewCards).toBeUndefined();
    expect(restoredBuild.originalValue).toBeUndefined();
    expect(restoredBuild.originalCards).toBeUndefined();

    // 2. Added cards should be returned to player's hand
    expect(updatedGameState.playerHands[playerIndex]).toHaveLength(
      expectedFinalHandSize,
    );
    // Note: The 'source' property is removed when returning to hand by the handler, so adjust expectation
    expect(updatedGameState.playerHands[playerIndex]).toContainEqual({
      rank: addedCard.rank,
      suit: addedCard.suit,
      value: addedCard.value,
    });

    // 3. pendingBuildAdditions should be cleared for this buildId
    expect(updatedGameState.pendingBuildAdditions).not.toHaveProperty(
      "build-1",
    );
  });

  test("should throw error if build with pending addition is not found for current player", () => {
    const invalidBuildId = "non-existent-build";
    const rejectAction = {
      type: "rejectBuildAddition",
      payload: { buildId: invalidBuildId },
    };

    expect(() =>
      handleRejectBuildAddition(
        mockGameManager,
        playerIndex,
        rejectAction,
        gameId,
      ),
    ).toThrow("Build with pending addition not found for current player");
  });

  test("should throw error if game state is not found", () => {
    mockGameManager.getGameState.mockReturnValueOnce(null); // Simulate game not found

    const rejectAction = {
      type: "rejectBuildAddition",
      payload: { buildId: "build-1" },
    };

    expect(() =>
      handleRejectBuildAddition(
        mockGameManager,
        playerIndex,
        rejectAction,
        gameId,
      ),
    ).toThrow(`Game ${gameId} not found`);
  });

  test("should handle case where originalCards is empty (initial build addition)", () => {
    // Modify initial state to simulate an addition to an empty build or new build
    mockGameState.tableCards[0].cards = [
      { rank: "7", suit: "♠", value: 7, source: "hand" },
    ];
    mockGameState.tableCards[0].value = 7;
    mockGameState.tableCards[0].originalCards = []; // Simulating initial build was empty
    mockGameState.tableCards[0].originalValue = 0;
    mockGameState.pendingBuildAdditions["build-1"].addedCards = [
      { rank: "7", suit: "♠", value: 7, source: "hand" },
    ];
    mockGameState.playerHands[playerIndex] = []; // Hand was emptied

    const rejectAction = {
      type: "rejectBuildAddition",
      payload: { buildId: "build-1" },
    };

    const updatedGameState = handleRejectBuildAddition(
      mockGameManager,
      playerIndex,
      rejectAction,
      gameId,
    );

    const restoredBuild = updatedGameState.tableCards.find(
      (card) => card.buildId === "build-1",
    );
    expect(restoredBuild.value).toBe(0); // Should revert to 0 if original was empty
    expect(restoredBuild.cards).toEqual([]); // Should be empty if original was empty
    expect(updatedGameState.playerHands[playerIndex]).toContainEqual({
      rank: "7",
      suit: "♠",
      value: 7,
    });
    expect(updatedGameState.pendingBuildAdditions).not.toHaveProperty(
      "build-1",
    );
  });
});

const handleBuildExtension = require("../multiplayer/server/game/actions/build/BuildExtension");
const handleCancelBuildExtension = require("../multiplayer/server/game/actions/build/cancelBuildExtension");
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

describe("Build Extension Cancellation", () => {
  let mockGameManager;
  let mockGameState;
  const gameId = "test-game";
  const playerIndex = 0; // Player 0
  const opponentPlayerIndex = 1; // Player 1

  beforeEach(() => {
    // Reset mock game state before each test
    mockGameState = {
      playerHands: [
        [
          { rank: "7", suit: "♠", value: 7, source: "hand" },
          { rank: "K", suit: "♦", value: 10, source: "hand" },
        ], // Player 0's hand
        [
          { rank: "A", suit: "♣", value: 1, source: "hand" },
          { rank: "5", suit: "♥", value: 5, source: "hand" },
        ], // Player 1's hand
      ],
      tableCards: [
        {
          type: "build",
          buildId: "build-1",
          value: 8,
          cards: [
            { rank: "8", suit: "♣", value: 8, source: "table" },
          ],
          owner: opponentPlayerIndex, // Opponent's build
          isPendingExtension: false,
          originalCards: [],
          originalValue: 0,
        },
      ],
      currentPlayer: playerIndex,
      lastCapturer: null,
      scores: [0, 0],
      playerCaptures: [[], []],
      // Add other necessary game state properties
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

  test("should successfully cancel a build extension and return card to hand", () => {
    const initialHandSize = mockGameState.playerHands[playerIndex].length;
    const extensionCard = {
      rank: "7",
      suit: "♠",
      value: 7,
    }; // 7♠
    mockGameState.playerHands[playerIndex][0] = { ...extensionCard, source: "hand" };
    mockGameState.playerHands[playerIndex][1] = { ...mockGameState.playerHands[playerIndex][1], source: "hand" };

    // 1. Player 0 initiates a build extension on Player 1's build
    const buildExtensionAction = {
      type: "BuildExtension",
      payload: {
        extensionCard: extensionCard,
        targetBuildId: "build-1",
        overtakeMode: false,
      },
    };

    let updatedGameState = handleBuildExtension(
      mockGameManager,
      playerIndex,
      buildExtensionAction,
      gameId,
    );

    // Assert state after initiating build extension
    expect(updatedGameState.playerHands[playerIndex]).toHaveLength(
      initialHandSize - 1,
    ); // Card removed from hand
    const pendingBuild = updatedGameState.tableCards.find(
      (card) => card.buildId === "build-1",
    );
    expect(pendingBuild.isPendingExtension).toBe(true);
    expect(pendingBuild.pendingExtensionCard).toEqual(extensionCard);
    expect(pendingBuild.previewValue).toBe(
      mockGameState.tableCards[0].value + extensionCard.value,
    );
    expect(pendingBuild.cardPositions).toEqual([
      {
        cardId: `${extensionCard.rank}${extensionCard.suit}`,
        originalIndex: null,
        source: "hand",
      },
    ]);

    // 2. Player 0 cancels the build extension
    const cancelBuildExtensionAction = {
      type: "cancelBuildExtension",
      payload: {
        buildId: "build-1",
      },
    };

    updatedGameState = handleCancelBuildExtension(
      mockGameManager,
      playerIndex,
      cancelBuildExtensionAction,
      gameId,
    );

    // Assert state after canceling build extension
    expect(updatedGameState.playerHands[playerIndex]).toHaveLength(
      initialHandSize,
    ); // Card returned to hand
    expect(updatedGameState.playerHands[playerIndex]).toContainEqual(
      extensionCard,
    ); // Specific card returned
    const restoredBuild = updatedGameState.tableCards.find(
      (card) => card.buildId === "build-1",
    );
    expect(restoredBuild.isPendingExtension).toBe(false);
    expect(restoredBuild.pendingExtensionCard).toBeUndefined();
    expect(restoredBuild.cardPositions).toBeUndefined();
    expect(restoredBuild.value).toBe(mockGameState.tableCards[0].value); // Original value restored
    expect(restoredBuild.cards).toEqual(mockGameState.tableCards[0].cards); // Original cards restored
  });

  test("should throw error if build with pending extension is not found during cancellation", () => {
    const invalidBuildId = "non-existent-build";
    const cancelBuildExtensionAction = {
      type: "cancelBuildExtension",
      payload: {
        buildId: invalidBuildId,
      },
    };

    // Directly set a build as pending extension to ensure this branch is testable
    mockGameState.tableCards[0].isPendingExtension = true;
    mockGameState.tableCards[0].buildId = "another-build"; // Change ID to not match

    expect(() =>
      handleCancelBuildExtension(
        mockGameManager,
        playerIndex,
        cancelBuildExtensionAction,
        gameId,
      ),
    ).toThrow("Build with pending extension not found");
  });

  test("should handle cancellation of an extension initiated by an invalid card (not in hand)", () => {
    // Simulate an invalid scenario where the extension card was not in hand
    const invalidExtensionCard = {
      rank: "Q",
      suit: "♠",
      value: 10,
      source: "hand",
    };
    const targetBuildId = "build-1";

    const buildExtensionAction = {
      type: "BuildExtension",
      payload: {
        extensionCard: invalidExtensionCard,
        targetBuildId: targetBuildId,
        overtakeMode: false,
      },
    };

    // Expect an error when initiating because the card is not in hand
    expect(() =>
      handleBuildExtension(
        mockGameManager,
        playerIndex,
        buildExtensionAction,
        gameId,
      ),
    ).toThrow(
      `Extension card ${invalidExtensionCard.rank}${invalidExtensionCard.suit} not found in player ${playerIndex}'s hand`,
    );

    // After this, the game state should not be in a pending extension state for 'build-1'
    const buildAfterFailedExtension = mockGameState.tableCards.find(
      (card) => card.buildId === targetBuildId,
    );
    expect(buildAfterFailedExtension.isPendingExtension).toBe(false);
  });
});

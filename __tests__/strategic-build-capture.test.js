/**
 * Strategic Build Capture Integration Tests
 * Tests the end-to-end flow of capturing builds via the play options modal
 */

import { fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";

// Mock the modal component
jest.mock("../components/modals/AcceptValidationModal", () => ({
  AcceptValidationModal: ({
    visible,
    onClose,
    availableOptions,
    sendAction,
  }) => {
    if (!visible || !availableOptions) return null;

    return React.createElement(
      "div",
      { "data-testid": "strategic-modal" },
      availableOptions.map((option, index) =>
        React.createElement(
          "button",
          {
            key: index,
            "data-testid": `option-${option.type}`,
            onClick: () => {
              sendAction({
                type: option.type,
                payload: option.payload,
              });
              onClose();
            },
          },
          option.label,
        ),
      ),
    );
  },
}));

// Mock game state and components
const mockGameState = {
  currentPlayer: 0,
  tableCards: [
    {
      type: "build",
      buildId: "build-0",
      cards: [
        { rank: "3", suit: "♠", value: 3 },
        { rank: "2", suit: "♥", value: 2 },
      ],
      value: 5,
      owner: 0, // Player 0 owns this build
    },
  ],
  playerHands: [
    [
      { rank: "5", suit: "♠", value: 5 },
      { rank: "5", suit: "♦", value: 5 },
      { rank: "7", suit: "♣", value: 7 },
    ],
    [
      { rank: "A", suit: "♥", value: 1 },
      { rank: "K", suit: "♠", value: 10 },
    ],
  ],
};

const mockSendAction = jest.fn();
const mockSetStrategicModal = jest.fn();

// Import the strategic capture analysis
const {
  analyzeStrategicCaptureOptions,
  shouldAnalyzeStrategicCapture,
} = require("../src/utils/strategicCaptureAnalysis");

describe("Strategic Build Capture Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Alert
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  describe("Build Owner Strategic Capture Flow", () => {
    test("should trigger strategic modal when build owner has multiple capture cards", () => {
      const build = mockGameState.tableCards[0];
      const playerHand = mockGameState.playerHands[0];
      const playerNumber = 0;
      const draggedCard = { rank: "5", suit: "♠", value: 5 };

      // Verify strategic analysis triggers
      const shouldTrigger = shouldAnalyzeStrategicCapture(
        "build",
        draggedCard,
        build,
        playerHand,
        playerNumber,
      );

      expect(shouldTrigger).toBe(true);

      // Verify strategic options are generated
      const strategicOptions = analyzeStrategicCaptureOptions(
        build,
        draggedCard,
        playerHand,
        playerNumber,
      );

      expect(strategicOptions).not.toBeNull();
      expect(strategicOptions).toHaveLength(2);

      // Check capture option
      expect(strategicOptions[0]).toEqual({
        type: "capture",
        label: "CAPTURE",
        payload: {
          buildId: "build-0",
          captureValue: 5,
          draggedCard: draggedCard,
          selectedTableCards: build.cards,
        },
      });

      // Check single reinforce option
      expect(strategicOptions[1]).toEqual({
        type: "ReinforceBuild",
        label: "REINFORCE",
        payload: {
          buildId: "build-0",
          card: draggedCard,
          extensionType: "strategic_build_reinforcement",
        },
      });
    });

    test("should send correct capture payload when CAPTURE option selected", () => {
      const build = mockGameState.tableCards[0];
      const playerHand = mockGameState.playerHands[0];
      const playerNumber = 0;
      const draggedCard = { rank: "5", suit: "♠", value: 5 };

      // Get strategic options
      const strategicOptions = analyzeStrategicCaptureOptions(
        build,
        draggedCard,
        playerHand,
        playerNumber,
      );

      const captureOption = strategicOptions[0];

      // Simulate modal sending action
      mockSendAction({
        type: captureOption.type,
        payload: captureOption.payload,
      });

      // Verify the correct payload was sent
      expect(mockSendAction).toHaveBeenCalledWith({
        type: "capture",
        payload: {
          buildId: "build-0",
          captureValue: 5,
          draggedCard: draggedCard,
          selectedTableCards: build.cards,
        },
      });
    });

    test("should not trigger strategic analysis for non-build-owner", () => {
      const build = mockGameState.tableCards[0];
      const playerHand = mockGameState.playerHands[1]; // Player 1's hand
      const playerNumber = 1; // Player 1 (not the owner)
      const draggedCard = { rank: "A", suit: "♥", value: 1 };

      // Verify strategic analysis does NOT trigger for non-owner
      const shouldTrigger = shouldAnalyzeStrategicCapture(
        "build",
        draggedCard,
        build,
        playerHand,
        playerNumber,
      );

      expect(shouldTrigger).toBe(false);
    });

    test("should not trigger strategic analysis when player has only one capture card", () => {
      const build = mockGameState.tableCards[0];
      const playerHand = [{ rank: "5", suit: "♠", value: 5 }]; // Only one 5
      const playerNumber = 0;
      const draggedCard = { rank: "5", suit: "♠", value: 5 };

      // Verify strategic analysis does NOT trigger with only one capture card
      const shouldTrigger = shouldAnalyzeStrategicCapture(
        "build",
        draggedCard,
        build,
        playerHand,
        playerNumber,
      );

      expect(shouldTrigger).toBe(false);
    });

    test("should not trigger strategic analysis when dragged card cannot capture", () => {
      const build = mockGameState.tableCards[0];
      const playerHand = mockGameState.playerHands[0];
      const playerNumber = 0;
      const draggedCard = { rank: "7", suit: "♣", value: 7 }; // Cannot capture value 5

      // Verify strategic analysis does NOT trigger when card can't capture
      const shouldTrigger = shouldAnalyzeStrategicCapture(
        "build",
        draggedCard,
        build,
        playerHand,
        playerNumber,
      );

      expect(shouldTrigger).toBe(false);
    });
  });

  describe("Strategic Modal Behavior", () => {
    test("should display play options modal with CAPTURE and REINFORCE buttons", () => {
      const build = mockGameState.tableCards[0];
      const playerHand = mockGameState.playerHands[0];
      const playerNumber = 0;
      const draggedCard = { rank: "5", suit: "♠", value: 5 };

      const strategicOptions = analyzeStrategicCaptureOptions(
        build,
        draggedCard,
        playerHand,
        playerNumber,
      );

      // Mock the AcceptValidationModal component to verify rendering
      const {
        AcceptValidationModal,
      } = require("../components/modals/AcceptValidationModal");

      const { getByTestId } = render(
        React.createElement(AcceptValidationModal, {
          visible: true,
          availableOptions: strategicOptions,
          sendAction: mockSendAction,
          onClose: jest.fn(),
        }),
      );

      // Verify modal shows
      expect(getByTestId("strategic-modal")).toBeTruthy();

      // Verify both options are present
      expect(getByTestId("option-capture")).toBeTruthy();
      expect(getByTestId("option-ReinforceBuild")).toBeTruthy();
    });

    test("should handle CAPTURE option selection correctly", () => {
      const build = mockGameState.tableCards[0];
      const playerHand = mockGameState.playerHands[0];
      const playerNumber = 0;
      const draggedCard = { rank: "5", suit: "♠", value: 5 };

      const strategicOptions = analyzeStrategicCaptureOptions(
        build,
        draggedCard,
        playerHand,
        playerNumber,
      );

      const {
        AcceptValidationModal,
      } = require("../components/modals/AcceptValidationModal");

      const mockOnClose = jest.fn();

      const { getByTestId } = render(
        React.createElement(AcceptValidationModal, {
          visible: true,
          availableOptions: strategicOptions,
          sendAction: mockSendAction,
          onClose: mockOnClose,
        }),
      );

      // Click the CAPTURE option
      fireEvent.press(getByTestId("option-capture"));

      // Verify correct action was sent
      expect(mockSendAction).toHaveBeenCalledWith({
        type: "capture",
        payload: {
          buildId: "build-0",
          captureValue: 5,
          draggedCard: draggedCard,
          selectedTableCards: build.cards,
        },
      });

      // Verify modal was closed
      expect(mockOnClose).toHaveBeenCalled();
    });

    test("should handle REINFORCE option selection correctly", () => {
      const build = mockGameState.tableCards[0];
      const playerHand = mockGameState.playerHands[0];
      const playerNumber = 0;
      const draggedCard = { rank: "5", suit: "♠", value: 5 };

      const strategicOptions = analyzeStrategicCaptureOptions(
        build,
        draggedCard,
        playerHand,
        playerNumber,
      );

      const {
        AcceptValidationModal,
      } = require("../components/modals/AcceptValidationModal");

      const mockOnClose = jest.fn();

      const { getByTestId } = render(
        React.createElement(AcceptValidationModal, {
          visible: true,
          availableOptions: strategicOptions,
          sendAction: mockSendAction,
          onClose: mockOnClose,
        }),
      );

      // Click the REINFORCE option
      fireEvent.press(getByTestId("option-ReinforceBuild"));

      // Verify correct action was sent
      expect(mockSendAction).toHaveBeenCalledWith({
        type: "ReinforceBuild",
        payload: {
          buildId: "build-0",
          card: draggedCard,
          extensionType: "strategic_build_reinforcement",
        },
      });

      // Verify modal was closed
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    test("should handle build with no cards gracefully", () => {
      const build = {
        type: "build",
        buildId: "build-empty",
        cards: [],
        value: 0,
        owner: 0,
      };
      const playerHand = mockGameState.playerHands[0];
      const playerNumber = 0;
      const draggedCard = { rank: "5", suit: "♠", value: 5 };

      const shouldTrigger = shouldAnalyzeStrategicCapture(
        "build",
        draggedCard,
        build,
        playerHand,
        playerNumber,
      );

      expect(shouldTrigger).toBe(false);
    });

    test("should handle undefined build properties", () => {
      const build = {
        type: "build",
        buildId: "build-invalid",
        // Missing cards, value, owner
      };
      const playerHand = mockGameState.playerHands[0];
      const playerNumber = 0;
      const draggedCard = { rank: "5", suit: "♠", value: 5 };

      const shouldTrigger = shouldAnalyzeStrategicCapture(
        "build",
        draggedCard,
        build,
        playerHand,
        playerNumber,
      );

      expect(shouldTrigger).toBe(false);
    });

    test("should handle empty player hand", () => {
      const build = mockGameState.tableCards[0];
      const playerHand = [];
      const playerNumber = 0;
      const draggedCard = { rank: "5", suit: "♠", value: 5 };

      const shouldTrigger = shouldAnalyzeStrategicCapture(
        "build",
        draggedCard,
        build,
        playerHand,
        playerNumber,
      );

      expect(shouldTrigger).toBe(false);
    });
  });
});

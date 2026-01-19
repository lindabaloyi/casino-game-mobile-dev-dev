/**
 * AcceptValidationModal Component Tests
 */

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { Alert } from "react-native";

import {
  calculateConsolidatedOptions,
  validateTempStackDetailed,
} from "../../../src/utils/buildValidators";
import { handleTempStackAction } from "../../../src/utils/tempStackActions";
import { AcceptValidationModal } from "../AcceptValidationModal";

// Mock Alert
jest.spyOn(Alert, "alert");

// Mock the imported utilities
jest.mock("../../../src/utils/buildValidators", () => ({
  ActionOption: {},
  calculateConsolidatedOptions: jest.fn(),
  Card: {},
  validateTempStackDetailed: jest.fn(),
}));

jest.mock("../../../src/utils/tempStackActions", () => ({
  handleTempStackAction: jest.fn(),
}));

const mockCalculateConsolidatedOptions =
  calculateConsolidatedOptions as jest.MockedFunction<
    typeof calculateConsolidatedOptions
  >;
const mockValidateTempStackDetailed =
  validateTempStackDetailed as jest.MockedFunction<
    typeof validateTempStackDetailed
  >;
const mockHandleTempStackAction = handleTempStackAction as jest.MockedFunction<
  typeof handleTempStackAction
>;

describe("AcceptValidationModal", () => {
  const mockSendAction = jest.fn();
  const mockOnClose = jest.fn();

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    sendAction: mockSendAction,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendAction.mockClear();
    mockOnClose.mockClear();
  });

  describe("Traditional Build Mode", () => {
    test("renders loading state initially", () => {
      const tempStack = { stackId: "test-stack", cards: [] };
      const playerHand: any[] = [];

      // Don't mock the functions initially so it shows loading state

      render(
        <AcceptValidationModal
          {...defaultProps}
          tempStack={tempStack}
          playerHand={playerHand}
        />,
      );

      expect(screen.getByText("Loading...")).toBeTruthy();
    });

    test("renders build options for valid temp stack", async () => {
      const tempStack = { stackId: "test-stack", cards: [] };
      const playerHand: any[] = [];

      mockValidateTempStackDetailed.mockReturnValue({
        valid: true,
        buildType: "normal",
        buildValue: 5,
      });
      mockCalculateConsolidatedOptions.mockReturnValue([
        {
          type: "ReinforceBuild",
          label: "Reinforce with 3♣",
          payload: {
            buildId: "test-build",
            card: { rank: "3", suit: "C", value: 3 },
            extensionType: "strategic_build_reinforcement",
          },
        },
      ]);

      render(
        <AcceptValidationModal
          {...defaultProps}
          tempStack={tempStack}
          playerHand={playerHand}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Build Options")).toBeTruthy();
        expect(
          screen.getByText("Choose what to do with this temp stack:"),
        ).toBeTruthy();
        expect(screen.getByText("BUILD 5")).toBeTruthy();
        expect(screen.getByText("CAPTURE 5")).toBeTruthy();
        expect(screen.getByText("Cancel")).toBeTruthy();
      });
    });

    test("renders error message for invalid temp stack", async () => {
      const tempStack = { stackId: "test-stack", cards: [] };
      const playerHand: any[] = [];

      mockValidateTempStackDetailed.mockReturnValue({
        valid: false,
        error: "Invalid build combination",
      });

      render(
        <AcceptValidationModal
          {...defaultProps}
          tempStack={tempStack}
          playerHand={playerHand}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Cannot Create Build")).toBeTruthy();
        expect(screen.getByText("Invalid build combination")).toBeTruthy();
      });
    });

    test("handles build action correctly", async () => {
      const tempStack = { stackId: "test-stack", cards: [] };
      const playerHand: any[] = [];

      mockValidateTempStackDetailed.mockReturnValue({
        valid: true,
        buildType: "normal",
        buildValue: 5,
      });
      mockCalculateConsolidatedOptions.mockReturnValue([
        {
          type: "build",
          label: "Build 5",
          value: 5,
          card: { rank: "5", suit: "H", value: 5 },
        },
      ]);
      mockHandleTempStackAction.mockResolvedValue(undefined);

      render(
        <AcceptValidationModal
          {...defaultProps}
          tempStack={tempStack}
          playerHand={playerHand}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("BUILD 5")).toBeTruthy();
      });

      fireEvent.press(screen.getByText("BUILD 5"));

      await waitFor(() => {
        expect(mockHandleTempStackAction).toHaveBeenCalledWith(
          "build",
          {
            tempStackId: "test-stack",
            buildValue: 5,
            buildType: "normal",
            buildCard: { rank: "5", suit: "H", value: 5 },
          },
          mockSendAction,
        );
        expect(Alert.alert).toHaveBeenCalledWith(
          "Build Created!",
          "Successfully created build of 5",
          [{ text: "OK" }],
        );
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    test("handles capture action correctly", async () => {
      const tempStack = { stackId: "test-stack", cards: [] };
      const playerHand: any[] = [];

      mockValidateTempStackDetailed.mockReturnValue({
        valid: true,
        buildType: "normal",
        buildValue: 5,
      });
      mockCalculateConsolidatedOptions.mockReturnValue([
        {
          type: "capture",
          label: "Capture 5",
          value: 5,
        },
      ]);
      mockHandleTempStackAction.mockResolvedValue(undefined);

      render(
        <AcceptValidationModal
          {...defaultProps}
          tempStack={tempStack}
          playerHand={playerHand}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("CAPTURE 5")).toBeTruthy();
      });

      fireEvent.press(screen.getByText("CAPTURE 5"));

      await waitFor(() => {
        expect(mockHandleTempStackAction).toHaveBeenCalledWith(
          "capture",
          {
            tempStackId: "test-stack",
            captureValue: 5,
          },
          mockSendAction,
        );
        expect(Alert.alert).toHaveBeenCalledWith(
          "Cards Captured!",
          "Successfully captured 5",
          [{ text: "OK" }],
        );
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe("Strategic Capture Mode", () => {
    test("renders strategic capture options when availableOptions provided", () => {
      const availableOptions = [
        {
          type: "capture" as const,
          label: "CAPTURE",
          payload: {
            buildId: "test-stack",
            captureValue: 5,
            draggedCard: {
              rank: "5",
              suit: "♠",
              value: 5,
            },
            selectedTableCards: [
              { rank: "5", suit: "♥", value: 5 },
              { rank: "5", suit: "♦", value: 5 },
            ],
          },
        },
        {
          type: "ReinforceBuild" as const,
          label: "REINFORCE",
          payload: {
            buildId: "test-build",
            card: { rank: "3", suit: "C", value: 3 },
            extensionType: "strategic_build_reinforcement",
          },
        },
      ];

      render(
        <AcceptValidationModal
          {...defaultProps}
          availableOptions={availableOptions}
        />,
      );

      expect(screen.getByText("Play Options")).toBeTruthy();
      expect(screen.getByText("CAPTURE")).toBeTruthy();
      expect(screen.getByText("REINFORCE")).toBeTruthy();
      expect(screen.getByText("Cancel")).toBeTruthy();
    });

    test("handles strategic capture action correctly", () => {
      const availableOptions = [
        {
          type: "capture" as const,
          label: "CAPTURE",
          payload: {
            buildId: "test-stack",
            captureValue: 5,
            draggedCard: {
              rank: "5",
              suit: "♠",
              value: 5,
            },
            selectedTableCards: [
              { rank: "5", suit: "♥", value: 5 },
              { rank: "5", suit: "♦", value: 5 },
            ],
          },
        },
      ];

      render(
        <AcceptValidationModal
          {...defaultProps}
          availableOptions={availableOptions}
        />,
      );

      fireEvent.press(screen.getByText("CAPTURE"));

      expect(mockSendAction).toHaveBeenCalledWith({
        type: "capture",
        payload: {
          tempStackId: null,
          captureValue: 5, // Sum of build cards (3 + 2)
          targetCards: [
            { rank: "3", suit: "♠", value: 3 },
            { rank: "2", suit: "♥", value: 2 },
            {
              rank: "5",
              suit: "♠",
              value: 5,
            },
          ],
          capturingCard: {
            rank: "5",
            suit: "♠",
            value: 5,
          },
          buildId: "test-stack",
        },
      });
      expect(Alert.alert).toHaveBeenCalledWith(
        "Cards Captured!",
        "Successfully captured with strategic play",
        [{ text: "OK" }],
      );
      expect(mockOnClose).toHaveBeenCalled();
    });

    test("handles strategic reinforce-build action correctly", () => {
      const availableOptions = [
        {
          type: "ReinforceBuild" as const,
          label: "REINFORCE",
          payload: {
            buildId: "test-build",
            card: { rank: "3", suit: "C", value: 3 },
            extensionType: "strategic_build_reinforcement",
          },
        },
      ];

      render(
        <AcceptValidationModal
          {...defaultProps}
          availableOptions={availableOptions}
        />,
      );

      fireEvent.press(screen.getByText("REINFORCE"));

      expect(mockSendAction).toHaveBeenCalledWith({
        type: "ReinforceBuild",
        payload: {
          buildId: "test-build",
          card: { rank: "3", suit: "C", value: 3 },
          extensionType: "strategic_build_reinforcement",
        },
      });
      expect(Alert.alert).toHaveBeenCalledWith(
        "Build Reinforced!",
        `Successfully reinforced build with strategic play`,
        [{ text: "OK" }],
      );
      expect(mockOnClose).toHaveBeenCalled();
    });

    test("shows error when no tempStack provided for traditional actions", () => {
      const availableOptions = [
        {
          type: "build" as const,
          label: "Build 5",
          value: 5,
        },
      ];

      render(
        <AcceptValidationModal
          {...defaultProps}
          availableOptions={availableOptions}
        />,
      );

      fireEvent.press(screen.getByText("BUILD 5"));

      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Cannot proceed: Invalid state",
      );
    });
  });

  describe("Modal Behavior", () => {
    test("calls onClose when cancel button is pressed", () => {
      const availableOptions = [
        {
          type: "capture" as const,
          label: "CAPTURE",
          payload: {},
        },
      ];

      render(
        <AcceptValidationModal
          {...defaultProps}
          availableOptions={availableOptions}
        />,
      );

      fireEvent.press(screen.getByText("Cancel"));
      expect(mockOnClose).toHaveBeenCalled();
    });

    test("prevents double-clicks with processing flag", async () => {
      const availableOptions = [
        {
          type: "capture" as const,
          label: "CAPTURE",
          payload: {
            buildId: "test-stack",
            captureValue: 5,
            draggedCard: {
              rank: "5",
              suit: "♠",
              value: 5,
            },
            selectedTableCards: [
              { rank: "5", suit: "♥", value: 5 },
              { rank: "5", suit: "♦", value: 5 },
            ],
          },
        },
      ];

      render(
        <AcceptValidationModal
          {...defaultProps}
          availableOptions={availableOptions}
        />,
      );

      // First click
      fireEvent.press(screen.getByText("CAPTURE"));
      expect(mockSendAction).toHaveBeenCalledTimes(1);

      // Second click should be ignored
      fireEvent.press(screen.getByText("CAPTURE"));
      expect(mockSendAction).toHaveBeenCalledTimes(1);
    });

    test("resets processing flag after action completes", async () => {
      const availableOptions = [
        {
          type: "capture" as const,
          label: "CAPTURE",
          payload: {
            buildId: "test-stack",
            captureValue: 5,
            draggedCard: {
              rank: "5",
              suit: "♠",
              value: 5,
            },
            selectedTableCards: [
              { rank: "5", suit: "♥", value: 5 },
              { rank: "5", suit: "♦", value: 5 },
            ],
          },
        },
      ];

      render(
        <AcceptValidationModal
          {...defaultProps}
          availableOptions={availableOptions}
        />,
      );

      fireEvent.press(screen.getByText("CAPTURE"));

      // Wait for the timeout that resets processing flag
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be able to click again after reset
      fireEvent.press(screen.getByText("CAPTURE"));
      expect(mockSendAction).toHaveBeenCalledTimes(2);
    });
  });
});

/**
 * Strategic Capture Analysis Tests
 */

const {
  analyzeStrategicCaptureOptions,
  shouldAnalyzeStrategicCapture,
} = require("../src/utils/strategicCaptureAnalysis");

describe("Strategic Capture Analysis", () => {
  describe("shouldAnalyzeStrategicCapture", () => {
    test("should return true for temp stack contacts with multiple capture cards", () => {
      const tempStack = {
        stackId: "stack1",
        cards: [{ rank: "5", suit: "H", value: 5 }],
        displayValue: 5,
      };
      const playerHand = [
        { rank: "5", suit: "S", value: 5 },
        { rank: "5", suit: "D", value: 5 },
        { rank: "3", suit: "C", value: 3 },
      ];

      expect(
        shouldAnalyzeStrategicCapture(
          "temporary_stack",
          null,
          tempStack,
          playerHand,
        ),
      ).toBe(true);
    });

    test("should return false for non-temp stack contacts", () => {
      const tempStack = {
        stackId: "stack1",
        cards: [{ rank: "5", suit: "H", value: 5 }],
        displayValue: 5,
      };
      const playerHand = [
        { rank: "5", suit: "S", value: 5 },
        { rank: "5", suit: "D", value: 5 },
      ];

      expect(
        shouldAnalyzeStrategicCapture("loose", null, tempStack, playerHand),
      ).toBe(false);
    });

    test("should return false when only one capture card exists", () => {
      const tempStack = {
        stackId: "stack1",
        cards: [{ rank: "5", suit: "H", value: 5 }],
        displayValue: 5,
      };
      const playerHand = [
        { rank: "5", suit: "S", value: 5 },
        { rank: "7", suit: "D", value: 7 },
      ];

      expect(
        shouldAnalyzeStrategicCapture(
          "temporary_stack",
          null,
          tempStack,
          playerHand,
        ),
      ).toBe(false);
    });

    test("should return false when no capture cards exist", () => {
      const tempStack = {
        stackId: "stack1",
        cards: [{ rank: "5", suit: "H", value: 5 }],
        displayValue: 5,
      };
      const playerHand = [
        { rank: "7", suit: "S", value: 7 },
        { rank: "8", suit: "D", value: 8 },
      ];

      expect(
        shouldAnalyzeStrategicCapture(
          "temporary_stack",
          null,
          tempStack,
          playerHand,
        ),
      ).toBe(false);
    });
  });

  describe("analyzeStrategicCaptureOptions", () => {
    test("should return null when no capture cards exist", () => {
      const tempStack = {
        stackId: "stack1",
        cards: [{ rank: "5", suit: "H", value: 5 }],
        displayValue: 5,
      };
      const playerHand = [
        { rank: "7", suit: "S", value: 7 },
        { rank: "8", suit: "D", value: 8 },
      ];

      expect(analyzeStrategicCaptureOptions(tempStack, playerHand)).toBeNull();
    });

    test("should return null when only one capture card exists", () => {
      const tempStack = {
        stackId: "stack1",
        cards: [{ rank: "5", suit: "H", value: 5 }],
        displayValue: 5,
      };
      const playerHand = [
        { rank: "5", suit: "S", value: 5 },
        { rank: "7", suit: "D", value: 7 },
      ];

      expect(analyzeStrategicCaptureOptions(tempStack, playerHand)).toBeNull();
    });

    test("should return strategic options for multiple capture cards", () => {
      const tempStack = {
        stackId: "stack1",
        cards: [{ rank: "5", suit: "H", value: 5 }],
        displayValue: 5,
      };
      const playerHand = [
        { rank: "5", suit: "S", value: 5 },
        { rank: "5", suit: "D", value: 5 },
        { rank: "3", suit: "C", value: 3 },
      ];

      const result = analyzeStrategicCaptureOptions(tempStack, playerHand);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: "capture",
        label: "Capture with 5♠",
        payload: {
          tempStackId: "stack1",
          captureValue: 5,
          captureType: "strategic_temp_stack_capture",
        },
      });
      expect(result[1]).toEqual({
        type: "addToTempAndCapture",
        label: "Add 5♦ for bigger capture (10)",
        payload: {
          tempStackId: "stack1",
          addedCard: { rank: "5", suit: "D", value: 5 },
          captureCard: { rank: "5", suit: "D", value: 5 },
          captureValue: 10,
          captureType: "strategic_temp_stack_build_capture",
        },
      });
    });

    test("should not include add-to-temp options that do not increase value", () => {
      const tempStack = {
        stackId: "stack1",
        cards: [{ rank: "5", suit: "H", value: 5 }],
        displayValue: 5,
      };
      const playerHand = [
        { rank: "5", suit: "S", value: 5 },
        { rank: "5", suit: "D", value: 5 }, // Same value, won't create bigger capture
        { rank: "3", suit: "C", value: 3 },
      ];

      const result = analyzeStrategicCaptureOptions(tempStack, playerHand);

      expect(result).toHaveLength(1); // Only the direct capture option
      expect(result[0].type).toBe("capture");
    });

    test("should handle different temp stack values correctly", () => {
      const tempStack = {
        stackId: "stack1",
        cards: [
          { rank: "3", suit: "H", value: 3 },
          { rank: "4", suit: "S", value: 4 },
        ],
        displayValue: 7, // 3 + 4
      };
      const playerHand = [
        { rank: "7", suit: "D", value: 7 },
        { rank: "7", suit: "C", value: 7 },
        { rank: "2", suit: "H", value: 2 },
      ];

      const result = analyzeStrategicCaptureOptions(tempStack, playerHand);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: "capture",
        label: "Capture with 7♦",
        payload: {
          tempStackId: "stack1",
          captureValue: 7,
          captureType: "strategic_temp_stack_capture",
        },
      });
      expect(result[1]).toEqual({
        type: "addToTempAndCapture",
        label: "Add 7♣ for bigger capture (14)",
        payload: {
          tempStackId: "stack1",
          addedCard: { rank: "7", suit: "C", value: 7 },
          captureCard: { rank: "7", suit: "C", value: 7 },
          captureValue: 14,
          captureType: "strategic_temp_stack_build_capture",
        },
      });
    });

    test("should return null for invalid temp stack data", () => {
      const tempStack = {
        stackId: "stack1",
        cards: [],
        displayValue: undefined,
      };
      const playerHand = [
        { rank: "5", suit: "S", value: 5 },
        { rank: "5", suit: "D", value: 5 },
      ];

      expect(analyzeStrategicCaptureOptions(tempStack, playerHand)).toBeNull();
    });
  });
});

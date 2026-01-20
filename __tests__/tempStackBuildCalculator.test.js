/**
 * Temp Stack Build Calculator Test Suite
 * Tests all build detection logic including new base value builds
 */

const {
  detectBuildType,
  checkFirstCompleteSegment,
  updateBuildCalculator,
  initializeBuildCalculator,
  detectNormalBuildCombinations,
} = require("../multiplayer/server/game/logic/utils/tempStackBuildCalculator");

describe("Temp Stack Build Calculator", () => {
  describe("Base Value Builds (NEW FEATURE)", () => {
    test("detects [3,1,4] as base value build with value 4", () => {
      const result = detectBuildType([3, 1, 4]);
      expect(result.isValid).toBe(true);
      expect(result.type).toBe("base_value_build");
      expect(result.buildValue).toBe(4);
      expect(result.baseCardIndex).toBe(2);
      expect(result.supportingCards).toEqual([3, 1]);
    });

    test("detects [2,1,3] as base value build with value 3", () => {
      const result = detectBuildType([2, 1, 3]);
      expect(result.isValid).toBe(true);
      expect(result.type).toBe("base_value_build");
      expect(result.buildValue).toBe(3);
      expect(result.baseCardIndex).toBe(2);
    });

    test("detects [1,2,3] as base value build with value 3", () => {
      const result = detectBuildType([1, 2, 3]);
      expect(result.isValid).toBe(true);
      expect(result.type).toBe("base_value_build");
      expect(result.buildValue).toBe(3);
      expect(result.baseCardIndex).toBe(2);
    });

    test("accepts base value builds = 10", () => {
      const result = detectBuildType([6, 4, 10]); // 6+4=10, and 10=10, so valid
      expect(result.isValid).toBe(true);
      expect(result.type).toBe("base_value_build");
      expect(result.buildValue).toBe(10);
    });

    test("prioritizes base value builds over sum builds", () => {
      // [3,1,4] = 8 total, but 4 = 3+1, so should be base value build
      const result = detectBuildType([3, 1, 4]);
      expect(result.type).toBe("base_value_build");
      expect(result.buildValue).toBe(4);
    });
  });

  describe("Sum Builds (Existing)", () => {
    test("detects [2,2,2] as sum build with value 6", () => {
      const result = detectBuildType([2, 2, 2]);
      expect(result.isValid).toBe(true);
      expect(result.type).toBe("sum_build");
      expect(result.buildValue).toBe(6);
    });

    test("rejects sum builds > 10 (should use complex builds)", () => {
      const result = detectBuildType([5, 3, 3]); // 11 > 10
      // This should either be invalid or use complex build logic
      expect(result.isValid).toBe(false); // For now, simple detection
    });
  });

  describe("Edge Cases", () => {
    test("rejects single cards", () => {
      const result = detectBuildType([5]);
      expect(result.isValid).toBe(false);
    });

    test("rejects empty arrays", () => {
      const result = detectBuildType([]);
      expect(result.isValid).toBe(false);
    });

    test("rejects null/undefined", () => {
      const result = detectBuildType(null);
      expect(result.isValid).toBe(false);
    });
  });

  describe("checkFirstCompleteSegment Integration", () => {
    test("returns build value for base value builds", () => {
      const result = checkFirstCompleteSegment([3, 1, 4]);
      expect(result).toBe(4);
    });

    test("returns build value for sum builds (5,3,2)", () => {
      const result = checkFirstCompleteSegment([5, 3, 2]);
      expect(result).toBe(10); // 5+3+2=10, sum build
    });

    test("returns build value for sum builds", () => {
      const result = checkFirstCompleteSegment([2, 2, 2]);
      expect(result).toBe(6);
    });
  });

  describe("updateBuildCalculator Base Value Display Logic", () => {
    test("shows base value for base value builds even with sum ≤ 10", () => {
      const tempStack = {
        stackId: "test-1",
        cards: [
          { rank: "3", suit: "♦", value: 3 },
          { rank: "A", suit: "♠", value: 1 },
          { rank: "4", suit: "♣", value: 4 },
        ],
        buildValue: null,
        runningSum: 0,
        segmentCount: 0,
        displayValue: 0,
        isValid: true,
        isBuilding: true,
      };

      const result = updateBuildCalculator(tempStack, 4);

      expect(result.buildValue).toBe(4);
      expect(result.displayValue).toBe(4); // Should show base value, not sum (8)
      expect(result.isValid).toBe(true);
      expect(result.isBuilding).toBe(false);
    });

    test("shows sum for sum builds (5,3,2)", () => {
      const tempStack = {
        stackId: "test-2",
        cards: [
          { rank: "5", suit: "♠", value: 5 },
          { rank: "3", suit: "♥", value: 3 },
          { rank: "2", suit: "♦", value: 2 },
        ],
        buildValue: null,
        runningSum: 0,
        segmentCount: 0,
        displayValue: 0,
        isValid: true,
        isBuilding: true,
      };

      const result = updateBuildCalculator(tempStack, 2);

      expect(result.buildValue).toBe(10); // 5+3+2=10, sum build
      expect(result.displayValue).toBe(10); // Should show sum
      expect(result.isValid).toBe(true);
      expect(result.isBuilding).toBe(false);
    });

    test("shows sum for regular sum builds with sum ≤ 10", () => {
      const tempStack = {
        stackId: "test-3",
        cards: [
          { rank: "2", suit: "♠", value: 2 },
          { rank: "2", suit: "♥", value: 2 },
          { rank: "2", suit: "♦", value: 2 },
        ],
        buildValue: null,
        runningSum: 0,
        segmentCount: 0,
        displayValue: 0,
        isValid: true,
        isBuilding: true,
      };

      const result = updateBuildCalculator(tempStack, 2);

      expect(result.buildValue).toBe(6);
      expect(result.displayValue).toBe(6); // Should show sum for regular builds
      expect(result.isValid).toBe(true);
      expect(result.isBuilding).toBe(false);
    });
  });

  describe("initializeBuildCalculator", () => {
    test("initializes base value builds correctly", () => {
      const stagingStack = {
        stackId: "test-init",
        cards: [
          { rank: "3", suit: "♦", value: 3 },
          { rank: "A", suit: "♠", value: 1 },
          { rank: "4", suit: "♣", value: 4 },
        ],
        value: 8,
        combinedValue: 8,
        isSameValueStack: false,
      };

      const result = initializeBuildCalculator(stagingStack);

      expect(result.buildValue).toBe(4);
      expect(result.displayValue).toBe(4);
      expect(result.isValid).toBe(true);
      expect(result.isBuilding).toBe(false);
    });

    test("initializes sum builds correctly (5,3,2)", () => {
      const stagingStack = {
        stackId: "test-init-sum-2",
        cards: [
          { rank: "5", suit: "♠", value: 5 },
          { rank: "3", suit: "♥", value: 3 },
          { rank: "2", suit: "♦", value: 2 },
        ],
        value: 10,
        combinedValue: 10,
        isSameValueStack: false,
      };

      const result = initializeBuildCalculator(stagingStack);

      expect(result.buildValue).toBe(10); // 5+3+2=10, sum build
      expect(result.displayValue).toBe(10);
      expect(result.isValid).toBe(true);
      expect(result.isBuilding).toBe(false);
    });

    test("initializes sum builds correctly", () => {
      const stagingStack = {
        stackId: "test-init-sum",
        cards: [
          { rank: "2", suit: "♠", value: 2 },
          { rank: "2", suit: "♥", value: 2 },
          { rank: "2", suit: "♦", value: 2 },
        ],
        value: 6,
        combinedValue: 6,
        isSameValueStack: false,
      };

      const result = initializeBuildCalculator(stagingStack);

      expect(result.buildValue).toBe(6);
      expect(result.displayValue).toBe(6);
      expect(result.isValid).toBe(true);
      expect(result.isBuilding).toBe(false);
    });
  });

  describe("Build Priority Order", () => {
    test("base value builds take priority over sum builds", () => {
      // [3,1,4] could be seen as sum=8, but 4=3+1 takes priority
      const result = detectBuildType([3, 1, 4]);
      expect(result.type).toBe("base_value_build");
      expect(result.buildValue).toBe(4);
    });

    test("sum builds work when no base value relationships exist", () => {
      // [2,2,2] = 6, no base relationships (all same value)
      const result = detectBuildType([2, 2, 2]);
      expect(result.type).toBe("sum_build");
      expect(result.buildValue).toBe(6);
    });
  });

  describe("Comprehensive Examples", () => {
    const testCases = [
      // Base value builds
      { input: [3, 1, 4], expected: { type: "base_value_build", value: 4 } },
      { input: [2, 1, 3], expected: { type: "base_value_build", value: 3 } },
      { input: [1, 2, 3], expected: { type: "base_value_build", value: 3 } },
      { input: [4, 1, 3], expected: { type: "sum_build", value: 8 } },
      { input: [5, 3, 2], expected: { type: "sum_build", value: 10 } }, // 5 at beginning = sum build
      { input: [4, 3, 1], expected: { type: "sum_build", value: 8 } }, // 4+3+1=8, sum build

      // Sum builds
      { input: [2, 2, 2], expected: { type: "sum_build", value: 6 } },
    ];

    testCases.forEach(({ input, expected }) => {
      test(`[${input.join(",")}] → ${expected.type} with value ${expected.value}`, () => {
        const result = detectBuildType(input);
        expect(result.isValid).toBe(true);
        expect(result.type).toBe(expected.type);
        expect(result.buildValue).toBe(expected.value);
      });
    });

    // Test case for the reported issue: [5,4,1,7,3] should be valid build of 10
    test("[5,4,1,7,3] → normal_build with value 10 (two segments: [5,4,1] and [7,3])", () => {
      const result = detectBuildType([5, 4, 1, 7, 3]);
      expect(result.isValid).toBe(true);
      expect(result.type).toBe("normal_build");
      expect(result.buildValue).toBe(10);
      expect(result.segmentCount).toBe(2);
    });

    // Test case for [5,4,1] - should be sum build, not base build
    test("[5,4,1] → sum_build with value 10 (not base build)", () => {
      const result = detectBuildType([5, 4, 1]);
      expect(result.isValid).toBe(true);
      expect(result.type).toBe("sum_build");
      expect(result.buildValue).toBe(10);
    });
  });
});

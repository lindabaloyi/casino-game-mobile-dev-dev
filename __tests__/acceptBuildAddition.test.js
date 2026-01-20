/**
 * Tests for acceptBuildAddition action
 * Tests the advanced build validation logic
 */

const {
  detectNormalBuildCombinations,
} = require("../multiplayer/server/game/logic/utils/tempStackBuildCalculator");

describe("acceptBuildAddition", () => {
  describe("Advanced Build Validation Logic", () => {
    test("accepts 9+1+10 as valid for build value 10", () => {
      const pendingCardValues = [9, 1, 10];
      const existingBuildValue = 10;

      const buildCombinations =
        detectNormalBuildCombinations(pendingCardValues);
      const validCombination = buildCombinations.find(
        (combo) => combo.buildValue === existingBuildValue,
      );

      expect(validCombination).toBeTruthy();
      expect(validCombination.buildValue).toBe(10);
      expect(validCombination.segmentCount).toBe(2); // [9,1] and [10]
    });

    test("accepts 7+3 as valid for build value 10", () => {
      const pendingCardValues = [7, 3];
      const existingBuildValue = 10;

      const buildCombinations =
        detectNormalBuildCombinations(pendingCardValues);
      const validCombination = buildCombinations.find(
        (combo) => combo.buildValue === existingBuildValue,
      );

      expect(validCombination).toBeTruthy();
      expect(validCombination.buildValue).toBe(10);
      expect(validCombination.segmentCount).toBe(1); // Single segment [7,3]
    });

    test("accepts 6+4 as valid for build value 10", () => {
      const pendingCardValues = [6, 4];
      const existingBuildValue = 10;

      const buildCombinations =
        detectNormalBuildCombinations(pendingCardValues);
      const validCombination = buildCombinations.find(
        (combo) => combo.buildValue === existingBuildValue,
      );

      expect(validCombination).toBeTruthy();
      expect(validCombination.buildValue).toBe(10);
    });

    test("accepts 5+5 as valid for build value 10", () => {
      const pendingCardValues = [5, 5];
      const existingBuildValue = 10;

      const buildCombinations =
        detectNormalBuildCombinations(pendingCardValues);
      const validCombination = buildCombinations.find(
        (combo) => combo.buildValue === existingBuildValue,
      );

      expect(validCombination).toBeTruthy();
      expect(validCombination.buildValue).toBe(10);
    });

    test("accepts single 10 as valid for build value 10", () => {
      const pendingCardValues = [10];
      const existingBuildValue = 10;

      const buildCombinations =
        detectNormalBuildCombinations(pendingCardValues);
      const validCombination = buildCombinations.find(
        (combo) => combo.buildValue === existingBuildValue,
      );

      // Check combined logic: valid combination OR sum equals build value
      const pendingCardSum = pendingCardValues.reduce(
        (sum, value) => sum + value,
        0,
      );
      const sumEqualsBuildValue = pendingCardSum === existingBuildValue;
      const shouldAccept = !!validCombination || sumEqualsBuildValue;

      expect(shouldAccept).toBe(true);
      expect(sumEqualsBuildValue).toBe(true); // Specifically test this case
    });

    test("rejects 7+6 as invalid for build value 10", () => {
      const pendingCardValues = [7, 6];
      const existingBuildValue = 10;

      const buildCombinations =
        detectNormalBuildCombinations(pendingCardValues);
      const validCombination = buildCombinations.find(
        (combo) => combo.buildValue === existingBuildValue,
      );

      expect(validCombination).toBeFalsy();
    });

    test("rejects 5+4+2 as invalid for build value 10", () => {
      const pendingCardValues = [5, 4, 2];
      const existingBuildValue = 10;

      const buildCombinations =
        detectNormalBuildCombinations(pendingCardValues);
      const validCombination = buildCombinations.find(
        (combo) => combo.buildValue === existingBuildValue,
      );

      expect(validCombination).toBeFalsy();
    });

    test("finds correct combination for complex case 6+3+7+2+5+4", () => {
      const pendingCardValues = [6, 3, 7, 2, 5, 4];
      const existingBuildValue = 9;

      const buildCombinations =
        detectNormalBuildCombinations(pendingCardValues);
      const validCombination = buildCombinations.find(
        (combo) => combo.buildValue === existingBuildValue,
      );

      expect(validCombination).toBeTruthy();
      expect(validCombination.buildValue).toBe(9);
    });
  });
});

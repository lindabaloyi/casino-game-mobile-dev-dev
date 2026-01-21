// Test script to verify UPDATED displayValue calculation fix
function calculateBuildDisplayValue(build) {
  const totalSum = build.cards.reduce((sum, c) => sum + (c.value || 0), 0);
  const buildValue = build.value;
  const nextMultipleOfBuildValue = Math.ceil(totalSum / buildValue) * buildValue;

  if (totalSum % buildValue === 0) {
    // At a multiple of build value, show the capture value
    return totalSum;
  } else {
    // Show deficit to next multiple of build value
    return -(nextMultipleOfBuildValue - totalSum);
  }
}

// Test cases with updated logic (deficit to next multiple of build value)
console.log("Testing UPDATED displayValue calculation for builds (deficit to build value multiples):");
console.log("");

// Test 1: Build 9 with cards [7] (sum = 7)
const testBuild9a = {
  value: 9,
  cards: [{ rank: '7', suit: '♠', value: 7 }]
};
const result9a = calculateBuildDisplayValue(testBuild9a);
console.log(`Build 9 with [7] (sum=7): nextMultiple=${Math.ceil(7/9)*9}, deficit=${-(Math.ceil(7/9)*9 - 7)} → displayValue = ${result9a}`);

// Test 2: Build 9 with cards [7,2] (sum = 9)
const testBuild9b = {
  value: 9,
  cards: [
    { rank: '7', suit: '♠', value: 7 },
    { rank: '2', suit: '♣', value: 2 }
  ]
};
const result9b = calculateBuildDisplayValue(testBuild9b);
console.log(`Build 9 with [7,2] (sum=9): nextMultiple=${Math.ceil(9/9)*9}, deficit=0 → displayValue = ${result9b}`);

// Test 3: Build 6 with cards [3] (sum = 3)
const testBuild6a = {
  value: 6,
  cards: [{ rank: '3', suit: '♠', value: 3 }]
};
const result6a = calculateBuildDisplayValue(testBuild6a);
console.log(`Build 6 with [3] (sum=3): nextMultiple=${Math.ceil(3/6)*6}, deficit=${-(Math.ceil(3/6)*6 - 3)} → displayValue = ${result6a}`);

// Test 4: Build 6 with cards [3,3] (sum = 6)
const testBuild6b = {
  value: 6,
  cards: [
    { rank: '3', suit: '♠', value: 3 },
    { rank: '3', suit: '♥', value: 3 }
  ]
};
const result6b = calculateBuildDisplayValue(testBuild6b);
console.log(`Build 6 with [3,3] (sum=6): nextMultiple=${Math.ceil(6/6)*6}, deficit=0 → displayValue = ${result6b}`);

console.log("");
console.log("Summary: Each build now uses deficit to next multiple of ITS OWN value!");
console.log("- Build 9: deficit to next multiple of 9");
console.log("- Build 6: deficit to next multiple of 6");
console.log("- Build 10: deficit to next multiple of 10");
console.log("- etc.");

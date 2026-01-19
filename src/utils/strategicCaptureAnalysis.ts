/**
 * Strategic Capture Analysis Utility
 * Client-side analysis for detecting multiple capture options for builds
 */

import { Card } from "./buildValidators";

export interface Build {
  buildId: string;
  value: number;
  owner: number;
  cards: Card[];
}

export interface StrategicCaptureOption {
  type: "capture" | "ReinforceBuild";
  label: string;
  payload: any;
}

/**
 * Analyze if player has multiple strategic options when dragging toward their own build
 * Returns strategic options if multiple exist, null otherwise
 */
export function analyzeStrategicCaptureOptions(
  build: Build,
  draggedCard: Card,
  playerHand: Card[],
  playerNumber: number,
): StrategicCaptureOption[] | null {
  const options: StrategicCaptureOption[] = [];

  // Only analyze player's own builds
  if (build.owner !== playerNumber) {
    console.log(
      `🎯 [STRATEGIC] Build not owned by player (owner: ${build.owner}, player: ${playerNumber})`,
    );
    return null;
  }

  // Check if dragged card can capture this build
  if (draggedCard.value !== build.value) {
    console.log(
      `🎯 [STRATEGIC] Card value ${draggedCard.value} doesn't match build value ${build.value}`,
    );
    return null;
  }

  // Find all cards in hand that can capture this build (same value)
  const captureCards = playerHand.filter((card) => card.value === build.value);

  console.log(
    `🎯 [STRATEGIC] Found ${captureCards.length} cards that can capture build value ${build.value}`,
  );

  if (captureCards.length <= 1) {
    console.log(
      `🎯 [STRATEGIC] Only ${captureCards.length} capture card(s) - not strategic`,
    );
    return null; // Need multiple cards for strategic choice
  }

  // Multiple capture options exist - create strategic options
  console.log(
    `🎯 [STRATEGIC] Multiple capture options available - creating strategic choices`,
  );

  // Option 1: Direct capture with the dragged card
  options.push({
    type: "capture",
    label: "CAPTURE",
    payload: {
      buildId: build.buildId,
      captureValue: build.value,
      draggedCard: draggedCard, // Include dragged card for proper payload construction
      selectedTableCards: build.cards, // Include build cards for capture payload
    },
  });

  // Option 2: Single Reinforce option (regardless of how many cards are available)
  const hasReinforceCards = captureCards.some(
    (card) => card.rank !== draggedCard.rank || card.suit !== draggedCard.suit,
  );

  if (hasReinforceCards) {
    options.push({
      type: "ReinforceBuild",
      label: "REINFORCE",
      payload: {
        buildId: build.buildId,
        card: draggedCard, // Use the dragged card for reinforcement
        extensionType: "strategic_build_reinforcement",
      },
    });
  }

  console.log(`🎯 [STRATEGIC] Generated ${options.length} strategic options`);
  return options.length > 1 ? options : null;
}

/**
 * Check if a contact interaction should trigger strategic capture analysis
 */
export function shouldAnalyzeStrategicCapture(
  contactType: string,
  draggedCard: Card,
  build: Build,
  playerHand: Card[],
  playerNumber: number,
): boolean {
  console.log(
    `🎯 [STRATEGIC] Checking strategic capture for contact type: ${contactType}`,
  );

  // Only analyze for build contacts
  if (contactType !== "build") {
    console.log(
      `🎯 [STRATEGIC] Not a build contact (${contactType}) - skipping`,
    );
    return false;
  }

  // Only analyze player's own builds
  console.log(
    `🎯 [STRATEGIC] Owner check: build.owner (${build.owner}) === playerNumber (${playerNumber}) = ${build.owner === playerNumber}`,
  );
  if (build.owner !== playerNumber) {
    console.log(
      `🎯 [STRATEGIC] ❌ Build not owned by player - BLOCKING strategic analysis`,
    );
    return false;
  }
  console.log(
    `🎯 [STRATEGIC] ✅ Build owned by player - allowing strategic analysis`,
  );

  // Check if dragged card can capture this build
  if (draggedCard.value !== build.value) {
    console.log(
      `🎯 [STRATEGIC] Card value ${draggedCard.value} doesn't match build value ${build.value} - skipping`,
    );
    return false;
  }

  // Check if player has multiple cards of this value
  const captureCards = playerHand.filter((card) => card.value === build.value);

  const hasMultipleCards = captureCards.length > 1;
  console.log(
    `🎯 [STRATEGIC] Player has ${captureCards.length} cards of value ${build.value} - strategic: ${hasMultipleCards}`,
  );

  return hasMultipleCards;
}

/**
 * Overtake Build Action Handler
 * Strategic overtake: merge extended opponent's build with player's own build when values match
 */

const { createLogger } = require("../../../utils/logger");

const logger = createLogger("OvertakeBuild");

function handleOvertakeBuild(gameManager, playerIndex, action, gameId) {
  const { extendedOpponentBuildId, playerBuildId } = action.payload;

  logger.info("🎯 OVERTAKE ACTION RECEIVED", {
    extendedOpponentBuildId,
    playerBuildId,
    playerIndex,
    gameId,
    actionType: action.type,
    fullPayload: action.payload
  });

  const gameState = gameManager.getGameState(gameId);

  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  // Find both builds
  const opponentBuild = gameState.tableCards.find(
    (card) =>
      card.type === "build" &&
      card.buildId === extendedOpponentBuildId &&
      card.owner !== playerIndex
  );

  const playerBuild = gameState.tableCards.find(
    (card) =>
      card.type === "build" &&
      card.buildId === playerBuildId &&
      card.owner === playerIndex
  );

  if (!opponentBuild) {
    logger.warn("Opponent build not found", { extendedOpponentBuildId });
    throw new Error("Opponent build not found");
  }

  if (!playerBuild) {
    logger.warn("Player's own build not found", { playerBuildId, playerIndex });
    throw new Error("Your build not found");
  }

  // 🎯 VALIDATION: Both builds must have equal values (the "build indicators" check)
  const opponentValue = opponentBuild.isPendingExtension ? opponentBuild.previewValue : opponentBuild.value;
  const playerValue = playerBuild.value;

  if (opponentValue !== playerValue) {
    logger.warn("Build values don't match for overtake", {
      opponentValue,
      playerValue,
      extendedOpponentBuildId,
      playerBuildId,
    });
    throw new Error(`Cannot overtake: build values don't match (${opponentValue} vs ${playerValue})`);
  }

  // 🎯 VALIDATION: Player must have the required capture card in hand (from acceptBuildExtension logic)
  const playerHand = gameState.playerHands[playerIndex];
  const hasRequiredCard = playerHand.some(card => card.value === playerValue);

  if (!hasRequiredCard) {
    logger.warn("Player missing required capture card", {
      playerIndex,
      playerValue,
      hand: playerHand.map(c => `${c.rank}${c.suit}(${c.value})`),
    });
    throw new Error(`You need a card with value ${playerValue} in your hand to complete the overtake`);
  }

  logger.info("Overtake validation passed", {
    opponentValue,
    playerValue,
    extendedOpponentBuildId,
    playerBuildId,
    playerIndex,
  });

  // EXECUTE OVERTAKE

  // 1. Find and remove the required card from player's hand
  const captureCardIndex = playerHand.findIndex(card => card.value === playerValue);
  const captureCard = playerHand.splice(captureCardIndex, 1)[0];

  // 2. Collect all cards from both builds + capture card
  const opponentBuildCards = opponentBuild.isPendingExtension ? opponentBuild.previewCards : opponentBuild.cards || [];
  const playerBuildCards = playerBuild.cards || [];
  const allCapturedCards = [
    ...opponentBuildCards,
    ...playerBuildCards,
    captureCard, // Capture card goes on top
  ];

  // 3. Add all cards to player's captures
  gameState.playerCaptures[playerIndex].push(...allCapturedCards);

  // 4. Remove both builds from table
  const extendedBuildIndex = gameState.tableCards.findIndex(
    card => card.buildId === extendedOpponentBuildId
  );
  const playerBuildIndex = gameState.tableCards.findIndex(
    card => card.buildId === playerBuildId
  );

  // Remove in reverse order to maintain indices
  const indicesToRemove = [extendedBuildIndex, playerBuildIndex].sort((a, b) => b - a);
  indicesToRemove.forEach(index => {
    gameState.tableCards.splice(index, 1);
  });

  // 5. Advance to next player
  const nextPlayer = (playerIndex + 1) % 2;
  gameState.currentPlayer = nextPlayer;

  logger.info("Overtake completed successfully", {
    playerIndex,
    nextPlayer,
    capturedCards: allCapturedCards.map(c => `${c.rank}${c.suit}`),
    totalCaptured: allCapturedCards.length,
    extendedBuildRemoved: extendedOpponentBuildId,
    playerBuildRemoved: playerBuildId,
  });

  return gameState;
}

module.exports = handleOvertakeBuild;

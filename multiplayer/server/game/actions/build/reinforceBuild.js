/**
 * ReinforceBuild Action Handler
 * Allows a player to add a card to one of their own builds instead of capturing it
 */

const handleReinforceBuild = async (
  gameManager,
  playerIndex,
  action,
  gameId,
) => {
  const { buildId, card } = action.payload;

  console.log(
    `🏗️ [ReinforceBuild] Player ${playerIndex} reinforcing build ${buildId} with card ${card.rank}${card.suit}`,
  );

  // Get current game state
  const gameState = gameManager.getGameState(gameId);
  if (!gameState) {
    throw new Error("Game not found");
  }

  // Find the target build
  const targetBuild = gameState.tableCards.find(
    (tableCard) => tableCard.type === "build" && tableCard.buildId === buildId,
  );

  if (!targetBuild) {
    throw new Error("Target build not found");
  }

  // Validate: player owns the build
  if (targetBuild.owner !== playerIndex) {
    throw new Error("Cannot reinforce builds you do not own");
  }

  // Find the card in player's hand (by rank and suit)
  const cardIndex = gameState.playerHands[playerIndex].findIndex(
    (handCard) => handCard.rank === card.rank && handCard.suit === card.suit,
  );
  if (cardIndex === -1) {
    throw new Error("Card not found in player hand");
  }

  const cardToAdd = gameState.playerHands[playerIndex][cardIndex];

  // Validate: card value matches build value
  if (cardToAdd.value !== targetBuild.value) {
    throw new Error("Card value must match build value to reinforce");
  }

  console.log(
    `🏗️ [ReinforceBuild] Adding ${cardToAdd.rank}${cardToAdd.suit} to build ${buildId}`,
  );

  // Remove card from player's hand
  gameState.playerHands[playerIndex].splice(cardIndex, 1);

  // Add card to the build (build value stays the same in Casino)
  targetBuild.cards.push(cardToAdd);

  // Note: Build value remains unchanged - only card count increases
  console.log(`🏗️ [ReinforceBuild] Build ${buildId} reinforced successfully:`, {
    value: targetBuild.value, // Value stays the same
    cardCount: targetBuild.cards.length,
    cards: targetBuild.cards.map((c) => `${c.rank}${c.suit}`),
  });

  // Check for win conditions (if player captures all cards)
  // This would be handled by the main game logic

  return gameState;
};

module.exports = handleReinforceBuild;

/**
 * Build Actions Module
 * Handles all build-related action determination logic
 * Extracted from determineActions.js for better separation of concerns
 */

const { rankValue } = require('../../GameState');

/**
 * Determine build actions available when dropping a card
 * Checks for build creation and build extensions
 */
function determineBuildActions(draggedItem, targetInfo, gameState) {
  const actions = [];
  const draggedCard = draggedItem.card;
  const draggedValue = rankValue(draggedCard.rank);
  const { tableCards, playerHands, currentPlayer } = gameState;
  const playerHand = playerHands[currentPlayer];

  // Check for build creation (dropping on loose card)
  if (targetInfo.type === 'loose') {
    const targetCard = tableCards.find(c =>
      c.rank === targetInfo.card?.rank && c.suit === targetInfo.card?.suit
    );

    if (targetCard) {
      const targetValue = rankValue(targetCard.rank);

      // Check if player has a card to capture the build
      const hasCaptureCard = playerHand.some(card =>
        rankValue(card.rank) === targetValue + draggedValue &&
        !(card.rank === draggedCard.rank && card.suit === draggedCard.suit)
      );

      if (hasCaptureCard && (targetValue + draggedValue) <= 10) {
        // Check if player already has a build (can only have one at a time)
        const hasExistingBuild = tableCards.some(card =>
          card.type === 'build' && card.owner === currentPlayer
        );

        if (!hasExistingBuild) {
          actions.push({
            type: 'build',
            label: `Build ${targetValue + draggedValue} (${draggedValue}+${targetValue})`,
            payload: {
              gameId: gameState.gameId,
              draggedItem,
              tableCardsInBuild: [targetCard],
              buildValue: targetValue + draggedValue,
              biggerCard: draggedValue > targetValue ? draggedCard : targetCard,
              smallerCard: draggedValue < targetValue ? draggedCard : targetCard
            }
          });
        }
      }
    }
  }

  // Check for build extensions
  if (targetInfo.type === 'build') {
    const targetBuild = tableCards.find(c =>
      c.type === 'build' && c.buildId === targetInfo.buildId
    );

    if (targetBuild) {
      if (targetBuild.owner === currentPlayer) {
        // Adding to own build
        actions.push({
          type: 'addToOwnBuild',
          label: `Add to Build (${targetBuild.value})`,
          payload: {
            gameId: gameState.gameId,
            draggedItem,
            buildToAddTo: targetBuild
          }
        });
      } else if (targetBuild.isExtendable) {
        // Extending opponent's build
        const newValue = targetBuild.value + draggedValue;
        if (newValue <= 10) {
          actions.push({
            type: 'addToOpponentBuild',
            label: `Extend to ${newValue}`,
            payload: {
              gameId: gameState.gameId,
              draggedItem,
              buildToAddTo: targetBuild
            }
          });
        }
      }
    }
  }

  return actions;
}

module.exports = {
  determineBuildActions
};

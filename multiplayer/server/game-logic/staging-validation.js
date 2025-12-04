// Validation functions for staging operations

export const validateStagingCreation = (gameState, handCard, tableCard) => {
  console.log(`[STAGING_VALIDATION] Validating staging creation: ${handCard.rank}${handCard.suit} on ${tableCard.rank}${tableCard.suit}`);

  const { currentPlayer, tableCards, playerHands } = gameState;

  // Check if staging already active for this player
  const hasActiveStaging = tableCards.some(s =>
    s.type === 'temporary_stack' && s.owner === currentPlayer
  );

  if (hasActiveStaging) {
    console.error(`[STAGING_VALIDATION] Staging already active for player ${currentPlayer}`);
    return { valid: false, message: "Complete your current staging action first." };
  }

  // Verify hand card ownership
  const playerHand = playerHands[currentPlayer];
  const cardInHand = playerHand.find(c => c.rank === handCard.rank && c.suit === handCard.suit);

  if (!cardInHand) {
    console.error(`[STAGING_VALIDATION] Card ${handCard.rank}${handCard.suit} not in player ${currentPlayer}'s hand`);
    return { valid: false, message: "This card is not in your hand." };
  }

  // Verify table card exists and is loose (not part of build or another stack)
  const targetOnTable = tableCards.find(c =>
    !c.type && c.rank === tableCard.rank && c.suit === tableCard.suit
  );

  if (!targetOnTable) {
    console.error(`[STAGING_VALIDATION] Target card ${tableCard.rank}${tableCard.suit} not found as loose card on table`);
    return { valid: false, message: "Target card not found on table." };
  }

  // Verify cards can actually form a build
  const totalValue = (handCard.value || 0) + (tableCard.value || 0);
  if (totalValue > 10) {
    console.warn(`[STAGING_VALIDATION] Card sum ${totalValue} > 10, cannot create build`);
    // Still allow staging for partial builds that can be extended
  }

  console.log(`[STAGING_VALIDATION] Staging creation validation passed`);
  return { valid: true };
};

export const validateStagingAddition = (gameState, handCard, targetStack) => {
  console.log(`[STAGING_VALIDATION] Validating staging addition: ${handCard.rank}${handCard.suit} to stack ${targetStack.stackId}`);

  const { currentPlayer, playerHands } = gameState;

  // Verify it's player's staging stack
  if (targetStack.owner !== currentPlayer) {
    console.error(`[STAGING_VALIDATION] Attempt to add to opponent staging stack ${targetStack.stackId}`);
    return { valid: false, message: "You can only add to your own staging stacks." };
  }

  // Verify hand card
  const playerHand = playerHands[currentPlayer];
  const cardInHand = playerHand.find(c => c.rank === handCard.rank && c.suit === handCard.suit);

  if (!cardInHand) {
    console.error(`[STAGING_VALIDATION] Card ${handCard.rank}${handCard.suit} not in player ${currentPlayer}'s hand`);
    return { valid: false, message: "This card is not in your hand." };
  }

  // Verify stack isn't too large (optional limit)
  const maxStackSize = 10;
  if (targetStack.cards.length >= maxStackSize) {
    console.warn(`[STAGING_VALIDATION] Stack ${targetStack.stackId} already at max size ${maxStackSize}`);
    return { valid: false, message: "Staging stack is already at maximum size." };
  }

  console.log(`[STAGING_VALIDATION] Staging addition validation passed`);
  return { valid: true };
};

export const validateStagingFinalization = (gameState, stack) => {
  console.log(`[STAGING_VALIDATION] Validating staging finalization for stack ${stack.stackId}`);

  const { currentPlayer, playerHands } = gameState;

  // Verify ownership
  if (stack.owner !== currentPlayer) {
    console.error(`[STAGING_VALIDATION] Attempt to finalize opponent staging stack ${stack.stackId}`);
    return { valid: false, message: "You can only finalize your own staging stacks." };
  }

  // Verify minimum card count
  if (stack.cards.length < 2) {
    console.error(`[STAGING_VALIDATION] Stack ${stack.stackId} has only ${stack.cards.length} cards, minimum 2 required`);
    return { valid: false, message: "Staging stack must have at least 2 cards to finalize." };
  }

  // Verify at least one hand card and one table card
  const handCards = stack.cards.filter(c => c.source === 'hand');
  const tableCards = stack.cards.filter(c => c.source === 'table');

  if (handCards.length === 0) {
    console.error(`[STAGING_VALIDATION] Stack ${stack.stackId} has no hand cards`);
    return { valid: false, message: "Staging stack must include at least one card from your hand." };
  }

  if (tableCards.length === 0) {
    console.error(`[STAGING_VALIDATION] Stack ${stack.stackId} has no table cards`);
    return { valid: false, message: "Staging stack must include at least one card from the table." };
  }

  // Verify player has the required hand cards for finalization
  const currentHand = playerHands[currentPlayer];

  for (const requiredCard of handCards) {
    const cardExists = currentHand.some(c =>
      c.rank === requiredCard.rank && c.suit === requiredCard.suit
    );
    if (!cardExists) {
      console.error(`[STAGING_VALIDATION] Required hand card ${requiredCard.rank}${requiredCard.suit} not found in current hand`);
      return { valid: false, message: "One or more required hand cards are no longer available." };
    }
  }

  console.log(`[STAGING_VALIDATION] Staging finalization validation passed`);
  return { valid: true };
};

export const validateStagingCancellation = (gameState, stack) => {
  console.log(`[STAGING_VALIDATION] Validating staging cancellation for stack ${stack.stackId}`);

  const { currentPlayer } = gameState;

  // Verify ownership
  if (stack.owner !== currentPlayer) {
    console.error(`[STAGING_VALIDATION] Attempt to cancel opponent staging stack ${stack.stackId}`);
    return { valid: false, message: "You can only cancel your own staging stacks." };
  }

  // Basic validation: stack exists and is temporary
  if (stack.type !== 'temporary_stack') {
    console.error(`[STAGING_VALIDATION] Stack ${stack.stackId} is not a temporary stack`);
    return { valid: false, message: "This is not a valid staging stack." };
  }

  console.log(`[STAGING_VALIDATION] Staging cancellation validation passed`);
  return { valid: true };
};

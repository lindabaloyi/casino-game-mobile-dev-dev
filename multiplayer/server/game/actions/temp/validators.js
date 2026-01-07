// validators.js - Validation logic for createTemp actions
const { createLogger } = require('../../../utils/logger');
const logger = createLogger('CreateTempValidators');

/**
 * Basic validation that applies to ALL createTemp actions
 * Validates game state existence, table cards, and target index
 */
function validateBasic(action, gameState) {
  logger.info('Validating basic action requirements', {
    hasGameState: !!gameState,
    hasTableCards: !!gameState?.tableCards,
    targetIndex: action.payload.targetIndex
  });

  if (!gameState) {
    throw new Error(`Game not found`);
  }

  if (!gameState.tableCards) {
    const error = new Error(`Game has no tableCards`);
    logger.error('Validation failed - no tableCards');
    throw error;
  }

  const { targetIndex } = action.payload;

  if (targetIndex >= gameState.tableCards.length) {
    const error = new Error("Target table card not found at specified index.");
    logger.error('Validation failed - invalid target index', {
      targetIndex,
      tableCardsCount: gameState.tableCards.length
    });
    throw error;
  }

  logger.info('Basic validation passed');
  return targetIndex; // Return for next validation step
}

/**
 * Validate target card is a valid loose card
 */
function validateTargetCard(gameState, targetIndex) {
  const targetCard = gameState.tableCards[targetIndex];

  if (!targetCard) {
    const error = new Error("Target card not found at index.");
    logger.error('Target card validation failed - card missing', { targetIndex });
    throw error;
  }

  if (targetCard.type === 'temporary_stack') {
    const error = new Error("Target card is not a valid loose card.");
    logger.error('Target card validation failed - is temp stack', { targetIndex });
    throw error;
  }

  logger.info('Target card validation passed', {
    targetCard: `${targetCard.rank}${targetCard.suit}`,
    targetIndex
  });

  return targetCard; // Return validated card
}

/**
 * Validate source-specific requirements
 */
function validateSource(source, draggedCard, targetCard, gameState, playerIndex, payload) {
  logger.info('Validating source-specific requirements', {
    source,
    playerIndex,
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    targetCard: `${targetCard.rank}${targetCard.suit}`
  });

  switch(source) {
    case 'hand':
      validateHandSource(draggedCard, gameState, playerIndex);
      break;
    case 'table':
      validateTableSource(draggedCard, targetCard, gameState, payload.targetIndex);
      break;
    case 'oppTopCard':
      validateOppTopCard(draggedCard, gameState, payload.opponentId);
      break;
    case 'capturedTopCard':
      validateCapturedTopCard(draggedCard, gameState, playerIndex);
      break;
    default:
      const error = new Error(`Invalid source: ${source}`);
      logger.error('Validation failed - invalid source', { source });
      throw error;
  }

  logger.info('Source validation passed', { source });
}

/**
 * Validate hand-to-table drop
 */
function validateHandSource(draggedCard, gameState, playerIndex) {
  const handExists = gameState.playerHands[playerIndex].some(card =>
    card.rank === draggedCard.rank && card.suit === draggedCard.suit
  );

  if (!handExists) {
    const error = new Error("Hand card not found.");
    logger.error('Hand card validation failed', {
      playerIndex,
      draggedCard,
      handSize: gameState.playerHands[playerIndex].length
    });
    throw error;
  }

  logger.info('Hand source validation passed', { playerIndex });
}

/**
 * Validate table-to-table drop
 */
function validateTableSource(draggedCard, targetCard, gameState, targetIndex) {
  const draggedExistsOnTable = gameState.tableCards.some((card, index) =>
    index !== targetIndex && card.rank === draggedCard.rank && card.suit === draggedCard.suit
  );

  if (!draggedExistsOnTable) {
    const error = new Error("Dragged table card not found.");
    logger.error('Table card validation failed', {
      draggedCard,
      targetIndex,
      tableCardsCount: gameState.tableCards.length
    });
    throw error;
  }

  logger.info('Table source validation passed', { targetIndex });
}

/**
 * Validate opponent captured card drop
 */
function validateOppTopCard(draggedCard, gameState, opponentId) {
  if (opponentId === undefined) {
    const error = new Error("opponentId is required for oppTopCard source");
    logger.error('Opponent ID missing', { source: 'oppTopCard' });
    throw error;
  }

  const opponentCaptures = gameState.playerCaptures[opponentId] || [];
  if (opponentCaptures.length === 0) {
    const error = new Error(`Opponent ${opponentId} has no captured cards`);
    logger.error('Opponent has no cards', { opponentId });
    throw error;
  }

  const actualTopCard = opponentCaptures[opponentCaptures.length - 1];
  if (actualTopCard.rank !== draggedCard.rank ||
      actualTopCard.suit !== draggedCard.suit) {
    const error = new Error(`Card ${draggedCard.rank}${draggedCard.suit} is not opponent ${opponentId}'s top card`);
    logger.error('Not opponent top card', {
      draggedCard,
      actualTopCard,
      opponentId
    });
    throw error;
  }

  logger.info('Opponent top card validation passed', { opponentId });
}

/**
 * Validate player's own captured card drop
 */
function validateCapturedTopCard(draggedCard, gameState, playerIndex) {
  const playerCaptures = gameState.playerCaptures[playerIndex] || [];
  if (playerCaptures.length === 0) {
    const error = new Error(`Player ${playerIndex} has no captured cards`);
    logger.error('Player has no captured cards', { playerIndex });
    throw error;
  }

  const actualTopCard = playerCaptures[playerCaptures.length - 1];
  if (actualTopCard.rank !== draggedCard.rank ||
      actualTopCard.suit !== draggedCard.suit) {
    const error = new Error(`Card ${draggedCard.rank}${draggedCard.suit} is not player ${playerIndex}'s top captured card`);
    logger.error('Not player top captured card', {
      draggedCard,
      actualTopCard,
      playerIndex
    });
    throw error;
  }

  logger.info('Player captured top card validation passed', { playerIndex });
}

/**
 * Validate that player doesn't already have a staging stack
 */
function validateNoExistingStagingStack(gameState, playerIndex) {
  const hasStagingStack = gameState.tableCards.some(card =>
    card.type === 'temporary_stack' && card.owner === playerIndex
  );

  if (hasStagingStack) {
    const error = new Error("You can only have one staging stack at a time.");
    logger.error('Staging stack limit validation failed', { playerIndex });
    throw error;
  }

  logger.info('Staging stack limit validation passed', { playerIndex });
}

module.exports = {
  validateBasic,
  validateTargetCard,
  validateSource,
  validateNoExistingStagingStack
};
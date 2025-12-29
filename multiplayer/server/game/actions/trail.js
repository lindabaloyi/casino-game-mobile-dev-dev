/**
 * Trail Action Handler
 * Player places a card on the table instead of capturing
 * Provides context-rich logging for debugging
 */

const { ActionLogger } = require('../../../../utils/actionLogger');

function handleTrail(gameManager, playerIndex, action, gameId) {
  const gameState = gameManager.getGameState(gameId);
  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  const { card, requestId } = action.payload;
  const logger = new ActionLogger(gameId, playerIndex, requestId);

  // LOG ACTION START with FULL CONTEXT
  logger.logActionStart('trail', {
    card: `${card.rank}${card.suit}`,
    source: 'hand', // Trail always from hand
    hand: gameState.playerHands[playerIndex],
    table: gameState.tableCards,
    player: {
      handSize: gameState.playerHands[playerIndex].length,
      captures: gameState.playerCaptures[playerIndex].length,
      score: gameState.scores[playerIndex]
    },
    game: {
      round: gameState.round,
      currentPlayer: gameState.currentPlayer,
      isPlayerTurn: gameState.currentPlayer === playerIndex
    }
  });

  try {
    // VALIDATION DECISIONS
    const hasActiveBuild = gameState.tableCards.some(tc =>
      tc.type === 'build' && tc.owner === playerIndex
    );

    const hasDuplicateOnTable = gameState.tableCards.some(tc =>
      (!tc.type || tc.type === 'loose') &&
      tc.rank === card.rank
    );

    logger.logDecision('VALIDATION', 'CHECKING_TRAIL_ELIGIBILITY', {
      card: `${card.rank}${card.suit}`,
      tableEmpty: gameState.tableCards.length === 0,
      hasDuplicateOnTable,
      playerTurn: gameState.currentPlayer === playerIndex,
      round: gameState.round,
      hasActiveBuild,
      round1Restriction: gameState.round === 1 && hasActiveBuild
    });

    // Validate trail conditions
    if (gameState.currentPlayer !== playerIndex) {
      logger.logDecision('VALIDATION', 'TRAIL_REJECTED', {
        reason: 'not_player_turn',
        expectedPlayer: gameState.currentPlayer,
        actualPlayer: playerIndex
      });
      throw new Error('Not your turn to trail');
    }

    if (gameState.round === 1 && hasActiveBuild) {
      logger.logDecision('VALIDATION', 'TRAIL_REJECTED', {
        reason: 'round_1_active_build',
        round: gameState.round,
        hasActiveBuild: true
      });
      throw new Error('Cannot trail in round 1 when you have an active build');
    }

    if (hasDuplicateOnTable) {
      logger.logDecision('VALIDATION', 'TRAIL_REJECTED', {
        reason: 'duplicate_card_on_table',
        card: `${card.rank}${card.suit}`,
        duplicateFound: true
      });
      throw new Error(`Cannot trail ${card.rank}${card.suit} - same rank already on table`);
    }

    logger.logDecision('VALIDATION', 'TRAIL_APPROVED', {
      card: `${card.rank}${card.suit}`,
      reason: 'all_conditions_met',
      conditions: {
        playerTurn: true,
        noRound1Restriction: gameState.round !== 1 || !hasActiveBuild,
        noDuplicate: !hasDuplicateOnTable
      }
    });

    // EXECUTE TRAIL
    const newGameState = { ...gameState };

    // Find and remove card from player's hand
    const playerHand = gameState.playerHands[playerIndex];
    const cardIndex = playerHand.findIndex(c =>
      c.rank === card.rank && c.suit === card.suit
    );

    if (cardIndex === -1) {
      const handCards = playerHand.map(c => `${c.rank}${c.suit}`).join(', ');
      logger.logError('EXECUTION', new Error(`Card not found in hand`), {
        searchedCard: `${card.rank}${card.suit}`,
        handContents: handCards
      });
      throw new Error(`Card ${card.rank}${card.suit} not in P${playerIndex + 1}'s hand. Hand: [${handCards}]`);
    }

    // Remove card from hand
    const trailedCard = playerHand.splice(cardIndex, 1)[0];
    newGameState.playerHands = gameState.playerHands.map((hand, idx) =>
      idx === playerIndex ? playerHand : hand
    );

    // Add to table as loose card
    newGameState.tableCards = [
      ...gameState.tableCards,
      trailedCard
    ];

    // LOG STATE TRANSITION with clear before/after
    logger.logStateTransition([
      {
        field: 'playerHand',
        from: gameState.playerHands[playerIndex].length,
        to: newGameState.playerHands[playerIndex].length,
        change: -1,
        removedCard: `${trailedCard.rank}${trailedCard.suit}`
      },
      {
        field: 'tableCards',
        from: gameState.tableCards.length,
        to: newGameState.tableCards.length,
        change: +1,
        addedCard: `${trailedCard.rank}${trailedCard.suit}`,
        cardType: 'loose'
      },
      {
        field: 'turn',
        changed: true,
        reason: 'trail_completed',
        from: playerIndex,
        to: (playerIndex + 1) % 2,
        actionForcesTurnSwitch: true
      }
    ]);

    return newGameState;

  } catch (error) {
    logger.logError('EXECUTION', error);
    throw error;
  }
}

module.exports = handleTrail;

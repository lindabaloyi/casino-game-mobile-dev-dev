/**
 * Shared Game Logic Module
 * Provides type-safe functions for both frontend and backend
 */

/**
 * Helper Functions
 */

/**
 * Get card rank value (A=1, 2-10=face value)
 */
function rankValue(rank: string | number): number {
  if (rank === 'A') return 1;
  if (typeof rank === 'number') return rank;
  if (typeof rank === 'string') {
    const parsed = parseInt(rank, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Calculate sum of card values in array
 */
function calculateCardSum(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + rankValue(card.rank), 0);
}

/**
 * Determine what actions are possible when dropping a card
 * This is the authoritative source of truth for casino game rules
 * Migrated from utils/actionDeterminer.ts
 */
export function determineActions(
  draggedItem: any,
  targetInfo: any,
  gameState: GameState
): {
  actions: any[];
  requiresModal: boolean;
  errorMessage: string | null;
} {
  const actions: any[] = [];
  const { card: draggedCard } = draggedItem;
  const { tableCards, playerHands, currentPlayer } = gameState;
  const playerHand = playerHands[currentPlayer];
  const draggedValue = rankValue(draggedCard.rank);

  // DEBUG: Keep source type for debugging card issues
  if (draggedItem.source !== 'hand') {
    return {
      actions: [],
      requiresModal: false,
      errorMessage: 'Only hand cards supported'
    };
  }

  // Check for captures on table cards (reduced logging)
  tableCards.forEach((tableCard: TableCard) => {
    if (isCard(tableCard)) {
      // Loose card - can capture if rank matches
      if (tableCard.rank && rankValue(tableCard.rank) === draggedValue) {
        actions.push({
          type: 'capture',
          label: `Capture ${tableCard.rank}`,
          payload: { draggedItem, selectedTableCards: [tableCard], targetCard: tableCard }
        });
      }
    } else if (isBuild(tableCard) && tableCard.value === draggedValue) {
      // Build - can capture if value matches hand card value
      actions.push({
        type: 'capture',
        label: `Capture Build (${tableCard.value})`,
        payload: { draggedItem, selectedTableCards: [tableCard], targetCard: tableCard }
      });
    } else if (isTemporaryStack(tableCard)) {
      // Temporary stack - can capture if stack value matches
      const stackValue = calculateCardSum(tableCard.cards);
      if (stackValue === draggedValue) {
        actions.push({
          type: 'capture',
          label: `Capture Stack (${stackValue})`,
          payload: { draggedItem, selectedTableCards: [tableCard], targetCard: tableCard }
        });
      }
    }
  });

  // Check for builds (dropping on loose card)
  if (targetInfo.type === 'loose') {
    // Find loose card by rank/suit match
    const targetCard = tableCards.find(c =>
      isCard(c) && c.rank === targetInfo.card?.rank && c.suit === targetInfo.card?.suit
    );

    if (targetCard && isCard(targetCard)) {
      const targetValue = rankValue(targetCard.rank);

      const hasCaptureCard = playerHand.some(card =>
        rankValue(card.rank) === targetValue + draggedValue &&
        !(card.rank === draggedCard.rank && card.suit === draggedCard.suit)
      );

      if (hasCaptureCard && (targetValue + draggedValue) <= 10) {
        const hasExistingBuild = tableCards.some(card =>
          isBuild(card) && card.owner === currentPlayer
        );

        if (!hasExistingBuild) {
          // DEBUG: Log successful build detection
          console.log(`[SHARED_LOGIC] Build detected: ${draggedValue}+${targetValue}=${targetValue + draggedValue}`);
          actions.push({
            type: 'build',
            label: `Build ${targetValue + draggedValue} (${draggedValue}+${targetValue})`,
            payload: {
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

  // Check for build extensions (reduced logging)
  if (targetInfo.type === 'build') {
    const targetBuild = tableCards.find(c =>
      isBuild(c) && c.buildId === targetInfo.buildId
    ) as Build | undefined;

    if (targetBuild) {
      if (targetBuild.owner === currentPlayer) {
        actions.push({
          type: 'addToOwnBuild',
          label: `Add to Build (${targetBuild.value})`,
          payload: { draggedItem, buildToAddTo: targetBuild }
        });
      } else if (targetBuild.isExtendable) {
        const newValue = targetBuild.value + draggedValue;
        if (newValue <= 10) {
          // DEBUG: Log opponent build extension
          console.log(`[SHARED_LOGIC] Opponent build extension: ${targetBuild.value}→${newValue}`);
          actions.push({
            type: 'addToOpponentBuild',
            label: `Extend to ${newValue}`,
            payload: { draggedItem, buildToAddTo: targetBuild }
          });
        }
      }
    }
  }

  // If no actions found, check for trail
  if (actions.length === 0 && (!targetInfo.type || targetInfo.type === 'table')) {
    const hasActiveBuild = tableCards.some(card =>
      isBuild(card) && card.owner === currentPlayer
    );

    const wouldCreateDuplicate = tableCards.some((tableItem: TableCard) =>
      isCard(tableItem) && rankValue(tableItem.rank) === draggedValue
    );

    if (!(gameState.round === 1 && hasActiveBuild) && !wouldCreateDuplicate) {
      actions.push({
        type: 'trail',
        label: 'Trail Card',
        payload: { draggedItem, card: draggedCard }
      });
    } else if (gameState.round === 1 && hasActiveBuild) {
      console.error('[SHARED_LOGIC] Trail blocked: Round 1 with active build');
    } else if (wouldCreateDuplicate) {
      console.error('[SHARED_LOGIC] Trail blocked: Would create duplicate loose card');
    }
  }

  // Handle automatic vs modal execution
  if (actions.length === 0) {
    console.error(`[SHARED_LOGIC] No valid actions for ${draggedCard.rank}${draggedCard.suit} → ${targetInfo.type}`);
    return {
      actions: [],
      requiresModal: false,
      errorMessage: 'No valid actions available'
    };
  }

  if (actions.length === 1) {
    const action = actions[0];
    if (action.type === 'trail' || action.type === 'capture') {
      // Removed verbose auto-execute logging
      return {
        actions,
        requiresModal: false,
        errorMessage: null
      };
    }
  }

  // Multiple actions require modal choice
  console.log(`[SHARED_LOGIC] Modal required: ${actions.length} actions available`);
  return {
    actions,
    requiresModal: true,
    errorMessage: null
  };
}

import { Build, Card, GameState, TableCard, TemporaryStack } from './game-state';

/**
 * Initialize a new game state with shuffled deck and dealt cards
 */
export function initializeGame(): GameState {
  console.log('Initializing game state...');

  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  let deck: Card[] = [];

  // Create deck
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        value: rank === 'A' ? 1 : parseInt(rank, 10)
      });
    }
  }

  // Shuffle deck (Fisher-Yates algorithm)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  // Deal cards - 10 cards to each of 2 players
  const playerHands: Card[][] = [[], []];
  for (let i = 0; i < 10; i++) {
    playerHands[0].push(deck.pop()!);
    playerHands[1].push(deck.pop()!);
  }

  return {
    deck,
    playerHands,
    tableCards: [],
    playerCaptures: [[], []],
    currentPlayer: 0,
    round: 1,
    scores: [0, 0],
    gameOver: false,
    winner: null,
    lastCapturer: null,
    scoreDetails: null,
  };
}

/**
 * Validate that a game state has correct structure
 */
export function validateGameState(gameState: GameState): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!gameState) {
    errors.push('Game state is null or undefined');
    return { valid: false, errors };
  }

  // Check required fields
  if (!Array.isArray(gameState.playerHands) || gameState.playerHands.length !== 2) {
    errors.push('playerHands must be an array of 2 elements');
  }

  if (!Array.isArray(gameState.tableCards)) {
    errors.push('tableCards must be an array');
  }

  if (!Array.isArray(gameState.playerCaptures) || gameState.playerCaptures.length !== 2) {
    errors.push('playerCaptures must be an array of 2 elements');
  }

  if (typeof gameState.currentPlayer !== 'number' || gameState.currentPlayer < 0 || gameState.currentPlayer > 1) {
    errors.push('currentPlayer must be 0 or 1');
  }

  // Validate card structure
  const validateCards = (cards: Card[], location: string) => {
    if (!Array.isArray(cards)) {
      errors.push(`${location} must be an array`);
      return;
    }
    cards.forEach((card, index) => {
      if (!card || typeof card !== 'object') {
        errors.push(`${location}[${index}] is not a valid card object`);
      } else if (!card.suit || !card.rank || typeof card.value !== 'number') {
        errors.push(`${location}[${index}] missing required card properties: suit, rank, value`);
      }
    });
  };

  validateCards(gameState.playerHands[0], 'playerHands[0]');
  validateCards(gameState.playerHands[1], 'playerHands[1]');
  validateCards(gameState.deck, 'deck');

  return { valid: errors.length === 0, errors };
}

/**
 * Get cards that can be captured from table
 */
export function getCapturableCards(tableCards: TableCard[], handCard: Card): TableCard[] {
  return tableCards.filter(tableCard => {
    if (isCard(tableCard)) {
      // Loose cards: can capture if rank matches
      return tableCard.rank === handCard.rank;
    } else if (isBuild(tableCard)) {
      // Builds: can capture if value matches hand card value
      return tableCard.value === handCard.value;
    }
    // Temporary stacks cannot be captured directly
    return false;
  });
}

/**
 * Check if a staging stack can be finalized
 */
export function canFinalizeStagingStack(stack: TemporaryStack): boolean {
  // Must have at least 1 hand card + 1 table card
  const handCards = stack.cards.filter(card => card.source === 'hand');
  const tableCards = stack.cards.filter(card => card.source === 'table');

  return handCards.length >= 1 && tableCards.length >= 1;
}

/**
 * Type guards for runtime safety
 */
export function isCard(obj: any): obj is Card {
  return obj && typeof obj === 'object' &&
         typeof obj.suit === 'string' &&
         typeof obj.rank === 'string' &&
         typeof obj.value === 'number';
}

export function isTemporaryStack(obj: any): obj is TemporaryStack {
  return obj && typeof obj === 'object' &&
         obj.type === 'temporary_stack' &&
         Array.isArray(obj.cards) &&
         typeof obj.owner === 'number';
}

export function isBuild(obj: any): obj is Build {
  return obj && typeof obj === 'object' &&
         obj.type === 'build' &&
         Array.isArray(obj.cards) &&
         typeof obj.value === 'number' &&
         typeof obj.owner === 'number';
}

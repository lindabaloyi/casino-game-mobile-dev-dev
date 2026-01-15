/**
 * Shared Game Logic Module
 * Provides type-safe functions for both frontend and backend
 */

/**
 * Shared Game Logic Module
 * Provides type-safe functions for both frontend and backend
 */

// Import types
import { Build, Card, GameState, TableCard, TemporaryStack } from './game-state';

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

  // Check for build extensions (detailed logging)
  if (targetInfo.type === 'build') {
    console.log('[SHARED_LOGIC] 🎯 BUILD EXTENSION CHECK:', {
      targetBuildId: targetInfo.buildId,
      draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
      draggedValue,
      currentPlayer
    });

    const targetBuild = tableCards.find(c =>
      isBuild(c) && c.buildId === targetInfo.buildId
    ) as Build | undefined;

    if (targetBuild) {
      console.log('[SHARED_LOGIC] ✅ Found target build:', {
        buildId: targetBuild.buildId,
        buildValue: targetBuild.value,
        buildOwner: targetBuild.owner,
        isExtendable: targetBuild.isExtendable,
        currentPlayer
      });

      if (targetBuild.owner === currentPlayer) {
        console.log('[SHARED_LOGIC] 🏗️ Adding action: addToBuilding (own build)', {
          buildId: targetBuild.buildId,
          card: `${draggedCard.rank}${draggedCard.suit}`,
          source: 'hand'
        });

        actions.push({
          type: 'addToBuilding',
          label: `Add to Build (${targetBuild.value})`,
          payload: {
            buildId: targetBuild.buildId,
            card: draggedCard,
            source: 'hand'
          }
        });
      } else if (targetBuild.isExtendable) {
        const newValue = targetBuild.value + draggedValue;
        if (newValue <= 10) {
          console.log('[SHARED_LOGIC] 🏗️ Adding action: addToOpponentBuild', {
            buildId: targetBuild.buildId,
            oldValue: targetBuild.value,
            newValue,
            card: `${draggedCard.rank}${draggedCard.suit}`
          });

          actions.push({
            type: 'addToOpponentBuild',
            label: `Extend to ${newValue}`,
            payload: { draggedItem, buildToAddTo: targetBuild }
          });
        } else {
          console.log('[SHARED_LOGIC] ❌ Opponent build extension blocked - value too high:', {
            newValue,
            maxAllowed: 10
          });
        }
      } else {
        console.log('[SHARED_LOGIC] ❌ Build not extendable by opponent:', {
          buildId: targetBuild.buildId,
          isExtendable: targetBuild.isExtendable
        });
      }
    } else {
      console.log('[SHARED_LOGIC] ❌ Target build not found:', targetInfo.buildId);
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

  // Trail actions ALWAYS require modal confirmation for player approval
  const hasTrailAction = actions.some(action => action.type === 'trail');

  if (actions.length === 1 && !hasTrailAction) {
    // Single non-trail actions can auto-execute
    return {
      actions,
      requiresModal: false,
      errorMessage: null
    };
  }

  // Multiple actions OR Trail actions require modal choice/confirmation
  console.log(`[SHARED_LOGIC] Modal required: ${actions.length} actions available${hasTrailAction ? ' (including trail confirmation)' : ''}`);
  return {
    actions,
    requiresModal: true,
    errorMessage: null
  };
}


/**
 * Initialize a new game state with shuffled deck and dealt cards
 */
export function initializeGame(): GameState {
  console.log('Initializing game state...');

  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  let deck: Card[] = [];

  // Create casino deck (A-10 only, no face cards)
  for (const suit of suits) {
    for (const rank of ranks) {
      let value;
      if (rank === 'A') value = 1;
      else if (rank === '10') value = 10; // 10 equals 10
      else value = parseInt(rank, 10);

      deck.push({
        suit,
        rank,
        value
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
 * Shared Game Logic Module
 * Provides type-safe functions for both frontend and backend
 */

// Import types

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


export function canFinalizeStagingStack(stack: TemporaryStack): boolean {
  // Must have at least 1 hand card + 1 table card
  const handCards = stack.cards.filter(card => card.source === 'hand');
  const tableCards = stack.cards.filter(card => card.source === 'table');

  return handCards.length >= 1 && tableCards.length >= 1;
}

/**
 * Get staging stack from table cards by ID
 */
export function getStagingStack(tableCards: TableCard[], stackId: string): TemporaryStack | null {
  const stack = tableCards.find(c =>
    isTemporaryStack(c) && c.stackId === stackId
  );
  return stack as TemporaryStack || null;
}

/**
 * Check if player has active staging
 */
export function hasActiveStaging(tableCards: TableCard[], playerIndex: number): boolean {
  return tableCards.some(s =>
    isTemporaryStack(s) && s.owner === playerIndex
  );
}

/**
 * Get active staging stack for player
 */
export function getActiveStagingStack(tableCards: TableCard[], playerIndex: number): TemporaryStack | null {
  const stack = tableCards.find(s =>
    isTemporaryStack(s) && s.owner === playerIndex
  );
  return stack as TemporaryStack || null;
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

# Temp Stack Code Reference

## 1. addToStagingStack.js

```javascript
/**
 * Add To Staging Stack Action Handler
 * Player adds card to existing temporary stack
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('AddToStagingStack');

function handleAddToStagingStack(gameManager, playerIndex, action) {
  console.log('[TEMP_STACK] 🏃 ADD_TO_STAGING_STACK executing (AUGMENTATION MODE)');
  console.log('[TEMP_STACK] Input action payload:', JSON.stringify(action.payload, null, 2));

  const { gameId, stackId, card, source } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  console.log('[TEMP_STACK] Operation details:', {
    gameId,
    stackId,
    card: `${card.rank}${card.suit}`,
    cardValue: card.value,
    source,
    playerIndex,
    philosophy: 'ALWAYS ALLOW, NEVER VALIDATE'
  });

  // 🎯 AUGMENTATION PHILOSOPHY: Find or create temp stack
  let tempStack = gameState.tableCards.find(item =>
    item.type === 'temporary_stack' && item.stackId === stackId
  );

  if (!tempStack) {
    console.log('[AUGMENTATION] Creating new temp stack for player (stack didn\'t exist)');
    tempStack = {
      type: 'temporary_stack',
      stackId: stackId || `staging-${Date.now()}`,
      cards: [],
      owner: playerIndex,
      value: 0
    };
    gameState.tableCards.push(tempStack);
  }

  // 🎯 ALWAYS ALLOW: Just add the card, no validation or restrictions
  console.log('[AUGMENTATION] Adding card to stack (freedom philosophy):', {
    stackId: tempStack.stackId,
    beforeCount: tempStack.cards.length,
    card: `${card.rank}${card.suit}`,
    source,
    freedomEnabled: true
  });

  tempStack.cards.push({
    ...card,
    source: source || 'unknown'
  });

  // Update value if available
  if (card.value) {
    tempStack.value = (tempStack.value || 0) + card.value;
  }

  // 🎯 CLEAN SOURCE: Remove from hand/captures only (table cards stay where they are for augmentation)
  if (source === 'hand') {
    const handIndex = gameState.playerHands[playerIndex].findIndex(c =>
      c.rank === card.rank && c.suit === card.suit
    );
    if (handIndex >= 0) {
      gameState.playerHands[playerIndex].splice(handIndex, 1);
      console.log('[AUGMENTATION] Removed from hand');
    }
  } else if (source === 'captured') {
    const captureIndex = gameState.playerCaptures[playerIndex].findIndex(c =>
      c.rank === card.rank && c.suit === card.suit
    );
    if (captureIndex >= 0) {
      gameState.playerCaptures[playerIndex].splice(captureIndex, 1);
      console.log('[AUGMENTATION] Removed from captures');
    }
  } else if (source === 'table') {
    // For table cards in augmentation mode, we could remove from loose cards
    // but let's keep it simple for now - players can drag from anywhere
    console.log('[AUGMENTATION] Table card added to stack (keeping original on table for now)');
  }

  console.log('[AUGMENTATION] ✅ Card added successfully:', {
    stackId: tempStack.stackId,
    newCardCount: tempStack.cards.length,
    newValue: tempStack.value,
    remainingHand: gameState.playerHands[playerIndex].length,
    freedomAchieved: true
  });

  // 🎯 OPTIONAL VALIDATION: Log but don't restrict (player freedom)
  const { validateNoDuplicates } = require('../GameState');
  const hasDuplicates = !validateNoDuplicates(gameState);
  if (hasDuplicates) {
    console.log('[AUGMENTATION] ⚠️ Duplicates detected, but allowing (player choice)');
  }

  return gameState;
}

module.exports = handleAddToStagingStack;
```

## 2. stagingRules.js

```javascript
/**
 * Staging Action Rules
 * Rules for determining staging actions (temp stack creation)
 */

const stagingRules = [
  {
    id: 'table-to-table-staging',
    condition: (context) => {
      console.log('[STAGING_RULE] Evaluating table-to-table staging:', {
        draggedSource: context.draggedItem?.source,
        targetType: context.targetInfo?.type
      });

      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      const isValid = draggedItem?.source === 'table' && targetInfo?.type === 'loose';
      console.log('[STAGING_RULE] Table-to-table staging condition:', isValid);
      return isValid;
    },
    action: (context) => {  // ✅ OPTION B: Function returns complete object with payload
      console.log('[STAGING_RULE] Creating table-to-table action with payload');
      const action = {
        type: 'tableToTableDrop',
        payload: {
          gameId: context.gameId,
          draggedItem: context.draggedItem,
          targetInfo: context.targetInfo
        }
      };
      console.log('[STAGING_RULE] Table-to-table action created:', JSON.stringify(action, null, 2));
      return action;
    },
    requiresModal: false,
    priority: 100,
    exclusive: true,
    description: 'Create temp stack from two table cards'
  },
  {
    id: 'hand-to-table-staging',
    condition: (context) => {
      console.log('[STAGING_RULE] Evaluating hand-to-table staging:', {
        draggedSource: context.draggedItem?.source,
        targetType: context.targetInfo?.type
      });

      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      const isValid = draggedItem?.source === 'hand' && targetInfo?.type === 'loose';
      console.log('[STAGING_RULE] Hand-to-table staging condition:', isValid);
      return isValid;
    },
    action: (context) => {  // ✅ OPTION B: Function returns complete object with payload
      console.log('[STAGING_RULE] Creating hand-to-table action with payload');
      const action = {
        type: 'handToTableDrop',
        payload: {
          gameId: context.gameId,
          draggedItem: context.draggedItem,
          targetInfo: context.targetInfo
        }
      };
      console.log('[STAGING_RULE] Hand-to-table action created:', JSON.stringify(action, null, 2));
      return action;
    },
    requiresModal: false,
    priority: 90,
    exclusive: true,
    description: 'Create temp stack from hand card and table card'
  },
  {
    id: 'temp-stack-addition',
    condition: (context) => {
      console.log('[STAGING_RULE] Evaluating temp stack addition:', {
        targetType: context.targetInfo?.type,
        draggedSource: context.draggedItem?.source
      });

      const targetInfo = context.targetInfo;

      // Allow any card to be added to existing temp stacks
      // The handler will ensure proper removal from original location
      const isValid = targetInfo?.type === 'temporary_stack';

      console.log('[STAGING_RULE] Temp stack addition condition:', isValid, {
        reason: isValid ? 'card can join existing temp stack' : 'target is not a temp stack'
      });
      return isValid;
    },
    action: (context) => {  // ✅ OPTION B: Function returns complete object with payload
      console.log('[STAGING_RULE] Creating temp stack addition action with payload');
      const action = {
        type: 'addToStagingStack',
        payload: {
          gameId: context.gameId,
          stackId: context.targetInfo?.card?.stackId || `temp-${Date.now()}`,
          card: context.draggedItem.card,
          source: context.draggedItem.source
        }
      };
      console.log('[STAGING_RULE] Temp stack addition action created:', JSON.stringify(action, null, 2));
      return action;
    },
    requiresModal: false,
    priority: 80,
    exclusive: true,
    description: 'Add card to existing temporary stack'
  }
];

module.exports = stagingRules;
```

## 3. tableToTableDrop.js

```javascript
/**
 * Table-to-Table Drop Handler
 * Creates temp stack from TWO table cards
 * NO hand logic - assumes both cards are from table
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('TableToTableDrop');

function handleTableToTableDrop(gameManager, playerIndex, action) {
  console.log('[SERVER_CRASH_DEBUG] ===== HANDLER CALLED =====');
  console.log('[SERVER_CRASH_DEBUG] Handler: tableToTableDrop');
  console.log('[SERVER_CRASH_DEBUG] playerIndex:', playerIndex);
  console.log('[SERVER_CRASH_DEBUG] action.payload:', JSON.stringify(action.payload, null, 2));

  // 🔍 DEBUG: Pre-execution state
  console.log('[SERVER_DEBUG] PRE-EXECUTION STATE:', {
    gameId: action.payload.gameId,
    playerIndex,
    draggedCard: action.payload.draggedItem?.card ? `${action.payload.draggedItem.card.rank}${action.payload.draggedItem.card.suit}` : 'none',
    targetCard: action.payload.targetInfo?.card ? `${action.payload.targetInfo.card.rank}${action.payload.targetInfo.card.suit}` : 'none'
  });

  try {
    console.log('[TEMP_STACK] 🏃 TABLE_TO_TABLE_DROP executing');
    console.log('[TEMP_STACK] Input action payload:', JSON.stringify(action.payload, null, 2));

    const { gameId, draggedItem, targetInfo } = action.payload;
    const gameState = gameManager.getGameState(gameId);

    console.log('[TEMP_STACK] Game state before operation:', {
      gameId,
      currentPlayer: gameState.currentPlayer,
      tableCardsCount: gameState.tableCards?.length || 0,
      tableCards: gameState.tableCards?.map((card, index) => ({
        index,
        type: card?.type || 'loose',
        stackId: card?.stackId,
        cardCount: card?.cards?.length || 1,
        cards: card?.cards?.map(c => `${c.rank}${c.suit}`) || [`${card?.rank}${card?.suit}`],
        value: card?.value || (card?.rank ? require('../GameState').rankValue(card.rank) : 'n/a'),
        owner: card?.owner
      })) || []
    });

  console.log('[TABLE_TO_TABLE] Creating temp stack from table cards:', {
    gameId,
    playerIndex,
    draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
    targetCard: `${targetInfo.card.rank}${targetInfo.card.suit}`,
    source: draggedItem.source
  });

  // VALIDATION: Ensure this is table-to-table
  if (draggedItem.source !== 'table') {
    console.error('[TABLE_TO_TABLE] ERROR: Expected table source, got:', draggedItem.source);
    throw new Error('TableToTableDrop handler requires table source');
  }

  if (targetInfo.type !== 'loose') {
    console.error('[TABLE_TO_TABLE] ERROR: Expected loose target, got:', targetInfo.type);
    throw new Error('TableToTableDrop handler requires loose card target');
  }

  // ✅ FIXED: Remove original cards before creating temp stack
  console.log('[TEMP_STACK] Removing original cards before creating temp stack');

  // 🔍 CRITICAL DEBUG: Table structure analysis
  console.log('[DEBUG] Table items analysis:', {
    totalItems: gameState.tableCards.length,
    items: gameState.tableCards.map((item, i) => ({
      index: i,
      type: item.type || 'loose',
      hasRank: 'rank' in item,
      rank: item.rank,
      suit: item.suit,
      isTempStack: item.type === 'temporary_stack',
      tempStackCards: item.type === 'temporary_stack' ? item.cards?.length : 'N/A'
    }))
  });

  const indicesToRemove = [];

  // 🔥 FIXED LOOP: Only check loose cards, skip temp stacks
  for (let i = 0; i < gameState.tableCards.length; i++) {
    const tableItem = gameState.tableCards[i];

    // ✅ CRITICAL: Skip temp stacks and builds
    if (tableItem.type && tableItem.type !== 'loose') {
      console.log(`[DEBUG] Skipping ${tableItem.type} at index ${i}`);
      continue;
    }

    // Now safe to check rank/suit
    const isDraggedCard = tableItem.rank === draggedItem.card.rank &&
                          tableItem.suit === draggedItem.card.suit;
    const isTargetCard = tableItem.rank === targetInfo.card.rank &&
                          tableItem.suit === targetInfo.card.suit;

    if (isDraggedCard && !indicesToRemove.includes(i)) {
      indicesToRemove.push(i);
      console.log(`[DEBUG] Found dragged card ${tableItem.rank}${tableItem.suit} at index ${i}`);
    }

    if (isTargetCard && !indicesToRemove.includes(i)) {
      indicesToRemove.push(i);
      console.log(`[DEBUG] Found target card ${tableItem.rank}${tableItem.suit} at index ${i}`);
    }
  }

  console.log('[TEMP_STACK] Card indices to remove:', {
    indicesToRemove,
    count: indicesToRemove.length,
    expectedCount: 2,
    draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
    targetCard: `${targetInfo.card.rank}${targetInfo.card.suit}`
  });

  // 🔥 CRITICAL VALIDATION: Must find exactly 2 loose cards
  if (indicesToRemove.length !== 2) {
    console.error('[TEMP_STACK] ❌ CRITICAL: Expected to remove 2 loose cards, found', indicesToRemove.length);
    throw new Error(`Table-to-table drop: Expected 2 cards to remove, found ${indicesToRemove.length}`);
  }

  // Remove cards in reverse order to maintain indices
  indicesToRemove.sort((a, b) => b - a).forEach(index => {
    console.log(`[TEMP_STACK] Removing card at index ${index}:`, gameState.tableCards[index]);
    gameState.tableCards.splice(index, 1);
  });

  console.log('[TEMP_STACK] Game state after removing originals:', {
    remainingCards: gameState.tableCards.length,
    remainingCardDetails: gameState.tableCards.map((card, index) => ({
      index,
      type: card?.type || 'loose',
      card: card ? `${card.rank || 'no-rank'}${card.suit || 'no-suit'}` : 'null'
    }))
  });

  // ✅ NOW: Create temp stack with the removed cards
  const stackId = `temp-${Date.now()}`;
  const tempStack = {
    type: 'temporary_stack',
    stackId: stackId,
    cards: [targetInfo.card, draggedItem.card],
    owner: playerIndex,
    value: (targetInfo.card.value || 0) + (draggedItem.card.value || 0)
  };

  console.log('[TEMP_STACK] Created temp stack:', {
    stackId,
    cardsInStack: tempStack.cards.length,
    totalValue: tempStack.value,
    owner: tempStack.owner
  });

  // ✅ Add temp stack to table (replacing the original cards)
  gameState.tableCards.push(tempStack);

  console.log('[TEMP_STACK] Final game state:', {
    totalCards: gameState.tableCards.length,
    cardDetails: gameState.tableCards.map((card, index) => ({
      index,
      type: card?.type || 'loose',
      stackId: card?.stackId,
      cardCount: card?.cards?.length || 1,
      description: card?.type === 'temporary_stack'
        ? `temp-stack: ${card.stackId} (${card.cards.length} cards)`
        : `loose: ${card.rank}${card.suit}`
    }))
  });

  console.log('[TABLE_TO_TABLE] ✅ Temp stack created:', {
    stackId,
    cardsCount: tempStack.cards.length,
    value: tempStack.value
  });

  // Final validation: ensure no duplicates after operation
  const { validateNoDuplicates } = require('../GameState');
  const isValid = validateNoDuplicates(gameState);
  if (!isValid) {
    console.error('[TABLE_TO_TABLE] ❌ CRITICAL: Duplicates detected after temp stack creation!');
    // Don't throw - let the game continue but log the issue
  }

  return gameState;
  } catch (error) {
    console.error('[SERVER_CRASH_DEBUG] ❌ CRASH IN tableToTableDrop:');
    console.error('[SERVER_CRASH_DEBUG] Error:', error.message);
    console.error('[SERVER_CRASH_DEBUG] Stack:', error.stack);
    throw error;
  }
}

module.exports = handleTableToTableDrop;
```

## 4. useDragHandlers.ts

```typescript
import { useCallback, useState } from 'react';
import { Card, GameState } from '../multiplayer/server/game-logic/game-state';

// Type definitions for drag operations and UI
interface DraggedItem {
  card: Card;
  source: string;
  player?: number;
}

interface TargetInfo {
  type: string;
  card?: Card;
  stackId?: string;
  build?: any;
  stack?: any;
  index?: number;
  area?: string;
}

interface ModalInfo {
  visible: boolean;
  title: string;
  message: string;
}

interface DragTurnState {
  isMyTurn: boolean;
  currentPlayer: number;
}

/**
 * Custom hook to manage all drag and drop behavior in GameBoard
 * Consolidates drag state and handlers for cleaner component separation
 */
export function useDragHandlers({
  gameState,
  playerNumber,
  sendAction,
  setCardToReset,
  setErrorModal
}: {
  gameState: GameState;
  playerNumber: number;
  sendAction: (action: any) => void;
  setCardToReset: (card: { rank: string; suit: string } | null) => void;
  setErrorModal: (modal: ModalInfo | null) => void;
}) {
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragTurnState, setDragTurnState] = useState<DragTurnState | null>(null);

  const isMyTurn = gameState.currentPlayer === playerNumber;

  const handleDragStart = useCallback((card: any) => {
    console.log(`[GameBoard] handleDragStart: isMyTurn=${isMyTurn}, card=${card?.rank}${card?.suit}`);
    if (!isMyTurn) {
      console.log(`[GameBoard] Not my turn, ignoring drag start`);
      return;
    }
    // Store turn state at drag start to prevent race conditions
    setDragTurnState({ isMyTurn: true, currentPlayer: gameState.currentPlayer });
    setDraggedCard(card);
    setIsDragging(true);
  }, [isMyTurn, gameState.currentPlayer]);

  const handleDragEnd = useCallback(() => {
    setDraggedCard(null);
    setIsDragging(false);
  }, []);

  const handleDropOnCard = useCallback((draggedItem: any, targetInfo: any) => {
    console.log(`🏆 [STAGING_DEBUG] Card dropped - START:`, {
      draggedCard: draggedItem.card.rank + draggedItem.card.suit,
      source: draggedItem.source,
      targetType: targetInfo.type,
      targetArea: targetInfo.area,
      isMyTurn,
      currentPlayer: gameState.currentPlayer,
      targetCard: targetInfo.card ? targetInfo.card.rank + targetInfo.card.suit : 'none',
      targetIndex: targetInfo.index,
      timestamp: Date.now()
    });

    // 🔍 DEBUG: Current table state before action
    console.log(`🔍 [STAGING_DEBUG] Current table state:`, {
      tableCardsCount: gameState.tableCards?.length || 0,
      tableCards: gameState.tableCards?.map((card: any, index) => ({
        index,
        type: card?.type || 'loose',
        card: card?.type === 'temporary_stack'
          ? `temp-stack(${card.stackId})[${card.cards?.length || 0} cards]`
          : `${card?.rank || 'no-rank'}${card?.suit || 'no-suit'}`,
        owner: card?.owner
      })) || [],
      playerHands: gameState.playerHands?.map((hand, idx) => ({
        player: idx,
        handSize: hand?.length || 0,
        cards: hand?.map((c: any) => `${c.rank}${c.suit}`) || []
      })) || []
    });

    // 🔍 DETECT STAGING DROP early
    const isStagingDrop = (draggedItem.source === 'hand' || draggedItem.source === 'table') && targetInfo.type === 'loose';
    const isAutoValidDrop = !isStagingDrop; // Regular drops can be validated immediately

    console.log(`🔍 [STAGING_DEBUG] Drop analysis:`, {
      isStagingDrop,
      isAutoValidDrop,
      draggedSource: draggedItem.source,
      targetType: targetInfo.type,
      draggedCardValue: draggedItem.card.value,
      targetCardValue: targetInfo.card ? targetInfo.card.value : 'none',
      combinedValue: targetInfo.card ? draggedItem.card.value + targetInfo.card.value : 'n/a'
    });

    if (isStagingDrop) {
      console.log(`🎯 [STAGING_DEBUG] STAGING DROP DETECTED: ${draggedItem.card.rank}${draggedItem.card.suit} → loose ${targetInfo.card.rank}${targetInfo.card.suit}`);
      console.log(`🎯 [STAGING_DEBUG] STAGING: Will send to server for validation - DO NOT validate locally!`);
      console.log(`🎯 [STAGING_DEBUG] STAGING PAYLOAD PREP:`, {
        draggedItem: {
          card: `${draggedItem.card.rank}${draggedItem.card.suit}`,
          source: draggedItem.source,
          player: draggedItem.player
        },
        targetInfo: {
          type: targetInfo.type,
          card: targetInfo.card ? `${targetInfo.card.rank}${targetInfo.card.suit}` : null,
          index: targetInfo.index,
          draggedSource: draggedItem.source
        }
      });
    } else if (isAutoValidDrop) {
      console.log(`✅ [STAGING_DEBUG] REGULAR VALID DROP: ${draggedItem.card.rank}${draggedItem.card.suit} → ${targetInfo.type} - validating locally`);
    }

    if (!isMyTurn) {
      setErrorModal({ visible: true, title: 'Not Your Turn', message: 'Please wait for your turn.' });
      return false;
    }

    // Track this card as the one being dropped (for potential instant reset)
    setCardToReset({
      rank: draggedItem.card.rank,
      suit: draggedItem.card.suit
    });

    // Send raw drop event to server
    const actionPayload = {
      type: 'card-drop',
      payload: {
        draggedItem,
        targetInfo: {
          ...targetInfo,
          draggedSource: draggedItem.source // Add draggedSource for staging logic
        },
        requestId: Date.now() // For matching responses
      }
    };

    console.log(`[DRAG_HANDLERS] 📤 SENDING TO SERVER - Potential Staging Action:`, {
      draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
      draggedSource: draggedItem.source,
      targetType: targetInfo.type,
      targetCard: targetInfo.card ? `${targetInfo.card.rank}${targetInfo.card.suit}` : 'null',
      hasStagingPotential: (draggedItem.source === 'hand' && targetInfo.type === 'loose'),
      payloadDraggedSource: actionPayload.payload.targetInfo.draggedSource
    });

    console.log('[STAGING DROP SENT TO SERVER]', {
      source: draggedItem.source,
      targetType: targetInfo.type,
      draggedCardId: draggedItem.card.id,
      targetCardId: targetInfo.card?.id
    });

    console.log(`[DRAG_HANDLERS] 🔍 DEBUG: Sending card-drop action to server`, {
      actionType: 'card-drop',
      draggedItem: {
        card: `${draggedItem.card.rank}${draggedItem.card.suit}`,
        source: draggedItem.source,
        player: draggedItem.player
      },
      targetInfo: {
        type: targetInfo.type,
        card: targetInfo.card ? `${targetInfo.card.rank}${targetInfo.card.suit}` : null,
        index: targetInfo.index,
        draggedSource: draggedItem.source
      },
      requestId: actionPayload.payload.requestId
    });

    sendAction(actionPayload);

    return true;
  }, [isMyTurn, gameState.currentPlayer, setCardToReset, setErrorModal, sendAction]);

  const handleTableCardDragStart = useCallback((card: any) => {
    console.log(`🎴 Table drag start: ${card.rank}${card.suit}`);
    if (!isMyTurn) {
      console.log(`❌ Not my turn - ignoring table drag`);
      return;
    }
    setDraggedCard(card);
    setIsDragging(true);
  }, [isMyTurn]);

  const handleTableCardDragEnd = useCallback((draggedItem: { card: any; source?: string }, dropPosition: any) => {
    console.log(`🌟 [TableDrag] Table card drag end:`, draggedItem, dropPosition);
    console.log(`🌟 [TableDrag] Dragged card: ${draggedItem.card.rank}${draggedItem.card.suit}`);
    console.log(`🌟 [TableDrag] Drop position handled: ${dropPosition.handled}`);

    setDraggedCard(null);
    setIsDragging(false);

    // Handle table-to-table drops through Phase 2 system
    if (dropPosition.handled) {
      console.log(`🌟 [TableDrag] Table card drop was handled by a zone`, {
        handled: dropPosition.handled,
        zoneHandledBy: 'unknown'
      });

      // Check if this is a table zone detected drop (table-to-loose staging)
      if (dropPosition.tableZoneDetected) {
        console.log(`🌟 [TableDrag] 🎯 TABLE-TO-LOOSE STAGING DETECTED - sending action to server`, {
          draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit} (val:${draggedItem.card.value})`,
          tableZoneDetected: dropPosition.tableZoneDetected,
          needsServerValidation: dropPosition.needsServerValidation,
          targetType: dropPosition.targetType,
          targetCard: dropPosition.targetCard ? `${dropPosition.targetCard.rank}${dropPosition.targetCard.suit}` : 'none'
        });
        // Validate target card exists
        if (!dropPosition.targetCard) {
          console.error(`🌟 [TableDrag] ❌ No target card detected for table-to-loose drop`, {
            draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
            dropPosition
          });
          return;
        }

        console.log(`🎯 [STAGING_DEBUG] TABLE CARD STAGING: ${draggedItem.card.rank}${draggedItem.card.suit} → loose ${dropPosition.targetCard.rank}${dropPosition.targetCard.suit} - EXPECT STAGING OVERLAY`);

        // For table-to-loose drops, send card-drop action to trigger staging
        // Use the actual target information detected by the drop zone
        const targetIndex = gameState.tableCards.findIndex((card: any) => {
          if (!card || typeof card !== 'object') return false;
          // Check if it's a loose card (no type property or type === 'loose')
          const isLooseCard = 'rank' in card && 'suit' in card && (!('type' in card) || (card as any).type === 'loose');
          if (!isLooseCard) return false;
          // Match the target card detected by drop zone
          return card.rank === dropPosition.targetCard.rank &&
                 card.suit === dropPosition.targetCard.suit;
        });

        console.log(`🌟 [TableDrag] Target card lookup:`, {
          targetCard: dropPosition.targetCard,
          foundAtIndex: targetIndex,
          totalTableCards: gameState.tableCards.length
        });

        if (targetIndex === -1) {
          console.error(`🌟 [TableDrag] ❌ Could not find target card in table state`, {
            targetCard: dropPosition.targetCard,
            tableCards: gameState.tableCards.map((c: any) => c ? `${c.rank}${c.suit}` : 'null')
          });
          return;
        }

        const actionPayload = {
          type: 'card-drop',
          payload: {
            draggedItem: {
              card: draggedItem.card,
              source: 'table',
              player: playerNumber
            },
            targetInfo: {
              type: 'loose',
              card: dropPosition.targetCard, // Use actual target card
              index: targetIndex, // Use actual target index
              draggedSource: 'table'
            },
            requestId: Date.now()
          }
        };

        console.log(`🌟 [TableDrag] 🚀 SENDING TABLE-TO-LOOSE STAGING ACTION TO SERVER:`, {
          actionType: 'card-drop',
          draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
          player: playerNumber,
          requestId: actionPayload.payload.requestId
        });

        sendAction(actionPayload);

        console.log(`🌟 [TableDrag] ✅ Table-to-loose staging action sent - expecting temp stack creation and overlay`);
        return;
      }

      // For fully validated drops (contactValidated = true), no server routing needed
      if (dropPosition.contactValidated) {
        console.log(`🌟 [TableDrag] Table card drop was fully validated - no server routing needed`, {
          contactValidated: dropPosition.contactValidated,
          handledWithoutServer: true
        });
        return;
      }
    }

    // If not handled by any zone, it's an invalid drop - snap back
    console.log(`[GameBoard] Table card drop not handled by any zone - snapping back`);
  }, [sendAction, gameState.tableCards, playerNumber]);

  const handleCapturedCardDragStart = useCallback((card: any) => {
    console.log(` [CapturedDrag] Captured card drag start:`, card);
    if (!isMyTurn) {
      console.log(`❌ Not your turn - ignoring captured card drag`);
      return;
    }
    setDraggedCard(card);
    setIsDragging(true);
  }, [isMyTurn]);

  const handleCapturedCardDragEnd = useCallback((draggedItem: any, dropPosition: any) => {
    console.log(`🃏 [CapturedDrag] Captured card drag end:`, draggedItem, dropPosition);
    console.log(`🃏 [CapturedDrag] Dragged card: ${draggedItem.card.rank}${draggedItem.card.suit} from opponent's captures`);

    setDraggedCard(null);
    setIsDragging(false);

    // Handle captured card drops through same drop system
    if (dropPosition.handled) {
      console.log(` [CapturedDrag] Captured card drop was handled by a zone`);
      // The drop zone handlers will route this through Phase 2 system
      return;
    }

    // Invalid drop - snap back to opponent's capture pile (no visual source)
    console.log(`🃏 [CapturedDrag] Captured card drop not handled - snapping back`);
  }, []);

  return {
    draggedCard,
    isDragging,
    dragTurnState,
    handleDragStart,
    handleDragEnd,
    handleDropOnCard,
    handleTableCardDragStart,
    handleTableCardDragEnd,
    handleCapturedCardDragStart,
    handleCapturedCardDragEnd
  };
}

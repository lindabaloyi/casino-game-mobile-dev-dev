/**
 * useOptimisticGameState
 * 
 * Provides optimistic UI updates that apply immediately without waiting for server response.
 * This hook wraps the base game state and provides a function to apply optimistic changes.
 * 
 * Key features:
 * - Immediate card removal from hand on trail/capture/build
 * - Immediate card addition to table on trail
 * - Automatic rollback on server rejection
 * - Sync with server state on each update
 * 
 * Usage:
 *   const { optimisticState, applyOptimisticAction, rollback } = useOptimisticGameState(gameState);
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface Card {
  rank: string;
  suit: string;
  value: number;
}

export interface Player {
  id: number;
  name: string;
  hand: Card[];
  captures: Card[];
  score: number;
  team?: 'A' | 'B';
  buildStacks?: any[];
}

export interface TableCard extends Card {
  id: string;
  type?: 'temp_stack' | 'build_stack';
  stackId?: string;
  owner?: number;
}

export interface GameState {
  deck: Card[];
  players: Player[];
  table: Card[];
  // Use any to accommodate different definitions in the codebase
  tableCards: any[];
  currentPlayer: number;
  round: number;
  scores: number[];
  playerCount: number;
  turnCounter: number;
  moveCount: number;
  gameOver: boolean;
  gameMode?: string;
  teamScores?: [number, number];
  shiyaRecalls?: any;
  teamCapturedBuilds?: any;
  pendingChoice?: any;
  roundEndReason?: string;
  // ... other fields
}

export interface GameAction {
  type: string;
  payload?: Record<string, unknown>;
  playerIndex?: number;
  card?: Card;
  optimisticId?: string; // Unique ID for rollback tracking
}

// Clone game state for optimistic mutations
function cloneGameState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

// Get card ID for comparison
function getCardId(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function useOptimisticGameState(baseGameState: GameState | null) {
  // Optimistic state starts as clone of base state
  const [optimisticState, setOptimisticState] = useState<GameState | null>(
    baseGameState ? cloneGameState(baseGameState) : null
  );

  // Track pending actions for rollback
  const pendingActions = useRef<GameAction[]>([]);

  // Sync with base state when it changes (server confirmed)
  // Only apply if we don't have pending changes (to avoid overwriting optimistic updates)
  useEffect(() => {
    if (!baseGameState) {
      setOptimisticState(null);
      return;
    }

    // If we have pending actions, the server state might have incorporated them
    // We need to compare and decide whether to use server state or keep optimistic
    if (pendingActions.current.length === 0) {
      // No pending actions - sync directly with server
      setOptimisticState(cloneGameState(baseGameState));
    } else {
      // Check if our optimistic changes have been confirmed by server
      // by comparing card counts
      const optimisticHand = optimisticState?.players?.[0]?.hand?.length ?? 0;
      const serverHand = baseGameState.players?.[0]?.hand?.length ?? 0;
      
      if (optimisticHand === serverHand) {
        // Server has processed our changes - sync with server
        console.log('[useOptimisticGameState] Server confirmed changes, syncing state');
        setOptimisticState(cloneGameState(baseGameState));
        pendingActions.current = [];
      } else {
        // Server hasn't processed yet - keep optimistic state
        console.log('[useOptimisticGameState] Pending changes, keeping optimistic state');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseGameState]); // Only depend on baseGameState - never include state variables

  // Apply optimistic action - returns new optimistic state immediately
  const applyOptimisticAction = useCallback((action: GameAction): GameState | null => {
    if (!optimisticState) {
      console.log('[useOptimisticGameState] No optimistic state, cannot apply');
      return null;
    }

    console.log('[useOptimisticGameState] Applying optimistic action:', action.type, action.card?.rank, action.card?.suit);

    const newState = cloneGameState(optimisticState);
    const playerIndex = action.playerIndex ?? newState.currentPlayer;
    const player = newState.players?.[playerIndex];

    if (!player) {
      console.log('[useOptimisticGameState] Player not found:', playerIndex);
      return optimisticState;
    }

    switch (action.type) {
      case 'trail': {
        // Remove card from hand
        const cardToTrail = action.card;
        if (cardToTrail) {
          const cardId = getCardId(cardToTrail);
          player.hand = player.hand.filter(c => getCardId(c) !== cardId);
          
          // Add to table immediately
          const tableCard: TableCard = {
            ...cardToTrail,
            id: cardId,
          };
          newState.tableCards = [...(newState.tableCards || []), tableCard];
          
          console.log('[useOptimisticGameState] Trail applied:', cardToTrail.rank, cardToTrail.suit);
        }
        break;
      }

      case 'capture':
      case 'captureOpponent': {
        // Remove card from hand
        const capturedCard = action.card;
        if (capturedCard) {
          const cardId = getCardId(capturedCard);
          player.hand = player.hand.filter(c => getCardId(c) !== cardId);
          
          // Add to player's captures immediately
          player.captures = [...(player.captures || []), capturedCard];
          
          console.log('[useOptimisticGameState] Capture applied:', capturedCard.rank, capturedCard.suit);
        }
        break;
      }

      case 'createTemp': {
        // Remove card from hand and add as temp stack on table
        const card = action.card;
        if (card && card.rank && card.suit) {
          const cardId = getCardId(card);
          player.hand = player.hand.filter(c => getCardId(c) !== cardId);
          
          // Only create temp stack if we have valid card data
          const tempStack: TableCard = {
            rank: card.rank,
            suit: card.suit,
            value: card.value,
            id: `temp_${cardId}`,
            type: 'temp_stack',
            stackId: `temp_${Date.now()}`,
            owner: playerIndex,
          };
          newState.tableCards = [...(newState.tableCards || []), tempStack];
          
          console.log('[useOptimisticGameState] CreateTemp applied:', card.rank, card.suit);
        }
        break;
      }

      case 'addToTemp': {
        // Remove card from hand and add to existing temp stack
        const card = action.card;
        const stackId = action.payload?.stackId as string;
        
        if (card && stackId) {
          const cardId = getCardId(card);
          player.hand = player.hand.filter(c => getCardId(c) !== cardId);
          
          // Find and update temp stack
          const tempStack = newState.tableCards?.find(
            (tc: TableCard) => tc.stackId === stackId && tc.type === 'temp_stack'
          );
          
          if (tempStack) {
            // Add card to stack - need to track cards in stack
            // For now, just note the stack was modified
            console.log('[useOptimisticGameState] AddToTemp applied:', card.rank, card.suit, 'to stack:', stackId);
          }
        }
        break;
      }

      case 'dropToCapture': {
        // Move entire temp/build stack to captures
        const stackId = action.payload?.stackId as string;
        
        if (stackId) {
          // Find all cards in the stack
          const stackCards = newState.tableCards?.filter(
            (tc: TableCard) => tc.stackId === stackId
          ) || [];
          
          // Add all cards to player's captures
          player.captures = [...(player.captures || []), ...stackCards.map(c => ({
            rank: c.rank,
            suit: c.suit,
            value: c.value,
          }))];
          
          // Remove stack from table
          newState.tableCards = newState.tableCards?.filter(
            (tc: TableCard) => tc.stackId !== stackId
          ) || [];
          
          console.log('[useOptimisticGameState] DropToCapture applied for stack:', stackId);
        }
        break;
      }

      case 'stealBuild':
      case 'startBuildCapture': {
        // Remove card from hand, add to captures, update build ownership
        const card = action.card;
        
        if (card) {
          const cardId = getCardId(card);
          player.hand = player.hand.filter(c => getCardId(c) !== cardId);
          
          // Card goes to captures
          player.captures = [...(player.captures || []), card];
          
          console.log('[useOptimisticGameState] StealBuild applied:', card.rank, card.suit);
        }
        break;
      }

      case 'acceptTemp':
      case 'extendBuild':
      case 'acceptBuildExtension': {
        // Convert temp stack to build - remove from table, ownership changes
        const stackId = action.payload?.stackId as string;
        
        if (stackId) {
          // Find temp stack
          const tempStack = newState.tableCards?.find(
            (tc: TableCard) => tc.stackId === stackId && tc.type === 'temp_stack'
          );
          
          if (tempStack) {
            // Change to build stack
            tempStack.type = 'build_stack';
            console.log('[useOptimisticGameState] AcceptTemp applied, converted to build:', stackId);
          }
        }
        break;
      }

      case 'cancelTemp': {
        // Remove temp stack from table, cards return to owner
        const stackId = action.payload?.stackId as string;
        
        if (stackId) {
          const stackCards = newState.tableCards?.filter(
            (tc: TableCard) => tc.stackId === stackId
          ) || [];
          
          // Return cards to original owner
          stackCards.forEach((tc: TableCard) => {
            const owner = tc.owner ?? 0;
            const ownerPlayer = newState.players?.[owner];
            if (ownerPlayer) {
              ownerPlayer.hand = [...(ownerPlayer.hand || []), {
                rank: tc.rank,
                suit: tc.suit,
                value: tc.value,
              }];
            }
          });
          
          // Remove stack from table
          newState.tableCards = newState.tableCards?.filter(
            (tc: TableCard) => tc.stackId !== stackId
          ) || [];
          
          console.log('[useOptimisticGameState] CancelTemp applied for stack:', stackId);
        }
        break;
      }

      case 'endTurn': {
        // Advance to next player
        newState.currentPlayer = (playerIndex + 1) % newState.playerCount;
        console.log('[useOptimisticGameState] EndTurn applied, next player:', newState.currentPlayer);
        break;
      }

      default:
        console.log('[useOptimisticGameState] Unknown action type:', action.type);
        return optimisticState;
    }

    // Track this action for potential rollback
    pendingActions.current.push(action);
    
    // Update optimistic state
    setOptimisticState(newState);
    
    return newState;
  }, [optimisticState]);

  // Rollback last pending action
  const rollback = useCallback((action: GameAction) => {
    console.log('[useOptimisticGameState] Rolling back action:', action.type);
    
    // Remove from pending actions
    pendingActions.current = pendingActions.current.filter(
      a => a.type !== action.type || a.card !== action.card
    );
    
    // Sync with server state
    if (baseGameState) {
      setOptimisticState(cloneGameState(baseGameState));
    }
  }, [baseGameState]);

  // Clear all pending actions (called when server confirms all)
  const confirmAll = useCallback(() => {
    console.log('[useOptimisticGameState] Server confirmed all actions');
    pendingActions.current = [];
    
    if (baseGameState) {
      setOptimisticState(cloneGameState(baseGameState));
    }
  }, [baseGameState]);

  return {
    /** Optimistic game state - apply actions to this instead of waiting for server */
    optimisticState,
    /** Apply an action optimistically - returns new state immediately */
    applyOptimisticAction,
    /** Rollback an action if server rejects it */
    rollback,
    /** Confirm all pending actions - called when server confirms */
    confirmAll,
    /** Check if there are pending optimistic changes */
    hasPendingChanges: pendingActions.current.length > 0,
  };
}

export default useOptimisticGameState;

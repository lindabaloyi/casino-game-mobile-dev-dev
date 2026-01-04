import { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';

/**
 * Custom hook to manage all temp stack operations in GameBoard
 * Consolidates stack finalization, cancellation, accept/reject logic
 */
export function useTempStacks({
  gameState,
  sendAction
}: {
  gameState: any;
  sendAction: (action: any) => void;
}) {
  // 🎯 EXECUTE ACTION FUNCTION (handles both capture and build)
  const executeAction = useCallback((validation: any) => {
    console.log('🚀 [EXECUTE] ===== STARTING ACTION EXECUTION =====');
    console.log('🚀 [EXECUTE] Validation details:', {
      type: validation.type,
      action: validation.action,
      serverAction: validation.serverAction,
      value: validation.value,
      stackId: validation.stackId
    });

    // Find the temp stack again
    const tempStack = gameState.tableCards.find((c: any) =>
      'stackId' in c && c.stackId === validation.stackId
    );

    if (!tempStack) {
      console.error('❌ [EXECUTE] Stack not found:', validation.stackId);
      return;
    }

    console.log('✅ [EXECUTE] Found stack, preparing payload...');

    // Prepare action payload
    const actionType = validation.serverAction;
    const payload = {
      stack: tempStack,
      ...(validation.action === 'BUILD' && { buildValue: validation.value })
    };

    console.log('📤 [EXECUTE] Sending action to server:', {
      actionType,
      payloadKeys: Object.keys(payload),
      stackId: tempStack.stackId,
      buildValue: validation.action === 'BUILD' ? validation.value : 'N/A'
    });

    // Send to server
    sendAction({
      type: actionType,
      payload
    });

    console.log('✅ [EXECUTE] ===== ACTION SENT SUCCESSFULLY =====');
  }, [gameState.tableCards, sendAction]);

  // 🎯 ALERT FUNCTIONS FOR USER FEEDBACK
  const showCaptureConfirmation = useCallback((validation: any) => {
    const message = validation.type === 'SAME_VALUE_CAPTURE'
      ? `Capture ${validation.count} ${validation.value}s?`
      : `Capture sum ${validation.value}?`;

    console.log('🎯 [UI] Showing CAPTURE confirmation:', message);

    Alert.alert(
      'Confirm Capture',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Capture',
          onPress: () => {
            console.log('✅ [UI] User confirmed CAPTURE');
            executeAction(validation);
          }
        }
      ]
    );
  }, [executeAction]);

  const showBuildConfirmation = useCallback((validation: any) => {
    const message = `Create build totaling ${validation.value}? (Need ${validation.value} to capture later)`;

    console.log('🏗️ [UI] Showing BUILD confirmation:', message);

    Alert.alert(
      'Create Build',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create Build',
          onPress: () => {
            console.log('✅ [UI] User confirmed BUILD');
            executeAction(validation);
          }
        }
      ]
    );
  }, [executeAction]);

  const showValidationError = useCallback((reason: string) => {
    console.log('❌ [UI] Showing validation error:', reason);

    Alert.alert(
      'Cannot Proceed',
      reason,
      [{ text: 'OK' }]
    );
  }, []);
  // 🎯 CORRECTED BASIC CAPTURE VALIDATION FUNCTION
  const validateBasicCapture = useCallback((tempStack: any, playerHand: any[]) => {
    console.log('🎯 [VALIDATION] ===== STARTING VALIDATION =====');
    console.log('🎯 [VALIDATION] Stack ID:', tempStack.stackId);
    console.log('🎯 [VALIDATION] Stack cards:', tempStack.cards?.map((c: any) => `${c.rank}${c.suit}(${c.value})`));
    console.log('🎯 [VALIDATION] Player hand:', playerHand.map((c: any) => `${c.rank}${c.suit}(${c.value})`));

    // RULE 1: Need at least 2 cards
    if (!tempStack.cards || tempStack.cards.length < 2) {
      console.log('❌ [VALIDATION] RULE 1 FAILED: Need at least 2 cards');
      return {
        valid: false,
        reason: 'Need at least 2 cards',
        type: 'INSUFFICIENT_CARDS',
        action: 'INVALID'
      };
    }
    console.log('✅ [VALIDATION] RULE 1 PASSED: Has', tempStack.cards.length, 'cards');

    const allSameValue = tempStack.cards.every((card: any) => card.value === tempStack.cards[0].value);
    const totalValue = tempStack.cards.reduce((sum: number, card: any) => sum + card.value, 0);

    console.log('🧮 [VALIDATION] Analysis:', {
      allSameValue,
      totalValue,
      firstCardValue: tempStack.cards[0]?.value
    });

    // RULE 2: All cards same value (requires matching card to capture)
    if (allSameValue) {
      const targetValue = tempStack.cards[0].value;
      const hasMatchingCard = playerHand.some((card: any) => card.value === targetValue);

      console.log('🎯 [VALIDATION] RULE 2 - Same value check:', {
        targetValue,
        hasMatchingCard,
        matchingCardsInHand: playerHand.filter((c: any) => c.value === targetValue).length
      });

      if (hasMatchingCard) {
        console.log('✅ [VALIDATION] RULE 2 PASSED: Can capture same values');
        return {
          valid: true,
          type: 'SAME_VALUE_CAPTURE',
          action: 'CAPTURE',
        serverAction: 'finalizeTemp',
          stackId: tempStack.stackId,
          value: targetValue,
          count: tempStack.cards.length,
          reason: `Capture ${tempStack.cards.length} ${targetValue}s`
        };
      } else {
        console.log('❌ [VALIDATION] RULE 2 FAILED: No matching card for same values');
        return {
          valid: false,
          reason: `Need ${targetValue} in hand to capture same values`,
          type: 'MISSING_CAPTURE_CARD',
          action: 'INVALID'
        };
      }
    }

    // RULE 3: Sum ≤ 10 (CAN capture OR build)
    console.log('🧮 [VALIDATION] RULE 3 - Sum check:', { totalValue, maxAllowed: 10 });

    if (totalValue <= 10) {
      const hasSumCard = playerHand.some((card: any) => card.value === totalValue);

      console.log('🎯 [VALIDATION] RULE 3 - Sum availability:', {
        hasSumCard,
        sumCardsInHand: playerHand.filter((c: any) => c.value === totalValue).length
      });

      if (hasSumCard) {
        console.log('✅ [VALIDATION] RULE 3 PASSED: Can CAPTURE sum immediately');
        return {
          valid: true,
          type: 'SUM_CAPTURE',
          action: 'CAPTURE',
          serverAction: 'finalizeTemp',
          stackId: tempStack.stackId,
          value: totalValue,
          reason: `Capture sum ${totalValue} immediately`
        };
      } else {
        console.log('✅ [VALIDATION] RULE 3 PASSED: Can BUILD (no sum card needed)');
        return {
          valid: true, // ← CRITICAL FIX: BUILDS ARE VALID!
          type: 'BUILD',
          action: 'BUILD',
          serverAction: 'createBuildWithValue',
          stackId: tempStack.stackId,
          value: totalValue,
          reason: `Create build totaling ${totalValue}. Need ${totalValue} in hand to capture later.`
        };
      }
    }

    // RULE 4: Total > 10 (invalid)
    console.log('❌ [VALIDATION] RULE 4 FAILED: Total > 10');
    return {
      valid: false,
      reason: `Total ${totalValue} > 10 (cannot build or capture)`,
      type: 'TOTAL_TOO_HIGH',
      action: 'INVALID'
    };
  }, []);

  const findStackById = useCallback((stackId: string) => {
    return gameState.tableCards.find((c: any) => 'stackId' in c && c.stackId === stackId);
  }, [gameState.tableCards]);

  const handleFinalizeStack = useCallback((stackId: string) => {
    console.log(`[GameBoard] Finalizing stack:`, stackId);
    const stack = findStackById(stackId);
    if (stack && 'stackId' in stack) {
      sendAction({
        type: 'finalizeTemp',
        payload: { stack }
      });
    } else {
      console.error(`[GameBoard] Stack not found:`, stackId);
    }
  }, [findStackById, sendAction]);

  const handleCancelStack = useCallback((stackId: string) => {
    console.log(`[GameBoard] Canceling stack:`, stackId);
    const stackToCancel = findStackById(stackId);
    if (stackToCancel && 'stackId' in stackToCancel) {
      sendAction({
        type: 'cancelTemp',
        payload: { stackToCancel }
      });
    } else {
      console.error(`[GameBoard] Stack not found:`, stackId);
    }
  }, [findStackById, sendAction]);

  const handleTempAccept = useCallback((stackId: string) => {
    console.log('✅ [ACCEPT_CLICKED] ===== ACCEPT BUTTON PRESSED =====');
    console.log('✅ [ACCEPT_CLICKED] Stack ID:', stackId);

    const tempStack = findStackById(stackId);
    if (!tempStack) {
      console.error('❌ [ACCEPT_CLICKED] Temp stack not found:', stackId);
      return;
    }

    console.log('📊 [ACCEPT_CLICKED] Temp stack found:', {
      cards: tempStack.cards?.map((c: any) => `${c.rank}${c.suit}(${c.value})`),
      cardCount: tempStack.cards?.length || 0
    });

    // Get current player's hand
    const playerHand = gameState.playerHands[gameState.currentPlayer] || [];
    console.log('👤 [ACCEPT_CLICKED] Current player hand:', playerHand.map((c: any) => `${c.rank}${c.suit}(${c.value})`));

    // 🎯 RUN VALIDATION
    console.log('🎯 [ACCEPT_CLICKED] ===== RUNNING VALIDATION =====');
    const validation = validateBasicCapture(tempStack, playerHand);

    console.log('🎯 [ACCEPT_CLICKED] ===== VALIDATION RESULT =====');
    console.log('🎯 [ACCEPT_CLICKED] Result:', {
      valid: validation.valid,
      type: validation.type,
      action: validation.action,
      reason: validation.reason
    });

    if (validation.valid) {
      console.log('✅ [ACCEPT_CLICKED] Validation PASSED - showing confirmation');

      if (validation.action === 'CAPTURE') {
        showCaptureConfirmation({ ...validation, stackId });
      } else if (validation.action === 'BUILD') {
        showBuildConfirmation({ ...validation, stackId });
      } else {
        console.error('❌ [ACCEPT_CLICKED] Unknown action type:', validation.action);
      }
    } else {
      console.log('❌ [ACCEPT_CLICKED] Validation FAILED - showing error');
      showValidationError(validation.reason);
    }

    console.log('✅ [ACCEPT_CLICKED] ===== ACCEPT HANDLING COMPLETE =====');
  }, [findStackById, gameState.playerHands, gameState.currentPlayer, validateBasicCapture, showCaptureConfirmation, showBuildConfirmation, showValidationError]);

  const handleTempReject = useCallback((stackId: string) => {
    console.log(`[TEMP_STACKS] ❌ CANCELING temp stack (SERVER-SIDE):`, {
      stackId,
      actionType: 'cancelTemp',
      timestamp: Date.now(),
      serverCall: true
    });

    // Use the existing handleCancelStack function that sends to server
    // This will trigger the server-side cancelTemp action
    // which properly restores cards to their original sources
    handleCancelStack(stackId);

    console.log(`[TEMP_STACKS] 📤 Server cancel initiated - expecting proper card restoration:`, {
      stackId,
      serverAction: 'cancelTemp',
      expectedOutcome: 'hand-cards-return-to-hand'
    });
  }, [handleCancelStack]);

  // 🎯 DEBUG LOGGING
  useEffect(() => {
    console.log('🎴 [TEMP_STACKS_DEBUG] Current stacks:', {
      totalStacks: gameState.tableCards?.filter((c: any) => 'stackId' in c).length || 0,
      stacks: gameState.tableCards?.filter((c: any) => 'stackId' in c).map((stack: any, i: number) => ({
        index: i,
        id: stack.stackId,
        cards: stack.cards?.map((c: any) => `${c.value}`).join(', ') || 'none',
        owner: stack.owner
      })) || []
    });
  }, [gameState.tableCards]);

  return {
    handleFinalizeStack,
    handleCancelStack,
    handleTempAccept,
    handleTempReject
  };
}

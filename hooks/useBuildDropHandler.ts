/**
 * useBuildDropHandler - Hook for handling build drop logic
 * Separated from BuildCardRenderer for better organization and testability
 */

import { useCallback } from 'react';

interface BuildDropHandlerProps {
  buildItem: any;
  currentPlayer: number;
  sendAction: (action: any) => void;
}

export function useBuildDropHandler({
  buildItem,
  currentPlayer,
  sendAction
}: BuildDropHandlerProps) {

  // Handle drops on builds - with validation for temp stack augmentation
  const handleBuildDrop = useCallback((draggedItem: any) => {
    console.log('[BUILD_DROP_HANDLER] 🚀 ENTERING handleBuildDrop', {
      buildId: buildItem.buildId,
      buildItem: buildItem,
      draggedItem: draggedItem,
      draggedCard: draggedItem.card ? `${draggedItem.card.rank}${draggedItem.card.suit}` : 'none',
      draggedType: draggedItem.type || 'unknown',
      draggedSource: draggedItem.source,
      buildOwner: buildItem.owner,
      currentPlayer,
      timestamp: new Date().toISOString()
    });

    // CRITICAL: Log build selection for debugging
    console.log('[UI_BUILD_SELECTION_CRITICAL] User dropped on build:', {
      selectedBuildId: buildItem.buildId,
      selectedBuildValue: buildItem.value,
      selectedBuildCards: buildItem.cards?.length || 0,
      draggedCard: draggedItem.card ? `${draggedItem.card.rank}${draggedItem.card.suit}` : 'none',
      draggedValue: draggedItem.card?.value,
      totalValueWouldBe: buildItem.value + (draggedItem.card?.value || 0),
      timestamp: Date.now()
    });

    // ✅ VALIDATION: Ownership check
    if (buildItem.owner !== currentPlayer) {
      console.log('[BUILD_DROP_HANDLER] ❌ Not build owner - rejecting augmentation:', {
        buildOwner: buildItem.owner,
        currentPlayer,
        buildId: buildItem.buildId
      });
      return false;
    }

    if (!sendAction) {
      console.error('[BUILD_DROP_HANDLER] ❌ No sendAction provided - cannot send action');
      return false;
    }

    // Check if this is a temp stack being dragged for augmentation
    const isTempStackAugmentation = draggedItem.type === 'tempStack' || draggedItem.stackId;

    if (isTempStackAugmentation) {
      console.log('[BUILD_DROP_HANDLER] 🏗️ TEMP STACK TO BUILD AUGMENTATION DETECTED:', {
        buildId: buildItem.buildId,
        buildValue: buildItem.value,
        tempStackId: draggedItem.stackId,
        tempStackValue: draggedItem.value,
        tempStackCards: draggedItem.cards?.length || 0,
        validationRequired: draggedItem.value !== buildItem.value
      });

      // Client-side validation: temp stack value must match build value for augmentation
      if (draggedItem.value !== buildItem.value) {
        console.log('[BUILD_DROP_HANDLER] ❌ VALIDATION FAILED - Value mismatch:', {
          tempStackValue: draggedItem.value,
          buildValue: buildItem.value,
          expected: 'values must match for augmentation'
        });
        // Could show user feedback here
        return false;
      }

      console.log('[BUILD_DROP_HANDLER] ✅ CLIENT VALIDATION PASSED - Sending validateBuildAugmentation action');

      // Send validateBuildAugmentation action for temp stack to build augmentation
      sendAction({
        type: 'validateBuildAugmentation',
        payload: {
          buildId: buildItem.buildId,
          tempStackId: draggedItem.stackId
        }
      });

      return true;
    }

    // Create build augmentation staging stack (universal staging system)
    console.log('[BUILD_DROP_HANDLER] ✅ Creating build augmentation staging stack:', {
      buildId: buildItem.buildId,
      draggedCard: draggedItem.card ? `${draggedItem.card.rank}${draggedItem.card.suit}` : 'none',
      source: draggedItem.source,
      reason: 'Using universal staging system for better UX'
    });

    // Send createTableToBuildAugmentationStagingStack action
    sendAction({
      type: 'createTableToBuildAugmentationStagingStack',
      payload: {
        buildId: buildItem.buildId,
        card: draggedItem.card,
        sourceCardIndex: draggedItem.originalIndex // From TableDraggableCard
      }
    });

    return true;
  }, [buildItem.buildId, buildItem.owner, buildItem.value, currentPlayer, sendAction]);

  return { handleBuildDrop };
}

/**
 * BuildCardRenderer
 * Handles rendering and interaction for build items on the table
 * Extracted from TableCards.tsx to focus on build logic
 */

import React, { useRef } from 'react';
import { View } from 'react-native';
import { TableCard } from '../../multiplayer/server/game-logic/game-state';
import { CardType } from '../card';
import CardStack from '../CardStack';

interface BuildCardRendererProps {
  tableItem: TableCard;
  index: number;
  baseZIndex: number;
  dragZIndex: number;
  currentPlayer: number;
  onDropStack?: (draggedItem: any) => boolean | any; // Made optional since we'll handle it internally
  sendAction?: (action: any) => void; // Add sendAction for direct server communication
}

export function BuildCardRenderer({
  tableItem,
  index,
  baseZIndex,
  dragZIndex,
  currentPlayer,
  onDropStack,
  sendAction
}: BuildCardRendererProps) {
  // Type assertion for build item
  const buildItem = tableItem as any; // Build has type: 'build' with additional properties
  const stackId = buildItem.buildId; // ✅ Use actual build ID instead of render index
  const stackRef = useRef<View>(null);

  // 🎯 [BUILD_RENDER] DEBUG: Log when build is being rendered
  console.log('[BUILD_RENDER] 🎯 Rendering build:', {
    buildId: buildItem.buildId,
    type: buildItem.type,  // Should be 'build'
    owner: buildItem.owner,
    value: buildItem.value,
    cardCount: (buildItem.cards || []).length,
    index,
    fullItem: buildItem,  // Check the actual object
    timestamp: Date.now()
  });

  // Build items can have multiple cards, or a single card representation
  const buildCards = buildItem.cards || [tableItem as CardType];

  // Handle drops on builds - with validation for temp stack augmentation
  const handleBuildDrop = React.useCallback((draggedItem: any) => {
    console.log('[FUNCTION] 🚀 ENTERING handleBuildDrop', {
      buildId: buildItem.buildId,
      draggedItem: draggedItem,
      draggedCard: draggedItem.card ? `${draggedItem.card.rank}${draggedItem.card.suit}` : 'none',
      draggedType: draggedItem.type || 'unknown',
      timestamp: Date.now()
    });

    // ✅ VALIDATION: Ownership check
    if (buildItem.owner !== currentPlayer) {
      console.log('[BUILD_DROP] ❌ Not build owner - rejecting augmentation:', {
        buildOwner: buildItem.owner,
        currentPlayer,
        buildId: buildItem.buildId
      });
      return false;
    }

    if (!sendAction) {
      console.error('[BUILD_DROP] ❌ No sendAction provided - cannot send action');
      return false;
    }

    // Check if this is a temp stack being dragged for augmentation
    const isTempStackAugmentation = draggedItem.type === 'tempStack' || draggedItem.stackId;

    if (isTempStackAugmentation) {
      console.log('[BUILD_AUGMENTATION] 🏗️ TEMP STACK TO BUILD AUGMENTATION DETECTED:', {
        buildId: buildItem.buildId,
        buildValue: buildItem.value,
        tempStackId: draggedItem.stackId,
        tempStackValue: draggedItem.value,
        tempStackCards: draggedItem.cards?.length || 0,
        validationRequired: draggedItem.value !== buildItem.value
      });

      // Client-side validation: temp stack value must match build value for augmentation
      if (draggedItem.value !== buildItem.value) {
        console.log('[BUILD_AUGMENTATION] ❌ VALIDATION FAILED - Value mismatch:', {
          tempStackValue: draggedItem.value,
          buildValue: buildItem.value,
          expected: 'values must match for augmentation'
        });
        // Could show user feedback here
        return false;
      }

      console.log('[BUILD_AUGMENTATION] ✅ CLIENT VALIDATION PASSED - Sending validateBuildAugmentation action');

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

    // Regular card augmentation (existing logic)
    console.log('[BUILD_DROP] ✅ Accepting card for build augmentation:', {
      buildId: buildItem.buildId,
      draggedCard: draggedItem.card ? `${draggedItem.card.rank}${draggedItem.card.suit}` : 'none',
      source: draggedItem.source,
      reason: 'Flexible build system - ownership only validation'
    });

    // Send addToBuilding action - let server handle all validation
    sendAction({
      type: 'addToBuilding',
      payload: {
        buildId: buildItem.buildId,
        card: draggedItem.card,
        source: draggedItem.source
      }
    });

    return true;
  }, [buildItem.buildId, buildItem.owner, buildItem.value, currentPlayer, sendAction]);

  // Removed: Priority-based drop zone registration
  // Contact system now handles all drop detection

  // Register build position with contact detection system
  React.useEffect(() => {
    if (!stackRef.current) return;

    const buildId = buildItem.buildId;

    const measureAndReport = () => {
      stackRef.current?.measureInWindow((x, y, width, height) => {
        // Skip invalid measurements
        if (x === 0 && y === 0 && width === 0 && height === 0) {
          console.log('[BUILD_CONTACT] Invalid measurement for build:', buildId);
          return;
        }

        console.log('[BUILD_CONTACT] 📍 Reporting build position for contact detection:', {
          id: buildId,
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(width),
          height: Math.round(height),
          type: 'build',
          owner: buildItem.owner,
          value: buildItem.value
        });

        // Import and use reportPosition from contactDetection
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { reportPosition } = require('../../src/utils/contactDetection');
        reportPosition(buildId, {
          id: buildId,
          x,
          y,
          width,
          height,
          type: 'build',
          data: buildItem
        });
      });
    };

    // Initial report
    const initialTimeout = setTimeout(measureAndReport, 50);

    // Re-measure periodically
    const intervalId = setInterval(measureAndReport, 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
      // Clean up position when component unmounts
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { removePosition } = require('../../src/utils/contactDetection');
        removePosition(buildId);
      } catch {
        console.log('[BUILD_CONTACT] Could not clean up position for:', buildId);
      }
      console.log('[BUILD_CONTACT] 🧹 Cleaned up contact position for build:', buildId);
    };
  }, [buildItem.buildId, buildItem.owner, buildItem.value, buildItem]);

  // Removed: Drop zone bounds measurement (no longer needed for contact system)

  return (
    <View ref={stackRef}>
      <CardStack
        key={`table-build-${index}`}
        stackId={stackId}
        cards={buildCards}
        onDropStack={onDropStack || handleBuildDrop} // Use our handler if none provided
        buildValue={buildItem.value}
        isBuild={true}
        currentPlayer={currentPlayer}
        stackOwner={buildItem.owner}  // Add owner information for display
        baseZIndex={baseZIndex}
        baseElevation={1}
      />
    </View>
  );
}

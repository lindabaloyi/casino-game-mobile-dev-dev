/**
 * BuildCardRenderer
 * Handles rendering and interaction for build items on the table
 * Extracted from TableCards.tsx to focus on build logic
 */

import React, { useRef, useState } from 'react';
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
  const stackId = `build-${index}`;
  const stackRef = useRef<View>(null);
  const [dropZoneBounds, setDropZoneBounds] = useState<any>(null);

  // Build items can have multiple cards, or a single card representation
  const buildCards = buildItem.cards || [tableItem as CardType];

  // Handle drops on builds - ONLY for build augmentation from hand/table
  const handleBuildDrop = (draggedItem: any) => {
    console.log('[BUILD_DROP] 🎯 BUILD DROP HANDLER CALLED:', {
      buildId: buildItem.buildId,
      buildOwner: buildItem.owner,
      buildValue: buildItem.value,
      currentPlayer,
      draggedCard: draggedItem.card ? `${draggedItem.card.rank}${draggedItem.card.suit}` : 'none',
      draggedSource: draggedItem.source,
      draggedItemKeys: Object.keys(draggedItem),
      timestamp: Date.now()
    });

    // ONLY allow build augmentation from hand/table sources
    // Reject drops from other sources to avoid interfering with temp stacks
    const validSources = ['hand', 'table', 'loose'];
    if (!validSources.includes(draggedItem.source)) {
      console.log('[BUILD_DROP] ❌ Rejecting drop - invalid source for build augmentation:', {
        source: draggedItem.source,
        validSources,
        buildId: buildItem.buildId,
        reason: 'Only hand/table cards can augment builds'
      });
      return false;
    }

    // Only allow owners to augment their builds
    if (buildItem.owner !== currentPlayer) {
      console.log('[BUILD_DROP] ❌ Not build owner - rejecting augmentation:', {
        buildOwner: buildItem.owner,
        currentPlayer,
        buildId: buildItem.buildId,
        reason: 'Players can only augment their own builds'
      });
      return false;
    }

    if (!sendAction) {
      console.error('[BUILD_DROP] ❌ No sendAction provided - cannot send action');
      return false;
    }

    if (!draggedItem.card) {
      console.error('[BUILD_DROP] ❌ No card in dragged item:', draggedItem);
      return false;
    }

    console.log('[BUILD_DROP] ✅ Sending addToBuilding action for augmentation:', {
      buildId: buildItem.buildId,
      buildValue: buildItem.value,
      draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
      draggedCardValue: draggedItem.card.value,
      source: draggedItem.source,
      expectedSum: buildItem.value
    });

    // Send addToBuilding action with correct payload
    sendAction({
      type: 'addToBuilding',
      payload: {
        buildId: buildItem.buildId,
        card: draggedItem.card,
        source: draggedItem.source
      }
    });

    return true;
  };

  // Register build drop zone independently of CardStack
  React.useEffect(() => {
    if (!dropZoneBounds) return;

    // Initialize global registry if needed
    if (!(global as any).dropZones) {
      (global as any).dropZones = [];
    }

    const dropZone = {
      stackId,
      priority: 1000, // Highest priority for builds
      bounds: dropZoneBounds,
      zoneType: 'BUILD',
      onDrop: handleBuildDrop
    };

    // Remove existing zone and add new one
    (global as any).dropZones = (global as any).dropZones.filter(
      (zone: any) => zone.stackId !== stackId
    );
    (global as any).dropZones.push(dropZone);

    console.log(`[BUILD_DROP_ZONE] 📍 Registered build drop zone:`, {
      stackId,
      priority: 1000,
      bounds: dropZoneBounds,
      zoneType: 'BUILD'
    });

    return () => {
      // Cleanup drop zone on unmount
      if ((global as any).dropZones) {
        (global as any).dropZones = (global as any).dropZones.filter(
          (zone: any) => zone.stackId !== stackId
        );
      }
    };
  }, [stackId, dropZoneBounds, handleBuildDrop]);

  // Measure drop zone bounds
  React.useEffect(() => {
    if (!stackRef.current) return;

    const measureBounds = () => {
      stackRef.current?.measureInWindow((x, y, width, height) => {
        // Skip invalid measurements
        if (x === 0 && y === 0) return;

        const newBounds = {
          x: x - 10, // Small expansion for easier hitting
          y: y - 10,
          width: width + 20,
          height: height + 20
        };

        setDropZoneBounds(newBounds);
        console.log(`[BUILD_DROP_ZONE] 📏 Measured bounds for ${stackId}:`, newBounds);
      });
    };

    // Initial measurement
    measureBounds();

    // Re-measure on layout changes (with delay to avoid spam)
    const timeoutId = setTimeout(measureBounds, 100);

    return () => clearTimeout(timeoutId);
  }, [stackId]);

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

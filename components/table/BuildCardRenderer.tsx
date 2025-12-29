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
  const stackId = buildItem.buildId; // ✅ Use actual build ID instead of render index
  const stackRef = useRef<View>(null);
  const [dropZoneBounds, setDropZoneBounds] = useState<any>(null);

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

  // Handle drops on builds - ONLY for build augmentation from hand/table
  const handleBuildDrop = React.useCallback((draggedItem: any) => {
    console.log('[FUNCTION] 🚀 ENTERING handleBuildDrop', {
      buildId: buildItem.buildId,
      draggedCard: draggedItem.card ? `${draggedItem.card.rank}${draggedItem.card.suit}` : 'none',
      timestamp: Date.now()
    });
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
  }, [buildItem.buildId, buildItem.owner, buildItem.value, currentPlayer, sendAction]);

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

    // 🎯 [BUILD_ZONE] DEBUG: Specific zone registration details
    console.log('[BUILD_ZONE] 📍 Registering build drop zone:', {
      stackId,
      zoneType: 'BUILD',  // Should log 'BUILD'
      priority: 1000,
      hasBounds: !!dropZoneBounds,
      bounds: dropZoneBounds,
      buildId: buildItem.buildId,
      timestamp: Date.now()
    });

    return () => {
      // Cleanup drop zone on unmount
      if ((global as any).dropZones) {
        (global as any).dropZones = (global as any).dropZones.filter(
          (zone: any) => zone.stackId !== stackId
        );
      }
    };
  }, [stackId, dropZoneBounds, handleBuildDrop, buildItem.buildId]);

  // Measure drop zone bounds
  React.useEffect(() => {
    if (!stackRef.current) return;

    const measureBounds = () => {
      if (!stackRef.current) {
        console.log('[BUILD_ZONE-DEBUG] ❌ No stackRef for', stackId);
        return;
      }

      console.log('[BUILD_ZONE-DEBUG] 📏 Starting measurement for', stackId);

      stackRef.current?.measureInWindow((x, y, width, height) => {
        console.log('[BUILD_ZONE-DEBUG] 📐 Raw measurement:', {
          stackId,
          x,
          y,
          width,
          height,
          isValid: x !== 0 && y !== 0 && width > 0 && height > 0
        });

        // Skip invalid measurements
        if (x === 0 && y === 0) {
          console.log(`[BUILD_ZONE-DEBUG] ⚠️ Invalid measurement for ${stackId}: x=0, y=0 - skipping`);
          return;
        }

        // Track the original bounds
        const originalBounds = { x, y, width, height };

        // Calculate expansion - using larger expansion for debugging
        const expansionFactor = 0.5; // 50% expansion for easier hitting
        const expandedWidth = width * (1 + expansionFactor);
        const expandedHeight = height * (1 + expansionFactor);
        const expandedX = x - (expandedWidth - width) / 2;
        const expandedY = y - (expandedHeight - height) / 2;

        const expandedBounds = {
          x: expandedX,
          y: expandedY,
          width: expandedWidth,
          height: expandedHeight
        };

        // Log expansion calculations
        console.log('[BUILD_ZONE-DEBUG] 📏 Expanded bounds calculation:', {
          stackId,
          originalBounds,
          expansionFactor,
          expandedBounds,
          expansionX: (expandedWidth - width) / 2,
          expansionY: (expandedHeight - height) / 2
        });

        // Calculate and log bounds corners for visual debugging
        const topLeft = { x: expandedBounds.x, y: expandedBounds.y };
        const topRight = { x: expandedBounds.x + expandedBounds.width, y: expandedBounds.y };
        const bottomLeft = { x: expandedBounds.x, y: expandedBounds.y + expandedBounds.height };
        const bottomRight = { x: expandedBounds.x + expandedBounds.width, y: expandedBounds.y + expandedBounds.height };
        const center = {
          x: expandedBounds.x + expandedBounds.width / 2,
          y: expandedBounds.y + expandedBounds.height / 2
        };

        console.log('[BUILD_ZONE-DEBUG] 🎯 Bounds corners for visual debugging:', {
          stackId,
          topLeft,
          topRight,
          bottomLeft,
          bottomRight,
          center,
          area: expandedBounds.width * expandedBounds.height
        });

        setDropZoneBounds(expandedBounds);
        console.log(`[BUILD_ZONE-DEBUG] ✅ Final bounds set for ${stackId}:`, expandedBounds);
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

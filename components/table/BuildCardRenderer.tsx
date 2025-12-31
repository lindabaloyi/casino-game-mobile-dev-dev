/**
 * BuildCardRenderer
 * Handles rendering and interaction for build items on the table
 * Extracted from TableCards.tsx to focus on build logic
 */

import React, { useRef } from 'react';
import { View } from 'react-native';
import { useBuildContactRegistration, useBuildDropHandler } from '../../hooks';
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

  // Extracted hooks for cleaner separation of concerns
  const { handleBuildDrop } = useBuildDropHandler({
    buildItem,
    currentPlayer,
    sendAction: sendAction || (() => {}) // Provide fallback to avoid undefined
  });

  // Extracted contact registration hook
  useBuildContactRegistration({
    buildItem,
    stackRef: stackRef as React.RefObject<View> // Cast to remove null possibility
  });

  // All drop logic and contact registration moved to extracted hooks

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

/**
 * BuildCardRenderer
 * Handles rendering and interaction for build items on the table
 * Extracted from TableCards.tsx to focus on build logic
 */

import React, { useRef } from 'react';
import { View } from 'react-native';
import { useBuildContactRegistration, useBuildDropHandler } from '../../hooks';
import { TableCard } from '../../multiplayer/server/game-logic/game-state';
import { CardType } from '../cards/card';
import { BuildStack } from '../stacks/BuildStack';

interface BuildCardRendererProps {
  tableItem: TableCard;
  index: number;
  baseZIndex: number;
  dragZIndex: number;
  currentPlayer: number;
  onDropStack?: (draggedItem: any) => boolean | any; // Made optional since we'll handle it internally
  sendAction?: (action: any) => void; // Add sendAction for direct server communication
  // Overlay support for build augmentation
  showOverlay?: boolean;
  onAcceptBuildAddition?: (buildId: string) => void;
  onRejectBuildAddition?: () => void;
}

export function BuildCardRenderer({
  tableItem,
  index,
  baseZIndex,
  dragZIndex,
  currentPlayer,
  onDropStack,
  sendAction,
  // Overlay props
  showOverlay = false,
  onAcceptBuildAddition,
  onRejectBuildAddition
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
    cards: (buildItem.cards || []).map((c: any, i: number) => ({
      index: i,
      card: `${c.rank}${c.suit}`,
      value: c.value,
      isTop: i === (buildItem.cards?.length || 0) - 1
    })),
    topCard: buildItem.cards?.[buildItem.cards.length - 1],
    index,
    timestamp: Date.now()
  });

  // Detect build data changes with useEffect
  React.useEffect(() => {
    console.log('[BUILD_RENDER_EFFECT] Build data changed:', {
      buildId: buildItem.buildId,
      cardCount: (buildItem.cards || []).length,
      topCard: buildItem.cards?.[buildItem.cards.length - 1],
      allCards: (buildItem.cards || []).map(c => `${c.rank}${c.suit}`),
      timestamp: Date.now()
    });
  }, [buildItem.cards, buildItem.buildId]);

  // Build items can have multiple cards, or a single card representation
  const buildCards = buildItem.cards || [tableItem as CardType];

  // Extracted hooks for cleaner separation of concerns
  useBuildDropHandler({
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
      <BuildStack
        key={`table-build-${index}`}
        stackId={stackId}
        cards={buildCards}
        buildValue={buildItem.value}
        stackOwner={buildItem.owner}
        currentPlayer={currentPlayer}
        // Overlay props
        showOverlay={showOverlay}
        overlayText="BUILD"
        onAccept={onAcceptBuildAddition}
        onReject={onRejectBuildAddition}
        baseZIndex={baseZIndex}
        baseElevation={1}
      />
    </View>
  );
}

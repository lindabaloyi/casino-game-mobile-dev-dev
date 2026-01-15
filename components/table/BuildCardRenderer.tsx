/**
 * BuildCardRenderer
 * Handles rendering and interaction for build items on the table
 * Extracted from TableCards.tsx to focus on build logic
 */

import React, { useRef } from 'react';
import { View } from 'react-native';
import { useBuildContactRegistration, useBuildDropHandler } from '../../hooks';
import { TableCard } from '../../multiplayer/server/game-logic/game-state';
import { getAllContacts } from '../../src/utils/contactDetection';
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
  // Overlay support for build extensions
  onAcceptBuildExtension?: (buildId: string) => void;
  onCancelBuildExtension?: (buildId: string) => void;
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
  onRejectBuildAddition,
  // Extension overlay props
  onAcceptBuildExtension,
  onCancelBuildExtension
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
    allCards: (buildItem.cards || []).map((c: any) => `${c.rank}${c.suit}`),
      timestamp: Date.now()
    });
  }, [buildItem.cards, buildItem.buildId]);

  // Build items can have multiple cards, or a single card representation
  // When in pending extension, show preview cards to visualize the extension
  const buildCards = buildItem.isPendingExtension
    ? (buildItem.previewCards || buildItem.cards || [tableItem as CardType])
    : (buildItem.cards || [tableItem as CardType]);

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

  // 🔍 DEBUG FUNCTIONS
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const debugTableState = (gameState: any) => {
    if (!gameState.tableCards || gameState.tableCards.length === 0) {
      return;
    }

    gameState.tableCards.forEach((item: any, index: number) => {
      const type = getCardType(item);
      const id = type === 'build' ? item.buildId :
                 type === 'temporary_stack' ? item.stackId :
                 `${item.rank}${item.suit}_${index}`;

      const cards = item.cards?.map((c: any) => `${c.rank}${c.suit}`) || [`${item.rank}${item.suit}`];

      console.log(`  ${index}: ${type.toUpperCase()} - ${id} (${cards.join(', ')})`);
    });

    // Summary
    const summary = {
      total: gameState.tableCards.length,
      builds: gameState.tableCards.filter((item: any) => getCardType(item) === 'build').length,
      tempStacks: gameState.tableCards.filter((item: any) => getCardType(item) === 'temporary_stack').length,
      looseCards: gameState.tableCards.filter((item: any) => getCardType(item) === 'loose').length
    };
  };

  const getCardType = (item: any) => {
    if (item.buildId) return 'build';
    if (item.stackId) return 'temporary_stack';
    return 'loose';
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const debugTableVsRegistry = (gameState: any, contactRegistry: any) => {
    // What SHOULD be on table (from gameState)
    const tableItems = gameState.tableCards.map((item: any, i: number) => {
      const type = getCardType(item);
      const id = type === 'build' ? item.buildId :
                 type === 'temporary_stack' ? item.stackId :
                 `${item.rank}${item.suit}_${i}`;
      return { type, id, item, index: i };
    });
    tableItems.forEach(({ type, id, item, index }: any) => {
      const cards = item.cards?.map((c: any) => `${c.rank}${c.suit}`) || [`${item.rank}${item.suit}`];
      console.log(`  ${index}: ${type} - ${id} (${cards.join(', ')})`);
    });

    // What's ACTUALLY registered
    const registryByType = contactRegistry.byType || {};

    Object.keys(registryByType).forEach(type => {
      console.log(`  ${type.toUpperCase()}: ${registryByType[type].length} items`);
      registryByType[type].forEach((item: any) => {
        console.log(`    - ${item.id} at (${Math.round(item.x)},${Math.round(item.y)}) ${Math.round(item.width) || ''}x${Math.round(item.height) || ''}`);
      });
    });

    // CRITICAL COMPARISON
    // Check builds
    const tableBuilds = tableItems.filter((t: any) => t.type === 'build');
    const registryBuilds = registryByType.build || [];

    const missingBuilds = tableBuilds.filter((tb: any) =>
      !registryBuilds.find((rb: any) => rb.id === tb.id)
    );

    console.log('🏗️ BUILDS:', {
      inGameState: tableBuilds.length,
      inRegistry: registryBuilds.length,
      match: tableBuilds.length === registryBuilds.length,
      missing: missingBuilds.map((b: any) => b.id),
      extra: registryBuilds.filter((rb: any) =>
        !tableBuilds.find((tb: any) => tb.id === rb.id)
      ).map((b: any) => b.id)
    });

    // Check temp stacks
    const tableTempStacks = tableItems.filter((t: any) => t.type === 'temporary_stack');
    const registryTempStacks = registryByType.tempStack || [];

    const extraTempStacks = registryTempStacks.filter((rts: any) =>
      !tableTempStacks.find((tts: any) => tts.id === rts.id)
    );

    console.log('📦 TEMP STACKS:', {
      inGameState: tableTempStacks.length,
      inRegistry: registryTempStacks.length,
      match: tableTempStacks.length === registryTempStacks.length,
      lingering: extraTempStacks.map((ts: any) => ts.id)
    });

    // Check loose cards
    const tableLooseCards = tableItems.filter((t: any) => t.type === 'loose');
    const registryLooseCards = registryByType.card || [];
    // DIAGNOSIS
    const issues = [];
    if (missingBuilds.length > 0) issues.push(`Missing builds: ${missingBuilds.map((b: any) => b.id).join(', ')}`);
    if (extraTempStacks.length > 0) issues.push(`Lingering temp stacks: ${extraTempStacks.map((ts: any) => ts.id).join(', ')}`);

    if (issues.length === 0) {
    } else {
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    return {
      synchronized: issues.length === 0,
      issues,
      tableItems,
      registryByType
    };
  };

  // 🔍 DEBUG: Verify builds are registered with contact detection
  React.useEffect(() => {
    const debugTimeout = setTimeout(() => {
      });

      // Try to access contact registry if available
      try {
        // Use imported getAllContacts function
        const allContacts = getAllContacts?.() || [];
        const builds = allContacts.filter((c: any) => c.type === 'build');
        const thisBuild = builds.find((b: any) => b.id === buildItem.buildId);

        console.log('[BUILD_CONTACT_DEBUG] 📊 Contact registry status:', {
          totalContacts: allContacts.length,
          buildContacts: builds.length,
          thisBuildRegistered: !!thisBuild,
          buildId: buildItem.buildId,
          buildPosition: thisBuild ? {
            x: Math.round(thisBuild.x),
            y: Math.round(thisBuild.y),
            width: Math.round(thisBuild.width),
            height: Math.round(thisBuild.height)
          } : 'NOT REGISTERED'
        });
      } catch (error) {
      }
    }, 500); // Check after 500ms to allow registration

    return () => clearTimeout(debugTimeout);
  }, [buildItem.buildId, buildItem.owner]);

  // All drop logic and contact registration moved to extracted hooks

  return (
    <View ref={stackRef}>
      <BuildStack
        key={`table-build-${index}`}
        stackId={stackId}
        cards={buildCards}
        buildValue={buildItem.isPendingExtension ? buildItem.previewValue : buildItem.value}
        stackOwner={buildItem.owner}
        currentPlayer={currentPlayer}
        // Overlay props for build additions
        showOverlay={showOverlay}
        overlayText="BUILD"
        onAccept={onAcceptBuildAddition}
        onReject={onRejectBuildAddition}
        // Overlay props for build extensions
        isPendingExtension={buildItem.isPendingExtension}
        onAcceptExtension={onAcceptBuildExtension}
        onCancelExtension={onCancelBuildExtension}
        baseZIndex={baseZIndex}
        baseElevation={1}
      />
    </View>
  );
}

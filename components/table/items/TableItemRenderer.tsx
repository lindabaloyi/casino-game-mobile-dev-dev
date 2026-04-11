import React from 'react';
import { TableItem, Card, TempStack, BuildStack, isLooseCard, isTempStack, isBuildStack } from '../types';
import { LooseCardItem } from './LooseCardItem';
import { TempStackItem } from './TempStackItem';
import { BuildStackItem } from './BuildStackItem';
import { CardBounds, TempStackBounds, CapturePileBounds } from '../../../hooks/useDrag';

interface TableItemRendererProps {
  item: TableItem;
  index: number;
  isMyTurn: boolean;
  playerNumber: number;
  tableVersion: number;
  registerCard: (id: string, bounds: CardBounds) => void;
  unregisterCard: (id: string) => void;
  registerTempStack: (stackId: string, bounds: TempStackBounds) => void;
  unregisterTempStack: (stackId: string) => void;
  findCardAtPoint: (x: number, y: number, excludeId?: string) => { id: string; card: Card } | null;
  findTempStackAtPoint: (x: number, y: number) => { stackId: string; owner: number; stackType: 'temp_stack' | 'build_stack' } | null;
  findCapturePileAtPoint?: (x: number, y: number) => CapturePileBounds | null;
  onDropOnBuildStack?: (card: Card, stackId: string, stackOwner: number, source: string) => void;
  onDropOnTempStack?: (card: Card, stackId: string, source: string) => void;
  onTableCardDropOnCard?: (card: Card, targetCard: Card) => void;
  onTableDragStart: (card: Card, absoluteX: number, absoluteY: number) => void;
  onTableDragMove: (absoluteX: number, absoluteY: number) => void;
  onTableDragEnd: () => void;
  onTempStackDragStart?: (stack: TempStack) => void;
  onTempStackDragMove?: (absoluteX: number, absoluteY: number) => void;
  onTempStackDragEnd?: (stack: TempStack) => void;
  onDropToCapture?: (stack: TempStack, source: 'hand' | 'captured') => void;
  /** Callback for dropping a build stack (with pending extension) onto capture pile */
  onDropBuildToCapture?: (stack: BuildStack) => void;
  isHidden?: boolean;
  // Party mode props for team colors
  isPartyMode?: boolean;
  currentPlayerIndex?: number;
  /** Total player count (2, 3, or 4) */
  playerCount?: number;
  /** Callback when a build is tapped - for Shiya selection or dual builds */
  onBuildTap?: (stack: BuildStack | TempStack) => void;
  /** Callback for double-tapping a loose card to create single temp stack */
  onDoubleTapCard?: (card: Card) => void;
  /** Pending drop card - for optimistic UI to hide card immediately after action */
  pendingDropCard?: Card | null;
  /** Pending drop source - 'hand' | 'captured' | 'table' | null */
  pendingDropSource?: 'hand' | 'captured' | 'table' | null;
}

export function TableItemRenderer(props: TableItemRendererProps) {
  const { 
    item, 
    isHidden, 
    tableVersion, 
    isPartyMode, 
    currentPlayerIndex,
    playerCount,
    onDropBuildToCapture,
    onDropToCapture,
    onBuildTap,
    onDoubleTapCard,
    pendingDropCard,
    pendingDropSource,
    ...rest 
  } = props;
  
  // For build stacks, use onDropBuildToCapture if provided
  const buildStackProps = onDropBuildToCapture 
    ? { onDropToCapture: onDropBuildToCapture } 
    : {};
  
  // Add onBuildTap to buildStackProps for Shiya selection
  const buildStackAllProps = { ...buildStackProps, onBuildTap };
  
  // For temp stacks, use onDropToCapture
  const tempStackProps = onDropToCapture 
    ? { onDropToCapture: onDropToCapture } 
    : {};
  
  if (isLooseCard(item)) {
    return <LooseCardItem 
      card={item} 
      isHidden={isHidden} 
      tableVersion={tableVersion} 
      onDoubleTapCard={onDoubleTapCard}
      pendingDropCard={pendingDropCard}
      pendingDropSource={pendingDropSource}
      {...rest} 
    />;
  }
  
  if (isTempStack(item)) {
    return <TempStackItem stack={item} tableVersion={tableVersion} playerCount={playerCount} isPartyMode={isPartyMode} {...tempStackProps} onBuildTap={onBuildTap} {...rest} />;
  }
  
  if (isBuildStack(item)) {
    return <BuildStackItem 
      stack={item} 
      tableVersion={tableVersion} 
      isPartyMode={isPartyMode} 
      currentPlayerIndex={currentPlayerIndex}
      playerCount={playerCount}
      {...buildStackAllProps}
      {...rest}
    />;
  }
  
  return null;
}

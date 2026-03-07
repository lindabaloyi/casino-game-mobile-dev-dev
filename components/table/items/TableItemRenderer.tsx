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
  onStackDrop?: (card: Card, stackId: string, stackOwner: number, stackType: 'temp_stack' | 'build_stack') => void;
  onTableCardDropOnCard?: (card: Card, targetCard: Card) => void;
  onTableDragStart: (card: Card, absoluteX: number, absoluteY: number) => void;
  onTableDragMove: (absoluteX: number, absoluteY: number) => void;
  onTableDragEnd: () => void;
  onTempStackDragStart?: (stack: TempStack) => void;
  onTempStackDragMove?: (absoluteX: number, absoluteY: number) => void;
  onTempStackDragEnd?: (stack: TempStack) => void;
  onDropToCapture?: (stack: TempStack, source: 'hand' | 'captured') => void;
  isHidden?: boolean;
  // Party mode props for team colors
  isPartyMode?: boolean;
  currentPlayerIndex?: number;
}

export function TableItemRenderer(props: TableItemRendererProps) {
  const { item, isHidden, tableVersion, isPartyMode, currentPlayerIndex, ...rest } = props;
  
  if (isLooseCard(item)) {
    return <LooseCardItem card={item} isHidden={isHidden} tableVersion={tableVersion} {...rest} />;
  }
  
  if (isTempStack(item)) {
    return <TempStackItem stack={item} tableVersion={tableVersion} {...rest} />;
  }
  
  if (isBuildStack(item)) {
    return <BuildStackItem stack={item} tableVersion={tableVersion} isPartyMode={isPartyMode} currentPlayerIndex={currentPlayerIndex} {...rest} />;
  }
  
  return null;
}

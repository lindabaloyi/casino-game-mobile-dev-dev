import React from 'react';
import { CardType } from '../cards/card';
import { BuildStack } from './BuildStack';
import { RegularStack } from './RegularStack';
import { TempStack } from './TempStack';

interface StackFactoryProps {
  stackId: string;
  cards: CardType[];
  onDropStack?: (draggedItem: any) => boolean | any;
  buildValue?: number;
  isBuild?: boolean;
  draggable?: boolean;
  onDragStart?: (card: CardType) => void;
  onDragEnd?: (draggedItem: any, dropPosition: any) => void;
  onDragMove?: (card: CardType, position: { x: number; y: number }) => void;
  currentPlayer?: number;
  dragSource?: string;
  isTemporaryStack?: boolean;
  stackOwner?: number;
  onFinalizeStack?: (stackId: string) => void;
  onCancelStack?: (stackId: string) => void;
  captureValue?: number;
  totalValue?: number;
  style?: any;
  dragZIndex?: number;
  baseZIndex?: number;
  baseElevation?: number;
  canAugmentBuilds?: boolean;
}

/**
 * StackFactory - Factory component that determines which stack type to render
 * Based on the props, it selects the appropriate stack component
 * This replaces the monolithic CardStack logic with clean composition
 */
export const StackFactory: React.FC<StackFactoryProps> = (props) => {
  const getStackType = (): 'REGULAR' | 'BUILD' | 'TEMP' | 'EMPTY' => {
    if (props.isBuild) return 'BUILD';
    if (props.isTemporaryStack) return 'TEMP';
    if (props.cards.length === 0) return 'EMPTY';
    return 'REGULAR';
  };

  const stackType = getStackType();

  console.log(`[StackFactory] Rendering ${stackType} stack for ${props.stackId}:`, {
    cardCount: props.cards.length,
    isBuild: props.isBuild,
    isTemporaryStack: props.isTemporaryStack,
    hasDropHandler: !!props.onDropStack
  });

  const stacks = {
    REGULAR: (
      <RegularStack
        stackId={props.stackId}
        cards={props.cards}
        onDropStack={props.onDropStack}
        draggable={props.draggable}
        onDragStart={props.onDragStart}
        onDragEnd={props.onDragEnd}
        onDragMove={props.onDragMove}
        currentPlayer={props.currentPlayer}
        dragSource={props.dragSource}
        dragZIndex={props.dragZIndex}
        baseZIndex={props.baseZIndex}
        baseElevation={props.baseElevation}
      />
    ),

    BUILD: (
      <BuildStack
        stackId={props.stackId}
        cards={props.cards}
        buildValue={props.buildValue}
        stackOwner={props.stackOwner}
        onDropStack={props.onDropStack}
        currentPlayer={props.currentPlayer}
        dragSource={props.dragSource}
        dragZIndex={props.dragZIndex}
        baseZIndex={props.baseZIndex}
        baseElevation={props.baseElevation}
      />
    ),

    TEMP: (
      <TempStack
        stackId={props.stackId}
        cards={props.cards}
        captureValue={props.captureValue}
        totalValue={props.totalValue}
        onDropStack={props.onDropStack}
        onFinalizeStack={props.onFinalizeStack}
        onCancelStack={props.onCancelStack}
        onDragStart={props.onDragStart}
        onDragEnd={props.onDragEnd}
        currentPlayer={props.currentPlayer}
        dragSource={props.dragSource}
        dragZIndex={props.dragZIndex}
        baseZIndex={props.baseZIndex}
        baseElevation={props.baseElevation}
        canAugmentBuilds={props.canAugmentBuilds}
      />
    ),

    EMPTY: null // Empty stacks render nothing
  };

  return stacks[stackType] || stacks.REGULAR;
};

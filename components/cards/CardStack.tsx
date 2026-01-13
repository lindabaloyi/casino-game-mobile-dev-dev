import { memo } from 'react';
import { StackFactory } from '../stacks/StackFactory';
import { CardType } from './card';

interface CardStackProps {
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
  captureValue?: number; // For temp stacks: shows the value to capture with
  totalValue?: number; // For temp stacks: shows total sum of card values
  displayValue?: number; // For temp stacks: calculated build display value
  style?: any; // For custom styles like z-index
  dragZIndex?: number; // Z-index for dragged cards from this stack
  baseZIndex?: number; // Base z-index for stacking context management
  baseElevation?: number; // Base elevation for Android stacking context management
  canAugmentBuilds?: boolean; // For temp stacks: whether player can augment builds
}

const CardStack = memo<CardStackProps>((props) => {
  return <StackFactory {...props} />;
});

CardStack.displayName = 'CardStack';

export default CardStack;

import React from 'react';
import { TempStack } from '../types';
import { TempStackView } from '../TempStackView';
import { CapturePileBounds } from '../../../hooks/useDrag';

interface TempStackItemProps {
  stack: TempStack;
  tableVersion: number;
  registerTempStack: (stackId: string, bounds: any) => void;
  unregisterTempStack: (stackId: string) => void;
  isMyTurn: boolean;
  playerNumber: number;
  findCapturePileAtPoint?: (x: number, y: number) => CapturePileBounds | null;
  onDragStart?: (stack: TempStack) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (stack: TempStack) => void;
  onDropToCapture?: (stack: TempStack, source: 'hand' | 'captured') => void;
}

export function TempStackItem({
  stack,
  tableVersion,
  registerTempStack,
  unregisterTempStack,
  isMyTurn,
  playerNumber,
  findCapturePileAtPoint,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDropToCapture,
}: TempStackItemProps) {
  return (
    <TempStackView
      key={stack.stackId}
      stack={stack}
      layoutVersion={tableVersion}
      registerTempStack={registerTempStack}
      unregisterTempStack={unregisterTempStack}
      isMyTurn={isMyTurn}
      playerNumber={playerNumber}
      findCapturePileAtPoint={findCapturePileAtPoint}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDropToCapture={onDropToCapture}
    />
  );
}

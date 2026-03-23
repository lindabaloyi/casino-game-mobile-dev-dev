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
  /** Total player count for color determination (2, 3, or 4) */
  playerCount?: number;
  /** Party mode flag for team colors */
  isPartyMode?: boolean;
  findCapturePileAtPoint?: (x: number, y: number) => CapturePileBounds | null;
  onDragStart?: (stack: TempStack) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (stack: TempStack) => void;
  onDropToCapture?: (stack: TempStack, source: 'hand' | 'captured') => void;
  /** Called when stack is tapped (for dual builds) */
  onBuildTap?: (stack: TempStack) => void;
}

export function TempStackItem({
  stack,
  tableVersion,
  registerTempStack,
  unregisterTempStack,
  isMyTurn,
  playerNumber,
  playerCount,
  isPartyMode = false,
  findCapturePileAtPoint,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDropToCapture,
  onBuildTap,
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
      playerCount={playerCount}
      isPartyMode={isPartyMode}
      findCapturePileAtPoint={findCapturePileAtPoint}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDropToCapture={onDropToCapture}
      onBuildTap={onBuildTap}
    />
  );
}

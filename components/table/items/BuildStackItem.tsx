import React from 'react';
import { BuildStack } from '../types';
import { BuildStackView } from '../BuildStackView';
import { CapturePileBounds } from '../../../hooks/useDrag';

interface BuildStackItemProps {
  stack: BuildStack;
  tableVersion: number;
  registerTempStack: (stackId: string, bounds: any) => void;
  unregisterTempStack: (stackId: string) => void;
  // Party mode props for team colors
  isPartyMode?: boolean;
  currentPlayerIndex?: number;
  /** Total player count (2, 3, or 4) */
  playerCount?: number;
  /** Callback when build is tapped - for Shiya selection */
  onBuildTap?: (stack: BuildStack) => void;
  // Drag callbacks (for dragging build with pending extension to capture pile)
  isMyTurn?: boolean;
  playerNumber?: number;
  findCapturePileAtPoint?: (x: number, y: number) => CapturePileBounds | null;
  onDragStart?: (stack: BuildStack) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (stack: BuildStack) => void;
  onDropToCapture?: (stack: BuildStack) => void;
}

export function BuildStackItem({
  stack,
  tableVersion,
  registerTempStack,
  unregisterTempStack,
  isPartyMode,
  currentPlayerIndex,
  playerCount,
  onBuildTap,
  isMyTurn,
  playerNumber,
  findCapturePileAtPoint,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDropToCapture,
}: BuildStackItemProps) {
  return (
    <BuildStackView
      key={stack.stackId}
      stack={stack}
      layoutVersion={tableVersion}
      registerTempStack={registerTempStack}
      unregisterTempStack={unregisterTempStack}
      isPartyMode={isPartyMode}
      currentPlayerIndex={currentPlayerIndex}
      playerCount={playerCount}
      onBuildTap={onBuildTap}
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

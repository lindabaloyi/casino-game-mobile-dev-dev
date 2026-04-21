import React from 'react';
import { BuildStack } from '../types';
import { BuildStackView } from '../BuildStackView';
import { CapturePileBounds, BuildStackBounds } from '../../../hooks/useDrag';

interface BuildStackItemProps {
  stack: BuildStack;
  tableVersion: number;
  registerBuildStack: (stackId: string, bounds: BuildStackBounds) => void;
  unregisterBuildStack: (stackId: string) => void;
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
  /** Stack ID of opponent's currently dragging stack - hides original when opponent drags */
  opponentDraggingStackId?: string;
}

export function BuildStackItem({
  stack,
  tableVersion,
  registerBuildStack,
  unregisterBuildStack,
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
  opponentDraggingStackId,
}: BuildStackItemProps) {
  console.log('[BuildStackItem] Received props for stack:', stack.stackId, {
    hasOnDragStart: !!onDragStart,
    hasOnDragMove: !!onDragMove,
    hasOnDragEnd: !!onDragEnd,
    isMyTurn,
    playerNumber,
    stackOwner: stack.owner,
    opponentDraggingStackId
  });
  return (
    <BuildStackView
      key={stack.stackId}
      stack={stack}
      layoutVersion={tableVersion}
      registerBuildStack={registerBuildStack}
      unregisterBuildStack={unregisterBuildStack}
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
      opponentDraggingStackId={opponentDraggingStackId}
    />
  );
}

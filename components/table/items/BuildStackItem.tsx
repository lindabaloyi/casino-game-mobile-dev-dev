import React from 'react';
import { BuildStack } from '../types';
import { BuildStackView } from '../BuildStackView';

interface BuildStackItemProps {
  stack: BuildStack;
  tableVersion: number;
  registerTempStack: (stackId: string, bounds: any) => void;
  unregisterTempStack: (stackId: string) => void;
  // Party mode props for team colors
  isPartyMode?: boolean;
  currentPlayerIndex?: number;
  /** Callback when build is tapped - for Shiya selection */
  onBuildTap?: (stack: BuildStack) => void;
}

export function BuildStackItem({
  stack,
  tableVersion,
  registerTempStack,
  unregisterTempStack,
  isPartyMode,
  currentPlayerIndex,
  onBuildTap,
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
      onBuildTap={onBuildTap}
    />
  );
}

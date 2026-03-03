import React from 'react';
import { BuildStack } from '../types';
import { BuildStackView } from '../BuildStackView';

interface BuildStackItemProps {
  stack: BuildStack;
  tableVersion: number;
  registerTempStack: (stackId: string, bounds: any) => void;
  unregisterTempStack: (stackId: string) => void;
}

export function BuildStackItem({
  stack,
  tableVersion,
  registerTempStack,
  unregisterTempStack,
}: BuildStackItemProps) {
  return (
    <BuildStackView
      key={stack.stackId}
      stack={stack}
      layoutVersion={tableVersion}
      registerTempStack={registerTempStack}
      unregisterTempStack={unregisterTempStack}
    />
  );
}

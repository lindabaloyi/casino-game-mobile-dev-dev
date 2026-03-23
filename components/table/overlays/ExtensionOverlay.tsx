import React from 'react';
import { TempStack, BuildStack } from '../types';
import { StackActionStrip } from '../StackActionStrip';

interface ExtensionOverlayProps {
  extendingBuildId: string | null;
  stacks: (TempStack | BuildStack)[];
  onAcceptExtend?: (stackId: string) => void;
  onDeclineExtend?: (stackId: string) => void;
  onPlayButtonSound?: () => void;
}

export function ExtensionOverlay({
  extendingBuildId,
  stacks,
  onAcceptExtend,
  onDeclineExtend,
  onPlayButtonSound,
}: ExtensionOverlayProps) {
  if (!extendingBuildId || !onAcceptExtend || !onDeclineExtend) return null;
  
  const extendingStack = stacks.find(s => s.stackId === extendingBuildId);
  if (!extendingStack) return null;
  
  return (
    <StackActionStrip
      stackType="extend_build"
      stackId={extendingBuildId}
      onAccept={onAcceptExtend}
      onCancel={onDeclineExtend}
      onPlayButtonSound={onPlayButtonSound}
    />
  );
}

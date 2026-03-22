import React from 'react';
import { TempStack } from '../types';
import { StackActionStrip } from '../StackActionStrip';

interface StackOverlayProps {
  overlayStackId: string | null;
  tempStacks: TempStack[];
  onAcceptTemp: (stackId: string) => void;
  onCancelTemp: (stackId: string) => void;
  onPlayButtonSound?: () => void;
}

export function StackOverlay({
  overlayStackId,
  tempStacks,
  onAcceptTemp,
  onCancelTemp,
  onPlayButtonSound,
}: StackOverlayProps) {
  if (!overlayStackId) return null;
  
  const overlayStack = tempStacks.find(s => s.stackId === overlayStackId);
  if (!overlayStack) return null;
  
  return (
    <StackActionStrip
      stackType={overlayStack.type}
      stackId={overlayStackId}
      onAccept={onAcceptTemp}
      onCancel={onCancelTemp}
      onPlayButtonSound={onPlayButtonSound}
    />
  );
}

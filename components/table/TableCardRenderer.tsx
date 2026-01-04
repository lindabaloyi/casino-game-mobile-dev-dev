import React from 'react';
import { TableCard } from '../../multiplayer/server/game-logic/game-state';
import { getCardType } from '../../utils/cardTypeUtils';
import { BuildCardRenderer } from './BuildCardRenderer';
import TableDraggableCard from './TableDraggableCard';
import { TempStackRenderer } from './TempStackRenderer';

interface TableCardRendererProps {
  tableItem: TableCard;
  index: number;
  baseZIndex: number;
  dragZIndex: number;
  currentPlayer: number;
  onDropStack: (draggedItem: any, stackId: string) => void;
  onDragStart: (card: any) => void;
  onDragEnd: (draggedItem: any, dropPosition: any) => void;
  onStagingReject: (stackId: string) => void;
  onFinalizeStack?: (stackId: string) => void;
  onCancelStack?: (stackId: string) => void;
  onStagingAccept?: (stackId: string) => void;
  sendAction?: (action: any) => void;
}

export const TableCardRenderer: React.FC<TableCardRendererProps> = ({
  tableItem,
  index,
  baseZIndex,
  dragZIndex,
  currentPlayer,
  onDropStack,
  onDragStart,
  onDragEnd,
  onStagingReject,
  onFinalizeStack,
  onCancelStack,
  onStagingAccept,
  sendAction
}) => {
  const itemType = getCardType(tableItem);

  // Remove console.log spam - keep only critical logs
  console.log(`[TableCardRenderer] Rendering ${itemType} at position ${index}`);

  if (itemType === 'loose') {
    return (
      <TableDraggableCard
        key={`loose-${index}-${(tableItem as any).rank}-${(tableItem as any).suit}`}
        card={tableItem as any}
        stackId={`loose-${index}`}
        index={index}
        dragZIndex={dragZIndex}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        currentPlayer={currentPlayer}
      />
    );
  }

  if (itemType === 'build') {
    return (
      <BuildCardRenderer
        key={`table-build-${index}`}
        tableItem={tableItem}
        index={index}
        baseZIndex={baseZIndex}
        dragZIndex={dragZIndex}
        currentPlayer={currentPlayer}
        sendAction={sendAction}
      />
    );
  }

  if (itemType === 'temporary_stack') {
    return (
      <TempStackRenderer
        key={`staging-container-${index}`}
        tableItem={tableItem}
        index={index}
        baseZIndex={baseZIndex}
        dragZIndex={dragZIndex}
        currentPlayer={currentPlayer}
        onDropStack={(draggedItem) => onDropStack(draggedItem, (tableItem as any).stackId || `temp-${index}`)}
        onFinalizeStack={onFinalizeStack}
        onCancelStack={onCancelStack}
        onTempAccept={onStagingAccept}
        onTempReject={onStagingReject}
      />
    );
  }

  return null;
};

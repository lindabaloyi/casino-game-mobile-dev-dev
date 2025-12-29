import { useCallback, useState } from 'react';

export const useTableDragState = (
  onTableCardDragStart?: (card: any) => void,
  onTableCardDragEnd?: (draggedItem: any, dropPosition: any) => void
) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback((card: any) => {
    setIsDragging(true);
    onTableCardDragStart?.(card);
  }, [onTableCardDragStart]);

  const handleDragEnd = useCallback((draggedItem: any, dropPosition: any) => {
    setIsDragging(false);
    onTableCardDragEnd?.(draggedItem, dropPosition);
  }, [onTableCardDragEnd]);

  return {
    isDragging,
    handleDragStart,
    handleDragEnd
  };
};
